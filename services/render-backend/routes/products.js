const express = require('express');
const { body, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const admin = require('firebase-admin');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const router = express.Router();

const db = admin.firestore();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * @route   GET /api/products
 * @desc    Get all products with filtering and pagination
 * @access  Public
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().trim(),
  query('search').optional().trim(),
  query('vendorId').optional().trim(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('status').optional().isIn(['active', 'inactive', 'pending']),
  query('featured').optional().isBoolean(),
  query('sortBy').optional().isIn(['createdAt', 'price', 'name', 'rating']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  handleValidationErrors
], optionalAuth, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    search,
    vendorId,
    minPrice,
    maxPrice,
    status = 'active',
    featured,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query
  let query = db.collection('products');

  // Apply filters
  if (status) {
    query = query.where('status', '==', status);
  }

  if (vendorId) {
    query = query.where('vendorId', '==', vendorId);
  }

  if (category) {
    query = query.where('category', '==', category);
  }

  if (featured !== undefined) {
    query = query.where('featured', '==', featured === 'true');
  }

  // Price range filter
  if (minPrice !== undefined) {
    query = query.where('price', '>=', parseFloat(minPrice));
  }

  if (maxPrice !== undefined) {
    query = query.where('price', '<=', parseFloat(maxPrice));
  }

  // Apply sorting
  const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc';
  query = query.orderBy(sortBy, sortDirection);

  // Pagination
  const limitInt = parseInt(limit);
  const pageInt = parseInt(page);
  const offset = (pageInt - 1) * limitInt;

  // Get total count for pagination
  const countQuery = query; // Copy query for counting
  const countSnapshot = await countQuery.get();
  const total = countSnapshot.size;

  // Apply pagination to main query
  if (offset > 0) {
    // For Firestore, we need to use startAfter for pagination
    const previousPage = await query.limit(offset).get();
    if (previousPage.size > 0) {
      const lastDoc = previousPage.docs[previousPage.size - 1];
      query = query.startAfter(lastDoc);
    }
  }

  const snapshot = await query.limit(limitInt).get();

  // Process products
  let products = [];
  snapshot.forEach(doc => {
    const product = {
      id: doc.id,
      ...doc.data()
    };

    // Convert Firestore timestamps
    if (product.createdAt) {
      product.createdAt = product.createdAt.toDate?.() || product.createdAt;
    }
    if (product.updatedAt) {
      product.updatedAt = product.updatedAt.toDate?.() || product.updatedAt;
    }

    products.push(product);
  });

  // Apply search filter (client-side since Firestore doesn't support full-text search)
  if (search) {
    const searchTerm = search.toLowerCase();
    products = products.filter(product => 
      product.name?.toLowerCase().includes(searchTerm) ||
      product.description?.toLowerCase().includes(searchTerm) ||
      product.category?.toLowerCase().includes(searchTerm)
    );
  }

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        currentPage: pageInt,
        totalPages: Math.ceil(total / limitInt),
        totalItems: total,
        itemsPerPage: limitInt,
        hasNextPage: pageInt * limitInt < total,
        hasPreviousPage: pageInt > 1
      }
    }
  });
}));

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID
 * @access  Public
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const productDoc = await db.collection('products').doc(id).get();
  
  if (!productDoc.exists) {
    throw new AppError('Product not found', 404);
  }

  const product = {
    id: productDoc.id,
    ...productDoc.data()
  };

  // Convert timestamps
  if (product.createdAt) {
    product.createdAt = product.createdAt.toDate?.() || product.createdAt;
  }
  if (product.updatedAt) {
    product.updatedAt = product.updatedAt.toDate?.() || product.updatedAt;
  }

  // Increment view count
  await db.collection('products').doc(id).update({
    viewCount: admin.firestore.FieldValue.increment(1),
    lastViewedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  res.json({
    success: true,
    data: product
  });
}));

/**
 * @route   POST /api/products
 * @desc    Create new product
 * @access  Private (requires vendor role)
 */
router.post('/', authenticateToken, upload.array('images', 5), [
  body('name').trim().isLength({ min: 2, max: 200 }),
  body('description').trim().isLength({ min: 10, max: 2000 }),
  body('price').isFloat({ min: 0 }),
  body('category').trim().notEmpty(),
  body('stock').isInt({ min: 0 }),
  body('processingTimeDays').optional().isInt({ min: 1, max: 30 }),
  body('shipping').optional().isObject(),
  body('dimensions').optional().isObject(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const user = req.user;
  
  // Check if user is vendor or admin
  if (!['vendor', 'admin'].includes(user.role)) {
    throw new AppError('Vendor or admin privileges required', 403);
  }

  const {
    name,
    description,
    price,
    category,
    stock,
    processingTimeDays = 2,
    shipping = {},
    dimensions = {},
    specifications = {},
    tags = []
  } = req.body;

  // Process uploaded images
  const images = [];
  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      images.push({
        url: `/uploads/${file.filename}`,
        alt: name,
        type: file.mimetype.split('/')[0],
        size: file.size
      });
    });
  }

  // Generate tracking number
  const trackingNumber = 'TRK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();

  const productData = {
    name,
    description,
    price: parseFloat(price),
    category,
    stock: parseInt(stock),
    processingTimeDays: parseInt(processingTimeDays),
    vendorId: user.uid,
    vendorName: user.displayName || user.email,
    trackingNumber,
    images,
    specifications,
    tags,
    shipping,
    dimensions,
    status: 'pending', // Requires admin approval
    featured: false,
    rating: 0,
    reviewCount: 0,
    viewCount: 0,
    salesCount: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const productRef = await db.collection('products').add(productData);
  const createdProduct = await productRef.get();

  res.status(201).json({
    success: true,
    message: 'Product created successfully and pending approval',
    data: {
      id: createdProduct.id,
      ...createdProduct.data()
    }
  });
}));

/**
 * @route   PUT /api/products/:id
 * @desc    Update product
 * @access  Private (product owner or admin)
 */
router.put('/:id', authenticateToken, upload.array('images', 5), [
  body('name').optional().trim().isLength({ min: 2, max: 200 }),
  body('description').optional().trim().isLength({ min: 10, max: 2000 }),
  body('price').optional().isFloat({ min: 0 }),
  body('category').optional().trim().notEmpty(),
  body('stock').optional().isInt({ min: 0 }),
  body('status').optional().isIn(['active', 'inactive', 'pending']),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const productDoc = await db.collection('products').doc(id).get();
  
  if (!productDoc.exists) {
    throw new AppError('Product not found', 404);
  }

  const product = productDoc.data();

  // Check ownership
  if (product.vendorId !== user.uid && user.role !== 'admin') {
    throw new AppError('Not authorized to update this product', 403);
  }

  const updates = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  // Update fields
  const allowedFields = ['name', 'description', 'price', 'category', 'stock', 'status', 'processingTimeDays', 'shipping', 'dimensions', 'specifications', 'tags'];
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      if (field === 'price') {
        updates[field] = parseFloat(req.body[field]);
      } else if (field === 'stock' || field === 'processingTimeDays') {
        updates[field] = parseInt(req.body[field]);
      } else {
        updates[field] = req.body[field];
      }
    }
  });

  // Process new images if uploaded
  if (req.files && req.files.length > 0) {
    const newImages = req.files.map(file => ({
      url: `/uploads/${file.filename}`,
      alt: product.name || 'Product image',
      type: file.mimetype.split('/')[0],
      size: file.size
    }));

    // Add to existing images or replace if needed
    updates.images = admin.firestore.FieldValue.arrayUnion(...newImages);
  }

  await db.collection('products').doc(id).update(updates);

  // Get updated product
  const updatedProductDoc = await db.collection('products').doc(id).get();
  const updatedProduct = {
    id: updatedProductDoc.id,
    ...updatedProductDoc.data()
  };

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: updatedProduct
  });
}));

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product
 * @access  Private (product owner or admin)
 */
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const productDoc = await db.collection('products').doc(id).get();
  
  if (!productDoc.exists) {
    throw new AppError('Product not found', 404);
  }

  const product = productDoc.data();

  // Check ownership
  if (product.vendorId !== user.uid && user.role !== 'admin') {
    throw new AppError('Not authorized to delete this product', 403);
  }

  // Check if product has sales
  if (product.salesCount > 0) {
    throw new AppError('Cannot delete product with existing sales', 400);
  }

  await db.collection('products').doc(id).delete();

  res.json({
    success: true,
    message: 'Product deleted successfully'
  });
}));

/**
 * @route   POST /api/products/:id/thumbnail
 * @desc    Upload product thumbnail
 * @access  Private (product owner or admin)
 */
router.post('/:id/thumbnail', authenticateToken, upload.single('thumbnail'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  const productDoc = await db.collection('products').doc(id).get();
  
  if (!productDoc.exists) {
    throw new AppError('Product not found', 404);
  }

  const product = productDoc.data();

  // Check ownership
  if (product.vendorId !== user.uid && user.role !== 'admin') {
    throw new AppError('Not authorized to update this product', 403);
  }

  const thumbnailUrl = `/uploads/${req.file.filename}`;

  await db.collection('products').doc(id).update({
    thumbnail: thumbnailUrl,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  res.json({
    success: true,
    message: 'Thumbnail uploaded successfully',
    data: {
      thumbnailUrl
    }
  });
}));

/**
 * @route   GET /api/products/categories
 * @desc    Get all product categories
 * @access  Public
 */
router.get('/categories/list', asyncHandler(async (req, res) => {
  const snapshot = await db.collection('products')
    .where('status', '==', 'active')
    .get();

  const categories = new Set();
  snapshot.forEach(doc => {
    const product = doc.data();
    if (product.category) {
      categories.add(product.category);
    }
  });

  res.json({
    success: true,
    data: Array.from(categories).sort()
  });
}));

/**
 * @route   GET /api/products/featured
 * @desc    Get featured products
 * @access  Public
 */
router.get('/featured/list', [
  query('limit').optional().isInt({ min: 1, max: 50 })
], handleValidationErrors, asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;

  const snapshot = await db.collection('products')
    .where('featured', '==', true)
    .where('status', '==', 'active')
    .orderBy('rating', 'desc')
    .limit(limit)
    .get();

  const products = [];
  snapshot.forEach(doc => {
    const product = {
      id: doc.id,
      ...doc.data()
    };

    // Convert timestamps
    if (product.createdAt) {
      product.createdAt = product.createdAt.toDate?.() || product.createdAt;
    }
    if (product.updatedAt) {
      product.updatedAt = product.updatedAt.toDate?.() || product.updatedAt;
    }

    products.push(product);
  });

  res.json({
    success: true,
    data: products
  });
}));

module.exports = router;

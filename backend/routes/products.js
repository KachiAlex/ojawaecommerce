const express = require('express');
const { body, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { Op } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { Product } = require('../models');
const router = express.Router();

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
    status,
    featured,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query options
  const where = {};
  const order = [[sortBy, sortOrder.toUpperCase()]];
  const limitInt = parseInt(limit);
  const pageInt = parseInt(page);
  const offset = (pageInt - 1) * limitInt;

  // Apply filters
  if (status) {
    where.status = status;
  }

  if (vendorId) {
    where.vendorId = vendorId;
  }

  if (category) {
    where.category = category;
  }

  if (featured !== undefined) {
    where.featured = featured === 'true';
  }

  // Price range filter
  if (minPrice !== undefined && maxPrice !== undefined) {
    where.price = { [Op.between]: [parseFloat(minPrice), parseFloat(maxPrice)] };
  } else if (minPrice !== undefined) {
    where.price = { [Op.gte]: parseFloat(minPrice) };
  } else if (maxPrice !== undefined) {
    where.price = { [Op.lte]: parseFloat(maxPrice) };
  }

  // Apply search filter
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
      { category: { [Op.iLike]: `%${search}%` } }
    ];
  }

  // Get total count for pagination
  const total = await Product.count({ where });

  // Fetch products with pagination
  const products = await Product.findAll({
    where,
    order,
    limit: limitInt,
    offset
  });

  // Convert to JSON
  const productsData = products.map(p => p.toJSON());

  res.json({
    success: true,
    data: {
      products: productsData,
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

  const product = await Product.findByPk(id);
  
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Increment view count
  await product.update({
    viewCount: (product.viewCount || 0) + 1,
    lastViewedAt: new Date()
  });

  res.json({
    success: true,
    data: product.toJSON()
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
    salesCount: 0
  };

  const createdProduct = await Product.create(productData);

  res.status(201).json({
    success: true,
    message: 'Product created successfully and pending approval',
    data: createdProduct.toJSON()
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

  const product = await Product.findByPk(id);
  
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Check ownership
  if (product.vendorId !== user.uid && user.role !== 'admin') {
    throw new AppError('Not authorized to update this product', 403);
  }

  const updates = {};

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

    // Add to existing images
    updates.images = [...(product.images || []), ...newImages];
  }

  await product.update(updates);

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: product.toJSON()
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

  const product = await Product.findByPk(id);
  
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Check ownership
  if (product.vendorId !== user.uid && user.role !== 'admin') {
    throw new AppError('Not authorized to delete this product', 403);
  }

  // Check if product has sales
  if (product.salesCount > 0) {
    throw new AppError('Cannot delete product with existing sales', 400);
  }

  await product.destroy();

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

  const product = await Product.findByPk(id);
  
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Check ownership
  if (product.vendorId !== user.uid && user.role !== 'admin') {
    throw new AppError('Not authorized to update this product', 403);
  }

  const thumbnailUrl = `/uploads/${req.file.filename}`;

  await product.update({
    thumbnail: thumbnailUrl
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
  const products = await Product.findAll({
    where: { status: 'active' },
    attributes: ['category'],
    group: ['category']
  });

  const categories = [...new Set(products.map(p => p.category).filter(c => c))];

  res.json({
    success: true,
    data: categories.sort()
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

  const products = await Product.findAll({
    where: {
      featured: true,
      status: 'active'
    },
    order: [['rating', 'DESC']],
    limit
  });

  res.json({
    success: true,
    data: products.map(p => p.toJSON())
  });
}));

/**
 * @route   POST /api/products/seed
 * @desc    Seed products without authentication (temporary for development)
 * @access  Public (development only)
 */
router.post('/seed', [
  body('name').trim().isLength({ min: 2, max: 200 }),
  body('description').trim().isLength({ min: 10, max: 2000 }),
  body('price').isFloat({ min: 0 }),
  body('category').optional().trim(),
  body('brand').optional().trim(),
  body('stockQuantity').optional().isInt({ min: 0 }),
  body('features').optional().isArray(),
  body('images').optional().isArray()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const {
    name,
    description,
    price,
    category = 'home',
    brand,
    stockQuantity = 50,
    features = [],
    images = []
  } = req.body;

  try {
    // Create product without requiring authentication (for seeding)
    const productData = {
      name,
      description,
      price: parseFloat(price),
      category,
      brand: brand || 'Unknown',
      stockQuantity: parseInt(stockQuantity),
      features,
      images,
      vendorId: 'kitchen-store-vendor', // Mock vendor ID
      vendorName: 'Kitchen Store Pro',
      vendorLocation: 'Lagos, Nigeria',
      vendorVerified: true,
      vendorRating: 4.8,
      isActive: true,
      status: 'active',
      views: 0,
      salesCount: 0,
      rating: 0,
      reviewCount: 0,
      tags: features || [],
      sku: `KSP-${Date.now()}`,
      weight: 1,
      dimensions: {
        length: 10,
        width: 10,
        height: 10
      }
    };

    const createdProduct = await Product.create(productData);
    
    res.status(201).json({
      success: true,
      data: createdProduct.toJSON(),
      message: 'Product seeded successfully'
    });
  } catch (error) {
    console.error('Error seeding product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed product',
      message: error.message
    });
  }
}));

module.exports = router;

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { Op } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { Product } = require('../models');
const cache = require('../utils/cache');
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
  query('search').optional().trim().isLength({ max: 100 }),
  query('vendorId').optional().trim(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('brand').optional().trim(),
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'out_of_stock']),
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
    brand,
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

  if (brand) {
    where.brand = brand;
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

  // Apply search filter (limit length to prevent ReDoS)
  if (search) {
    const searchTerm = String(search).slice(0, 100);
    where[Op.or] = [
      { name: { [Op.iLike]: `%${searchTerm}%` } },
      { description: { [Op.iLike]: `%${searchTerm}%` } },
      { category: { [Op.iLike]: `%${searchTerm}%` } },
      { brand: { [Op.iLike]: `%${searchTerm}%` } }
    ];
  }

  // Build cache key from normalized query params
  const cacheKey = `products:list:${Buffer.from(JSON.stringify({
    page, limit, category, search, vendorId, minPrice, maxPrice, brand, status, featured, sortBy, sortOrder
  })).toString('base64')}`;

  let productsData;
  let totalCount;

  const cached = await cache.get(cacheKey);
  if (cached) {
    productsData = cached.products;
    totalCount = cached.total;
  } else {
    // Get total count for pagination
    totalCount = await Product.count({ where });

    // Fetch products with pagination
    const products = await Product.findAll({
      where,
      order,
      limit: limitInt,
      offset
    });

    productsData = products.map(p => p.toJSON());

    // Cache for 2 minutes
    await cache.set(cacheKey, { products: productsData, total: totalCount }, 120);
  }

  res.json({
    success: true,
    data: {
      products: productsData,
      pagination: {
        currentPage: pageInt,
        totalPages: Math.ceil(totalCount / limitInt),
        totalItems: totalCount,
        itemsPerPage: limitInt,
        hasNextPage: pageInt * limitInt < totalCount,
        hasPreviousPage: pageInt > 1
      }
    }
  });
}));

/**
 * @route   GET /api/products/meta
 * @desc    Get product metadata (categories, brands, price range) for filter UI
 * @access  Public
 */
router.get('/meta', asyncHandler(async (req, res) => {
  const cacheKey = 'products:meta';

  let meta = await cache.get(cacheKey);
  if (!meta) {
    const allProducts = await Product.findAll({
      attributes: ['category', 'brand', 'price', 'isActive'],
      where: { isActive: true },
      raw: true,
    });

    const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))].sort();
    const brands = [...new Set(allProducts.map(p => p.brand).filter(Boolean))].sort();
    const prices = allProducts.map(p => parseFloat(p.price)).filter(p => p > 0);
    const priceRange = prices.length > 0
      ? { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) }
      : { min: 0, max: 10000000 };

    meta = { categories, brands, priceRange };
    await cache.set(cacheKey, meta, 300); // Cache 5 minutes
  }

  res.json({ success: true, data: meta });
}));

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID
 * @access  Public
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Validate UUID format to avoid 500 errors from invalid IDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new AppError('Product not found', 404);
  }
  
  const cacheKey = `products:single:${id}`;

  let productData = await cache.get(cacheKey);

  if (!productData) {
    const product = await Product.findByPk(id);

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    productData = product.toJSON();
    await cache.set(cacheKey, productData, 300); // Cache 5 minutes
  }

  // Increment view count async (don't block response)
  Product.findByPk(id).then(p => {
    if (p) {
      p.update({ views: (p.views || 0) + 1, lastViewedAt: new Date() });
    }
  }).catch(() => {});

  res.json({
    success: true,
    data: productData
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
  body('brand').optional().trim().isLength({ min: 1, max: 100 }),
  body('currency').optional().trim(),
  body('stock').isInt({ min: 0 }),
  body('condition').optional().isIn(['new', 'used', 'refurbished']),
  body('processingTimeDays').optional().isInt({ min: 1, max: 30 }),
  body('shipping').optional().isObject(),
  body('dimensions').optional().isObject(),
  body('specifications').optional().isObject(),
  body('features').optional().isArray(),
  body('tags').optional().isArray(),
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
    brand,
    currency,
    stock,
    condition,
    processingTimeDays = 2,
    shipping = {},
    dimensions = {},
    specifications = {},
    features = [],
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
    brand,
    currency,
    stockQuantity: parseInt(stock),
    condition,
    processingTimeDays: parseInt(processingTimeDays),
    vendorId: user.uid,
    vendorName: user.storeName || user.vendorProfile?.storeName ||
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.displayName || user.email,
    vendorEmail: user.email,
    trackingNumber,
    images,
    specifications,
    features,
    tags,
    shipping,
    dimensions,
    status: 'approved',
    featured: false,
    rating: 0,
    reviewCount: 0,
    viewCount: 0,
    salesCount: 0
  };

  const createdProduct = await Product.create(productData);

  // Invalidate product list cache
  await cache.delPattern('products:list:*');

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: createdProduct.toJSON()
  });
}));

/**
 * @route   PUT/PATCH /api/products/:id
 * @desc    Update product
 * @access  Private (product owner or admin)
 */
const updateProductValidators = [
  body('name').optional().trim().isLength({ min: 2, max: 200 }),
  body('description').optional().trim().isLength({ min: 10, max: 2000 }),
  body('price').optional().isFloat({ min: 0 }),
  body('category').optional().trim().notEmpty(),
  body('stock').optional().isInt({ min: 0 }),
  body('status').optional().isIn(['pending', 'approved', 'rejected', 'out_of_stock', 'active', 'inactive', 'suspended']),
  handleValidationErrors
];

const updateProductHandler = asyncHandler(async (req, res) => {
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

  // Update fields - allow both `stock` (frontend) and `stockQuantity` (model)
  const allowedFields = ['name', 'description', 'price', 'category', 'brand', 'currency', 'stock', 'stockQuantity', 'status', 'processingTimeDays', 'shipping', 'dimensions', 'specifications', 'features', 'tags', 'condition', 'featured', 'isFeatured', 'isActive', 'storeId'];
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      if (field === 'price') {
        updates[field] = parseFloat(req.body[field]);
      } else if (field === 'stock' || field === 'stockQuantity' || field === 'processingTimeDays') {
        updates.stockQuantity = parseInt(req.body[field]);
      } else if (field === 'isFeatured') {
        updates.featured = !!req.body[field];
      } else {
        updates[field] = req.body[field];
      }
    }
  });

  // Normalize frontend status aliases to the model enum
  if (updates.status === 'active') updates.status = 'approved';
  if (updates.status === 'inactive' || updates.status === 'suspended') updates.status = 'rejected';

  // Normalize out_of_stock status based on stock
  if (updates.stockQuantity !== undefined) {
    if (updates.stockQuantity <= 0 && updates.status !== 'rejected' && updates.status !== 'pending') {
      updates.status = 'out_of_stock';
    } else if (updates.stockQuantity > 0 && product.status === 'out_of_stock') {
      updates.status = 'approved';
    }
  }

  // Process new images if uploaded
  if (req.files && req.files.length > 0) {
    const newImages = req.files.map(file => ({
      url: `/uploads/${file.filename}`,
      alt: product.name || 'Product image',
      type: file.mimetype.split('/')[0],
      size: file.size
    }));

    // Use explicitly provided existingImages when present, otherwise start from current images
    const existingImages = req.body.existingImages ? JSON.parse(req.body.existingImages) : (product.images || []);
    updates.images = [...existingImages, ...newImages];
  } else if (req.body.existingImages) {
    // Preserve reordered/kept images even when no new files are uploaded
    updates.images = JSON.parse(req.body.existingImages);
  }

  await product.update(updates);

  // Invalidate caches
  await cache.del(`products:single:${id}`);
  await cache.delPattern('products:list:*');

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: product.toJSON()
  });
});

router.put('/:id', authenticateToken, upload.array('images', 5), updateProductValidators, updateProductHandler);
router.patch('/:id', authenticateToken, updateProductValidators, updateProductHandler);

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

  // Invalidate caches
  await cache.del(`products:single:${id}`);
  await cache.delPattern('products:list:*');

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
    where: { status: 'approved' },
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

  // Try featured products first (if column exists), fallback to approved products
  let products = [];
  try {
    products = await Product.findAll({
      where: {
        featured: true,
        status: 'approved'
      },
      order: [['rating', 'DESC']],
      limit
    });
  } catch (e) {
    // 'featured' column may not exist, fall through to fallback
  }

  // Fallback: get approved products ordered by creation date
  if (!products || products.length === 0) {
    products = await Product.findAll({
      where: { status: 'approved' },
      order: [['createdAt', 'DESC']],
      limit
    });
  }

  res.json({
    success: true,
    data: products.map(p => p.toJSON())
  });
}));

/**
 * @route   POST /api/products/seed
 * @desc    Seed products (development only)
 * @access  Public (development only)
 */
if (process.env.NODE_ENV === 'development') {
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
      const productData = {
        name,
        description,
        price: parseFloat(price),
        category,
        brand: brand || 'Unknown',
        stockQuantity: parseInt(stockQuantity),
        features,
        images,
        vendorId: 'dev-seed-vendor',
        vendorName: 'Dev Seed Vendor',
        vendorLocation: 'Lagos, Nigeria',
        vendorVerified: true,
        vendorRating: 4.8,
        isActive: true,
        status: 'approved',
        views: 0,
        salesCount: 0,
        rating: 0,
        reviewCount: 0,
        tags: features || [],
        sku: `DEV-${Date.now()}`,
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
}

module.exports = router;

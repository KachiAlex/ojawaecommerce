const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op, fn, col, literal } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { Review, Product, Order } = require('../models');

const router = express.Router();

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
 * @route   POST /api/reviews
 * @desc    Create a new review for a product
 * @access  Private
 */
router.post('/', authenticateToken, [
  body('productId').notEmpty(),
  body('orderId').notEmpty(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').trim().isLength({ min: 5, max: 2000 }),
  body('title').optional().trim().isLength({ min: 2, max: 200 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { productId, orderId, rating, comment, title, images = [] } = req.body;

  // Verify the order exists, belongs to the user, and is delivered
  const order = await Order.findOne({
    where: {
      id: orderId,
      buyerId: userId,
      status: 'delivered'
    }
  });

  if (!order) {
    throw new AppError('You can only review products from delivered orders', 403);
  }

  // Verify the product was in the order
  const orderItems = order.items || [];
  const hasProduct = orderItems.some(item => item.productId === productId);
  if (!hasProduct) {
    throw new AppError('This product was not part of the order', 400);
  }

  // Check if user already reviewed this product for this order
  const existingReview = await Review.findOne({
    where: { productId, orderId, userId }
  });

  if (existingReview) {
    throw new AppError('You have already reviewed this product for this order', 400);
  }

  const review = await Review.create({
    productId,
    orderId,
    userId,
    userName: req.user.displayName || req.user.email || 'Anonymous',
    rating,
    comment,
    title: title || null,
    images: Array.isArray(images) ? images : [],
    verifiedPurchase: true,
    status: 'pending'
  });

  res.status(201).json({
    success: true,
    message: 'Review submitted and pending approval',
    data: review.toJSON()
  });
}));

/**
 * @route   GET /api/reviews/product/:productId
 * @desc    Get approved reviews for a product
 * @access  Public
 */
router.get('/product/:productId', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('sortBy').optional().isIn(['newest', 'highest', 'lowest', 'helpful']),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 10, sortBy = 'newest' } = req.query;

  const limitInt = parseInt(limit);
  const offset = (parseInt(page) - 1) * limitInt;

  // Build order clause
  let order = [['createdAt', 'DESC']];
  switch (sortBy) {
    case 'highest':
      order = [['rating', 'DESC'], ['createdAt', 'DESC']];
      break;
    case 'lowest':
      order = [['rating', 'ASC'], ['createdAt', 'DESC']];
      break;
    case 'helpful':
      order = [['helpfulCount', 'DESC'], ['createdAt', 'DESC']];
      break;
  }

  const { rows: reviews, count: total } = await Review.findAndCountAll({
    where: {
      productId,
      status: 'approved'
    },
    order,
    limit: limitInt,
    offset
  });

  // Calculate rating distribution
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const allReviews = await Review.findAll({
    where: { productId, status: 'approved' },
    attributes: ['rating']
  });

  allReviews.forEach(r => {
    distribution[r.rating] = (distribution[r.rating] || 0) + 1;
  });

  const averageRating = allReviews.length > 0
    ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)
    : 0;

  res.json({
    success: true,
    data: {
      reviews: reviews.map(r => r.toJSON()),
      summary: {
        totalReviews: allReviews.length,
        averageRating,
        distribution
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limitInt),
        totalItems: total,
        itemsPerPage: limitInt
      }
    }
  });
}));

/**
 * @route   GET /api/reviews/my-reviews
 * @desc    Get current user's reviews
 * @access  Private
 */
router.get('/my-reviews', authenticateToken, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { page = 1, limit = 10 } = req.query;

  const limitInt = parseInt(limit);
  const offset = (parseInt(page) - 1) * limitInt;

  const { rows: reviews, count: total } = await Review.findAndCountAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit: limitInt,
    offset
  });

  res.json({
    success: true,
    data: {
      reviews: reviews.map(r => r.toJSON()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limitInt),
        totalItems: total,
        itemsPerPage: limitInt
      }
    }
  });
}));

/**
 * @route   PUT /api/reviews/:id/helpful
 * @desc    Mark a review as helpful
 * @access  Public
 */
router.put('/:id/helpful', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const review = await Review.findByPk(id);
  if (!review) {
    throw new AppError('Review not found', 404);
  }

  await review.update({
    helpfulCount: (review.helpfulCount || 0) + 1
  });

  res.json({
    success: true,
    message: 'Review marked as helpful',
    data: { helpfulCount: review.helpfulCount }
  });
}));

/**
 * @route   PUT /api/reviews/:id/status
 * @desc    Approve or reject a review (admin only)
 * @access  Private (admin)
 */
router.put('/:id/status', authenticateToken, [
  body('status').isIn(['approved', 'rejected']),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const { id } = req.params;
  const { status } = req.body;

  const review = await Review.findByPk(id);
  if (!review) {
    throw new AppError('Review not found', 404);
  }

  await review.update({ status });

  res.json({
    success: true,
    message: `Review ${status}`,
    data: review.toJSON()
  });
}));

/**
 * @route   GET /api/reviews/pending
 * @desc    Get pending reviews (admin only)
 * @access  Private (admin)
 */
router.get('/pending', authenticateToken, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const { page = 1, limit = 20 } = req.query;
  const limitInt = parseInt(limit);
  const offset = (parseInt(page) - 1) * limitInt;

  const { rows: reviews, count: total } = await Review.findAndCountAll({
    where: { status: 'pending' },
    order: [['createdAt', 'DESC']],
    limit: limitInt,
    offset
  });

  res.json({
    success: true,
    data: {
      reviews: reviews.map(r => r.toJSON()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limitInt),
        totalItems: total,
        itemsPerPage: limitInt
      }
    }
  });
}));

module.exports = router;

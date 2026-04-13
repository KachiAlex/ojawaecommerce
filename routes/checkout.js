// Checkout API Routes

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Mock database for demo (replace with actual database)
const orders = [];
const orderCounter = 1000;

// Validate checkout data
router.post('/validate', auth, [
  body('items').isArray({ min: 1 }).withMessage('Items array is required'),
  body('shippingAddress').isObject().withMessage('Shipping address is required'),
  body('paymentMethod').isIn(['escrow', 'wallet', 'card']).withMessage('Invalid payment method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { items, shippingAddress, paymentMethod } = req.body;

    // Validate items
    for (const item of items) {
      if (!item.productId || !item.quantity || !item.price) {
        return res.status(400).json({
          success: false,
          error: 'Invalid item data'
        });
      }
    }

    // Validate shipping address
    const requiredAddressFields = ['street', 'city', 'state', 'country', 'postalCode'];
    const missingFields = requiredAddressFields.filter(field => !shippingAddress[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing shipping address fields: ${missingFields.join(', ')}`
      });
    }

    // Calculate totals
    const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shippingCost = paymentMethod === 'express' ? 1500 : 500;
    const tax = subtotal * 0.05; // 5% tax
    const total = subtotal + shippingCost + tax;

    res.json({
      success: true,
      data: {
        valid: true,
        totals: {
          subtotal,
          shippingCost,
          tax,
          total
        },
        estimatedDelivery: paymentMethod === 'express' ? '1-2 business days' : '3-5 business days'
      }
    });

  } catch (error) {
    console.error('Checkout validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create order
router.post('/create', auth, [
  body('items').isArray({ min: 1 }).withMessage('Items array is required'),
  body('shippingAddress').isObject().withMessage('Shipping address is required'),
  body('paymentMethod').isIn(['escrow', 'wallet', 'card']).withMessage('Invalid payment method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { items, shippingAddress, paymentMethod, deliveryOption = 'standard' } = req.body;
    const userId = req.user.uid;

    // Generate order ID
    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Calculate totals
    const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shippingCost = deliveryOption === 'express' ? 1500 : 500;
    const tax = subtotal * 0.05; // 5% tax
    const total = subtotal + shippingCost + tax;

    // Create order object
    const order = {
      orderId,
      userId,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        name: item.name || 'Product',
        vendorId: item.vendorId || 'unknown'
      })),
      shippingAddress: {
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        country: shippingAddress.country,
        postalCode: shippingAddress.postalCode
      },
      paymentMethod,
      deliveryOption,
      totals: {
        subtotal,
        shippingCost,
        tax,
        total
      },
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedDelivery: deliveryOption === 'express' ? 
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() : // 2 days
        new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()  // 5 days
    };

    // Save order (in production, save to database)
    orders.push(order);

    // Clear user cart (in production, update database)
    // await clearUserCart(userId);

    console.log('Order created:', order);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order.orderId,
        status: order.status,
        totals: order.totals,
        estimatedDelivery: order.estimatedDelivery,
        createdAt: order.createdAt
      }
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order'
    });
  }
});

// Process payment
router.post('/payment', auth, [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('paymentMethod').isIn(['escrow', 'wallet', 'card']).withMessage('Invalid payment method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { orderId, paymentMethod, paymentDetails } = req.body;
    const userId = req.user.uid;

    // Find order
    const order = orders.find(o => o.orderId === orderId && o.userId === userId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Process payment based on method
    let paymentResult;
    switch (paymentMethod) {
      case 'escrow':
        paymentResult = await processEscrowPayment(order, paymentDetails);
        break;
      case 'wallet':
        paymentResult = await processWalletPayment(order, paymentDetails);
        break;
      case 'card':
        paymentResult = await processCardPayment(order, paymentDetails);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid payment method'
        });
    }

    if (paymentResult.success) {
      // Update order status
      order.paymentStatus = 'paid';
      order.status = 'processing';
      order.updatedAt = new Date().toISOString();
      order.paymentId = paymentResult.paymentId;

      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          orderId: order.orderId,
          paymentId: paymentResult.paymentId,
          status: order.status,
          paymentStatus: order.paymentStatus
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: paymentResult.error || 'Payment failed'
      });
    }

  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment processing failed'
    });
  }
});

// Helper functions for payment processing
async function processEscrowPayment(order, details) {
  // Mock escrow payment processing
  console.log('Processing escrow payment for order:', order.orderId);
  
  // Simulate payment processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    paymentId: `ESC-${Date.now()}`,
    message: 'Escrow payment processed successfully'
  };
}

async function processWalletPayment(order, details) {
  // Mock wallet payment processing
  console.log('Processing wallet payment for order:', order.orderId);
  
  // Check wallet balance (mock)
  const walletBalance = 10000; // Mock balance
  
  if (walletBalance < order.totals.total) {
    return {
      success: false,
      error: 'Insufficient wallet balance'
    };
  }
  
  return {
    success: true,
    paymentId: `WAL-${Date.now()}`,
    message: 'Wallet payment processed successfully'
  };
}

async function processCardPayment(order, details) {
  // Mock card payment processing
  console.log('Processing card payment for order:', order.orderId);
  
  // Simulate payment processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    success: true,
    paymentId: `CARD-${Date.now()}`,
    message: 'Card payment processed successfully'
  };
}

// Get shipping options
router.post('/shipping/options', auth, async (req, res) => {
  try {
    const { address } = req.body;

    // Mock shipping options based on location
    const options = [
      {
        id: 'standard',
        name: 'Standard Delivery',
        estimatedDays: '3-5 business days',
        cost: 500,
        description: 'Standard shipping with tracking'
      },
      {
        id: 'express',
        name: 'Express Delivery',
        estimatedDays: '1-2 business days',
        cost: 1500,
        description: 'Express shipping with priority tracking'
      }
    ];

    res.json({
      success: true,
      data: {
        options,
        selectedAddress: address
      }
    });

  } catch (error) {
    console.error('Get shipping options error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get shipping options'
    });
  }
});

module.exports = router;

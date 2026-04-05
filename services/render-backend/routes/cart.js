const express = require('express');
const { body, validationResult } = require('express-validator');
const admin = require('firebase-admin');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const db = admin.firestore();

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
 * @route   GET /api/cart
 * @desc    Get user's cart
 * @access  Private
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;

  const cartDoc = await db.collection('carts').doc(userId).get();
  
  if (!cartDoc.exists) {
    return res.json({
      success: true,
      data: {
        items: [],
        total: 0,
        itemCount: 0
      }
    });
  }

  const cart = cartDoc.data();

  res.json({
    success: true,
    data: cart
  });
}));

/**
 * @route   POST /api/cart
 * @desc    Update cart (add/update items)
 * @access  Private
 */
router.post('/', authenticateToken, [
  body('items').isArray({ min: 1 }),
  body('items.*.productId').notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.price').isFloat({ min: 0 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { items } = req.body;

  // Verify all products exist and get their details
  const productIds = items.map(item => item.productId);
  const productDocs = await Promise.all(
    productIds.map(id => db.collection('products').doc(id).get())
  );

  const validItems = [];
  let total = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const productDoc = productDocs[i];

    if (!productDoc.exists) {
      continue; // Skip invalid products
    }

    const product = productDoc.data();

    // Check if product is active and in stock
    if (product.status !== 'active' || product.stock <= 0) {
      continue;
    }

    // Verify price matches current product price
    const currentPrice = product.price;
    if (Math.abs(item.price - currentPrice) > 0.01) {
      // Update to current price
      item.price = currentPrice;
    }

    // Check stock availability
    if (item.quantity > product.stock) {
      item.quantity = product.stock;
    }

    const itemTotal = item.price * item.quantity;
    total += itemTotal;

    validItems.push({
      productId: item.productId,
      name: product.name,
      price: item.price,
      quantity: item.quantity,
      image: product.images?.[0]?.url || product.thumbnail || null,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
      subtotal: itemTotal,
      addedAt: new Date().toISOString()
    });
  }

  const cartData = {
    userId,
    items: validItems,
    total,
    itemCount: validItems.reduce((sum, item) => sum + item.quantity, 0),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('carts').doc(userId).set(cartData, { merge: true });

  res.json({
    success: true,
    message: 'Cart updated successfully',
    data: cartData
  });
}));

/**
 * @route   PUT /api/cart/item
 * @desc    Update single cart item quantity
 * @access  Private
 */
router.put('/item', authenticateToken, [
  body('productId').notEmpty(),
  body('quantity').isInt({ min: 0 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { productId, quantity } = req.body;

  const cartDoc = await db.collection('carts').doc(userId).get();
  
  if (!cartDoc.exists) {
    throw new AppError('Cart not found', 404);
  }

  const cart = cartDoc.data();
  let items = cart.items || [];

  if (quantity === 0) {
    // Remove item from cart
    items = items.filter(item => item.productId !== productId);
  } else {
    // Update item quantity
    const itemIndex = items.findIndex(item => item.productId === productId);
    
    if (itemIndex === -1) {
      throw new AppError('Item not found in cart', 404);
    }

    // Verify product still exists and has stock
    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      // Remove item if product no longer exists
      items = items.filter(item => item.productId !== productId);
    } else {
      const product = productDoc.data();
      
      if (product.status !== 'active') {
        // Remove item if product is inactive
        items = items.filter(item => item.productId !== productId);
      } else {
        // Update quantity, respecting stock limits
        const maxQuantity = Math.min(quantity, product.stock);
        items[itemIndex].quantity = maxQuantity;
        items[itemIndex].subtotal = items[itemIndex].price * maxQuantity;
      }
    }
  }

  // Recalculate totals
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const updatedCart = {
    ...cart,
    items,
    total,
    itemCount,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('carts').doc(userId).set(updatedCart, { merge: true });

  res.json({
    success: true,
    message: 'Cart item updated successfully',
    data: updatedCart
  });
}));

/**
 * @route   DELETE /api/cart
 * @desc    Clear entire cart
 * @access  Private
 */
router.delete('/', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;

  await db.collection('carts').doc(userId).delete();

  res.json({
    success: true,
    message: 'Cart cleared successfully'
  });
}));

/**
 * @route   DELETE /api/cart/item/:productId
 * @desc    Remove specific item from cart
 * @access  Private
 */
router.delete('/item/:productId', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { productId } = req.params;

  const cartDoc = await db.collection('carts').doc(userId).get();
  
  if (!cartDoc.exists) {
    throw new AppError('Cart not found', 404);
  }

  const cart = cartDoc.data();
  const items = cart.items || [];

  // Remove the item
  const updatedItems = items.filter(item => item.productId !== productId);

  if (updatedItems.length === items.length) {
    throw new AppError('Item not found in cart', 404);
  }

  // Recalculate totals
  const total = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const itemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);

  const updatedCart = {
    ...cart,
    items: updatedItems,
    total,
    itemCount,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('carts').doc(userId).set(updatedCart, { merge: true });

  res.json({
    success: true,
    message: 'Item removed from cart successfully',
    data: updatedCart
  });
}));

/**
 * @route   POST /api/cart/merge
 * @desc    Merge guest cart with user cart after login
 * @access  Private
 */
router.post('/merge', authenticateToken, [
  body('guestItems').isArray(),
  body('guestItems.*.productId').notEmpty(),
  body('guestItems.*.quantity').isInt({ min: 1 }),
  body('guestItems.*.price').isFloat({ min: 0 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { guestItems } = req.body;

  // Get existing user cart
  const cartDoc = await db.collection('carts').doc(userId).get();
  const existingCart = cartDoc.exists ? cartDoc.data() : { items: [] };

  // Combine existing items with guest items
  const combinedItems = [...existingCart.items];

  for (const guestItem of guestItems) {
    const existingItemIndex = combinedItems.findIndex(item => item.productId === guestItem.productId);
    
    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      combinedItems[existingItemIndex].quantity += guestItem.quantity;
      combinedItems[existingItemIndex].subtotal = combinedItems[existingItemIndex].price * combinedItems[existingItemIndex].quantity;
    } else {
      // Add new item
      combinedItems.push({
        ...guestItem,
        subtotal: guestItem.price * guestItem.quantity,
        addedAt: new Date().toISOString()
      });
    }
  }

  // Verify all products and update prices
  const productIds = combinedItems.map(item => item.productId);
  const productDocs = await Promise.all(
    productIds.map(id => db.collection('products').doc(id).get())
  );

  const validItems = [];
  let total = 0;

  for (let i = 0; i < combinedItems.length; i++) {
    const item = combinedItems[i];
    const productDoc = productDocs[i];

    if (!productDoc.exists || productDoc.data().status !== 'active') {
      continue; // Skip invalid products
    }

    const product = productDoc.data();
    
    // Update to current price
    const currentPrice = product.price;
    const updatedItem = {
      ...item,
      price: currentPrice,
      subtotal: currentPrice * item.quantity
    };

    // Check stock availability
    if (item.quantity > product.stock) {
      updatedItem.quantity = product.stock;
      updatedItem.subtotal = currentPrice * product.stock;
    }

    validItems.push(updatedItem);
    total += updatedItem.subtotal;
  }

  const mergedCart = {
    userId,
    items: validItems,
    total,
    itemCount: validItems.reduce((sum, item) => sum + item.quantity, 0),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('carts').doc(userId).set(mergedCart, { merge: true });

  res.json({
    success: true,
    message: 'Cart merged successfully',
    data: mergedCart
  });
}));

/**
 * @route   GET /api/cart/summary
 * @desc    Get cart summary (totals only)
 * @access  Private
 */
router.get('/summary', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;

  const cartDoc = await db.collection('carts').doc(userId).get();
  
  if (!cartDoc.exists) {
    return res.json({
      success: true,
      data: {
        itemCount: 0,
        total: 0,
        subtotal: 0,
        tax: 0,
        shipping: 0
      }
    });
  }

  const cart = cartDoc.data();

  res.json({
    success: true,
    data: {
      itemCount: cart.itemCount || 0,
      total: cart.total || 0,
      subtotal: cart.total || 0,
      tax: 0, // Calculate tax if needed
      shipping: 0 // Calculate shipping if needed
    }
  });
}));

module.exports = router;

const express = require('express');
const { body, validationResult } = require('express-validator');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { Cart, CartItem, Product } = require('../models');
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
 * @route   GET /api/cart
 * @desc    Get user's cart
 * @access  Private
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;

  const cart = await Cart.findOne({
    where: { userId },
    include: [{
      model: CartItem,
      include: [{ model: Product }]
    }]
  });
  
  if (!cart) {
    return res.json({
      success: true,
      data: {
        items: [],
        total: 0,
        itemCount: 0
      }
    });
  }

  const cartData = cart.toJSON();
  const items = cartData.cartItems || [];
  
  // Format items with product details
  const formattedItems = items.map(item => ({
    productId: item.productId,
    cartItemId: item.id,
    name: item.product?.name,
    price: item.price,
    quantity: item.quantity,
    image: item.product?.images?.[0]?.url || item.product?.thumbnail || null,
    vendorId: item.product?.vendorId,
    vendorName: item.product?.vendorName,
    subtotal: item.price * item.quantity,
    addedAt: item.createdAt
  }));

  res.json({
    success: true,
    data: {
      items: formattedItems,
      total: cartData.total || 0,
      itemCount: cartData.itemCount || 0
    }
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

  // Find or create cart
  let cart = await Cart.findOne({ where: { userId } });
  if (!cart) {
    cart = await Cart.create({ userId, total: 0, itemCount: 0 });
  }

  // Verify all products exist and get their details
  const productIds = items.map(item => item.productId);
  const products = await Product.findAll({
    where: { id: productIds }
  });
  const productMap = new Map(products.map(p => [p.id, p]));

  const validItems = [];
  let total = 0;

  for (const item of items) {
    const product = productMap.get(item.productId);

    if (!product) {
      continue; // Skip invalid products
    }

    // Check if product is active and in stock
    if (product.status !== 'active' || product.stock <= 0) {
      continue;
    }

    // Verify price matches current product price
    const currentPrice = product.price;
    const quantity = Math.min(item.quantity, product.stock);
    const itemTotal = currentPrice * quantity;
    total += itemTotal;

    // Check if cart item already exists
    let cartItem = await CartItem.findOne({
      where: { cartId: cart.id, productId: item.productId }
    });

    if (cartItem) {
      // Update existing cart item
      await cartItem.update({
        price: currentPrice,
        quantity,
        subtotal: itemTotal
      });
      validItems.push({
        productId: item.productId,
        cartItemId: cartItem.id,
        name: product.name,
        price: currentPrice,
        quantity,
        image: product.images?.[0]?.url || product.thumbnail || null,
        vendorId: product.vendorId,
        vendorName: product.vendorName,
        subtotal: itemTotal,
        addedAt: cartItem.createdAt
      });
    } else {
      // Create new cart item
      cartItem = await CartItem.create({
        cartId: cart.id,
        productId: item.productId,
        price: currentPrice,
        quantity,
        subtotal: itemTotal
      });
      validItems.push({
        productId: item.productId,
        cartItemId: cartItem.id,
        name: product.name,
        price: currentPrice,
        quantity,
        image: product.images?.[0]?.url || product.thumbnail || null,
        vendorId: product.vendorId,
        vendorName: product.vendorName,
        subtotal: itemTotal,
        addedAt: cartItem.createdAt
      });
    }
  }

  // Update cart totals
  const itemCount = validItems.reduce((sum, item) => sum + item.quantity, 0);
  await cart.update({ total, itemCount });

  res.json({
    success: true,
    message: 'Cart updated successfully',
    data: {
      items: validItems,
      total,
      itemCount
    }
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

  const cart = await Cart.findOne({ where: { userId } });
  
  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  const cartItem = await CartItem.findOne({
    where: { cartId: cart.id, productId }
  });

  if (!cartItem) {
    throw new AppError('Item not found in cart', 404);
  }

  if (quantity === 0) {
    // Remove item from cart
    await cartItem.destroy();
  } else {
    // Verify product still exists and has stock
    const product = await Product.findByPk(productId);
    if (!product || product.status !== 'active') {
      await cartItem.destroy();
    } else {
      // Update quantity, respecting stock limits
      const maxQuantity = Math.min(quantity, product.stock);
      await cartItem.update({
        quantity: maxQuantity,
        subtotal: cartItem.price * maxQuantity
      });
    }
  }

  // Recalculate totals
  const cartItems = await CartItem.findAll({ where: { cartId: cart.id } });
  const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  await cart.update({ total, itemCount });

  // Get updated cart with items
  const updatedCart = await Cart.findOne({
    where: { userId },
    include: [{ model: CartItem, include: [{ model: Product }] }]
  });

  const cartData = updatedCart.toJSON();
  const items = cartData.cartItems || [];
  const formattedItems = items.map(item => ({
    productId: item.productId,
    cartItemId: item.id,
    name: item.product?.name,
    price: item.price,
    quantity: item.quantity,
    image: item.product?.images?.[0]?.url || item.product?.thumbnail || null,
    vendorId: item.product?.vendorId,
    vendorName: item.product?.vendorName,
    subtotal: item.price * item.quantity,
    addedAt: item.createdAt
  }));

  res.json({
    success: true,
    message: 'Cart item updated successfully',
    data: {
      items: formattedItems,
      total,
      itemCount
    }
  });
}));

/**
 * @route   DELETE /api/cart
 * @desc    Clear entire cart
 * @access  Private
 */
router.delete('/', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;

  await Cart.destroy({ where: { userId } });

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

  const cart = await Cart.findOne({ where: { userId } });
  
  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  const cartItem = await CartItem.findOne({
    where: { cartId: cart.id, productId }
  });

  if (!cartItem) {
    throw new AppError('Item not found in cart', 404);
  }

  await cartItem.destroy();

  // Recalculate totals
  const cartItems = await CartItem.findAll({ where: { cartId: cart.id } });
  const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  await cart.update({ total, itemCount });

  // Get updated cart with items
  const updatedCart = await Cart.findOne({
    where: { userId },
    include: [{ model: CartItem, include: [{ model: Product }] }]
  });

  const cartData = updatedCart.toJSON();
  const items = cartData.cartItems || [];
  const formattedItems = items.map(item => ({
    productId: item.productId,
    cartItemId: item.id,
    name: item.product?.name,
    price: item.price,
    quantity: item.quantity,
    image: item.product?.images?.[0]?.url || item.product?.thumbnail || null,
    vendorId: item.product?.vendorId,
    vendorName: item.product?.vendorName,
    subtotal: item.price * item.quantity,
    addedAt: item.createdAt
  }));

  res.json({
    success: true,
    message: 'Item removed from cart successfully',
    data: {
      items: formattedItems,
      total,
      itemCount
    }
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

  // Find or create cart
  let cart = await Cart.findOne({ where: { userId } });
  if (!cart) {
    cart = await Cart.create({ userId, total: 0, itemCount: 0 });
  }

  // Get existing cart items
  const existingCartItems = await CartItem.findAll({ where: { cartId: cart.id } });
  const existingItemMap = new Map(existingCartItems.map(item => [item.productId, item]));

  // Verify all products and get current details
  const productIds = [...new Set([...guestItems.map(i => i.productId), ...existingItemMap.keys()])];
  const products = await Product.findAll({ where: { id: productIds } });
  const productMap = new Map(products.map(p => [p.id, p]));

  const validItems = [];
  let total = 0;

  // Process guest items
  for (const guestItem of guestItems) {
    const product = productMap.get(guestItem.productId);
    if (!product || product.status !== 'active' || product.stock <= 0) {
      continue;
    }

    const currentPrice = product.price;
    const quantity = Math.min(guestItem.quantity, product.stock);
    const itemTotal = currentPrice * quantity;

    const existingItem = existingItemMap.get(guestItem.productId);
    if (existingItem) {
      // Update existing item quantity
      const newQuantity = Math.min(existingItem.quantity + guestItem.quantity, product.stock);
      await existingItem.update({
        quantity: newQuantity,
        price: currentPrice,
        subtotal: currentPrice * newQuantity
      });
      validItems.push(existingItem);
      total += currentPrice * newQuantity;
    } else {
      // Create new cart item
      const newCartItem = await CartItem.create({
        cartId: cart.id,
        productId: guestItem.productId,
        price: currentPrice,
        quantity,
        subtotal: itemTotal
      });
      validItems.push(newCartItem);
      total += itemTotal;
    }
  }

  // Add existing items that weren't in guest cart
  for (const [productId, existingItem] of existingItemMap) {
    const isGuestItem = guestItems.some(g => g.productId === productId);
    if (!isGuestItem) {
      const product = productMap.get(productId);
      if (product && product.status === 'active' && product.stock > 0) {
        const newQuantity = Math.min(existingItem.quantity, product.stock);
        if (newQuantity > 0) {
          await existingItem.update({
            quantity: newQuantity,
            price: product.price,
            subtotal: product.price * newQuantity
          });
          validItems.push(existingItem);
          total += product.price * newQuantity;
        } else {
          await existingItem.destroy();
        }
      } else {
        await existingItem.destroy();
      }
    }
  }

  // Update cart totals
  const itemCount = validItems.reduce((sum, item) => sum + item.quantity, 0);
  await cart.update({ total, itemCount });

  // Get updated cart with items
  const updatedCart = await Cart.findOne({
    where: { userId },
    include: [{ model: CartItem, include: [{ model: Product }] }]
  });

  const cartData = updatedCart.toJSON();
  const items = cartData.cartItems || [];
  const formattedItems = items.map(item => ({
    productId: item.productId,
    cartItemId: item.id,
    name: item.product?.name,
    price: item.price,
    quantity: item.quantity,
    image: item.product?.images?.[0]?.url || item.product?.thumbnail || null,
    vendorId: item.product?.vendorId,
    vendorName: item.product?.vendorName,
    subtotal: item.price * item.quantity,
    addedAt: item.createdAt
  }));

  res.json({
    success: true,
    message: 'Cart merged successfully',
    data: {
      items: formattedItems,
      total,
      itemCount
    }
  });
}));

/**
 * @route   GET /api/cart/summary
 * @desc    Get cart summary (totals only)
 * @access  Private
 */
router.get('/summary', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;

  const cart = await Cart.findOne({ where: { userId } });
  
  if (!cart) {
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

  res.json({
    success: true,
    data: {
      itemCount: cart.itemCount || 0,
      total: cart.total || 0,
      subtotal: cart.total || 0,
      tax: 0,
      shipping: 0
    }
  });
}));

module.exports = router;

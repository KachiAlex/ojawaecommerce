const express = require('express');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { optionalAuth, authenticateToken } = require('../middleware/auth');
const { Vendor, Product, User } = require('../models');
const router = express.Router();

const normalizeSlug = value => (value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const isUUID = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

router.get('/:slug/products', asyncHandler(async (req, res) => {
  const requestedSlug = normalizeSlug(req.params.slug);
  const vendors = await Vendor.findAll({ order: [['createdAt', 'DESC']] });
  let vendor = vendors.find(item =>
    normalizeSlug(item.storeName) === requestedSlug
    || item.userId === req.params.slug
    || item.id === req.params.slug
  );

  if (!vendor) {
    const users = await User.findAll({ attributes: ['id', 'email', 'profile'] });
    const matchedUser = users.find(user => {
      const vendorProfile = user.profile?.vendorProfile || {};
      return [vendorProfile.storeSlug, vendorProfile.storeName, vendorProfile.businessName]
        .some(value => normalizeSlug(value) === requestedSlug);
    });
    if (matchedUser) {
      vendor = await Vendor.findOne({ where: { userId: matchedUser.id } });
      // Auto-create Vendor record if user has a vendorProfile but no Vendor table entry
      if (!vendor) {
        const vp = matchedUser.profile?.vendorProfile || {};
        vendor = await Vendor.create({
          userId: matchedUser.id,
          storeName: vp.storeName || vp.businessName || 'My Store',
          storeDescription: vp.storeDescription || '',
          businessEmail: vp.businessEmail || matchedUser.email,
          businessPhone: vp.businessPhone || null,
          businessAddress: vp.businessAddress || {},
          isApproved: true,
          status: 'approved'
        });
      }
    }
  }

  if (!vendor) {
    throw new AppError('Store not found', 404);
  }

  const products = await Product.findAll({
    where: { vendorId: vendor.userId },
    order: [['createdAt', 'DESC']],
    limit: 100
  });

  res.json({
    success: true,
    store: {
      id: vendor.id,
      vendorId: vendor.userId,
      name: vendor.storeName,
      storeSlug: normalizeSlug(vendor.storeName),
      description: vendor.storeDescription,
      logo: vendor.logo,
      banner: vendor.banner,
      contactInfo: {
        email: vendor.businessEmail,
        phone: vendor.businessPhone,
        address: vendor.businessAddress
      },
      rating: Number(vendor.rating) || 0,
      totalReviews: vendor.totalReviews,
      isApproved: vendor.isApproved,
      status: vendor.status
    },
    products: products.map(product => ({
      ...product.toJSON(),
      price: Number(product.price) || 0,
      stock: product.stockQuantity || 0
    }))
  });
}));

// Public endpoint for cart/checkout vendor lookups
router.get('/', asyncHandler(async (req, res) => {
  const { vendorId, storeId, slug, limit = 20, page = 1 } = req.query;

  const where = {};
  if (vendorId) {
    where.userId = vendorId;
  }
  if (storeId) {
    // storeId may be a UUID (Vendor.id) or a tracking ID (STO-2026-xxx)
    if (isUUID(storeId)) {
      where.id = storeId;
    } else {
      // Non-UUID storeId is a client-generated tracking ID that won't be in the DB
      // Return empty result instead of causing a DB error
      return res.json({ success: true, stores: [], pagination: { total: 0, page: parseInt(page, 10), limit: 20, pages: 0 } });
    }
  }

  const limitInt = Math.min(parseInt(limit, 10) || 20, 100);
  const offset = (parseInt(page, 10) - 1) * limitInt;

  const { count, rows } = await Vendor.findAndCountAll({
    where,
    limit: limitInt,
    offset,
    order: [['createdAt', 'DESC']]
  });

  let stores = rows.map(v => ({
    id: v.id,
    vendorId: v.userId,
    name: v.storeName,
    storeSlug: normalizeSlug(v.storeName),
    description: v.storeDescription,
    logo: v.logo,
    banner: v.banner,
    businessEmail: v.businessEmail,
    businessPhone: v.businessPhone,
    businessAddress: v.businessAddress,
    contactInfo: {
      email: v.businessEmail,
      phone: v.businessPhone,
      address: v.businessAddress
    },
    rating: Number(v.rating) || 0,
    totalReviews: v.totalReviews,
    isApproved: v.isApproved,
    status: v.status
  }));

  if (slug) {
    const requestedSlug = normalizeSlug(slug);
    stores = stores.filter(store => store.storeSlug === requestedSlug);
  }

  res.json({
    success: true,
    stores,
    pagination: {
      total: slug ? stores.length : count,
      page: parseInt(page, 10),
      limit: limitInt,
      pages: Math.ceil(count / limitInt)
    }
  });
}));

// Create or ensure vendor store record (requires auth)
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const { vendorId, storeId, name, description, category, contactInfo, settings, storeSlug } = req.body;
  if (!req.user) throw new AppError('Authentication required', 401);

  const targetUserId = vendorId || req.user.uid;
  if (targetUserId !== req.user.uid && req.user.role !== 'admin') {
    throw new AppError('Not authorized to create store for this user', 403);
  }

  let vendor = await Vendor.findOne({ where: { userId: targetUserId } });
  const updates = {};
  if (name || description) updates.storeName = name || description;
  if (description !== undefined) updates.storeDescription = description;
  // storeSlug, category, isPublic, allowReviews, showContactInfo are not DB columns
  // Store them in businessAddress JSONB if needed
  if (contactInfo) {
    if (contactInfo.email) updates.businessEmail = contactInfo.email;
    if (contactInfo.phone) updates.businessPhone = contactInfo.phone;
    if (contactInfo.address) updates.businessAddress = contactInfo.address;
  }
  // Settings fields are not DB columns - skip them
  updates.updatedAt = new Date();

  if (!vendor) {
    vendor = await Vendor.create({
      userId: targetUserId,
      storeName: name || 'My Store',
      storeDescription: description || '',
      businessEmail: contactInfo?.email,
      businessPhone: contactInfo?.phone,
      businessAddress: contactInfo?.address || {},
      isApproved: true,
      status: 'approved',
      ...updates
    });
  } else if (Object.keys(updates).length > 0) {
    await vendor.update(updates);
    vendor = await Vendor.findByPk(vendor.id);
  }

  res.status(201).json({
    success: true,
    store: {
      id: vendor.id,
      vendorId: vendor.userId,
      storeId: storeId || vendor.id,
      name: vendor.storeName,
      storeName: vendor.storeName,
      storeSlug: normalizeSlug(vendor.storeName),
      description: vendor.storeDescription,
      category: category || 'general',
      contactInfo: {
        email: vendor.businessEmail,
        phone: vendor.businessPhone,
        address: vendor.businessAddress
      },
      settings: {
        isPublic: true,
        allowReviews: true,
        showContactInfo: true,
        storeSlug: normalizeSlug(vendor.storeName)
      },
      shareableLink: `/store/${vendor.userId}`,
      isApproved: vendor.isApproved,
      status: vendor.status
    }
  });
}));

// Update store settings (requires auth — vendor owner only)
router.put('/:storeId', authenticateToken, asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  if (!req.user) throw new AppError('Authentication required', 401);

  const vendor = await Vendor.findByPk(storeId);
  if (!vendor) {
    throw new AppError('Store not found', 404);
  }

  // Ensure the authenticated user owns this store
  if (vendor.userId !== req.user.uid && req.user.role !== 'admin') {
    throw new AppError('Not authorized to update this store', 403);
  }

  const updates = {};
  const { storeName, storeDescription, storeSlug, businessAddress, contactInfo, settings } = req.body;

  if (storeName) updates.storeName = storeName;
  if (storeDescription !== undefined) updates.storeDescription = storeDescription;
  if (businessAddress) updates.businessAddress = businessAddress;
  if (contactInfo) {
    if (contactInfo.email) updates.businessEmail = contactInfo.email;
    if (contactInfo.phone) updates.businessPhone = contactInfo.phone;
    if (contactInfo.address) updates.businessAddress = contactInfo.address;
  }

  updates.updatedAt = new Date();
  await vendor.update(updates);

  res.json({
    success: true,
    store: {
      id: vendor.id,
      vendorId: vendor.userId,
      name: vendor.storeName,
      storeSlug: normalizeSlug(vendor.storeName),
      description: vendor.storeDescription,
      businessAddress: vendor.businessAddress,
      contactInfo: {
        email: vendor.businessEmail,
        phone: vendor.businessPhone,
        address: vendor.businessAddress
      }
    }
  });
}));

module.exports = router;

const express = require('express');
const { Op, fn, col } = require('sequelize');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { sequelize, User, Wallet, Order, Notification, Conversation, Vendor } = require('../models');
const { serializeConversation } = require('../utils/messagingSerializer');

const router = express.Router();

const sanitizeUser = (userInstance) => {
  if (!userInstance) return null;
  const plain = typeof userInstance.toJSON === 'function' ? userInstance.toJSON() : userInstance;
  const { password, vendor, ...rest } = plain;

  // Expose logistics profile from JSONB profile for frontend compatibility
  if (rest.profile?.logisticsProfile) {
    rest.logisticsProfile = rest.profile.logisticsProfile;
    rest.isLogisticsPartner = true;
  }
  if (rest.role === 'logistics') {
    rest.isLogisticsPartner = true;
  }

  // Flatten vendor data into vendorProfile for frontend compatibility
  if (vendor) {
    // Start with vendorProfile from user.profile (JSONB) for fields like storeSlug, structuredAddress
    const profileVendorProfile = rest.profile?.vendorProfile || {};
    const vendorAddr = vendor.businessAddress;
    const isStructured = vendorAddr && typeof vendorAddr === 'object' && !Array.isArray(vendorAddr);

    rest.vendorProfile = {
      ...profileVendorProfile,
      businessAddress: vendor.businessAddress,
      businessPhone: vendor.businessPhone,
      businessEmail: vendor.businessEmail,
      storeName: vendor.storeName,
      storeDescription: vendor.storeDescription,
      rating: vendor.rating,
      isApproved: vendor.isApproved,
      status: vendor.status,
      // Ensure structuredAddress is available from the Vendor table's JSONB businessAddress
      structuredAddress: isStructured
        ? { street: vendorAddr.street || '', city: vendorAddr.city || '', state: vendorAddr.state || '', country: vendorAddr.country || 'Nigeria' }
        : (profileVendorProfile.structuredAddress || { street: '', city: '', state: '', country: 'Nigeria' })
    };
    // Also expose storeName at top level for convenience
    if (vendor.storeName) rest.storeName = vendor.storeName;
    if (vendor.businessPhone) rest.businessPhone = vendor.businessPhone;
    
    // Flatten businessAddress to a string if it's an object
    if (vendor.businessAddress && typeof vendor.businessAddress === 'object') {
      const addr = vendor.businessAddress;
      rest.address = [addr.street, addr.city, addr.state, addr.country].filter(Boolean).join(', ') || addr.full || '';
    } else if (typeof vendor.businessAddress === 'string') {
      rest.address = vendor.businessAddress;
    }
  }
  
  return rest;
};

const ensureOwnOrAdmin = (req, targetUserId) => {
  if (req.user.role === 'admin') return;
  if (req.user.uid !== targetUserId) {
    throw new AppError('Not authorized to access this user resource', 403);
  }
};

const ensureWallet = async (userId) => {
  const [wallet] = await Wallet.findOrCreate({
    where: { userId },
    defaults: {
      balance: 0,
      currency: 'NGN'
    }
  });
  return wallet;
};

const serializeNotification = (notificationInstance) => {
  const plain = typeof notificationInstance.toJSON === 'function'
    ? notificationInstance.toJSON()
    : notificationInstance;

  return {
    ...plain,
    read: typeof plain.read === 'boolean' ? plain.read : (plain.isRead ?? false)
  };
};

router.use(optionalAuth);

// Fetch user profile (public - needed for cart/checkout vendor display)
router.get('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findByPk(userId, {
    include: [{ model: Vendor, as: 'vendor' }]
  });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({ success: true, user: sanitizeUser(user) });
}));

// Update vendor profile (requires auth) — updates both User.profile and Vendor table
router.put('/:userId/vendorProfile', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!req.user) throw new AppError('Authentication required', 401);
  ensureOwnOrAdmin(req, userId);

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const { vendorProfile } = req.body;
  if (!vendorProfile) {
    throw new AppError('vendorProfile is required', 400);
  }

  // Build full address string from structured address if available
  let businessAddress = vendorProfile.businessAddress;
  if (vendorProfile.structuredAddress) {
    const a = vendorProfile.structuredAddress;
    businessAddress = [a.street, a.city, a.state, a.country].filter(Boolean).join(', ');
  }

  // 1. Update User.profile.vendorProfile (JSONB)
  const existingProfile = user.profile || {};
  const existingVendorProfile = existingProfile.vendorProfile || {};
  const updatedVendorProfile = {
    ...existingVendorProfile,
    ...vendorProfile,
    businessAddress,
    structuredAddress: vendorProfile.structuredAddress || existingVendorProfile.structuredAddress,
    updatedAt: new Date()
  };

  await user.update({
    profile: {
      ...existingProfile,
      vendorProfile: updatedVendorProfile
    },
    updatedAt: new Date()
  });

  // 2. Update Vendor table if a vendor record exists
  const vendor = await Vendor.findOne({ where: { userId } });
  if (vendor) {
    const vendorUpdates = {};
    if (vendorProfile.storeName) vendorUpdates.storeName = vendorProfile.storeName;
    if (vendorProfile.storeDescription !== undefined) vendorUpdates.storeDescription = vendorProfile.storeDescription;
    if (vendorProfile.businessPhone) vendorUpdates.businessPhone = vendorProfile.businessPhone;

    // Store businessAddress as structured JSONB object if structuredAddress is provided
    if (vendorProfile.structuredAddress) {
      vendorUpdates.businessAddress = {
        ...vendorProfile.structuredAddress,
        full: businessAddress
      };
    } else if (businessAddress) {
      vendorUpdates.businessAddress = { full: businessAddress };
    }

    if (Object.keys(vendorUpdates).length > 0) {
      vendorUpdates.updatedAt = new Date();
      await vendor.update(vendorUpdates);
    }
  }

  // Return updated user with vendor data
  const updatedUser = await User.findByPk(userId, {
    include: [{ model: Vendor, as: 'vendor' }]
  });

  res.json({ success: true, user: sanitizeUser(updatedUser) });
}));

// Update profile (requires auth)
router.patch('/:userId', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!req.user) throw new AppError('Authentication required', 401);
  ensureOwnOrAdmin(req, userId);

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const updates = {};
  const {
    displayName,
    firstName,
    lastName,
    phoneNumber,
    profile,
    isEmailVerified,
    isActive,
    role,
    vendorProfile,
    logisticsProfile
  } = req.body;

  if (displayName) updates.displayName = displayName;
  if (firstName) updates.firstName = firstName;
  if (lastName) updates.lastName = lastName;
  if (phoneNumber) updates.phoneNumber = phoneNumber;
  if (typeof isEmailVerified === 'boolean') updates.isEmailVerified = isEmailVerified;
  if (typeof isActive === 'boolean' && req.user.role === 'admin') updates.isActive = isActive;
  if (role && req.user.role === 'admin') updates.role = role;
  if (profile || vendorProfile || logisticsProfile) {
    updates.profile = {
      ...(user.profile || {}),
      ...(profile || {}),
      ...(vendorProfile ? { vendorProfile } : {}),
      ...(logisticsProfile ? { logisticsProfile } : {})
    };
  }

  // Handle admin-only fields stored in profile JSONB
  const adminProfileFields = [
    'vendorApproved', 'suspended', 'banned',
    'approvedAt', 'approvedBy', 'suspendedAt', 'suspendedBy',
    'bannedAt', 'bannedBy', 'reactivatedAt', 'reactivatedBy',
    'kycVerified', 'kycStatus', 'kycComplete',
    'kycVerifiedAt', 'kycVerifiedBy', 'kycRejectedAt', 'kycRejectedBy',
    'kycRejectionReason',
    'dateOfBirth', 'gender', 'nin', 'ninDocument',
    'address', 'city', 'state', 'country',
    'emailVerified', 'phoneVerified'
  ];
  const adminProfileUpdates = {};
  for (const field of adminProfileFields) {
    if (req.body[field] !== undefined) {
      adminProfileUpdates[field] = req.body[field];
    }
  }
  if (Object.keys(adminProfileUpdates).length > 0) {
    updates.profile = {
      ...(user.profile || {}),
      ...(updates.profile || {}),
      ...adminProfileUpdates
    };
  }

  // Persist subscription-related fields inside the profile JSON
  const subscriptionFields = [
    'subscriptionPlan', 'billingCycle', 'subscriptionTermDays',
    'subscriptionStatus', 'subscriptionStartDate', 'subscriptionEndDate',
    'commissionRate', 'productLimit', 'analyticsLevel', 'supportLevel',
    'mediaPerProduct', 'videoUploads', 'bulkTools', 'storefrontThemes',
    'payoutSchedule'
  ];
  const subscriptionUpdates = {};
  for (const field of subscriptionFields) {
    if (req.body[field] !== undefined) {
      subscriptionUpdates[field] = req.body[field];
    }
  }
  if (Object.keys(subscriptionUpdates).length > 0) {
    updates.profile = {
      ...(user.profile || {}),
      ...(updates.profile || {}),
      ...subscriptionUpdates
    };
  }

  await user.update({ ...updates, updatedAt: new Date() });

  res.json({ success: true, user: sanitizeUser(user) });
}));

// Delete user (admin only)
router.delete('/:userId', authenticateToken, asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError('Admin privileges required', 403);
  }

  const { userId } = req.params;
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  await user.destroy();
  res.json({ success: true, message: 'User deleted successfully' });
}));

// Wallet info
router.get('/:userId/wallet', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!req.user) throw new AppError('Authentication required', 401);
  ensureOwnOrAdmin(req, userId);

  const wallet = await ensureWallet(userId);
  res.json({ success: true, wallet: wallet.toJSON() });
}));

// Orders for user (buyer or vendor)
router.get('/:userId/orders', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!req.user) throw new AppError('Authentication required', 401);
  ensureOwnOrAdmin(req, userId);

  const { limit = 50 } = req.query;
  const type = req.query.type || req.query.userType || 'buyer';
  const where = type === 'vendor' ? { vendorId: userId } : { buyerId: userId };
  const limitInt = Math.min(parseInt(limit, 10) || 50, 100);

  const orders = await Order.findAll({
    attributes: [
      'id', 'buyerId', 'vendorId', 'items', 'totalAmount', 'status',
      'paymentStatus', 'paymentMethod', 'paymentReference', 'shippingAddress',
      'trackingNumber', 'estimatedDelivery', 'actualDelivery', 'notes',
      'createdAt', 'updatedAt'
    ],
    where,
    order: [['createdAt', 'DESC']],
    limit: limitInt
  });

  // Fetch user's wallet to include walletId in order data
  let walletId = null;
  try {
    const wallet = await Wallet.findOne({ where: { userId } });
    if (wallet) walletId = wallet.id;
  } catch (e) {
    // Wallet may not exist yet
  }

  // For vendor orders, fetch buyer names
  let buyerNameMap = {};
  if (type === 'vendor') {
    const buyerIds = [...new Set(orders.map(o => o.buyerId).filter(Boolean))];
    if (buyerIds.length > 0) {
      const buyers = await User.findAll({
        where: { id: buyerIds },
        attributes: ['id', 'firstName', 'lastName', 'email', 'profile']
      });
      buyers.forEach(u => {
        buyerNameMap[u.id] = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.profile?.displayName || u.email || u.id;
      });
    }
  }

  res.json({ success: true, items: orders.map(order => ({
    ...order.toJSON(),
    walletId,
    buyerName: buyerNameMap[order.buyerId] || null
  })) });
}));

// Notifications list
router.get('/:userId/notifications', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!req.user) throw new AppError('Authentication required', 401);
  ensureOwnOrAdmin(req, userId);

  const limitInt = Math.min(parseInt(req.query.limit, 10) || 30, 100);
  const notifications = await Notification.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit: limitInt
  });

  res.json({ success: true, items: notifications.map(serializeNotification) });
}));

// Mark all notifications as read
router.post('/:userId/notifications/mark-all-read', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!req.user) throw new AppError('Authentication required', 401);
  ensureOwnOrAdmin(req, userId);

  const [updated] = await Notification.update(
    { isRead: true, readAt: new Date() },
    { where: { userId, isRead: false } }
  );

  res.json({ success: true, updated });
}));

// Conversations list for user
router.get('/:userId/conversations', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!req.user) throw new AppError('Authentication required', 401);
  ensureOwnOrAdmin(req, userId);

  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

  const conversations = await Conversation.findAll({
    where: sequelize.where(
      fn('array_position', col('participantIds'), userId),
      { [Op.gt]: 0 }
    ),
    order: [['updatedAt', 'DESC']],
    limit
  });

  res.json({ success: true, items: conversations.map(serializeConversation) });
}));

// Support tickets (stored in user profile JSON)
router.get('/:userId/support-tickets', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  ensureOwnOrAdmin(req, userId);

  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);

  const tickets = (user.profile?.supportTickets || []);
  res.json({ success: true, items: tickets });
}));

router.post('/:userId/support-tickets', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  ensureOwnOrAdmin(req, userId);

  const { subject, description, category = 'general', priority = 'medium', orderId } = req.body;
  if (!subject || !description) throw new AppError('Subject and description are required', 400);

  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);

  const ticket = {
    id: `TCK-${Date.now()}`,
    subject,
    description,
    category,
    priority,
    orderId: orderId || null,
    status: 'open',
    replies: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const existingTickets = user.profile?.supportTickets || [];
  await user.update({
    profile: {
      ...(user.profile || {}),
      supportTickets: [ticket, ...existingTickets]
    }
  });

  res.status(201).json({ success: true, data: ticket });
}));

module.exports = router;

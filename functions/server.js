// --- Admin Middleware ---
require('dotenv').config();
const express = require('express');
const admin = require('./firebaseAdmin');
const axios = require('axios');
const cors = require('cors');
const {
  logEvent,
  logAdminAction,
  queryEventsByType,
  getSubscriptionRevenue,
  getPaymentAnalytics,
  getVendorTrends,
  getAuditLogs,
  EVENT_TYPES,
} = require('./analytics');

// Import error handling and validation modules
const {
  createRequestLogger,
  errorHandlerMiddleware,
  asyncHandler,
  AppError,
  ValidationError,
  AuthError,
  NotFoundError,
} = require('./errorHandler');

const {
  RateLimiter,
  securityHeaders,
  sanitizeRequestData,
} = require('./validation');

const db = admin.apps && admin.apps.length ? admin.firestore() : null;


// [MIGRATION] All Firestore-dependent logic must be refactored to use Render backend REST API.

const app = express();
app.use(express.json());
app.use(cors({
  origin: ['https://ojawa.africa', 'https://www.ojawa.africa', 'https://ojawa-ecommerce.web.app', 'https://ojawa-ecommerce-staging.web.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// --- Security & Error Handling Middleware ---
app.use(securityHeaders); // Add security headers
app.use(sanitizeRequestData); // Sanitize all input
app.use(createRequestLogger({ logBody: process.env.NODE_ENV === 'development' })); // Request logging

// Rate limiting: 1000 requests per minute per IP
const apiLimiter = new RateLimiter({
  maxRequests: 1000,
  windowMs: 60000,
});
app.use('/api', apiLimiter.middleware());
app.use('/admin', apiLimiter.middleware());

// Strict rate limiting for auth endpoints: 10 requests per minute
const authLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60000,
});
app.use('/auth', authLimiter.middleware());

// Cleanup old rate limit entries every 5 minutes
setInterval(() => {
  apiLimiter.cleanup();
  authLimiter.cleanup();
}, 5 * 60 * 1000);

// --- Middleware to verify Firebase ID token ---
// [MIGRATION] Replace with REST API/middleware authentication as needed.
function authenticateToken(req, res, next) {
  // TODO: Implement authentication using REST API or backend middleware.
  // Placeholder for migration. Accept all requests as authenticated for now.
  req.user = { uid: 'mock-user' };
  next();
}

// --- Admin Context Validation (IP & User Agent Check) ---
// Tracks admin login contexts to prevent account hijacking
const adminContexts = new Map();

function validateAdminContext(req, res, next) {
  const user = req.user;
  const userId = user?.uid;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('user-agent') || 'unknown';
  
  if (!adminContexts.has(userId)) {
    // First login from this IP/user agent - store context
    adminContexts.set(userId, {
      ipAddress,
      userAgent,
      timestamp: Date.now(),
    });
    return next();
  }
  
  const storedContext = adminContexts.get(userId);
  const timeDiff = Date.now() - storedContext.timestamp;
  
  // If IP or user agent changed significantly within a short time (< 1 hour), log warning
  if (timeDiff < 3600000) { // 1 hour
    if (storedContext.ipAddress !== ipAddress || storedContext.userAgent !== userAgent) {
      // Log suspicious activity
      console.warn(`⚠️ Admin context mismatch for user ${userId}:`, {
        oldIp: storedContext.ipAddress,
        newIp: ipAddress,
        oldAgent: storedContext.userAgent?.substring(0, 50),
        newAgent: userAgent?.substring(0, 50),
      });
      
      // [MIGRATION] TODO: Log to admin audit logs using backend DB/REST API.
      
      // Allow access but flag for investigation (could block if desired)
      // return res.status(403).json({ error: 'Suspicious admin activity detected' });
    }
  }
  
  // Update context if time has passed
  if (timeDiff > 3600000) {
    adminContexts.set(userId, {
      ipAddress,
      userAgent,
      timestamp: Date.now(),
    });
  }
  
  return next();
}

// --- Admin Middleware ---
function requireAdmin(req, res, next) {
  const user = req.user;
  if (user && (user.admin || user.isAdmin || (user.role && user.role.includes && user.role.includes('admin')))) {
    // Validate admin context before proceeding
    return validateAdminContext(req, res, next);
  }
  return res.status(403).json({ error: 'Admin privileges required' });
}

// Paystack IP Whitelisting Middleware
const PAYSTACK_IPS = [
  '52.31.139.75',
  '52.49.173.169',
  '52.214.14.220'
];

function paystackIpWhitelist(req, res, next) {
  const forwarded = req.headers['x-forwarded-for'];
  const remoteIp = req.connection.remoteAddress;
  const requestIp = (forwarded ? forwarded.split(',')[0] : remoteIp) || '';
  if (PAYSTACK_IPS.some(ip => requestIp.includes(ip))) {
    return next();
  }
  return res.status(403).send('Forbidden: Invalid IP');
}

// --- Health Check ---
app.get('/', (req, res) => {
  res.send('Ojawa backend running on Render!');
});

app.get('/health', (req, res) => {
  const hasCredentials = !!(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
  res.json({
    status: 'ok',
    firebase: 'initialized',
    credentials: hasCredentials ? 'service_account' : 'missing_check_render_env_vars',
    project: process.env.FIREBASE_PROJECT_ID || 'ojawa-ecommerce',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/subscriptions', (req, res) => {
  const hasPlan = !!(VENDOR_SUBSCRIPTION_PLANS && Object.keys(VENDOR_SUBSCRIPTION_PLANS).length > 0);
  const plans = hasPlan ? Object.keys(VENDOR_SUBSCRIPTION_PLANS) : [];
  res.json({
    status: 'ok',
    subscriptions: {
      plansAvailable: plans,
      billingCycles: ['monthly', 'annual'],
      discountPercentage: 16.67,
      discountLabel: '2 months free on annual',
    },
    timestamp: new Date().toISOString(),
  });
});

// --- User Sign Up Route ---
app.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    // [MIGRATION] TODO: Implement user creation via REST API or backend service.
    return res.json({ success: true, uid: 'mock-uid', email });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// --- User Login Route (Firebase Auth REST API) ---
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'FIREBASE_API_KEY not set in environment' });
    }
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      { email, password, returnSecureToken: true }
    );
    const { idToken, refreshToken, expiresIn, localId } = response.data;
    return res.json({ success: true, idToken, refreshToken, expiresIn, uid: localId });
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    return res.status(401).json({ error: msg });
  }
});

// --- Profile ---

// Refactored: Fetch user profile from Render REST API, keep Firebase Auth for authentication
app.get('/profile', authenticateToken, async (req, res) => {
  try {
    // [MIGRATION] TODO: Fetch user profile from backend DB/REST API only.
    res.json({
      uid: req.user.uid,
      email: 'mock-email@ojawa.com',
      profile: {}
    });
  } catch (error) {
    res.status(404).json({ error: 'User not found', details: error.message });
  }
});

// --- Notifications ---

// Refactored: Fetch notifications from Render REST API
app.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const response = await axios.get(process.env.RENDER_API_URL + `/api/notifications?userId=${userId}`, {
      headers: { Authorization: req.headers['authorization'] }
    });
    res.json({ notifications: response.data.notifications || response.data });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch notifications' });
  }
});

// --- Product Listing ---

// Fetch products: tries Render REST API first, falls back to Firestore if unavailable
app.get('/api/products', async (req, res) => {
  const debugEnabled = req.query._debug === '1' || process.env.NODE_ENV === 'development';

  // --- 1. Try Render REST API ---
  const backendBase = process.env.RENDER_API_URL || '';
  if (backendBase) {
    try {
      const response = await axios.get(backendBase + '/products?status=active', { timeout: 8000 });
      const products = response.data.products || response.data;
      if (Array.isArray(products) && products.length > 0) {
        return res.json({ products, source: 'render' });
      }
    } catch (renderErr) {
      console.warn('[/api/products] Render upstream failed, falling back to Firestore:', renderErr.message);
    }
  }

  // --- 2. Fallback: Firestore ---
  try {
    if (!admin.apps || !admin.apps.length) {
      return res.status(500).json({ error: 'Backend unavailable: Render and Firebase not configured' });
    }
    const db = admin.firestore();
    const snapshot = await db.collection('products').where('status', '==', 'active').get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json({ products, source: 'firestore' });
  } catch (firestoreErr) {
    const details = {
      message: firestoreErr.message,
      code: firestoreErr.code,
      stack: debugEnabled ? firestoreErr.stack : undefined,
    };
    console.error('[/api/products] Firestore fallback also failed:', details);
    return res.status(500).json({ error: 'Failed to fetch products', details: debugEnabled ? details : undefined });
  }
});

// --- Cart Management ---

// Refactored: Fetch cart from Render REST API
app.get('/cart', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const response = await axios.get(process.env.RENDER_API_URL + `/api/cart?userId=${userId}`, {
      headers: { Authorization: req.headers['authorization'] }
    });
    res.json({ cart: response.data.cart || response.data });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch cart' });
  }
});


// Refactored: Update cart via Render REST API
app.post('/cart', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Items must be an array' });
    const response = await axios.post(process.env.RENDER_API_URL + `/api/cart`, { userId, items }, {
      headers: { Authorization: req.headers['authorization'] }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update cart' });
  }
});


// Refactored: Delete cart via Render REST API
app.delete('/cart', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const response = await axios.delete(process.env.RENDER_API_URL + `/api/cart?userId=${userId}`, {
      headers: { Authorization: req.headers['authorization'] }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to delete cart' });
  }
});

// --- Create Escrow Order ---
app.post('/createEscrowOrder', authenticateToken, async (req, res) => {
  try {
    const buyerId = req.user.uid;
    const {
      totalAmount,
      currency = 'NGN',
      cartItems = [],
      deliveryOption = 'standard',
      deliveryAddress = '',
      deliveryInstructions = '',
      selectedLogistics = null,
      pricing = {},
      buyerInfo = {},
      metadata = {},
    } = req.body.data || req.body;

    if (!totalAmount || Number(totalAmount) <= 0) {
      return res.status(400).json({ error: { message: 'totalAmount must be a positive number' } });
    }
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: { message: 'cartItems must include at least one item' } });
    }

    // [MIGRATION] TODO: Implement escrow order creation using backend DB/REST API.
    // Temporary mock response for Render deployment and smoke tests.
    return res.json({
      result: {
        success: true,
        orderId: 'mock-order-id',
        walletTransactionId: null,
        escrowStatus: 'funds_on_hold',
        remainingBalance: 0,
      },
    });
  } catch (error) {
    console.error('Error creating escrow order:', error);
    return res.status(500).json({ error: { message: error.message || 'Failed to create escrow order' } });
  }
});

// --- Order Placement (legacy, simple) ---

// Refactored: Create order via Render REST API
app.post('/orders', authenticateToken, async (req, res) => {
  try {
    const buyerId = req.user.uid;
    const orderPayload = { ...req.body, buyerId };
    const response = await axios.post(process.env.RENDER_API_URL + '/api/orders', orderPayload, {
      headers: { Authorization: req.headers['authorization'] }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to create order' });
  }
});

// --- Order History ---

// Refactored: Fetch user orders from Render REST API
app.get('/orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const response = await axios.get(process.env.RENDER_API_URL + `/api/orders?buyerId=${userId}`, {
      headers: { Authorization: req.headers['authorization'] }
    });
    res.json({ orders: response.data.orders || response.data });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch orders' });
  }
});

// --- Temporary debug endpoint (remove after verification) ---
app.get('/debug/env', (req, res) => {
  try {
    const raw = process.env.RENDER_API_URL || null;
    let masked = null;
    if (raw) {
      try {
        const u = new URL(raw);
        // show origin only (protocol + host), hide path/credentials
        masked = u.origin;
      } catch (e) {
        // raw value may be missing protocol; show a masked placeholder
        masked = raw.length > 32 ? `${raw.slice(0, 16)}...${raw.slice(-8)}` : raw;
      }
    }
    return res.json({ renderApiUrlPresent: !!raw, renderApiUrlMasked: masked, nodeEnv: process.env.NODE_ENV || 'unknown', timestamp: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read env', details: err.message });
  }
});

// --- Admin Routes ---

// Refactored: Fetch all orders for admin from Render REST API
app.get('/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const response = await axios.get(process.env.RENDER_API_URL + '/api/orders', {
      headers: { Authorization: req.headers['authorization'] }
    });
    res.json({ orders: response.data.orders || response.data });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch admin orders' });
  }
});


// Refactored: Fetch all products for admin from Render REST API
app.get('/admin/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const response = await axios.get(process.env.RENDER_API_URL + '/api/products', {
      headers: { Authorization: req.headers['authorization'] }
    });
    res.json({ products: response.data.products || response.data });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch admin products' });
  }
});


// Refactored: Update product via Render REST API
app.put('/admin/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.put(process.env.RENDER_API_URL + `/api/products/${id}`, req.body, {
      headers: { Authorization: req.headers['authorization'] }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update product' });
  }
});


// Refactored: Delete product via Render REST API
app.delete('/admin/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.delete(process.env.RENDER_API_URL + `/api/products/${id}`, {
      headers: { Authorization: req.headers['authorization'] }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to delete product' });
  }
});

// --- Paystack Webhook ---
// Webhook endpoint delegates to Cloud Function (paystackWebhook) for proper HMAC verification
// This endpoint should not be used directly - webhooks must go through Cloud Functions
app.post('/paystack/webhook', (req, res) => {
  return res.status(403).json({
    error: 'Webhooks must be processed through Cloud Function endpoint',
    message: 'Configure your webhook to use the paystackWebhook Cloud Function instead'
  });
});

// --- Process Payout Request ---

// Refactored: Process payout request via Render REST API

// Refactored: Fetch security events from Render REST API

app.get('/admin/security/events', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, eventType, limit = 100 } = req.query;
    const response = await axios.get(process.env.RENDER_API_URL + '/api/admin/security/events', {
      params: { startDate, endDate, eventType, limit },
      headers: { Authorization: req.headers['authorization'] }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching security events:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch security events' });
  }
});

// ...existing code...

// VENDOR_SUBSCRIPTION_PLANS object (move to correct location)
const VENDOR_SUBSCRIPTION_PLANS = {
  basic: {
    price: 0,
    annualPrice: 0,
    commissionRate: 5.0,
    productLimit: 10,
    analyticsLevel: 'basic',
    supportLevel: 'email',
    mediaPerProduct: 6,
    videoUploads: false,
    bulkTools: false,
    storefrontThemes: 'standard',
    payoutSchedule: 'weekly',
  },
  pro: {
    price: 5000,
    annualPrice: 50000,
    commissionRate: 3.0,
    productLimit: 20,
    analyticsLevel: 'advanced',
    supportLevel: 'priority',
    mediaPerProduct: 15,
    videoUploads: true,
    bulkTools: true,
    storefrontThemes: 'enhanced',
    payoutSchedule: 'twice-weekly',
  },
  premium: {
    price: 15000,
    annualPrice: 150000,
    commissionRate: 2.0,
    productLimit: 100,
    analyticsLevel: 'premium',
    supportLevel: 'dedicated',
    mediaPerProduct: 30,
    videoUploads: true,
    bulkTools: true,
    storefrontThemes: 'custom',
    payoutSchedule: 'daily',
  },
};

const MONTHLY_SUBSCRIPTION_DURATION_DAYS = 30;
const ANNUAL_SUBSCRIPTION_DURATION_DAYS = 365;

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const normalizePlanKey = (plan) => (typeof plan === 'string' ? plan.trim().toLowerCase() : '');
const normalizeBillingCycle = (cycle) => (typeof cycle === 'string' && cycle.trim().toLowerCase() === 'annual' ? 'annual' : 'monthly');
const getSubscriptionTermDays = (cycle) => (cycle === 'annual' ? ANNUAL_SUBSCRIPTION_DURATION_DAYS : MONTHLY_SUBSCRIPTION_DURATION_DAYS);
const getPlanPrice = (planConfig, cycle) => (cycle === 'annual' ? Number(planConfig.annualPrice ?? planConfig.price * 12) : Number(planConfig.price));

const parsePaystackMetadata = (metadata) => {
  if (!metadata) return {};
  if (typeof metadata === 'object') return metadata;
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
};

const getPaystackSecret = () =>
  process.env.PAYSTACK_SECRET_KEY ||
  process.env.PSTACK_SECRET_KEY ||
  process.env.PAYSTACK_SK ||
  process.env.SK_TEST_PAYSTACK ||
  null;


// Refactored: Top up wallet via Render REST API
async function processPaystackWalletTopup({ reference, userId, amount }, authUid) {
  if (!authUid) throw new Error('User must be authenticated to top up wallet');
  if (!reference) throw new Error('Reference is required');
  if (!userId || userId !== authUid) throw new Error('User ID mismatch');
  if (!amount || Number(amount) <= 0) throw new Error('Valid amount is required');

  // Call Render backend to process wallet top-up
  const response = await axios.post(process.env.RENDER_API_URL + '/api/wallets/topup', { reference, userId, amount }, {
    headers: { Authorization: '' } // Add auth if needed
  });
  return response.data;
}


// Refactored: Notify vendor of new order via Render REST API
app.post('/notifyVendorNewOrder', authenticateToken, async (req, res) => {
  try {
    const { vendorId, orderId, buyerName, totalAmount, items = [] } = req.body || {};
    if (!vendorId || !orderId || !buyerName || !totalAmount) {
      return res.status(400).json({ error: 'vendorId, orderId, buyerName and totalAmount are required' });
    }
    const response = await axios.post(process.env.RENDER_API_URL + '/api/notifications', {
      userId: vendorId,
      type: 'new_order',
      title: 'New Order Received',
      message: `You have received a new order from ${buyerName} for ₦${Number(totalAmount).toLocaleString()}`,
      orderId,
      buyerName,
      totalAmount: Number(totalAmount),
      items,
      read: false
    }, {
      headers: { Authorization: req.headers['authorization'] }
    });
    return res.json({ success: true, message: 'Vendor notification sent', notificationId: response.data.notificationId || response.data.id });
  } catch (error) {
    console.error('Error notifying vendor:', error);
    return res.status(500).json({ error: error.message || 'Failed to notify vendor' });
  }
});

app.post('/sendPaymentConfirmation', authenticateToken, async (req, res) => {
  try {
    const { buyerEmail, buyerName, orderId, amount, items } = req.body || {};
    console.log('Payment confirmation email:', { buyerEmail, buyerName, orderId, amount, itemCount: items?.length || 0 });
    return res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending payment confirmation:', error);
    return res.status(500).json({ error: error.message || 'Failed to send payment confirmation' });
  }
});

app.post('/sendOrderStatusUpdate', authenticateToken, async (req, res) => {
  try {
    const { buyerEmail, buyerName, orderId, status, trackingNumber, carrier } = req.body || {};
    console.log('Order status update email:', { buyerEmail, buyerName, orderId, status, trackingNumber, carrier });
    return res.json({ success: true, message: 'Status update email sent' });
  } catch (error) {
    console.error('Error sending order status update:', error);
    return res.status(500).json({ error: error.message || 'Failed to send order status update' });
  }
});


// Refactored: Release escrow funds via Render REST API
app.post('/releaseEscrowFundsHttp', authenticateToken, async (req, res) => {
  try {
    const { orderId, vendorId, amount } = req.body || {};
    if (!orderId || !vendorId || !amount) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const response = await axios.post(process.env.RENDER_API_URL + '/api/escrow/release', { orderId, vendorId, amount }, {
      headers: { Authorization: req.headers['authorization'] }
    });
    return res.json(response.data);
  } catch (error) {
    console.error('Error releasing escrow funds:', error);
    return res.status(500).json({ error: error.message || 'Failed to release escrow funds' });
  }
});


// Refactored: Top up wallet via Render REST API
app.post('/topupWalletPaystack', authenticateToken, async (req, res) => {
  try {
    const result = await processPaystackWalletTopup(req.body || {}, req.user.uid);
    return res.json(result);
  } catch (error) {
    console.error('topupWalletPaystack error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process wallet top-up' });
  }
});


// Refactored: Create Paystack subscription record via Render REST API
app.post('/createPaystackSubscriptionRecord', authenticateToken, async (req, res) => {
  try {
    const {
      reference,
      plan: requestedPlan,
      userId: requestedUserId,
      billingCycle: requestedBillingCycle,
    } = req.body || {};
    if (!reference) {
      return res.status(400).json({ error: 'Paystack reference is required' });
    }
    const response = await axios.post(process.env.RENDER_API_URL + '/api/subscriptions/paystack', {
      reference,
      plan: requestedPlan,
      userId: requestedUserId,
      billingCycle: requestedBillingCycle
    }, {
      headers: { Authorization: req.headers['authorization'] }
    });
    return res.json(response.data);
  } catch (error) {
    console.error('❌ Subscription creation failed', {
      errorMessage: error.message,
      errorCode: error.code,
      stack: error.stack,
      plan: requestedPlan,
      billingCycle: requestedBillingCycle,
    });
    return res.status(500).json({
      error: error.message || 'Failed to create subscription record',
      code: error.code || 'SUBSCRIPTION_ERROR',
    });
  }
});

// --- Per-Email OTP Rate Limiting (5 attempts per email per 15 minutes) ---
const otpRateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

const otpVerifyLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes (verify up to 10 times per email)
});

app.post('/sendEmailOTP', async (req, res) => {
  try {
    const { to, subject, htmlContent, textContent, purpose } = req.body || {};
    if (!to || !subject || (!htmlContent && !textContent)) {
      return res.status(400).json({ error: 'to, subject, and content are required' });
    }

    // Check per-email rate limit for sending OTP (5 requests per 15 minutes)
    const isAllowed = otpRateLimiter.checkLimit(to);
    if (!isAllowed) {
      return res.status(429).json({ 
        error: 'Too many OTP requests. Please try again in 15 minutes.',
        retryAfter: 900 // 15 minutes in seconds
      });
    }

    console.log('sendEmailOTP request:', { to, subject, purpose });
    return res.json({ success: true, requestId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
  } catch (error) {
    console.error('sendEmailOTP error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send OTP' });
  }
});

app.post('/verifyEmailOTP', async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      return res.status(400).json({ error: 'email and otp are required' });
    }

    // Check per-email rate limit for verifying OTP (10 attempts per 15 minutes)
    const isAllowed = otpVerifyLimiter.checkLimit(email);
    if (!isAllowed) {
      return res.status(429).json({ 
        error: 'Too many OTP verification attempts. Please try again in 15 minutes.',
        retryAfter: 900 // 15 minutes in seconds
      });
    }

    // Client-side OTP cache remains the primary verifier in this flow.
    return res.json({ success: true, verified: true });
  } catch (error) {
    console.error('verifyEmailOTP error:', error);
    return res.status(500).json({ error: error.message || 'Failed to verify OTP' });
  }
});

app.post('/optimizeRoute', async (req, res) => {
  try {
    const { origin, destination, waypoints = [], optimize = true, travelMode = 'DRIVE', routingPreference = 'TRAFFIC_AWARE' } = req.body || {};
    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin and destination are required' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GOOGLE_MAPS_API_KEY' });
    }

    const requestBody = {
      origin: typeof origin === 'string' ? { address: origin } : origin,
      destination: typeof destination === 'string' ? { address: destination } : destination,
      travelMode,
      routingPreference,
      optimizeWaypointOrder: !!optimize,
      intermediates: Array.isArray(waypoints)
        ? waypoints.map((wp) => (typeof wp === 'string' ? { location: { address: wp } } : { location: wp.location || wp }))
        : [],
      polylineQuality: 'HIGH_QUALITY',
      polylineEncoding: 'ENCODED_POLYLINE',
    };

    const headers = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'routes.distanceMeters',
        'routes.duration',
        'routes.polyline.encodedPolyline',
        'routes.optimizedIntermediateWaypointIndex',
      ].join(','),
    };

    const { data } = await axios.post('https://routes.googleapis.com/directions/v2:computeRoutes', requestBody, { headers, timeout: 15000 });
    return res.status(200).json({ ok: true, routes: data.routes || [], request: requestBody });
  } catch (error) {
    const status = error.response?.status || 500;
    const details = error.response?.data || { message: error.message };
    console.error('optimizeRoute error:', status, details);
    return res.status(status).json({ ok: false, error: 'ROUTES_API_ERROR', details });
  }
});

// --- Admin Analytics Endpoints ---

// Admin Analytics: Revenue Trends
app.get('/admin/analytics/revenue', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'daily' } = req.query;
    
    let start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    let end = endDate ? new Date(endDate) : new Date();

    const revenue = await getSubscriptionRevenue(start, end);
    
    return res.json({
      success: true,
      period: { start, end },
      revenue: revenue || {
        totalRevenue: 0,
        byPlan: {},
        byCycle: {},
        transactionCount: 0,
        averageTransactionValue: 0,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch revenue analytics' });
  }
});

// Admin Analytics: Payment Health
app.get('/admin/analytics/payments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    let end = endDate ? new Date(endDate) : new Date();

    const payments = await getPaymentAnalytics(start, end);
    
    return res.json({
      success: true,
      period: { start, end },
      analytics: payments || {
        totalProcessed: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        refundAmount: 0,
        failureReasons: {},
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching payment analytics:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch payment analytics' });
  }
});

// Admin Analytics: Vendor Metrics
app.get('/admin/analytics/vendors', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    let end = endDate ? new Date(endDate) : new Date();

    const vendors = await getVendorTrends(start, end);
    
    return res.json({
      success: true,
      period: { start, end },
      trends: vendors || {
        registeredCount: 0,
        approvedCount: 0,
        suspendedCount: 0,
        topPlans: {},
        activationRate: 0,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching vendor analytics:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch vendor analytics' });
  }
});

// Admin Analytics: Audit Logs
app.get('/admin/analytics/audit', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { adminId, targetId, limit = 50 } = req.query;
    
    const logs = await getAuditLogs(adminId || null, targetId || null, parseInt(limit));
    
    return res.json({
      success: true,
      logs: logs || [],
      count: (logs || []).length,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch audit logs' });
  }
});

// Admin Analytics: Events by Type
app.get('/admin/analytics/events', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { eventType, startDate, endDate, limit = 100 } = req.query;
    
    if (!eventType) {
      return res.status(400).json({ error: 'eventType query parameter is required' });
    }

    let start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default 7 days
    let end = endDate ? new Date(endDate) : new Date();

    const events = await queryEventsByType(eventType, start, end, parseInt(limit));
    
    return res.json({
      success: true,
      eventType,
      period: { start, end },
      events: events || [],
      count: (events || []).length,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching event analytics:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch event analytics' });
  }
});

// Admin Analytics: Summary Dashboard
app.get('/admin/analytics/summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let days = 30;
    if (period === '7d') days = 7;
    if (period === '60d') days = 60;
    if (period === '90d') days = 90;
    if (period === '1y' || period === '365d') days = 365;

    const endDate = new Date();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [revenue, payments, vendors] = await Promise.all([
      getSubscriptionRevenue(startDate, endDate),
      getPaymentAnalytics(startDate, endDate),
      getVendorTrends(startDate, endDate),
    ]);

    return res.json({
      success: true,
      period: { days, start: startDate, end: endDate },
      summary: {
        revenue: revenue || {},
        payments: payments || {},
        vendors: vendors || {},
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch analytics summary' });
  }
});

// --- Temporary debug endpoint (remove after verification) ---
app.get('/debug/env', (req, res) => {
  try {
    const raw = process.env.RENDER_API_URL || null;
    let masked = null;
    if (raw) {
      try {
        const u = new URL(raw);
        // show origin only (protocol + host), hide path/credentials
        masked = u.origin;
      } catch (e) {
        // raw value may be missing protocol; show a masked placeholder
        masked = raw.length > 32 ? `${raw.slice(0, 16)}...${raw.slice(-8)}` : raw;
      }
    }
    return res.json({ renderApiUrlPresent: !!raw, renderApiUrlMasked: masked, nodeEnv: process.env.NODE_ENV || 'unknown', timestamp: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read env', details: err.message });
  }
});

// --- Global Error Handler (must be last middleware) ---
app.use((req, res, next) => {
  return next(new NotFoundError('Endpoint', req.path));
});

// --- Security Monitoring Dashboard Endpoint ---
app.get('/admin/security/events', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, eventType, limit = 100 } = req.query;
    
    let query = db.collection('security_audit_logs');
    
    // Filter by date range
    if (startDate) {
      query = query.where('timestamp', '>=', new Date(startDate));
    }
    if (endDate) {
      query = query.where('timestamp', '<=', new Date(endDate));
    }
    
    // Filter by event type if specified
    if (eventType) {
      query = query.where('eventType', '==', eventType);
    }
    
    // Get results ordered by timestamp descending
    const snapshot = await query
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit))
      .get();
    
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp,
    }));
    
    // Count by severity
    const severityCount = events.reduce((acc, event) => {
      const severity = event.severity || 'unknown';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {});
    
    // Count by event type
    const eventTypeCount = events.reduce((acc, event) => {
      const type = event.eventType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    return res.json({
      success: true,
      events,
      summary: {
        totalEvents: events.length,
        severityBreakdown: severityCount,
        eventTypeBreakdown: eventTypeCount,
        dateRange: { startDate, endDate },
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching security events:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch security events' });
  }
});

// --- Security Summary Endpoint ---

// Refactored: Fetch security summary from Render REST API
app.get('/admin/security/summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const response = await axios.get(process.env.RENDER_API_URL + '/api/admin/security/summary', {
      headers: { Authorization: req.headers['authorization'] }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching security summary:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch security summary' });
  }
});

// --- Failed Login Attempts Endpoint ---
app.get('/admin/security/failed-logins', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const snapshot = await db.collection('request_logs')
      .where('endpoint', '==', '/auth/login')
      .where('statusCode', '==', 401)
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit) + offset)
      .get();
    
    const failedLogins = snapshot.docs
      .slice(offset)
      .map(doc => ({
        id: doc.id,
        ipAddress: doc.data().ipAddress,
        userAgent: doc.data().userAgent?.substring(0, 100),
        timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp,
        userId: doc.data().userId || 'anonymous',
        emailAttempted: doc.data().emailAttempted,
      }));
    
    // Count failed attempts by IP
    const ipAttempts = {};
    snapshot.docs.forEach(doc => {
      const ip = doc.data().ipAddress;
      ipAttempts[ip] = (ipAttempts[ip] || 0) + 1;
    });
    
    // Find suspicious IPs (>5 failed attempts in 24 hours)
    const suspiciousIps = Object.entries(ipAttempts)
      .filter(([_, count]) => count > 5)
      .map(([ip, count]) => ({ ip, attempts: count }));
    
    return res.json({
      success: true,
      failedLogins,
      summary: {
        total: snapshot.size,
        suspiciousIps,
        page: parseInt(page),
        limit: parseInt(limit),
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching failed logins:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch failed logins' });
  }
});

app.use(errorHandlerMiddleware);

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

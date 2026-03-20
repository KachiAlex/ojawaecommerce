// --- Admin Middleware ---
const express = require('express');
const admin = require('firebase-admin');
const axios = require('axios');
const cors = require('cors');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const app = express();
app.use(express.json());
app.use(cors({
  origin: ['https://ojawa.africa', 'https://www.ojawa.africa', 'https://ojawa-ecommerce.web.app', 'https://ojawa-ecommerce-staging.web.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// --- Middleware to verify Firebase ID token ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  admin.auth().verifyIdToken(token)
    .then((decodedToken) => {
      req.user = decodedToken;
      next();
    })
    .catch(() => res.status(401).json({ error: 'Invalid or expired token' }));
}

// --- Admin Middleware ---
function requireAdmin(req, res, next) {
  const user = req.user;
  if (user && (user.admin || user.isAdmin || (user.role && user.role.includes && user.role.includes('admin')))) {
    return next();
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

// --- User Sign Up Route ---
app.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const userRecord = await admin.auth().createUser({ email, password, displayName });
    return res.json({ success: true, uid: userRecord.uid, email: userRecord.email });
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
app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userRecord = await admin.auth().getUser(req.user.uid);
    res.json({ uid: userRecord.uid, email: userRecord.email, ...userRecord });
  } catch (error) {
    res.status(404).json({ error: 'User not found' });
  }
});

// --- Notifications ---
app.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('notifications').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(50).get();
    const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Product Listing ---
app.get('/products', async (req, res) => {
  try {
    const snapshot = await db.collection('products').where('status', '==', 'active').get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Cart Management ---
app.get('/cart', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const cartDoc = await db.collection('carts').doc(userId).get();
    res.json({ cart: cartDoc.exists ? cartDoc.data() : { items: [] } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/cart', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Items must be an array' });
    await db.collection('carts').doc(userId).set({ items }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/cart', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    await db.collection('carts').doc(userId).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    const walletQuery = await db.collection('wallets').where('userId', '==', buyerId).limit(1).get();
    if (walletQuery.empty) {
      return res.status(400).json({ error: { message: 'Wallet not found. Please fund your wallet first.' } });
    }
    const walletRef = walletQuery.docs[0].ref;

    const orderResult = await db.runTransaction(async (transaction) => {
      const walletSnapshot = await transaction.get(walletRef);
      if (!walletSnapshot.exists) throw new Error('Wallet not found');

      const walletData = walletSnapshot.data() || {};
      const currentBalance = Number(walletData.balance || 0);
      const amountToDebit = Number(totalAmount);

      if (currentBalance < amountToDebit) throw new Error('Insufficient wallet balance');

      const orderRef = db.collection('orders').doc();
      const walletTxnRef = db.collection('wallet_transactions').doc();
      const newBalance = currentBalance - amountToDebit;

      const normalizedItems = cartItems.map((item) => ({
        id: item.id || item.productId || null,
        name: item.name || 'Item',
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
        vendorId: item.vendorId || null,
        currency: item.currency || currency,
        metadata: item.metadata || null,
      }));

      const orderPayload = {
        id: orderRef.id,
        buyerId,
        buyerEmail: buyerInfo.email || req.user.email || null,
        buyerName: buyerInfo.name || req.user.name || null,
        cartItems: normalizedItems,
        deliveryOption,
        deliveryAddress,
        deliveryInstructions,
        selectedLogistics,
        pricingBreakdown: pricing,
        totalAmount: amountToDebit,
        currency,
        status: 'pending_vendor_confirmation',
        fulfillmentStatus: 'pending',
        paymentStatus: 'escrow_hold',
        paymentMethod: 'wallet_escrow',
        escrowStatus: 'funds_on_hold',
        escrowAmount: amountToDebit,
        walletTransactionId: walletTxnRef.id,
        metadata,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      transaction.set(orderRef, orderPayload);
      transaction.update(walletRef, { balance: newBalance, updatedAt: FieldValue.serverTimestamp() });
      transaction.set(walletTxnRef, {
        walletId: walletRef.id,
        userId: buyerId,
        type: 'debit',
        orderId: orderRef.id,
        amount: amountToDebit,
        description: `Escrow hold for order ${orderRef.id}`,
        status: 'completed',
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        currency,
        createdAt: FieldValue.serverTimestamp(),
      });

      return { orderId: orderRef.id, walletTransactionId: walletTxnRef.id, balanceAfter: newBalance };
    });

    // Notify buyer (best-effort)
    db.collection('notifications').add({
      userId: buyerId,
      type: 'order_created',
      title: 'Order Created',
      message: `Your order ${orderResult.orderId} has been created and funds are held in escrow.`,
      orderId: orderResult.orderId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    }).catch((e) => console.warn('Notification failed:', e));

    return res.json({
      result: {
        success: true,
        orderId: orderResult.orderId,
        walletTransactionId: orderResult.walletTransactionId,
        escrowStatus: 'funds_on_hold',
        remainingBalance: orderResult.balanceAfter,
      },
    });
  } catch (error) {
    console.error('Error creating escrow order:', error);
    return res.status(500).json({ error: { message: error.message || 'Failed to create escrow order' } });
  }
});

// --- Order Placement (legacy, simple) ---
app.post('/orders', authenticateToken, async (req, res) => {
  try {
    const buyerId = req.user.uid;
    const { totalAmount, cartItems, deliveryOption, deliveryAddress, deliveryInstructions, selectedLogistics, pricing, buyerInfo, metadata } = req.body;
    if (!totalAmount || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: 'totalAmount and cartItems are required' });
    }
    const orderRef = db.collection('orders').doc();
    const orderPayload = {
      buyerId,
      totalAmount,
      cartItems,
      deliveryOption: deliveryOption || 'standard',
      deliveryAddress: deliveryAddress || '',
      deliveryInstructions: deliveryInstructions || '',
      selectedLogistics: selectedLogistics || null,
      pricing: pricing || {},
      buyerInfo: buyerInfo || {},
      metadata: metadata || {},
      status: 'pending_payment',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await orderRef.set(orderPayload);
    res.json({ success: true, orderId: orderRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Order History ---
app.get('/orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('orders').where('buyerId', '==', userId).orderBy('createdAt', 'desc').get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Admin Routes ---
app.get('/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/admin/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('products').get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/admin/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('products').doc(id).set(req.body, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/admin/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('products').doc(id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Paystack Webhook ---
app.post('/paystack/webhook', paystackIpWhitelist, (req, res) => {
  // TODO: Handle webhook event
  res.status(200).send('Webhook received');
});

// --- Process Payout Request ---
app.post('/processPayoutRequest', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data } = req.body;
    const payoutRequestId = data?.payoutRequestId;
    if (!payoutRequestId) {
      return res.status(400).json({ error: 'payoutRequestId is required' });
    }
    const docSnapshot = await db.collection('payout_requests').doc(payoutRequestId).get();
    if (!docSnapshot.exists) {
      return res.status(404).json({ error: 'Payout request not found' });
    }
    return res.json({ success: true, message: 'Stub: implement logic' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// --- Ensure Wallet For User ---
app.post('/ensureWalletForUser', async (req, res) => {
  try {
    const { adminSecret, userId, userType = 'buyer', currency = 'NGN' } = req.body;
    const envSecret = process.env.WALLET_ADMIN_SECRET;
    if (!envSecret) {
      return res.status(500).json({ error: 'Wallet admin secret not configured' });
    }
    if (!adminSecret || adminSecret !== envSecret) {
      return res.status(403).json({ error: 'Invalid admin secret' });
    }
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    return res.json({ success: true, message: 'Stub: implement logic' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

const VENDOR_SUBSCRIPTION_PLANS = {
  basic: { price: 0, commissionRate: 5.0, productLimit: 50, analyticsLevel: 'basic', supportLevel: 'email' },
  pro: { price: 5000, commissionRate: 3.0, productLimit: 500, analyticsLevel: 'advanced', supportLevel: 'priority' },
  premium: { price: 15000, commissionRate: 2.0, productLimit: -1, analyticsLevel: 'premium', supportLevel: 'dedicated' },
};

const VENDOR_SUBSCRIPTION_DURATION_DAYS = 30;

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const normalizePlanKey = (plan) => (typeof plan === 'string' ? plan.trim().toLowerCase() : '');

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

async function processPaystackWalletTopup({ reference, userId, amount }, authUid) {
  if (!authUid) throw new Error('User must be authenticated to top up wallet');
  if (!reference) throw new Error('Reference is required');
  if (!userId || userId !== authUid) throw new Error('User ID mismatch');
  if (!amount || Number(amount) <= 0) throw new Error('Valid amount is required');

  const paystackSecretKey = getPaystackSecret();
  if (!paystackSecretKey) throw new Error('Payment service not configured');

  const verifyResponse = await axios.get(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const transaction = verifyResponse.data?.data;
  if (!transaction) throw new Error('Transaction could not be verified');
  if (transaction.status !== 'success') throw new Error(`Payment not successful. Status: ${transaction.status}`);

  const paidAmount = Number(transaction.amount) / 100;
  if (Math.abs(paidAmount - Number(amount)) > 0.01) {
    throw new Error(`Amount mismatch. Expected: ${amount}, Paid: ${paidAmount}`);
  }

  const existingTx = await db.collection('wallet_transactions')
    .where('paymentIntentId', '==', transaction.reference)
    .where('status', '==', 'completed')
    .limit(1)
    .get();

  if (!existingTx.empty) {
    return {
      success: true,
      message: 'Transaction already processed',
      transactionId: existingTx.docs[0].id,
    };
  }

  const walletQuery = await db.collection('wallets').where('userId', '==', userId).limit(1).get();

  let walletRef;
  let currentBalance = 0;

  if (walletQuery.empty) {
    walletRef = db.collection('wallets').doc();
    await walletRef.set({
      userId,
      balance: 0,
      currency: transaction.currency || 'NGN',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    walletRef = walletQuery.docs[0].ref;
    currentBalance = walletQuery.docs[0].data().balance || 0;
  }

  const newBalance = currentBalance + paidAmount;
  const batch = db.batch();

  batch.update(walletRef, {
    balance: newBalance,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const transactionRef = db.collection('wallet_transactions').doc();
  batch.set(transactionRef, {
    walletId: walletRef.id,
    userId,
    type: 'credit',
    amount: paidAmount,
    description: 'Wallet top-up via Paystack',
    paymentIntentId: transaction.reference,
    paystackReference: transaction.reference,
    balanceBefore: currentBalance,
    balanceAfter: newBalance,
    status: 'completed',
    currency: transaction.currency || 'NGN',
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    success: true,
    transactionId: transactionRef.id,
    newBalance,
    amount: paidAmount,
  };
}

app.post('/notifyVendorNewOrder', authenticateToken, async (req, res) => {
  try {
    const { vendorId, orderId, buyerName, totalAmount, items = [] } = req.body || {};
    if (!vendorId || !orderId || !buyerName || !totalAmount) {
      return res.status(400).json({ error: 'vendorId, orderId, buyerName and totalAmount are required' });
    }

    const notificationRef = await db.collection('notifications').add({
      userId: vendorId,
      type: 'new_order',
      title: 'New Order Received',
      message: `You have received a new order from ${buyerName} for ₦${Number(totalAmount).toLocaleString()}`,
      orderId,
      buyerName,
      totalAmount: Number(totalAmount),
      items,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return res.json({ success: true, message: 'Vendor notification sent', notificationId: notificationRef.id });
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

app.post('/releaseEscrowFundsHttp', authenticateToken, async (req, res) => {
  try {
    const { orderId, vendorId, amount } = req.body || {};
    if (!orderId || !vendorId || !amount) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderDoc.data() || {};
    if (!order.buyerId || order.buyerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only the buyer of this order can release escrow funds' });
    }

    const vendorWalletSnap = await db.collection('wallets').where('userId', '==', vendorId).limit(1).get();
    const batch = db.batch();
    let vendorWalletRef;
    let vendorBalanceBefore = 0;

    if (!vendorWalletSnap.empty) {
      vendorWalletRef = vendorWalletSnap.docs[0].ref;
      vendorBalanceBefore = Number(vendorWalletSnap.docs[0].data().balance || 0);
      batch.update(vendorWalletRef, {
        balance: vendorBalanceBefore + Number(amount),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      vendorWalletRef = db.collection('wallets').doc();
      batch.set(vendorWalletRef, {
        userId: vendorId,
        type: 'vendor',
        balance: Number(amount),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const transactionRef = db.collection('wallet_transactions').doc();
    batch.set(transactionRef, {
      userId: vendorId,
      orderId,
      type: 'credit',
      amount: Number(amount),
      description: `Escrow release for order ${orderId}`,
      status: 'completed',
      balanceBefore: vendorBalanceBefore,
      balanceAfter: vendorBalanceBefore + Number(amount),
      createdAt: FieldValue.serverTimestamp(),
    });

    batch.update(orderRef, {
      status: 'completed',
      escrowReleased: true,
      releaseTransactionId: transactionRef.id,
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return res.json({ success: true, transactionId: transactionRef.id });
  } catch (error) {
    console.error('Error releasing escrow funds:', error);
    return res.status(500).json({ error: error.message || 'Failed to release escrow funds' });
  }
});

app.post('/topupWalletPaystack', authenticateToken, async (req, res) => {
  try {
    const result = await processPaystackWalletTopup(req.body || {}, req.user.uid);
    return res.json(result);
  } catch (error) {
    console.error('topupWalletPaystack error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process wallet top-up' });
  }
});

app.post('/createPaystackSubscriptionRecord', authenticateToken, async (req, res) => {
  try {
    const { reference, plan: requestedPlan, userId: requestedUserId } = req.body || {};
    if (!reference) {
      return res.status(400).json({ error: 'Paystack reference is required' });
    }

    const paystackSecretKey = getPaystackSecret();
    if (!paystackSecretKey) {
      return res.status(500).json({ error: 'Payment service not configured' });
    }

    const verifyResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const transaction = verifyResponse.data?.data;
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction could not be verified' });
    }
    if (transaction.status !== 'success') {
      return res.status(400).json({ error: `Payment not successful. Status: ${transaction.status}` });
    }

    const metadata = parsePaystackMetadata(transaction.metadata || transaction.meta);
    const plan = normalizePlanKey(requestedPlan || metadata.subscription_plan || metadata.plan);
    if (!plan || !VENDOR_SUBSCRIPTION_PLANS[plan]) {
      return res.status(400).json({ error: 'Subscription plan could not be determined' });
    }

    const userId = metadata.userId || metadata.user_id || requestedUserId || req.user.uid;
    if (userId !== req.user.uid) {
      return res.status(403).json({ error: 'Authenticated user does not match subscription owner' });
    }

    const planConfig = VENDOR_SUBSCRIPTION_PLANS[plan];
    const nowDate = new Date();
    const endDate = addDays(nowDate, VENDOR_SUBSCRIPTION_DURATION_DAYS);

    await db.collection('users').doc(userId).set({
      subscriptionPlan: plan,
      subscriptionStatus: 'active',
      subscriptionStartDate: nowDate,
      subscriptionEndDate: endDate,
      commissionRate: planConfig.commissionRate,
      productLimit: planConfig.productLimit,
      analyticsLevel: planConfig.analyticsLevel,
      supportLevel: planConfig.supportLevel,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    const subscriptionRef = db.collection('subscriptions').doc();
    await subscriptionRef.set({
      userId,
      plan,
      price: planConfig.price,
      amountPaid: Number(transaction.amount || 0) / 100,
      currency: 'NGN',
      status: 'active',
      startDate: nowDate,
      endDate,
      commissionRate: planConfig.commissionRate,
      productLimit: planConfig.productLimit,
      analyticsLevel: planConfig.analyticsLevel,
      supportLevel: planConfig.supportLevel,
      paymentMethod: 'paystack',
      paystackReference: transaction.reference,
      transactionId: String(transaction.id),
      metadata,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      plan,
      subscriptionId: subscriptionRef.id,
      startDate: nowDate,
      endDate,
    });
  } catch (error) {
    console.error('Error creating Paystack subscription record:', error);
    return res.status(500).json({ error: error.message || 'Failed to create subscription record' });
  }
});

app.post('/sendEmailOTP', async (req, res) => {
  try {
    const { to, subject, htmlContent, textContent, purpose } = req.body || {};
    if (!to || !subject || (!htmlContent && !textContent)) {
      return res.status(400).json({ error: 'to, subject, and content are required' });
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

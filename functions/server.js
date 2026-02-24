// --- Admin Middleware ---
function requireAdmin(req, res, next) {
  const user = req.user;
  if (user && (user.admin || user.isAdmin || (user.role && user.role.includes && user.role.includes('admin')))) {
    return next();
  }
  return res.status(403).json({ error: 'Admin privileges required' });
}

// --- Admin: List all orders ---
app.get('/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Admin: List all products ---
app.get('/admin/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('products').get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Admin: Update product ---
app.put('/admin/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    await db.collection('products').doc(id).set(update, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Admin: Delete product ---
app.delete('/admin/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('products').doc(id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Notifications: Get user notifications ---
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

// --- Cart Management (protected) ---
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

// --- Order Placement (protected, escrow-backed) ---
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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await orderRef.set(orderPayload);
    res.json({ success: true, orderId: orderRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Order History (protected) ---
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

const express = require('express');
const admin = require('firebase-admin');
const axios = require('axios');
const cors = require('cors');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(express.json());
app.use(cors());

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

// Example Paystack webhook route with IP whitelisting
app.post('/paystack/webhook', paystackIpWhitelist, (req, res) => {
  // TODO: Handle webhook event
  res.status(200).send('Webhook received');
});


// Example: processPayoutRequest as Express route
app.post('/processPayoutRequest', async (req, res) => {
  try {
    // Auth check (replace with your own logic)
    const { auth, data } = req.body;
    if (!auth || !auth.token || !auth.token.admin) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    const payoutRequestId = data?.payoutRequestId;
    if (!payoutRequestId) {
      return res.status(400).json({ error: 'payoutRequestId is required' });
    }
    const docSnapshot = await db.collection('payout_requests').doc(payoutRequestId).get();
    if (!docSnapshot.exists) {
      return res.status(404).json({ error: 'Payout request not found' });
    }
    // Call your existing logic here (refactor processPayoutRequestDocument to be reusable)
    // const result = await processPayoutRequestDocument({ payoutRequestId, data: docSnapshot.data() });
    // For now, just return success
    return res.json({ success: true, message: 'Stub: implement logic' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Refactored: ensureWalletForUser as Express route
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
    // Import or inline ensureWalletDocument and sanitizeWalletForResponse from index.js
    // For now, stub response:
    // const walletDoc = await ensureWalletDocument({ userId, userType, currency });
    // const wallet = sanitizeWalletForResponse(walletDoc ? { id: walletDoc.id, ...walletDoc } : null);
    return res.json({ success: true, message: 'Stub: implement logic' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('Ojawa backend running on Render!');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});


// --- User Sign Up Route ---
app.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
    });
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
      {
        email,
        password,
        returnSecureToken: true
      }
    );
    const { idToken, refreshToken, expiresIn, localId } = response.data;
    return res.json({ success: true, idToken, refreshToken, expiresIn, uid: localId });
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    return res.status(401).json({ error: msg });
  }
});

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

// --- Example protected route ---
app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userRecord = await admin.auth().getUser(req.user.uid);
    res.json({ uid: userRecord.uid, email: userRecord.email, ...userRecord });
  } catch (error) {
    res.status(404).json({ error: 'User not found' });
  }
});

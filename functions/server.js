
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

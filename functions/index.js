const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

const getPaystackConfig = () => {
  return {
    secretKey:
      process.env.PAYSTACK_SECRET_KEY ||
      process.env.PSTACK_SECRET_KEY ||
      process.env.PAYSTACK_SK ||
      process.env.SK_TEST_PAYSTACK,
    webhookSecret:
      process.env.PAYSTACK_WEBHOOK_SECRET ||
      process.env.PSTACK_WEBHOOK_SECRET ||
      process.env.PAYSTACK_SECRET_HASH ||
      process.env.PSTACK_SECRET_HASH,
  };
};

const VENDOR_SUBSCRIPTION_PLANS = {
  basic: { price: 0, commissionRate: 5.0, productLimit: 50, analyticsLevel: 'basic', supportLevel: 'email' },
  pro: { price: 5000, commissionRate: 3.0, productLimit: 500, analyticsLevel: 'advanced', supportLevel: 'priority' },
  premium: { price: 15000, commissionRate: 2.0, productLimit: -1, analyticsLevel: 'premium', supportLevel: 'dedicated' },
};

const VENDOR_SUBSCRIPTION_DURATION_DAYS = 30;

const addDays = (date, days) => {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
};

const normalizePlanKey = (plan) => (typeof plan === 'string' ? plan.trim().toLowerCase() : '');

const parsePaystackMetadata = (metadata) => {
  if (!metadata) return {};
  if (typeof metadata === 'object') return metadata;
  try {
    return JSON.parse(metadata);
  } catch (error) {
    console.warn('Unable to parse Paystack metadata payload:', error?.message);
    return {};
  }
};

async function applyVendorSubscription({
  userId,
  plan,
  paystackReference,
  transactionId,
  amountPaid,
  metadata = {},
  status = 'active',
}) {
  if (!userId) {
    throw new Error('User ID is required to apply subscription');
  }

  const planKey = normalizePlanKey(plan);
  const planConfig = VENDOR_SUBSCRIPTION_PLANS[planKey];

  if (!planConfig) {
    throw new Error(`Unknown vendor subscription plan: ${plan}`);
  }

  const nowDate = new Date();
  const endDate = addDays(nowDate, VENDOR_SUBSCRIPTION_DURATION_DAYS);
  const startTimestamp = Timestamp.fromDate(nowDate);
  const endTimestamp = Timestamp.fromDate(endDate);

  const userRef = db.collection('users').doc(userId);
  await userRef.set(
    {
      subscriptionPlan: planKey,
      subscriptionStatus: status,
      subscriptionStartDate: startTimestamp,
      subscriptionEndDate: endTimestamp,
      commissionRate: planConfig.commissionRate,
      productLimit: planConfig.productLimit,
      analyticsLevel: planConfig.analyticsLevel,
      supportLevel: planConfig.supportLevel,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  let subscriptionRef = null;
  if (paystackReference) {
    const existingSubscription = await db
      .collection('subscriptions')
      .where('paystackReference', '==', paystackReference)
      .limit(1)
      .get();
    if (!existingSubscription.empty) {
      subscriptionRef = existingSubscription.docs[0].ref;
    }
  }

  if (!subscriptionRef) {
    subscriptionRef = db.collection('subscriptions').doc();
  }

  const subscriptionPayload = {
    userId,
    plan: planKey,
    price: planConfig.price,
    amountPaid: typeof amountPaid === 'number' ? amountPaid : planConfig.price,
    currency: 'NGN',
    status,
    startDate: startTimestamp,
    endDate: endTimestamp,
    commissionRate: planConfig.commissionRate,
    productLimit: planConfig.productLimit,
    analyticsLevel: planConfig.analyticsLevel,
    supportLevel: planConfig.supportLevel,
    paymentMethod: 'paystack',
    paystackReference: paystackReference || null,
    transactionId: transactionId || null,
    metadata,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!subscriptionRef.id || !(await subscriptionRef.get()).exists) {
    subscriptionPayload.createdAt = FieldValue.serverTimestamp();
    await subscriptionRef.set(subscriptionPayload);
  } else {
    await subscriptionRef.set(subscriptionPayload, { merge: true });
  }

  return {
    subscriptionId: subscriptionRef.id,
    plan: planKey,
    startDate: startTimestamp,
    endDate: endTimestamp,
    commissionRate: planConfig.commissionRate,
    productLimit: planConfig.productLimit,
  };
}

// Routes optimization (Gen2 HTTPS onRequest)
// Note: optimizeRoute is handled by the 'routes' codebase in functions-routes
// Commented out to avoid duplicate function definition
// try {
//   const { optimizeRoute } = require('./src/routeOptimization');
//   exports.optimizeRoute = optimizeRoute;
// } catch (e) {
//   console.warn('routeOptimization not loaded:', e?.message);
// }

// Basic notification function
exports.notifyVendorNewOrder = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) {
    throw new HttpsError(
      'unauthenticated',
      'User must be authenticated to send notifications'
    );
  }
  
  try {
    console.log("notifyVendorNewOrder called with data:", data);
    
    const { vendorId, orderId, buyerName, totalAmount, items } = data || {};
    
    // Validate required parameters
    if (!vendorId) {
      throw new Error("vendorId is required");
    }
    if (!orderId) {
      throw new Error("orderId is required");
    }
    if (!buyerName) {
      throw new Error("buyerName is required");
    }
    if (!totalAmount) {
      throw new Error("totalAmount is required");
    }

    console.log("Creating notification for vendor:", vendorId);

    // Create notification in vendor's notifications collection
    const notificationData = {
      userId: vendorId,
      type: 'new_order',
      title: 'New Order Received',
      message: `You have received a new order from ${buyerName} for ₦${Number(totalAmount).toLocaleString()}`,
      orderId: orderId,
      buyerName: buyerName,
      totalAmount: Number(totalAmount),
      items: items || [],
      read: false,
      createdAt: new Date()
    };

    console.log("Notification data:", notificationData);

    const notificationRef = await db.collection('notifications').add(notificationData);
    
    console.log("Notification created with ID:", notificationRef.id);

    return { 
      success: true, 
      message: "Vendor notification sent",
      notificationId: notificationRef.id
    };
  } catch (error) {
    console.error("Error notifying vendor:", error);
    console.error("Error stack:", error.stack);
    throw new Error(`Failed to notify vendor: ${error.message}`);
  }
});

// Send payment confirmation email
exports.sendPaymentConfirmation = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) {
    throw new HttpsError(
      'unauthenticated',
      'User must be authenticated to send payment confirmations'
    );
  }
  
  try {
    const { buyerEmail, buyerName, orderId, amount, items } = data || {};
    
    console.log("Payment confirmation email:", {
      to: buyerEmail,
      subject: `Payment Confirmation - Order ${orderId}`,
      body: `Hello ${buyerName},\n\nYour payment has been processed successfully.\n\nOrder Details:\n- Order ID: ${orderId}\n- Amount: ₦${amount.toLocaleString()}\n- Items: ${items?.length || 0} item(s)\n\nThank you for your purchase!\n\nBest regards,\nOjawa Team`
    });

    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.error("Error sending payment confirmation:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
});

// Send order status update email
exports.sendOrderStatusUpdate = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) {
    throw new HttpsError(
      'unauthenticated',
      'User must be authenticated to send order updates'
    );
  }
  
  try {
    const { buyerEmail, buyerName, orderId, status, trackingNumber, carrier } = data || {};
    
    console.log("Order status update email:", {
      to: buyerEmail,
      subject: `Order Update - ${orderId}`,
      body: `Hello ${buyerName},\n\nYour order status has been updated.\n\nOrder Details:\n- Order ID: ${orderId}\n- Status: ${status}\n${trackingNumber ? `- Tracking Number: ${trackingNumber}` : ''}\n${carrier ? `- Carrier: ${carrier}` : ''}\n\nThank you for your patience!\n\nBest regards,\nOjawa Team`
    });

    return { success: true, message: "Status update email sent" };
  } catch (error) {
    console.error("Error sending status update:", error);
    throw new Error(`Failed to send status update: ${error.message}`);
  }
});

// Create escrow-backed order (wallet funds held in escrow)
exports.createEscrowOrder = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to create an order');
  }

  try {
    const buyerId = auth.uid;
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
    } = data || {};

    if (!totalAmount || Number(totalAmount) <= 0) {
      throw new HttpsError('invalid-argument', 'totalAmount must be a positive number');
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      throw new HttpsError('invalid-argument', 'cartItems must include at least one item');
    }

    const walletQuery = await db.collection('wallets')
      .where('userId', '==', buyerId)
      .limit(1)
      .get();

    if (walletQuery.empty) {
      throw new HttpsError('failed-precondition', 'Wallet not found. Please fund your wallet first.');
    }

    const walletRef = walletQuery.docs[0].ref;

    const orderResult = await db.runTransaction(async (transaction) => {
      const walletSnapshot = await transaction.get(walletRef);
      if (!walletSnapshot.exists) {
        throw new HttpsError('failed-precondition', 'Wallet not found');
      }

      const walletData = walletSnapshot.data() || {};
      const currentBalance = Number(walletData.balance || 0);
      const amountToDebit = Number(totalAmount);

      if (currentBalance < amountToDebit) {
        throw new HttpsError('failed-precondition', 'Insufficient wallet balance');
      }

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
        buyerEmail: buyerInfo.email || auth.token?.email || null,
        buyerName: buyerInfo.name || auth.token?.name || null,
        cartItems: normalizedItems,
        deliveryOption,
        deliveryAddress,
        deliveryInstructions,
        selectedLogistics: selectedLogistics || null,
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
      transaction.update(walletRef, {
        balance: newBalance,
        updatedAt: FieldValue.serverTimestamp(),
      });

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

      return {
        orderId: orderRef.id,
        walletTransactionId: walletTxnRef.id,
        balanceAfter: newBalance,
      };
    });

    // Notify buyer that their order was created (best-effort, outside transaction)
    try {
      await db.collection('notifications').add({
        userId: buyerId,
        type: 'order_created',
        title: 'Order Created',
        message: `Your order ${orderResult.orderId} has been created and funds are held in escrow.`,
        orderId: orderResult.orderId,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (notifyError) {
      console.warn('createEscrowOrder notification failed:', notifyError);
    }

    return {
      success: true,
      orderId: orderResult.orderId,
      walletTransactionId: orderResult.walletTransactionId,
      escrowStatus: 'funds_on_hold',
      remainingBalance: orderResult.balanceAfter,
    };
  } catch (error) {
    console.error('Error creating escrow order:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error?.message || 'Failed to create escrow order');
  }
});

// Release escrow funds to vendor
exports.releaseEscrowFunds = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) {
    throw new HttpsError(
      'unauthenticated',
      'User must be authenticated to release escrow funds'
    );
  }
  
  try {
    const { orderId, vendorId, amount } = data || {};
    
    if (!orderId || !vendorId || !amount) {
      throw new HttpsError(
        'invalid-argument',
        'Missing required parameters: orderId, vendorId, and amount are required'
      );
    }
    
    // Verify the authenticated user is the buyer of the order
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      throw new HttpsError(
        'not-found',
        'Order not found'
      );
    }
    
    const order = orderDoc.data();
    const buyerId = order.buyerId;
    
    // Verify the authenticated user is the buyer of the order
    if (buyerId !== auth.uid) {
      throw new HttpsError(
        'permission-denied',
        'Only the buyer of the order can release escrow funds'
      );
    }
    
    if (!buyerId) {
      throw new HttpsError(
        'invalid-argument',
        'Buyer ID not found in order'
      );
    }

    // Get buyer and vendor wallets
    const [buyerWalletSnap, vendorWalletSnap] = await Promise.all([
      db.collection('wallets').where('userId', '==', buyerId).limit(1).get(),
      db.collection('wallets').where('userId', '==', vendorId).limit(1).get()
    ]);
    
    if (buyerWalletSnap.empty) {
      throw new Error("Buyer wallet not found");
    }
    
    const buyerWallet = buyerWalletSnap.docs[0];
    const buyerBalance = buyerWallet.data().balance || 0;
    
    if (buyerBalance < amount) {
      throw new Error("Insufficient funds in buyer wallet");
    }

    const batch = db.batch();
    
    // Update buyer wallet (deduct amount)
    batch.update(buyerWallet.ref, {
      balance: buyerBalance - amount,
      updatedAt: new Date()
    });
    
    // Update or create vendor wallet
    if (!vendorWalletSnap.empty) {
      const vendorWallet = vendorWalletSnap.docs[0];
      const vendorBalance = vendorWallet.data().balance || 0;
      batch.update(vendorWallet.ref, {
        balance: vendorBalance + amount,
        updatedAt: new Date()
      });
    } else {
      // Create vendor wallet
      const vendorWalletRef = db.collection('wallets').doc();
      batch.set(vendorWalletRef, {
        userId: vendorId,
        type: 'vendor',
        balance: amount,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Create transaction record
    const transactionRef = db.collection('wallet_transactions').doc();
    batch.set(transactionRef, {
      userId: vendorId,
      orderId,
      type: 'credit',
      amount,
      description: `Escrow release for order ${orderId}`,
      status: 'completed',
      balanceBefore: vendorWalletSnap.empty ? 0 : (vendorWalletSnap.docs[0].data().balance || 0),
      balanceAfter: vendorWalletSnap.empty ? amount : ((vendorWalletSnap.docs[0].data().balance || 0) + amount),
      createdAt: new Date()
    });
    
    // Update order status
    batch.update(db.collection('orders').doc(orderId), {
      status: 'completed',
      escrowReleased: true,
      releaseTransactionId: transactionRef.id,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: new Date()
    });
    
    await batch.commit();
    
    return { success: true, transactionId: transactionRef.id };
  } catch (error) {
    console.error("Error releasing escrow funds:", error);
    throw new Error(`Failed to release escrow funds: ${error.message}`);
  }
});

// CORS-enabled HTTP endpoint mirroring releaseEscrowFunds callable
exports.releaseEscrowFundsHttp = onRequest(async (req, res) => {
  // Whitelist of allowed origins
  const allowedOrigins = [
    'https://ojawa-ecommerce.web.app',
    'https://ojawa-ecommerce.firebaseapp.com',
    'https://ojawa-ecommerce-staging.web.app',
    'https://ojawa-ecommerce-staging.firebaseapp.com'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  } else {
    res.set('Access-Control-Allow-Origin', 'null');
  }
  
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { orderId, vendorId, amount } = req.body || {};
    if (!orderId || !vendorId || !amount) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Get order details
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderDoc.data();
    const buyerId = order.buyerId;
    if (!buyerId) {
      return res.status(400).json({ error: 'Buyer ID not found in order' });
    }

    // Get buyer and vendor wallets
    const [buyerWalletSnap, vendorWalletSnap] = await Promise.all([
      db.collection('wallets').where('userId', '==', buyerId).limit(1).get(),
      db.collection('wallets').where('userId', '==', vendorId).limit(1).get()
    ]);

    if (buyerWalletSnap.empty) {
      return res.status(404).json({ error: 'Buyer wallet not found' });
    }

    const buyerWallet = buyerWalletSnap.docs[0];
    const buyerBalance = buyerWallet.data().balance || 0;
    if (buyerBalance < amount) {
      return res.status(400).json({ error: 'Insufficient funds in buyer wallet' });
    }

    const batch = db.batch();
    // Update buyer wallet (deduct amount)
    batch.update(buyerWallet.ref, {
      balance: buyerBalance - amount,
      updatedAt: new Date()
    });

    // Update or create vendor wallet
    if (!vendorWalletSnap.empty) {
      const vendorWallet = vendorWalletSnap.docs[0];
      const vendorBalance = vendorWallet.data().balance || 0;
      batch.update(vendorWallet.ref, {
        balance: vendorBalance + amount,
        updatedAt: new Date()
      });
    } else {
      const vendorWalletRef = db.collection('wallets').doc();
      batch.set(vendorWalletRef, {
        userId: vendorId,
        type: 'vendor',
        balance: amount,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Create transaction record
    const transactionRef = db.collection('wallet_transactions').doc();
    batch.set(transactionRef, {
      userId: vendorId,
      orderId,
      type: 'credit',
      amount,
      description: `Escrow release for order ${orderId}`,
      status: 'completed',
      balanceBefore: vendorWalletSnap.empty ? 0 : (vendorWalletSnap.docs[0].data().balance || 0),
      balanceAfter: vendorWalletSnap.empty ? amount : ((vendorWalletSnap.docs[0].data().balance || 0) + amount),
      createdAt: new Date()
    });

    // Update order status
    batch.update(db.collection('orders').doc(orderId), {
      status: 'completed',
      escrowReleased: true,
      releaseTransactionId: transactionRef.id,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: new Date()
    });

    await batch.commit();

    return res.status(200).json({ success: true, transactionId: transactionRef.id });
  } catch (error) {
    console.error('releaseEscrowFundsHttp error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Send push notification when notification document is created
exports.sendPushNotification = onDocumentCreated('notifications/{notificationId}', async (event) => {
  try {
    const notification = event.data?.data();
    if (!notification) {
      return null;
    }
    const userId = notification.userId;
    const notificationId = event.params.notificationId;
    
    console.log(`Sending push notification to user ${userId}:`, notification.title);
    
    // Get user's FCM token
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log(`User ${userId} not found`);
      return null;
    }
    
    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;
    
    if (!fcmToken) {
      console.log(`No FCM token for user ${userId}`);
      return null;
    }
    
    // Check user's notification preferences
    const prefs = userData.notificationPreferences || {};
    const pushPrefs = prefs.push || {};
    
    // If push notifications disabled globally, skip
    if (pushPrefs.enabled === false) {
      console.log(`Push notifications disabled for user ${userId}`);
      return null;
    }
    
    // Check category-specific preferences
    const notificationType = notification.type;
    if (notificationType === 'order_update' && pushPrefs.orders === false) {
      console.log(`Order push notifications disabled for user ${userId}`);
      return null;
    }
    if (notificationType === 'payment' && pushPrefs.payments === false) {
      console.log(`Payment push notifications disabled for user ${userId}`);
      return null;
    }
    if (notificationType === 'dispute' && pushPrefs.disputes === false) {
      console.log(`Dispute push notifications disabled for user ${userId}`);
      return null;
    }
    if (notificationType === 'marketing' && pushPrefs.marketing === false) {
      console.log(`Marketing push notifications disabled for user ${userId}`);
      return null;
    }
    
    // Prepare message payload
    const message = {
      token: fcmToken,
      notification: {
        title: notification.title || 'Ojawa Notification',
        body: notification.message || ''
      },
      data: {
        notificationId: notificationId,
        type: notification.type || 'general',
        orderId: notification.orderId || '',
        url: notification.link || '',
        priority: notification.priority || 'normal'
      },
      webpush: {
        notification: {
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          requireInteraction: notification.priority === 'urgent'
        }
      }
    };
    
    // Send push notification
    const response = await messaging.send(message);
    console.log(`Push notification sent successfully to ${userId}:`, response);
    
    // Update notification with sent status
    await event.data?.ref.update({
      pushSent: true,
      pushSentAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return response;
  } catch (error) {
    console.error('Error sending push notification:', error);
    
    // If token is invalid, remove it from user document
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      const notification = event.data?.data();
      if (notification?.userId) {
        await db.collection('users').doc(notification.userId).update({
          fcmToken: null
        });
        console.log(`Removed invalid FCM token for user ${notification.userId}`);
      }
    }
    
    return null;
  }
});

// Trigger email notification when notification document is created
exports.sendEmailNotification = onDocumentCreated('notifications/{notificationId}', async (event) => {
  try {
    const notification = event.data?.data();
    if (!notification) {
      return null;
    }
    const userId = notification.userId;
    
    // Check if email should be sent
    if (!notification.sendEmail) {
      console.log('Email sending not requested for this notification');
      return null;
    }
    
    console.log(`Sending email notification to user ${userId}:`, notification.title);
    
    // Get user email
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log(`User ${userId} not found`);
      return null;
    }
    
    const userData = userDoc.data();
    const email = userData.email;
    
    if (!email) {
      console.log(`No email for user ${userId}`);
      return null;
    }
    
    // Check user's email notification preferences
    const prefs = userData.notificationPreferences || {};
    const emailPrefs = prefs.email || {};
    
    // If email notifications disabled globally, skip
    if (emailPrefs.enabled === false) {
      console.log(`Email notifications disabled for user ${userId}`);
      return null;
    }
    
    // Check category-specific preferences
    const notificationType = notification.type;
    if (notificationType === 'order_update' && emailPrefs.orders === false) {
      console.log(`Order email notifications disabled for user ${userId}`);
      return null;
    }
    if (notificationType === 'payment' && emailPrefs.payments === false) {
      console.log(`Payment email notifications disabled for user ${userId}`);
      return null;
    }
    if (notificationType === 'dispute' && emailPrefs.disputes === false) {
      console.log(`Dispute email notifications disabled for user ${userId}`);
      return null;
    }
    if (notificationType === 'marketing' && emailPrefs.marketing === false) {
      console.log(`Marketing email notifications disabled for user ${userId}`);
      return null;
    }
    
    // Get email template based on notification type
    const emailBody = getEmailTemplate(notification, userData);
    
    // Create mail document for Firebase Extension to process
    const mailRef = await db.collection('mail').add({
      to: email,
      message: {
        subject: notification.title || 'Ojawa Notification',
        text: emailBody
      },
      notificationId: event.params.notificationId,
      userId: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Email queued for user ${userId}, mail document:`, mailRef.id);
    
    // Update notification with email sent status
    await event.data?.ref.update({
      emailQueued: true,
      emailQueuedAt: admin.firestore.FieldValue.serverTimestamp(),
      mailDocId: mailRef.id
    });
    
    return mailRef.id;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return null;
  }
});

// Helper function to generate email templates
function getEmailTemplate(notification, userData) {
  const userName = userData.displayName || userData.name || 'User';
  const baseUrl = 'https://ojawa-ecommerce.web.app';
  
  let body = `Hello ${userName},\n\n`;
  
  switch (notification.type) {
    case 'order_placed':
      body += `Your order has been placed successfully!\n\n`;
      body += `Order ID: ${notification.orderId || 'N/A'}\n`;
      body += `${notification.message}\n\n`;
      body += `View your order: ${baseUrl}/buyer\n\n`;
      break;
      
    case 'order_update':
      body += `Your order status has been updated.\n\n`;
      body += `${notification.message}\n\n`;
      body += `Order ID: ${notification.orderId || 'N/A'}\n`;
      body += `View order details: ${baseUrl}/buyer\n\n`;
      break;
      
    case 'order_shipped':
      body += `Good news! Your order has been shipped.\n\n`;
      body += `${notification.message}\n\n`;
      body += `Track your order: ${baseUrl}/tracking/${notification.orderId || ''}\n\n`;
      break;
      
    case 'order_delivered':
      body += `Your order has been delivered!\n\n`;
      body += `${notification.message}\n\n`;
      body += `Please confirm receipt: ${baseUrl}/buyer\n\n`;
      break;
      
    case 'payment':
    case 'payment_success':
      body += `Payment processed successfully.\n\n`;
      body += `${notification.message}\n\n`;
      body += `View transaction: ${baseUrl}/buyer?tab=wallet\n\n`;
      break;
      
    case 'payment_released':
      body += `Escrow payment has been released.\n\n`;
      body += `${notification.message}\n\n`;
      body += `View your wallet: ${baseUrl}/buyer?tab=wallet\n\n`;
      break;
      
    case 'dispute':
    case 'dispute_created':
      body += `A dispute has been created.\n\n`;
      body += `${notification.message}\n\n`;
      body += `View dispute: ${baseUrl}/buyer?tab=disputes\n\n`;
      break;
      
    case 'dispute_resolved':
      body += `Your dispute has been resolved.\n\n`;
      body += `${notification.message}\n\n`;
      body += `View details: ${baseUrl}/buyer?tab=disputes\n\n`;
      break;
      
    case 'new_order':
      body += `You have received a new order!\n\n`;
      body += `${notification.message}\n\n`;
      body += `View order: ${baseUrl}/vendor\n\n`;
      break;
      
    case 'low_stock':
      body += `Low stock alert for your products.\n\n`;
      body += `${notification.message}\n\n`;
      body += `Manage inventory: ${baseUrl}/vendor?tab=store\n\n`;
      break;
      
    default:
      body += `${notification.message}\n\n`;
      if (notification.link) {
        body += `View details: ${notification.link}\n\n`;
      }
  }
  
  body += `Thank you for using Ojawa!\n\n`;
  body += `Best regards,\n`;
  body += `The Ojawa Team\n\n`;
  body += `---\n`;
  body += `If you wish to unsubscribe from these emails, please update your notification preferences in your account settings.`;
  
  return body;
}

// Send bulk push notifications
exports.sendBulkPushNotifications = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  try {
    const { userIds, notification } = data || {};
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new HttpsError('invalid-argument', 'userIds must be a non-empty array');
    }
    
    if (!notification || !notification.title || !notification.message) {
      throw new HttpsError('invalid-argument', 'notification must include title and message');
    }
    
    console.log(`Sending bulk notifications to ${userIds.length} users`);
    
    const results = {
      total: userIds.length,
      sent: 0,
      failed: 0,
      errors: []
    };
    
    // Send notifications in batches
    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (userId) => {
        try {
          await db.collection('notifications').add({
            userId: userId,
            type: notification.type || 'general',
            title: notification.title,
            message: notification.message,
            orderId: notification.orderId || null,
            link: notification.link || null,
            priority: notification.priority || 'normal',
            sendEmail: notification.sendEmail || false,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          results.sent++;
        } catch (error) {
          results.failed++;
          results.errors.push({ userId, error: error.message });
        }
      }));
    }
    
    console.log(`Bulk notification results:`, results);
    
    return results;
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    throw new HttpsError('internal', error.message);
  }
});

// ===== PAYSTACK PAYMENT FUNCTIONS =====

// Top up wallet with Paystack payment
exports.topupWalletPaystack = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) {
    throw new HttpsError(
      'unauthenticated',
      'User must be authenticated to top up wallet'
    );
  }

  try {
    const { reference, userId, amount } = data || {};

    if (!reference) {
      throw new HttpsError(
        'invalid-argument',
        'Reference is required'
      );
    }

    if (!userId || userId !== auth.uid) {
      throw new HttpsError(
        'permission-denied',
        'User ID mismatch'
      );
    }

    if (!amount || Number(amount) <= 0) {
      throw new HttpsError(
        'invalid-argument',
        'Valid amount is required'
      );
    }

    console.log('Verifying Paystack payment:', { reference, userId, amount });

    // Verify transaction with Paystack API
    const { secretKey: paystackSecretKey } = getPaystackConfig();
    if (!paystackSecretKey) {
      console.error('Paystack secret key not configured');
      throw new HttpsError(
        'failed-precondition',
        'Payment service not configured'
      );
    }

    // Verify transaction with Paystack
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
    console.log('Paystack transaction verified:', {
      reference: transaction?.reference,
      status: transaction?.status,
      amount: transaction?.amount,
      currency: transaction?.currency,
    });

    if (!transaction) {
      throw new HttpsError('not-found', 'Transaction could not be verified');
    }

    // Verify transaction status
    if (transaction.status !== 'success') {
      throw new HttpsError(
        'failed-precondition',
        `Payment not successful. Status: ${transaction.status}`
      );
    }

    // Verify amount matches
    const paidAmount = Number(transaction.amount) / 100;
    if (Math.abs(paidAmount - Number(amount)) > 0.01) {
      throw new HttpsError(
        'failed-precondition',
        `Amount mismatch. Expected: ${amount}, Paid: ${paidAmount}`
      );
    }

    // Check if transaction was already processed
    const existingTx = await db.collection('wallet_transactions')
      .where('paymentIntentId', '==', transaction.reference)
      .where('status', '==', 'completed')
      .limit(1)
      .get();

    if (!existingTx.empty) {
      console.log('Transaction already processed:', transaction.reference);
      return {
        success: true,
        message: 'Transaction already processed',
        transactionId: existingTx.docs[0].id
      };
    }

    // Get or create wallet
    const walletQuery = await db.collection('wallets')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    let walletRef;
    let currentBalance = 0;

    if (walletQuery.empty) {
      // Create new wallet
      walletRef = db.collection('wallets').doc();
      await walletRef.set({
        userId: userId,
        balance: 0,
        currency: transaction.currency || 'NGN',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('Created new wallet for user:', userId);
    } else {
      walletRef = walletQuery.docs[0].ref;
      currentBalance = walletQuery.docs[0].data().balance || 0;
    }

    const newBalance = currentBalance + paidAmount;

    // Update wallet and create transaction record
    const batch = db.batch();

    batch.update(walletRef, {
      balance: newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const transactionRef = db.collection('wallet_transactions').doc();
    batch.set(transactionRef, {
      walletId: walletRef.id,
      userId: userId,
      type: 'credit',
      amount: paidAmount,
      description: 'Wallet top-up via Paystack',
      paymentIntentId: transaction.reference,
      paystackReference: transaction.reference,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      status: 'completed',
      currency: transaction.currency || 'NGN',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();

    console.log('Wallet topped up successfully:', {
      userId,
      amount: paidAmount,
      newBalance,
      transactionId: transactionRef.id,
      reference: transaction.reference,
    });

    return {
      success: true,
      transactionId: transactionRef.id,
      newBalance: newBalance,
      amount: paidAmount
    };
  } catch (error) {
    console.error('Error topping up wallet with Paystack:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error.message);
  }
});

// Create vendor subscription record after Paystack payment
exports.createPaystackSubscriptionRecord = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to create subscription records');
  }

  try {
    const { reference, plan: requestedPlan } = data || {};

    if (!reference) {
      throw new HttpsError('invalid-argument', 'Paystack reference is required');
    }

    const { secretKey: paystackSecretKey } = getPaystackConfig();
    if (!paystackSecretKey) {
      throw new HttpsError('failed-precondition', 'Payment service not configured');
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
      throw new HttpsError('not-found', 'Transaction could not be verified');
    }

    if (transaction.status !== 'success') {
      throw new HttpsError('failed-precondition', `Payment not successful. Status: ${transaction.status}`);
    }

    const metadata = parsePaystackMetadata(transaction.metadata || transaction.meta);
    const plan = normalizePlanKey(requestedPlan || metadata.subscription_plan || metadata.plan);

    if (!plan) {
      throw new HttpsError('invalid-argument', 'Subscription plan could not be determined');
    }

    const userId = metadata.userId || metadata.user_id || data?.userId || auth.uid;
    if (!userId) {
      throw new HttpsError('invalid-argument', 'User ID missing from payment metadata');
    }

    if (userId !== auth.uid) {
      throw new HttpsError('permission-denied', 'Authenticated user does not match subscription owner');
    }

    const result = await applyVendorSubscription({
      userId,
      plan,
      paystackReference: transaction.reference,
      transactionId: String(transaction.id),
      amountPaid: Number(transaction.amount || 0) / 100,
      metadata,
    });

    return {
      success: true,
      plan: result.plan,
      subscriptionId: result.subscriptionId,
      startDate: result.startDate,
      endDate: result.endDate,
    };
  } catch (error) {
    console.error('Error creating Paystack subscription record:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error.message);
  }
});

// Paystack webhook handler
exports.paystackWebhook = onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { secretKey: paystackSecretKey, webhookSecret } = getPaystackConfig();
    const signingSecret = webhookSecret || paystackSecretKey;

    if (!signingSecret) {
      console.error('Paystack webhook secret not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    // Verify webhook signature
    const signature = req.headers['x-paystack-signature'];
    const computedSignature = crypto
      .createHmac('sha512', signingSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (!signature || signature !== computedSignature) {
      console.error('Invalid Paystack webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    console.log('Paystack webhook received:', {
      event: event.event,
      reference: event.data?.reference,
    });

    // Handle different event types
    switch (event.event) {
      case 'charge.success':
        await handleSuccessfulPayment(event.data);
        break;

      case 'charge.failed':
        await handleFailedPayment(event.data);
        break;

      default:
        console.log('Unhandled Paystack webhook event:', event.event);
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ status: 'success', message: 'Webhook processed' });
  } catch (error) {
    console.error('Error processing Paystack webhook:', error);
    // Still return 200 to prevent excessive retries
    return res.status(200).json({
      status: 'error',
      message: error.message,
    });
  }
});

// Handle successful payment webhook
async function handleSuccessfulPayment(data) {
  try {
    const transaction = data || {};
    const transactionId = transaction.id ? String(transaction.id) : undefined;
    const reference = transaction.reference || transaction.tx_ref || transaction?.data?.reference || transactionId;
    const amountKobo = Number(transaction.amount || transaction.amount_kobo || transaction.amount_in_kobo || 0);
    const amount = amountKobo / 100;
    const status = transaction.status;
    const metadata = parsePaystackMetadata(transaction.metadata || transaction.meta);
    const purpose = metadata.purpose || metadata.payment_type || '';
    const userId = metadata.userId || metadata.user_id || metadata.customer_id || '';
    const orderId = metadata.orderId || metadata.order_id || '';

    console.log('Processing successful payment:', {
      transactionId,
      reference,
      amount,
      status,
      purpose,
      userId,
    });

    // Check if transaction was already processed
    const existingTx = await db
      .collection('wallet_transactions')
      .where('paystackReference', '==', reference)
      .limit(1)
      .get();

    if (!existingTx.empty) {
      console.log('Transaction already processed:', reference);
      return;
    }

    if (!reference) {
      console.warn('Successful payment missing reference, skipping.');
      return;
    }

    if (purpose === 'wallet_topup' && userId) {
      // Handle wallet top-up
      const walletQuery = await db.collection('wallets')
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (walletQuery.empty) {
        console.error('Wallet not found for user:', userId);
        return;
      }

      const walletRef = walletQuery.docs[0].ref;
      const currentBalance = walletQuery.docs[0].data().balance || 0;
      const newBalance = currentBalance + amount;

      const batch = db.batch();

      batch.update(walletRef, {
        balance: newBalance,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const transactionRef = db.collection('wallet_transactions').doc();
      batch.set(transactionRef, {
        walletId: walletRef.id,
        userId: userId,
        type: 'credit',
        amount: amount,
        description: 'Wallet top-up via Paystack (webhook)',
        paymentIntentId: reference,
        paystackReference: reference,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        status: 'completed',
        currency: transaction.currency || 'NGN',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      await batch.commit();

      // Create notification
      await db.collection('notifications').add({
        userId: userId,
        type: 'payment_success',
        title: 'Wallet Topped Up',
        message: `Your wallet has been credited with ₦${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log('Wallet topped up via webhook:', { userId, amount, newBalance });
    } else if ((purpose === 'subscription' || metadata.subscription_plan) && userId) {
      const plan = metadata.subscription_plan || metadata.plan;
      if (!plan) {
        console.warn('Subscription payment missing plan metadata, skipping.');
        return;
      }

      try {
        const result = await applyVendorSubscription({
          userId,
          plan,
          paystackReference: reference,
          transactionId,
          amountPaid: amount,
          metadata,
        });

        await db.collection('notifications').add({
          userId,
          type: 'subscription',
          title: 'Subscription Activated',
          message: `Your ${result.plan.toUpperCase()} vendor plan is now active.`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log('Vendor subscription applied via Paystack webhook:', {
          userId,
          plan: result.plan,
          subscriptionId: result.subscriptionId,
        });
      } catch (subError) {
        console.error('Error applying subscription from webhook:', subError);
      }
    } else if (orderId) {
      // Handle order payment
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        console.error('Order not found:', orderId);
        return;
      }

      const order = orderDoc.data();
      
      // Update order status
      await orderRef.update({
        paymentStatus: 'paid',
        paymentMethod: 'paystack',
        paymentTransactionId: reference,
        paymentCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Create notification for buyer
      if (order.buyerId) {
        await db.collection('notifications').add({
          userId: order.buyerId,
          type: 'payment_success',
          title: 'Payment Successful',
          message: `Your payment of ₦${amount.toLocaleString()} for order ${orderId} was successful`,
          orderId: orderId,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      console.log('Order payment processed via webhook:', { orderId, transactionId });
    } else {
      console.log('Payment successful but no action taken (unknown purpose):', {
        transactionId,
        meta
      });
    }
  } catch (error) {
    console.error('Error handling successful payment:', error);
    throw error;
  }
}

// Handle failed payment webhook
async function handleFailedPayment(data) {
  try {
    const transaction = data || {};
    const transactionId = transaction.id ? String(transaction.id) : undefined;
    const reference = transaction.reference || transaction.tx_ref || transactionId;
    const metadata = parsePaystackMetadata(transaction.metadata || transaction.meta);
    const userId = metadata.userId || metadata.user_id || '';
    const orderId = metadata.orderId || metadata.order_id || '';
    const amount = Number(transaction.amount || transaction.amount_kobo || 0) / 100;

    console.log('Processing failed payment:', {
      transactionId,
      reference,
      userId,
      orderId
    });

    // Create notification for user
    if (userId) {
      await db.collection('notifications').add({
        userId: userId,
        type: 'payment_failed',
        title: 'Payment Failed',
        message: `Your payment of ₦${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} was not successful. Please try again.`,
        orderId: orderId || null,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Update order if exists
    if (orderId) {
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();
      
      if (orderDoc.exists) {
        await orderRef.update({
          paymentStatus: 'failed',
          paymentTransactionId: String(transactionId),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    console.log('Failed payment processed:', { transactionId, userId, orderId });
  } catch (error) {
    console.error('Error handling failed payment:', error);
    throw error;
  }
}
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Flutterwave integration (verification and refunds)
const https = require("https");
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || ""; // Set in Firebase env config
const FLW_WEBHOOK_SECRET = process.env.FLW_WEBHOOK_SECRET || ""; // Optional: webhook signing secret

// Verify Flutterwave payment
exports.verifyFlutterwavePayment = functions.https.onCall(async (data, context) => {
  try {
    const { transactionId, orderId, buyerId } = data || {};
    if (!FLW_SECRET_KEY) throw new Error("FLW_SECRET_KEY not configured");
    if (!transactionId) throw new Error("transactionId is required");

    const options = {
      method: "GET",
      hostname: "api.flutterwave.com",
      path: `/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const result = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on("error", reject);
      req.end();
    });

    if (result?.status !== "success") {
      throw new Error("Verification failed");
    }

    // Optional order update
    if (orderId) {
      await db.collection("orders").doc(orderId).update({
        status: "wallet_funded",
        paymentProvider: "flutterwave",
        transactionId,
        buyerId: buyerId || null,
        updatedAt: new Date(),
      });
    }

    return { success: true, data: result?.data || null };
  } catch (error) {
    console.error("Error verifying Flutterwave payment:", error);
    throw new Error(`Failed to verify payment: ${error.message}`);
  }
});

// Top up wallet after Flutterwave payment verification
exports.topupWalletFlutterwave = functions.https.onCall(async (data, context) => {
  try {
    const { transactionId, userId, amount } = data || {};
    if (!FLW_SECRET_KEY) throw new Error("FLW_SECRET_KEY not configured");
    if (!transactionId || !userId || !amount) throw new Error("Missing parameters");

    // Verify transaction with Flutterwave
    const options = {
      method: "GET",
      hostname: "api.flutterwave.com",
      path: `/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const result = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on("error", reject);
      req.end();
    });

    if (result?.status !== "success") {
      throw new Error("Verification failed");
    }

    // Find user's wallet (first wallet document where userId == provided)
    const walletsSnap = await db
      .collection("wallets")
      .where("userId", "==", userId)
      .limit(1)
      .get();
    if (walletsSnap.empty) throw new Error("Wallet not found");
    const walletRef = walletsSnap.docs[0].ref;
    const walletData = walletsSnap.docs[0].data();

    const currentBalance = walletData.balance || 0;
    const newBalance = currentBalance + Number(amount);

    const batch = db.batch();
    batch.update(walletRef, {
      balance: newBalance,
      updatedAt: new Date(),
    });

    const txRef = db.collection("wallet_transactions").doc();
    batch.set(txRef, {
      walletId: walletRef.id,
      userId,
      type: "credit",
      amount: Number(amount),
      description: "Wallet top-up (Flutterwave)",
      paymentProvider: "flutterwave",
      transactionId,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      status: "completed",
      createdAt: new Date(),
    });

    await batch.commit();

    // Create a wallet notification doc for toast display (optional UI cue)
    try {
      await db.collection('notifications').add({
        userId,
        title: 'Wallet Top-up Successful',
        body: `₦${Number(amount).toLocaleString()} added to your wallet`,
        type: 'wallet_update',
        channel: 'wallet',
        isRead: false,
        createdAt: new Date(),
        data: { amount: Number(amount), transactionId, walletId: walletRef.id }
      });
    } catch (e) {
      console.warn('Failed to create wallet notification', e);
    }
    return { success: true, newBalance, transactionId: txRef.id };
  } catch (error) {
    console.error("topupWalletFlutterwave error:", error);
    throw new Error(`Failed to top up wallet: ${error.message}`);
  }
});

// Flutterwave Webhook Handler
exports.flutterwaveWebhook = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    // Optional: validate signature if provided by Flutterwave
    // Flutterwave sends "verif-hash" header for verification
    if (FLW_WEBHOOK_SECRET) {
      const signature = req.headers['verif-hash'];
      if (!signature || signature !== FLW_WEBHOOK_SECRET) {
        console.warn('Invalid Flutterwave webhook signature');
        return res.status(401).send('Unauthorized');
      }
    }

    const event = req.body;
    if (!event || !event.data) {
      return res.status(400).send('Invalid payload');
    }

    const { status, id: transactionId, amount, currency, tx_ref } = event.data;
    if (status !== 'successful') {
      return res.status(200).send('Ignored non-successful event');
    }

    // Expect tx_ref format like WALLET-<uid>-<timestamp>
    const ref = String(tx_ref || '');
    if (!ref.startsWith('WALLET-')) {
      return res.status(200).send('Non-wallet ref, ignoring');
    }
    const parts = ref.split('-');
    const userId = parts[1];
    if (!userId) {
      return res.status(200).send('No userId found in ref');
    }

    // Idempotency: check if a wallet transaction with this provider+transactionId already exists
    const existing = await db
      .collection('wallet_transactions')
      .where('paymentProvider', '==', 'flutterwave')
      .where('transactionId', '==', String(transactionId))
      .limit(1)
      .get();
    if (!existing.empty) {
      return res.status(200).send('Already processed');
    }

    // Find wallet
    const walletsSnap = await db
      .collection('wallets')
      .where('userId', '==', userId)
      .limit(1)
      .get();
    if (walletsSnap.empty) {
      console.error('Wallet not found for webhook user', userId);
      return res.status(200).send('Wallet not found');
    }
    const walletRef = walletsSnap.docs[0].ref;
    const walletData = walletsSnap.docs[0].data();
    const currentBalance = walletData.balance || 0;
    const newBalance = currentBalance + Number(amount || 0);

    const batch = db.batch();
    batch.update(walletRef, { balance: newBalance, updatedAt: new Date() });
    const txRef = db.collection('wallet_transactions').doc();
    batch.set(txRef, {
      walletId: walletRef.id,
      userId,
      type: 'credit',
      amount: Number(amount || 0),
      currency: currency || 'NGN',
      description: 'Wallet top-up (Flutterwave webhook)',
      paymentProvider: 'flutterwave',
      transactionId: String(transactionId),
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      status: 'completed',
      createdAt: new Date(),
    });
    await batch.commit();

    return res.status(200).send('Processed');
  } catch (error) {
    console.error('flutterwaveWebhook error:', error);
    return res.status(200).send('OK');
  }
});

// Handle payment success webhook
exports.handlePaymentSuccess = functions.https.onCall(async (data, context) => {
  try {
    const {paymentIntentId, orderId, buyerId} = data;

    if (!paymentIntentId || !orderId || !buyerId) {
      throw new Error("Missing required parameters");
    }

    // Update order status
    await db.collection("orders").doc(orderId).update({
      status: "wallet_funded",
      paymentIntentId: paymentIntentId,
      updatedAt: new Date(),
    });

    console.log("Payment success processed", {
      paymentIntentId,
      orderId,
      buyerId,
    });

    return {success: true};
  } catch (error) {
    console.error("Error handling payment success:", error);
    throw new Error(`Failed to process payment success: ${error.message}`);
  }
});

// Get Flutterwave transaction status (by transactionId)
exports.getPaymentStatus = functions.https.onCall(async (data, context) => {
  try {
    const { transactionId } = data || {};
    if (!FLW_SECRET_KEY) throw new Error("FLW_SECRET_KEY not configured");
    if (!transactionId) throw new Error("transactionId is required");

    const options = {
      method: "GET",
      hostname: "api.flutterwave.com",
      path: `/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    };
    const result = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
        });
      });
      req.on("error", reject);
      req.end();
    });
    if (result?.status !== "success") throw new Error("Failed to fetch status");
    return { status: result?.data?.status || "unknown", data: result?.data };
  } catch (error) {
    console.error("Error getting payment status:", error);
    throw new Error(`Failed to get payment status: ${error.message}`);
  }
});

// Process Flutterwave refund (requires original transaction reference/id)
exports.processRefund = functions.https.onCall(async (data, context) => {
  try {
    const { transactionId, amount, currency } = data || {};
    if (!FLW_SECRET_KEY) throw new Error("FLW_SECRET_KEY not configured");
    if (!transactionId) throw new Error("transactionId is required");

    const payload = JSON.stringify({
      id: transactionId,
      amount: amount || undefined,
      currency: currency || undefined,
    });
    const options = {
      method: "POST",
      hostname: "api.flutterwave.com",
      path: "/v3/transactions/refund",
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };
    const result = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
        });
      });
      req.on("error", reject);
      req.write(payload);
      req.end();
    });
    if (result?.status !== "success") throw new Error("Refund failed");
    return { success: true, data: result?.data };
  } catch (error) {
    console.error("Error processing refund:", error);
    throw new Error(`Failed to process refund: ${error.message}`);
  }
});

// Get refund status (Flutterwave does not provide a specific endpoint; re-verify txn)
exports.getRefundStatus = functions.https.onCall(async (data, context) => {
  try {
    const { transactionId } = data || {};
    if (!transactionId) throw new Error("transactionId is required");
    // Reuse getPaymentStatus logic
    const res = await exports.getPaymentStatus(data, context);
    return res;
  } catch (error) {
    console.error("Error getting refund status:", error);
    throw new Error(`Failed to get refund status: ${error.message}`);
  }
});

// Lightweight health check to validate function loading
exports.health = functions.https.onRequest((req, res) => {
  res.status(200).json({ ok: true, ts: Date.now() });
});

// ===============
// Admin Functions (Minimal Implementations)
// ===============

// Helper: verify admin role
async function ensureAdmin(context, adminIdFromData) {
  const callerUid = context?.auth?.uid || adminIdFromData;
  if (!callerUid) {
    throw new Error("Admin authentication required");
  }
  const adminDoc = await db.collection("users").doc(callerUid).get();
  if (!adminDoc.exists || adminDoc.data().role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return callerUid;
}

// Verify vendor application
exports.verifyVendor = functions.https.onCall(async (data, context) => {
  const { userId, verified, adminId } = data || {};
  try {
    const callerId = await ensureAdmin(context, adminId);
    if (!userId || typeof verified === "undefined") {
      throw new Error("Missing parameters");
    }
    await db.collection("users").doc(userId).update({
      "vendorProfile.verificationStatus": verified ? "verified" : "rejected",
      updatedAt: new Date(),
    });
    console.log("Vendor verification updated", { userId, verified, adminId: callerId });
    return { success: true };
  } catch (error) {
    console.error("verifyVendor error:", error);
    throw new Error(`Failed to verify vendor: ${error.message}`);
  }
});

// Approve or reject product
exports.approveProduct = functions.https.onCall(async (data, context) => {
  const { productId, approved, reason = "", adminId } = data || {};
  try {
    const callerId = await ensureAdmin(context, adminId);
    if (!productId || typeof approved === "undefined") {
      throw new Error("Missing parameters");
    }
    const productRef = db.collection("products").doc(productId);
    const productSnap = await productRef.get();
    if (!productSnap.exists) {
      throw new Error("Product not found");
    }
    const product = productSnap.data();

    const updatePayload = {
      status: approved ? "active" : "rejected",
      approvedBy: callerId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    };
    if (!approved) {
      updatePayload.rejectionReason = reason || null;
    }
    await productRef.update(updatePayload);

    // Notify vendor
    try {
      const vendorId = product.vendorId;
      if (vendorId) {
        const title = approved ? "Product Approved" : "Product Rejected";
        const body = approved
          ? `Your product "${product.name || 'Untitled'}" has been approved.`
          : `Your product "${product.name || 'Untitled'}" was rejected. Reason: ${reason || 'No reason provided.'}`;
        await db.collection('notifications').add({
          userId: vendorId,
          title,
          body,
          type: approved ? 'vendor_approval' : 'vendor_approval',
          channel: 'system',
          isRead: false,
          createdAt: new Date(),
          data: { productId, approved, reason: reason || null }
        });
      }
    } catch (e) {
      console.warn('Failed to notify vendor about approval result', e);
    }

    console.log("Product approval updated", { productId, approved, adminId: callerId });
    return { success: true };
  } catch (error) {
    console.error("approveProduct error:", error);
    throw new Error(`Failed to approve product: ${error.message}`);
  }
});

// Suspend/unsuspend user
exports.toggleUserSuspension = functions.https.onCall(async (data, context) => {
  const { userId, suspended, reason = "", adminId } = data || {};
  try {
    const callerId = await ensureAdmin(context, adminId);
    if (!userId || typeof suspended === "undefined") {
      throw new Error("Missing parameters");
    }
    await db.collection("users").doc(userId).update({
      suspended: !!suspended,
      suspensionReason: reason || null,
      suspendedBy: callerId,
      suspendedAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("User suspension toggled", { userId, suspended, callerId, reason });
    return { success: true };
  } catch (error) {
    console.error("toggleUserSuspension error:", error);
    throw new Error(`Failed to toggle user suspension: ${error.message}`);
  }
});

// Platform analytics (basic counts)
exports.getPlatformAnalytics = functions.https.onCall(async (data, context) => {
  try {
    await ensureAdmin(context, data?.adminId);
    const [usersSnap, ordersSnap, disputesSnap, vendorsSnap] = await Promise.all([
      db.collection("users").get(),
      db.collection("orders").get(),
      db.collection("disputes").get(),
      db.collection("users").where("isVendor", "==", true).get(),
    ]);

    const users = usersSnap.docs.map((d) => d.data());
    const orders = ordersSnap.docs.map((d) => d.data());
    const disputes = disputesSnap.docs.map((d) => d.data());
    const vendors = vendorsSnap.docs.map((d) => d.data());

    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const activeOrders = orders.filter((o) => ["pending_wallet_funding", "wallet_funded", "shipped"].includes(o.status)).length;
    const completedOrders = orders.filter((o) => o.status === "completed").length;
    const pendingDisputes = disputes.filter((d) => d.status === "open").length;
    const pendingVendors = vendors.filter((v) => v.vendorProfile && v.vendorProfile.verificationStatus === "pending").length;

    return {
      totalUsers: users.length,
      totalVendors: vendors.length,
      totalOrders: orders.length,
      totalRevenue,
      activeOrders,
      completedOrders,
      pendingDisputes,
      pendingVendors,
      totalDisputes: disputes.length,
    };
  } catch (error) {
    console.error("getPlatformAnalytics error:", error);
    throw new Error(`Failed to fetch platform analytics: ${error.message}`);
  }
});

// Email senders - minimal no-op implementations to avoid breaking callers
exports.sendEmailNotification = functions.https.onCall(async (data, context) => {
  try {
    const { to, subject } = data || {};
    console.log("sendEmailNotification called", { to, subject });
    return { success: true };
  } catch (error) {
    console.error("sendEmailNotification error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
});

exports.sendPaymentConfirmation = functions.https.onCall(async (data, context) => {
  try {
    const { buyerEmail, orderId, amount } = data || {};
    console.log("sendPaymentConfirmation called", { buyerEmail, orderId, amount });
    return { success: true };
  } catch (error) {
    console.error("sendPaymentConfirmation error:", error);
    throw new Error(`Failed to send payment confirmation: ${error.message}`);
  }
});

exports.sendOrderStatusUpdate = functions.https.onCall(async (data, context) => {
  try {
    const { buyerEmail, orderId, status } = data || {};
    console.log("sendOrderStatusUpdate called", { buyerEmail, orderId, status });
    return { success: true };
  } catch (error) {
    console.error("sendOrderStatusUpdate error:", error);
    throw new Error(`Failed to send order status update: ${error.message}`);
  }
});

// Automatic delivery confirmation reminders
exports.sendDeliveryReminders = functions.pubsub.schedule('0 9 * * *').timeZone('Africa/Nairobi').onRun(async (context) => {
  try {
    console.log('Running delivery confirmation reminders...');
    
    // Get orders that were delivered 24-48 hours ago but not confirmed
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(23, 59, 59, 999);
    
    const ordersQuery = admin.firestore()
      .collection('orders')
      .where('status', '==', 'delivered')
      .where('deliveredAt', '>=', twoDaysAgo)
      .where('deliveredAt', '<=', yesterday)
      .where('satisfactionConfirmed', '==', false);
    
    const ordersSnapshot = await ordersQuery.get();
    
    if (ordersSnapshot.empty) {
      console.log('No orders need delivery confirmation reminders');
      return null;
    }
    
    console.log(`Found ${ordersSnapshot.size} orders needing confirmation reminders`);
    
    // Send reminders for each order
    const reminderPromises = ordersSnapshot.docs.map(async (orderDoc) => {
      const order = orderDoc.data();
      const orderId = orderDoc.id;
      
      try {
        // Send notification to buyer
        await admin.firestore().collection('notifications').add({
          userId: order.buyerId,
          type: 'delivery_confirmation_reminder',
          title: 'Please confirm your delivery',
          message: `Your order #${orderId.slice(-8)} was delivered. Please confirm receipt and satisfaction to release payment to the vendor.`,
          data: {
            orderId,
            action: 'confirm_delivery',
            deepLink: `/tracking?order=${orderId}`
          },
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Send email reminder if buyer has email
        if (order.buyerEmail) {
          try {
            const { getFunctions, httpsCallable } = require('firebase/functions');
            const sendEmail = httpsCallable(functions, 'sendOrderStatusUpdate');
            await sendEmail({
              buyerEmail: order.buyerEmail,
              orderId,
              status: 'delivery_confirmation_reminder',
              subject: 'Please confirm your delivery - Ojawa',
              message: `Your order #${orderId.slice(-8)} was delivered. Please confirm receipt and satisfaction.`
            });
          } catch (emailError) {
            console.warn('Failed to send email reminder:', emailError);
          }
        }
        
        console.log(`Sent reminder for order ${orderId}`);
      } catch (error) {
        console.error(`Failed to send reminder for order ${orderId}:`, error);
      }
    });
    
    await Promise.all(reminderPromises);
    console.log('Delivery confirmation reminders completed');
    return null;
  } catch (error) {
    console.error('Error in delivery confirmation reminders:', error);
    return null;
  }
});

// Escalation for unconfirmed deliveries (7 days)
exports.escalateUnconfirmedDeliveries = functions.pubsub.schedule('0 10 * * *').timeZone('Africa/Nairobi').onRun(async (context) => {
  try {
    console.log('Running unconfirmed delivery escalation...');
    
    // Get orders delivered 7+ days ago but not confirmed
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    const ordersQuery = admin.firestore()
      .collection('orders')
      .where('status', '==', 'delivered')
      .where('deliveredAt', '<=', sevenDaysAgo)
      .where('satisfactionConfirmed', '==', false);
    
    const ordersSnapshot = await ordersQuery.get();
    
    if (ordersSnapshot.empty) {
      console.log('No orders need escalation');
      return null;
    }
    
    console.log(`Found ${ordersSnapshot.size} orders needing escalation`);
    
    // Auto-confirm deliveries after 7 days (assume satisfied)
    const escalationPromises = ordersSnapshot.docs.map(async (orderDoc) => {
      const order = orderDoc.data();
      const orderId = orderDoc.id;
      
      try {
        // Auto-confirm satisfaction and release escrow
        await admin.firestore().collection('orders').doc(orderId).update({
          satisfactionConfirmed: true,
          satisfactionRating: 5, // Default 5-star rating
          satisfactionFeedback: 'Auto-confirmed after 7 days',
          confirmedBy: 'system',
          confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'completed'
        });
        
        // Release escrow to vendor
        const { releaseWallet } = require('./wallet');
        await releaseWallet(orderId, order.buyerId, order.vendorId, order.totalAmount);
        
        // Notify both parties
        await admin.firestore().collection('notifications').add({
          userId: order.buyerId,
          type: 'order_auto_confirmed',
          title: 'Order auto-confirmed',
          message: `Your order #${orderId.slice(-8)} was automatically confirmed after 7 days. Payment has been released to the vendor.`,
          data: { orderId },
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        await admin.firestore().collection('notifications').add({
          userId: order.vendorId,
          type: 'payment_released',
          title: 'Payment released',
          message: `Payment for order #${orderId.slice(-8)} has been released to your wallet.`,
          data: { orderId, amount: order.totalAmount },
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Auto-confirmed order ${orderId}`);
      } catch (error) {
        console.error(`Failed to escalate order ${orderId}:`, error);
      }
    });
    
    await Promise.all(escalationPromises);
    console.log('Unconfirmed delivery escalation completed');
    return null;
  } catch (error) {
    console.error('Error in unconfirmed delivery escalation:', error);
    return null;
  }
});

// Notify vendor of new order
exports.notifyVendorNewOrder = functions.https.onCall(async (data, context) => {
  try {
    const { vendorId, orderId, buyerName, totalAmount, items } = data || {};
    
    if (!vendorId || !orderId || !buyerName || !totalAmount) {
      throw new Error("Missing required parameters");
    }

    // Get vendor information
    const vendorDoc = await db.collection('users').doc(vendorId).get();
    if (!vendorDoc.exists) {
      throw new Error("Vendor not found");
    }

    const vendorData = vendorDoc.data();
    const vendorEmail = vendorData.email;
    const vendorName = vendorData.displayName || vendorData.vendorProfile?.storeName || 'Vendor';

    // Create notification in vendor's notifications collection
    await db.collection('notifications').add({
      userId: vendorId,
      type: 'new_order',
      title: 'New Order Received',
      message: `You have received a new order from ${buyerName} for ₦${totalAmount.toLocaleString()}`,
      orderId: orderId,
      buyerName: buyerName,
      totalAmount: totalAmount,
      items: items,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send email notification to vendor
    console.log("Vendor New Order Email:", {
      to: vendorEmail,
      subject: `New Order Received - Order ${orderId}`,
      body: `Hello ${vendorName},\n\nYou have received a new order from ${buyerName}.\n\nOrder Details:\n- Order ID: ${orderId}\n- Total Amount: ₦${totalAmount.toLocaleString()}\n- Items: ${items?.length || 0} item(s)\n\nPlease log in to your vendor dashboard to view full details and process the order.\n\nBest regards,\nOjawa Team`
    });

    return { success: true, message: "Vendor notification sent" };
  } catch (error) {
    console.error("Error notifying vendor:", error);
    throw new Error(`Failed to notify vendor: ${error.message}`);
  }
});


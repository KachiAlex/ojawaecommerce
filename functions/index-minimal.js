const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Basic notification function
exports.notifyVendorNewOrder = functions.https.onCall(async (data, context) => {
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
exports.sendPaymentConfirmation = functions.https.onCall(async (data, context) => {
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
exports.sendOrderStatusUpdate = functions.https.onCall(async (data, context) => {
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

// Release escrow funds to vendor
exports.releaseEscrowFunds = functions.https.onCall(async (data, context) => {
  try {
    console.log("Data received:", data);
    console.log("Data type:", typeof data);
    console.log("Data keys:", data ? Object.keys(data) : "data is null/undefined");
    
    const { orderId, vendorId, amount } = data || {};
    
    console.log("Extracted - orderId:", orderId, "vendorId:", vendorId, "amount:", amount);
    
    if (!orderId || !vendorId || !amount) {
      console.error("Missing parameters - orderId:", !!orderId, "vendorId:", !!vendorId, "amount:", !!amount);
      throw new Error("Missing required parameters");
    }

    // Get order details
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      throw new Error("Order not found");
    }
    
    const order = orderDoc.data();
    const buyerId = order.buyerId;
    
    if (!buyerId) {
      throw new Error("Buyer ID not found in order");
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
exports.releaseEscrowFundsHttp = functions.https.onRequest(async (req, res) => {
  const allowOrigin = 'https://ojawa-ecommerce.web.app';
  res.set('Access-Control-Allow-Origin', allowOrigin);
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
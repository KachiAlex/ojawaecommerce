const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

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
    const { orderId, vendorId, amount } = data || {};
    
    if (!orderId || !vendorId || !amount) {
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

// ===== NEW NOTIFICATION FUNCTIONS =====

// Send push notification when notification document is created
exports.sendPushNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    try {
      const notification = snap.data();
      const userId = notification.userId;
      const notificationId = context.params.notificationId;
      
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
      await snap.ref.update({
        pushSent: true,
        pushSentAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return response;
    } catch (error) {
      console.error('Error sending push notification:', error);
      
      // If token is invalid, remove it from user document
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        const notification = snap.data();
        await db.collection('users').doc(notification.userId).update({
          fcmToken: null
        });
        console.log(`Removed invalid FCM token for user ${notification.userId}`);
      }
      
      return null;
    }
  });

// Trigger email notification when notification document is created
exports.sendEmailNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    try {
      const notification = snap.data();
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
        notificationId: context.params.notificationId,
        userId: userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Email queued for user ${userId}, mail document:`, mailRef.id);
      
      // Update notification with email sent status
      await snap.ref.update({
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
exports.sendBulkPushNotifications = functions.https.onCall(async (data, context) => {
  try {
    // Verify authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { userIds, notification } = data;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'userIds must be a non-empty array');
    }
    
    if (!notification || !notification.title || !notification.message) {
      throw new functions.https.HttpsError('invalid-argument', 'notification must include title and message');
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
    throw new functions.https.HttpsError('internal', error.message);
  }
});
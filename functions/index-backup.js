/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest, onCall} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const stripe = require("stripe")(
    process.env.STRIPE_SECRET_KEY || "sk_test_your_stripe_secret_key_here",
);
const nodemailer = require("nodemailer");

// Email configuration
const transporter = nodemailer.createTransport({
  service: "gmail", // You can use other services like SendGrid, Mailgun, etc.
  auth: {
    user: process.env.EMAIL_USER || "your-email@gmail.com",
    pass: process.env.EMAIL_PASS || "your-app-password",
  },
});

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

// Create payment intent for Stripe
exports.createPaymentIntent = onCall(async (request) => {
  try {
    const {amount, currency = "usd"} = request.data;

    if (!amount || amount <= 0) {
      throw new Error("Invalid amount");
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    logger.info("Payment intent created", {
      paymentIntentId: paymentIntent.id,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    logger.error("Error creating payment intent:", error);
    throw new Error(`Payment intent creation failed: ${error.message}`);
  }
});

// Handle successful payments (webhook)
exports.handlePaymentSuccess = onRequest(async (req, res) => {
  try {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET ||
      "whsec_your_webhook_secret_here";

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      logger.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      logger.info("Payment succeeded:", {
        paymentIntentId: paymentIntent.id,
      });

      // Here you can update your database, send confirmation emails, etc.
      // For now, we'll just log the success

      res.json({received: true});
    } else {
      logger.info(`Unhandled event type: ${event.type}`);
      res.json({received: true});
    }
  } catch (error) {
    logger.error("Webhook handler error:", error);
    res.status(500).json({error: error.message});
  }
});

// Get payment status
exports.getPaymentStatus = onCall(async (request) => {
  try {
    const {paymentIntentId} = request.data;

    if (!paymentIntentId) {
      throw new Error("Payment intent ID is required");
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  } catch (error) {
    logger.error("Error retrieving payment status:", error);
    throw new Error(`Failed to retrieve payment status: ${error.message}`);
  }
});

// Process refund for disputes/cancellations
exports.processRefund = onCall(async (request) => {
  try {
    const {paymentIntentId, amount, reason = "requested_by_customer"} = request.data;

    if (!paymentIntentId) {
      throw new Error("Payment intent ID is required");
    }

    // Get the payment intent to verify it exists and get the amount
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      throw new Error("Payment intent must be succeeded to process refund");
    }

    // Calculate refund amount (if not specified, refund full amount)
    const refundAmount = amount ? Math.round(amount * 100) : paymentIntent.amount;

    if (refundAmount > paymentIntent.amount) {
      throw new Error("Refund amount cannot exceed original payment amount");
    }

    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundAmount,
      reason: reason,
      metadata: {
        refund_type: "dispute_resolution",
        original_amount: paymentIntent.amount,
      },
    });

    logger.info("Refund processed successfully", {
      refundId: refund.id,
      paymentIntentId: paymentIntentId,
      amount: refundAmount,
    });

    return {
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount,
      currency: refund.currency,
    };
  } catch (error) {
    logger.error("Error processing refund:", error);
    throw new Error(`Failed to process refund: ${error.message}`);
  }
});

// Get refund status
exports.getRefundStatus = onCall(async (request) => {
  try {
    const {refundId} = request.data;

    if (!refundId) {
      throw new Error("Refund ID is required");
    }

    const refund = await stripe.refunds.retrieve(refundId);

    return {
      id: refund.id,
      status: refund.status,
      amount: refund.amount,
      currency: refund.currency,
      reason: refund.reason,
    };
  } catch (error) {
    logger.error("Error retrieving refund status:", error);
    throw new Error(`Failed to retrieve refund status: ${error.message}`);
  }
});

// Send email notification
exports.sendEmailNotification = onCall(async (request) => {
  try {
    const {to, subject, html, text} = request.data;

    if (!to || !subject || (!html && !text)) {
      throw new Error("Missing required email parameters");
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || "your-email@gmail.com",
      to: to,
      subject: subject,
      html: html,
      text: text,
    };

    const result = await transporter.sendMail(mailOptions);

    logger.info("Email sent successfully", {
      messageId: result.messageId,
      to: to,
      subject: subject,
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    logger.error("Error sending email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
});

// Send payment confirmation email
exports.sendPaymentConfirmation = onCall(async (request) => {
  try {
    const {buyerEmail, buyerName, orderId, amount, items} = request.data;

    const subject = `Payment Confirmation - Order #${orderId}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Payment Confirmed!</h2>
        <p>Dear ${buyerName},</p>
        <p>Your payment has been successfully processed for order <strong>#${orderId}</strong>.</p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Order Details:</h3>
          <p><strong>Amount:</strong> $${(amount / 100).toFixed(2)}</p>
          <p><strong>Items:</strong> ${items.length} item(s)</p>
          <p><strong>Status:</strong> Payment received, order processing</p>
        </div>
        
        <p>Your order is now being processed by the vendor. You will receive updates on the shipping status.</p>
        
        <p>Thank you for choosing Ojawa!</p>
        <p>Best regards,<br>The Ojawa Team</p>
      </div>
    `;

    return await exports.sendEmailNotification({
      to: buyerEmail,
      subject: subject,
      html: html,
    });
  } catch (error) {
    logger.error("Error sending payment confirmation:", error);
    throw new Error(`Failed to send payment confirmation: ${error.message}`);
  }
});

// Send order status update email
exports.sendOrderStatusUpdate = onCall(async (request) => {
  try {
    const {buyerEmail, buyerName, orderId, status, trackingNumber, carrier} = request.data;

    const statusMessages = {
      "shipped": "Your order has been shipped!",
      "delivered": "Your order has been delivered!",
      "completed": "Your order has been completed!",
      "refunded": "Your order has been refunded.",
    };

    const subject = `Order Update - Order #${orderId}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">${statusMessages[status] || "Order Status Update"}</h2>
        <p>Dear ${buyerName},</p>
        <p>Your order <strong>#${orderId}</strong> status has been updated to: <strong>${status}</strong></p>
        
        ${trackingNumber ? `
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Tracking Information:</h3>
          <p><strong>Carrier:</strong> ${carrier || "N/A"}</p>
          <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
        </div>
        ` : ""}
        
        <p>Thank you for your business!</p>
        <p>Best regards,<br>The Ojawa Team</p>
      </div>
    `;

    return await exports.sendEmailNotification({
      to: buyerEmail,
      subject: subject,
      html: html,
    });
  } catch (error) {
    logger.error("Error sending order status update:", error);
    throw new Error(`Failed to send order status update: ${error.message}`);
  }
});

// Admin Functions
const admin = require("firebase-admin");

// Verify vendor application
exports.verifyVendor = onCall(async (request) => {
  try {
    const {userId, verified, adminId} = request.data;

    if (!adminId) {
      throw new Error("Admin authentication required");
    }

    // Verify admin role
    const adminDoc = await admin.firestore().collection("users").doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data().role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    await admin.firestore().collection("users").doc(userId).update({
      "vendorProfile.verificationStatus": verified ? "verified" : "rejected",
      "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("Vendor verification updated", {
      userId,
      verified,
      adminId,
    });

    return {success: true};
  } catch (error) {
    logger.error("Error verifying vendor:", error);
    throw new Error(`Failed to verify vendor: ${error.message}`);
  }
});

// Suspend/unsuspend user
exports.toggleUserSuspension = onCall(async (request) => {
  try {
    const {userId, suspended, adminId, reason} = request.data;

    if (!adminId) {
      throw new Error("Admin authentication required");
    }

    // Verify admin role
    const adminDoc = await admin.firestore().collection("users").doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data().role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    await admin.firestore().collection("users").doc(userId).update({
      suspended,
      suspensionReason: reason || null,
      suspendedBy: adminId,
      suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("User suspension toggled", {
      userId,
      suspended,
      adminId,
      reason,
    });

    return {success: true};
  } catch (error) {
    logger.error("Error toggling user suspension:", error);
    throw new Error(`Failed to toggle user suspension: ${error.message}`);
  }
});

// Get platform analytics
exports.getPlatformAnalytics = onCall(async (request) => {
  try {
    const {adminId} = request.data;

    if (!adminId) {
      throw new Error("Admin authentication required");
    }

    // Verify admin role
    const adminDoc = await admin.firestore().collection("users").doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data().role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const [usersSnapshot, ordersSnapshot, disputesSnapshot, vendorsSnapshot] = await Promise.all([
      admin.firestore().collection("users").get(),
      admin.firestore().collection("orders").get(),
      admin.firestore().collection("disputes").get(),
      admin.firestore().collection("users").where("isVendor", "==", true).get(),
    ]);

    const users = usersSnapshot.docs.map((d) => d.data());
    const orders = ordersSnapshot.docs.map((d) => d.data());
    const disputes = disputesSnapshot.docs.map((d) => d.data());
    const vendors = vendorsSnapshot.docs.map((d) => d.data());

    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const activeOrders = orders.filter((order) =>
      ["pending_wallet_funding", "wallet_funded", "shipped"].includes(order.status),
    ).length;
    const completedOrders = orders.filter((order) => order.status === "completed").length;
    const pendingDisputes = disputes.filter((dispute) => dispute.status === "open").length;
    const pendingVendors = vendors.filter((vendor) =>
      vendor.vendorProfile && vendor.vendorProfile.verificationStatus === "pending",
    ).length;

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
    logger.error("Error fetching platform analytics:", error);
    throw new Error(`Failed to fetch platform analytics: ${error.message}`);
  }
});

// Send admin notification
exports.sendAdminNotification = onCall(async (request) => {
  try {
    const {to, subject, message, adminId} = request.data;

    if (!adminId) {
      throw new Error("Admin authentication required");
    }

    // Verify admin role
    const adminDoc = await admin.firestore().collection("users").doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data().role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Admin Notification</h2>
        <p>${message}</p>
        <p>This is an automated notification from the Ojawa platform.</p>
        <p>Best regards,<br>The Ojawa Admin Team</p>
      </div>
    `;

    return await exports.sendEmailNotification({
      to: to,
      subject: subject,
      html: html,
    });
  } catch (error) {
    logger.error("Error sending admin notification:", error);
    throw new Error(`Failed to send admin notification: ${error.message}`);
  }
});

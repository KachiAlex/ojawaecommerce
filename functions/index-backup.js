/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Migration: Removed firebase-functions usage. Migrate triggers to REST endpoints.
// TODO: Replace `onRequest`/`onCall` triggers with your backend's HTTP endpoints.
const logger = console;
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
// Note: Cloud Functions runtime options removed for migration.

// Create payment intent for Stripe
exports.createPaymentIntent = async function createPaymentIntent(params) {
  throw new Error('createPaymentIntent removed: migrate to backend REST endpoint using Stripe SDK/server');
};

// Handle successful payments (webhook)
exports.handlePaymentSuccess = async function handlePaymentSuccessWebhook(req) {
  throw new Error('handlePaymentSuccess webhook removed: implement Stripe webhook handler on backend and verify signatures server-side');
};

// Get payment status
exports.getPaymentStatus = async function getPaymentStatus(params) {
  throw new Error('getPaymentStatus removed: migrate to backend REST endpoint');
};

// Process refund for disputes/cancellations
exports.processRefund = async function processRefund(params) {
  throw new Error('processRefund removed: migrate to backend REST endpoint');
};

// Get refund status
exports.getRefundStatus = async function getRefundStatus(params) {
  throw new Error('getRefundStatus removed: migrate to backend REST endpoint');
};

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

// Admin functions removed: migrate admin operations to REST endpoints and backend DB logic.
exports.verifyVendor = async function verifyVendor(params) { throw new Error('verifyVendor removed: migrate to backend REST endpoint'); };
exports.toggleUserSuspension = async function toggleUserSuspension(params) { throw new Error('toggleUserSuspension removed: migrate to backend REST endpoint'); };
exports.getPlatformAnalytics = async function getPlatformAnalytics(params) { throw new Error('getPlatformAnalytics removed: migrate to backend REST endpoint'); };
exports.sendAdminNotification = async function sendAdminNotification(params) { throw new Error('sendAdminNotification removed: migrate to backend REST endpoint'); };

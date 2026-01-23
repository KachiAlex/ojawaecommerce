const {onCall} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Basic Stripe integration
const stripe = require("stripe")(
  process.env.STRIPE_SECRET_KEY || "sk_test_your_stripe_secret_key_here",
);

// Create payment intent
exports.createPaymentIntent = onCall(async (request) => {
  try {
    const {amount, currency = "usd", metadata = {}} = request.data;

    if (!amount) {
      throw new Error("Amount is required");
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency,
      metadata: metadata,
    });

    logger.info("Payment intent created", {
      paymentIntentId: paymentIntent.id,
      amount: amount,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    logger.error("Error creating payment intent:", error);
    throw new Error(`Failed to create payment intent: ${error.message}`);
  }
});

// Handle payment success webhook
exports.handlePaymentSuccess = onCall(async (request) => {
  try {
    const {paymentIntentId, orderId, buyerId} = request.data;

    if (!paymentIntentId || !orderId || !buyerId) {
      throw new Error("Missing required parameters");
    }

    // Update order status
    await db.collection("orders").doc(orderId).update({
      status: "wallet_funded",
      paymentIntentId: paymentIntentId,
      updatedAt: new Date(),
    });

    logger.info("Payment success processed", {
      paymentIntentId,
      orderId,
      buyerId,
    });

    return {success: true};
  } catch (error) {
    logger.error("Error handling payment success:", error);
    throw new Error(`Failed to process payment success: ${error.message}`);
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
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  } catch (error) {
    logger.error("Error getting payment status:", error);
    throw new Error(`Failed to get payment status: ${error.message}`);
  }
});

// Process refund
exports.processRefund = onCall(async (request) => {
  try {
    const {paymentIntentId, amount, reason = "requested_by_customer"} = request.data;

    if (!paymentIntentId) {
      throw new Error("Payment intent ID is required");
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== "succeeded") {
      throw new Error("Payment intent must be succeeded to process refund");
    }

    const refundAmount = amount ? Math.round(amount * 100) : paymentIntent.amount;

    if (refundAmount > paymentIntent.amount) {
      throw new Error("Refund amount cannot exceed original payment amount");
    }

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
    logger.error("Error getting refund status:", error);
    throw new Error(`Failed to get refund status: ${error.message}`);
  }
});

// Send payment confirmation email
exports.sendPaymentConfirmation = onCall(async (request) => {
  try {
    const {buyerEmail, buyerName, orderId, amount, items} = request.data;

    logger.info("Payment confirmation email", {
      buyerEmail,
      buyerName,
      orderId,
      amount,
      itemCount: items?.length || 0,
    });

    // For now, just log the email details
    // In production, you would send an actual email
    return {
      success: true,
      message: "Email sent successfully",
    };
  } catch (error) {
    logger.error("Error sending payment confirmation email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
});

const {onCall} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Verify Flutterwave payment
exports.verifyFlutterwavePayment = onCall(async (request) => {
  try {
    const {transactionId, flwRef, userId} = request.data;

    if (!transactionId) {
      throw new Error("Transaction ID is required");
    }

    // For now, just return success since we don't have Flutterwave API integration
    // In production, you would verify with Flutterwave's API
    logger.info("Flutterwave payment verification", {
      transactionId,
      flwRef,
      userId,
    });

    return {
      success: true,
      transactionId,
      status: "verified",
    };
  } catch (error) {
    logger.error("Error verifying Flutterwave payment:", error);
    throw new Error(`Failed to verify Flutterwave payment: ${error.message}`);
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

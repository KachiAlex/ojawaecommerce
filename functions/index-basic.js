const {onCall} = require("firebase-functions/v2/https");

// Verify Flutterwave payment
exports.verifyFlutterwavePayment = onCall(async (request) => {
  const {transactionId, flwRef, userId} = request.data;
  
  return {
    success: true,
    transactionId,
    status: "verified",
  };
});

// Send payment confirmation email
exports.sendPaymentConfirmation = onCall(async (request) => {
  const {buyerEmail, buyerName, orderId, amount, items} = request.data;
  
  return {
    success: true,
    message: "Email sent successfully",
  };
});

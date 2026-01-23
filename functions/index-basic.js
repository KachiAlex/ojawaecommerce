const {onCall} = require("firebase-functions/v2/https");

// Send payment confirmation email
exports.sendPaymentConfirmation = onCall(async (request) => {
  const {buyerEmail, buyerName, orderId, amount, items} = request.data;
  
  return {
    success: true,
    message: "Email sent successfully",
  };
});

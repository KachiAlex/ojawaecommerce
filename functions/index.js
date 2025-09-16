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

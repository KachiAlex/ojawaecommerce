// Migration: removed firebase-functions and firebase-admin usage.
// TODO: Migrate these Callable functions to REST endpoints or backend jobs.

// Note: Stripe integration left as-is for migration convenience.
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key_here');

// Audit: This file previously used Firebase Admin and callable functions. All such usages removed.

function migrationError(name) {
  return function () {
    throw new Error(`${name} removed: migrate to backend REST endpoint or job (see functions/index-simple.js TODO)`);
  };
}

exports.createPaymentIntent = migrationError('createPaymentIntent');
exports.handlePaymentSuccess = migrationError('handlePaymentSuccess');
exports.getPaymentStatus = migrationError('getPaymentStatus');
exports.processRefund = migrationError('processRefund');
exports.getRefundStatus = migrationError('getRefundStatus');
exports.sendPaymentConfirmation = migrationError('sendPaymentConfirmation');

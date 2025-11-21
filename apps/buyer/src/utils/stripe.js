import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

// Flutterwave utilities
// Note: The actual payment collection is done client-side using Flutterwave inline or hosted payment page.
// These helpers call our Cloud Functions to verify transactions and issue refunds.

export const verifyFlutterwavePayment = async (transactionId, orderId, buyerId) => {
  try {
    const fn = httpsCallable(functions, 'verifyFlutterwavePayment');
    const res = await fn({ transactionId, orderId, buyerId });
    return res.data;
  } catch (error) {
    console.error('Error verifying Flutterwave payment:', error);
    throw new Error('Failed to verify Flutterwave payment');
  }
};

export const getPaymentStatus = async (transactionId) => {
  try {
    const fn = httpsCallable(functions, 'getPaymentStatus');
    const res = await fn({ transactionId });
    return res.data;
  } catch (error) {
    console.error('Error getting payment status:', error);
    throw new Error('Failed to get payment status');
  }
};

export const processRefund = async (transactionId, amount, currency = 'NGN') => {
  try {
    const fn = httpsCallable(functions, 'processRefund');
    const res = await fn({ transactionId, amount, currency });
    return res.data;
  } catch (error) {
    console.error('Error processing refund:', error);
    throw new Error('Failed to process refund');
  }
};

export const getRefundStatus = async (transactionId) => {
  try {
    const fn = httpsCallable(functions, 'getRefundStatus');
    const res = await fn({ transactionId });
    return res.data;
  } catch (error) {
    console.error('Error retrieving refund status:', error);
    throw new Error('Failed to retrieve refund status');
  }
};
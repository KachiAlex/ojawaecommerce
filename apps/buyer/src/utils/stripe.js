import { loadStripe } from '@stripe/stripe-js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

// Replace with your actual Stripe publishable key
const stripePromise = loadStripe('pk_test_51234567890abcdefghijklmnopqrstuvwxyz'); // Replace with your actual key

export const getStripe = () => {
  return stripePromise;
};

export const createPaymentIntent = async (amount, currency = 'usd') => {
  try {
    const createPaymentIntentFunction = httpsCallable(functions, 'createPaymentIntent');
    
    const result = await createPaymentIntentFunction({
      amount,
      currency
    });

    return result.data.clientSecret;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new Error('Failed to create payment intent');
  }
};

export const processPayment = async (stripe, elements, clientSecret) => {
  try {
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
    });

    if (error) {
      throw error;
    }

    return paymentIntent;
  } catch (error) {
    console.error('Payment failed:', error);
    throw error;
  }
};

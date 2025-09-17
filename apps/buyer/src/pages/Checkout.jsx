import { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { createPaymentIntent, processPayment } from '../utils/stripe';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import LogisticsSelector from '../components/LogisticsSelector';

const stripePromise = loadStripe('pk_test_51234567890abcdefghijklmnopqrstuvwxyz'); // Replace with your actual key

const CheckoutForm = ({ total, cartItems, onSuccess, orderDetails }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create payment intent
      const clientSecret = await createPaymentIntent(total);
      
      // Confirm payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: currentUser?.displayName || 'Customer',
            email: currentUser?.email || '',
          },
        },
      });

      if (stripeError) {
        setError(stripeError.message);
      } else if (paymentIntent.status === 'succeeded') {
        // Create order in Firestore
        await createOrder(paymentIntent.id);
        onSuccess(paymentIntent);
      }
    } catch (err) {
      setError('Payment failed. Please try again.');
      console.error('Payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (paymentIntentId) => {
    try {
      const orderData = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        items: cartItems,
        total,
        paymentIntentId,
        status: 'completed',
        createdAt: new Date(),
        shippingAddress: {
          name: currentUser.displayName || '',
          email: currentUser.email || '',
          // Add more address fields as needed
        }
      };

      await addDoc(collection(db, 'orders'), orderData);
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Details
          </label>
          <div className="p-3 border border-gray-300 rounded-md">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </div>
        </div>

        {error && (
          <div className="text-red-600 text-sm mb-4">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Processing Payment...' : `Pay $${total.toFixed(2)}`}
        </button>
      </div>
    </form>
  );
};

const Checkout = () => {
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedLogistics, setSelectedLogistics] = useState(null);
  const [deliveryOption, setDeliveryOption] = useState('pickup'); // 'pickup' or 'delivery'
  const [buyerAddress, setBuyerAddress] = useState('');
  const subtotal = getCartTotal();
  const deliveryFee = selectedLogistics ? parseFloat(selectedLogistics.price.replace(/[^\d.]/g, '')) : 0;
  const baseTotal = subtotal + deliveryFee;
  const ojawaCommission = baseTotal * 0.05; // 5% commission
  const grandTotal = baseTotal + ojawaCommission;

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (cartItems.length === 0) {
      navigate('/cart');
      return;
    }
  }, [currentUser, cartItems, navigate]);

  const handlePaymentSuccess = (paymentIntent) => {
    setShowSuccess(true);
    clearCart();
    
    // Redirect to success page after 3 seconds
    setTimeout(() => {
      navigate('/dashboard');
    }, 3000);
  };

  if (showSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your order. You will receive a confirmation email shortly.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to dashboard in a few seconds...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center space-x-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    <p className="text-sm font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {deliveryOption === 'delivery' && selectedLogistics && (
                <div className="flex justify-between">
                  <span>Delivery ({selectedLogistics.company}):</span>
                  <span>{selectedLogistics.price}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600">
                <span>Ojawa Service Fee (5%):</span>
                <span>${ojawaCommission.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t pt-2">
                <span>Total:</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                * Includes escrow protection and dispute resolution
              </div>
            </div>
          </div>

          {/* Delivery Options */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Delivery Options</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input 
                  type="radio" 
                  id="pickup" 
                  name="delivery" 
                  value="pickup"
                  checked={deliveryOption === 'pickup'}
                  onChange={(e) => setDeliveryOption(e.target.value)}
                  className="text-emerald-600"
                />
                <label htmlFor="pickup" className="flex items-center gap-2">
                  <span>🏪</span>
                  <div>
                    <p className="font-medium">Pickup from Vendor</p>
                    <p className="text-sm text-gray-600">Collect directly from vendor location (Free)</p>
                  </div>
                </label>
              </div>
              
              <div className="flex items-center gap-3">
                <input 
                  type="radio" 
                  id="delivery" 
                  name="delivery" 
                  value="delivery"
                  checked={deliveryOption === 'delivery'}
                  onChange={(e) => setDeliveryOption(e.target.value)}
                  className="text-emerald-600"
                />
                <label htmlFor="delivery" className="flex items-center gap-2">
                  <span>🚚</span>
                  <div>
                    <p className="font-medium">Home Delivery</p>
                    <p className="text-sm text-gray-600">Get it delivered to your doorstep</p>
                  </div>
                </label>
              </div>
            </div>

            {deliveryOption === 'delivery' && (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
                  <textarea 
                    rows="3"
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Enter your full delivery address..."
                  />
                </div>
                
                <LogisticsSelector 
                  vendorLocation="Lagos, Nigeria"
                  buyerLocation={buyerAddress || "Your delivery address"}
                  onSelect={setSelectedLogistics}
                />
              </div>
            )}
          </div>
        </div>

        {/* Payment Form */}
        <div>
          <Elements stripe={stripePromise}>
            <CheckoutForm 
              total={grandTotal} 
              cartItems={cartItems}
              onSuccess={handlePaymentSuccess}
              orderDetails={{
                subtotal,
                deliveryFee,
                ojawaCommission,
                selectedLogistics,
                deliveryOption,
                buyerAddress
              }}
            />
          </Elements>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

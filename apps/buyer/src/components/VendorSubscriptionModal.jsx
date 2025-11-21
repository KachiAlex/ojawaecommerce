import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import flutterwaveSubscription from '../utils/flutterwaveSubscription';

const VendorSubscriptionModal = ({ isOpen, onClose, onUpgrade }) => {
  const { currentUser, userProfile } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const subscriptionPlans = {
    basic: {
      name: 'Basic',
      price: 0,
      commission: 5.0,
      features: [
        'Up to 50 products',
        'Basic analytics',
        'Email support',
        'Standard listing priority'
      ],
      limits: {
        products: 50,
        analytics: 'basic',
        support: 'email'
      }
    },
    pro: {
      name: 'Pro',
      price: 5000,
      commission: 3.0,
      features: [
        'Up to 500 products',
        'Advanced analytics',
        'Priority support',
        'Featured product listings',
        'Bulk operations'
      ],
      limits: {
        products: 500,
        analytics: 'advanced',
        support: 'priority'
      }
    },
    premium: {
      name: 'Premium',
      price: 15000,
      commission: 2.0,
      features: [
        'Unlimited products',
        'Premium analytics',
        'Dedicated support',
        'Top listing priority',
        'API access',
        'Custom branding'
      ],
      limits: {
        products: -1, // unlimited
        analytics: 'premium',
        support: 'dedicated'
      }
    }
  };

  const handleUpgrade = async () => {
    if (!currentUser) return;

    setLoading(true);
    setError('');

    try {
      const plan = subscriptionPlans[selectedPlan];
      
      // If free plan, create subscription directly
      if (plan.price === 0) {
        await createFreeSubscription(plan);
        onUpgrade(selectedPlan);
        onClose();
        return;
      }

      // For paid plans, process payment (this will open Flutterwave checkout modal)
      console.log('💳 Starting payment process for plan:', selectedPlan, 'Price:', plan.price);
      
      // Open Flutterwave payment modal immediately
      // The modal opens synchronously, and we don't block on the promise
      flutterwaveSubscription.processSubscriptionPayment({
        plan: selectedPlan,
        price: plan.price,
        userEmail: currentUser.email,
        userName: currentUser.displayName || userProfile?.businessName || 'Vendor',
        userId: currentUser.uid,
        planName: plan.name,
        commissionRate: plan.commission,
        productLimit: plan.limits.products,
        analyticsLevel: plan.limits.analytics,
        supportLevel: plan.limits.support
      })
      .then((paymentData) => {
        // With redirect_url, this callback may not fire, but handle it if it does
        console.log('💳 Payment completed (callback fired):', paymentData);
        // Don't close modal here - redirect will happen
      })
      .catch((paymentError) => {
        // Handle errors (modal closed, payment failed, etc.)
        // Only show error if modal actually closed (not redirect)
        if (paymentError.message?.includes('cancelled') || paymentError.message?.includes('close')) {
          console.log('💳 Payment cancelled by user');
          setError('Payment was cancelled. Please try again.');
          setLoading(false);
          // Keep modal open so user can try again
        } else {
          console.error('❌ Payment error:', paymentError);
          setError(`Payment failed: ${paymentError.message}`);
          setLoading(false);
        }
      });
      
      // Close subscription modal immediately - Flutterwave modal should now be open
      // Clear loading state since modal is opening
      console.log('💳 Flutterwave checkout modal opening...');
      setLoading(false);
      onClose();
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      setError(`Failed to upgrade subscription: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createFreeSubscription = async (plan) => {
    // Update user profile with subscription
    await firebaseService.users.update(currentUser.uid, {
      subscriptionPlan: selectedPlan,
      subscriptionStatus: 'active',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      commissionRate: plan.commission,
      productLimit: plan.limits.products,
      analyticsLevel: plan.limits.analytics,
      supportLevel: plan.limits.support
    });

    // Create subscription record
    await firebaseService.subscriptions.create({
      userId: currentUser.uid,
      plan: selectedPlan,
      price: plan.price,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      commissionRate: plan.commission,
      productLimit: plan.limits.products,
      analyticsLevel: plan.limits.analytics,
      supportLevel: plan.limits.support
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Choose Your Vendor Plan</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {Object.entries(subscriptionPlans).map(([key, plan]) => (
              <div
                key={key}
                className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all ${
                  selectedPlan === key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedPlan(key)}
              >
                {key === 'pro' && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">
                      ₦{plan.price.toLocaleString()}
                    </span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <div className="mb-4">
                    <span className="text-sm text-gray-600">Commission Rate: </span>
                    <span className="font-semibold text-green-600">{plan.commission}%</span>
                  </div>
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : `Upgrade to ${subscriptionPlans[selectedPlan].name}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorSubscriptionModal;

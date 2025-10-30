import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import VendorSubscriptionModal from './VendorSubscriptionModal';

const VendorBilling = () => {
  const { currentUser, userProfile } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [usage, setUsage] = useState({
    products: 0,
    orders: 0,
    revenue: 0
  });

  const subscriptionPlans = {
    basic: {
      name: 'Basic',
      price: 0,
      commission: 5.0,
      productLimit: 50,
      features: ['Up to 50 products', 'Basic analytics', 'Email support']
    },
    pro: {
      name: 'Pro',
      price: 5000,
      commission: 3.0,
      productLimit: 500,
      features: ['Up to 500 products', 'Advanced analytics', 'Priority support', 'Featured listings']
    },
    premium: {
      name: 'Premium',
      price: 15000,
      commission: 2.0,
      productLimit: -1, // unlimited
      features: ['Unlimited products', 'Premium analytics', 'Dedicated support', 'API access']
    }
  };

  useEffect(() => {
    loadSubscriptionData();
  }, [currentUser]);

  const loadSubscriptionData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      // Load subscription
      const sub = await firebaseService.subscriptions.getByUser(currentUser.uid);
      setSubscription(sub);

      // Load usage data
      const [productsResult, ordersResult] = await Promise.all([
        firebaseService.products.getByVendor(currentUser.uid),
        firebaseService.orders.getByVendor(currentUser.uid)
      ]);

      const totalRevenue = ordersResult
        .filter(order => order.status === 'completed' || order.status === 'delivered')
        .reduce((sum, order) => sum + (order.totalAmount || 0), 0);

      setUsage({
        products: productsResult.length,
        orders: ordersResult.length,
        revenue: totalRevenue
      });
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (newPlan) => {
    console.log('Upgrading to plan:', newPlan);
    setShowUpgradeModal(false);
    loadSubscriptionData();
  };

  const getCurrentPlan = () => {
    if (!subscription) {
      return subscriptionPlans.basic;
    }
    return subscriptionPlans[subscription.plan] || subscriptionPlans.basic;
  };

  const getUsagePercentage = (current, limit) => {
    if (limit === -1) return 0; // unlimited
    return Math.min((current / limit) * 100, 100);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-NG');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentPlan = getCurrentPlan();
  const isUnlimited = currentPlan.productLimit === -1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Billing & Subscription</h2>
          <p className="text-gray-600">Manage your subscription and billing information</p>
        </div>
        <button
          onClick={() => setShowUpgradeModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {subscription ? 'Change Plan' : 'Upgrade Plan'}
        </button>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
            <p className="text-2xl font-bold text-blue-600">{currentPlan.name}</p>
            <p className="text-gray-600">
              {currentPlan.price === 0 ? 'Free' : `${formatCurrency(currentPlan.price)}/month`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Commission Rate</p>
            <p className="text-xl font-semibold text-green-600">{currentPlan.commission}%</p>
          </div>
        </div>

        {/* Plan Features */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Plan Features:</h4>
          <ul className="space-y-1">
            {currentPlan.features.map((feature, index) => (
              <li key={index} className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Subscription Details */}
        {subscription && (
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Status</p>
                <p className={`font-medium ${
                  subscription.status === 'active' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Start Date</p>
                <p className="font-medium">{formatDate(subscription.startDate)}</p>
              </div>
              <div>
                <p className="text-gray-600">Next Billing</p>
                <p className="font-medium">{formatDate(subscription.endDate)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Usage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Products Usage */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">Products</h4>
            <span className="text-xs text-gray-500">
              {usage.products} / {isUnlimited ? '∞' : currentPlan.productLimit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full ${
                getUsagePercentage(usage.products, currentPlan.productLimit) > 80
                  ? 'bg-red-500'
                  : getUsagePercentage(usage.products, currentPlan.productLimit) > 60
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{
                width: `${isUnlimited ? 0 : getUsagePercentage(usage.products, currentPlan.productLimit)}%`
              }}
            ></div>
          </div>
          <p className="text-xs text-gray-600">
            {isUnlimited ? 'Unlimited products' : `${currentPlan.productLimit - usage.products} remaining`}
          </p>
        </div>

        {/* Orders */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Total Orders</h4>
          <p className="text-2xl font-bold text-gray-900">{usage.orders}</p>
          <p className="text-xs text-gray-600">All time</p>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Total Revenue</h4>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(usage.revenue)}</p>
          <p className="text-xs text-gray-600">Completed orders</p>
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing History</h3>
        {subscription ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">{currentPlan.name} Plan</p>
                <p className="text-sm text-gray-600">
                  {formatDate(subscription.startDate)} - {formatDate(subscription.endDate)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">
                  {currentPlan.price === 0 ? 'Free' : formatCurrency(currentPlan.price)}
                </p>
                <p className="text-sm text-green-600">Paid</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📄</div>
            <p className="text-gray-600">No billing history available</p>
            <p className="text-sm text-gray-500">Your subscription history will appear here</p>
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      <VendorSubscriptionModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
};

export default VendorBilling;

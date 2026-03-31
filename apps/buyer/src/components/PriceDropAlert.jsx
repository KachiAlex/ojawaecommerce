import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://ojawaecommerce.onrender.com';

const PriceDropAlert = ({ productId, currentPrice, onPriceDrop }) => {
  const { currentUser } = useAuth();
  const [isWatching, setIsWatching] = useState(false);
  const [alertPrice, setAlertPrice] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser && productId) {
      checkIfWatching();
    }
  }, [currentUser, productId]);

  const checkIfWatching = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/alerts/${currentUser.uid}/${productId}`);
      const alert = res?.data?.alert || null;
      if (alert) {
        setIsWatching(true);
        setAlertPrice(alert.alertPrice || null);
      }
    } catch (error) {
      console.error('Error checking price alert:', error);
    }
  };

  const handleSetAlert = async () => {
    if (!currentUser) {
      alert('Please sign in to set price alerts');
      return;
    }

    try {
      setLoading(true);
      const alertPrice = parseFloat(prompt('Enter the price to alert at:', currentPrice)) || currentPrice;
      
      if (alertPrice >= currentPrice) {
        alert('Alert price should be lower than current price');
        return;
      }

      await axios.post(`${API_BASE}/api/alerts`, {
        userId: currentUser.uid,
        productId,
        currentPrice,
        alertPrice,
        productName: 'Product'
      });

      setIsWatching(true);
      setAlertPrice(alertPrice);
    } catch (error) {
      console.error('Error setting price alert:', error);
      alert('Failed to set price alert');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAlert = async () => {
    try {
      setLoading(true);
      await axios.delete(`${API_BASE}/api/alerts/${currentUser.uid}/${productId}`);
      setIsWatching(false);
      setAlertPrice(null);
    } catch (error) {
      console.error('Error removing price alert:', error);
      alert('Failed to remove price alert');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <button
        onClick={() => alert('Please sign in to set price alerts')}
        className="text-sm text-gray-600 hover:text-emerald-600 flex items-center gap-1"
        title="Sign in to set price alerts"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        Price Alert
      </button>
    );
  }

  return (
    <button
      onClick={isWatching ? handleRemoveAlert : handleSetAlert}
      disabled={loading}
      className={`text-sm flex items-center gap-1 transition-colors ${
        isWatching
          ? 'text-emerald-600 hover:text-emerald-700'
          : 'text-gray-600 hover:text-emerald-600'
      } disabled:opacity-50`}
      title={isWatching ? `Alert set at ₦${alertPrice?.toLocaleString()}` : 'Set price drop alert'}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-gray-300 border-t-current rounded-full animate-spin"></div>
      ) : (
        <svg className="w-4 h-4" fill={isWatching ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )}
      {isWatching ? `Alert at ₦${alertPrice?.toLocaleString()}` : 'Price Alert'}
    </button>
  );
};

export default PriceDropAlert;


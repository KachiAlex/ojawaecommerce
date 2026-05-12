/**
 * useRealtimeAnalytics Hook
 * 
 * Manages real-time analytics updates with automatic cleanup.
 * Subscribes to Firestore listeners and provides live data to components.
 * 
 * Usage:
 *   const { vendorMetrics, buyerMetrics, healthMetrics, loading } = useRealtimeAnalytics({
 *     vendor: true,
 *     buyer: true,
 *     transaction: true,
 *     health: true,
 *     errors: true,
 *     api: true,
 *     activity: true
 *   });
 * 
 *   // Access live data
 *   console.log(vendorMetrics.livestream); // true when receiving live updates
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { realtimeAnalyticsService } from '../services/realtimeAnalyticsService';

export const useRealtimeAnalytics = (options = {}) => {
  const {
    vendor = false,
    buyer = false,
    transaction = false,
    health = false,
    errors = false,
    api = false,
    activity = false,
    autoCleanup = true
  } = options;

  const [vendorMetrics, setVendorMetrics] = useState(null);
  const [buyerMetrics, setBuyerMetrics] = useState(null);
  const [transactionMetrics, setTransactionMetrics] = useState(null);
  const [healthMetrics, setHealthMetrics] = useState(null);
  const [errorMetrics, setErrorMetrics] = useState(null);
  const [apiMetrics, setAPIMetrics] = useState(null);
  const [activityMetrics, setActivityMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listenerCount, setListenerCount] = useState(0);

  const unsubscribersRef = useRef([]);

  // Subscribe to vendor metrics
  const subscribeVendor = useCallback(() => {
    const unsub = realtimeAnalyticsService.subscribeToVendorMetrics((data) => {
      setVendorMetrics(data);
      setLoading(false);
    });
    unsubscribersRef.current.push(unsub);
  }, []);

  // Subscribe to buyer metrics
  const subscribeBuyer = useCallback(() => {
    const unsub = realtimeAnalyticsService.subscribeToBuyerMetrics((data) => {
      setBuyerMetrics(data);
      setLoading(false);
    });
    unsubscribersRef.current.push(unsub);
  }, []);

  // Subscribe to transaction metrics
  const subscribeTransaction = useCallback(() => {
    const unsub = realtimeAnalyticsService.subscribeToTransactionMetrics((data) => {
      setTransactionMetrics(data);
      setLoading(false);
    });
    unsubscribersRef.current.push(unsub);
  }, []);

  // Subscribe to health metrics
  const subscribeHealth = useCallback(() => {
    const unsub = realtimeAnalyticsService.subscribeToHealthMetrics((data) => {
      setHealthMetrics(data);
      setLoading(false);
    });
    unsubscribersRef.current.push(unsub);
  }, []);

  // Subscribe to error metrics
  const subscribeErrors = useCallback(() => {
    const unsub = realtimeAnalyticsService.subscribeToErrors((data) => {
      setErrorMetrics(data);
      setLoading(false);
    });
    unsubscribersRef.current.push(unsub);
  }, []);

  // Subscribe to API metrics
  const subscribeAPI = useCallback(() => {
    const unsub = realtimeAnalyticsService.subscribeToAPIPerformance((data) => {
      setAPIMetrics(data);
      setLoading(false);
    });
    unsubscribersRef.current.push(unsub);
  }, []);

  // Subscribe to activity metrics
  const subscribeActivity = useCallback(() => {
    const unsub = realtimeAnalyticsService.subscribeToUserActivity((data) => {
      setActivityMetrics(data);
      setLoading(false);
    });
    unsubscribersRef.current.push(unsub);
  }, []);

  // Setup listeners based on options
  useEffect(() => {
    if (vendor) subscribeVendor();
    if (buyer) subscribeBuyer();
    if (transaction) subscribeTransaction();
    if (health) subscribeHealth();
    if (errors) subscribeErrors();
    if (api) subscribeAPI();
    if (activity) subscribeActivity();

    // Update listener count
    setListenerCount(realtimeAnalyticsService.getListenerCount());

    // Cleanup function
    return () => {
      if (autoCleanup) {
        unsubscribersRef.current.forEach(unsub => {
          try {
            unsub();
          } catch (error) {
            console.error('Error unsubscribing:', error);
          }
        });
        unsubscribersRef.current = [];
      }
    };
  }, [
    vendor,
    buyer,
    transaction,
    health,
    errors,
    api,
    activity,
    autoCleanup,
    subscribeVendor,
    subscribeBuyer,
    subscribeTransaction,
    subscribeHealth,
    subscribeErrors,
    subscribeAPI,
    subscribeActivity
  ]);

  return {
    vendorMetrics,
    buyerMetrics,
    transactionMetrics,
    healthMetrics,
    errorMetrics,
    apiMetrics,
    activityMetrics,
    loading,
    listenerCount,
    getCachedData: realtimeAnalyticsService.getCachedData.bind(realtimeAnalyticsService),
    getAllCachedData: realtimeAnalyticsService.getAllCachedData.bind(realtimeAnalyticsService)
  };
};

/**
 * useRealtimeVendor Hook - Quick access to vendor metrics only
 */
export const useRealtimeVendor = () => {
  const { vendorMetrics, loading } = useRealtimeAnalytics({ vendor: true });
  return { vendorMetrics, loading };
};

/**
 * useRealtimeBuyer Hook - Quick access to buyer metrics only
 */
export const useRealtimeBuyer = () => {
  const { buyerMetrics, loading } = useRealtimeAnalytics({ buyer: true });
  return { buyerMetrics, loading };
};

/**
 * useRealtimeTransaction Hook - Quick access to transaction metrics only
 */
export const useRealtimeTransaction = () => {
  const { transactionMetrics, loading } = useRealtimeAnalytics({ transaction: true });
  return { transactionMetrics, loading };
};

/**
 * useRealtimeHealth Hook - Quick access to health metrics only
 */
export const useRealtimeHealth = () => {
  const { healthMetrics, loading } = useRealtimeAnalytics({ health: true });
  return { healthMetrics, loading };
};

/**
 * useRealtimeErrors Hook - Quick access to error metrics only
 */
export const useRealtimeErrors = () => {
  const { errorMetrics, loading } = useRealtimeAnalytics({ errors: true });
  return { errorMetrics, loading };
};

/**
 * useRealtimeAPI Hook - Quick access to API metrics only
 */
export const useRealtimeAPI = () => {
  const { apiMetrics, loading } = useRealtimeAnalytics({ api: true });
  return { apiMetrics, loading };
};

/**
 * useRealtimeActivity Hook - Quick access to activity metrics only
 */
export const useRealtimeActivity = () => {
  const { activityMetrics, loading } = useRealtimeAnalytics({ activity: true });
  return { activityMetrics, loading };
};

/**
 * useRealtimeAll Hook - Subscribe to all metrics at once
 */
export const useRealtimeAll = () => {
  const {
    vendorMetrics,
    buyerMetrics,
    transactionMetrics,
    healthMetrics,
    errorMetrics,
    apiMetrics,
    activityMetrics,
    loading,
    listenerCount,
    getCachedData,
    getAllCachedData
  } = useRealtimeAnalytics({
    vendor: true,
    buyer: true,
    transaction: true,
    health: true,
    errors: true,
    api: true,
    activity: true
  });

  return {
    vendorMetrics,
    buyerMetrics,
    transactionMetrics,
    healthMetrics,
    errorMetrics,
    apiMetrics,
    activityMetrics,
    loading,
    listenerCount,
    getCachedData,
    getAllCachedData
  };
};

export default useRealtimeAnalytics;

import { useState, useEffect, useCallback } from 'react';
import adminAnalyticsService from '../services/adminAnalyticsService';

/**
 * Hook to track page views
 */
export const usePageTracking = (pageName) => {
  useEffect(() => {
    adminAnalyticsService.logAction({
      actionType: 'page_view',
      actionName: pageName,
      metadata: {
        pageName,
        referrer: document.referrer
      }
    });
  }, [pageName]);
};

/**
 * Hook to track button clicks
 */
export const useClickTracking = (userId) => {
  const trackClick = useCallback((buttonName, metadata = {}) => {
    adminAnalyticsService.logAction({
      actionType: 'button_click',
      actionName: buttonName,
      userId,
      metadata: {
        buttonName,
        ...metadata
      }
    });
  }, [userId]);

  return trackClick;
};

/**
 * Hook to track form submissions
 */
export const useFormTracking = (userId) => {
  const trackFormSubmit = useCallback((formName, formData = {}) => {
    adminAnalyticsService.logEvent({
      eventType: 'form_submitted',
      category: 'form',
      userId,
      metadata: {
        formName,
        fieldCount: Object.keys(formData).length,
        ...formData
      }
    });
  }, [userId]);

  return trackFormSubmit;
};

/**
 * Hook to track search events
 */
export const useSearchTracking = (userId) => {
  const trackSearch = useCallback((query, resultsCount) => {
    adminAnalyticsService.logEvent({
      eventType: 'search_performed',
      category: 'search',
      userId,
      metadata: {
        query,
        resultsCount,
        timestamp: new Date().toISOString()
      }
    });
  }, [userId]);

  return trackSearch;
};

/**
 * Hook to track order events
 */
export const useOrderTracking = (userId) => {
  const trackOrderCreated = useCallback((orderId, orderData) => {
    adminAnalyticsService.logEvent({
      eventType: 'order_placed',
      category: 'order',
      userId,
      orderId,
      metadata: {
        orderId,
        totalAmount: orderData.totalAmount,
        itemCount: orderData.itemCount,
        vendor: orderData.vendorId
      }
    });
  }, [userId]);

  const trackOrderStatusChange = useCallback((orderId, oldStatus, newStatus) => {
    adminAnalyticsService.logEvent({
      eventType: 'order_status_changed',
      category: 'order',
      userId,
      orderId,
      metadata: {
        orderId,
        oldStatus,
        newStatus
      }
    });
  }, [userId]);

  const trackOrderCancelled = useCallback((orderId, reason) => {
    adminAnalyticsService.logEvent({
      eventType: 'order_cancelled',
      category: 'order',
      userId,
      orderId,
      metadata: {
        orderId,
        reason
      }
    });
  }, [userId]);

  return {
    trackOrderCreated,
    trackOrderStatusChange,
    trackOrderCancelled
  };
};

/**
 * Hook to track product events
 */
export const useProductTracking = (userId) => {
  const trackProductViewed = useCallback((productId, productName, vendorId) => {
    adminAnalyticsService.logEvent({
      eventType: 'product_viewed',
      category: 'product',
      userId,
      productId,
      vendorId,
      metadata: {
        productId,
        productName,
        vendorId
      }
    });
  }, [userId]);

  const trackProductAdded = useCallback((productId, quantity, price) => {
    adminAnalyticsService.logEvent({
      eventType: 'product_added_to_cart',
      category: 'product',
      userId,
      productId,
      metadata: {
        productId,
        quantity,
        price
      }
    });
  }, [userId]);

  const trackProductPurchased = useCallback((productId, quantity, price) => {
    adminAnalyticsService.logEvent({
      eventType: 'product_purchased',
      category: 'product',
      userId,
      productId,
      metadata: {
        productId,
        quantity,
        price
      }
    });
  }, [userId]);

  const trackProductReviewed = useCallback((productId, rating) => {
    adminAnalyticsService.logEvent({
      eventType: 'product_reviewed',
      category: 'product',
      userId,
      productId,
      metadata: {
        productId,
        rating
      }
    });
  }, [userId]);

  return {
    trackProductViewed,
    trackProductAdded,
    trackProductPurchased,
    trackProductReviewed
  };
};

/**
 * Hook to track payment events
 */
export const usePaymentTracking = (userId) => {
  const trackPaymentInitiated = useCallback((amount, method) => {
    adminAnalyticsService.logEvent({
      eventType: 'payment_initiated',
      category: 'payment',
      userId,
      metadata: {
        amount,
        method,
        timestamp: new Date().toISOString()
      }
    });
  }, [userId]);

  const trackPaymentCompleted = useCallback((amount, method, transactionId) => {
    adminAnalyticsService.logEvent({
      eventType: 'payment_completed',
      category: 'payment',
      userId,
      metadata: {
        amount,
        method,
        transactionId
      }
    });
  }, [userId]);

  const trackPaymentFailed = useCallback((amount, method, reason) => {
    adminAnalyticsService.logEvent({
      eventType: 'payment_failed',
      category: 'payment',
      userId,
      metadata: {
        amount,
        method,
        reason
      }
    });
  }, [userId]);

  return {
    trackPaymentInitiated,
    trackPaymentCompleted,
    trackPaymentFailed
  };
};

/**
 * Hook to track user events
 */
export const useUserTracking = () => {
  const trackUserRegistered = useCallback((userData) => {
    adminAnalyticsService.logEvent({
      eventType: 'user_registered',
      category: 'user',
      metadata: {
        userType: userData.userType,
        registrationMethod: userData.registrationMethod
      }
    });
  }, []);

  const trackUserLoggedIn = useCallback((userId, loginMethod) => {
    adminAnalyticsService.logEvent({
      eventType: 'user_logged_in',
      category: 'user',
      userId,
      metadata: {
        loginMethod
      }
    });
  }, []);

  const trackUserLoggedOut = useCallback((userId) => {
    adminAnalyticsService.logEvent({
      eventType: 'user_logged_out',
      category: 'user',
      userId
    });
  }, []);

  const trackProfileUpdated = useCallback((userId, updatedFields) => {
    adminAnalyticsService.logEvent({
      eventType: 'profile_updated',
      category: 'user',
      userId,
      metadata: {
        updatedFields
      }
    });
  }, []);

  return {
    trackUserRegistered,
    trackUserLoggedIn,
    trackUserLoggedOut,
    trackProfileUpdated
  };
};

/**
 * Hook to track errors
 */
export const useErrorTracking = (userId) => {
  const trackError = useCallback((error, context = {}) => {
    adminAnalyticsService.logError({
      errorType: error.name || 'Error',
      message: error.message,
      stack: error.stack,
      userId,
      metadata: context
    });
  }, [userId]);

  return trackError;
};

/**
 * Hook to track performance metrics
 */
export const usePerformanceTracking = (userId) => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePageLoad = () => {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0;
      const lcp = performance.getEntriesByType('largest-contentful-paint').pop()?.startTime || 0;
      const cls = performance.getEntriesByType('layout-shift')
        .reduce((sum, entry) => sum + entry.value, 0);

      adminAnalyticsService.logPerformanceMetrics({
        pageLoadTime,
        firstContentfulPaint: fcp,
        largestContentfulPaint: lcp,
        cumulativeLayoutShift: cls,
        userId,
        metadata: {
          url: window.location.href
        }
      });
    };

    if (document.readyState === 'complete') {
      handlePageLoad();
    } else {
      window.addEventListener('load', handlePageLoad);
      return () => window.removeEventListener('load', handlePageLoad);
    }
  }, [userId]);
};

/**
 * Hook to track session
 */
export const useSessionTracking = (userId, userRole) => {
  useEffect(() => {
    adminAnalyticsService.startSession(userId, userRole);

    return () => {
      adminAnalyticsService.endSession(userId);
    };
  }, [userId, userRole]);
};

/**
 * Hook to track conversion funnel
 */
export const useFunnelTracking = (userId, funnelType) => {
  const trackFunnelStage = useCallback((stage, metadata = {}) => {
    adminAnalyticsService.trackConversionFunnel(userId, funnelType, stage, metadata);
  }, [userId, funnelType]);

  return trackFunnelStage;
};

/**
 * Combined hook for comprehensive tracking
 */
export const useAnalytics = (userId, userRole) => {
  useSessionTracking(userId, userRole);
  usePerformanceTracking(userId);

  return {
    trackPage: usePageTracking,
    trackClick: useClickTracking(userId),
    trackForm: useFormTracking(userId),
    trackSearch: useSearchTracking(userId),
    trackOrder: useOrderTracking(userId),
    trackProduct: useProductTracking(userId),
    trackPayment: usePaymentTracking(userId),
    trackUser: useUserTracking(),
    trackError: useErrorTracking(userId),
    trackFunnel: useFunnelTracking
  };
};

export default useAnalytics;

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
 * Hook to track vendor events
 */
export const useVendorTracking = (userId) => {
  const trackVendorRegistered = useCallback((vendorData) => {
    adminAnalyticsService.logEvent({
      eventType: 'vendor_registered',
      category: 'vendor',
      userId,
      vendorId: userId,
      metadata: {
        businessName: vendorData.businessName,
        businessType: vendorData.businessType,
        city: vendorData.address?.city
      }
    });
  }, [userId]);

  const trackVendorApproved = useCallback(() => {
    adminAnalyticsService.logEvent({
      eventType: 'vendor_approved',
      category: 'vendor',
      userId,
      vendorId: userId,
      severity: 'info'
    });
  }, [userId]);

  const trackVendorSuspended = useCallback((reason) => {
    adminAnalyticsService.logEvent({
      eventType: 'vendor_suspended',
      category: 'vendor',
      userId,
      vendorId: userId,
      severity: 'warning',
      metadata: {
        reason
      }
    });
  }, [userId]);

  const trackVendorBanned = useCallback((reason) => {
    adminAnalyticsService.logEvent({
      eventType: 'vendor_banned',
      category: 'vendor',
      userId,
      vendorId: userId,
      severity: 'critical',
      metadata: {
        reason
      }
    });
  }, [userId]);

  const trackProductListed = useCallback((productData) => {
    adminAnalyticsService.logEvent({
      eventType: 'vendor_product_listed',
      category: 'vendor',
      userId,
      vendorId: userId,
      productId: productData.id,
      metadata: {
        productName: productData.name,
        category: productData.category,
        price: productData.price
      }
    });
  }, [userId]);

  const trackFirstProductListed = useCallback((productData) => {
    adminAnalyticsService.logEvent({
      eventType: 'vendor_first_product_listed',
      category: 'vendor',
      userId,
      vendorId: userId,
      productId: productData.id,
      severity: 'info',
      metadata: {
        productName: productData.name
      }
    });
  }, [userId]);

  const trackFirstSale = useCallback((orderData) => {
    adminAnalyticsService.logEvent({
      eventType: 'vendor_first_sale',
      category: 'vendor',
      userId,
      vendorId: userId,
      orderId: orderData.id,
      severity: 'info',
      metadata: {
        orderAmount: orderData.amount,
        buyerId: orderData.buyerId
      }
    });
  }, [userId]);

  const trackVendorProfileUpdated = useCallback((updatedFields) => {
    adminAnalyticsService.logEvent({
      eventType: 'vendor_profile_updated',
      category: 'vendor',
      userId,
      vendorId: userId,
      metadata: {
        updatedFields
      }
    });
  }, [userId]);

  const trackVendorStoreUpdated = useCallback((storeData) => {
    adminAnalyticsService.logEvent({
      eventType: 'vendor_store_updated',
      category: 'vendor',
      userId,
      vendorId: userId,
      metadata: {
        storeName: storeData.storeName,
        description: storeData.description ? storeData.description.substring(0, 50) : null
      }
    });
  }, [userId]);

  const trackVendorPayoutProcessed = useCallback((payoutData) => {
    adminAnalyticsService.logEvent({
      eventType: 'vendor_payout_processed',
      category: 'vendor',
      userId,
      vendorId: userId,
      severity: 'info',
      metadata: {
        amount: payoutData.amount,
        method: payoutData.method,
        period: payoutData.period
      }
    });
  }, [userId]);

  return {
    trackVendorRegistered,
    trackVendorApproved,
    trackVendorSuspended,
    trackVendorBanned,
    trackProductListed,
    trackFirstProductListed,
    trackFirstSale,
    trackVendorProfileUpdated,
    trackVendorStoreUpdated,
    trackVendorPayoutProcessed
  };
};

/**
 * Hook to track buyer events
 */
export const useBuyerTracking = (userId) => {
  const trackBrowsingSession = useCallback((sessionData) => {
    adminAnalyticsService.logEvent({
      eventType: 'buyer_browsing_session',
      category: 'buyer',
      userId,
      metadata: {
        duration: sessionData.duration,
        productsViewed: sessionData.productsViewed,
        categoriesBrowsed: sessionData.categoriesBrowsed
      }
    });
  }, [userId]);

  const trackProductSearched = useCallback((searchData) => {
    adminAnalyticsService.logEvent({
      eventType: 'product_searched',
      category: 'buyer',
      userId,
      metadata: {
        query: searchData.query,
        resultsCount: searchData.resultsCount,
        filters: searchData.filters
      }
    });
  }, [userId]);

  const trackWishlistAdded = useCallback((productData) => {
    adminAnalyticsService.logEvent({
      eventType: 'wishlist_added',
      category: 'buyer',
      userId,
      productId: productData.id,
      metadata: {
        productName: productData.name,
        price: productData.price,
        vendorId: productData.vendorId
      }
    });
  }, [userId]);

  const trackWishlistRemoved = useCallback((productId) => {
    adminAnalyticsService.logEvent({
      eventType: 'wishlist_removed',
      category: 'buyer',
      userId,
      productId,
      metadata: {
        productId
      }
    });
  }, [userId]);

  const trackCartAdded = useCallback((productData) => {
    adminAnalyticsService.logEvent({
      eventType: 'cart_added',
      category: 'buyer',
      userId,
      productId: productData.id,
      metadata: {
        productName: productData.name,
        quantity: productData.quantity,
        price: productData.price,
        totalValue: productData.quantity * productData.price
      }
    });
  }, [userId]);

  const trackCartRemoved = useCallback((productId, reason) => {
    adminAnalyticsService.logEvent({
      eventType: 'cart_removed',
      category: 'buyer',
      userId,
      productId,
      metadata: {
        productId,
        reason
      }
    });
  }, [userId]);

  const trackCheckoutStarted = useCallback((cartData) => {
    adminAnalyticsService.logEvent({
      eventType: 'checkout_started',
      category: 'buyer',
      userId,
      severity: 'info',
      metadata: {
        itemCount: cartData.itemCount,
        totalValue: cartData.totalValue,
        vendorCount: cartData.vendorCount
      }
    });
  }, [userId]);

  const trackCheckoutCompleted = useCallback((orderData) => {
    adminAnalyticsService.logEvent({
      eventType: 'checkout_completed',
      category: 'buyer',
      userId,
      orderId: orderData.id,
      severity: 'info',
      metadata: {
        orderId: orderData.id,
        totalAmount: orderData.totalAmount,
        itemCount: orderData.itemCount,
        paymentMethod: orderData.paymentMethod
      }
    });
  }, [userId]);

  const trackCheckoutAbandoned = useCallback((cartData, reason) => {
    adminAnalyticsService.logEvent({
      eventType: 'checkout_abandoned',
      category: 'buyer',
      userId,
      severity: 'warning',
      metadata: {
        itemCount: cartData.itemCount,
        cartValue: cartData.totalValue,
        reason,
        stage: cartData.stage
      }
    });
  }, [userId]);

  const trackProductReview = useCallback((reviewData) => {
    adminAnalyticsService.logEvent({
      eventType: 'product_reviewed',
      category: 'buyer',
      userId,
      productId: reviewData.productId,
      metadata: {
        productId: reviewData.productId,
        rating: reviewData.rating,
        reviewLength: reviewData.message ? reviewData.message.length : 0,
        vendorId: reviewData.vendorId
      }
    });
  }, [userId]);

  const trackFirstPurchase = useCallback((orderData) => {
    adminAnalyticsService.logEvent({
      eventType: 'buyer_first_purchase',
      category: 'buyer',
      userId,
      orderId: orderData.id,
      severity: 'info',
      metadata: {
        orderId: orderData.id,
        totalAmount: orderData.totalAmount,
        itemCount: orderData.itemCount,
        vendor: orderData.vendorId
      }
    });
  }, [userId]);

  const trackRepeatPurchase = useCallback((orderData) => {
    adminAnalyticsService.logEvent({
      eventType: 'buyer_repeat_purchase',
      category: 'buyer',
      userId,
      orderId: orderData.id,
      metadata: {
        orderId: orderData.id,
        totalAmount: orderData.totalAmount,
        itemCount: orderData.itemCount,
        previousPurchaseCount: orderData.previousPurchaseCount
      }
    });
  }, [userId]);

  const trackReturnInitiated = useCallback((returnData) => {
    adminAnalyticsService.logEvent({
      eventType: 'return_initiated',
      category: 'buyer',
      userId,
      orderId: returnData.orderId,
      severity: 'warning',
      metadata: {
        orderId: returnData.orderId,
        itemCount: returnData.itemCount,
        reason: returnData.reason,
        refundAmount: returnData.refundAmount
      }
    });
  }, [userId]);

  const trackRewardEarned = useCallback((rewardData) => {
    adminAnalyticsService.logEvent({
      eventType: 'reward_earned',
      category: 'buyer',
      userId,
      metadata: {
        rewardType: rewardData.type,
        points: rewardData.points,
        source: rewardData.source
      }
    });
  }, [userId]);

  return {
    trackBrowsingSession,
    trackProductSearched,
    trackWishlistAdded,
    trackWishlistRemoved,
    trackCartAdded,
    trackCartRemoved,
    trackCheckoutStarted,
    trackCheckoutCompleted,
    trackCheckoutAbandoned,
    trackProductReview,
    trackFirstPurchase,
    trackRepeatPurchase,
    trackReturnInitiated,
    trackRewardEarned
  };
};

/**
 * Hook to track transaction/order events
 */
export const useTransactionTracking = (userId) => {
  const trackOrderCreated = useCallback((orderData) => {
    adminAnalyticsService.logEvent({
      eventType: 'transaction_order_created',
      category: 'transaction',
      userId,
      orderId: orderData.id,
      severity: 'info',
      metadata: {
        orderId: orderData.id,
        totalAmount: orderData.totalAmount,
        itemCount: orderData.itemCount,
        vendorCount: orderData.vendorCount,
        paymentMethod: orderData.paymentMethod
      }
    });
  }, [userId]);

  const trackOrderStatusChanged = useCallback((orderData, oldStatus, newStatus) => {
    const severityMap = {
      'processing': 'info',
      'shipped': 'info',
      'delivered': 'info',
      'cancelled': 'warning',
      'failed': 'critical',
      'returned': 'warning',
      'refunded': 'info'
    };

    adminAnalyticsService.logEvent({
      eventType: 'transaction_order_status_changed',
      category: 'transaction',
      userId,
      orderId: orderData.id,
      severity: severityMap[newStatus] || 'info',
      metadata: {
        orderId: orderData.id,
        oldStatus,
        newStatus,
        timestamp: new Date().toISOString()
      }
    });
  }, [userId]);

  const trackPaymentProcessed = useCallback((paymentData) => {
    adminAnalyticsService.logEvent({
      eventType: 'transaction_payment_processed',
      category: 'transaction',
      userId,
      orderId: paymentData.orderId,
      severity: 'info',
      metadata: {
        orderId: paymentData.orderId,
        amount: paymentData.amount,
        method: paymentData.method,
        transactionId: paymentData.transactionId,
        processingTime: paymentData.processingTime
      }
    });
  }, [userId]);

  const trackPaymentFailed = useCallback((paymentData) => {
    adminAnalyticsService.logEvent({
      eventType: 'transaction_payment_failed',
      category: 'transaction',
      userId,
      orderId: paymentData.orderId,
      severity: 'warning',
      metadata: {
        orderId: paymentData.orderId,
        amount: paymentData.amount,
        method: paymentData.method,
        failureReason: paymentData.failureReason,
        retryCount: paymentData.retryCount
      }
    });
  }, [userId]);

  const trackRefundProcessed = useCallback((refundData) => {
    adminAnalyticsService.logEvent({
      eventType: 'transaction_refund_processed',
      category: 'transaction',
      userId,
      orderId: refundData.orderId,
      severity: 'info',
      metadata: {
        orderId: refundData.orderId,
        refundId: refundData.refundId,
        amount: refundData.amount,
        reason: refundData.reason,
        processingTime: refundData.processingTime
      }
    });
  }, [userId]);

  const trackReturnInitiated = useCallback((returnData) => {
    adminAnalyticsService.logEvent({
      eventType: 'transaction_return_initiated',
      category: 'transaction',
      userId,
      orderId: returnData.orderId,
      severity: 'warning',
      metadata: {
        orderId: returnData.orderId,
        returnId: returnData.returnId,
        itemCount: returnData.itemCount,
        reason: returnData.reason,
        expectedRefund: returnData.expectedRefund
      }
    });
  }, [userId]);

  const trackDeliveryConfirmed = useCallback((deliveryData) => {
    adminAnalyticsService.logEvent({
      eventType: 'transaction_delivery_confirmed',
      category: 'transaction',
      userId,
      orderId: deliveryData.orderId,
      severity: 'info',
      metadata: {
        orderId: deliveryData.orderId,
        deliveryDate: deliveryData.deliveryDate,
        daysToDeliver: deliveryData.daysToDeliver,
        signedBy: deliveryData.signedBy || 'Recipient'
      }
    });
  }, [userId]);

  const trackShippingUpdated = useCallback((shippingData) => {
    adminAnalyticsService.logEvent({
      eventType: 'transaction_shipping_updated',
      category: 'transaction',
      userId,
      orderId: shippingData.orderId,
      metadata: {
        orderId: shippingData.orderId,
        trackingNumber: shippingData.trackingNumber,
        carrier: shippingData.carrier,
        status: shippingData.status,
        estimatedDelivery: shippingData.estimatedDelivery
      }
    });
  }, [userId]);

  const trackOrderCancelled = useCallback((cancelData) => {
    adminAnalyticsService.logEvent({
      eventType: 'transaction_order_cancelled',
      category: 'transaction',
      userId,
      orderId: cancelData.orderId,
      severity: 'warning',
      metadata: {
        orderId: cancelData.orderId,
        reason: cancelData.reason,
        initiatedBy: cancelData.initiatedBy,
        refundAmount: cancelData.refundAmount
      }
    });
  }, [userId]);

  const trackDisputeCreated = useCallback((disputeData) => {
    adminAnalyticsService.logEvent({
      eventType: 'transaction_dispute_created',
      category: 'transaction',
      userId,
      orderId: disputeData.orderId,
      severity: 'critical',
      metadata: {
        orderId: disputeData.orderId,
        disputeId: disputeData.disputeId,
        reason: disputeData.reason,
        claimAmount: disputeData.claimAmount,
        againstParty: disputeData.againstParty
      }
    });
  }, [userId]);

  const trackRevenueRecognized = useCallback((revenueData) => {
    adminAnalyticsService.logEvent({
      eventType: 'transaction_revenue_recognized',
      category: 'transaction',
      userId,
      orderId: revenueData.orderId,
      severity: 'info',
      metadata: {
        orderId: revenueData.orderId,
        amount: revenueData.amount,
        vendorShare: revenueData.vendorShare,
        platformFee: revenueData.platformFee,
        recognitionDate: revenueData.recognitionDate
      }
    });
  }, [userId]);

  return {
    trackOrderCreated,
    trackOrderStatusChanged,
    trackPaymentProcessed,
    trackPaymentFailed,
    trackRefundProcessed,
    trackReturnInitiated,
    trackDeliveryConfirmed,
    trackShippingUpdated,
    trackOrderCancelled,
    trackDisputeCreated,
    trackRevenueRecognized
  };
};

/**
 * Hook to track error events
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
    if (typeof window === 'undefined' || !userId) return;

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
    // Only start session if userId and userRole are available
    if (!userId || !userRole) return;
    
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
 * Hook to track platform health events
 */
export const usePlatformHealthTracking = () => {
  const trackCSPViolation = useCallback((violation) => {
    adminAnalyticsService.logEvent({
      eventType: 'csp_violation',
      category: 'security',
      metadata: {
        violatedDirective: violation.violatedDirective,
        blockedURI: violation.blockedURI,
        sourceFile: violation.sourceFile,
        disposition: violation.disposition
      }
    });
  }, []);

  const trackErrorLog = useCallback((error, context = {}) => {
    adminAnalyticsService.logEvent({
      eventType: 'error_logged',
      category: 'error',
      severity: error.severity || 'error',
      metadata: {
        errorType: error.name,
        message: error.message,
        stack: error.stack ? error.stack.substring(0, 500) : null,
        context
      }
    });
  }, []);

  const trackPerformanceMetric = useCallback((metricName, value, metadata = {}) => {
    adminAnalyticsService.logEvent({
      eventType: 'performance_metric',
      category: 'performance',
      metadata: {
        metricName,
        value,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    });
  }, []);

  const trackAPICall = useCallback((endpoint, duration, status, metadata = {}) => {
    adminAnalyticsService.logEvent({
      eventType: 'api_call',
      category: 'api',
      metadata: {
        endpoint,
        duration,
        status,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    });
  }, []);

  const trackDatabaseQuery = useCallback((collection, operationType, duration, metadata = {}) => {
    adminAnalyticsService.logEvent({
      eventType: 'database_query',
      category: 'database',
      metadata: {
        collection,
        operationType,
        duration,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    });
  }, []);

  const trackServiceStatus = useCallback((serviceName, status, metadata = {}) => {
    adminAnalyticsService.logEvent({
      eventType: 'service_status',
      category: 'service',
      metadata: {
        serviceName,
        status,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    });
  }, []);

  return {
    trackCSPViolation,
    trackErrorLog,
    trackPerformanceMetric,
    trackAPICall,
    trackDatabaseQuery,
    trackServiceStatus
  };
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
    trackFunnel: useFunnelTracking,
    trackPlatformHealth: usePlatformHealthTracking
  };
};

export default useAnalytics;

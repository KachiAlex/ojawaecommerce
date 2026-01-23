import { 
  collection, 
  doc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ===============================
// PRICING CONSTANTS
// ===============================

export const PRICING_CONFIG = {
  VAT_RATE: 0.075, // 7.5%
  DEFAULT_SERVICE_FEE_RATE: 0.05, // 5% (default, can be changed by admin)
  MIN_SERVICE_FEE: 50, // Minimum service fee in NGN
  MAX_SERVICE_FEE: 5000, // Maximum service fee in NGN
  CURRENCY: 'NGN'
};

// ===============================
// PRICING CALCULATION SERVICE
// ===============================

export const pricingService = {
  // Calculate comprehensive pricing breakdown
  async calculatePricingBreakdown(cartItems, deliveryOption = 'pickup', selectedLogistics = null) {
    try {
      // Get current pricing configuration from admin settings
      const pricingConfig = await this.getPricingConfiguration();
      
      // Calculate subtotal (sum of all items)
      const subtotal = cartItems.reduce((total, item) => {
        return total + (parseFloat(item.price) * item.quantity);
      }, 0);

      // Calculate VAT (7.5% of subtotal)
      const vatAmount = subtotal * PRICING_CONFIG.VAT_RATE;

      // Calculate service fee (admin-configurable percentage of subtotal)
      const serviceFeeRate = pricingConfig.serviceFeeRate || PRICING_CONFIG.DEFAULT_SERVICE_FEE_RATE;
      let serviceFeeAmount = subtotal * serviceFeeRate;
      
      // Apply minimum and maximum service fee limits
      serviceFeeAmount = Math.max(PRICING_CONFIG.MIN_SERVICE_FEE, serviceFeeAmount);
      serviceFeeAmount = Math.min(PRICING_CONFIG.MAX_SERVICE_FEE, serviceFeeAmount);

      // Calculate logistics fee if delivery is selected
      let logisticsFee = 0;
      let logisticsDetails = null;
      
      if (deliveryOption === 'delivery' && selectedLogistics) {
        logisticsDetails = selectedLogistics;
        logisticsFee = selectedLogistics.cost || 0;
      }

      // Calculate total before any discounts
      const totalBeforeDiscounts = subtotal + vatAmount + serviceFeeAmount + logisticsFee;

      // Apply any discounts (future implementation)
      const discountAmount = 0; // Placeholder for future discount system
      const total = totalBeforeDiscounts - discountAmount;

      return {
        subtotal,
        vatAmount,
        serviceFeeAmount,
        logisticsFee,
        logisticsDetails,
        discountAmount,
        total,
        breakdown: {
          subtotal: {
            label: 'Subtotal',
            amount: subtotal,
            description: 'Sum of all items'
          },
          vat: {
            label: 'VAT (7.5%)',
            amount: vatAmount,
            description: 'Value Added Tax'
          },
          serviceFee: {
            label: 'Service Fee',
            amount: serviceFeeAmount,
            description: 'Ojawa platform service fee',
            rate: serviceFeeRate * 100
          },
          logistics: logisticsFee > 0 ? {
            label: 'Logistics Fee',
            amount: logisticsFee,
            description: `Delivery via ${selectedLogistics?.companyName || 'Logistics Partner'}`,
            details: logisticsDetails
          } : null,
          discount: discountAmount > 0 ? {
            label: 'Discount',
            amount: -discountAmount,
            description: 'Applied discount'
          } : null,
          total: {
            label: 'Total',
            amount: total,
            description: 'Final amount to be paid'
          }
        }
      };
    } catch (error) {
      console.error('Error calculating pricing breakdown:', error);
      throw error;
    }
  },

  // Get current pricing configuration from admin settings
  async getPricingConfiguration() {
    try {
      const configDoc = await getDoc(doc(db, 'admin_settings', 'pricing_config'));
      
      if (configDoc.exists()) {
        return configDoc.data();
      } else {
        // Return default configuration
        return {
          serviceFeeRate: PRICING_CONFIG.DEFAULT_SERVICE_FEE_RATE,
          vatRate: PRICING_CONFIG.VAT_RATE,
          minServiceFee: PRICING_CONFIG.MIN_SERVICE_FEE,
          maxServiceFee: PRICING_CONFIG.MAX_SERVICE_FEE,
          lastUpdated: serverTimestamp()
        };
      }
    } catch (error) {
      console.warn('Error fetching pricing configuration, using defaults:', error.message);
      // Return default configuration on error (including permission errors)
      return {
        serviceFeeRate: PRICING_CONFIG.DEFAULT_SERVICE_FEE_RATE,
        vatRate: PRICING_CONFIG.VAT_RATE,
        minServiceFee: PRICING_CONFIG.MIN_SERVICE_FEE,
        maxServiceFee: PRICING_CONFIG.MAX_SERVICE_FEE
      };
    }
  },

  // Update pricing configuration (admin only)
  async updatePricingConfiguration(newConfig) {
    try {
      const configRef = doc(db, 'admin_settings', 'pricing_config');
      
      const updatedConfig = {
        ...newConfig,
        lastUpdated: serverTimestamp(),
        updatedBy: 'admin' // This should be the actual admin user ID
      };

      await updateDoc(configRef, updatedConfig);
      
      // If document doesn't exist, create it
      if (!(await getDoc(configRef)).exists()) {
        await updateDoc(configRef, {
          ...updatedConfig,
          createdAt: serverTimestamp()
        });
      }

      return { success: true, config: updatedConfig };
    } catch (error) {
      console.error('Error updating pricing configuration:', error);
      throw error;
    }
  },

  // Format currency amount
  formatCurrency(amount, currency = PRICING_CONFIG.CURRENCY) {
    const numAmount = parseFloat(amount) || 0;
    
    if (currency === 'NGN') {
      return `₦${numAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  },

  // Calculate logistics rating based on performance
  async calculateLogisticsRating(logisticsCompanyId) {
    try {
      // Get all completed deliveries for this logistics company
      const q = query(
        collection(db, 'delivery_tracking'),
        where('logisticsPartnerId', '==', logisticsCompanyId),
        where('currentStage', '==', 'delivered')
      );
      
      const snapshot = await getDocs(q);
      const deliveries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (deliveries.length === 0) {
        return {
          rating: 0,
          totalDeliveries: 0,
          onTimeDeliveries: 0,
          averageDeliveryTime: 0,
          successRate: 0
        };
      }

      let onTimeDeliveries = 0;
      let totalDeliveryTime = 0;

      deliveries.forEach(delivery => {
        // Check if delivery was on time
        const estimatedDate = delivery.estimatedDeliveryDate?.toDate?.() || new Date(delivery.estimatedDeliveryDate);
        const actualDate = delivery.actualDeliveryDate?.toDate?.() || new Date(delivery.actualDeliveryDate);
        
        if (actualDate <= estimatedDate) {
          onTimeDeliveries++;
        }

        // Calculate delivery time
        const createdAt = delivery.createdAt?.toDate?.() || new Date(delivery.createdAt);
        const deliveryTime = actualDate - createdAt;
        totalDeliveryTime += deliveryTime;
      });

      const successRate = (onTimeDeliveries / deliveries.length) * 100;
      const averageDeliveryTime = totalDeliveryTime / deliveries.length;

      // Calculate rating based on success rate (0-5 scale)
      let rating = 0;
      if (successRate >= 95) rating = 5;
      else if (successRate >= 90) rating = 4.5;
      else if (successRate >= 85) rating = 4;
      else if (successRate >= 80) rating = 3.5;
      else if (successRate >= 75) rating = 3;
      else if (successRate >= 70) rating = 2.5;
      else if (successRate >= 65) rating = 2;
      else if (successRate >= 60) rating = 1.5;
      else if (successRate >= 50) rating = 1;
      else rating = 0.5;

      return {
        rating: Math.round(rating * 10) / 10, // Round to 1 decimal place
        totalDeliveries: deliveries.length,
        onTimeDeliveries,
        averageDeliveryTime,
        successRate: Math.round(successRate * 10) / 10
      };
    } catch (error) {
      console.error('Error calculating logistics rating:', error);
      throw error;
    }
  },

  // Update logistics company rating
  async updateLogisticsRating(logisticsCompanyId) {
    try {
      const ratingData = await this.calculateLogisticsRating(logisticsCompanyId);
      
      // Update the logistics company document with new rating
      const companyRef = doc(db, 'logistics_companies', logisticsCompanyId);
      await updateDoc(companyRef, {
        rating: ratingData.rating,
        totalDeliveries: ratingData.totalDeliveries,
        onTimeDeliveries: ratingData.onTimeDeliveries,
        averageDeliveryTime: ratingData.averageDeliveryTime,
        successRate: ratingData.successRate,
        lastRatingUpdate: serverTimestamp()
      });

      return ratingData;
    } catch (error) {
      console.error('Error updating logistics rating:', error);
      throw error;
    }
  },

  // Get logistics companies with ratings
  async getLogisticsCompaniesWithRatings() {
    try {
      // Prefer rating ordering if available; fall back to simple filter to avoid composite index requirement
      let snapshot;
      try {
        const q = query(
          collection(db, 'logistics_companies'),
          where('status', '==', 'active'),
          orderBy('rating', 'desc')
        );
        snapshot = await getDocs(q);
      } catch (fallbackError) {
        console.warn('Falling back to unordered logistics query:', fallbackError.message)
        // Fallback without orderBy to avoid index requirement
        const q = query(
          collection(db, 'logistics_companies'),
          where('status', '==', 'active')
        );
        snapshot = await getDocs(q);
      }
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.warn('Error fetching logistics companies, returning empty array:', error.message);
      // Return empty array on error (including index errors)
      return [];
    }
  }
};

export default pricingService;

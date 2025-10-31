/**
 * Logistics Pricing Service
 * Handles delivery fee calculations with dynamic pricing and partner integration
 */

import { collection, doc, getDocs, query, where, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

class LogisticsPricingService {
  constructor() {
    this.baseConfig = {
      baseFare: 300, // Base fare in NGN
      ratePerKm: 50, // Rate per kilometer
      ratePerKg: 25, // Rate per extra kg
      expressMultiplier: 1.5, // Express delivery multiplier
      intercityRatePerKm: 35, // Lower rate for intercity
      maxWeight: 50, // Maximum weight in kg
      minDeliveryFee: 200, // Minimum delivery fee
      maxDeliveryFee: 5000 // Maximum delivery fee
    };

    this.timeMultipliers = {
      'morning': 1.0, // 6 AM - 12 PM
      'afternoon': 1.1, // 12 PM - 6 PM
      'evening': 1.2, // 6 PM - 10 PM
      'night': 1.5 // 10 PM - 6 AM
    };

    this.zoneMultipliers = {
      'lagos_intra': 1.0, // Within Lagos
      'lagos_inter': 1.2, // Lagos to other states
      'abuja_intra': 1.0, // Within Abuja
      'abuja_inter': 1.3, // Abuja to other states
      'other_intra': 1.1, // Within other states
      'other_inter': 1.4 // Between different states
    };
  }

  /**
   * Calculate delivery fee based on location, weight, and delivery type
   * @param {Object} params - Delivery parameters
   * @returns {Object} - Delivery calculation result
   */
  async calculateDeliveryFee(params) {
    try {
      const {
        pickup,
        dropoff,
        weight = 1,
        type = 'standard',
        partner = null,
        timestamp = new Date()
      } = params;

      // Validate inputs
      if (!pickup || !dropoff) {
        throw new Error('Pickup and dropoff locations are required');
      }

      if (weight > this.baseConfig.maxWeight) {
        throw new Error(`Weight cannot exceed ${this.baseConfig.maxWeight}kg`);
      }

      // Calculate distance and zone
      const distanceData = await this.calculateDistance(pickup, dropoff);
      const zone = this.determineZone(pickup, dropoff);
      
      // Get time-based multiplier
      const timeMultiplier = this.getTimeMultiplier(timestamp);
      
      // Get zone-based multiplier
      const zoneMultiplier = this.zoneMultipliers[zone] || 1.0;

      // Calculate base fees
      const baseFare = this.baseConfig.baseFare;
      const distanceFee = distanceData.distance * this.baseConfig.ratePerKm;
      const weightFee = Math.max(0, weight - 1) * this.baseConfig.ratePerKg;

      // Apply multipliers
      let totalFee = baseFare + distanceFee + weightFee;
      
      // Apply delivery type multiplier
      if (type === 'express') {
        totalFee *= this.baseConfig.expressMultiplier;
      }

      // Apply time and zone multipliers
      totalFee *= timeMultiplier * zoneMultiplier;

      // Apply min/max constraints
      totalFee = Math.max(this.baseConfig.minDeliveryFee, totalFee);
      totalFee = Math.min(this.baseConfig.maxDeliveryFee, totalFee);

      // Round to nearest 50
      totalFee = Math.round(totalFee / 50) * 50;

      // Get logistics partner
      const logisticsPartner = await this.getLogisticsPartner(partner, zone);

      // If no partner available, instruct buyer to message vendor
      if (!logisticsPartner) {
        return {
          success: false,
          code: 'NO_LOGISTICS_PARTNER',
          error: 'No logistics partner available for this route. Please message the vendor to set up logistics.'
        };
      }

      // Calculate ETA
      const eta = this.calculateETA(distanceData.distance, type, zone);

      // Create breakdown
      const breakdown = {
        baseFare: baseFare,
        distanceFee: distanceFee,
        weightFee: weightFee,
        deliveryTypeMultiplier: type === 'express' ? this.baseConfig.expressMultiplier : 1.0,
        timeMultiplier: timeMultiplier,
        zoneMultiplier: zoneMultiplier,
        totalMultiplier: (type === 'express' ? this.baseConfig.expressMultiplier : 1.0) * timeMultiplier * zoneMultiplier
      };

      // Store calculation for analytics
      await this.storeCalculation({
        pickup,
        dropoff,
        weight,
        type,
        distance: distanceData.distance,
        zone,
        totalFee,
        breakdown,
        partner: logisticsPartner.id,
        timestamp
      });

      return {
        success: true,
        deliveryFee: Math.round(totalFee),
        breakdown: breakdown,
        eta: eta,
        partner: {
          id: logisticsPartner.id,
          name: logisticsPartner.name,
          rating: logisticsPartner.rating
        },
        distance: distanceData.distance,
        zone: zone,
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error calculating delivery fee:', error);
      return {
        success: false,
        error: error.message,
        deliveryFee: this.baseConfig.minDeliveryFee,
        breakdown: {
          baseFare: this.baseConfig.baseFare,
          distanceFee: 0,
          weightFee: 0,
          deliveryTypeMultiplier: 1.0,
          timeMultiplier: 1.0,
          zoneMultiplier: 1.0,
          totalMultiplier: 1.0
        },
        eta: '2-3 days',
        partner: null
      };
    }
  }

  /**
   * Calculate distance between two locations
   * @param {string} pickup - Pickup location
   * @param {string} dropoff - Dropoff location
   * @returns {Object} - Distance data
   */
  async calculateDistance(pickup, dropoff) {
    try {
      // Try to use Google Maps service if available
      try {
        const { default: googleMapsService } = await import('./googleMapsService');
        await googleMapsService.initialize();
        
        if (googleMapsService.isLoaded) {
          // Use Google Maps Distance Matrix or Directions API
          const route = await googleMapsService.calculateRoute(pickup, dropoff);
          if (route && route.distance) {
            const distanceKm = route.distance.value / 1000; // Convert meters to km
            return {
              distance: distanceKm,
              unit: 'km',
              method: 'google_maps',
              duration: route.duration
            };
          }
        }
      } catch (mapsError) {
        console.warn('Google Maps unavailable, using fallback:', mapsError);
      }
      
      // Fallback to estimated distance
      const distance = this.estimateDistance(pickup, dropoff);
      return {
        distance: distance,
        unit: 'km',
        method: 'estimated'
      };
    } catch (error) {
      console.error('Error calculating distance:', error);
      // Fallback to estimated distance
      return {
        distance: 10, // Default 10km
        unit: 'km',
        method: 'fallback'
      };
    }
  }

  /**
   * Estimate distance between two locations (simplified)
   * @param {string} pickup - Pickup location
   * @param {string} dropoff - Dropoff location
   * @returns {number} - Estimated distance in km
   */
  estimateDistance(pickup, dropoff) {
    // Simplified distance estimation based on location names
    const locations = {
      'ikeja': { lat: 6.6018, lng: 3.3515 },
      'yaba': { lat: 6.4531, lng: 3.3958 },
      'victoria island': { lat: 6.4281, lng: 3.4219 },
      'lekki': { lat: 6.4698, lng: 3.5852 },
      'surulere': { lat: 6.5015, lng: 3.3581 },
      'abuja': { lat: 9.0765, lng: 7.3986 },
      'kaduna': { lat: 10.5200, lng: 7.4381 },
      'kano': { lat: 12.0022, lng: 8.5920 }
    };

    const pickupLower = pickup.toLowerCase();
    const dropoffLower = dropoff.toLowerCase();

    let pickupCoords = null;
    let dropoffCoords = null;

    // Find coordinates for pickup
    for (const [key, coords] of Object.entries(locations)) {
      if (pickupLower.includes(key)) {
        pickupCoords = coords;
        break;
      }
    }

    // Find coordinates for dropoff
    for (const [key, coords] of Object.entries(locations)) {
      if (dropoffLower.includes(key)) {
        dropoffCoords = coords;
        break;
      }
    }

    if (pickupCoords && dropoffCoords) {
      // Calculate distance using Haversine formula
      return this.haversineDistance(pickupCoords, dropoffCoords);
    }

    // Fallback estimation based on location names
    if (pickupLower.includes('lagos') && dropoffLower.includes('lagos')) {
      return Math.random() * 30 + 5; // 5-35km within Lagos
    } else if (pickupLower.includes('abuja') && dropoffLower.includes('abuja')) {
      return Math.random() * 25 + 5; // 5-30km within Abuja
    } else {
      return Math.random() * 200 + 50; // 50-250km intercity
    }
  }

  /**
   * Calculate distance using Haversine formula
   * @param {Object} coord1 - First coordinates
   * @param {Object} coord2 - Second coordinates
   * @returns {number} - Distance in km
   */
  haversineDistance(coord1, coord2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(coord2.lat - coord1.lat);
    const dLon = this.toRad(coord2.lng - coord1.lng);
    const lat1 = this.toRad(coord1.lat);
    const lat2 = this.toRad(coord2.lat);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Convert degrees to radians
   * @param {number} deg - Degrees
   * @returns {number} - Radians
   */
  toRad(deg) {
    return deg * (Math.PI/180);
  }

  /**
   * Determine zone based on pickup and dropoff locations
   * @param {string} pickup - Pickup location
   * @param {string} dropoff - Dropoff location
   * @returns {string} - Zone identifier
   */
  determineZone(pickup, dropoff) {
    const pickupLower = pickup.toLowerCase();
    const dropoffLower = dropoff.toLowerCase();

    const isLagos = (location) => location.includes('lagos') || 
                   location.includes('ikeja') || 
                   location.includes('yaba') || 
                   location.includes('victoria') || 
                   location.includes('lekki') || 
                   location.includes('surulere');

    const isAbuja = (location) => location.includes('abuja') || 
                   location.includes('garki') || 
                   location.includes('asokoro') || 
                   location.includes('wuse');

    const pickupIsLagos = isLagos(pickupLower);
    const dropoffIsLagos = isLagos(dropoffLower);
    const pickupIsAbuja = isAbuja(pickupLower);
    const dropoffIsAbuja = isAbuja(dropoffLower);

    if (pickupIsLagos && dropoffIsLagos) return 'lagos_intra';
    if (pickupIsAbuja && dropoffIsAbuja) return 'abuja_intra';
    if (pickupIsLagos || dropoffIsLagos) return 'lagos_inter';
    if (pickupIsAbuja || dropoffIsAbuja) return 'abuja_inter';
    
    return 'other_inter';
  }

  /**
   * Get time-based multiplier
   * @param {Date} timestamp - Delivery timestamp
   * @returns {number} - Time multiplier
   */
  getTimeMultiplier(timestamp) {
    const hour = timestamp.getHours();
    
    if (hour >= 6 && hour < 12) return this.timeMultipliers.morning;
    if (hour >= 12 && hour < 18) return this.timeMultipliers.afternoon;
    if (hour >= 18 && hour < 22) return this.timeMultipliers.evening;
    return this.timeMultipliers.night;
  }

  /**
   * Get logistics partner for delivery
   * @param {string} preferredPartner - Preferred partner ID
   * @param {string} zone - Delivery zone
   * @returns {Object} - Logistics partner info
   */
  async getLogisticsPartner(preferredPartner, zone) {
    try {
      if (preferredPartner) {
        const partnerDoc = await getDocs(query(
          collection(db, 'logisticsPartners'),
          where('id', '==', preferredPartner)
        ));
        
        if (!partnerDoc.empty) {
          const partner = partnerDoc.docs[0].data();
          return {
            id: partner.id,
            name: partner.name,
            rating: partner.rating || 4.0
          };
        }
      }

      // Get available partners for the zone
      const partnersQuery = query(
        collection(db, 'logisticsPartners'),
        where('isActive', '==', true),
        where('zones', 'array-contains', zone)
      );
      
      const partnersSnapshot = await getDocs(partnersQuery);
      
      if (!partnersSnapshot.empty) {
        const partners = partnersSnapshot.docs.map(doc => doc.data());
        // Select partner with highest rating
        const bestPartner = partners.reduce((best, current) => 
          current.rating > best.rating ? current : best
        );
        
        return {
          id: bestPartner.id,
          name: bestPartner.name,
          rating: bestPartner.rating || 4.0
        };
      }

      // No partner available
      return null;

    } catch (error) {
      console.warn('Error getting logistics partner:', error?.message || error);
      return null;
    }
  }

  /**
   * Calculate estimated delivery time
   * @param {number} distance - Distance in km
   * @param {string} type - Delivery type
   * @param {string} zone - Delivery zone
   * @returns {string} - Estimated delivery time
   */
  calculateETA(distance, type, zone) {
    let baseHours = 24; // Base delivery time in hours
    
    // Adjust based on distance
    if (distance < 10) baseHours = 4;
    else if (distance < 25) baseHours = 8;
    else if (distance < 50) baseHours = 12;
    else if (distance < 100) baseHours = 24;
    else baseHours = 48;

    // Adjust for delivery type
    if (type === 'express') {
      baseHours = Math.ceil(baseHours * 0.5); // Express is 50% faster
    }

    // Adjust for zone
    if (zone.includes('intra')) {
      baseHours = Math.ceil(baseHours * 0.8); // Intracity is 20% faster
    }

    // Convert to human-readable format
    if (baseHours <= 4) return 'Same Day';
    if (baseHours <= 24) return 'Next Day';
    if (baseHours <= 48) return '2 Days';
    if (baseHours <= 72) return '3 Days';
    return '3-5 Days';
  }

  /**
   * Store calculation for analytics and audit
   * @param {Object} calculation - Calculation data
   */
  async storeCalculation(calculation) {
    try {
      await addDoc(collection(db, 'deliveryCalculations'), {
        ...calculation,
        createdAt: serverTimestamp(),
        timestamp: calculation.timestamp
      });
    } catch (error) {
      // Silently ignore analytics persistence errors (e.g., permission rules on public site)
      console.warn('Skipping delivery calculation persistence:', error?.message || error);
    }
  }

  /**
   * Update pricing configuration
   * @param {Object} config - New configuration
   */
  async updatePricingConfig(config) {
    try {
      const configDoc = doc(db, 'systemConfig', 'logisticsPricing');
      await updateDoc(configDoc, {
        ...config,
        updatedAt: serverTimestamp()
      });
      
      // Update local config
      Object.assign(this.baseConfig, config);
    } catch (error) {
      console.error('Error updating pricing config:', error);
      throw error;
    }
  }

  /**
   * Get current pricing configuration
   * @returns {Object} - Current configuration
   */
  getPricingConfig() {
    return {
      baseConfig: this.baseConfig,
      timeMultipliers: this.timeMultipliers,
      zoneMultipliers: this.zoneMultipliers
    };
  }
}

// Create singleton instance
const logisticsPricingService = new LogisticsPricingService();

export default logisticsPricingService;
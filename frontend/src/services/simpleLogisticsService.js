// Simple logistics service without external API dependencies
class SimpleLogisticsService {
  /**
   * Calculate delivery cost based on simple rules
   */
  calculateDeliveryCost(origin, destination, cartTotal = 0) {
    try {
      // Simple distance estimation based on states
      const distance = this.estimateDistance(origin, destination);
      
      // Base delivery cost
      let baseCost = 500;
      
      // Adjust based on distance
      if (distance > 500) {
        baseCost = 1500; // Long distance
      } else if (distance > 200) {
        baseCost = 1000; // Medium distance
      } else if (distance > 50) {
        baseCost = 750; // Short distance
      }
      
      // Adjust based on cart total
      if (cartTotal > 15000) {
        baseCost = Math.max(200, baseCost * 0.5); // Discount for large orders
      } else if (cartTotal > 5000) {
        baseCost = Math.max(300, baseCost * 0.7); // Small discount
      }
      
      // Estimate delivery time
      let estimatedDays = 2;
      if (distance > 500) {
        estimatedDays = 5;
      } else if (distance > 200) {
        estimatedDays = 3;
      }
      
      return {
        success: true,
        cost: Math.round(baseCost),
        estimatedDays,
        distance: Math.round(distance),
        distanceText: `${Math.round(distance)} km`,
        durationText: `${estimatedDays} days`
      };
    } catch (error) {
      console.error('Error calculating delivery cost:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Estimate distance between two locations based on Nigerian states
   */
  estimateDistance(origin, destination) {
    const stateDistances = {
      // Lagos to other states (approximate distances in km)
      'lagos': {
        'abuja': 750,
        'kano': 1200,
        'port-harcourt': 600,
        'ibadan': 150,
        'benin': 300,
        'enugu': 500,
        'kaduna': 800,
        'jos': 700,
        'maiduguri': 1500,
        'calabar': 400,
        'owerri': 450,
        'abeokuta': 100,
        'akure': 200,
        'ilorin': 250,
        'osogbo': 200,
        'adobe': 300,
        'uyo': 350,
        'makurdi': 600,
        'lokoja': 400,
        'minna': 500,
        'jalingo': 800,
        'gombe': 900,
        'bauchi': 1000,
        'yola': 1200,
        'sokoto': 1000,
        'katsina': 1100,
        'dutse': 1000,
        'birnin-kebbi': 950,
        'damaturu': 1300,
        'yobe': 1200,
        'jigawa': 1000,
        'zamfara': 950,
        'kebbi': 950,
        'nasarawa': 700,
        'plateau': 700,
        'taraba': 800,
        'adamawa': 1000,
        'borno': 1500,
        'cross-river': 400,
        'akwa-ibom': 350,
        'rivers': 600,
        'bayelsa': 500,
        'delta': 350,
        'edo': 300,
        'anambra': 450,
        'ebonyi': 550,
        'abia': 400,
        'imo': 450,
        'kwara': 250,
        'kogi': 400,
        'benue': 600,
        'niger': 500,
        'fct': 750
      }
    };

    const originState = this.normalizeState(origin.state);
    const destState = this.normalizeState(destination.state);
    
    // If same state, estimate based on city
    if (originState === destState) {
      return this.estimateIntraStateDistance(origin, destination);
    }
    
    // Use Lagos as reference point for inter-state distances
    const lagosDistances = stateDistances.lagos;
    const originFromLagos = lagosDistances[originState] || 500;
    const destFromLagos = lagosDistances[destState] || 500;
    
    // Simple calculation: distance between two points via Lagos
    return Math.abs(originFromLagos - destFromLagos) + 100; // Add buffer
  }

  /**
   * Normalize state names for consistent lookup
   */
  normalizeState(state) {
    if (!state) return 'lagos';
    
    return state.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/state/g, '')
      .trim();
  }

  /**
   * Estimate distance within the same state
   */
  estimateIntraStateDistance(origin, destination) {
    // Major cities in each state with approximate distances
    const majorCities = {
      'lagos': {
        'ikeja': 0,
        'surulere': 15,
        'yaba': 20,
        'ikoyi': 25,
        'vi': 30,
        'lekki': 35,
        'ajah': 40,
        'festac': 25,
        'apapa': 20,
        'mushin': 10,
        'oshodi': 15,
        'shomolu': 15,
        'bariga': 20,
        'ikorodu': 30,
        'badagry': 50,
        'epe': 60
      },
      'abuja': {
        'garki': 0,
        'wuse': 5,
        'asokoro': 10,
        'maitama': 8,
        'gwarinpa': 15,
        'kubwa': 20,
        'nyanya': 25,
        'karu': 30,
        'lugbe': 15,
        'gwagwalada': 40
      }
    };

    const state = this.normalizeState(origin.state);
    const originCity = origin.city?.toLowerCase() || '';
    const destCity = destination.city?.toLowerCase() || '';
    
    if (majorCities[state]) {
      const originDist = majorCities[state][originCity] || 0;
      const destDist = majorCities[state][destCity] || 0;
      return Math.abs(originDist - destDist) || 20; // Default 20km
    }
    
    return 30; // Default intra-state distance
  }

  /**
   * Get available logistics partners (simplified)
   */
  getLogisticsPartners() {
    return [
      {
        id: 'platform-default',
        name: 'Platform Delivery',
        cost: 500,
        rating: 4.5,
        estimatedTime: '2-3 days',
        description: 'Reliable platform delivery service'
      },
      {
        id: 'express-delivery',
        name: 'Express Delivery',
        cost: 1000,
        rating: 4.8,
        estimatedTime: '1-2 days',
        description: 'Fast express delivery service'
      },
      {
        id: 'economy-delivery',
        name: 'Economy Delivery',
        cost: 300,
        rating: 4.2,
        estimatedTime: '3-5 days',
        description: 'Budget-friendly delivery option'
      }
    ];
  }

  /**
   * Calculate complete delivery with partner selection
   */
  calculateCompleteDelivery(origin, destination, cartTotal = 0) {
    try {
      const deliveryCost = this.calculateDeliveryCost(origin, destination, cartTotal);
      
      if (!deliveryCost.success) {
        return deliveryCost;
      }
      
      const partners = this.getLogisticsPartners();
      
      // Select best partner based on cart total and distance
      let selectedPartner = partners[0]; // Default to platform delivery
      
      if (cartTotal > 20000) {
        // Large order - use express delivery
        selectedPartner = partners[1];
      } else if (cartTotal < 5000) {
        // Small order - use economy delivery
        selectedPartner = partners[2];
      }
      
      return {
        success: true,
        price: selectedPartner.cost,
        duration: selectedPartner.estimatedTime,
        distance: deliveryCost.distance,
        distanceText: deliveryCost.distanceText,
        durationText: deliveryCost.durationText,
        selectedPartner: {
          id: selectedPartner.id,
          companyName: selectedPartner.name,
          rating: selectedPartner.rating,
          description: selectedPartner.description
        },
        alternatives: partners.filter(p => p.id !== selectedPartner.id)
      };
    } catch (error) {
      console.error('Error calculating complete delivery:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new SimpleLogisticsService();

// Distance calculation utilities for logistics pricing

/**
 * Calculate distance between two locations using Haversine formula
 * @param {Object} location1 - {lat, lng}
 * @param {Object} location2 - {lat, lng}
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(location1, location2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(location2.lat - location1.lat);
  const dLng = toRadians(location2.lng - location1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(location1.lat)) * Math.cos(toRadians(location2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Estimate distance based on location names (fallback)
 * @param {string} pickupLocation - Pickup location string
 * @param {string} deliveryLocation - Delivery location string
 * @returns {number} Estimated distance in kilometers
 */
export function estimateDistanceFromNames(pickupLocation, deliveryLocation) {
  if (!pickupLocation || !deliveryLocation) return 50; // Default fallback
  
  const pickupCity = pickupLocation.split(',')[0].trim().toLowerCase();
  const deliveryCity = deliveryLocation.split(',')[0].trim().toLowerCase();
  
  // Same city - estimate based on area
  if (pickupCity === deliveryCity) {
    const pickupArea = pickupLocation.split(',')[1]?.trim().toLowerCase() || '';
    const deliveryArea = deliveryLocation.split(',')[1]?.trim().toLowerCase() || '';
    
    // Same area within city
    if (pickupArea === deliveryArea) {
      return Math.random() * 5 + 2; // 2-7km
    }
    
    // Different areas within same city
    return Math.random() * 20 + 5; // 5-25km
  }
  
  // Different cities - estimate based on known Nigerian cities
  const cityDistances = {
    'lagos': {
      'abuja': 700,
      'kano': 900,
      'port harcourt': 500,
      'ibadan': 150,
      'benin city': 300
    },
    'abuja': {
      'lagos': 700,
      'kano': 400,
      'port harcourt': 600,
      'ibadan': 500,
      'benin city': 400
    },
    'kano': {
      'lagos': 900,
      'abuja': 400,
      'port harcourt': 800,
      'ibadan': 700,
      'benin city': 600
    }
  };
  
  const distance = cityDistances[pickupCity]?.[deliveryCity] || 
                  cityDistances[deliveryCity]?.[pickupCity] || 
                  200; // Default intercity distance
  
  return distance;
}

/**
 * Get route complexity score for pricing
 * @param {string} pickupLocation - Pickup location
 * @param {string} deliveryLocation - Delivery location
 * @returns {Object} Route complexity data
 */
export function getRouteComplexity(pickupLocation, deliveryLocation) {
  const distance = estimateDistanceFromNames(pickupLocation, deliveryLocation);
  const pickupCity = pickupLocation?.split(',')[0]?.trim().toLowerCase() || '';
  const deliveryCity = deliveryLocation?.split(',')[0]?.trim().toLowerCase() || '';
  
  const isIntracity = pickupCity === deliveryCity;
  const isSameCity = pickupCity === deliveryCity;
  
  let complexityScore = 1;
  let routeType = 'standard';
  
  if (isIntracity) {
    if (distance <= 5) {
      complexityScore = 0.8;
      routeType = 'intracity_short';
    } else if (distance <= 15) {
      complexityScore = 0.9;
      routeType = 'intracity_medium';
    } else {
      complexityScore = 1.1;
      routeType = 'intracity_long';
    }
  } else if (isSameCity) {
    complexityScore = 1.2;
    routeType = 'same_city';
  } else {
    complexityScore = 1.5;
    routeType = 'intercity';
  }
  
  return {
    distance,
    complexityScore,
    routeType,
    isIntracity,
    isSameCity
  };
}

/**
 * Get time-based pricing multiplier
 * @param {Date} currentTime - Current time
 * @returns {Object} Time-based pricing data
 */
export function getTimeBasedPricing(currentTime = new Date()) {
  const hour = currentTime.getHours();
  const day = currentTime.getDay(); // 0 = Sunday, 6 = Saturday
  
  let timeMultiplier = 1;
  let timeCategory = 'business';
  
  // Weekend pricing
  if (day === 0 || day === 6) {
    timeMultiplier = 1.2;
    timeCategory = 'weekend';
  }
  // After hours (6 PM - 8 AM)
  else if (hour < 8 || hour >= 18) {
    timeMultiplier = 1.3;
    timeCategory = 'after_hours';
  }
  // Business hours
  else {
    timeMultiplier = 1.0;
    timeCategory = 'business';
  }
  
  return {
    timeMultiplier,
    timeCategory,
    isWeekend: day === 0 || day === 6,
    isAfterHours: hour < 8 || hour >= 18
  };
}

// Logistics pricing calculation service for checkout
import { determineRouteCategory, estimateDistance } from '../utils/addressUtils';
import { DEFAULT_PLATFORM_PRICING } from '../data/logisticsPricingModel';
import firebaseService from './firebaseService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

// Calculate delivery price based on addresses
export const calculateDeliveryPrice = async (fromAddress, toAddress) => {
  try {
    // Determine route category
    const routeInfo = determineRouteCategory(fromAddress, toAddress);
    
    if (routeInfo.category === 'unknown') {
      return {
        success: false,
        error: 'Could not determine route from addresses',
        useDefault: true,
        defaultPrice: 5000
      };
    }
    
    // Estimate distance
    const distance = estimateDistance(fromAddress, toAddress, routeInfo.category);
    
    // Find matching logistics routes
    const matchingRoutes = await findMatchingRoutes(routeInfo, distance);
    
    if (matchingRoutes.length === 0) {
      // No logistics partners for this route, use platform default
      const platformPrice = calculatePlatformPrice(distance, routeInfo.category);
      return {
        success: true,
        category: routeInfo.category,
        distance,
        from: routeInfo.from,
        to: routeInfo.to,
        price: platformPrice.finalPrice,
        breakdown: platformPrice.breakdown,
        availablePartners: [],
        usingPlatformDefault: true
      };
    }
    
    // Return cheapest option
    const cheapest = matchingRoutes.sort((a, b) => a.price - b.price)[0];
    
    return {
      success: true,
      category: routeInfo.category,
      distance,
      from: routeInfo.from,
      to: routeInfo.to,
      price: cheapest.price,
      selectedPartner: cheapest,
      availablePartners: matchingRoutes,
      usingPlatformDefault: false
    };
  } catch (error) {
    console.error('Error calculating delivery price:', error);
    return {
      success: false,
      error: error.message,
      useDefault: true,
      defaultPrice: 5000
    };
  }
};

// Find matching logistics routes from database
const findMatchingRoutes = async (routeInfo, distance) => {
  try {
    const routesRef = collection(db, 'logistics_routes');
    const matchingRoutes = [];
    
    // For intracity routes
    if (routeInfo.category === 'intracity') {
      const q = query(
        routesRef,
        where('routeType', '==', 'intracity'),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      
      for (const doc of snapshot.docs) {
        const route = doc.data();
        // Check if route covers this city/state
        if (route.city && routeInfo.city && 
            route.city.toLowerCase().includes(routeInfo.city.toLowerCase())) {
          // Get logistics company info
          const companyInfo = await getLogisticsCompanyInfo(route.companyId);
          matchingRoutes.push({
            id: doc.id,
            ...route,
            company: companyInfo,
            distance: route.distance || distance
          });
        }
      }
    }
    
    // For intercity routes
    if (routeInfo.category === 'intercity') {
      const q = query(
        routesRef,
        where('routeType', '==', 'intercity'),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      
      for (const doc of snapshot.docs) {
        const route = doc.data();
        // Check if route matches (from-to or to-from)
        const routeFrom = (route.from || '').toLowerCase();
        const routeTo = (route.to || '').toLowerCase();
        const searchFrom = (routeInfo.fromCity || '').toLowerCase();
        const searchTo = (routeInfo.toCity || '').toLowerCase();
        
        const matches = 
          (routeFrom.includes(searchFrom) && routeTo.includes(searchTo)) ||
          (routeFrom.includes(searchTo) && routeTo.includes(searchFrom));
        
        if (matches) {
          const companyInfo = await getLogisticsCompanyInfo(route.companyId);
          matchingRoutes.push({
            id: doc.id,
            ...route,
            company: companyInfo
          });
        }
      }
    }
    
    // For international routes
    if (routeInfo.category === 'international') {
      const q = query(
        routesRef,
        where('routeType', '==', 'international'),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      
      for (const doc of snapshot.docs) {
        const route = doc.data();
        const companyInfo = await getLogisticsCompanyInfo(route.companyId);
        matchingRoutes.push({
          id: doc.id,
          ...route,
          company: companyInfo
        });
      }
    }
    
    return matchingRoutes;
  } catch (error) {
    console.error('Error finding matching routes:', error);
    return [];
  }
};

// Get logistics company information
const getLogisticsCompanyInfo = async (companyId) => {
  try {
    if (!companyId) return null;
    const profile = await firebaseService.logistics.getProfile(companyId);
    return {
      id: companyId,
      name: profile?.companyName || 'Logistics Partner',
      phone: profile?.phoneNumber,
      rating: profile?.rating || 0
    };
  } catch (error) {
    return null;
  }
};

// Calculate platform default price
const calculatePlatformPrice = (distance, category) => {
  const ratePerKm = DEFAULT_PLATFORM_PRICING.ratePerKm; // ₦500/km
  let basePrice = distance * ratePerKm;
  
  // Apply category limits
  const limits = category === 'intracity' 
    ? DEFAULT_PLATFORM_PRICING.intracity 
    : DEFAULT_PLATFORM_PRICING.intercity;
  
  let finalPrice = basePrice;
  let appliedRule = 'Standard rate applied';
  
  if (basePrice < limits.minCharge) {
    finalPrice = limits.minCharge;
    appliedRule = `Minimum charge applied (₦${limits.minCharge.toLocaleString()})`;
  } else if (basePrice > limits.maxCharge) {
    finalPrice = limits.maxCharge;
    appliedRule = `Maximum charge applied (₦${limits.maxCharge.toLocaleString()})`;
  }
  
  return {
    distance,
    ratePerKm,
    calculatedPrice: Math.round(basePrice),
    minCharge: limits.minCharge,
    maxCharge: limits.maxCharge,
    finalPrice: Math.round(finalPrice),
    breakdown: {
      baseCalculation: `${distance}km × ₦${ratePerKm}/km = ₦${Math.round(basePrice).toLocaleString()}`,
      appliedRule
    }
  };
};

export default {
  calculateDeliveryPrice,
  calculatePlatformPrice
};


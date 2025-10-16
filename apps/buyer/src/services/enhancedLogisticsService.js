import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

// Google Maps API Key (you'll need to add this to your environment variables)
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY';

class EnhancedLogisticsService {
  /**
   * Geocode an address to get coordinates and formatted address
   */
  async geocodeAddress(addressObj) {
    try {
      const addressString = `${addressObj.street}, ${addressObj.city}, ${addressObj.state}, ${addressObj.country}`;
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressString)}&key=${GOOGLE_MAPS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        return {
          success: true,
          coordinates: result.geometry.location,
          formattedAddress: result.formatted_address,
          addressComponents: result.address_components
        };
      }
      
      return { success: false, error: 'Address not found' };
    } catch (error) {
      console.error('Geocoding error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate distance between two coordinates using Google Maps Distance Matrix API
   */
  async calculateDistance(origin, destination) {
    try {
      const originString = `${origin.street}, ${origin.city}, ${origin.state}, ${origin.country}`;
      const destinationString = `${destination.street}, ${destination.city}, ${destination.state}, ${destination.country}`;
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originString)}&destinations=${encodeURIComponent(destinationString)}&key=${GOOGLE_MAPS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
        const element = data.rows[0].elements[0];
        return {
          success: true,
          distanceInMeters: element.distance.value,
          distanceInKm: (element.distance.value / 1000).toFixed(2),
          distanceText: element.distance.text,
          durationInSeconds: element.duration.value,
          durationText: element.duration.text
        };
      }
      
      return { success: false, error: 'Could not calculate distance' };
    } catch (error) {
      console.error('Distance calculation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Determine route category based on addresses
   */
  categorizeRoute(vendorAddress, buyerAddress) {
    // Normalize for comparison
    const vendorCity = vendorAddress.city?.toLowerCase().trim();
    const vendorState = vendorAddress.state?.toLowerCase().trim();
    const vendorCountry = vendorAddress.country?.toLowerCase().trim();
    
    const buyerCity = buyerAddress.city?.toLowerCase().trim();
    const buyerState = buyerAddress.state?.toLowerCase().trim();
    const buyerCountry = buyerAddress.country?.toLowerCase().trim();

    // International: Different countries
    if (vendorCountry !== buyerCountry) {
      return {
        category: 'international',
        from: `${vendorAddress.city}, ${vendorAddress.country}`,
        to: `${buyerAddress.city}, ${buyerAddress.country}`,
        description: 'International delivery (cross-border)'
      };
    }

    // Intercity: Same country, different cities
    if (vendorCity !== buyerCity) {
      return {
        category: 'intercity',
        from: `${vendorAddress.city}, ${vendorAddress.state}`,
        to: `${buyerAddress.city}, ${buyerAddress.state}`,
        description: 'Intercity delivery (between cities)'
      };
    }

    // Intracity: Same city
    return {
      category: 'intracity',
      from: vendorAddress.city,
      to: buyerAddress.city,
      description: 'Intracity delivery (within city)'
    };
  }

  /**
   * Find logistics partners with matching active routes
   */
  async findMatchingLogisticsPartners(routeCategory, vendorAddress, buyerAddress) {
    try {
      const logisticsRef = collection(db, 'logistics_routes');
      let matchingPartners = [];

      if (routeCategory.category === 'intracity') {
        // Find partners operating in the buyer's city
        const q = query(
          logisticsRef,
          where('routeType', '==', 'intracity'),
          where('serviceAreas', 'array-contains', buyerAddress.city)
        );
        
        const snapshot = await getDocs(q);
        matchingPartners = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } else if (routeCategory.category === 'intercity') {
        // Find partners with this specific intercity route
        const q = query(
          logisticsRef,
          where('routeType', '==', 'intercity'),
          where('from', '==', vendorAddress.city),
          where('to', '==', buyerAddress.city)
        );
        
        const snapshot = await getDocs(q);
        matchingPartners = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Also try reverse route
        const qReverse = query(
          logisticsRef,
          where('routeType', '==', 'intercity'),
          where('from', '==', buyerAddress.city),
          where('to', '==', vendorAddress.city)
        );
        
        const snapshotReverse = await getDocs(qReverse);
        const reversePartners = snapshotReverse.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        matchingPartners = [...matchingPartners, ...reversePartners];
      } else if (routeCategory.category === 'international') {
        // Find partners with international routes covering these countries
        const q = query(
          logisticsRef,
          where('routeType', '==', 'international'),
          where('fromCountry', '==', vendorAddress.country),
          where('toCountry', '==', buyerAddress.country)
        );
        
        const snapshot = await getDocs(q);
        matchingPartners = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      return matchingPartners;
    } catch (error) {
      console.error('Error finding matching partners:', error);
      return [];
    }
  }

  /**
   * Calculate pricing based on partner rates and distance
   */
  calculatePricing(partners, distanceInKm, routeCategory) {
    if (partners.length === 0) {
      // Use platform default pricing
      const ratePerKm = 500;
      let basePrice = distanceInKm * ratePerKm;
      
      // Apply min/max caps based on category
      if (routeCategory.category === 'intracity') {
        basePrice = Math.max(2000, Math.min(basePrice, 10000));
      } else if (routeCategory.category === 'intercity') {
        basePrice = Math.max(5000, Math.min(basePrice, 20000));
      } else {
        basePrice = Math.max(15000, basePrice); // No max for international
      }
      
      return {
        price: Math.round(basePrice),
        usingPlatformDefault: true,
        breakdown: {
          baseCalculation: `${distanceInKm}km × ₦${ratePerKm}/km = ₦${Math.round(distanceInKm * ratePerKm)}`,
          appliedRule: routeCategory.category === 'intracity' 
            ? 'Min ₦2,000, Max ₦10,000'
            : routeCategory.category === 'intercity'
            ? 'Min ₦5,000, Max ₦20,000'
            : 'Min ₦15,000'
        }
      };
    }

    // Calculate price for each partner
    const partnersWithPricing = partners.map(partner => {
      const ratePerKm = partner.ratePerKm || 500;
      let calculatedPrice = distanceInKm * ratePerKm;
      
      // Use partner's suggested price if available
      if (partner.suggestedPrice) {
        calculatedPrice = partner.suggestedPrice;
      }
      
      return {
        ...partner,
        calculatedPrice: Math.round(calculatedPrice),
        ratePerKm
      };
    });

    // Sort by price (cheapest first)
    partnersWithPricing.sort((a, b) => a.calculatedPrice - b.calculatedPrice);
    
    const cheapest = partnersWithPricing[0];
    
    return {
      price: cheapest.calculatedPrice,
      selectedPartner: cheapest,
      availablePartners: partnersWithPricing,
      usingPlatformDefault: false,
      breakdown: {
        baseCalculation: `${distanceInKm}km × ₦${cheapest.ratePerKm}/km = ₦${Math.round(distanceInKm * cheapest.ratePerKm)}`,
        appliedRule: `Partner: ${cheapest.companyName || 'Logistics Partner'}`
      }
    };
  }

  /**
   * Main function to calculate delivery with all steps
   */
  async calculateCompleteDelivery(vendorAddress, buyerAddress) {
    try {
      // Step 1: Categorize route
      const routeCategory = this.categorizeRoute(vendorAddress, buyerAddress);
      
      // Step 2: Calculate distance using Google Maps
      const distanceResult = await this.calculateDistance(vendorAddress, buyerAddress);
      
      if (!distanceResult.success) {
        return {
          success: false,
          error: 'Could not calculate distance',
          ...routeCategory
        };
      }
      
      // Step 3: Find matching logistics partners
      const partners = await this.findMatchingLogisticsPartners(routeCategory, vendorAddress, buyerAddress);
      
      // Step 4: Calculate pricing
      const pricing = this.calculatePricing(partners, parseFloat(distanceResult.distanceInKm), routeCategory);
      
      return {
        success: true,
        ...routeCategory,
        distance: parseFloat(distanceResult.distanceInKm),
        distanceText: distanceResult.distanceText,
        duration: distanceResult.durationText,
        ...pricing
      };
    } catch (error) {
      console.error('Complete delivery calculation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new EnhancedLogisticsService();


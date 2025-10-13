// Global flag to prevent multiple loads
let isGoogleMapsLoading = false;
let googleMapsLoadPromise = null;

// Google Maps service for logistics and location handling
class GoogleMapsService {
  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    this.isLoaded = false;
    this.geocoder = null;
    this.directionsService = null;
    this.directionsRenderer = null;
    this.loadAttempted = false;
  }

  // Initialize Google Maps services
  async initialize() {
    // Already successfully loaded
    if (this.isLoaded) return true;

    // Already attempted and failed
    if (this.loadAttempted && !this.isLoaded) {
      return false;
    }

    // Check if API key is configured
    if (!this.apiKey || this.apiKey === 'undefined') {
      if (!this.loadAttempted) {
        console.warn('Google Maps API key not configured. Maps features will be disabled.');
      }
      this.loadAttempted = true;
      this.isLoaded = false;
      return false;
    }

    // If already loading, wait for that to complete
    if (isGoogleMapsLoading && googleMapsLoadPromise) {
      try {
        await googleMapsLoadPromise;
        return this.isLoaded;
      } catch {
        return false;
      }
    }

    try {
      isGoogleMapsLoading = true;
      this.loadAttempted = true;

      // Load Google Maps JavaScript API
      googleMapsLoadPromise = this.loadGoogleMapsScript();
      await googleMapsLoadPromise;
      
      // Initialize services
      this.geocoder = new google.maps.Geocoder();
      this.directionsService = new google.maps.DirectionsService();
      this.directionsRenderer = new google.maps.DirectionsRenderer();
      
      this.isLoaded = true;
      console.log('Google Maps service initialized successfully');
      return true;
    } catch (error) {
      if (!this.loadAttempted) {
        console.warn('Failed to initialize Google Maps service. Maps features will be disabled.');
      }
      this.isLoaded = false;
      return false;
    } finally {
      isGoogleMapsLoading = false;
    }
  }

  // Load Google Maps JavaScript API script
  loadGoogleMapsScript() {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      // Check if script tag already exists
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        // Script is loading, wait for it
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps API')));
        return;
      }

      // Don't load if API key is missing
      if (!this.apiKey || this.apiKey === 'undefined') {
        reject(new Error('Google Maps API key not configured'));
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places,geometry&loading=async`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps API'));
      
      document.head.appendChild(script);
    });
  }

  // Geocode an address to get coordinates
  async geocodeAddress(address) {
    if (!this.isLoaded) await this.initialize();
    
    // If still not loaded after initialization attempt, return null
    if (!this.isLoaded || !this.geocoder) {
      return null;
    }

    return new Promise((resolve, reject) => {
      this.geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng(),
            address: results[0].formatted_address,
            placeId: results[0].place_id,
            components: this.parseAddressComponents(results[0].address_components)
          });
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  }

  // Parse address components for detailed location data
  parseAddressComponents(components) {
    const parsed = {};
    
    components.forEach(component => {
      const types = component.types;
      if (types.includes('street_number')) {
        parsed.streetNumber = component.long_name;
      } else if (types.includes('route')) {
        parsed.route = component.long_name;
      } else if (types.includes('locality')) {
        parsed.city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        parsed.state = component.long_name;
      } else if (types.includes('country')) {
        parsed.country = component.long_name;
      } else if (types.includes('postal_code')) {
        parsed.postalCode = component.long_name;
      }
    });

    return parsed;
  }

  // Calculate distance and route between two locations
  async calculateRoute(origin, destination, options = {}) {
    if (!this.isLoaded) await this.initialize();
    
    // If still not loaded after initialization attempt, return null
    if (!this.isLoaded || !this.directionsService) {
      return null;
    }

    const request = {
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING,
      avoidHighways: options.avoidHighways || false,
      avoidTolls: options.avoidTolls || false,
      ...options
    };

    return new Promise((resolve, reject) => {
      this.directionsService.route(request, (result, status) => {
        if (status === 'OK') {
          const route = result.routes[0];
          const leg = route.legs[0];
          
          resolve({
            distance: {
              text: leg.distance.text,
              value: leg.distance.value // in meters
            },
            duration: {
              text: leg.duration.text,
              value: leg.duration.value // in seconds
            },
            route: route,
            bounds: route.bounds,
            waypoints: route.waypoints || [],
            warnings: route.warnings || []
          });
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });
  }

  // Calculate straight-line distance between two points
  calculateStraightLineDistance(point1, point2) {
    if (!this.isLoaded) {
      throw new Error('Google Maps service not initialized');
    }

    const from = new google.maps.LatLng(point1.lat, point1.lng);
    const to = new google.maps.LatLng(point2.lat, point2.lng);
    
    const distance = google.maps.geometry.spherical.computeDistanceBetween(from, to);
    
    return {
      distance: distance, // in meters
      distanceKm: distance / 1000,
      distanceMiles: distance * 0.000621371
    };
  }

  // Determine route type (intra-city, inter-city, etc.)
  async analyzeRouteType(pickupLocation, deliveryLocation) {
    try {
      // Check if Maps is loaded
      if (!this.isLoaded) {
        console.warn('Google Maps not loaded, returning default route analysis');
        return null;
      }

      // Geocode both locations
      const [pickup, delivery] = await Promise.all([
        this.geocodeAddress(pickupLocation),
        this.geocodeAddress(deliveryLocation)
      ]);

      // Check if geocoding failed
      if (!pickup || !delivery || !pickup.components || !delivery.components) {
        console.warn('Geocoding failed, cannot analyze route');
        return null;
      }

      // Calculate route
      const route = await this.calculateRoute(pickupLocation, deliveryLocation);
      
      // Check if route calculation failed
      if (!route || !route.distance || !route.duration) {
        console.warn('Route calculation failed');
        return null;
      }
      
      // Analyze route type
      const isSameCity = pickup.components.city === delivery.components.city;
      const isSameState = pickup.components.state === delivery.components.state;
      const distanceKm = route.distance.value / 1000;

      let routeType = 'interstate';
      
      if (isSameCity) {
        if (distanceKm <= 10) {
          routeType = 'intracity_short'; // 0-10km within city
        } else if (distanceKm <= 30) {
          routeType = 'intracity_long'; // 10-30km within city
        } else {
          routeType = 'intracity_extended'; // 30km+ within city
        }
      } else if (isSameState) {
        routeType = 'intercity'; // Different cities, same state
      }

      return {
        routeType,
        distance: route.distance,
        duration: route.duration,
        pickup,
        delivery,
        isSameCity,
        isSameState,
        distanceKm,
        route
      };
    } catch (error) {
      console.error('Error analyzing route type:', error);
      return null;
    }
  }

  // Get optimized logistics pricing based on route analysis
  async getOptimizedPricing(pickupLocation, deliveryLocation, deliveryData = {}) {
    try {
      const routeAnalysis = await this.analyzeRouteType(pickupLocation, deliveryLocation);
      
      // If route analysis failed, return null to trigger fallback pricing
      if (!routeAnalysis) {
        console.warn('Route analysis unavailable, caller should use fallback pricing');
        return null;
      }
      
      // Base pricing structure
      const basePricing = {
        intracity_short: {
          baseRate: 500,
          perKmRate: 80,
          minCost: 500,
          maxCost: 2000
        },
        intracity_long: {
          baseRate: 800,
          perKmRate: 120,
          minCost: 800,
          maxCost: 4000
        },
        intracity_extended: {
          baseRate: 1200,
          perKmRate: 150,
          minCost: 1200,
          maxCost: 6000
        },
        intercity: {
          baseRate: 1500,
          perKmRate: 200,
          minCost: 1500,
          maxCost: 15000
        },
        interstate: {
          baseRate: 3000,
          perKmRate: 250,
          minCost: 3000,
          maxCost: 50000
        }
      };

      const pricing = basePricing[routeAnalysis.routeType] || basePricing.interstate;
      
      // Calculate base cost
      let cost = pricing.baseRate + (routeAnalysis.distanceKm * pricing.perKmRate);
      
      // Apply delivery type multipliers
      const deliveryMultipliers = {
        same_day: 2.5,
        express: 2.0,
        standard: 1.0,
        economy: 0.8,
        overnight: 1.5
      };
      
      const deliveryType = deliveryData.deliveryType || 'standard';
      cost *= deliveryMultipliers[deliveryType] || 1.0;
      
      // Apply weight multiplier
      const weight = deliveryData.weight || 1;
      let weightMultiplier = 1;
      if (weight <= 1) weightMultiplier = 0.9;
      else if (weight <= 5) weightMultiplier = 1.0;
      else if (weight <= 10) weightMultiplier = 1.3;
      else if (weight <= 20) weightMultiplier = 1.6;
      else weightMultiplier = 2.0;
      
      cost *= weightMultiplier;
      
      // Apply special charges
      let specialCharges = 0;
      if (deliveryData.isFragile) specialCharges += 200;
      if (deliveryData.requiresSignature) specialCharges += 100;
      if (deliveryData.itemValue > 10000) specialCharges += 300;
      
      cost += specialCharges;
      
      // Apply bounds
      const finalCost = Math.max(pricing.minCost, Math.min(pricing.maxCost, Math.round(cost)));
      
      return {
        cost: finalCost,
        routeAnalysis,
        pricing,
        breakdown: {
          baseCost: pricing.baseRate + (routeAnalysis.distanceKm * pricing.perKmRate),
          deliveryMultiplier: deliveryMultipliers[deliveryType] || 1.0,
          weightMultiplier,
          specialCharges,
          finalCost
        }
      };
    } catch (error) {
      console.error('Error calculating optimized pricing:', error);
      throw error;
    }
  }

  // Create a map instance for displaying routes
  createMap(element, options = {}) {
    if (!this.isLoaded) {
      throw new Error('Google Maps service not initialized');
    }

    const defaultOptions = {
      zoom: 13,
      center: { lat: 6.5244, lng: 3.3792 }, // Lagos, Nigeria default
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      ...options
    };

    return new google.maps.Map(element, defaultOptions);
  }

  // Display route on map
  displayRoute(map, origin, destination, options = {}) {
    if (!this.isLoaded) {
      throw new Error('Google Maps service not initialized');
    }

    this.directionsRenderer.setMap(map);
    
    const request = {
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING,
      ...options
    };

    this.directionsService.route(request, (result, status) => {
      if (status === 'OK') {
        this.directionsRenderer.setDirections(result);
      } else {
        console.error('Directions request failed:', status);
      }
    });
  }

  // Get nearby logistics partners based on location
  async getNearbyLogisticsPartners(location, radius = 50) {
    try {
      // This would typically query your database for logistics partners
      // For now, return mock data
      return [
        {
          id: 'partner1',
          name: 'Lagos Express',
          location: 'Lagos, Nigeria',
          rating: 4.5,
          distance: '2.5 km',
          specialties: ['intracity', 'express'],
          baseRate: 500,
          perKmRate: 100
        },
        {
          id: 'partner2',
          name: 'Nigeria Logistics',
          location: 'Lagos, Nigeria',
          rating: 4.2,
          distance: '5.1 km',
          specialties: ['intercity', 'heavy_freight'],
          baseRate: 800,
          perKmRate: 150
        }
      ];
    } catch (error) {
      console.error('Error fetching nearby logistics partners:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const googleMapsService = new GoogleMapsService();
export default googleMapsService;

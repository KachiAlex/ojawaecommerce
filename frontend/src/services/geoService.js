/**
 * Geo Service - Google Maps primary (via backend), Mapbox fallback
 * Backend /api/logistics/geocode + /api/logistics/route use the Google Maps
 * API key server-side. If the backend call fails, we fall back to the
 * Mapbox client-side APIs (VITE_MAPBOX_TOKEN).
 */

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const MAPBOX_GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const MAPBOX_DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox';
const API_BASE = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

// Custom error classes for compatibility
export class GeoError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'GeoError';
    this.code = code;
    this.details = details;
  }
}

export class GeoApiKeyError extends GeoError {
  constructor(message, details) {
    super(message, 'API_KEY_ERROR', details);
    this.name = 'GeoApiKeyError';
  }
}

export class GeoNetworkError extends GeoError {
  constructor(message, details) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'GeoNetworkError';
  }
}

// Re-export old class names for backward compatibility
export const GoogleMapsError = GeoError;
export const GoogleMapsApiKeyError = GeoApiKeyError;
export const GoogleMapsNetworkError = GeoNetworkError;
export const GoogleMapsPermissionError = GeoError;

class GeoService {
  constructor() {
    this.isLoaded = true;
    this.geocoder = null;
    this.directionsService = null;
    this.directionsRenderer = null;
    this.loadAttempted = true;
    this.lastError = null;
  }

  async initialize() {
    this.isLoaded = true;
    return true;
  }

  // Geocode an address to get coordinates.
  // Backend endpoint tries Google first, then Nominatim; Mapbox is the
  // client-side fallback when the backend is unreachable.
  async geocodeAddress(address) {
    if (!address) return null;

    const tryBackendGeocode = async (q) => {
      try {
        const res = await fetch(`${API_BASE}/api/logistics/geocode?address=${encodeURIComponent(q)}`);
        if (!res.ok) return null;
        const data = await res.json();
        const result = data?.data;
        if (!result || result.lat == null) return null;
        return {
          lat: result.lat,
          lng: result.lng,
          address: result.formattedAddress,
          placeId: null,
          addresstype: this.mapGoogleAddressType(result),
          components: this.parseGoogleAddressComponents(result.addressComponents || []),
          provider: result.provider || 'google'
        };
      } catch (error) {
        return null;
      }
    };

    const tryGeocode = async (q) => {
      const backendResult = await tryBackendGeocode(q);
      if (backendResult) return backendResult;
      if (!MAPBOX_TOKEN) return null;
      try {
        const url = `${MAPBOX_GEOCODING_URL}/${encodeURIComponent(q)}.json?access_token=${MAPBOX_TOKEN}&country=ng&limit=1`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.features || data.features.length === 0) return null;
        const result = data.features[0];
        const components = this.parseAddressComponents(result);
        return {
          lat: result.center[1],
          lng: result.center[0],
          address: result.place_name,
          placeId: result.id,
          addresstype: result.place_type?.[0] || 'unknown',
          components,
          provider: 'mapbox'
        };
      } catch (error) {
        return null;
      }
    };

    const addrStr = typeof address === 'string'
      ? address
      : `${address.street || ''}, ${address.city || ''}, ${address.state || ''}, ${address.country || 'Nigeria'}`;

    // Try the full address first
    const result = await tryGeocode(addrStr);
    if (result) return result;

    // Progressive fallback: try simpler queries
    const parts = addrStr.split(',').map(p => p.trim()).filter(Boolean);

    if (parts.length >= 3) {
      // Try area + city
      const r = await tryGeocode(`${parts[parts.length - 3]}, ${parts[parts.length - 2]}, Nigeria`);
      if (r) return r;
    }
    if (parts.length >= 2) {
      // Try city + country
      const r = await tryGeocode(`${parts[parts.length - 2]}, Nigeria`);
      if (r) return r;
    }

    return null;
  }

  // Map Google result types/location_type to the addresstype values the
  // precision-correction logic understands
  mapGoogleAddressType(result) {
    const types = result?.types || [];
    if (types.includes('street_address') || types.includes('premise') || types.includes('subpremise') ||
        types.includes('route') || types.includes('intersection')) return 'address';
    if (types.includes('point_of_interest') || types.includes('establishment')) return 'poi';
    if (types.includes('neighborhood') || types.includes('sublocality') || types.includes('sublocality_level_1')) return 'neighborhood';
    if (types.includes('locality') || types.includes('postal_town') || types.includes('administrative_area_level_2')) return 'city';
    if (types.includes('administrative_area_level_1')) return 'region';
    if (types.includes('country')) return 'country';
    // No usable types — fall back to location_type granularity
    if (result?.locationType === 'ROOFTOP') return 'address';
    if (result?.locationType === 'GEOMETRIC_CENTER' || result?.locationType === 'RANGE_INTERPOLATED') return 'neighborhood';
    return 'place';
  }

  // Parse Google address_components into the same shape parseAddressComponents returns
  parseGoogleAddressComponents(components) {
    const parts = {
      streetNumber: '',
      route: '',
      city: '',
      state: '',
      country: '',
      postalCode: ''
    };
    for (const c of components || []) {
      const t = c.types || [];
      if (t.includes('street_number')) parts.streetNumber = c.long_name;
      else if (t.includes('route')) parts.route = c.long_name;
      else if (t.includes('locality') || t.includes('postal_town') || t.includes('sublocality')) {
        if (!parts.city) parts.city = c.long_name;
      } else if (t.includes('administrative_area_level_1')) parts.state = c.long_name;
      else if (t.includes('country')) parts.country = c.long_name;
      else if (t.includes('postal_code')) parts.postalCode = c.long_name;
    }
    return parts;
  }

  // Parse Mapbox address components into a consistent format
  parseAddressComponents(feature) {
    if (!feature) return {};
    const parts = {
      streetNumber: '',
      route: '',
      city: '',
      state: '',
      country: '',
      postalCode: ''
    };

    // Street from text + address
    if (feature.address) {
      parts.streetNumber = feature.address;
      parts.route = feature.text || '';
    } else if (feature.place_type?.includes('address') || feature.place_type?.includes('poi')) {
      parts.route = feature.text || '';
    }

    // Parse context array
    for (const ctx of feature.context || []) {
      const id = ctx.id || '';
      if (id.includes('place') || id.includes('locality') || id.includes('neighborhood')) {
        if (!parts.city) parts.city = ctx.text;
      }
      if (id.includes('region')) {
        parts.state = ctx.text;
      }
      if (id.includes('country')) {
        parts.country = ctx.text;
      }
      if (id.includes('postcode')) {
        parts.postalCode = ctx.text;
      }
    }

    return parts;
  }

  // Calculate distance using coordinates directly (no geocoding needed)
  async calculateRouteFromCoords(originCoords, destCoords, options = {}) {
    try {
      if (!originCoords || !destCoords || !originCoords.lat || !destCoords.lat) {
        return null;
      }

      const originGeo = { lat: originCoords.lat, lng: originCoords.lng, addresstype: 'precise', components: {} };
      const destGeo = { lat: destCoords.lat, lng: destCoords.lng, addresstype: 'precise', components: {} };

      return await this._computeRoute(originGeo, destGeo, options);
    } catch (error) {
      console.error('Route calculation from coords error:', error);
      return null;
    }
  }

  // Internal: compute route distance from geocoded coordinates using Mapbox Directions API
  async _computeRoute(originGeo, destGeo, options = {}) {
    // Detect precision level of geocoding results
    const originImprecise = ['city', 'state', 'country', 'administrative', 'place', 'region'].includes(originGeo.addresstype);
    const destImprecise = ['city', 'state', 'country', 'administrative', 'place', 'region'].includes(destGeo.addresstype);

    // Always calculate Haversine as a baseline/sanity check
    const haversine = this.calculateStraightLineDistance(originGeo, destGeo);

    // Backend route endpoint tries Google Directions first, OSRM second;
    // Mapbox Directions is the client-side fallback.
    const profile = options.travelMode === 'foot' ? 'walking' : 'driving';

    let routeDistance = null;
    let routeDuration = null;
    let routeProvider = null;
    try {
      const res = await fetch(
        `${API_BASE}/api/logistics/route?originLat=${originGeo.lat}&originLng=${originGeo.lng}&destLat=${destGeo.lat}&destLng=${destGeo.lng}&mode=${profile}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.data?.distanceMeters > 0) {
          routeDistance = data.data.distanceMeters;
          routeDuration = data.data.durationSeconds;
          routeProvider = data.data.provider === 'google' ? 'google-directions' : 'osrm';
        }
      }
    } catch (e) {
      // Backend route failed, will try Mapbox
    }

    if (!routeDistance && MAPBOX_TOKEN) {
      const coords = `${originGeo.lng},${originGeo.lat};${destGeo.lng},${destGeo.lat}`;
      const mapboxUrl = `${MAPBOX_DIRECTIONS_URL}/${profile}/${coords}?access_token=${MAPBOX_TOKEN}&overview=false&steps=false&annotations=distance,duration`;
      try {
        const res = await fetch(mapboxUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            routeDistance = data.routes[0].distance; // meters
            routeDuration = data.routes[0].duration; // seconds
            routeProvider = 'mapbox-directions';
          }
        }
      } catch (e) {
        // Mapbox Directions failed, will use Haversine
      }
    }

    let finalDistanceMeters;
    let finalDurationSeconds;
    let method;

    if (routeDistance && routeDistance > 0) {
      const ratio = routeDistance / haversine.distance;
      if (ratio > 1.5) {
        // Route distance is unreasonable compared to straight line
        finalDistanceMeters = haversine.distance * 1.3;
        finalDurationSeconds = (haversine.distanceKm * 1.3) * 2 * 60;
        method = 'haversine-corrected';
      } else {
        finalDistanceMeters = routeDistance;
        finalDurationSeconds = routeDuration;
        method = routeProvider || 'mapbox-directions';
      }
    } else {
      finalDistanceMeters = haversine.distance * 1.3;
      finalDurationSeconds = haversine.distanceKm * 1.3 * 2 * 60;
      method = 'haversine-estimated';
    }

    // Precision correction: if one or both geocoding results fell back to city-level,
    // the calculated distance is likely inflated because we're measuring from city center.
    if (originImprecise || destImprecise) {
      const originCity = originGeo.components?.city?.toLowerCase() || '';
      const destCity = destGeo.components?.city?.toLowerCase() || '';
      const originState = originGeo.components?.state?.toLowerCase() || '';
      const destState = destGeo.components?.state?.toLowerCase() || '';

      const sameCity = originCity && destCity && originCity === destCity;
      const sameState = originState && destState && originState === destState;

      if (sameCity) {
        const maxIntracityMeters = 15000;
        if (finalDistanceMeters > maxIntracityMeters) {
          finalDistanceMeters = maxIntracityMeters;
          finalDurationSeconds = (finalDistanceMeters / 1000) * 2 * 60;
          method = 'intracity-capped';
        }
      } else if (sameState) {
        const maxIntercityMeters = 50000;
        if (finalDistanceMeters > maxIntercityMeters) {
          finalDistanceMeters = maxIntercityMeters;
          finalDurationSeconds = (finalDistanceMeters / 1000) * 2 * 60;
          method = 'intercity-capped';
        }
      }
    }

    return {
      distance: {
        text: `${(finalDistanceMeters / 1000).toFixed(1)} km`,
        value: Math.round(finalDistanceMeters)
      },
      duration: {
        text: `${Math.round(finalDurationSeconds / 60)} min`,
        value: Math.round(finalDurationSeconds)
      },
      route: null,
      bounds: null,
      waypoints: [],
      warnings: [],
      method
    };
  }

  // Calculate distance and route between two locations using Mapbox Directions
  async calculateRoute(origin, destination, options = {}) {
    try {
      // Geocode both addresses to get coordinates
      const [originGeo, destGeo] = await Promise.all([
        this.geocodeAddress(origin),
        this.geocodeAddress(destination)
      ]);

      if (!originGeo || !destGeo) {
        return null;
      }

      return await this._computeRoute(originGeo, destGeo, options);
    } catch (error) {
      console.error('Route calculation error:', error);
      return null;
    }
  }

  // Calculate straight-line distance between two points (Haversine)
  calculateStraightLineDistance(point1, point2) {
    const R = 6371000; // Earth's radius in meters
    const toRad = (deg) => deg * (Math.PI / 180);

    const dLat = toRad(point2.lat - point1.lat);
    const dLon = toRad(point2.lng - point1.lng);
    const lat1 = toRad(point1.lat);
    const lat2 = toRad(point2.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return {
      distance: distance, // in meters
      distanceKm: distance / 1000,
      distanceMiles: distance * 0.000621371
    };
  }

  // Determine route type (intra-city, inter-city, etc.)
  async analyzeRouteType(pickupLocation, deliveryLocation) {
    try {
      const [pickup, delivery] = await Promise.all([
        this.geocodeAddress(pickupLocation),
        this.geocodeAddress(deliveryLocation)
      ]);

      if (!pickup || !delivery) return null;

      const route = await this.calculateRoute(pickupLocation, deliveryLocation);
      const distanceKm = route ? route.distance.value / 1000 :
        this.calculateStraightLineDistance(pickup, delivery).distanceKm;

      const isSameCity = pickup.components.city === delivery.components.city && !!pickup.components.city;
      const isSameState = pickup.components.state === delivery.components.state && !!pickup.components.state;

      let routeType = 'interstate';
      if (isSameCity) {
        if (distanceKm <= 10) routeType = 'intracity_short';
        else if (distanceKm <= 30) routeType = 'intracity_long';
        else routeType = 'intracity_extended';
      } else if (isSameState) {
        routeType = 'intercity';
      }

      return {
        routeType,
        distance: route ? route.distance : { text: `${distanceKm.toFixed(1)} km`, value: distanceKm * 1000 },
        duration: route ? route.duration : { text: `${Math.round(distanceKm * 2)} min`, value: distanceKm * 2 * 60 },
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

      if (!routeAnalysis) {
        return null;
      }

      const basePricing = {
        intracity_short: { baseRate: 500, perKmRate: 80, minCost: 500, maxCost: 2000 },
        intracity_long: { baseRate: 800, perKmRate: 120, minCost: 800, maxCost: 4000 },
        intracity_extended: { baseRate: 1200, perKmRate: 150, minCost: 1200, maxCost: 6000 },
        intercity: { baseRate: 1500, perKmRate: 200, minCost: 1500, maxCost: 15000 },
        interstate: { baseRate: 3000, perKmRate: 250, minCost: 3000, maxCost: 50000 }
      };

      const pricing = basePricing[routeAnalysis.routeType] || basePricing.interstate;
      let cost = pricing.baseRate + (routeAnalysis.distanceKm * pricing.perKmRate);

      const deliveryMultipliers = {
        same_day: 2.5, express: 2.0, standard: 1.0, economy: 0.8, overnight: 1.5
      };
      const deliveryType = deliveryData.deliveryType || 'standard';
      cost *= deliveryMultipliers[deliveryType] || 1.0;

      const weight = deliveryData.weight || 1;
      let weightMultiplier = 1;
      if (weight <= 1) weightMultiplier = 0.9;
      else if (weight <= 5) weightMultiplier = 1.0;
      else if (weight <= 10) weightMultiplier = 1.3;
      else if (weight <= 20) weightMultiplier = 1.6;
      else weightMultiplier = 2.0;
      cost *= weightMultiplier;

      let specialCharges = 0;
      if (deliveryData.isFragile) specialCharges += 200;
      if (deliveryData.requiresSignature) specialCharges += 100;
      if (deliveryData.itemValue > 10000) specialCharges += 300;
      cost += specialCharges;

      const finalCost = Math.max(pricing.minCost, Math.min(pricing.maxCost, Math.round(cost)));

      return {
        cost: finalCost,
        routeAnalysis,
        pricing,
        breakdown: {
          baseCost: pricing.baseRate + (routeAnalysis.distanceKm * pricing.perKmRate),
          deliveryMultiplier: (deliveryMultipliers[deliveryType] || 1.0),
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

  // Create a map instance - returns a placeholder object for compatibility
  // Real map rendering would use Leaflet/OpenStreetMap, but we return a stub
  // since the RouteVisualization component will be updated to use static maps
  createMap(element, options = {}) {
    return {
      element,
      setCenter: () => {},
      setZoom: () => {},
      fitBounds: () => {}
    };
  }

  // Display route on map - stub for compatibility
  displayRoute(map, origin, destination, options = {}) {
    // No-op - RouteVisualization handles display via OpenStreetMap embed
  }

  // Get nearby logistics partners
  async getNearbyLogisticsPartners(location, radius = 50) {
    try {
      const searchRadius = Math.max(radius, 1);
      return [
        {
          id: 'partner1',
          name: 'Lagos Express',
          location: 'Lagos, Nigeria',
          rating: 4.5,
          distance: `${Math.min(searchRadius * 0.05, 5).toFixed(1)} km`,
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
      return [];
    }
  }
}

// Export singleton instance
export const geoService = new GeoService();
export default geoService;

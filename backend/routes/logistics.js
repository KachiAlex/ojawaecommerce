const express = require('express');
const { body, query, validationResult } = require('express-validator');
const axios = require('axios');
const { Op } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { getShippingRates, getTrackingInfo } = require('../services/shippingService');
const { LogisticsRoute, Order, User, Notification } = require('../models');
const router = express.Router();

// Google Maps Platform helpers (GOOGLE_MAPS_API_KEY). Google is tried first when
// the key is set; the existing Nominatim/Mapbox/OSRM code stays as fallback.
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const GOOGLE_DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';

const googleGeocode = async (address) => {
  if (!GOOGLE_MAPS_API_KEY) return null;
  const q = typeof address === 'string'
    ? address
    : `${address.city || ''}, ${address.state || ''}, ${address.country || 'Nigeria'}`;
  try {
    const resp = await axios.get(GOOGLE_GEOCODE_URL, {
      params: { address: q, region: 'ng', key: GOOGLE_MAPS_API_KEY },
      timeout: 10000
    });
    const result = resp.data && resp.data.results && resp.data.results[0];
    if (resp.data.status !== 'OK' || !result) return null;
    const loc = result.geometry.location;
    return {
      lat: loc.lat,
      lng: loc.lng,
      formattedAddress: result.formatted_address,
      types: result.types || [],
      locationType: result.geometry.location_type || null,
      addressComponents: result.address_components || []
    };
  } catch (e) {
    return null;
  }
};

// Returns { distanceMeters, durationSeconds, legs } or null.
const googleDirections = async (originGeo, destGeo, mode = 'driving', waypoints = [], optimize = false) => {
  if (!GOOGLE_MAPS_API_KEY || !originGeo || !destGeo) return null;
  try {
    const params = {
      origin: `${originGeo.lat},${originGeo.lng}`,
      destination: `${destGeo.lat},${destGeo.lng}`,
      mode,
      region: 'ng',
      key: GOOGLE_MAPS_API_KEY
    };
    if (Array.isArray(waypoints) && waypoints.length > 0) {
      params.waypoints = (optimize ? 'optimize:true|' : '') +
        waypoints.map(w => `${w.lat},${w.lng}`).join('|');
    }
    const resp = await axios.get(GOOGLE_DIRECTIONS_URL, { params, timeout: 15000 });
    if (resp.data.status !== 'OK' || !resp.data.routes || !resp.data.routes[0]) return null;
    const route = resp.data.routes[0];
    const distanceMeters = route.legs.reduce((s, l) => s + (l.distance ? l.distance.value : 0), 0);
    const durationSeconds = route.legs.reduce((s, l) => s + (l.duration ? l.duration.value : 0), 0);
    return {
      distanceMeters,
      durationSeconds,
      legs: route.legs,
      waypointOrder: route.waypoint_order || null,
      polyline: route.overview_polyline ? route.overview_polyline.points : null
    };
  } catch (e) {
    return null;
  }
};

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * @route   GET /api/logistics/geocode
 * @desc    Geocode an address - Google Maps first, Nominatim fallback
 * @access  Public
 */
router.get('/geocode', [
  query('address').isString().trim().isLength({ min: 2, max: 300 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const address = req.query.address;
  const google = await googleGeocode(address);
  if (google) {
    return res.json({ success: true, data: { ...google, provider: 'google' } });
  }

  const params = new URLSearchParams({ q: address, format: 'json', limit: '1', countrycodes: 'ng' });
  const resp = await axios.get(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'ojawa-ecommerce/1.0' },
    timeout: 10000
  });
  const hit = resp.data && resp.data[0];
  if (!hit) {
    return res.status(404).json({ success: false, error: 'Address not found' });
  }
  res.json({
    success: true,
    data: {
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
      formattedAddress: hit.display_name,
      provider: 'nominatim'
    }
  });
}));

/**
 * @route   GET /api/logistics/route
 * @desc    Route distance/duration between two coords - Google Directions first, OSRM fallback
 * @access  Public
 */
router.get('/route', [
  query('originLat').isFloat({ min: -90, max: 90 }),
  query('originLng').isFloat({ min: -180, max: 180 }),
  query('destLat').isFloat({ min: -90, max: 90 }),
  query('destLng').isFloat({ min: -180, max: 180 }),
  query('mode').optional().isIn(['driving', 'walking']),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const origin = { lat: parseFloat(req.query.originLat), lng: parseFloat(req.query.originLng) };
  const dest = { lat: parseFloat(req.query.destLat), lng: parseFloat(req.query.destLng) };
  const mode = req.query.mode === 'walking' ? 'walking' : 'driving';

  const google = await googleDirections(origin, dest, mode);
  if (google) {
    return res.json({
      success: true,
      data: {
        distanceMeters: google.distanceMeters,
        durationSeconds: google.durationSeconds,
        polyline: google.polyline,
        provider: 'google'
      }
    });
  }

  const profile = mode === 'walking' ? 'foot' : 'driving';
  const osrmResp = await axios.get(
    `https://router.project-osrm.org/route/v1/${profile}/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=false&steps=false`,
    { timeout: 15000 }
  );
  const route = osrmResp.data && osrmResp.data.routes && osrmResp.data.routes[0];
  if (osrmResp.data.code !== 'Ok' || !route) {
    return res.status(404).json({ success: false, error: 'No route found' });
  }
  res.json({
    success: true,
    data: {
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      polyline: null,
      provider: 'osrm'
    }
  });
}));

/**
 * @route   POST /api/logistics/optimize-route
 * @desc    Optimize delivery route using OpenStreetMap/OSRM
 * @access  Private
 */
router.post('/optimize-route', authenticateToken, [
  body('origin').notEmpty(),
  body('destination').notEmpty(),
  body('waypoints').optional().isArray(),
  body('optimize').optional().isBoolean(),
  body('travelMode').optional().isIn(['DRIVE', 'WALK', 'BICYCLE', 'TRANSIT']),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const {
    origin,
    destination,
    waypoints = [],
    optimize = true,
    travelMode = 'DRIVE'
  } = req.body;

  try {
    // Geocode addresses using Nominatim
    const geocodeAddress = async (address) => {
      const google = await googleGeocode(address);
      if (google) return google;
      const q = typeof address === 'string' ? address : `${address.city || ''}, ${address.state || ''}, ${address.country || 'Nigeria'}`;
      const params = new URLSearchParams({ q, format: 'json', limit: '1' });
      const resp = await axios.get(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'ojawa-ecommerce/1.0' },
        timeout: 10000
      });
      if (!resp.data || resp.data.length === 0) return null;
      return { lat: parseFloat(resp.data[0].lat), lng: parseFloat(resp.data[0].lon) };
    };

    const [originGeo, destGeo] = await Promise.all([
      geocodeAddress(origin),
      geocodeAddress(destination)
    ]);

    if (!originGeo || !destGeo) {
      throw new AppError('Could not geocode one or both addresses', 404);
    }

    // Build OSRM coordinates string (origin; waypoints...; destination)
    const allCoords = [originGeo];
    if (Array.isArray(waypoints) && waypoints.length > 0) {
      const waypointGeos = await Promise.all(waypoints.map(wp => geocodeAddress(typeof wp === 'string' ? wp : (wp.location || wp))));
      waypointGeos.forEach(g => { if (g) allCoords.push(g); });
    }
    allCoords.push(destGeo);

    const modeMap = { DRIVE: 'driving', WALK: 'walking', BICYCLE: 'bicycling', TRANSIT: 'transit' };
    const googleRoute = await googleDirections(
      originGeo, destGeo, modeMap[travelMode] || 'driving',
      allCoords.slice(1, -1), optimize
    );

    if (googleRoute) {
      return res.json({
        success: true,
        data: {
          routes: [{
            distance: googleRoute.distanceMeters,
            duration: `${googleRoute.durationSeconds}s`,
            polyline: googleRoute.polyline,
            optimizedWaypointOrder: googleRoute.waypointOrder,
            legs: (googleRoute.legs || []).map(leg => ({
              startAddress: leg.start_address || '',
              endAddress: leg.end_address || '',
              distance: leg.distance ? leg.distance.value : 0,
              duration: leg.duration ? `${leg.duration.value}s` : '0s',
              steps: (leg.steps || []).map(step => ({
                instruction: step.html_instructions ? step.html_instructions.replace(/<[^>]*>/g, '') : '',
                distance: step.distance ? step.distance.value : 0,
                duration: step.duration ? `${step.duration.value}s` : '0s'
              }))
            })),
            warnings: []
          }],
          warnings: []
        }
      });
    }

    const coordsStr = allCoords.map(c => `${c.lng},${c.lat}`).join(';');
    const profile = travelMode === 'WALK' || travelMode === 'BICYCLE' ? 'foot' : 'driving';
    const osrmResp = await axios.get(
      `https://router.project-osrm.org/route/v1/${profile}/${coordsStr}?overview=full&steps=true`,
      { timeout: 15000 }
    );

    if (osrmResp.data.code !== 'Ok' || !osrmResp.data.routes || osrmResp.data.routes.length === 0) {
      throw new AppError('No routes found', 404);
    }

    const route = osrmResp.data.routes[0];

    const processedRoute = {
      distance: route.distance,
      duration: `${route.duration}s`,
      polyline: null,
      optimizedWaypointOrder: null,
      legs: route.legs ? route.legs.map(leg => ({
        startAddress: '',
        endAddress: '',
        distance: leg.distance,
        duration: `${leg.duration}s`,
        steps: leg.steps ? leg.steps.map(step => ({
          instruction: step.maneuver ? step.maneuver.type : '',
          distance: step.distance,
          duration: `${step.duration}s`
        })) : []
      })) : [],
      warnings: []
    };

    res.json({
      success: true,
      data: {
        routes: [processedRoute],
        warnings: []
      }
    });

  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.code === 'ECONNABORTED') {
      throw new AppError('Route optimization timeout', 504);
    }
    throw new AppError('Failed to optimize route', 500);
  }
}));

/**
 * @route   POST /api/logistics/shipping-cost
 * @desc    Calculate shipping cost based on distance and weight
 * @access  Public
 */
router.post('/shipping-cost', [
  body('origin').notEmpty(),
  body('destination').notEmpty(),
  body('weight').optional().isFloat({ min: 0 }),
  body('dimensions').optional().isObject(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const {
    origin,
    destination,
    weight = 1, // kg
    dimensions = { length: 10, width: 10, height: 10 }, // cm
    deliveryType = 'standard'
  } = req.body;

  try {
    // Geocode both addresses using Nominatim (free, no API key)
    const geocodeAddress = async (address) => {
      const google = await googleGeocode(address);
      if (google) return google;
      const q = typeof address === 'string' ? address : `${address.city || ''}, ${address.state || ''}, ${address.country || 'Nigeria'}`;
      const params = new URLSearchParams({ q, format: 'json', limit: '1' });
      const resp = await axios.get(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'ojawa-ecommerce/1.0' },
        timeout: 10000
      });
      if (!resp.data || resp.data.length === 0) return null;
      return { lat: parseFloat(resp.data[0].lat), lng: parseFloat(resp.data[0].lon) };
    };

    const [originGeo, destGeo] = await Promise.all([
      geocodeAddress(origin),
      geocodeAddress(destination)
    ]);

    let distance = 0;
    let duration = 0;

    if (originGeo && destGeo) {
      const googleRoute = await googleDirections(originGeo, destGeo);
      if (googleRoute) {
        distance = googleRoute.distanceMeters;
        duration = googleRoute.durationSeconds;
      } else {
      // Use OSRM for routing (free, no API key)
      const coords = `${originGeo.lng},${originGeo.lat};${destGeo.lng},${destGeo.lat}`;
      const osrmResp = await axios.get(
        `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`,
        { timeout: 10000 }
      );

      if (osrmResp.data.code === 'Ok' && osrmResp.data.routes && osrmResp.data.routes.length > 0) {
        distance = osrmResp.data.routes[0].distance || 0; // meters
        duration = osrmResp.data.routes[0].duration || 0; // seconds
      } else {
        // Fallback: Haversine straight-line distance
        const R = 6371000;
        const toRad = (d) => d * (Math.PI / 180);
        const dLat = toRad(destGeo.lat - originGeo.lat);
        const dLon = toRad(destGeo.lng - originGeo.lng);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(originGeo.lat)) * Math.cos(toRad(destGeo.lat)) * Math.sin(dLon / 2) ** 2;
        distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        duration = (distance / 1000) * 120 * 60; // ~120 km/h estimate
      }
      }
    }

    // Calculate shipping cost based on distance, weight, and dimensions
    const distanceKm = distance / 1000;
    const volumetricWeight = (dimensions.length * dimensions.width * dimensions.height) / 5000;
    const chargeableWeight = Math.max(weight, volumetricWeight);

    // Base pricing tiers
    const baseRates = {
      standard: { baseFee: 500, perKm: 50, weightMultiplier: 20 },
      express: { baseFee: 1000, perKm: 100, weightMultiplier: 40 },
      same_day: { baseFee: 2000, perKm: 150, weightMultiplier: 60 }
    };

    const rate = baseRates[deliveryType] || baseRates.standard;
    
    let shippingCost = rate.baseFee;
    shippingCost += distanceKm * rate.perKm;
    shippingCost += chargeableWeight * rate.weightMultiplier;

    // Add surcharges for special conditions
    if (distanceKm > 100) {
      shippingCost *= 1.2;
    }

    if (chargeableWeight > 10) {
      shippingCost *= 1.15;
    }

    // Ensure minimum cost
    shippingCost = Math.max(shippingCost, rate.baseFee);

    // Round to nearest 50
    shippingCost = Math.ceil(shippingCost / 50) * 50;

    const estimatedDelivery = getEstimatedDeliveryTime(deliveryType, duration);

    res.json({
      success: true,
      data: {
        origin,
        destination,
        distance: {
          meters: distance,
          kilometers: Math.round(distanceKm * 100) / 100,
          text: `${Math.round(distanceKm * 100) / 100} km`
        },
        duration: {
          seconds: duration,
          text: `${Math.round(duration / 60)} mins`
        },
        weight: {
          actual: weight,
          volumetric: Math.round(volumetricWeight * 100) / 100,
          chargeable: Math.round(chargeableWeight * 100) / 100
        },
        shipping: {
          cost: shippingCost,
          type: deliveryType,
          estimatedDelivery,
          breakdown: {
            baseFee: rate.baseFee,
            distanceCost: Math.round(distanceKm * rate.perKm),
            weightCost: Math.round(chargeableWeight * rate.weightMultiplier),
            surcharges: shippingCost - (rate.baseFee + (distanceKm * rate.perKm) + (chargeableWeight * rate.weightMultiplier))
          }
        }
      }
    });

  } catch (error) {
    console.error('Shipping cost calculation error:', error.message);
    throw new AppError('Failed to calculate shipping cost', 500);
  }
}));

/**
 * @route   GET /api/logistics/delivery-estimate
 * @desc    Get delivery time estimate
 * @access  Public
 */
router.get('/delivery-estimate', [
  query('origin').notEmpty(),
  query('destination').notEmpty(),
  query('deliveryType').optional().isIn(['standard', 'express', 'same_day']),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const {
    origin,
    destination,
    deliveryType = 'standard'
  } = req.query;

  try {
    // Geocode addresses using Nominatim
    const geocodeAddress = async (address) => {
      const google = await googleGeocode(address);
      if (google) return google;
      const q = typeof address === 'string' ? address : `${address.city || ''}, ${address.state || ''}, ${address.country || 'Nigeria'}`;
      const params = new URLSearchParams({ q, format: 'json', limit: '1' });
      const resp = await axios.get(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'ojawa-ecommerce/1.0' },
        timeout: 10000
      });
      if (!resp.data || resp.data.length === 0) return null;
      return { lat: parseFloat(resp.data[0].lat), lng: parseFloat(resp.data[0].lon) };
    };

    const [originGeo, destGeo] = await Promise.all([
      geocodeAddress(origin),
      geocodeAddress(destination)
    ]);

    let duration = 0;

    if (originGeo && destGeo) {
      const googleRoute = await googleDirections(originGeo, destGeo);
      if (googleRoute) {
        duration = googleRoute.durationSeconds;
      } else {
      const coords = `${originGeo.lng},${originGeo.lat};${destGeo.lng},${destGeo.lat}`;
      const osrmResp = await axios.get(
        `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`,
        { timeout: 10000 }
      );
      if (osrmResp.data.code === 'Ok' && osrmResp.data.routes && osrmResp.data.routes.length > 0) {
        duration = osrmResp.data.routes[0].duration || 0;
      } else {
        // Fallback: Haversine straight-line
        const R = 6371000;
        const toRad = (d) => d * (Math.PI / 180);
        const dLat = toRad(destGeo.lat - originGeo.lat);
        const dLon = toRad(destGeo.lng - originGeo.lng);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(originGeo.lat)) * Math.cos(toRad(destGeo.lat)) * Math.sin(dLon / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        duration = (dist / 1000) * 120 * 60;
      }
      }
    }

    const deliveryEstimate = getEstimatedDeliveryTime(deliveryType, duration);

    res.json({
      success: true,
      data: {
        origin,
        destination,
        deliveryType,
        travelTime: {
          seconds: duration,
          text: `${Math.round(duration / 60)} mins`
        },
        deliveryEstimate
      }
    });

  } catch (error) {
    console.error('Delivery estimate error:', error.message);
    throw new AppError('Failed to get delivery estimate', 500);
  }
}));

/**
 * @route   GET /api/logistics/service-areas
 * @desc    Get available service areas
 * @access  Public
 */
router.get('/service-areas', asyncHandler(async (req, res) => {
  // This could be fetched from a database or configuration
  // For now, returning hardcoded service areas
  
  const serviceAreas = [
    {
      id: 'lagos_mainland',
      name: 'Lagos Mainland',
      cities: ['Ikeja', 'Surulere', 'Yaba', 'Maryland', 'Victoria Island (partial)'],
      deliveryTypes: ['standard', 'express', 'same_day'],
      baseCost: 500,
      estimatedDays: { standard: 2, express: 1, same_day: 0 }
    },
    {
      id: 'lagos_island',
      name: 'Lagos Island',
      cities: ['Victoria Island', 'Lekki', 'Ikoyi', 'Ajah', 'Epe'],
      deliveryTypes: ['standard', 'express', 'same_day'],
      baseCost: 600,
      estimatedDays: { standard: 3, express: 1, same_day: 0 }
    },
    {
      id: 'abuja',
      name: 'Abuja',
      cities: ['Wuse', 'Maitama', 'Asokoro', 'Garki', 'Central Area'],
      deliveryTypes: ['standard', 'express'],
      baseCost: 800,
      estimatedDays: { standard: 3, express: 2 }
    },
    {
      id: 'port_harcourt',
      name: 'Port Harcourt',
      cities: ['GRA', 'Rumuola', 'Elekahia', 'Oyigbo'],
      deliveryTypes: ['standard', 'express'],
      baseCost: 900,
      estimatedDays: { standard: 4, express: 2 }
    }
  ];

  res.json({
    success: true,
    data: serviceAreas
  });
}));

// Helper function to get estimated delivery time
function getEstimatedDeliveryTime(deliveryType, durationInSeconds) {
  const now = new Date();
  let deliveryDate = new Date(now);
  
  switch (deliveryType) {
    case 'same_day':
      // Same day if ordered before 12 PM, otherwise next day
      if (now.getHours() < 12) {
        deliveryDate.setHours(18, 0, 0, 0); // 6 PM same day
      } else {
        deliveryDate.setDate(deliveryDate.getDate() + 1);
        deliveryDate.setHours(12, 0, 0, 0); // 12 PM next day
      }
      break;
      
    case 'express':
      // Next day delivery
      deliveryDate.setDate(deliveryDate.getDate() + 1);
      deliveryDate.setHours(16, 0, 0, 0); // 4 PM next day
      break;
      
    case 'standard':
    default:
      // 2-3 days based on distance
      const daysToAdd = durationInSeconds > 3600 ? 3 : 2; // Over 1 hour = 3 days
      deliveryDate.setDate(deliveryDate.getDate() + daysToAdd);
      deliveryDate.setHours(16, 0, 0, 0); // 4 PM
      break;
  }
  
  return {
    estimatedDate: deliveryDate.toISOString(),
    estimatedDays: Math.ceil((deliveryDate - now) / (1000 * 60 * 60 * 24)),
    cutoffTime: deliveryType === 'same_day' ? '12:00 PM' : null,
    description: getDeliveryDescription(deliveryType, deliveryDate, now)
  };
}

function getDeliveryDescription(deliveryType, deliveryDate, now) {
  const days = Math.ceil((deliveryDate - now) / (1000 * 60 * 60 * 24));
  const isToday = deliveryDate.toDateString() === now.toDateString();
  const isTomorrow = days === 1;
  
  switch (deliveryType) {
    case 'same_day':
      if (isToday && now.getHours() < 12) {
        return 'Today by 6 PM';
      } else {
        return 'Tomorrow by 12 PM';
      }
    case 'express':
      if (isTomorrow) {
        return 'Tomorrow by 4 PM';
      } else {
        return `${days} days by 4 PM`;
      }
    case 'standard':
    default:
      if (isTomorrow) {
        return 'Tomorrow by 4 PM';
      } else {
        return `${days} days by 4 PM`;
      }
  }
}

/**
 * @route   POST /api/logistics/carrier-rates
 * @desc    Get real-time shipping rates from integrated carriers
 * @access  Private
 */
router.post('/carrier-rates', authenticateToken, [
  body('from').notEmpty(),
  body('to').notEmpty(),
  body('weightKg').optional().isFloat({ min: 0 }),
  body('deliveryOption').optional().isIn(['standard', 'express', 'same_day']),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { from, to, weightKg = 1, deliveryOption = 'standard' } = req.body;

  const result = await getShippingRates({ from, to, weightKg, deliveryOption });
  res.json(result);
}));

/**
 * @route   GET /api/logistics/track/:trackingNumber
 * @desc    Track a package across carriers
 * @access  Public
 */
router.get('/track/:trackingNumber', asyncHandler(async (req, res) => {
  const { trackingNumber } = req.params;
  const { carrier } = req.query;

  const result = await getTrackingInfo(trackingNumber, carrier || null);

  if (!result) {
    throw new AppError('Tracking information not found', 404);
  }

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route   GET /api/logistics/routes/:partnerId
 * @desc    Get all routes for a logistics partner
 * @access  Private
 */
router.get('/routes/:partnerId', authenticateToken, asyncHandler(async (req, res) => {
  const { partnerId } = req.params;
  if (!req.user) throw new AppError('Authentication required', 401);
  if (req.user.uid !== partnerId && req.user.role !== 'admin') {
    throw new AppError('Not authorized to view these routes', 403);
  }

  const routes = await LogisticsRoute.findAll({
    where: { logisticsPartnerId: partnerId },
    order: [['createdAt', 'DESC']]
  });

  res.json({ success: true, items: routes.map(r => r.toJSON()) });
}));

/**
 * @route   POST /api/logistics/routes/:partnerId
 * @desc    Create a new route for a logistics partner
 * @access  Private
 */
router.post('/routes/:partnerId', authenticateToken, asyncHandler(async (req, res) => {
  const { partnerId } = req.params;
  if (!req.user) throw new AppError('Authentication required', 401);
  if (req.user.uid !== partnerId && req.user.role !== 'admin') {
    throw new AppError('Not authorized to create routes for this partner', 403);
  }

  const routeData = {
    logisticsPartnerId: partnerId,
    routeType: req.body.routeType || 'intracity',
    country: req.body.country || '',
    state: req.body.state || '',
    city: req.body.city || '',
    stateAsCity: req.body.stateAsCity || false,
    from: req.body.from || '',
    to: req.body.to || '',
    distance: parseFloat(req.body.distance) || 0,
    price: parseFloat(req.body.price) || 0,
    currency: req.body.currency || 'NGN',
    estimatedTime: req.body.estimatedTime || '',
    vehicleType: req.body.vehicleType || 'Van',
    serviceType: req.body.serviceType || 'Standard Delivery',
    ratePerKm: parseFloat(req.body.ratePerKm) || 50,
    status: req.body.status || 'active'
  };

  const route = await LogisticsRoute.create(routeData);
  res.status(201).json({ success: true, route: route.toJSON() });
}));

/**
 * @route   DELETE /api/logistics/routes/:routeId
 * @desc    Delete a logistics route
 * @access  Private
 */
router.delete('/routes/:routeId', authenticateToken, asyncHandler(async (req, res) => {
  const { routeId } = req.params;
  if (!req.user) throw new AppError('Authentication required', 401);

  const route = await LogisticsRoute.findByPk(routeId);
  if (!route) {
    throw new AppError('Route not found', 404);
  }
  if (route.logisticsPartnerId !== req.user.uid && req.user.role !== 'admin') {
    throw new AppError('Not authorized to delete this route', 403);
  }

  await route.destroy();
  res.json({ success: true, message: 'Route deleted successfully' });
}));

/**
 * @route   PUT /api/logistics/routes/:routeId
 * @desc    Update a logistics route
 * @access  Private
 */
router.put('/routes/:routeId', authenticateToken, asyncHandler(async (req, res) => {
  const { routeId } = req.params;
  if (!req.user) throw new AppError('Authentication required', 401);

  const route = await LogisticsRoute.findByPk(routeId);
  if (!route) {
    throw new AppError('Route not found', 404);
  }
  if (route.logisticsPartnerId !== req.user.uid && req.user.role !== 'admin') {
    throw new AppError('Not authorized to update this route', 403);
  }

  const allowedFields = [
    'routeType', 'country', 'state', 'city', 'stateAsCity',
    'from', 'to', 'distance', 'price', 'currency',
    'estimatedTime', 'vehicleType', 'serviceType', 'ratePerKm', 'status'
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  await route.update({ ...updates, updatedAt: new Date() });
  res.json({ success: true, route: route.toJSON() });
}));

/**
 * @route   GET /api/logistics/:partnerId/analytics
 * @desc    Get route analytics for a logistics partner
 * @access  Private
 */
router.get('/:partnerId/analytics', authenticateToken, asyncHandler(async (req, res) => {
  const { partnerId } = req.params;
  if (!req.user) throw new AppError('Authentication required', 401);
  if (req.user.uid !== partnerId && req.user.role !== 'admin') {
    throw new AppError('Not authorized', 403);
  }

  const routes = await LogisticsRoute.findAll({
    where: { logisticsPartnerId: partnerId, status: 'active' }
  });

  const totalRoutes = routes.length;
  const avgPrice = routes.length > 0
    ? routes.reduce((sum, r) => sum + parseFloat(r.price || 0), 0) / routes.length
    : 0;
  const avgDistance = routes.length > 0
    ? routes.reduce((sum, r) => sum + parseFloat(r.distance || 0), 0) / routes.length
    : 0;

  const byType = {
    intracity: routes.filter(r => r.routeType === 'intracity').length,
    intercity: routes.filter(r => r.routeType === 'intercity').length,
    international: routes.filter(r => r.routeType === 'international').length
  };

  res.json({
    success: true,
    analytics: {
      totalRoutes,
      avgPrice: Math.round(avgPrice * 100) / 100,
      avgDistance: Math.round(avgDistance * 100) / 100,
      byType
    }
  });
}));

/**
 * @route   GET /api/logistics/:partnerId/deliveries
 * @desc    Get deliveries assigned to a logistics partner
 * @access  Private
 */
router.get('/:partnerId/deliveries', authenticateToken, asyncHandler(async (req, res) => {
  const { partnerId } = req.params;
  if (!req.user) throw new AppError('Authentication required', 401);
  if (req.user.uid !== partnerId && req.user.role !== 'admin') {
    throw new AppError('Not authorized', 403);
  }

  const orders = await Order.findAll({
    where: { logisticsPartnerId: partnerId },
    attributes: ['id', 'orderNumber', 'status', 'paymentStatus', 'paymentMethod', 'trackingNumber', 'estimatedDelivery', 'actualDelivery', 'shippingAddress', 'totalAmount', 'items', 'logisticsMeta', 'deliveryOption', 'createdAt', 'updatedAt'],
    order: [['createdAt', 'DESC']],
    limit: 100
  });

  const deliveries = orders.map(order => {
    const addr = order.shippingAddress || {};
    const items = order.items || [];
    return {
      id: order.id,
      orderId: order.id,
      orderNumber: order.orderNumber || order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      trackingId: order.trackingNumber || order.id,
      pickup: 'Warehouse',
      delivery: [addr.city, addr.state, addr.country].filter(Boolean).join(', ') || 'N/A',
      customer: addr.recipientName || addr.fullName || 'Customer',
      amount: order.totalAmount,
      items: items,
      logisticsMeta: order.logisticsMeta || {},
      deliveryOption: order.deliveryOption || 'standard',
      estimatedDelivery: order.estimatedDelivery,
      actualDelivery: order.actualDelivery,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
  });

  res.json({ success: true, items: deliveries });
}));

/**
 * @route   PATCH /api/logistics/deliveries/:deliveryId/status
 * @desc    Update delivery status
 * @access  Private
 */
router.patch('/deliveries/:deliveryId/status', authenticateToken, asyncHandler(async (req, res) => {
  const { deliveryId } = req.params;
  const { status, updatedBy, location, notes } = req.body;
  if (!req.user) throw new AppError('Authentication required', 401);

  const validStatuses = ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }

  const order = await Order.findByPk(deliveryId);
  if (!order) {
    throw new AppError('Delivery not found', 404);
  }

  const statusMap = {
    picked_up: 'shipped',
    in_transit: 'shipped',
    out_for_delivery: 'shipped',
    delivered: 'delivered',
    cancelled: 'cancelled'
  };

  const orderStatus = statusMap[status] || order.status;
  const updateData = { status: orderStatus };
  if (status === 'delivered') {
    updateData.actualDelivery = new Date();
  }

  // Append to statusHistory if the column exists
  try {
    const existingHistory = order.statusHistory || [];
    updateData.statusHistory = [...existingHistory, {
      status,
      orderStatus,
      changedBy: updatedBy || req.user.uid,
      changedByName: req.user.displayName || req.user.email || '',
      location: location || '',
      notes: notes || '',
      timestamp: new Date().toISOString()
    }];
  } catch (e) {
    // statusHistory column might not exist yet — skip if so
  }

  await order.update(updateData);

  res.json({ success: true, delivery: { id: deliveryId, status, orderStatus } });
}));

/**
 * @route   GET /api/logistics/available-partners
 * @desc    Find logistics partners with routes matching buyer and vendor addresses
 * @access  Public
 */
router.get('/available-partners', asyncHandler(async (req, res) => {
  const { vendorAddress, buyerAddress, buyerLat, buyerLng, vendorLat, vendorLng } = req.query;

  if (!vendorAddress || !buyerAddress) {
    return res.json({ success: true, partners: [] });
  }

  const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || '';
  const MAPBOX_GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
  const MAPBOX_DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox';

  // Geocode an address using Mapbox Geocoding API
  const geocodeAddress = async (address) => {
    const tryGeocode = async (q) => {
      try {
        const url = `${MAPBOX_GEOCODING_URL}/${encodeURIComponent(q)}.json?access_token=${MAPBOX_TOKEN}&country=ng&limit=1`;
        const resp = await axios.get(url, { timeout: 10000 });
        if (!resp.data || !resp.data.features || resp.data.features.length === 0) return null;
        return { lat: resp.data.features[0].center[1], lng: resp.data.features[0].center[0] };
      } catch (e) {
        return null;
      }
    };

    const addrStr = typeof address === 'string' ? address : `${address.city || ''}, ${address.state || ''}, ${address.country || 'Nigeria'}`;
    const google = await googleGeocode(addrStr);
    if (google) return google;
    const result = await tryGeocode(addrStr);
    if (result) return result;

    // Progressive fallback
    const parts = addrStr.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      const r = await tryGeocode(`${parts[parts.length - 3]}, ${parts[parts.length - 2]}, Nigeria`);
      if (r) return r;
    }
    if (parts.length >= 2) {
      const r = await tryGeocode(`${parts[parts.length - 2]}, Nigeria`);
      if (r) return r;
    }
    return null;
  };

  const haversineDistance = (coord1, coord2) => {
    const R = 6371; // Earth's radius in km
    const toRad = (deg) => deg * (Math.PI / 180);
    const dLat = toRad(coord2.lat - coord1.lat);
    const dLon = toRad(coord2.lng - coord1.lng);
    const lat1 = toRad(coord1.lat);
    const lat2 = toRad(coord2.lat);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  // Calculate actual road distance using Mapbox Directions API
  let calculatedDistance = 0;
  let calculatedDuration = null;
  try {
    // Use coordinates from frontend if available, otherwise geocode
    let vendorGeo = null;
    let buyerGeo = null;

    if (vendorLat && vendorLng) {
      vendorGeo = { lat: parseFloat(vendorLat), lng: parseFloat(vendorLng) };
    }
    if (buyerLat && buyerLng) {
      buyerGeo = { lat: parseFloat(buyerLat), lng: parseFloat(buyerLng) };
    }

    // Geocode any missing coordinates
    const geocodePromises = [];
    if (!vendorGeo) geocodePromises.push(geocodeAddress(vendorAddress).then(r => { vendorGeo = r; }));
    if (!buyerGeo) geocodePromises.push(geocodeAddress(buyerAddress).then(r => { buyerGeo = r; }));
    await Promise.all(geocodePromises);

    if (vendorGeo && buyerGeo) {
      const haversineKm = haversineDistance(vendorGeo, buyerGeo);
      let routeKm = 0;

      // Try Google Directions API first, then Mapbox
      const googleRoute = await googleDirections(vendorGeo, buyerGeo);
      if (googleRoute) {
        routeKm = Math.round((googleRoute.distanceMeters / 1000) * 10) / 10;
        calculatedDuration = googleRoute.durationSeconds;
      }

      if (!googleRoute && MAPBOX_TOKEN) {
        try {
          const coords = `${vendorGeo.lng},${vendorGeo.lat};${buyerGeo.lng},${buyerGeo.lat}`;
          const directionsUrl = `${MAPBOX_DIRECTIONS_URL}/driving/${coords}?access_token=${MAPBOX_TOKEN}&overview=false&steps=false`;
          const resp = await axios.get(directionsUrl, { timeout: 10000 });
          if (resp.data && resp.data.code === 'Ok' && resp.data.routes && resp.data.routes.length > 0) {
            routeKm = Math.round((resp.data.routes[0].distance / 1000) * 10) / 10;
            calculatedDuration = resp.data.routes[0].duration;
          }
        } catch (e) {
          // Mapbox Directions failed
        }
      }

      // Sanity check: if route distance > 1.5x Haversine, use Haversine * 1.3
      if (routeKm > 0 && routeKm <= haversineKm * 1.5) {
        calculatedDistance = routeKm;
      } else if (routeKm > 0 && routeKm > haversineKm * 1.5) {
        calculatedDistance = Math.round(haversineKm * 1.3 * 10) / 10;
      } else {
        calculatedDistance = Math.round(haversineKm * 1.3 * 10) / 10;
      }
    }
  } catch (e) {
    // Distance calculation failed - will use route's static distance as fallback
  }

  // Normalize address strings for matching
  const normalize = (s) => (s || '').toLowerCase().trim();
  const vendorNorm = normalize(vendorAddress);
  const buyerNorm = normalize(buyerAddress);

  // Extract state/city keywords from addresses
  const extractLocationParts = (addr) => {
    const norm = normalize(addr);
    const parts = norm.split(',').map(p => p.trim()).filter(Boolean);
    return {
      full: norm,
      parts,
      // Get the last meaningful parts (usually city, state, country)
      lastParts: parts.slice(-3).map(p => p.trim()),
      all: parts
    };
  };

  const vendorLoc = extractLocationParts(vendorAddress);
  const buyerLoc = extractLocationParts(buyerAddress);

  // Check if a route's from/to field matches either location
  const routeMatchesLocation = (routeField, location) => {
    const rf = normalize(routeField);
    if (!rf) return false;
    // Direct substring match
    if (location.full.includes(rf) || rf.includes(location.full)) return true;
    // Check if any location part matches the route field
    return location.parts.some(part =>
      part.length >= 3 && (rf.includes(part) || part.includes(rf))
    );
  };

  // Check if route state/city matches a location
  const stateCityMatches = (routeState, routeCity, location) => {
    const rs = normalize(routeState);
    const rc = normalize(routeCity);
    if (rs && location.parts.some(p => p.includes(rs) || rs.includes(p))) return true;
    if (rc && location.parts.some(p => p.includes(rc) || rc.includes(p))) return true;
    return false;
  };

  // Fetch all active routes
  const routes = await LogisticsRoute.findAll({
    where: { status: 'active' }
  });

  // Group routes by partner and filter matching ones
  const partnerMap = new Map();

  for (const route of routes) {
    const routeData = route.toJSON();
    let matches = false;

    // Match by from/to fields
    const fromMatchesVendor = routeMatchesLocation(routeData.from, vendorLoc);
    const toMatchesBuyer = routeMatchesLocation(routeData.to, buyerLoc);
    const fromMatchesBuyer = routeMatchesLocation(routeData.from, buyerLoc);
    const toMatchesVendor = routeMatchesLocation(routeData.to, vendorLoc);

    if (fromMatchesVendor && toMatchesBuyer) matches = true;
    if (fromMatchesBuyer && toMatchesVendor) matches = true;

    // Match by state/city
    if (!matches && routeData.state) {
      const stateMatchesVendor = stateCityMatches(routeData.state, routeData.city, vendorLoc);
      const stateMatchesBuyer = stateCityMatches(routeData.state, routeData.city, buyerLoc);
      if (stateMatchesVendor && stateMatchesBuyer) matches = true;
      // If route covers the state of either party, it's a potential match
      if (stateMatchesVendor || stateMatchesBuyer) {
        // For intracity routes, both parties should be in the same state
        if (routeData.routeType === 'intracity' && stateMatchesVendor && stateMatchesBuyer) {
          matches = true;
        }
        // For intercity routes, the route should connect both states
        if (routeData.routeType === 'intercity') {
          // Check if from/to cover both locations' states
          const fromState = normalize(routeData.from);
          const toState = normalize(routeData.to);
          const vendorState = vendorLoc.parts.find(p => p.length > 2) || '';
          const buyerState = buyerLoc.parts.find(p => p.length > 2) || '';
          if ((fromState.includes(vendorState) || vendorState.includes(fromState)) &&
              (toState.includes(buyerState) || buyerState.includes(toState))) {
            matches = true;
          }
          if ((fromState.includes(buyerState) || buyerState.includes(fromState)) &&
              (toState.includes(vendorState) || vendorState.includes(toState))) {
            matches = true;
          }
        }
      }
    }

    if (matches) {
      const partnerId = routeData.logisticsPartnerId;
      if (!partnerMap.has(partnerId)) {
        partnerMap.set(partnerId, {
          id: partnerId,
          routes: [],
        });
      }
      partnerMap.get(partnerId).routes.push(routeData);
    }
  }

  // Fetch user data for matched partners
  const partnerIds = Array.from(partnerMap.keys());
  let partners = [];

  if (partnerIds.length > 0) {
    const users = await User.findAll({
      where: { id: { [Op.in]: partnerIds } },
      attributes: ['id', 'email', 'firstName', 'lastName', 'profile']
    });

    partners = users.map(user => {
      const partnerData = partnerMap.get(user.id);
      const profile = user.profile || {};
      const logisticsProfile = profile.logisticsProfile || {};
      const companyName = logisticsProfile.companyName || profile.companyName ||
        profile.businessName || profile.displayName ||
        [user.firstName, user.lastName].filter(Boolean).join(' ') ||
        user.email?.split('@')[0] || 'Logistics Partner';

      // Find the best (cheapest) route
      const bestRoute = partnerData.routes.reduce((best, cur) =>
        (cur.price || 0) < (best?.price || Infinity) ? cur : best
      , null);

      return {
        id: user.id,
        name: companyName,
        email: user.email,
        rating: profile.rating || 0,
        phone: profile.phone || profile.businessPhone || null,
        routeCount: partnerData.routes.length,
        bestRoute: bestRoute ? {
          id: bestRoute.id,
          from: bestRoute.from,
          to: bestRoute.to,
          price: Number(bestRoute.price) || 0,
          distance: calculatedDistance > 0 ? calculatedDistance : (Number(bestRoute.distance) || 0),
          ratePerKm: Number(bestRoute.ratePerKm) || 0,
          estimatedTime: bestRoute.estimatedTime,
          vehicleType: bestRoute.vehicleType,
          serviceType: bestRoute.serviceType,
          routeType: bestRoute.routeType
        } : null,
        routes: partnerData.routes.map(r => ({
          id: r.id,
          from: r.from,
          to: r.to,
          price: Number(r.price) || 0,
          distance: Number(r.distance) || 0,
          ratePerKm: Number(r.ratePerKm) || 0,
          estimatedTime: r.estimatedTime,
          vehicleType: r.vehicleType,
          serviceType: r.serviceType,
          routeType: r.routeType
        }))
      };
    });

    // Sort by rating desc, then by best price asc
    partners.sort((a, b) => {
      if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
      return (a.bestRoute?.price || 0) - (b.bestRoute?.price || 0);
    });
  }

  res.json({ success: true, partners, distance: calculatedDistance, duration: calculatedDuration });
}));

/**
 * @route   GET /api/logistics/resolve-maps-url
 * @desc    Resolve a Google Maps URL (including short links) to extract coordinates
 * @access  Public
 */
router.get('/resolve-maps-url', asyncHandler(async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.json({ success: false, error: 'URL is required' });
  }

  const parseCoords = (u) => {
    // @lat,lng
    let m = u.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
    // ?q=lat,lng
    m = u.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
    // ?center=lat,lng
    m = u.match(/[?&]center=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
    // !3dlat!4dlng
    m = u.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
    return null;
  };

  // First try to parse directly from the URL
  let coords = parseCoords(url);
  if (coords) {
    return res.json({ success: true, coords, resolvedUrl: url });
  }

  // Follow redirects for short URLs (maps.app.goo.gl, etc.)
  try {
    const resp = await axios.get(url, {
      maxRedirects: 5,
      timeout: 10000,
      // Don't download the full page body — we just need the final URL
      responseType: 'text',
      transformResponse: [(data) => data.slice(0, 5000)],
    });

    // The final URL after redirects
    const finalUrl = resp.request?.res?.responseUrl || resp.request?._redirectable?._currentUrl || '';
    if (finalUrl) {
      coords = parseCoords(finalUrl);
      if (coords) {
        return res.json({ success: true, coords, resolvedUrl: finalUrl });
      }
    }

    // Also try to extract from the response HTML (sometimes coords are in meta tags or script)
    const html = typeof resp.data === 'string' ? resp.data : '';
    if (html) {
      coords = parseCoords(html);
      if (coords) {
        return res.json({ success: true, coords, resolvedUrl: finalUrl || url });
      }
    }

    return res.json({ success: false, error: 'Could not extract coordinates from the resolved URL', resolvedUrl: finalUrl });
  } catch (e) {
    return res.json({ success: false, error: `Failed to resolve URL: ${e.message}` });
  }
}));

module.exports = router;

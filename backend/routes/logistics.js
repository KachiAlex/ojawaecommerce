const express = require('express');
const { body, query, validationResult } = require('express-validator');
const axios = require('axios');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

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
 * @route   POST /api/logistics/optimize-route
 * @desc    Optimize delivery route using Google Maps API
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
    travelMode = 'DRIVE',
    routingPreference = 'TRAFFIC_AWARE'
  } = req.body;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new AppError('Google Maps API key not configured', 500);
  }

  try {
    const requestBody = {
      origin: typeof origin === 'string' ? { address: origin } : origin,
      destination: typeof destination === 'string' ? { address: destination } : destination,
      travelMode,
      routingPreference,
      optimizeWaypointOrder: !!optimize,
      intermediates: Array.isArray(waypoints)
        ? waypoints.map((wp) => (typeof wp === 'string' ? { location: { address: wp } } : { location: wp.location || wp }))
        : [],
      polylineQuality: 'HIGH_QUALITY',
      polylineEncoding: 'ENCODED_POLYLINE'
    };

    const headers = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'routes.distanceMeters',
        'routes.duration',
        'routes.polyline.encodedPolyline',
        'routes.optimizedIntermediateWaypointIndex',
        'routes.legs',
        'routes.warnings'
      ].join(',')
    };

    const response = await axios.post(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      requestBody,
      { 
        headers, 
        timeout: 15000 
      }
    );

    const { data } = response;

    if (!data.routes || data.routes.length === 0) {
      throw new AppError('No routes found', 404);
    }

    const route = data.routes[0];
    
    // Process route data
    const processedRoute = {
      distance: route.distanceMeters,
      duration: route.duration,
      polyline: route.polyline?.encodedPolyline,
      optimizedWaypointOrder: route.optimizedIntermediateWaypointIndex,
      legs: route.legs?.map(leg => ({
        startAddress: leg.startAddress,
        endAddress: leg.endAddress,
        distance: leg.distanceMeters,
        duration: leg.duration,
        steps: leg.steps?.map(step => ({
          instruction: step.navigationInstruction,
          distance: step.distanceMeters,
          duration: step.duration
        }))
      })),
      warnings: route.warnings || []
    };

    res.json({
      success: true,
      data: {
        routes: [processedRoute],
        request: requestBody,
        warnings: route.warnings || []
      }
    });

  } catch (error) {
    console.error('Route optimization error:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      throw new AppError('Invalid route parameters', 400);
    } else if (error.response?.status === 403) {
      throw new AppError('Invalid Google Maps API key', 403);
    } else if (error.code === 'ECONNABORTED') {
      throw new AppError('Route optimization timeout', 504);
    }
    
    throw new AppError('Failed to optimize route', 500);
  }
}));

/**
 * @route   GET /api/logistics/shipping-cost
 * @desc    Calculate shipping cost based on distance and weight
 * @access  Private
 */
router.get('/shipping-cost', authenticateToken, [
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

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new AppError('Google Maps API key not configured', 500);
  }

  try {
    // Get distance matrix for shipping cost calculation
    const distanceRequestBody = {
      origins: [typeof origin === 'string' ? { address: origin } : origin],
      destinations: [typeof destination === 'string' ? { address: destination } : destination],
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE'
    };

    const headers = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'rows.elements.distance',
        'rows.elements.duration',
        'rows.elements.status'
      ].join(',')
    };

    const response = await axios.post(
      'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
      distanceRequestBody,
      { headers, timeout: 10000 }
    );

    const { data } = response;
    
    if (!data.rows || data.rows.length === 0 || !data.rows[0].elements || data.rows[0].elements.length === 0) {
      throw new AppError('Unable to calculate distance', 404);
    }

    const element = data.rows[0].elements[0];
    
    if (element.status !== 'OK') {
      throw new AppError('Route not found', 404);
    }

    const distance = element.distance?.meters || 0;
    const duration = element.duration?.seconds || 0;

    // Calculate shipping cost based on distance, weight, and dimensions
    const distanceKm = distance / 1000;
    const volumetricWeight = (dimensions.length * dimensions.width * dimensions.height) / 5000; // Standard formula
    const chargeableWeight = Math.max(weight, volumetricWeight);

    // Base pricing tiers
    const baseRates = {
      standard: {
        baseFee: 500,
        perKm: 50,
        weightMultiplier: 20
      },
      express: {
        baseFee: 1000,
        perKm: 100,
        weightMultiplier: 40
      },
      same_day: {
        baseFee: 2000,
        perKm: 150,
        weightMultiplier: 60
      }
    };

    const rate = baseRates[deliveryType] || baseRates.standard;
    
    let shippingCost = rate.baseFee;
    shippingCost += distanceKm * rate.perKm;
    shippingCost += chargeableWeight * rate.weightMultiplier;

    // Add surcharges for special conditions
    if (distanceKm > 100) {
      shippingCost *= 1.2; // 20% surcharge for long distances
    }

    if (chargeableWeight > 10) {
      shippingCost *= 1.15; // 15% surcharge for heavy items
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
          text: element.distance?.text || `${Math.round(distanceKm * 100) / 100} km`
        },
        duration: {
          seconds: duration,
          text: element.duration?.text || `${Math.round(duration / 60)} mins`
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
    console.error('Shipping cost calculation error:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      throw new AppError('Invalid address parameters', 400);
    } else if (error.response?.status === 403) {
      throw new AppError('Invalid Google Maps API key', 403);
    }
    
    throw new AppError('Failed to calculate shipping cost', 500);
  }
}));

/**
 * @route   GET /api/logistics/delivery-estimate
 * @desc    Get delivery time estimate
 * @access  Private
 */
router.get('/delivery-estimate', authenticateToken, [
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

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new AppError('Google Maps API key not configured', 500);
  }

  try {
    // Get duration estimate
    const requestBody = {
      origin: typeof origin === 'string' ? { address: origin } : origin,
      destination: typeof destination === 'string' ? { address: destination } : destination,
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE'
    };

    const headers = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'routes.distanceMeters',
        'routes.duration',
        'routes.durationAsString'
      ].join(',')
    };

    const response = await axios.post(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      requestBody,
      { headers, timeout: 10000 }
    );

    const { data } = response;
    
    if (!data.routes || data.routes.length === 0) {
      throw new AppError('Route not found', 404);
    }

    const route = data.routes[0];
    const duration = route.duration?.seconds || 0;

    const deliveryEstimate = getEstimatedDeliveryTime(deliveryType, duration);

    res.json({
      success: true,
      data: {
        origin,
        destination,
        deliveryType,
        travelTime: {
          seconds: duration,
          text: route.durationAsString || `${Math.round(duration / 60)} mins`
        },
        deliveryEstimate
      }
    });

  } catch (error) {
    console.error('Delivery estimate error:', error.response?.data || error.message);
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

module.exports = router;

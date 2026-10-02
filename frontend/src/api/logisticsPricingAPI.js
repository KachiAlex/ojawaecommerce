/**
 * Logistics Pricing API
 * Express.js-style API endpoints for delivery fee calculations
 */

import logisticsPricingService from '../services/logisticsPricingService';

/**
 * Calculate delivery fee endpoint
 * POST /calculate-delivery
 */
export const calculateDelivery = async (req, res) => {
  try {
    const {
      pickup,
      dropoff,
      weight = 1,
      type = 'standard',
      partner = null
    } = req.body;

    // Validate required fields
    if (!pickup || !dropoff) {
      return res.status(400).json({
        success: false,
        error: 'Pickup and dropoff locations are required',
        code: 'MISSING_LOCATIONS'
      });
    }

    // Validate delivery type
    if (!['standard', 'express'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Delivery type must be "standard" or "express"',
        code: 'INVALID_DELIVERY_TYPE'
      });
    }

    // Validate weight
    if (weight < 0 || weight > 50) {
      return res.status(400).json({
        success: false,
        error: 'Weight must be between 0 and 50 kg',
        code: 'INVALID_WEIGHT'
      });
    }

    // Calculate delivery fee
    const result = await logisticsPricingService.calculateDeliveryFee({
      pickup,
      dropoff,
      weight,
      type,
      partner,
      timestamp: new Date()
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
        code: 'CALCULATION_ERROR',
        fallback: {
          deliveryFee: result.deliveryFee,
          breakdown: result.breakdown,
          eta: result.eta,
          partner: result.partner
        }
      });
    }

    // Return successful calculation
    return res.status(200).json({
      success: true,
      deliveryFee: result.deliveryFee,
      breakdown: {
        baseFare: result.breakdown.baseFare,
        distanceFee: result.breakdown.distanceFee,
        weightFee: result.breakdown.weightFee,
        deliveryTypeMultiplier: result.breakdown.deliveryTypeMultiplier,
        timeMultiplier: result.breakdown.timeMultiplier,
        zoneMultiplier: result.breakdown.zoneMultiplier,
        totalMultiplier: result.breakdown.totalMultiplier
      },
      eta: result.eta,
      partner: result.partner,
      distance: result.distance,
      zone: result.zone,
      calculatedAt: result.calculatedAt
    });

  } catch (error) {
    console.error('Error in calculateDelivery endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Get available logistics partners
 * GET /logistics-partners
 */
export const getLogisticsPartners = async (req, res) => {
  try {
    const { zone } = req.query;
    
    const partners = await logisticsPricingService.getLogisticsPartners(null, zone);
    
    return res.status(200).json({
      success: true,
      partners: [partners] // Return as array for consistency
    });

  } catch (error) {
    console.error('Error in getLogisticsPartners endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Update pricing configuration
 * PUT /pricing-config
 */
export const updatePricingConfig = async (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Configuration is required',
        code: 'MISSING_CONFIG'
      });
    }

    await logisticsPricingService.updatePricingConfig(config);
    
    return res.status(200).json({
      success: true,
      message: 'Pricing configuration updated successfully'
    });

  } catch (error) {
    console.error('Error in updatePricingConfig endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Get current pricing configuration
 * GET /pricing-config
 */
export const getPricingConfig = async (req, res) => {
  try {
    const config = logisticsPricingService.getPricingConfig();
    
    return res.status(200).json({
      success: true,
      config: config
    });

  } catch (error) {
    console.error('Error in getPricingConfig endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Get delivery zones
 * GET /delivery-zones
 */
export const getDeliveryZones = async (req, res) => {
  try {
    const zones = [
      {
        id: 'lagos_intra',
        name: 'Within Lagos',
        multiplier: 1.0,
        description: 'Deliveries within Lagos State'
      },
      {
        id: 'lagos_inter',
        name: 'From Lagos to Other States',
        multiplier: 1.2,
        description: 'Deliveries from Lagos to other states'
      },
      {
        id: 'abuja_intra',
        name: 'Within Abuja',
        multiplier: 1.0,
        description: 'Deliveries within Abuja FCT'
      },
      {
        id: 'abuja_inter',
        name: 'From Abuja to Other States',
        multiplier: 1.3,
        description: 'Deliveries from Abuja to other states'
      },
      {
        id: 'other_intra',
        name: 'Within Other States',
        multiplier: 1.1,
        description: 'Deliveries within other states'
      },
      {
        id: 'other_inter',
        name: 'Between Different States',
        multiplier: 1.4,
        description: 'Deliveries between different states'
      }
    ];
    
    return res.status(200).json({
      success: true,
      zones: zones
    });

  } catch (error) {
    console.error('Error in getDeliveryZones endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Calculate multiple delivery options
 * POST /calculate-delivery-options
 */
export const calculateDeliveryOptions = async (req, res) => {
  try {
    const {
      pickup,
      dropoff,
      weight = 1
    } = req.body;

    if (!pickup || !dropoff) {
      return res.status(400).json({
        success: false,
        error: 'Pickup and dropoff locations are required',
        code: 'MISSING_LOCATIONS'
      });
    }

    // Calculate both standard and express options
    const [standardResult, expressResult] = await Promise.all([
      logisticsPricingService.calculateDeliveryFee({
        pickup,
        dropoff,
        weight,
        type: 'standard',
        timestamp: new Date()
      }),
      logisticsPricingService.calculateDeliveryFee({
        pickup,
        dropoff,
        weight,
        type: 'express',
        timestamp: new Date()
      })
    ]);

    return res.status(200).json({
      success: true,
      options: [
        {
          type: 'standard',
          deliveryFee: standardResult.deliveryFee,
          eta: standardResult.eta,
          breakdown: standardResult.breakdown,
          partner: standardResult.partner
        },
        {
          type: 'express',
          deliveryFee: expressResult.deliveryFee,
          eta: expressResult.eta,
          breakdown: expressResult.breakdown,
          partner: expressResult.partner
        }
      ],
      distance: standardResult.distance,
      zone: standardResult.zone,
      calculatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in calculateDeliveryOptions endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Health check endpoint
 * GET /health
 */
export const healthCheck = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Logistics Pricing Service is healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Service unhealthy',
      code: 'HEALTH_CHECK_FAILED'
    });
  }
};

// Export all endpoints
export default {
  calculateDelivery,
  getLogisticsPartners,
  updatePricingConfig,
  getPricingConfig,
  getDeliveryZones,
  calculateDeliveryOptions,
  healthCheck
};

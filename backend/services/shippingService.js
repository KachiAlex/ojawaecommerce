/**
 * Shipping service integrating real carrier APIs with a fallback estimator.
 * Supported carriers: DHL, FedEx (real APIs when credentials available).
 * Falls back to distance-based estimation otherwise.
 */

const axios = require('axios');

// Configuration
const CARRIER_CONFIG = {
  dhl: {
    apiUrl: process.env.DHL_API_URL || 'https://api-eu.dhl.com/track/shipments',
    apiKey: process.env.DHL_API_KEY
  },
  fedex: {
    apiUrl: process.env.FEDEX_API_URL || 'https://apis.fedex.com/ship/v1/rates',
    apiKey: process.env.FEDEX_API_KEY,
    secret: process.env.FEDEX_SECRET
  }
};

// Nigerian logistics estimation rates (NGN per kg per km)
const BASE_RATES = {
  standard: 50,   // ~50 NGN per kg per 100km
  express: 120,   // ~120 NGN per kg per 100km
  same_day: 250   // flat rate zone-based
};

// Major Nigerian city coordinates for distance calculation
const CITY_COORDS = {
  lagos: { lat: 6.5244, lng: 3.3792 },
  abuja: { lat: 9.0765, lng: 7.3986 },
  port_harcourt: { lat: 4.8156, lng: 7.0498 },
  ibadan: { lat: 7.3775, lng: 3.9470 },
  kano: { lat: 12.0022, lng: 8.5920 },
  benin: { lat: 6.3350, lng: 5.6037 },
  enugu: { lat: 6.5244, lng: 7.5186 },
  kaduna: { lat: 10.5105, lng: 7.4164 }
};

function toRad(value) {
  return (value * Math.PI) / 180;
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getCityCoords(cityName) {
  const normalized = cityName?.toLowerCase().replace(/\s+/g, '_');
  return CITY_COORDS[normalized] || null;
}

function estimateDistance(from, to) {
  const fromCoords = getCityCoords(from) || { lat: 6.5244, lng: 3.3792 }; // Default Lagos
  const toCoords = getCityCoords(to) || { lat: 9.0765, lng: 7.3986 };   // Default Abuja
  return haversineDistance(fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng);
}

/**
 * Fallback estimator when real carrier APIs are unavailable.
 */
function estimateShipping({ weightKg = 1, from, to, deliveryOption = 'standard' }) {
  const distance = estimateDistance(from, to);
  const baseRate = BASE_RATES[deliveryOption] || BASE_RATES.standard;
  const cost = Math.round(weightKg * (distance / 100) * baseRate);

  const days = deliveryOption === 'same_day' ? 1 :
               deliveryOption === 'express' ? 2 : 5;

  return {
    carrier: 'ojawa_estimated',
    method: deliveryOption,
    cost: Math.max(cost, 500), // Minimum 500 NGN
    currency: 'NGN',
    estimatedDays: days,
    estimatedDelivery: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    distanceKm: Math.round(distance),
    isEstimate: true
  };
}

/**
 * Fetch DHL shipping rate if credentials are available.
 */
async function getDHLRate({ weightKg, from, to, dimensions = {} }) {
  const config = CARRIER_CONFIG.dhl;
  if (!config.apiKey) return null;

  try {
    const response = await axios.get(config.apiUrl, {
      headers: { 'DHL-API-Key': config.apiKey },
      params: {
        weight: weightKg,
        unitOfMeasurement: 'metric',
        originCountryCode: 'NG',
        destinationCountryCode: 'NG',
        plannedShippingDate: new Date().toISOString().split('T')[0]
      },
      timeout: 5000
    });

    const rate = response.data?.products?.[0];
    if (!rate) return null;

    return {
      carrier: 'dhl',
      method: rate.productName || 'DHL Express',
      cost: Math.round(rate.price?.totalPrice?.[0]?.price || 0),
      currency: 'NGN',
      estimatedDays: parseInt(rate.deliveryCapabilities?.estimatedDeliveryDate) || 3,
      isEstimate: false
    };
  } catch (error) {
    console.error('DHL rate fetch failed:', error.message);
    return null;
  }
}

/**
 * Fetch FedEx shipping rate if credentials are available.
 */
async function getFedExRate({ weightKg, from, to, dimensions = {} }) {
  const config = CARRIER_CONFIG.fedex;
  if (!config.apiKey || !config.secret) return null;

  try {
    // First get OAuth token
    const tokenRes = await axios.post(
      'https://apis.fedex.com/oauth/token',
      {
        grant_type: 'client_credentials',
        client_id: config.apiKey,
        client_secret: config.secret
      },
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 5000 }
    );

    const token = tokenRes.data?.access_token;
    if (!token) return null;

    const rateRes = await axios.post(
      `${config.apiUrl}/quotes`,
      {
        accountNumber: { value: process.env.FEDEX_ACCOUNT_NUMBER },
        requestedShipment: {
          shipper: { address: { city: from, countryCode: 'NG' } },
          recipient: { address: { city: to, countryCode: 'NG' } },
          pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
          shippingChargesPayment: { paymentType: 'SENDER' },
          requestedPackageLineItems: [{
            weight: { units: 'KG', value: weightKg }
          }],
          shipDateStamp: new Date().toISOString().split('T')[0]
        }
      },
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 8000
      }
    );

    const rate = rateRes.data?.output?.rateReplyDetails?.[0];
    if (!rate) return null;

    return {
      carrier: 'fedex',
      method: rate.serviceType,
      cost: Math.round(rate.ratedShipmentDetails?.[0]?.totalNetCharge || 0),
      currency: 'NGN',
      estimatedDays: 3,
      isEstimate: false
    };
  } catch (error) {
    console.error('FedEx rate fetch failed:', error.message);
    return null;
  }
}

/**
 * Get shipping rates from all available carriers and return best options.
 */
async function getShippingRates(params) {
  const { weightKg = 1, from, to, deliveryOption = 'standard' } = params;

  const results = [];

  // Try real carriers first
  if (deliveryOption === 'express' || deliveryOption === 'standard') {
    const dhl = await getDHLRate(params);
    if (dhl) results.push(dhl);

    const fedex = await getFedExRate(params);
    if (fedex) results.push(fedex);
  }

  // Always add fallback estimate
  const fallback = estimateShipping({ weightKg, from, to, deliveryOption });
  results.push(fallback);

  // Sort by cost ascending
  results.sort((a, b) => a.cost - b.cost);

  return {
    success: true,
    from,
    to,
    weightKg,
    options: results,
    recommended: results[0]
  };
}

/**
 * Generate tracking info for an order.
 */
async function getTrackingInfo(trackingNumber, carrier = null) {
  if (!trackingNumber) return null;

  // Try DHL first if no carrier specified
  if (!carrier || carrier === 'dhl') {
    const config = CARRIER_CONFIG.dhl;
    if (config.apiKey) {
      try {
        const res = await axios.get(`${config.apiUrl}?trackingNumber=${trackingNumber}`, {
          headers: { 'DHL-API-Key': config.apiKey },
          timeout: 5000
        });
        return {
          carrier: 'dhl',
          trackingNumber,
          status: res.data?.shipments?.[0]?.status || 'unknown',
          events: res.data?.shipments?.[0]?.events || []
        };
      } catch (e) {
        console.error('DHL tracking failed:', e.message);
      }
    }
  }

  // Fallback to internal tracking status
  return {
    carrier: carrier || 'ojawa',
    trackingNumber,
    status: 'in_transit',
    events: [],
    isEstimate: true
  };
}

module.exports = {
  getShippingRates,
  getTrackingInfo,
  estimateShipping
};

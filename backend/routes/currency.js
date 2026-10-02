const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Exchange rates relative to NGN (base currency)
// In production, these should be fetched from an external API (e.g. exchangerate-api.com)
// and cached. For now, we use static rates that can be updated periodically.
const EXCHANGE_RATES = {
  base: 'NGN',
  updated: new Date().toISOString(),
  rates: {
    NGN: 1,
    USD: 0.000606,    // 1 NGN = 0.000606 USD  (1 USD ≈ 1650 NGN)
    EUR: 0.000556,    // 1 NGN = 0.000556 EUR  (1 EUR ≈ 1800 NGN)
    GBP: 0.000476,    // 1 NGN = 0.000476 GBP  (1 GBP ≈ 2100 NGN)
    GHS: 0.012,       // 1 NGN = 0.012 GHS    (1 GHS ≈ 83 NGN)
    KES: 0.078,       // 1 NGN = 0.078 KES    (1 KES ≈ 12.8 NGN)
    ETB: 0.071,       // 1 NGN = 0.071 ETB    (1 ETB ≈ 14 NGN)
    ZAR: 0.011,       // 1 NGN = 0.011 ZAR    (1 ZAR ≈ 91 NGN)
    KRW: 0.89,        // 1 NGN = 0.89 KRW
    JPY: 0.097,       // 1 NGN = 0.097 JPY
    CNY: 0.0044,      // 1 NGN = 0.0044 CNY
    INR: 0.050,       // 1 NGN = 0.050 INR
    CAD: 0.000833,    // 1 NGN = 0.000833 CAD (1 CAD ≈ 1200 NGN)
    AUD: 0.000926,    // 1 NGN = 0.000926 AUD (1 AUD ≈ 1080 NGN)
  },
  symbols: {
    NGN: '₦',
    USD: '$',
    EUR: '€',
    GBP: '£',
    GHS: '₵',
    KES: 'KSh',
    ETB: 'Br',
    ZAR: 'R',
    KRW: '₩',
    JPY: '¥',
    CNY: '¥',
    INR: '₹',
    CAD: 'C$',
    AUD: 'A$',
  },
  names: {
    NGN: 'Nigerian Naira',
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    GHS: 'Ghanaian Cedi',
    KES: 'Kenyan Shilling',
    ETB: 'Ethiopian Birr',
    ZAR: 'South African Rand',
    KRW: 'South Korean Won',
    JPY: 'Japanese Yen',
    CNY: 'Chinese Yuan',
    INR: 'Indian Rupee',
    CAD: 'Canadian Dollar',
    AUD: 'Australian Dollar',
  },
};

// Country-to-currency mapping for auto-detection
const COUNTRY_CURRENCY_MAP = {
  Nigeria: 'NGN',
  Ghana: 'GHS',
  Kenya: 'KES',
  Ethiopia: 'ETB',
  'South Africa': 'ZAR',
  'United States': 'USD',
  'United Kingdom': 'GBP',
  Canada: 'CAD',
  Australia: 'AUD',
  Germany: 'EUR',
  France: 'EUR',
  Italy: 'EUR',
  Spain: 'EUR',
  Netherlands: 'EUR',
  China: 'CNY',
  Japan: 'JPY',
  India: 'INR',
  'South Korea': 'KRW',
};

/**
 * @route   GET /api/currency/rates
 * @desc    Get current exchange rates
 * @access  Public
 */
router.get('/rates', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      base: EXCHANGE_RATES.base,
      updated: EXCHANGE_RATES.updated,
      rates: EXCHANGE_RATES.rates,
      symbols: EXCHANGE_RATES.symbols,
      names: EXCHANGE_RATES.names,
    },
  });
}));

/**
 * @route   GET /api/currency/convert
 * @desc    Convert an amount from one currency to another
 * @access  Public
 * @params  amount, from, to
 */
router.get('/convert', asyncHandler(async (req, res) => {
  const { amount, from = 'NGN', to = 'USD' } = req.query;
  const numAmount = parseFloat(amount);

  if (isNaN(numAmount)) {
    return res.status(400).json({ success: false, error: 'Invalid amount' });
  }

  const fromRate = EXCHANGE_RATES.rates[from];
  const toRate = EXCHANGE_RATES.rates[to];

  if (!fromRate || !toRate) {
    return res.status(400).json({ success: false, error: `Unsupported currency: ${!fromRate ? from : to}` });
  }

  // Convert via NGN base: amount_in_NGN = amount / fromRate; result = amount_in_NGN * toRate
  const amountInBase = numAmount / fromRate;
  const converted = amountInBase * toRate;

  res.json({
    success: true,
    data: {
      original: { amount: numAmount, currency: from },
      converted: { amount: Math.round(converted * 100) / 100, currency: to },
      rate: toRate / fromRate,
    },
  });
}));

/**
 * @route   GET /api/currency/detect
 * @desc    Detect currency from country name
 * @access  Public
 * @params  country
 */
router.get('/detect', asyncHandler(async (req, res) => {
  const { country } = req.query;
  if (!country) {
    return res.status(400).json({ success: false, error: 'Country parameter required' });
  }

  const currency = COUNTRY_CURRENCY_MAP[country] || 'NGN';
  res.json({
    success: true,
    data: { country, currency },
  });
}));

module.exports = router;

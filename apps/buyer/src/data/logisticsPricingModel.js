// Simplified Logistics Pricing Model with Google Maps Integration

// Route Categories
export const ROUTE_CATEGORIES = {
  INTRACITY: 'intracity',
  INTERCITY: 'intercity'
};

export const ROUTE_CATEGORY_INFO = {
  intracity: {
    label: 'Intracity',
    description: 'Deliveries within the same city',
    icon: '🏙️',
    color: 'bg-green-100 text-green-800',
    distanceRange: '0-50 km',
    typicalDeliveryTime: '2-6 hours'
  },
  intercity: {
    label: 'Intercity',
    description: 'Deliveries between cities',
    icon: '🚛',
    color: 'bg-blue-100 text-blue-800',
    distanceRange: '50+ km',
    typicalDeliveryTime: '1-3 days'
  }
};

// Default Platform Pricing (used when no logistics partner specified)
export const DEFAULT_PLATFORM_PRICING = {
  ratePerKm: 500, // ₦500 per km
  intracity: {
    minCharge: 2000,   // Minimum ₦2,000
    maxCharge: 10000   // Maximum ₦10,000
  },
  intercity: {
    minCharge: 2000,   // Minimum ₦2,000
    maxCharge: 20000   // Maximum ₦20,000
  }
};

// Weight Brackets (in kg)
export const WEIGHT_BRACKETS = [
  { id: 'light', label: 'Light (0-5 kg)', min: 0, max: 5, multiplier: 1.0 },
  { id: 'medium', label: 'Medium (5-20 kg)', min: 5, max: 20, multiplier: 1.3 },
  { id: 'heavy', label: 'Heavy (20-50 kg)', min: 20, max: 50, multiplier: 1.6 },
  { id: 'bulk', label: 'Bulk (50+ kg)', min: 50, max: Infinity, multiplier: 2.0 }
];

// Delivery Speed Multipliers
export const DELIVERY_SPEED = {
  same_day: { label: 'Same Day', multiplier: 2.5, icon: '⚡' },
  next_day: { label: 'Next Day', multiplier: 1.8, icon: '🚀' },
  express: { label: 'Express (2-3 days)', multiplier: 1.5, icon: '📦' },
  standard: { label: 'Standard (3-5 days)', multiplier: 1.0, icon: '🚚' },
  economy: { label: 'Economy (5-7 days)', multiplier: 0.8, icon: '🐢' }
};

// Additional Service Fees
export const ADDITIONAL_SERVICES = {
  insurance: { label: 'Insurance Coverage', type: 'percentage', value: 0.02 }, // 2% of item value
  signature: { label: 'Signature Required', type: 'flat', value: 50 },
  fragile_handling: { label: 'Fragile Handling', type: 'flat', value: 100 },
  cold_chain: { label: 'Cold Chain (Refrigerated)', type: 'flat', value: 300 },
  hazardous: { label: 'Hazardous Materials', type: 'flat', value: 500 },
  weekend_delivery: { label: 'Weekend Delivery', type: 'percentage', value: 0.3 }, // 30% surcharge
  remote_area: { label: 'Remote Area Fee', type: 'flat', value: 200 }
};

// Simple Pricing Calculation using Google Maps Distance
export const calculateDeliveryPrice = (params) => {
  const {
    distance, // in km (from Google Maps)
    category = null, // 'intracity' or 'intercity' (auto-detected if null)
    ratePerKm = DEFAULT_PLATFORM_PRICING.ratePerKm, // Partner's rate or default ₦500/km
    partnerPricing = null // Optional: logistics partner's custom pricing
  } = params;

  // 1. Auto-detect category based on distance if not provided
  const deliveryCategory = category || determineRouteCategory(distance);

  // 2. Get pricing rules (use partner's custom pricing or platform defaults)
  const pricingRules = partnerPricing || DEFAULT_PLATFORM_PRICING;
  
  // 3. Calculate base price
  let basePrice = distance * ratePerKm;

  // 4. Apply min/max caps based on category
  const categoryLimits = deliveryCategory === 'intracity' 
    ? pricingRules.intracity 
    : pricingRules.intercity;

  // Apply minimum charge
  if (basePrice < categoryLimits.minCharge) {
    basePrice = categoryLimits.minCharge;
  }

  // Apply maximum charge
  if (basePrice > categoryLimits.maxCharge) {
    basePrice = categoryLimits.maxCharge;
  }

  // 5. Round to nearest whole number
  const finalPrice = Math.round(basePrice);

  return {
    distance: Math.round(distance * 10) / 10, // Round to 1 decimal
    category: deliveryCategory,
    ratePerKm,
    calculatedPrice: Math.round(distance * ratePerKm),
    minCharge: categoryLimits.minCharge,
    maxCharge: categoryLimits.maxCharge,
    finalPrice,
    breakdown: {
      baseCalculation: `${distance}km × ₦${ratePerKm}/km = ₦${Math.round(distance * ratePerKm)}`,
      appliedRule: finalPrice === categoryLimits.minCharge 
        ? `Minimum charge applied (₦${categoryLimits.minCharge})`
        : finalPrice === categoryLimits.maxCharge
        ? `Maximum charge applied (₦${categoryLimits.maxCharge})`
        : 'Standard rate applied'
    }
  };
};

// Determine route category based on distance
export const determineRouteCategory = (distance) => {
  // Intracity: within 50km (typically same city)
  // Intercity: 50km+ (between cities)
  return distance <= 50 ? ROUTE_CATEGORIES.INTRACITY : ROUTE_CATEGORIES.INTERCITY;
};

// Recommended pricing for logistics partners (based on platform defaults)
export const RECOMMENDED_PRICING = {
  ratePerKm: {
    min: 300,
    default: 500,
    max: 1000
  },
  intracity: {
    minCharge: 2000,
    maxCharge: 10000
  },
  intercity: {
    minCharge: 2000,
    maxCharge: 20000
  }
};

// Example pricing calculations
export const PRICING_EXAMPLES = [
  {
    scenario: 'Short intracity delivery (5km)',
    distance: 5,
    calculation: '5km × ₦500/km = ₦2,500',
    result: '₦2,500 (within limits)'
  },
  {
    scenario: 'Very short trip (2km)',
    distance: 2,
    calculation: '2km × ₦500/km = ₦1,000',
    result: '₦2,000 (minimum applied)'
  },
  {
    scenario: 'Long intracity (40km)',
    distance: 40,
    calculation: '40km × ₦500/km = ₦20,000',
    result: '₦10,000 (maximum applied)'
  },
  {
    scenario: 'Medium intercity (100km)',
    distance: 100,
    calculation: '100km × ₦500/km = ₦50,000',
    result: '₦20,000 (maximum applied)'
  },
  {
    scenario: 'Short intercity (60km)',
    distance: 60,
    calculation: '60km × ₦500/km = ₦30,000',
    result: '₦20,000 (maximum applied)'
  }
];

// Format currency
export const formatCurrency = (amount) => {
  return `₦${amount.toLocaleString()}`;
};


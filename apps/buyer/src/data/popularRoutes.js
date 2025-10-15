// Popular routes for logistics with suggested pricing

export const POPULAR_INTERCITY_ROUTES = {
  Nigeria: [
    { from: 'Lagos', to: 'Abuja', distance: 750, suggestedPrice: 45000, estimatedTime: '8-12 hours' },
    { from: 'Lagos', to: 'Port Harcourt', distance: 630, suggestedPrice: 38000, estimatedTime: '8-10 hours' },
    { from: 'Lagos', to: 'Ibadan', distance: 130, suggestedPrice: 12000, estimatedTime: '2-3 hours' },
    { from: 'Lagos', to: 'Benin City', distance: 320, suggestedPrice: 22000, estimatedTime: '4-6 hours' },
    { from: 'Lagos', to: 'Kano', distance: 1000, suggestedPrice: 60000, estimatedTime: '12-16 hours' },
    { from: 'Lagos', to: 'Enugu', distance: 650, suggestedPrice: 40000, estimatedTime: '8-10 hours' },
    { from: 'Lagos', to: 'Calabar', distance: 850, suggestedPrice: 50000, estimatedTime: '10-14 hours' },
    { from: 'Abuja', to: 'Lagos', distance: 750, suggestedPrice: 45000, estimatedTime: '8-12 hours' },
    { from: 'Abuja', to: 'Kano', distance: 350, suggestedPrice: 25000, estimatedTime: '5-7 hours' },
    { from: 'Abuja', to: 'Port Harcourt', distance: 700, suggestedPrice: 42000, estimatedTime: '9-12 hours' },
    { from: 'Abuja', to: 'Kaduna', distance: 160, suggestedPrice: 13000, estimatedTime: '2-3 hours' },
    { from: 'Abuja', to: 'Jos', distance: 220, suggestedPrice: 16000, estimatedTime: '3-4 hours' },
    { from: 'Port Harcourt', to: 'Lagos', distance: 630, suggestedPrice: 38000, estimatedTime: '8-10 hours' },
    { from: 'Port Harcourt', to: 'Abuja', distance: 700, suggestedPrice: 42000, estimatedTime: '9-12 hours' },
    { from: 'Port Harcourt', to: 'Enugu', distance: 160, suggestedPrice: 13000, estimatedTime: '2-3 hours' },
    { from: 'Port Harcourt', to: 'Calabar', distance: 220, suggestedPrice: 16000, estimatedTime: '3-4 hours' },
    { from: 'Ibadan', to: 'Lagos', distance: 130, suggestedPrice: 12000, estimatedTime: '2-3 hours' },
    { from: 'Ibadan', to: 'Abuja', distance: 650, suggestedPrice: 40000, estimatedTime: '8-10 hours' },
    { from: 'Kano', to: 'Lagos', distance: 1000, suggestedPrice: 60000, estimatedTime: '12-16 hours' },
    { from: 'Kano', to: 'Abuja', distance: 350, suggestedPrice: 25000, estimatedTime: '5-7 hours' },
    { from: 'Enugu', to: 'Lagos', distance: 650, suggestedPrice: 40000, estimatedTime: '8-10 hours' },
    { from: 'Enugu', to: 'Port Harcourt', distance: 160, suggestedPrice: 13000, estimatedTime: '2-3 hours' },
  ],
  Ghana: [
    { from: 'Accra', to: 'Kumasi', distance: 250, suggestedPrice: 15000, estimatedTime: '3-4 hours' },
    { from: 'Accra', to: 'Tamale', distance: 400, suggestedPrice: 25000, estimatedTime: '6-8 hours' },
    { from: 'Accra', to: 'Takoradi', distance: 230, suggestedPrice: 14000, estimatedTime: '3-4 hours' },
    { from: 'Kumasi', to: 'Accra', distance: 250, suggestedPrice: 15000, estimatedTime: '3-4 hours' },
    { from: 'Kumasi', to: 'Tamale', distance: 320, suggestedPrice: 20000, estimatedTime: '5-6 hours' },
  ],
  Kenya: [
    { from: 'Nairobi', to: 'Mombasa', distance: 480, suggestedPrice: 28000, estimatedTime: '6-8 hours' },
    { from: 'Nairobi', to: 'Kisumu', distance: 350, suggestedPrice: 22000, estimatedTime: '5-7 hours' },
    { from: 'Nairobi', to: 'Nakuru', distance: 160, suggestedPrice: 12000, estimatedTime: '2-3 hours' },
    { from: 'Mombasa', to: 'Nairobi', distance: 480, suggestedPrice: 28000, estimatedTime: '6-8 hours' },
  ],
  'South Africa': [
    { from: 'Johannesburg', to: 'Cape Town', distance: 1400, suggestedPrice: 80000, estimatedTime: '14-18 hours' },
    { from: 'Johannesburg', to: 'Durban', distance: 600, suggestedPrice: 38000, estimatedTime: '7-9 hours' },
    { from: 'Johannesburg', to: 'Pretoria', distance: 60, suggestedPrice: 8000, estimatedTime: '1 hour' },
    { from: 'Cape Town', to: 'Johannesburg', distance: 1400, suggestedPrice: 80000, estimatedTime: '14-18 hours' },
    { from: 'Durban', to: 'Johannesburg', distance: 600, suggestedPrice: 38000, estimatedTime: '7-9 hours' },
  ]
};

export const POPULAR_INTERNATIONAL_ROUTES = [
  // West Africa
  { from: 'Lagos, Nigeria', to: 'Accra, Ghana', distance: 400, suggestedPrice: 120000, estimatedTime: '5-7 days', vehicleTypes: ['Truck', 'Van', 'Flight'] },
  { from: 'Lagos, Nigeria', to: 'Cotonou, Benin', distance: 120, suggestedPrice: 45000, estimatedTime: '2-3 days', vehicleTypes: ['Truck', 'Van'] },
  { from: 'Lagos, Nigeria', to: 'Lomé, Togo', distance: 300, suggestedPrice: 80000, estimatedTime: '4-5 days', vehicleTypes: ['Truck', 'Van'] },
  { from: 'Accra, Ghana', to: 'Lagos, Nigeria', distance: 400, suggestedPrice: 120000, estimatedTime: '5-7 days', vehicleTypes: ['Truck', 'Van', 'Flight'] },
  { from: 'Accra, Ghana', to: 'Abidjan, Ivory Coast', distance: 550, suggestedPrice: 150000, estimatedTime: '6-8 days', vehicleTypes: ['Truck', 'Van'] },
  
  // East Africa
  { from: 'Nairobi, Kenya', to: 'Kampala, Uganda', distance: 650, suggestedPrice: 180000, estimatedTime: '7-10 days', vehicleTypes: ['Truck', 'Van', 'Flight'] },
  { from: 'Nairobi, Kenya', to: 'Dar es Salaam, Tanzania', distance: 700, suggestedPrice: 200000, estimatedTime: '8-12 days', vehicleTypes: ['Truck', 'Van', 'Flight'] },
  { from: 'Nairobi, Kenya', to: 'Kigali, Rwanda', distance: 850, suggestedPrice: 220000, estimatedTime: '10-14 days', vehicleTypes: ['Truck', 'Van', 'Flight'] },
  
  // Southern Africa
  { from: 'Johannesburg, South Africa', to: 'Gaborone, Botswana', distance: 370, suggestedPrice: 110000, estimatedTime: '4-6 days', vehicleTypes: ['Truck', 'Van'] },
  { from: 'Johannesburg, South Africa', to: 'Maputo, Mozambique', distance: 550, suggestedPrice: 160000, estimatedTime: '6-8 days', vehicleTypes: ['Truck', 'Van'] },
  { from: 'Johannesburg, South Africa', to: 'Harare, Zimbabwe', distance: 1000, suggestedPrice: 280000, estimatedTime: '10-14 days', vehicleTypes: ['Truck', 'Van'] },
  
  // North Africa
  { from: 'Cairo, Egypt', to: 'Tripoli, Libya', distance: 1700, suggestedPrice: 450000, estimatedTime: '15-20 days', vehicleTypes: ['Truck', 'Van', 'Flight'] },
  { from: 'Cairo, Egypt', to: 'Khartoum, Sudan', distance: 1900, suggestedPrice: 500000, estimatedTime: '18-22 days', vehicleTypes: ['Truck', 'Van', 'Flight'] },
  
  // Europe-Africa
  { from: 'Lagos, Nigeria', to: 'London, UK', distance: 5100, suggestedPrice: 850000, estimatedTime: '7-10 days', vehicleTypes: ['Flight'] },
  { from: 'Accra, Ghana', to: 'Paris, France', distance: 4900, suggestedPrice: 800000, estimatedTime: '7-10 days', vehicleTypes: ['Flight'] },
  { from: 'Nairobi, Kenya', to: 'Dubai, UAE', distance: 3700, suggestedPrice: 650000, estimatedTime: '5-8 days', vehicleTypes: ['Flight'] },
  { from: 'Johannesburg, South Africa', to: 'London, UK', distance: 9000, suggestedPrice: 1200000, estimatedTime: '10-14 days', vehicleTypes: ['Flight'] },
];

// Get intercity routes for a specific country
export const getIntercityRoutesForCountry = (country) => {
  return POPULAR_INTERCITY_ROUTES[country] || [];
};

// Get all available countries with intercity routes
export const getCountriesWithIntercityRoutes = () => {
  return Object.keys(POPULAR_INTERCITY_ROUTES);
};

// Search routes by origin or destination
export const searchIntercityRoutes = (country, searchTerm) => {
  const routes = getIntercityRoutesForCountry(country);
  if (!searchTerm) return routes;
  
  const term = searchTerm.toLowerCase();
  return routes.filter(route => 
    route.from.toLowerCase().includes(term) || 
    route.to.toLowerCase().includes(term)
  );
};

// Search international routes
export const searchInternationalRoutes = (searchTerm) => {
  if (!searchTerm) return POPULAR_INTERNATIONAL_ROUTES;
  
  const term = searchTerm.toLowerCase();
  return POPULAR_INTERNATIONAL_ROUTES.filter(route => 
    route.from.toLowerCase().includes(term) || 
    route.to.toLowerCase().includes(term)
  );
};

// Helper to format currency
export const formatPrice = (price, currency = '₦') => {
  return `${currency} ${price.toLocaleString()}`;
};

// Calculate price based on partner's rate per km with min/max caps
export const calculatePartnerPrice = (distance, ratePerKm = 500, minCharge = 2000, maxCharge = 100000) => {
  const basePrice = distance * ratePerKm;
  const finalPrice = Math.max(minCharge, Math.min(maxCharge, basePrice));
  
  return {
    basePrice: Math.round(basePrice),
    finalPrice: Math.round(finalPrice),
    appliedMin: basePrice < minCharge,
    appliedMax: basePrice > maxCharge
  };
};

// Compare partner's calculated price with suggested price
export const comparePrices = (partnerPrice, suggestedPrice) => {
  const difference = partnerPrice - suggestedPrice;
  const percentageDiff = ((difference / suggestedPrice) * 100).toFixed(1);
  
  return {
    difference,
    percentageDiff: parseFloat(percentageDiff),
    isHigher: difference > 0,
    isLower: difference < 0,
    isSimilar: Math.abs(percentageDiff) < 5, // Within 5% is considered similar
    recommendation: getRecommendation(parseFloat(percentageDiff))
  };
};

// Get pricing recommendation based on percentage difference
const getRecommendation = (percentageDiff) => {
  if (percentageDiff < -30) return 'Consider increasing price - significantly below market rate';
  if (percentageDiff < -15) return 'Below market rate - may impact profitability';
  if (percentageDiff < -5) return 'Competitive pricing - slightly below market';
  if (percentageDiff <= 5) return 'Market-aligned pricing - good balance';
  if (percentageDiff <= 15) return 'Above market rate - may reduce competitiveness';
  if (percentageDiff <= 30) return 'Significantly above market - consider adjusting';
  return 'Very high pricing - likely to lose customers';
};

// Enrich route with partner pricing calculations
export const enrichRouteWithPartnerPricing = (route, partnerRate = 500, minCharge = 2000, maxCharge = 100000) => {
  const partnerPricing = calculatePartnerPrice(route.distance, partnerRate, minCharge, maxCharge);
  const comparison = comparePrices(partnerPricing.finalPrice, route.suggestedPrice);
  
  return {
    ...route,
    partnerPrice: partnerPricing.finalPrice,
    partnerBasePrice: partnerPricing.basePrice,
    appliedMin: partnerPricing.appliedMin,
    appliedMax: partnerPricing.appliedMax,
    priceDifference: comparison.difference,
    percentageDiff: comparison.percentageDiff,
    priceComparison: comparison.recommendation,
    usePartnerPrice: comparison.isSimilar || comparison.isLower // Default to partner price if similar or lower
  };
};


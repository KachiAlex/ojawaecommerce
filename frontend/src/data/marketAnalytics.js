// Market analytics and competitive pricing insights

// Simulated market data (in production, this would come from aggregated platform data)
export const MARKET_PRICING_DATA = {
  intracity: {
    avgPrice: 5500,
    priceRange: { min: 2000, max: 15000 },
    activePartners: 45,
    avgDeliveriesPerMonth: 350,
    topPricing: 8000,
    bottomPricing: 3000,
    medianPrice: 5000
  },
  intercity: {
    avgPricePerKm: 65,
    priceRange: { min: 10000, max: 80000 },
    activePartners: 32,
    avgDeliveriesPerMonth: 180,
    popularRoutes: {
      'Lagos-Abuja': { avg: 45000, range: { min: 38000, max: 55000 }, deliveries: 450 },
      'Lagos-Port Harcourt': { avg: 38000, range: { min: 32000, max: 45000 }, deliveries: 320 },
      'Lagos-Ibadan': { avg: 12000, range: { min: 10000, max: 15000 }, deliveries: 680 },
      'Abuja-Kano': { avg: 25000, range: { min: 22000, max: 30000 }, deliveries: 280 }
    }
  },
  international: {
    avgPricePerKm: 180,
    priceRange: { min: 50000, max: 1500000 },
    activePartners: 15,
    avgDeliveriesPerMonth: 45,
    popularRoutes: {
      'Lagos-Accra': { avg: 120000, range: { min: 100000, max: 150000 }, deliveries: 120 },
      'Nairobi-Kampala': { avg: 180000, range: { min: 150000, max: 220000 }, deliveries: 80 }
    }
  }
};

// Get market insights for a specific route
export const getRouteMarketInsights = (routeKey, routeType = 'intercity') => {
  const marketData = MARKET_PRICING_DATA[routeType];
  
  // Check if we have specific data for this route
  const routeData = marketData.popularRoutes?.[routeKey];
  
  if (routeData) {
    return {
      hasData: true,
      avgPrice: routeData.avg,
      priceRange: routeData.range,
      monthlyDeliveries: routeData.deliveries,
      demand: routeData.deliveries > 300 ? 'high' : routeData.deliveries > 150 ? 'medium' : 'low',
      competitiveness: calculateCompetitiveness(routeData.deliveries, marketData.activePartners)
    };
  }
  
  // Return general market data
  return {
    hasData: false,
    avgPricePerKm: marketData.avgPricePerKm,
    generalRange: marketData.priceRange,
    activePartners: marketData.activePartners,
    avgDeliveries: marketData.avgDeliveriesPerMonth
  };
};

// Calculate competitiveness score
const calculateCompetitiveness = (deliveries, partners) => {
  const deliveriesPerPartner = deliveries / partners;
  if (deliveriesPerPartner > 20) return 'high_opportunity';
  if (deliveriesPerPartner > 10) return 'moderate';
  return 'saturated';
};

// Get pricing recommendation based on market data
export const getPricingRecommendation = (yourPrice, marketAvg, marketRange) => {
  const percentDiff = ((yourPrice - marketAvg) / marketAvg) * 100;
  
  if (yourPrice < marketRange.min) {
    return {
      type: 'below_range',
      severity: 'error',
      message: `Your price (₦${yourPrice.toLocaleString()}) is below market minimum (₦${marketRange.min.toLocaleString()})`,
      recommendation: 'Consider increasing to at least the market minimum to ensure profitability',
      suggestedPrice: marketRange.min
    };
  }
  
  if (yourPrice > marketRange.max) {
    return {
      type: 'above_range',
      severity: 'warning',
      message: `Your price (₦${yourPrice.toLocaleString()}) is above market maximum (₦${marketRange.max.toLocaleString()})`,
      recommendation: 'High pricing may reduce your competitiveness significantly',
      suggestedPrice: marketRange.max
    };
  }
  
  if (percentDiff < -15) {
    return {
      type: 'competitive_low',
      severity: 'ok',
      message: `Your price is ${Math.abs(percentDiff).toFixed(0)}% below market average`,
      recommendation: 'Competitive pricing - attracts price-sensitive customers',
      suggestedPrice: null
    };
  }
  
  if (percentDiff > 15) {
    return {
      type: 'premium',
      severity: 'warning',
      message: `Your price is ${percentDiff.toFixed(0)}% above market average`,
      recommendation: 'Premium pricing - ensure you offer superior service to justify',
      suggestedPrice: null
    };
  }
  
  return {
    type: 'market_aligned',
    severity: 'ok',
    message: `Your price is well-aligned with market average (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(0)}%)`,
    recommendation: 'Balanced pricing strategy',
    suggestedPrice: null
  };
};

// Get demand indicator
export const getDemandIndicator = (monthlyDeliveries) => {
  if (monthlyDeliveries > 400) return { level: 'very_high', icon: '🔥', label: 'Very High Demand', color: 'red' };
  if (monthlyDeliveries > 250) return { level: 'high', icon: '📈', label: 'High Demand', color: 'orange' };
  if (monthlyDeliveries > 100) return { level: 'medium', icon: '📊', label: 'Medium Demand', color: 'blue' };
  if (monthlyDeliveries > 50) return { level: 'low', icon: '📉', label: 'Low Demand', color: 'gray' };
  return { level: 'very_low', icon: '💤', label: 'Very Low Demand', color: 'gray' };
};

// Calculate opportunity score for a route
export const calculateOpportunityScore = (route, marketInsights) => {
  let score = 50; // Base score
  
  // Demand factor
  if (marketInsights.demand === 'high') score += 30;
  else if (marketInsights.demand === 'medium') score += 15;
  
  // Competition factor
  if (marketInsights.competitiveness === 'high_opportunity') score += 20;
  else if (marketInsights.competitiveness === 'moderate') score += 10;
  else score -= 10; // Saturated market
  
  // Price competitiveness
  if (route.suggestedPrice < marketInsights.avgPrice) score += 10;
  
  return Math.max(0, Math.min(100, score));
};


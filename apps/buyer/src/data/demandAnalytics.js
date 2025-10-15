// Demand-based route recommendations and analytics

// Simulated platform demand data (in production, this would be from Firebase analytics)
export const ROUTE_DEMAND_DATA = {
  // Top routes by delivery volume
  topRoutes: [
    { route: 'Lagos-Ibadan', monthlyDeliveries: 680, growth: 15, avgPartners: 8, opportunityScore: 85 },
    { route: 'Lagos-Abuja', monthlyDeliveries: 450, growth: 8, avgPartners: 12, opportunityScore: 65 },
    { route: 'Lagos-Port Harcourt', monthlyDeliveries: 320, growth: 12, avgPartners: 10, opportunityScore: 70 },
    { route: 'Abuja-Kano', monthlyDeliveries: 280, growth: 22, avgPartners: 6, opportunityScore: 80 },
    { route: 'Nairobi-Mombasa', monthlyDeliveries: 180, growth: 18, avgPartners: 5, opportunityScore: 75 }
  ],
  
  // Growing markets
  growingRoutes: [
    { route: 'Abuja-Kano', growth: 22, monthlyDeliveries: 280, reason: 'Increasing business activity' },
    { route: 'Nairobi-Mombasa', growth: 18, monthlyDeliveries: 180, reason: 'Tourism surge' },
    { route: 'Lagos-Port Harcourt', growth: 12, monthlyDeliveries: 320, reason: 'Oil industry growth' }
  ],
  
  // Underserved routes (high demand, few partners)
  opportunities: [
    { route: 'Port Harcourt-Calabar', demand: 150, partners: 2, gap: 'critical' },
    { route: 'Enugu-Calabar', demand: 120, partners: 3, gap: 'high' },
    { route: 'Ibadan-Benin', demand: 90, partners: 4, gap: 'moderate' }
  ],
  
  // Seasonal trends
  seasonalTrends: {
    december: { multiplier: 1.8, reason: 'Holiday season peak' },
    july: { multiplier: 1.3, reason: 'Mid-year travel' },
    april: { multiplier: 1.2, reason: 'Easter travel' },
    september: { multiplier: 1.4, reason: 'Back to school' }
  }
};

// Get demand recommendation for a route
export const getRouteDemandInfo = (from, to) => {
  const routeKey = `${from}-${to}`;
  const reverseKey = `${to}-${from}`;
  
  // Check top routes
  const topRoute = ROUTE_DEMAND_DATA.topRoutes.find(r => 
    r.route === routeKey || r.route === reverseKey
  );
  
  if (topRoute) {
    return {
      type: 'high_demand',
      monthlyDeliveries: topRoute.monthlyDeliveries,
      growth: topRoute.growth,
      opportunityScore: topRoute.opportunityScore,
      badge: '🔥 High Demand',
      color: 'red'
    };
  }
  
  // Check growing routes
  const growing = ROUTE_DEMAND_DATA.growingRoutes.find(r => 
    r.route === routeKey || r.route === reverseKey
  );
  
  if (growing) {
    return {
      type: 'growing',
      monthlyDeliveries: growing.monthlyDeliveries,
      growth: growing.growth,
      reason: growing.reason,
      badge: '📈 Growing Market',
      color: 'green'
    };
  }
  
  // Check opportunities
  const opportunity = ROUTE_DEMAND_DATA.opportunities.find(r => 
    r.route === routeKey || r.route === reverseKey
  );
  
  if (opportunity) {
    return {
      type: 'opportunity',
      demand: opportunity.demand,
      partners: opportunity.partners,
      gap: opportunity.gap,
      badge: '💡 Opportunity',
      color: 'blue'
    };
  }
  
  return null;
};

// Get seasonal pricing adjustment for current month
export const getSeasonalAdjustment = (month = new Date().getMonth()) => {
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                      'july', 'august', 'september', 'october', 'november', 'december'];
  const monthName = monthNames[month];
  
  const trend = ROUTE_DEMAND_DATA.seasonalTrends[monthName];
  if (trend) {
    return {
      hasAdjustment: true,
      multiplier: trend.multiplier,
      percentIncrease: (trend.multiplier - 1) * 100,
      reason: trend.reason,
      month: monthName
    };
  }
  
  return {
    hasAdjustment: false,
    multiplier: 1,
    percentIncrease: 0
  };
};

// Apply seasonal pricing to routes
export const applySeasonalPricing = (routes, month = new Date().getMonth()) => {
  const adjustment = getSeasonalAdjustment(month);
  if (!adjustment.hasAdjustment) return routes;
  
  return routes.map(route => ({
    ...route,
    price: Math.round(route.price * adjustment.multiplier),
    originalPrice: route.price,
    seasonalAdjustment: adjustment
  }));
};

// Get all route recommendations sorted by priority
export const getTopRecommendations = (limit = 5) => {
  const recommendations = [];
  
  // Add high demand routes
  ROUTE_DEMAND_DATA.topRoutes.slice(0, 3).forEach(route => {
    recommendations.push({
      ...route,
      priority: 'high',
      type: 'demand',
      score: route.opportunityScore
    });
  });
  
  // Add growing markets
  ROUTE_DEMAND_DATA.growingRoutes.slice(0, 2).forEach(route => {
    recommendations.push({
      ...route,
      priority: 'medium',
      type: 'growth',
      score: 70 + route.growth
    });
  });
  
  // Add opportunities
  ROUTE_DEMAND_DATA.opportunities.forEach(route => {
    recommendations.push({
      ...route,
      priority: route.gap === 'critical' ? 'high' : 'medium',
      type: 'opportunity',
      score: route.demand / route.partners * 10
    });
  });
  
  // Sort by score and return top N
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};


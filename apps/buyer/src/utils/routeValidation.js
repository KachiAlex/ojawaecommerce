// Route validation utilities for logistics routes

/**
 * Check if a route already exists in the partner's routes
 */
export const checkDuplicateRoute = (newRoute, existingRoutes) => {
  const duplicates = existingRoutes.filter(route => {
    // For intracity routes, check country, state, city
    if (newRoute.routeType === 'intracity' && route.routeType === 'intracity') {
      return (
        route.country === newRoute.country &&
        route.state === newRoute.state &&
        route.city === newRoute.city
      );
    }
    
    // For intercity/international, check from-to combination (bidirectional)
    if ((newRoute.routeType === 'intercity' || newRoute.routeType === 'international') &&
        (route.routeType === 'intercity' || route.routeType === 'international')) {
      return (
        (route.from === newRoute.from && route.to === newRoute.to) ||
        (route.from === newRoute.to && route.to === newRoute.from) // Check reverse route
      );
    }
    
    return false;
  });
  
  return {
    isDuplicate: duplicates.length > 0,
    duplicates,
    warning: duplicates.length > 0 
      ? `You already have ${duplicates.length} route(s) for this location. Adding this will create duplicate routes.`
      : null
  };
};

/**
 * Validate pricing against market rates
 */
export const validatePricing = (price, suggestedPrice, distance) => {
  const warnings = [];
  const errors = [];
  
  if (!price || price <= 0) {
    errors.push('Price must be greater than zero');
    return { isValid: false, warnings, errors, severity: 'error' };
  }
  
  const priceDiff = ((price - suggestedPrice) / suggestedPrice) * 100;
  
  // Critical pricing issues
  if (priceDiff < -50) {
    warnings.push({
      type: 'pricing_too_low',
      severity: 'error',
      message: `Price is ${Math.abs(priceDiff).toFixed(0)}% below market rate. This may not cover costs.`,
      recommendation: `Consider pricing between ₦${Math.round(suggestedPrice * 0.7).toLocaleString()} - ₦${Math.round(suggestedPrice * 1.3).toLocaleString()}`
    });
  } else if (priceDiff < -30) {
    warnings.push({
      type: 'pricing_low',
      severity: 'warning',
      message: `Price is ${Math.abs(priceDiff).toFixed(0)}% below market rate.`,
      recommendation: 'Ensure this pricing is sustainable for your business.'
    });
  }
  
  if (priceDiff > 50) {
    warnings.push({
      type: 'pricing_too_high',
      severity: 'error',
      message: `Price is ${priceDiff.toFixed(0)}% above market rate. Customers may choose competitors.`,
      recommendation: `Consider pricing between ₦${Math.round(suggestedPrice * 0.7).toLocaleString()} - ₦${Math.round(suggestedPrice * 1.3).toLocaleString()}`
    });
  } else if (priceDiff > 30) {
    warnings.push({
      type: 'pricing_high',
      severity: 'warning',
      message: `Price is ${priceDiff.toFixed(0)}% above market rate.`,
      recommendation: 'This may reduce your competitiveness.'
    });
  }
  
  // Distance-based pricing validation
  const pricePerKm = price / distance;
  if (pricePerKm < 20) {
    warnings.push({
      type: 'price_per_km_low',
      severity: 'warning',
      message: `Rate of ₦${pricePerKm.toFixed(0)}/km seems very low.`,
      recommendation: 'Typical rates are ₦50-100/km for intracity, ₦100-200/km for intercity.'
    });
  }
  if (pricePerKm > 500) {
    warnings.push({
      type: 'price_per_km_high',
      severity: 'warning',
      message: `Rate of ₦${pricePerKm.toFixed(0)}/km seems very high.`,
      recommendation: 'Customers may find this excessive.'
    });
  }
  
  const hasErrors = warnings.some(w => w.severity === 'error');
  
  return {
    isValid: !hasErrors,
    warnings,
    errors,
    severity: hasErrors ? 'error' : warnings.length > 0 ? 'warning' : 'ok'
  };
};

/**
 * Validate estimated time against distance
 */
export const validateEstimatedTime = (estimatedTime, distance, routeType) => {
  const warnings = [];
  
  // Extract hours from estimated time string (e.g., "8-12 hours" -> 10 average)
  const timeMatch = estimatedTime.match(/(\d+)-?(\d+)?\s*(hour|day)/i);
  if (!timeMatch) {
    warnings.push({
      type: 'invalid_time_format',
      severity: 'warning',
      message: 'Time format not recognized. Use format like "2-3 hours" or "1-2 days".',
      recommendation: 'Please specify estimated time clearly.'
    });
    return { isValid: true, warnings }; // Not blocking, just a warning
  }
  
  const minTime = parseInt(timeMatch[1]);
  const maxTime = timeMatch[2] ? parseInt(timeMatch[2]) : minTime;
  const avgTime = (minTime + maxTime) / 2;
  const unit = timeMatch[3].toLowerCase();
  
  // Convert to hours
  const hoursEstimate = unit === 'day' ? avgTime * 24 : avgTime;
  
  // Calculate expected speed
  const avgSpeed = distance / hoursEstimate; // km/h
  
  // Validation rules based on route type and realistic speeds
  if (routeType === 'intracity') {
    // Urban areas: 20-60 km/h is realistic (with traffic)
    if (avgSpeed > 100) {
      warnings.push({
        type: 'unrealistic_time',
        severity: 'error',
        message: `${distance}km in ${estimatedTime} requires ${avgSpeed.toFixed(0)} km/h average speed - unrealistic for city traffic.`,
        recommendation: `For ${distance}km intracity, allow at least ${Math.ceil(distance / 40)}-${Math.ceil(distance / 30)} hours.`
      });
    } else if (avgSpeed < 15) {
      warnings.push({
        type: 'excessive_time',
        severity: 'warning',
        message: `${estimatedTime} seems excessive for ${distance}km.`,
        recommendation: 'Consider if this time estimate is accurate.'
      });
    }
  } else if (routeType === 'intercity') {
    // Highways: 50-100 km/h is realistic
    if (avgSpeed > 120) {
      warnings.push({
        type: 'unrealistic_time',
        severity: 'error',
        message: `${distance}km in ${estimatedTime} requires ${avgSpeed.toFixed(0)} km/h - too fast for safe highway travel.`,
        recommendation: `For ${distance}km intercity, allow at least ${Math.ceil(distance / 80)}-${Math.ceil(distance / 60)} hours.`
      });
    } else if (avgSpeed < 30) {
      warnings.push({
        type: 'excessive_time',
        severity: 'warning',
        message: `${estimatedTime} seems excessive for ${distance}km highway travel.`,
        recommendation: 'Typical intercity speed is 60-80 km/h average.'
      });
    }
  } else if (routeType === 'international') {
    // International can include border delays, multiple stops
    if (avgSpeed > 80) {
      warnings.push({
        type: 'unrealistic_time',
        severity: 'warning',
        message: `${estimatedTime} may be too optimistic for ${distance}km international delivery (border delays, customs, etc.).`,
        recommendation: 'Consider adding buffer time for cross-border processes.'
      });
    }
  }
  
  const hasErrors = warnings.some(w => w.severity === 'error');
  
  return {
    isValid: !hasErrors,
    warnings,
    severity: hasErrors ? 'error' : warnings.length > 0 ? 'warning' : 'ok'
  };
};

/**
 * Validate distance accuracy (if we have GPS data)
 */
export const validateDistance = (userDistance, gpsDistance) => {
  const warnings = [];
  
  if (!gpsDistance) {
    // No GPS data available, can't validate
    return { isValid: true, warnings };
  }
  
  const diff = Math.abs(userDistance - gpsDistance);
  const percentDiff = (diff / gpsDistance) * 100;
  
  if (percentDiff > 30) {
    warnings.push({
      type: 'distance_mismatch',
      severity: 'error',
      message: `Your distance (${userDistance}km) differs significantly from GPS measurement (${gpsDistance}km).`,
      recommendation: `Please verify. GPS shows ${gpsDistance}km for this route.`
    });
  } else if (percentDiff > 15) {
    warnings.push({
      type: 'distance_variance',
      severity: 'warning',
      message: `Distance variance detected. GPS shows ${gpsDistance}km vs your ${userDistance}km.`,
      recommendation: 'Consider using GPS-calculated distance for accuracy.'
    });
  }
  
  const hasErrors = warnings.some(w => w.severity === 'error');
  
  return {
    isValid: !hasErrors,
    warnings,
    severity: hasErrors ? 'error' : warnings.length > 0 ? 'warning' : 'ok'
  };
};

/**
 * Comprehensive route validation
 */
export const validateRoute = (route, existingRoutes = [], marketData = {}) => {
  const validations = {
    duplicate: checkDuplicateRoute(route, existingRoutes),
    pricing: route.price && route.suggestedPrice && route.distance
      ? validatePricing(route.price, route.suggestedPrice, route.distance)
      : { isValid: true, warnings: [], severity: 'ok' },
    time: route.estimatedTime && route.distance
      ? validateEstimatedTime(route.estimatedTime, route.distance, route.routeType)
      : { isValid: true, warnings: [], severity: 'ok' },
    distance: route.distance && marketData.gpsDistance
      ? validateDistance(route.distance, marketData.gpsDistance)
      : { isValid: true, warnings: [], severity: 'ok' }
  };
  
  // Aggregate all warnings
  const allWarnings = [
    ...validations.pricing.warnings,
    ...validations.time.warnings,
    ...validations.distance.warnings
  ];
  
  if (validations.duplicate.isDuplicate) {
    allWarnings.unshift({
      type: 'duplicate_route',
      severity: 'warning',
      message: validations.duplicate.warning,
      recommendation: 'You can proceed, but consider updating the existing route instead.'
    });
  }
  
  // Determine overall validity
  const hasErrors = allWarnings.some(w => w.severity === 'error');
  const hasWarnings = allWarnings.some(w => w.severity === 'warning');
  
  return {
    isValid: !hasErrors,
    canProceed: true, // Always allow, but show warnings
    warnings: allWarnings,
    severity: hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok',
    details: validations
  };
};

/**
 * Format validation warnings for display
 */
export const formatValidationMessage = (validation) => {
  if (!validation.warnings || validation.warnings.length === 0) {
    return null;
  }
  
  const errorWarnings = validation.warnings.filter(w => w.severity === 'error');
  const otherWarnings = validation.warnings.filter(w => w.severity !== 'error');
  
  return {
    hasErrors: errorWarnings.length > 0,
    hasWarnings: otherWarnings.length > 0,
    errorCount: errorWarnings.length,
    warningCount: otherWarnings.length,
    errors: errorWarnings,
    warnings: otherWarnings,
    primaryMessage: errorWarnings.length > 0 
      ? errorWarnings[0].message 
      : otherWarnings[0]?.message || null
  };
};


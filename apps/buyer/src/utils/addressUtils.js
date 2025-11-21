// Address parsing and route detection utilities

// Parse address to extract location details
export const parseAddress = (addressString) => {
  if (!addressString) return null;
  
  const address = addressString.toLowerCase();
  
  // Extract country (look for common African countries)
  const countries = {
    'nigeria': 'Nigeria',
    'ghana': 'Ghana',
    'kenya': 'Kenya',
    'south africa': 'South Africa',
    'ethiopia': 'Ethiopia'
  };
  
  let country = 'Nigeria'; // Default
  for (const [key, value] of Object.entries(countries)) {
    if (address.includes(key)) {
      country = value;
      break;
    }
  }
  
  // Extract state (Nigerian states)
  const nigerianStates = [
    'Lagos', 'Abuja', 'Kano', 'Kaduna', 'Port Harcourt', 'Ibadan', 'Benin', 
    'Jos', 'Ilorin', 'Aba', 'Onitsha', 'Warri', 'Calabar', 'Enugu', 'Abeokuta',
    'Maiduguri', 'Zaria', 'Owerri', 'Uyo', 'Sokoto', 'Akure', 'Osogbo'
  ];
  
  let state = null;
  let city = null;
  
  for (const s of nigerianStates) {
    if (address.includes(s.toLowerCase())) {
      state = s;
      city = s; // In many cases, state name = major city name
      break;
    }
  }
  
  return {
    original: addressString,
    country,
    state,
    city,
    normalized: `${city || state || ''}, ${country}`.trim()
  };
};

// Determine route category based on two addresses
export const determineRouteCategory = (fromAddress, toAddress) => {
  const from = parseAddress(fromAddress);
  const to = parseAddress(toAddress);
  
  if (!from || !to) {
    return {
      category: 'unknown',
      from: null,
      to: null
    };
  }
  
  // International: Different countries
  if (from.country !== to.country) {
    return {
      category: 'international',
      from: from.normalized,
      to: to.normalized,
      fromCountry: from.country,
      toCountry: to.country
    };
  }
  
  // Intracity: Same city/state
  if (from.city && to.city && from.city === to.city) {
    return {
      category: 'intracity',
      from: from.normalized,
      to: to.normalized,
      city: from.city,
      state: from.state
    };
  }
  
  if (from.state && to.state && from.state === to.state) {
    return {
      category: 'intracity',
      from: from.normalized,
      to: to.normalized,
      city: from.state, // Use state as city for pricing
      state: from.state
    };
  }
  
  // Intercity: Different cities/states in same country
  return {
    category: 'intercity',
    from: from.normalized,
    to: to.normalized,
    fromCity: from.city || from.state,
    toCity: to.city || to.state,
    country: from.country
  };
};

// Calculate estimated distance (simplified)
export const estimateDistance = (fromAddress, toAddress, category) => {
  // This is a simplified estimation
  // In production, you'd use Google Maps Distance Matrix API
  
  switch (category) {
    case 'intracity':
      return Math.floor(Math.random() * 30) + 5; // 5-35 km
    case 'intercity':
      // Known route distances
      const knownRoutes = {
        'Lagos-Abuja': 750,
        'Lagos-Port Harcourt': 630,
        'Lagos-Ibadan': 130,
        'Abuja-Kano': 360,
        'Lagos-Kano': 1050
      };
      
      const from = parseAddress(fromAddress);
      const to = parseAddress(toAddress);
      const routeKey = `${from?.city || from?.state}-${to?.city || to?.state}`;
      const reverseKey = `${to?.city || to?.state}-${from?.city || from?.state}`;
      
      return knownRoutes[routeKey] || knownRoutes[reverseKey] || 500;
    case 'international':
      return 2000; // Default for international
    default:
      return 50;
  }
};

// Format location for display
export const formatLocation = (address) => {
  const parsed = parseAddress(address);
  if (!parsed) return address;
  
  return parsed.normalized;
};


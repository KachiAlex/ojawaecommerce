// Route templates and presets for quick route creation

export const ROUTE_TEMPLATE_PRESETS = {
  express_premium: {
    name: 'Express Premium Package',
    description: 'Premium delivery with 20% price increase',
    priceAdjustment: 20, // percentage
    serviceType: 'Express Delivery',
    icon: '⚡'
  },
  economy_budget: {
    name: 'Economy Budget Package',
    description: 'Budget-friendly delivery with 10% discount',
    priceAdjustment: -10,
    serviceType: 'Economy Delivery',
    icon: '💰'
  },
  weekend_special: {
    name: 'Weekend Special',
    description: 'Weekend rates with 15% surcharge',
    priceAdjustment: 15,
    serviceType: 'Weekend Delivery',
    icon: '📅'
  },
  holiday_season: {
    name: 'Holiday Season Rates',
    description: 'Holiday peak season with 25% increase',
    priceAdjustment: 25,
    serviceType: 'Peak Season Delivery',
    icon: '🎄'
  },
  rainy_season: {
    name: 'Rainy Season Adjustment',
    description: 'Weather premium with 12% increase',
    priceAdjustment: 12,
    serviceType: 'All-Weather Delivery',
    icon: '🌧️'
  }
};

// Save custom template
export const saveCustomTemplate = (name, routes, pricing) => {
  const templates = getCustomTemplates();
  const newTemplate = {
    id: Date.now().toString(),
    name,
    routes,
    pricing,
    createdAt: new Date().toISOString()
  };
  
  templates.push(newTemplate);
  localStorage.setItem('logistics_route_templates', JSON.stringify(templates));
  return newTemplate;
};

// Get all custom templates
export const getCustomTemplates = () => {
  const templatesJson = localStorage.getItem('logistics_route_templates');
  if (!templatesJson) return [];
  
  try {
    return JSON.parse(templatesJson);
  } catch {
    return [];
  }
};

// Delete custom template
export const deleteCustomTemplate = (templateId) => {
  const templates = getCustomTemplates();
  const filtered = templates.filter(t => t.id !== templateId);
  localStorage.setItem('logistics_route_templates', JSON.stringify(filtered));
};

// Apply template to routes
export const applyTemplateToRoutes = (routes, template) => {
  if (ROUTE_TEMPLATE_PRESETS[template]) {
    const preset = ROUTE_TEMPLATE_PRESETS[template];
    return routes.map(route => ({
      ...route,
      price: Math.round(route.price * (1 + preset.priceAdjustment / 100)),
      serviceType: preset.serviceType
    }));
  }
  
  return routes;
};


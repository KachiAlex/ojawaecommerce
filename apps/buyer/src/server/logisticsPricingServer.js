/**
 * Express.js Server for Logistics Pricing API
 * This is a sample server implementation showing how to deploy the API
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import the API endpoints
const {
  calculateDelivery,
  getLogisticsPartners,
  updatePricingConfig,
  getPricingConfig,
  getDeliveryZones,
  calculateDeliveryOptions,
  healthCheck
} = require('../api/logisticsPricingAPI');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'https://ojawa-ecommerce.web.app'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// API Routes
app.post('/api/calculate-delivery', calculateDelivery);
app.get('/api/logistics-partners', getLogisticsPartners);
app.put('/api/pricing-config', updatePricingConfig);
app.get('/api/pricing-config', getPricingConfig);
app.get('/api/delivery-zones', getDeliveryZones);
app.post('/api/calculate-delivery-options', calculateDeliveryOptions);
app.get('/api/health', healthCheck);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Logistics Pricing API',
    version: '1.0.0',
    endpoints: [
      'POST /api/calculate-delivery',
      'GET /api/logistics-partners',
      'PUT /api/pricing-config',
      'GET /api/pricing-config',
      'GET /api/delivery-zones',
      'POST /api/calculate-delivery-options',
      'GET /api/health'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Logistics Pricing API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📖 API docs: http://localhost:${PORT}/`);
});

module.exports = app;

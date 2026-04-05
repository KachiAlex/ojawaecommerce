require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Import Firebase Admin
const admin = require('firebase-admin');
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.firestore();
const auth = admin.auth();

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const logisticsRoutes = require('./routes/logistics');

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 8080;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'https://ojawa.africa',
      'https://www.ojawa.africa',
      'https://ojawa-ecommerce.web.app',
      'https://ojawa-ecommerce-staging.web.app'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth-specific rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10, // limit each IP to 10 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api', limiter);
app.use('/auth', authLimiter);

// Health check endpoints
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Ojawa E-commerce Backend API running on Render',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', async (req, res) => {
  try {
    // Test Firebase connectivity
    await db.collection('health').limit(1).get();
    
    res.json({
      status: 'ok',
      services: {
        firebase: 'connected',
        firestore: 'connected',
        authentication: 'connected'
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      project: process.env.FIREBASE_PROJECT_ID
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      message: 'Service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/health/subscriptions', (req, res) => {
  res.json({
    status: 'ok',
    subscriptions: {
      plansAvailable: ['basic', 'pro', 'premium'],
      billingCycles: ['monthly', 'annual'],
      discountPercentage: 16.67,
      discountLabel: '2 months free on annual',
    },
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes); // Add API auth routes for frontend compatibility
app.use('/api/auth/me', require('./routes/authMe')); // Quick fix for /me endpoint
app.use('/api/products', productRoutes);
app.use('/api/cart', authenticateToken, cartRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/logistics', logisticsRoutes);

// Admin routes (require admin authentication)
app.use('/admin', authenticateToken, adminRoutes);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug endpoint (development only)
if (process.env.NODE_ENV === 'development') {
  app.get('/debug/env', (req, res) => {
    const safeEnv = {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      corsOrigins: process.env.ALLOWED_ORIGINS,
      rateLimitWindow: process.env.RATE_LIMIT_WINDOW_MS,
      rateLimitMax: process.env.RATE_LIMIT_MAX_REQUESTS,
      timestamp: new Date().toISOString()
    };
    res.json(safeEnv);
  });
}

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  logger.info(`Health check available at http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = { app, db, auth };

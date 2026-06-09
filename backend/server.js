require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Import PostgreSQL database
const { sequelize } = require('./config/database');
const { User, Product, Order, Cart, CartItem, Vendor, Wallet, Notification, WalletTransaction, EscrowRelease, Withdrawal, AdminAuditLog, SecurityAuditLog, AnalyticsEvent } = require('./models');

// Firebase Admin SDK for authentication only
const admin = require('firebase-admin');
let auth = null;

if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    auth = admin.auth();
    console.log('✅ Firebase Auth initialized (for authentication only)');
  } catch (error) {
    console.error('❌ Firebase Auth initialization failed:', error.message);
  }
} else {
  console.warn('⚠️ Firebase credentials not found - authentication will be limited');
}

// Database connection
let db = null;

if (process.env.DATABASE_URL) {
  db = sequelize;
  console.log('✅ PostgreSQL database configured');
} else {
  console.warn('⚠️ DATABASE_URL not found - database not available');
}

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const messagingRoutes = require('./routes/messaging');
const userRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');
const logisticsRoutes = require('./routes/logistics');

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 8080;

// Needed for Vercel/Reverse proxies so rate limiting & IP detection work properly
app.set('trust proxy', 1);

// Body parsing middleware - MUST be first
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const isServerless = process.env.VERCEL === '1' || !!process.env.NOW_REGION;
const uploadsDir = path.join(__dirname, 'uploads');

if (!isServerless) {
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch (error) {
    console.warn('⚠️ Unable to create uploads directory:', error.message);
  }
}

// CORS configuration - MUST be before helmet and other middleware
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'https://ojawa.africa',
      'https://www.ojawa.africa',
      'https://ojawa-ecommerce.web.app',
      'https://ojawa-ecommerce-staging.web.app',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Handle OPTIONS requests explicitly
app.options('*', cors(corsOptions));

// Security middleware (after CORS to avoid conflicts)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// NOTE: legacy mock auth endpoints removed; all auth flows now handled by authRoutes

// Test route to verify routing works
app.get('/test-route', (req, res) => {
  console.log('🧪 Test route hit!');
  res.json({ message: 'Test route working', timestamp: new Date().toISOString() });
});

// Compression middleware
app.use(compression());

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
    environment: 'production'
  });
});

app.get('/health', async (req, res) => {
  try {
    // Test PostgreSQL connectivity
    await sequelize.authenticate();
    
    res.json({
      status: 'ok',
      services: {
        postgresql: 'connected',
        firebase_auth: auth ? 'connected' : 'not configured'
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV
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

// Mount auth routes at root level for OTP endpoint compatibility
app.use('/', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', authenticateToken, cartRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/users', userRoutes);
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

// Initialize database connection
if (db) {
  sequelize.sync({ force: false })
    .then(() => {
      console.log('✅ Database synchronized successfully');
    })
    .catch((error) => {
      console.error('❌ Database synchronization failed:', error.message);
    });
}

// Start server only if not running on Vercel
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    logger.info(`Health check available at http://localhost:${PORT}/health`);
  });

  // Graceful shutdown (only for local development)
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    if (db) await sequelize.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    if (db) await sequelize.close();
    process.exit(0);
  });
}

// Export for Vercel serverless
module.exports = app;

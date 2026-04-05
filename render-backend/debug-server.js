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
let db, auth;
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }
  db = admin.firestore();
  auth = admin.auth();
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error);
  process.exit(1);
}

// Import routes
const productRoutes = require('./routes/products');

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
});

app.use('/api', limiter);

// Debug endpoints
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Ojawa E-commerce Backend API running on Render',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    projectId: process.env.FIREBASE_PROJECT_ID,
    routes: {
      products: '/api/products',
      health: '/health',
      debug: '/debug'
    }
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
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      message: 'Service unavailable',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/debug', async (req, res) => {
  try {
    // Test products collection
    const productsSnapshot = await db.collection('products').limit(5).get();
    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || 'No name',
      price: doc.data().price || 0,
      status: doc.data().status || 'unknown'
    }));

    res.json({
      status: 'ok',
      message: 'Debug information',
      environment: {
        nodeEnv: process.env.NODE_ENV,
        projectId: process.env.FIREBASE_PROJECT_ID,
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        port: PORT
      },
      firebaseTest: {
        connected: true,
        productsCount: productsSnapshot.size,
        sampleProducts: products
      },
      routes: {
        products: '/api/products',
        health: '/health'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Debug failed',
      error: error.message,
      stack: error.stack
    });
  }
});

// API Routes
app.use('/api/products', productRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Debug info: http://localhost:${PORT}/debug`);
  console.log(`📱 Products API: http://localhost:${PORT}/api/products`);
  console.log(`🔥 Firebase Project: ${process.env.FIREBASE_PROJECT_ID}`);
});

module.exports = app;

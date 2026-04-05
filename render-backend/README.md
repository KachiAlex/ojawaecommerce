# Ojawa E-commerce Backend - Render.com

Complete backend API for Ojawa E-commerce platform, migrated from Firebase Functions to Render.com.

## 🚀 Features

### Core Functionality
- **Authentication** - Firebase Auth integration with JWT tokens
- **Products** - Full CRUD operations with image uploads
- **Cart Management** - Real-time cart operations
- **Order Processing** - Complete order lifecycle
- **Payment Integration** - Paystack & Flutterwave support
- **Notifications** - Real-time notifications system
- **Admin Dashboard** - Analytics and user management
- **Security** - Rate limiting, CORS, validation

### API Endpoints

#### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update profile
- `POST /auth/logout` - Logout
- `POST /auth/forgot-password` - Password reset
- `POST /auth/verify-email` - Email verification

#### Products
- `GET /api/products` - List products (with filtering, pagination, search)
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (vendor/admin)
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/:id/thumbnail` - Upload thumbnail
- `GET /api/products/categories` - Get categories
- `GET /api/products/featured` - Get featured products

#### Cart
- `GET /api/cart` - Get user cart
- `POST /api/cart` - Update cart
- `PUT /api/cart/item` - Update cart item
- `DELETE /api/cart` - Clear cart
- `DELETE /api/cart/item/:productId` - Remove item
- `POST /api/cart/merge` - Merge guest cart
- `GET /api/cart/summary` - Get cart summary

#### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status
- `POST /api/orders/:id/cancel` - Cancel order
- `GET /api/orders/summary` - Order statistics

#### Payments
- `POST /api/payments/wallet/topup` - Wallet top-up
- `POST /api/payments/escrow/create` - Create escrow
- `POST /api/payments/escrow/release` - Release escrow funds
- `POST /api/payments/webhook/paystack` - Paystack webhook

#### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `POST /api/notifications` - Create notification

#### Analytics
- `GET /api/analytics/revenue` - Revenue analytics
- `GET /api/analytics/products` - Product analytics
- `GET /api/analytics/orders` - Order analytics

#### Logistics
- `POST /api/logistics/optimize-route` - Route optimization
- `GET /api/logistics/shipping-cost` - Calculate shipping

#### Admin
- `GET /admin/users` - User management
- `GET /admin/orders` - All orders
- `GET /admin/products` - Product management
- `GET /admin/analytics` - Admin analytics
- `GET /admin/security/events` - Security monitoring

## 🛠️ Installation

### Prerequisites
- Node.js 18+
- Firebase project
- Render.com account

### Setup

1. **Clone and install dependencies**
```bash
cd render-backend
npm install
```

2. **Environment configuration**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Firebase Setup**
- Enable Authentication, Firestore, Storage
- Create service account key
- Configure web API keys

4. **Deploy to Render**
```bash
# Connect to GitHub repository
# Configure build command: npm install
# Configure start command: npm start
# Add environment variables
```

## 🔧 Environment Variables

### Required
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_CLIENT_EMAIL` - Service account email
- `FIREBASE_PRIVATE_KEY` - Service account private key
- `JWT_SECRET` - JWT signing secret

### Optional
- `PAYSTACK_SECRET_KEY` - Paystack integration
- `GOOGLE_MAPS_API_KEY` - Route optimization
- `EMAIL_HOST` - Email configuration
- `NODE_ENV` - Environment (development/production)

## 📁 Project Structure

```
render-backend/
├── server.js              # Main server file
├── package.json           # Dependencies
├── .env.example          # Environment template
├── middleware/           # Custom middleware
│   ├── auth.js           # Authentication middleware
│   └── errorHandler.js   # Error handling
├── routes/               # API routes
│   ├── auth.js           # Authentication endpoints
│   ├── products.js       # Product management
│   ├── cart.js           # Cart operations
│   ├── orders.js         # Order processing
│   ├── payments.js       # Payment handling
│   ├── notifications.js  # Notifications
│   ├── analytics.js      # Analytics endpoints
│   ├── logistics.js      # Route optimization
│   └── admin.js          # Admin endpoints
├── utils/                # Utility functions
│   └── logger.js         # Winston logger
└── uploads/              # File upload directory
```

## 🔐 Security Features

- **Rate Limiting** - Configurable limits per endpoint
- **CORS** - Proper cross-origin configuration
- **Input Validation** - Express-validator integration
- **Authentication** - JWT + Firebase Auth
- **Admin Context Tracking** - IP/user agent monitoring
- **Security Headers** - Helmet.js protection
- **Request Sanitization** - Input cleaning

## 📊 Database Schema

### Users Collection
```javascript
{
  uid: string,
  email: string,
  displayName: string,
  role: 'user' | 'vendor' | 'admin',
  profile: {
    avatar: string,
    phone: string,
    address: object
  },
  settings: {
    notifications: boolean,
    emailMarketing: boolean
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Products Collection
```javascript
{
  name: string,
  description: string,
  price: number,
  category: string,
  stock: number,
  vendorId: string,
  vendorName: string,
  images: array,
  status: 'active' | 'inactive' | 'pending',
  featured: boolean,
  rating: number,
  reviewCount: number,
  viewCount: number,
  salesCount: number,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Orders Collection
```javascript
{
  orderNumber: string,
  buyerId: string,
  items: array,
  deliveryAddress: object,
  paymentMethod: string,
  orderStatus: string,
  paymentStatus: string,
  subtotal: number,
  shippingCost: number,
  tax: number,
  total: number,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## 🚀 Deployment

### Render.com Setup

1. **Create Web Service**
- Connect GitHub repository
- Set build command: `npm install`
- Set start command: `npm start`
- Select Node.js 18 environment

2. **Environment Variables**
- Add all required environment variables
- Set `NODE_ENV=production`
- Configure CORS origins

3. **Health Checks**
- Health endpoint: `/health`
- Auto-deploy on push

### Monitoring

- **Logs** - Winston logging to files and console
- **Health Checks** - Service connectivity monitoring
- **Error Tracking** - Comprehensive error handling
- **Performance** - Request logging and metrics

## 🔄 Migration from Firebase Functions

This backend provides complete compatibility with the existing Firebase Functions API:

1. **Product APIs** - All product endpoints migrated
2. **Cart Operations** - Full cart functionality
3. **Order Management** - Complete order lifecycle
4. **Authentication** - Firebase Auth integration maintained
5. **Admin Functions** - All admin endpoints available
6. **Webhooks** - Payment webhook handling

### Frontend Updates

Update API base URL in frontend services:

```javascript
// Old Firebase Functions
const API_BASE = 'https://your-project.cloudfunctions.net/api';

// New Render Backend
const API_BASE = 'https://ojawaecommerce.onrender.com/api';
```

## 📝 API Documentation

### Authentication Flow

1. **Register/Login** - Get JWT token
2. **Include Token** - `Authorization: Bearer <token>`
3. **Protected Routes** - Token verified automatically

### Error Handling

All endpoints return consistent error format:

```javascript
{
  success: false,
  error: "Error message",
  details: [] // Validation errors if any
}
```

### Success Response

```javascript
{
  success: true,
  message: "Operation successful",
  data: {} // Response data
}
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

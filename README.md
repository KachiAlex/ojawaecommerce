# Ojawa E-commerce Application

A modern, full-stack e-commerce application built with React and Firebase, featuring vendor subscriptions with flexible billing cycles and annual discounts.

## 🚀 Features

- **User Authentication** - Secure login/registration with Firebase Auth
- **Product Management** - Vendor product listing with limits per plan
- **Shopping Cart** - Persistent cart with local storage
- **Payment Processing** - Paystack integration for secure subscription and transaction payments
- **Order Management** - Complete order tracking and fulfillment
- **Vendor Dashboard** - Analytics, subscription management, and billing
- **Admin Dashboard** - Full product, order, and vendor management
- **Responsive Design** - Mobile-first, responsive UI with TailwindCSS
- **Vendor Subscriptions** - Tiered plans with monthly/annual billing and 2-month annual discount

## 📊 Vendor Subscription Plans

Ojawa vendors can upgrade to tier plans to unlock higher product limits, advanced features, and better commission rates.

### Plan Tiers & Pricing

| Feature | Basic | Pro | Premium |
|---------|-------|-----|---------|
| Product Limit | 10 | 20 | 100 |
| Monthly Price | Free | ₦5,000 | ₦15,000 |
| Annual Price | Free | ₦50,000 | ₦150,000 |
| Annual Discount | — | **2 months free** | **2 months free** |
| Commission Rate | 5% | 3% | 2% |
| Images per Product | 6 | 15 | 30 |
| Video Uploads | ❌ | ✅ | ✅ |
| Bulk Operations | ❌ | ✅ | ✅ |
| Support | Email | Priority | Dedicated |
| Payout Cycle | Weekly | Twice Weekly | Daily |

### Annual Discount Details

- **2 Months Free Billing**: When vendors choose annual billing, they pay for 10 months and get 2 months free.
- **Pro Annual**: ₦50,000/year (regularly ₦60,000) = save ₦10,000
- **Premium Annual**: ₦150,000/year (regularly ₦180,000) = save ₦30,000
- **Discount applied automatically** at checkout when selecting annual billing cycle.

## 🏗️ Tech Stack

### Frontend
- **React 19** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **TailwindCSS 4** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Stripe React** - Payment processing components

### Backend
- **Firebase Authentication** - User management
- **Firestore** - NoSQL database with security rules
- **Firebase Functions** - Serverless backend functions
- **Firebase Hosting** - Static site hosting

## 📦 Project Structure

```
ojawa-firebase/
├── apps/
│   └── buyer/                 # React frontend application
│       ├── src/
│       │   ├── components/    # Reusable components
│       │   ├── contexts/      # React context providers
│       │   ├── pages/         # Page components
│       │   ├── utils/         # Utility functions
│       │   └── firebase/      # Firebase configuration
│       └── public/            # Static assets
├── functions/                 # Firebase Functions
├── firestore.rules           # Firestore security rules
├── firestore.indexes.json    # Firestore indexes
└── firebase.json             # Firebase configuration
```

## �️ Subscription Migration Tool

When plan limits or features change, use the migration script to update existing vendor records:

```bash
# Dry-run: preview changes without applying
npm run migrate:subscriptions

# Apply changes to Firestore
npm run migrate:subscriptions:apply

# Or from functions directory:
npm run migrate:subscriptions --prefix functions
npm run migrate:subscriptions:apply --prefix functions
```

The migration script:
- Scans `users` and `subscriptions` collections
- Normalizes billing cycle fields (monthly/annual)
- Updates plan limits, commission rates, and features
- Uses batch operations for efficiency
- Supports dry-run mode by default

**Environment Variables Required:**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## 🧪 Running Tests

```bash
# Run all tests
npm test -- functions/tests

# Run subscription billing tests
npm test -- functions/tests/subscriptions.test.js

# Run backend integration tests
npm test -- functions/tests/server.test.js
```

## 📈 Health Checks

The backend health check endpoints help monitor service status:

```
GET /health                     # Firebase & general health
GET /health/subscriptions       # Subscription service status
```

## ⚡ Performance Optimization

### Current Bundle Sizes (Production Build)
- **vendor-firebase.js**: 471 KB (Firebase SDK)
- **index.js**: 373 KB (Main app bundle)
- **vendor-react.js**: 287 KB (React & dependencies)
- **vendor.js**: 219 KB (npm dependencies)
- **logistics.js**: 176 KB (Logistics feature)
- **admin.js**: 158 KB (Admin dashboard)

### Performance Best Practices Implemented
✅ Code splitting by route (logistics, admin, vendor dashboards)
✅ Lazy loading of heavy components (Analytics, Product Manager)
✅ Firebase Storage direct uploads (no proxy overhead)
✅ Paystack REST API integration (no additional library)
✅ Batch writes in migration scripts (efficient Firestore ops)

### Optimization Opportunities
- Lazy-load logistics assignment UI (not all vendors use it)
- Reduce Firebase SDK footprint by tree-shaking unused modules
- Consider on-demand code loading for admin analytics
- Minify and benchmark critical subscription checkout path

## 🔒 Security Checklist

### ✅ Implemented
- No hardcoded secrets (all uses `.env` via process.env)
- Paystack credentials in server-side environment only
- Firebase service account securely loaded in functions
- Request validation on all payment endpoints
- Firestore security rules enforce authorization
- CORS restricted to approved domains

### 🔄 In Progress / Monitoring
- Annual discount calculation audited for correctness
- Subscription endpoints have structured error logging
- Payment verification against Paystack server
- User ID validation on subscription ownership checks

## 🔄 Development & Deployment

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ojawa-firebase
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   cd apps/buyer
   npm install
   
   # Install functions dependencies
   cd ../../functions
   npm install
   ```

3. **Firebase Setup**
   ```bash
   # Login to Firebase
   firebase login
   
   # Set your Firebase project
   firebase use <your-project-id>
   ```

4. **Environment Setup**
   - Update Firebase configuration in `apps/buyer/src/firebase/config.js`
   - Add your Stripe keys to the application

### Development

1. **Start the development server**
   ```bash
   cd apps/buyer
   npm run dev
   ```

2. **Deploy Firestore rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Seed the database**
   - Navigate to `/admin` in your app (requires admin role)
   - Use the "Seed Complete Database" button

## 🚀 Deployment

### Deploy to Firebase Hosting

1. **Build the application**
   ```bash
   cd apps/buyer
   npm run build
   ```

2. **Deploy to Firebase**
   ```bash
   # Deploy everything
   firebase deploy
   
   # Or deploy specific services
   firebase deploy --only hosting
   firebase deploy --only functions
   firebase deploy --only firestore:rules
   ```

## 🔐 Security

- **Firestore Rules** - Role-based access control
- **Authentication** - Firebase Auth with email/password
- **Payment Security** - Stripe handles all payment data
- **Admin Access** - Restricted to users with `admin` role

## 🛒 Key Features

### For Customers
- Browse products with search and filtering
- Add items to cart with persistent storage
- Secure checkout with Stripe
- Order history and tracking
- User profile management

### For Administrators
- Product management (CRUD operations)
- Order management and tracking
- User management
- Analytics dashboard
- Database seeding tools

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

## 🔧 Configuration

### Firebase Configuration
Update the Firebase config in `apps/buyer/src/firebase/config.js` with your project details.

### Stripe Configuration
1. Add your Stripe publishable key to the frontend
2. Add your Stripe secret key to Firebase Functions environment
3. Configure webhook endpoints for payment confirmations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please create an issue in the repository or contact the development team.

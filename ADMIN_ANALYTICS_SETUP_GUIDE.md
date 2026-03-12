# Admin Analytics Implementation Guide

## Overview

This comprehensive analytics system provides rich data insights for your admin panel, tracking user behavior, app performance, errors, and conversions across your e-commerce platform.

## Components

### 1. **Admin Analytics Service** (`adminAnalyticsService.js`)
Core service that logs events to Firestore and aggregates analytics data.

### 2. **Analytics Hooks** (`useAnalytics.js`)
React hooks for tracking various user actions throughout the app.

### 3. **Admin Dashboard Component** (`AdminAnalyticsDashboard.jsx`)
Beautiful dashboard displaying all analytics metrics.

### 4. **Cloud Functions** (`analytics.js`)
Scheduled functions for report generation, alerts, and data cleanup.

---

## Installation & Setup

### Step 1: Import the Analytics Dashboard into Admin Panel

Add to your `Admin.jsx` or `AdminDashboard.jsx`:

```jsx
import AdminAnalyticsDashboard from '../components/admin/AdminAnalyticsDashboard';

// In your admin component
<AdminAnalyticsDashboard />
```

### Step 2: Deploy Cloud Functions

Add the analytics functions to your `functions/index.js`:

```javascript
const analytics = require('./src/analytics');

exports.generateDailyAnalyticsReport = analytics.generateDailyAnalyticsReport;
exports.checkErrorRateAlert = analytics.checkErrorRateAlert;
exports.checkPerformanceDegradation = analytics.checkPerformanceDegradation;
exports.cleanupOldAnalyticsData = analytics.cleanupOldAnalyticsData;
exports.getAnalyticsSummary = analytics.getAnalyticsSummary;
```

Then deploy:
```bash
firebase deploy --only functions
```

### Step 3: Create Firestore Indexes

The analytics system uses these collections, and you may need to create indexes:

```
- analytics_events (indexed on: category, timestamp)
- user_sessions (indexed on: userId, startTime)
- error_logs (indexed on: timestamp)
- performance_metrics (indexed on: timestamp)
- conversion_funnel (indexed on: funnelType, timestamp)
- daily_reports (no indexes needed)
- analytics_alerts (indexed on: type, resolved)
```

Add these to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "analytics_events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "analytics_events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "user_sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "startTime", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "error_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "conversion_funnel",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "funnelType", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## Usage Examples

### Basic Setup in App Component

Initialize analytics in your main App or layout component:

```jsx
import { useAnalytics } from './hooks/useAnalytics';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { currentUser, userProfile } = useAuth();

  useAnalytics(currentUser?.uid, userProfile?.role);

  return (
    // Your app components
  );
}
```

### Track Page Views

```jsx
import { usePageTracking } from '../hooks/useAnalytics';

function ProductListPage() {
  usePageTracking('Product List');

  return <div>...</div>;
}
```

### Track Button Clicks

```jsx
import { useClickTracking } from '../hooks/useAnalytics';
import { useAuth } from '../contexts/AuthContext';

function CheckoutButton() {
  const { currentUser } = useAuth();
  const trackClick = useClickTracking(currentUser?.uid);

  const handleClick = () => {
    trackClick('checkout_button', {
      cartValue: cart.total,
      itemCount: cart.items.length
    });
    // Proceed with checkout
  };

  return <button onClick={handleClick}>Checkout</button>;
}
```

### Track Orders

```jsx
import { useOrderTracking } from '../hooks/useAnalytics';
import { useAuth } from '../contexts/AuthContext';

function Orders() {
  const { currentUser } = useAuth();
  const { trackOrderCreated, trackOrderStatusChange } = useOrderTracking(currentUser?.uid);

  const handleOrderPlaced = async (orderData) => {
    const orderId = await createOrder(orderData);
    
    trackOrderCreated(orderId, {
      totalAmount: orderData.totalAmount,
      itemCount: orderData.items.length,
      vendorId: orderData.vendorId
    });
  };

  const handleStatusUpdate = (orderId, newStatus) => {
    trackOrderStatusChange(orderId, order.status, newStatus);
    updateOrder(orderId, newStatus);
  };

  return <div>...</div>;
}
```

### Track Products

```jsx
import { useProductTracking } from '../hooks/useAnalytics';
import { useAuth } from '../contexts/AuthContext';

function ProductDetail({ productId, productName, vendorId }) {
  const { currentUser } = useAuth();
  const { trackProductViewed, trackProductAdded } = useProductTracking(currentUser?.uid);

  useEffect(() => {
    trackProductViewed(productId, productName, vendorId);
  }, [productId]);

  const handleAddToCart = (quantity, price) => {
    trackProductAdded(productId, quantity, price);
    addToCart({ productId, quantity, price });
  };

  return <div>...</div>;
}
```

### Track Payments

```jsx
import { usePaymentTracking } from '../hooks/useAnalytics';
import { useAuth } from '../contexts/AuthContext';

function PaymentProcessor() {
  const { currentUser } = useAuth();
  const { trackPaymentInitiated, trackPaymentCompleted, trackPaymentFailed } = usePaymentTracking(currentUser?.uid);

  const handlePayment = async (amount, method) => {
    trackPaymentInitiated(amount, method);

    try {
      const result = await processPayment(amount, method);
      trackPaymentCompleted(amount, method, result.transactionId);
    } catch (error) {
      trackPaymentFailed(amount, method, error.message);
    }
  };

  return <div>...</div>;
}
```

### Track Errors

```jsx
import { useErrorTracking } from '../hooks/useAnalytics';
import { useAuth } from '../contexts/AuthContext';

function ErrorBoundary({ children }) {
  const { currentUser } = useAuth();
  const trackError = useErrorTracking(currentUser?.uid);

  const handleError = (error, errorInfo) => {
    trackError(error, {
      componentStack: errorInfo.componentStack,
      severity: 'critical'
    });

    // Display error to user
  };

  return <div>...</div>;
}
```

### Track Conversion Funnel

```jsx
import { useFunnelTracking } from '../hooks/useAnalytics';
import { useAuth } from '../contexts/AuthContext';

function CheckoutFlow() {
  const { currentUser } = useAuth();
  const trackFunnelStage = useFunnelTracking(currentUser?.uid, 'checkout');

  useEffect(() => {
    trackFunnelStage('view'); // User viewed checkout
  }, []);

  const handleStart = () => {
    trackFunnelStage('start'); // User started checkout
  };

  const handleProgress = () => {
    trackFunnelStage('progress'); // User filled form
  };

  const handleComplete = () => {
    trackFunnelStage('complete'); // User completed checkout
  };

  const handleAbandon = () => {
    trackFunnelStage('abandon'); // User abandoned checkout
  };

  return <div>...</div>;
}
```

### Track Form Submissions

```jsx
import { useFormTracking } from '../hooks/useAnalytics';
import { useAuth } from '../contexts/AuthContext';

function VendorRegistrationForm() {
  const { currentUser } = useAuth();
  const trackFormSubmit = useFormTracking(currentUser?.uid);

  const handleSubmit = (formData) => {
    trackFormSubmit('vendor_registration', {
      businessType: formData.businessType,
      storeCategory: formData.category
    });

    submitForm(formData);
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## Analytics Dashboard

### Accessing the Dashboard

1. Log in as an admin
2. Go to Admin Panel → Analytics
3. View comprehensive metrics

### Available Tabs

- **Overview**: High-level KPIs and event distribution
- **Events**: Detailed event breakdown by category
- **Performance**: Page load times and Core Web Vitals
- **Conversions**: Funnel analysis (checkout, registration, etc.)
- **Errors**: Error tracking and recent error logs

### Key Metrics

- **Total Events**: Cumulative user actions
- **Total Errors**: System errors and exceptions
- **Active Sessions**: Currently active user sessions
- **Unique Users**: Distinct user count
- **Avg Session Duration**: Average time users spend on app
- **Conversion Rates**: Funnel completion percentages

### Export Options

- **JSON**: Full event data in JSON format
- **CSV**: Tabular format for spreadsheet analysis

---

## Tracking Data Schema

### Events Collection

```javascript
{
  eventType: 'user_registered', // or 'order_placed', 'product_viewed', etc.
  category: 'user', // or 'order', 'product', 'payment', 'vendor'
  userId: 'user_123',
  vendorId: null,
  orderId: null,
  productId: null,
  metadata: { /* custom data */ },
  severity: 'info', // or 'warning', 'error', 'critical'
  timestamp: Timestamp,
  userAgent: 'Mozilla/5.0...',
  ipAddress: null,
  sessionId: 'session_...'
}
```

### Error Logs Collection

```javascript
{
  errorType: 'TypeError',
  errorMessage: 'Cannot read property...',
  errorStack: '...',
  userId: 'user_123',
  timestamp: Timestamp,
  metadata: { /* context */ },
  severity: 'error',
  sessionId: 'session_...',
  pagePath: '/products',
  userAgent: 'Mozilla/5.0...'
}
```

### Performance Metrics Collection

```javascript
{
  pageLoadTime: 2145,
  firstContentfulPaint: 1234,
  largestContentfulPaint: 2056,
  cumulativeLayoutShift: 0.15,
  timeToInteractive: 2890,
  userId: 'user_123',
  pagePath: '/products',
  timestamp: Timestamp,
  sessionId: 'session_...',
  metadata: {}
}
```

### User Sessions Collection

```javascript
{
  sessionId: 'session_123',
  userId: 'user_123',
  userRole: 'buyer',
  startTime: Timestamp,
  endTime: Timestamp,
  actions: [],
  pageViews: [],
  errorCount: 2,
  isActive: false
}
```

### Conversion Funnel Collection

```javascript
{
  userId: 'user_123',
  funnelType: 'checkout', // or 'registration', 'listing'
  stage: 'view', // or 'start', 'progress', 'complete', 'abandon'
  timestamp: Timestamp,
  metadata: {},
  sessionId: 'session_...',
  pagePath: '/checkout'
}
```

---

## Cloud Functions

### 1. Daily Analytics Report
- Runs at 2 AM UTC daily
- Generates daily event summaries
- Stores in `daily_reports` collection

### 2. Error Rate Alert
- Checks every hour
- Alerts if >50 errors detected
- Creates alert documents

### 3. Performance Degradation Alert
- Checks every 30 minutes
- Alerts if avg page load > 3s
- Creates alert documents

### 4. Data Cleanup
- Runs at 3 AM UTC daily
- Deletes analytics data older than 90 days
- Reduces Firestore storage costs

---

## Best Practices

1. **Session Tracking**: Always call `useSessionTracking` in your main app component
2. **Error Handling**: Wrap error tracking in try-catch blocks
3. **Performance**: Log performance metrics on page load
4. **Privacy**: Don't track sensitive user data in metadata
5. **Funnel Tracking**: Identify key conversion funnels for your business
6. **Regular Reviews**: Check analytics dashboard weekly for insights
7. **Alerting**: Configure alerts for critical issues

---

## Firestore Storage & Costs

### Data Retention
- Events: 90 days
- Error logs: 90 days
- Performance metrics: 90 days
- Daily reports: Indefinite
- Alerts: Indefinite

### Cost Optimization
- Automatic cleanup of old data after 90 days
- Batch operations for efficiency
- Indexed queries for fast lookups

---

## Troubleshooting

### Events Not Being Logged
1. Check browser console for errors
2. Verify Firestore permissions allow `analytics_events` collection writes
3. Ensure `useAnalytics` hook is initialized
4. Check network tab for failed requests

### Dashboard Not Loading
1. Verify user has admin role
2. Check Firestore indexes are created
3. Clear browser cache
4. Check browser console for errors

### High Firestore Costs
1. Review cleanup schedule (default: 90 days)
2. Reduce event logging granularity if needed
3. Use time range filters in queries

---

## Next Steps

1. ✅ Deploy analytics service
2. ✅ Deploy cloud functions
3. ✅ Add analytics dashboard to admin panel
4. ✅ Integrate tracking hooks in key pages
5. ✅ Test analytics data collection
6. ✅ Review dashboard for insights
7. ✅ Configure alerts and thresholds
8. ✅ Set up regular reporting schedule

---

## Support

For issues or questions:
1. Check Firestore console for errors
2. Review Cloud Functions logs
3. Verify indexes are created
4. Check component integration

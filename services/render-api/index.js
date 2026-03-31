const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Backwards-compatibility: accept requests without `/api` prefix for common endpoints.
// If a request path matches a known API prefix (e.g. `/products`) but doesn't start
// with `/api/`, rewrite the URL to the `/api` equivalent so both `/products` and
// `/api/products` are supported by the same handlers. This helps when the deployed
// service is mounted at root while the frontend expects `/api`.
const compatApiPrefixes = ['products', 'stores', 'users', 'alerts', 'analytics', 'uploads'];
app.use((req, res, next) => {
  try {
    const p = req.path || '';
    if (!p.startsWith('/api/')) {
      for (const prefix of compatApiPrefixes) {
        if (p === `/${prefix}` || p.startsWith(`/${prefix}/`)) {
          req.url = '/api' + req.url;
          break;
        }
      }
    }
  } catch (e) {
    // noop — fall back to normal routing
  }
  next();
});

// Ensure uploads dir exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch (e) { /* ignore */ }

// Serve uploaded thumbnails
app.use('/_fake_thumbs', express.static(UPLOADS_DIR));

// Multer disk storage for thumbnails
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `${req.params.id}-thumb${ext}`;
    cb(null, filename);
  }
});
const upload = multer({ storage });

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// Buyer analytics overview
app.post('/api/analytics/buyer/overview', (req, res) => {
  // Example stubbed payload — replace with real aggregation logic
  const buyers = [
    { id: 'u1', createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000), lastLoginDate: new Date() },
    { id: 'u2', createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000), lastLoginDate: new Date() }
  ];
  const orders = [
    { id: 'o1', buyerId: 'u1', totalAmount: 20000, createdAt: new Date() },
    { id: 'o2', buyerId: 'u2', totalAmount: 5000, createdAt: new Date() }
  ];
  res.json({ buyers, orders, repeatBuyers: 1, abandonedCarts: 2, abandonedCartValue: 3000 });
});

app.post('/api/analytics/buyer/top', (req, res) => {
  const { limit = 10 } = req.body || {};
  const topBuyers = Array.from({ length: limit }).map((_, i) => ({ id: `u${i+1}`, name: `Buyer ${i+1}`, totalSpent: (limit - i) * 10000 }));
  res.json({ topBuyers });
});

app.post('/api/analytics/buyer/growth', (req, res) => {
  const { timeRange = 'month' } = req.body || {};
  const growth = Array.from({ length: 7 }).map((_, i) => ({ date: new Date(Date.now() - i * 24 * 3600 * 1000).toISOString(), newBuyers: Math.floor(Math.random() * 20) }));
  res.json({ growth });
});

app.post('/api/analytics/buyer/engagement', (req, res) => {
  res.json({ sessions: 1200, avgSessionLengthSec: 180, pageViews: 5400 });
});

app.post('/api/analytics/buyer/repeat', (req, res) => {
  res.json({ repeatRate: 0.12, repeatBuyers: 120 });
});

app.post('/api/analytics/buyer/cohort', (req, res) => {
  const cohorts = [
    { cohort: '2025-01', users: 120, retention: [1, 0.5, 0.2] },
    { cohort: '2025-02', users: 80, retention: [1, 0.4, 0.15] }
  ];
  res.json({ cohorts });
});

app.post('/api/analytics/buyer/abandoned', (req, res) => {
  res.json({ abandonedCount: 5, abandonedValue: 4500 });
});

app.post('/api/analytics/buyer/clv', (req, res) => {
  const clv = [
    { segment: 'VIP', avgClv: 120000 },
    { segment: 'High Value', avgClv: 60000 },
    { segment: 'Medium Value', avgClv: 15000 }
  ];
  res.json({ clv });
});

app.post('/api/analytics/buyer/retention', (req, res) => {
  res.json({ retention: { '7d': 0.32, '30d': 0.18, '90d': 0.08 } });
});

app.get('/api/analytics/buyer/:buyerId', (req, res) => {
  const { buyerId } = req.params;
  res.json({ id: buyerId, orders: [], profile: { id: buyerId, name: 'Sample Buyer' } });
});

// Transactions overview
app.post('/api/analytics/transactions/overview', (req, res) => {
  res.json({ totalTransactions: 1500, totalValue: 2500000, byMethod: { card: 1200, wallet: 200, escrow: 100 } });
});

// Platform overview
app.post('/api/analytics/platform/overview', (req, res) => {
  res.json({ uptime: '99.9%', avgLatencyMs: 120, errorRate: 0.003 });
});

// Simple in-memory data to support frontend expectations for basic flows.
const PRODUCTS = [
  { id: 'p1', name: 'Sample Product 1', price: 15000, storeId: 's1' },
  { id: 'p2', name: 'Sample Product 2', price: 25000, storeId: 's2' }
];

const STORES = [
  { id: 's1', name: 'Vendor One', location: 'Lagos' },
  { id: 's2', name: 'Vendor Two', location: 'Abuja' }
];

const USERS = [
  { id: 'u1', name: 'Alice', email: 'alice@example.com' },
  { id: 'u2', name: 'Bob', email: 'bob@example.com' }
];

let ALERTS = [
  { id: 'a1', userId: 'u1', productId: 'p2', threshold: 20000 }
];

// Simple in-memory analytics store
const ANALYTICS = [];

// Products
app.get('/api/products', (req, res) => {
  const { q } = req.query;
  if (q) {
    const qlc = q.toLowerCase();
    const found = PRODUCTS.filter(p => p.name.toLowerCase().includes(qlc)).map(p => {
      // ensure thumbnail field if file exists
      try {
        const files = fs.readdirSync(UPLOADS_DIR);
        const match = files.find(f => f.startsWith(`${p.id}-thumb`));
        if (match) {
          const port = process.env.PORT || 3000;
          p.thumbnail = `http://localhost:${port}/_fake_thumbs/${encodeURIComponent(match)}`;
          p.thumbnails = p.thumbnails && Array.isArray(p.thumbnails) ? [p.thumbnail, ...p.thumbnails.filter(u => u !== p.thumbnail)] : [p.thumbnail];
        }
      } catch (e) { /* ignore */ }
      return p;
    });
    return res.json({ products: found });
  }
  // Attach thumbnail URLs for any uploaded thumbnails
  const items = PRODUCTS.map(p => {
    try {
      const files = fs.readdirSync(UPLOADS_DIR);
      const match = files.find(f => f.startsWith(`${p.id}-thumb`));
      if (match) {
        const port = process.env.PORT || 3000;
        p.thumbnail = `http://localhost:${port}/_fake_thumbs/${encodeURIComponent(match)}`;
        p.thumbnails = p.thumbnails && Array.isArray(p.thumbnails) ? [p.thumbnail, ...p.thumbnails.filter(u => u !== p.thumbnail)] : [p.thumbnail];
      }
    } catch (e) { /* ignore */ }
    return p;
  });

  res.json({ products: items });
});

app.get('/api/products/:id', (req, res) => {
  const p = PRODUCTS.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'not_found' });
  try {
    const files = fs.readdirSync(UPLOADS_DIR);
    const match = files.find(f => f.startsWith(`${p.id}-thumb`));
    if (match) {
      const port = process.env.PORT || 3000;
      p.thumbnail = `http://localhost:${port}/_fake_thumbs/${encodeURIComponent(match)}`;
      p.thumbnails = p.thumbnails && Array.isArray(p.thumbnails) ? [p.thumbnail, ...p.thumbnails.filter(u => u !== p.thumbnail)] : [p.thumbnail];
    }
  } catch (e) { /* ignore */ }

  res.json(p);
});

// Stores
app.get('/api/stores', (req, res) => res.json({ stores: STORES }));
app.get('/api/stores/:id', (req, res) => {
  const s = STORES.find(x => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: 'not_found' });
  res.json(s);
});

// Users
app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  // Direct user lookup
  const u = USERS.find(x => x.id === id);
  if (u) return res.json(u);

  // If the id looks like a product id, attempt to resolve the product's store
  const prod = PRODUCTS.find(p => p.id === id);
  if (prod) {
    const store = STORES.find(s => s.id === prod.storeId);
    if (store) return res.json({ id: store.id, name: store.name, email: `${store.name.replace(/\s+/g,'').toLowerCase()}@example.com`, store: true });
  }

  // Not found
  return res.status(404).json({ error: 'not_found' });
});

// Uploads: accept a generic logo/file upload and return a public URL
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `logo-${Date.now()}${ext}`;
    cb(null, filename);
  }
});
const logoUpload = multer({ storage: logoStorage });

app.post('/api/uploads/logo', logoUpload.single('file'), (req, res) => {
  if (req.file && req.file.filename) {
    const port = process.env.PORT || 3000;
    const url = `http://localhost:${port}/_fake_thumbs/${encodeURIComponent(req.file.filename)}`;
    return res.status(201).json({ url });
  }
  res.status(400).json({ error: 'no_file' });
});

// Alerts (price-drop/notification)
app.get('/api/alerts', (req, res) => {
  const { userId } = req.query;
  if (userId) return res.json({ alerts: ALERTS.filter(a => a.userId === userId) });
  res.json({ alerts: ALERTS });
});

app.post('/api/alerts', (req, res) => {
  const { userId, productId, threshold } = req.body || {};
  if (!userId || !productId) return res.status(400).json({ error: 'missing_params' });
  const id = `a${Date.now()}`;
  const alert = { id, userId, productId, threshold };
  ALERTS.push(alert);
  res.status(201).json(alert);
});

app.delete('/api/alerts/:id', (req, res) => {
  const before = ALERTS.length;
  ALERTS = ALERTS.filter(a => a.id !== req.params.id);
  if (ALERTS.length === before) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

// Thumbnail upload stub - accepts a POST and returns a fake thumbnail URL
// Accept multipart upload for thumbnail and persist to disk
app.post('/api/products/:id/thumbnail', upload.single('file'), (req, res) => {
  const { id } = req.params;
  // If multer saved a file, construct public URL
  if (req.file && req.file.filename) {
    const port = process.env.PORT || 3000;
    const url = `http://localhost:${port}/_fake_thumbs/${encodeURIComponent(req.file.filename)}`;

    // Persist thumbnail URL into PRODUCTS in-memory store if product exists
    const prod = PRODUCTS.find(p => p.id === id);
    if (prod) {
      prod.thumbnail = url;
      prod.thumbnails = prod.thumbnails && Array.isArray(prod.thumbnails) ? [url, ...prod.thumbnails.filter(u => u !== url)] : [url];
    }

    return res.status(201).json({ thumbnailUrl: url });
  }

  // Fallback: no file uploaded — return a generated fake URL
  const port = process.env.PORT || 3000;
  const url = `http://localhost:${port}/_fake_thumbs/${encodeURIComponent(id)}-thumb.jpg`;
  res.status(201).json({ thumbnailUrl: url });
});

// Analytics: accept tracking events and store in-memory
app.post('/api/analytics/track', (req, res) => {
  const event = req.body || {};
  const id = `e${Date.now()}`;
  const timestamp = new Date().toISOString();
  const stored = { id, timestamp, ...event };
  ANALYTICS.push(stored);
  res.status(201).json({ id });
});

// Get analytics for vendor
app.get('/api/analytics/vendor/:vendorId', (req, res) => {
  const { vendorId } = req.params;
  const { range = '30d' } = req.query;
  // simple filtering by vendorId
  const items = ANALYTICS.filter(a => a.vendorId === vendorId || a.vendorId === vendorId.toString());
  res.json({ analytics: items });
});

// Get analytics for product
app.get('/api/analytics/product/:productId', (req, res) => {
  const { productId } = req.params;
  const items = ANALYTICS.filter(a => a.productId === productId || a.productId === productId.toString());
  res.json({ analytics: items });
});

// Product views increment endpoint
app.post('/api/products/:id/incrementViews', (req, res) => {
  const { id } = req.params;
  const prod = PRODUCTS.find(p => p.id === id);
  if (!prod) return res.status(404).json({ error: 'not_found' });
  prod.views = (prod.views || 0) + 1;
  prod.lastViewedAt = new Date().toISOString();
  res.json({ ok: true, views: prod.views });
});

// Default 404
app.use((req, res) => res.status(404).json({ error: 'not_found' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Render API stub listening on port ${PORT}`));

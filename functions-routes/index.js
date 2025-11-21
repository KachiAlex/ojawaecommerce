const { onRequest } = require('firebase-functions/v2/https');
const axios = require('axios');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = getFirestore();

exports.optimizeRoute = onRequest({ cors: true, region: 'us-central1' }, async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { origin, destination, waypoints = [], optimize = true, travelMode = 'DRIVE', routingPreference = 'TRAFFIC_AWARE' } = req.body || {};
    if (!origin || !destination) {
      res.status(400).json({ error: 'origin and destination are required' });
      return;
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Missing GOOGLE_MAPS_API_KEY' });
      return;
    }

    const requestBody = {
      origin: typeof origin === 'string' ? { address: origin } : origin,
      destination: typeof destination === 'string' ? { address: destination } : destination,
      travelMode,
      routingPreference,
      optimizeWaypointOrder: !!optimize,
      intermediates: Array.isArray(waypoints)
        ? waypoints.map((wp) => (typeof wp === 'string' ? { location: { address: wp } } : { location: wp.location || wp }))
        : [],
      polylineQuality: 'HIGH_QUALITY',
      polylineEncoding: 'ENCODED_POLYLINE'
    };

    const headers = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'routes.distanceMeters',
        'routes.duration',
        'routes.polyline.encodedPolyline',
        'routes.optimizedIntermediateWaypointIndex'
      ].join(',')
    };

    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    const { data } = await axios.post(url, requestBody, { headers, timeout: 15000 });
    res.status(200).json({ ok: true, routes: data.routes || [], request: requestBody });
  } catch (error) {
    const status = error.response?.status || 500;
    const details = error.response?.data || { message: error.message };
    console.error('optimizeRoute error:', status, details);
    res.status(status).json({ ok: false, error: 'ROUTES_API_ERROR', details });
  }
});

// Public, read-only: Fetch products for a vendor by store slug
// GET /storeProducts?slug={storeSlug}&limit=12
exports.storeProducts = onRequest({ cors: true, region: 'us-central1' }, async (req, res) => {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    const slug = (req.query.slug || '').toString().trim();
    const limit = Math.min(parseInt(req.query.limit || '12', 10) || 12, 50);
    if (!slug) {
      res.status(400).json({ error: 'Missing vendor slug' });
      return;
    }

    // Find store by slug to get vendorId
    const storeSnap = await db.collection('stores').where('slug', '==', slug).limit(1).get();
    if (storeSnap.empty) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }
    const store = { id: storeSnap.docs[0].id, ...storeSnap.docs[0].data() };
    const vendorId = store.vendorId;

    // Fetch active products for vendor
    const productsSnap = await db.collection('products')
      .where('vendorId', '==', vendorId)
      .where('isActive', '==', true)
      .limit(limit)
      .get();

    const products = productsSnap.docs.map(d => {
      const p = d.data();
      return {
        id: d.id,
        name: p.name,
        price: p.price,
        image: p.image || (Array.isArray(p.images) ? p.images[0] : null),
        currency: p.currency || 'NGN',
        slug: p.slug || d.id
      };
    });

    res.status(200).json({ store: { id: store.id, name: store.name, slug: store.slug }, products });
  } catch (error) {
    console.error('storeProducts error:', error);
    res.status(500).json({ error: 'INTERNAL', message: error.message });
  }
});



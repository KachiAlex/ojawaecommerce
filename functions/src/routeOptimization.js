const { onRequest } = require('firebase-functions/v2/https');
const axios = require('axios');

// HTTP endpoint: POST to compute optimized/multi-stop routes via Google Routes API v2
exports.optimizeRoute = onRequest({ cors: true, region: 'us-central1' }, async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const {
      origin,
      destination,
      waypoints = [],
      optimize = false,
      travelMode = 'DRIVE',
      routingPreference = 'TRAFFIC_AWARE'
    } = req.body || {};

    if (!origin || !destination) {
      res.status(400).json({ error: 'origin and destination are required' });
      return;
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.MAPS_API_KEY || process.env.GCLOUD_MAPS_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Missing Google Maps API key on server' });
      return;
    }

    // Build ComputeRoutes request
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
      // Only request fields we need to reduce payload and cost
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



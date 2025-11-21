const { onRequest } = require('firebase-functions/v2/https');
const axios = require('axios');

// Google Maps API proxy to handle CORS issues
exports.mapsProxy = onRequest({
  cors: true,
  region: 'us-central1'
}, async (req, res) => {
  try {
    const { endpoint, ...params } = req.query;
    const apiKey = 'AIzaSyCw_5hgEojEOW1hAIewyb4TkyHTN2od-Yk';

    if (!endpoint) {
      res.status(400).json({ error: 'Missing endpoint parameter' });
      return;
    }

    // Construct the Google Maps API URL
    const baseUrl = 'https://maps.googleapis.com/maps/api';
    const url = `${baseUrl}/${endpoint}`;
    
    // Add API key to params
    params.key = apiKey;

    // Make the request to Google Maps API
    const response = await axios.get(url, { params });
    
    // Return the response
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Maps proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch from Google Maps API',
      details: error.message 
    });
  }
});

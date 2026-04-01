const { onRequest } = require('firebase-functions/v2/https');
const app = require('./server');
const mapsProxy = require('./src/mapsProxy');

exports.api = onRequest(
  {
    cors: true,
    region: 'us-central1',
    maxInstances: 10,
  },
  app,
);

exports.mapsProxy = mapsProxy.mapsProxy;

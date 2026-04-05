const { onRequest } = require('firebase-functions/v2/https');
// Lazy-load the Express app to avoid heavy initialization at module load time
let _app = null;
function getApp() {
  if (!_app) {
    // require on first request
    _app = require('./server');
  }
  return _app;
}

// Export the API as a request handler that delegates to the Express app
exports.api = onRequest(
  {
    cors: true,
    region: 'us-central1',
    maxInstances: 10,
  },
  (req, res) => {
    const app = getApp();
    return app(req, res);
  },
);

// Keep maps proxy export (lazy require if used elsewhere)
const mapsProxy = require('./src/mapsProxy');
exports.mapsProxy = mapsProxy.mapsProxy;

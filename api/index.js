// Vercel API Entry Point
// This file serves as the main entry point for Vercel deployment

// NOTE: Use the real Express backend (with Sequelize + Firebase) rather than the
// legacy `functions/server`. This keeps the Vercel deployment in sync with the
// code we run locally/in Render.
const app = require('../backend/server');

// Export the Express app as a Vercel function
module.exports = (req, res) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }
  
  return app(req, res);
};

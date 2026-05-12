/**
 * Lighthouse Performance Testing Configuration
 * Run: npx lighthouse https://ojawa-ecommerce.web.app --config-path=performance-tests/lighthouse.config.js
 */

module.exports = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    skipAudits: [
      'uses-http2',
      'uses-long-cache-ttl'
    ],
    throttling: {
      rttMs: 40,
      throughputKbps: 10 * 1024,
      cpuSlowdownMultiplier: 1
    },
    throttlingMethod: 'simulate',
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1
    }
  }
};


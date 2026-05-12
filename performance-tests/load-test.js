/**
 * Load Testing with k6
 * Install: https://k6.io/docs/getting-started/installation/
 * Run: k6 run performance-tests/load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.01'],     // Error rate should be less than 1%
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://ojawa-ecommerce.web.app';

export default function () {
  // Test homepage
  let response = http.get(`${BASE_URL}/`);
  check(response, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage loads in < 2s': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);

  sleep(1);

  // Test products page
  response = http.get(`${BASE_URL}/products`);
  check(response, {
    'products page status is 200': (r) => r.status === 200,
    'products page loads in < 3s': (r) => r.timings.duration < 3000,
  }) || errorRate.add(1);

  sleep(1);

  // Test API endpoint (if available)
  response = http.get(`${BASE_URL}/api/products`);
  check(response, {
    'API responds': (r) => r.status === 200 || r.status === 404, // 404 is OK if endpoint doesn't exist
  }) || errorRate.add(1);

  sleep(1);
}

export function handleSummary(data) {
  return {
    'performance-tests/results/summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}


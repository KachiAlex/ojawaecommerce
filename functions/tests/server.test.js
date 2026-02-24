const request = require('supertest');
const admin = require('firebase-admin');
const app = require('../server');

// Mock Firebase Admin for testing (optional: configure emulator or use test credentials)
// admin.initializeApp({ ... });

describe('Ojawa Backend API', () => {
  let idToken;
  let adminIdToken;

  beforeAll(async () => {
    // TODO: Obtain a valid user and admin Firebase ID token for testing
    // idToken = await getTestUserIdToken();
    // adminIdToken = await getTestAdminIdToken();
  });

  it('should list products', async () => {
    const res = await request(app).get('/products');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.products)).toBe(true);
  });

  it('should reject cart access without auth', async () => {
    const res = await request(app).get('/cart');
    expect(res.statusCode).toBe(401);
  });

  // Add more tests for /cart, /orders, /admin/products, /notifications, etc.
  // Example for authenticated route:
  // it('should get user cart', async () => {
  //   const res = await request(app)
  //     .get('/cart')
  //     .set('Authorization', `Bearer ${idToken}`);
  //   expect(res.statusCode).toBe(200);
  // });
});

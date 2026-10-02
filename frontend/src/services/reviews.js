import { api } from './api';

export const reviewsService = {
  async submitVendorReview({ vendorId, rating, comment, userId, orderId, productId }) {
    const res = await api.request('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ vendorId, rating, comment, userId, orderId, productId }),
      headers: { 'Content-Type': 'application/json' }
    });
    return res?.data || res;
  },
  async getProductReviews(productId, { page = 1, limit = 10, sort = 'recent' } = {}) {
    const res = await api.request(`/api/reviews/product/${encodeURIComponent(productId)}?page=${page}&limit=${limit}&sort=${sort}`);
    return res?.data || res;
  },
  async getMyReviews(userId, { page = 1, limit = 20 } = {}) {
    const res = await api.request(`/api/reviews/my-reviews?page=${page}&limit=${limit}`);
    return res?.data?.reviews || res?.data || [];
  }
};

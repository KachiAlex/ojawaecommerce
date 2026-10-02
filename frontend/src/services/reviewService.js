const API_BASE = import.meta.env.VITE_API_BASE_URL || window.location.origin;

class ReviewService {
  getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      },
      ...options
    };

    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  }

  // Submit a review
  async submitReview(reviewData) {
    return this.request('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData)
    });
  }

  // Get reviews for a product
  async getProductReviews(productId, options = {}) {
    const { page = 1, limit = 10, sortBy = 'newest' } = options;
    return this.request(`/api/reviews/product/${productId}?page=${page}&limit=${limit}&sortBy=${sortBy}`);
  }

  // Get my reviews
  async getMyReviews(options = {}) {
    const { page = 1, limit = 10 } = options;
    return this.request(`/api/reviews/my-reviews?page=${page}&limit=${limit}`);
  }

  // Mark review as helpful
  async markHelpful(reviewId) {
    return this.request(`/api/reviews/${reviewId}/helpful`, {
      method: 'PUT'
    });
  }

  // Admin: get pending reviews
  async getPendingReviews(options = {}) {
    const { page = 1, limit = 20 } = options;
    return this.request(`/api/reviews/pending?page=${page}&limit=${limit}`);
  }

  // Admin: approve/reject review
  async updateReviewStatus(reviewId, status) {
    return this.request(`/api/reviews/${reviewId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }
}

export default new ReviewService();

import { errorLogger } from '../utils/errorLogger';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://ojawaecommerce.onrender.com';

class ProductService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('authToken');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      errorLogger.error('ProductService API Error:', {
        endpoint,
        error: error.message,
        status: error.response?.status
      });
      throw error;
    }
  }

  // Get all products with optional filters
  async getProducts(filters = {}) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });

    const endpoint = `/api/products${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.request(endpoint);
    
    return response.data || { products: [], pagination: {} };
  }

  // Get single product by ID
  async getProduct(id) {
    const response = await this.request(`/api/products/${id}`);
    return response.data;
  }

  // Get featured products
  async getFeaturedProducts(limit = 20) {
    const response = await this.request(`/api/products/featured/list?limit=${limit}`);
    return response.data || [];
  }

  // Get product categories
  async getCategories() {
    const response = await this.request('/api/products/categories/list');
    return response.data || [];
  }

  // Search products
  async searchProducts(query, filters = {}) {
    return this.getProducts({ search: query, ...filters });
  }

  // Add product to cart
  async addToCart(productId, quantity = 1, variant = null) {
    const response = await this.request('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify({
        productId,
        quantity,
        variant
      })
    });
    
    return response.data;
  }

  // Get cart items
  async getCart() {
    const response = await this.request('/api/cart');
    return response.data || { items: [], total: 0 };
  }

  // Update cart item quantity
  async updateCartItem(itemId, quantity) {
    const response = await this.request('/api/cart/update', {
      method: 'PUT',
      body: JSON.stringify({ itemId, quantity })
    });
    
    return response.data;
  }

  // Remove item from cart
  async removeFromCart(itemId) {
    const response = await this.request(`/api/cart/remove/${itemId}`, {
      method: 'DELETE'
    });
    
    return response.data;
  }

  // Clear cart
  async clearCart() {
    const response = await this.request('/api/cart/clear', {
      method: 'DELETE'
    });
    
    return response.data;
  }

  // Create order from cart
  async createOrder(orderData) {
    const response = await this.request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
    
    return response.data;
  }

  // Get user orders
  async getOrders(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });

    const endpoint = `/api/orders${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.request(endpoint);
    
    return response.data || { orders: [], pagination: {} };
  }

  // Get single order
  async getOrder(orderId) {
    const response = await this.request(`/api/orders/${orderId}`);
    return response.data;
  }

  // Update order status
  async updateOrderStatus(orderId, status) {
    const response = await this.request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    
    return response.data;
  }

  // Seed products (for development)
  async seedProduct(productData) {
    const response = await this.request('/api/products/seed', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
    
    return response.data;
  }
}

// Create singleton instance
const productService = new ProductService();

export default productService;

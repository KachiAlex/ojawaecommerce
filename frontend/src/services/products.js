import { api } from './api';

function normalizeStock(product) {
  if (!product) return product;
  const stock = product.stock ?? product.stockQuantity ?? 0;
  return { ...product, stock, stockQuantity: stock };
}

function buildProductFormData(productData, vendorId, productId, storeId) {
  const form = new FormData();
  if (vendorId) form.append('vendorId', vendorId);
  if (storeId) form.append('storeId', storeId);
  if (productId) form.append('productId', productId);

  const fields = ['name', 'description', 'price', 'category', 'brand', 'currency', 'stock', 'condition', 'processingTimeDays', 'status', 'featured', 'isActive'];
  fields.forEach(field => {
    if (productData[field] !== undefined && productData[field] !== null) {
      form.append(field, productData[field]);
    }
  });

  ['specifications', 'shipping', 'dimensions', 'features', 'tags'].forEach(field => {
    if (productData[field] !== undefined && productData[field] !== null) {
      form.append(field, JSON.stringify(productData[field]));
    }
  });

  if (productData.images && productData.images.length > 0) {
    const existingImages = [];
    productData.images.forEach(img => {
      if (img instanceof File) {
        form.append('images', img);
      } else if (typeof img === 'string') {
        existingImages.push({ url: img, alt: productData.name || 'Product image', type: 'image' });
      } else {
        existingImages.push(img);
      }
    });
    if (existingImages.length > 0) {
      form.append('existingImages', JSON.stringify(existingImages));
    }
  }

  if (productData.videos && productData.videos.length > 0) {
    productData.videos.forEach(video => {
      if (video instanceof File) {
        form.append('videos', video);
      }
    });
  }

  return form;
}

function buildParams(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  });
  return params.toString();
}

export const productService = {
  normalizeStock,

  async getAll(filters = {}) {
    const res = await api.request(`/api/products?${buildParams(filters)}`);
    return (res.data?.products || []).map(normalizeStock);
  },

  async getProductsPaged(filters = {}) {
    const res = await api.request(`/api/products?${buildParams(filters)}`);
    return {
      products: (res.data?.products || []).map(normalizeStock),
      pagination: res.data?.pagination || null,
    };
  },

  async getMeta() {
    const res = await api.request('/api/products/meta');
    return res.data || { categories: [], brands: [], priceRange: { min: 0, max: 10000000 } };
  },

  async getById(id) {
    const res = await api.request(`/api/products/${encodeURIComponent(id)}`);
    return normalizeStock(res.data || null);
  },

  async getFeaturedProducts(limit = 20) {
    const res = await api.request(`/api/products/featured/list?limit=${limit}`);
    return (res.data || []).map(normalizeStock);
  },

  async getCategories() {
    const res = await api.request('/api/products/categories/list');
    return res.data || [];
  },

  async searchProducts(query, filters = {}) {
    return this.getAll({ search: query, ...filters });
  },

  async getProducts(filters = {}) {
    const res = await api.request(`/api/products?${buildParams(filters)}`);
    const data = res.data || { products: [], pagination: {} };
    if (data.products) {
      data.products = data.products.map(normalizeStock);
    }
    return data;
  },

  async getByVendor(vendorId) {
    const res = await api.request(`/api/products?vendorId=${encodeURIComponent(vendorId)}&limit=100`);
    return (res.data?.products || []).map(normalizeStock);
  },

  async getByVendorPaged({ vendorId, pageSize = 20 }) {
    const res = await api.request(`/api/products?vendorId=${encodeURIComponent(vendorId)}&limit=${pageSize}`);
    return {
      items: (res.data?.products || []).map(normalizeStock),
      total: res.data?.pagination?.totalItems || 0
    };
  },

  async getByVendorEmail(email) {
    const res = await api.request('/api/products?limit=100');
    const products = res.data?.products || [];
    return products.filter(p => p.vendorEmail === email || p.vendorId === email).map(normalizeStock);
  },

  buildProductFormData,

  async create(productData, vendorId, storeId = null) {
    const form = buildProductFormData(productData, vendorId, null, storeId);
    const res = await api.request('/api/products', { method: 'POST', body: form });
    return normalizeStock(res?.data || res);
  },

  async update(productId, productData) {
    const form = buildProductFormData(productData, null, productId, null);
    const res = await api.request(`/api/products/${encodeURIComponent(productId)}`, { method: 'PUT', body: form });
    return normalizeStock(res?.data || res);
  },

  // Plain JSON update for field-level changes (no form-data coercion)
  async updateRaw(productId, fields) {
    const res = await api.request(`/api/products/${encodeURIComponent(productId)}`, {
      method: 'PUT',
      body: JSON.stringify(fields)
    });
    return normalizeStock(res?.data || res);
  },

  async delete(productId) {
    const res = await api.request(`/api/products/${encodeURIComponent(productId)}`, { method: 'DELETE' });
    return res?.data || res;
  },

  async saveWithUploadsWithProgress(productData, vendorId, productId = null, storeId = null, { onProgress } = {}) {
    const progressTimer = onProgress
      ? setInterval(() => {
          onProgress(Math.min(95, Math.floor(Math.random() * 40) + 30));
        }, 300)
      : null;

    try {
      let result;
      if (productId) {
        result = await this.update(productId, { ...productData, vendorId, storeId });
      } else {
        result = await this.create(productData, vendorId, storeId);
      }
      if (progressTimer) clearInterval(progressTimer);
      if (onProgress) onProgress(100);
      return result;
    } catch (error) {
      if (progressTimer) clearInterval(progressTimer);
      throw error;
    }
  },

  async addToCart(productId, quantity = 1, variant = null) {
    const res = await api.request('/api/cart/add', { method: 'POST', body: JSON.stringify({ productId, quantity, variant }) });
    return res?.data;
  },

  async getCart() {
    const res = await api.request('/api/cart');
    return res?.data || { items: [], total: 0 };
  },

  async updateCartItem(itemId, quantity) {
    const res = await api.request('/api/cart/update', { method: 'PUT', body: JSON.stringify({ itemId, quantity }) });
    return res?.data;
  },

  async removeFromCart(itemId) {
    const res = await api.request(`/api/cart/remove/${itemId}`, { method: 'DELETE' });
    return res?.data;
  },

  async clearCart() {
    const res = await api.request('/api/cart/clear', { method: 'DELETE' });
    return res?.data;
  }
};

export const productsService = productService;

import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

// ===============================
// ID GENERATION UTILITIES
// ===============================

/**
 * Generate a unique wallet ID with proper formatting
 * Format: WLT-YYYY-XXXXXX (e.g., WLT-2024-ABC123)
 */
export const generateWalletId = () => {
  const year = new Date().getFullYear();
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `WLT-${year}-${randomStr}`;
};

/**
 * Generate a unique product tracking number
 * Format: PRD-YYYY-XXXXXX (e.g., PRD-2024-XYZ789)
 */
export const generateProductTrackingNumber = () => {
  const year = new Date().getFullYear();
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PRD-${year}-${randomStr}`;
};

/**
 * Generate a unique store ID with proper formatting
 * Format: STO-YYYY-XXXXXX (e.g., STO-2024-DEF456)
 */
export const generateStoreId = () => {
  const year = new Date().getFullYear();
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `STO-${year}-${randomStr}`;
};

/**
 * Generate a unique order tracking number
 * Format: ORD-YYYY-XXXXXX (e.g., ORD-2024-GHI789)
 */
export const generateOrderTrackingNumber = () => {
  const year = new Date().getFullYear();
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${year}-${randomStr}`;
};

/**
 * Generate a shareable store link
 * Format: /store/{storeId} (e.g., /store/STO-2024-DEF456)
 */
export const generateStoreLink = (storeId) => {
  return `/store/${storeId}`;
};

// ===============================
// WALLET TRACKING SERVICE
// ===============================

export const walletTrackingService = {
  // Create wallet with proper ID tracking
  async createWallet(userId, userType, customWalletId = null) {
    try {
      const walletId = customWalletId || generateWalletId();
      
      const walletData = {
        walletId, // Our custom tracking ID
        userId,
        userType,
        balance: 0,
        currency: 'NGN',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Additional tracking fields
        totalTransactions: 0,
        totalCredits: 0,
        totalDebits: 0,
        lastTransactionAt: null
      };
      
      // Check if wallet ID already exists
      const existingWallet = await this.getWalletByTrackingId(walletId);
      if (existingWallet) {
        throw new Error(`Wallet ID ${walletId} already exists`);
      }
      
      // Use REST endpoint to create wallet record while backend is migrated
      const resp = await axios.post(`${API_BASE}/api/wallets`, {
        ...walletData
      })
      return { id: resp?.data?.id || resp?.data?._id || null, walletId, ...walletData };
    } catch (error) {
      console.error('Error creating wallet with tracking:', error);
      throw error;
    }
  },

  // Get wallet by our custom tracking ID
  async getWalletByTrackingId(walletId) {
    try {
      const resp = await axios.get(`${API_BASE}/api/wallets`, { params: { walletId } });
      const wallets = resp?.data?.wallets || resp?.data || [];
      const wallet = Array.isArray(wallets) ? wallets[0] : wallets;
      if (!wallet) return null;
      return { id: wallet.id || wallet._id || wallet.walletId, ...wallet };
    } catch (error) {
      console.error('Error fetching wallet by tracking ID:', error);
      throw error;
    }
  },

  // Get wallet by user ID
  async getWalletByUserId(userId) {
    try {
      if (!userId || userId === 'unknown') {
        console.error('Invalid user ID provided:', userId);
        return null;
      }
      const resp = await axios.get(`${API_BASE}/api/wallets`, { params: { userId } });
      const wallets = resp?.data?.wallets || resp?.data || [];
      const wallet = Array.isArray(wallets) ? wallets[0] : wallets;
      if (!wallet) {
        console.log(`No wallet found for user ${userId}`);
        return null;
      }
      return { id: wallet.id || wallet._id || null, ...wallet };
    } catch (error) {
      console.error('Error fetching wallet by user ID:', error);
      return null; // Return null instead of throwing
    }
  },

  // Update wallet tracking statistics
  async updateWalletStats(walletId, transactionType, amount) {
    try {
      const wallet = await this.getWalletByTrackingId(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      const updates = {
        totalTransactions: (wallet.totalTransactions || 0) + 1,
        lastTransactionAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (transactionType === 'credit') {
        updates.totalCredits = (wallet.totalCredits || 0) + amount;
      } else if (transactionType === 'debit') {
        updates.totalDebits = (wallet.totalDebits || 0) + amount;
      }

      // Update via REST
      try {
        await axios.put(`${API_BASE}/api/wallets/${wallet.id}`, updates);
      } catch (error) {
        // Try with _id fallback
        await axios.put(`${API_BASE}/api/wallets/${wallet._id || wallet.id}`, updates).catch(() => {});
      }

      return { ...wallet, ...updates };
    } catch (error) {
      console.error('Error updating wallet stats:', error);
      throw error;
    }
  }
};

// ===============================
// PRODUCT TRACKING SERVICE
// ===============================

export const productTrackingService = {
  // Create product with tracking number
  async createProduct(productData, vendorId, storeId = null) {
    try {
      if (!vendorId) {
        throw new Error('vendorId is required to create a product');
      }
      
      const trackingNumber = generateProductTrackingNumber();
      
      // Fetch vendor email to ensure complete vendor reference
      let vendorEmail = productData.vendorEmail;
      try {
        const vRes = await axios.get(`${API_BASE}/api/users/${vendorId}`);
        const vendorData = vRes?.data || {};
        vendorEmail = vendorEmail || vendorData.email || null;
      } catch (vendorError) {
        console.error('Error fetching vendor email for tracking:', vendorError);
        throw new Error(`Invalid vendorId: ${vendorId}. Vendor not found in users collection.`);
      }
      
      // Check for duplicate products (same name from same vendor)
      if (productData.name) {
        try {
          const dupRes = await axios.get(`${API_BASE}/api/products`, { params: { vendorId, name: productData.name.trim() } });
          const dupProducts = dupRes?.data?.products || dupRes?.data || [];
          if (Array.isArray(dupProducts) && dupProducts.length > 0) {
            throw new Error(`A product with the name "${productData.name}" already exists. Please use a different name or edit the existing product.`);
          }
        } catch (duplicateError) {
          if (duplicateError.message && duplicateError.message.includes('already exists')) {
            throw duplicateError;
          }
          console.warn('Error checking for duplicate products:', duplicateError);
        }
      }
      
      const productPayload = {
        ...productData,
        trackingNumber, // Our custom tracking number
        vendorId, // Always required - primary reference
        vendorEmail: vendorEmail || productData.vendorEmail || null, // Secondary reference for queries
        storeId, // Optional store assignment
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Additional tracking fields
        viewCount: 0,
        orderCount: 0,
        totalRevenue: 0,
        lastOrderedAt: null,
        isActive: true
      };

      // Check if tracking number already exists
      const existingProduct = await this.getProductByTrackingNumber(trackingNumber);
      if (existingProduct) {
        throw new Error(`Product tracking number ${trackingNumber} already exists`);
      }

      const createRes = await axios.post(`${API_BASE}/api/products`, productPayload);
      const created = createRes?.data || {};
      return { id: created.id || created._id || null, trackingNumber, ...productPayload };
    } catch (error) {
      console.error('Error creating product with tracking:', error);
      throw error;
    }
  },

  // Get product by tracking number
  async getProductByTrackingNumber(trackingNumber) {
    try {
      const resp = await axios.get(`${API_BASE}/api/products`, { params: { trackingNumber } });
      const products = resp?.data?.products || resp?.data || [];
      const prod = Array.isArray(products) ? products[0] : products;
      if (!prod) return null;
      return { id: prod.id || prod._id || null, ...prod };
    } catch (error) {
      console.error('Error fetching product by tracking number:', error);
      throw error;
    }
  },

  // Update product tracking statistics
  async updateProductStats(productId, action, data = {}) {
    try {
      // Fetch current product via REST
      const pRes = await axios.get(`${API_BASE}/api/products/${productId}`);
      const currentData = pRes?.data || null;
      if (!currentData) throw new Error('Product not found');
      const updates = { updatedAt: new Date().toISOString() };

      switch (action) {
        case 'view':
          updates.viewCount = (currentData.viewCount || 0) + 1;
          break;
        case 'order':
          updates.orderCount = (currentData.orderCount || 0) + 1;
          updates.totalRevenue = (currentData.totalRevenue || 0) + (data.amount || 0);
          updates.lastOrderedAt = new Date().toISOString();
          break;
        case 'stock_update':
          updates.stock = data.stock;
          updates.inStock = data.stock > 0;
          break;
      }

      await axios.put(`${API_BASE}/api/products/${productId}`, updates).catch(async () => {
        await axios.put(`${API_BASE}/api/products/${productId}`, updates).catch(() => {});
      });
      return { ...currentData, ...updates };
    } catch (error) {
      console.error('Error updating product stats:', error);
      throw error;
    }
  },

  // Track product view
  async trackProductView(productId) {
    return this.updateProductStats(productId, 'view');
  },

  // Track product order
  async trackProductOrder(productId, amount) {
    return this.updateProductStats(productId, 'order', { amount });
  },

  // Update product stock
  async updateProductStock(productId, newStock) {
    return this.updateProductStats(productId, 'stock_update', { stock: newStock });
  }
};

// ===============================
// STORE MANAGEMENT SERVICE
// ===============================

export const storeService = {
  // Create a new store for vendor
  async createStore(vendorId, storeData) {
    try {
      const storeId = generateStoreId();
      const storeLink = generateStoreLink(storeId);
      
      const storePayload = {
        storeId, // Our custom tracking ID
        vendorId,
        name: storeData.name,
        description: storeData.description,
        category: storeData.category || 'general',
        logo: storeData.logo || null,
        banner: storeData.banner || null,
        contactInfo: storeData.contactInfo || {},
        settings: {
          isPublic: true,
          allowReviews: true,
          showContactInfo: true,
          ...storeData.settings
        },
        shareableLink: storeLink,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Tracking fields
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        isActive: true,
        rating: 0,
        reviewCount: 0
      };

      // Check if store ID already exists
      const existingStore = await this.getStoreByTrackingId(storeId);
      if (existingStore) {
        throw new Error(`Store ID ${storeId} already exists`);
      }

      const res = await axios.post(`${API_BASE}/api/stores`, storePayload);
      const created = res?.data || {};
      return { id: created.id || created._id || null, storeId, shareableLink: storeLink, ...storePayload };
    } catch (error) {
      console.error('Error creating store:', error);
      throw error;
    }
  },

  // Get stores by vendor ID (compat name)
  async getByVendor(vendorId) {
    // Backward-compatible alias for getStoresByVendor
    return this.getStoresByVendor(vendorId);
  },

  // Get store by tracking ID
  async getStoreByTrackingId(storeId) {
    try {
      const resp = await axios.get(`${API_BASE}/api/stores`, { params: { storeId } });
      const stores = resp?.data?.stores || resp?.data || [];
      const store = Array.isArray(stores) ? stores[0] : stores;
      return store ? { id: store.id || store._id || null, ...store } : null;
    } catch (error) {
      console.error('Error fetching store by tracking ID:', error);
      throw error;
    }
  },

  // Get stores by vendor ID
  async getStoresByVendor(vendorId) {
    try {
      const resp = await axios.get(`${API_BASE}/api/stores`, { params: { vendorId, orderBy: 'createdAt', orderDirection: 'desc' } })
      return resp?.data?.stores || resp?.data || []
    } catch (error) {
      console.error('Error fetching stores by vendor:', error);
      throw error;
    }
  },

  // Get store by slug (store name converted to slug)
  async getStoreBySlug(storeSlug) {
    try {
      const resp = await axios.get(`${API_BASE}/api/stores`)
      const stores = resp?.data?.stores || resp?.data || []
      for (const store of stores) {
        const storeName = store.name || store.storeName || '';
        const slug = storeName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        if (slug === storeSlug) return store;
      }
      return null
    } catch (error) {
      console.error('Error fetching store by slug:', error);
      throw error;
    }
  },

  // Update store statistics
  async updateStoreStats(storeId, action, data = {}) {
    try {
      const store = await this.getStoreByTrackingId(storeId);
      if (!store) throw new Error('Store not found');
      const updates = { updatedAt: new Date().toISOString() };
      switch (action) {
        case 'product_added': updates.totalProducts = (store.totalProducts || 0) + 1; break;
        case 'product_removed': updates.totalProducts = Math.max((store.totalProducts || 0) - 1, 0); break;
        case 'order_completed': updates.totalOrders = (store.totalOrders || 0) + 1; updates.totalRevenue = (store.totalRevenue || 0) + (data.amount || 0); break;
      }
      await axios.put(`${API_BASE}/api/stores/${store.id}`, updates)
      return { ...store, ...updates };
    } catch (error) {
      console.error('Error updating store stats:', error);
      throw error;
    }
  },

  // Assign product to store
  async assignProductToStore(productId, storeId) {
    try {
      // Update product assignment via REST API
      await axios.put(`${API_BASE}/api/products/${productId}`, { storeId, updatedAt: new Date().toISOString() })
      const store = await this.getStoreByTrackingId(storeId)
      if (store) {
        await axios.put(`${API_BASE}/api/stores/${store.id}`, { totalProducts: (store.totalProducts || 0) + 1, updatedAt: new Date().toISOString() })
      }
      return true
    } catch (error) {
      console.error('Error assigning product to store:', error);
      throw error;
    }
  },

  // Get products by store
  async getProductsByStore(storeId, limit = 50) {
    try {
      const resp = await axios.get(`${API_BASE}/api/products`, { params: { storeId, isActive: true, orderBy: 'createdAt', orderDirection: 'desc', limit } })
      return resp?.data?.products || resp?.data || []
    } catch (error) {
      console.error('Error fetching products by store:', error);
      throw error;
    }
  }
};

// ===============================
// ORDER TRACKING SERVICE
// ===============================

export const orderTrackingService = {
  // Create order with tracking number
  async createOrder(orderData) {
    try {
      const trackingNumber = generateOrderTrackingNumber();
      
      const orderPayload = {
        ...orderData,
        trackingNumber, // Our custom tracking number
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Additional tracking fields
        status: 'pending',
        paymentStatus: 'pending',
        shippingStatus: 'not_shipped'
      };

      // Check if tracking number already exists
      const existingOrder = await this.getOrderByTrackingNumber(trackingNumber);
      if (existingOrder) {
        throw new Error(`Order tracking number ${trackingNumber} already exists`);
      }

      const resp = await axios.post(`${API_BASE}/api/orders`, orderPayload);
      const created = resp?.data || {};
      return { id: created.id || created._id || null, trackingNumber, ...orderPayload };
    } catch (error) {
      console.error('Error creating order with tracking:', error);
      throw error;
    }
  },

  // Get order by tracking number
  async getOrderByTrackingNumber(trackingNumber) {
    try {
      const resp = await axios.get(`${API_BASE}/api/orders`, { params: { trackingNumber } });
      const orders = resp?.data?.orders || resp?.data || [];
      const order = Array.isArray(orders) ? orders[0] : orders;
      return order ? { id: order.id || order._id || null, ...order } : null;
    } catch (error) {
      console.error('Error fetching order by tracking number:', error);
      throw error;
    }
  },

  // Update order status
  async updateOrderStatus(orderId, status, additionalData = {}) {
    try {
      await axios.put(`${API_BASE}/api/orders/${orderId}`, {
        status,
        ...additionalData,
        updatedAt: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }
};

// ===============================
// SEARCH AND LOOKUP UTILITIES
// ===============================

export const trackingLookupService = {
  // Search by any tracking ID or number
  async searchByTrackingId(trackingId) {
    try {
      const results = {
        wallet: null,
        product: null,
        store: null,
        order: null
      };

      // Search in all collections concurrently
      const [walletResult, productResult, storeResult, orderResult] = await Promise.allSettled([
        walletTrackingService.getWalletByTrackingId(trackingId),
        productTrackingService.getProductByTrackingNumber(trackingId),
        storeService.getStoreByTrackingId(trackingId),
        orderTrackingService.getOrderByTrackingNumber(trackingId)
      ]);

      if (walletResult.status === 'fulfilled' && walletResult.value) {
        results.wallet = walletResult.value;
      }
      if (productResult.status === 'fulfilled' && productResult.value) {
        results.product = productResult.value;
      }
      if (storeResult.status === 'fulfilled' && storeResult.value) {
        results.store = storeResult.value;
      }
      if (orderResult.status === 'fulfilled' && orderResult.value) {
        results.order = orderResult.value;
      }

      return results;
    } catch (error) {
      console.error('Error searching by tracking ID:', error);
      throw error;
    }
  },

  // Get tracking summary for a user
  async getTrackingSummary(userId, userType) {
    try {
      const summary = {
        wallets: [],
        products: [],
        stores: [],
        orders: []
      };

      if (userType === 'vendor') {
        // Get vendor's stores and products
        const stores = await storeService.getStoresByVendor(userId);
        summary.stores = stores;

        for (const store of stores) {
          const products = await storeService.getProductsByStore(store.storeId);
          summary.products.push(...products);
        }
      } else {
        // Get user's wallet and orders
        const wallet = await walletTrackingService.getWalletByUserId(userId);
        if (wallet) {
          summary.wallets.push(wallet);
        }
      }

      return summary;
    } catch (error) {
      console.error('Error getting tracking summary:', error);
      throw error;
    }
  }
};

export default {
  generateWalletId,
  generateProductTrackingNumber,
  generateStoreId,
  generateOrderTrackingNumber,
  generateStoreLink,
  walletTrackingService,
  productTrackingService,
  storeService,
  orderTrackingService,
  trackingLookupService
};

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';

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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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
      
      const docRef = await addDoc(collection(db, 'wallets'), walletData);
      return { id: docRef.id, walletId, ...walletData };
    } catch (error) {
      console.error('Error creating wallet with tracking:', error);
      throw error;
    }
  },

  // Get wallet by our custom tracking ID
  async getWalletByTrackingId(walletId) {
    try {
      const q = query(
        collection(db, 'wallets'),
        where('walletId', '==', walletId)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const walletDoc = snapshot.docs[0];
        return { id: walletDoc.id, ...walletDoc.data() };
      }
      return null;
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

      const q = query(
        collection(db, 'wallets'),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const walletDoc = snapshot.docs[0];
        return { id: walletDoc.id, ...walletDoc.data() };
      }
      
      // If no wallet found, return null instead of trying to create one
      // Wallet creation should be handled explicitly during user registration
      console.log(`No wallet found for user ${userId}`);
      return null;
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
        lastTransactionAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (transactionType === 'credit') {
        updates.totalCredits = (wallet.totalCredits || 0) + amount;
      } else if (transactionType === 'debit') {
        updates.totalDebits = (wallet.totalDebits || 0) + amount;
      }

      const walletRef = doc(db, 'wallets', wallet.id);
      await updateDoc(walletRef, updates);
      
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
      const trackingNumber = generateProductTrackingNumber();
      
      const productPayload = {
        ...productData,
        trackingNumber, // Our custom tracking number
        vendorId,
        storeId, // Optional store assignment
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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

      const docRef = await addDoc(collection(db, 'products'), productPayload);
      return { id: docRef.id, trackingNumber, ...productPayload };
    } catch (error) {
      console.error('Error creating product with tracking:', error);
      throw error;
    }
  },

  // Get product by tracking number
  async getProductByTrackingNumber(trackingNumber) {
    try {
      const q = query(
        collection(db, 'products'),
        where('trackingNumber', '==', trackingNumber)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const productDoc = snapshot.docs[0];
        return { id: productDoc.id, ...productDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching product by tracking number:', error);
      throw error;
    }
  },

  // Update product tracking statistics
  async updateProductStats(productId, action, data = {}) {
    try {
      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);
      
      if (!productSnap.exists()) {
        throw new Error('Product not found');
      }

      const currentData = productSnap.data();
      const updates = {
        updatedAt: serverTimestamp()
      };

      switch (action) {
        case 'view':
          updates.viewCount = (currentData.viewCount || 0) + 1;
          break;
        case 'order':
          updates.orderCount = (currentData.orderCount || 0) + 1;
          updates.totalRevenue = (currentData.totalRevenue || 0) + (data.amount || 0);
          updates.lastOrderedAt = serverTimestamp();
          break;
        case 'stock_update':
          updates.stock = data.stock;
          updates.inStock = data.stock > 0;
          break;
      }

      await updateDoc(productRef, updates);
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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

      const docRef = await addDoc(collection(db, 'stores'), storePayload);
      return { id: docRef.id, storeId, shareableLink: storeLink, ...storePayload };
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
      const q = query(
        collection(db, 'stores'),
        where('storeId', '==', storeId)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const storeDoc = snapshot.docs[0];
        return { id: storeDoc.id, ...storeDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching store by tracking ID:', error);
      throw error;
    }
  },

  // Get stores by vendor ID
  async getStoresByVendor(vendorId) {
    try {
      const q = query(
        collection(db, 'stores'),
        where('vendorId', '==', vendorId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching stores by vendor:', error);
      throw error;
    }
  },

  // Get store by slug (store name converted to slug)
  async getStoreBySlug(storeSlug) {
    try {
      const q = query(collection(db, 'stores'));
      const snapshot = await getDocs(q);
      
      for (const doc of snapshot.docs) {
        const store = { id: doc.id, ...doc.data() };
        const storeName = store.name || store.storeName || '';
        const slug = storeName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        if (slug === storeSlug) {
          return store;
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching store by slug:', error);
      throw error;
    }
  },

  // Update store statistics
  async updateStoreStats(storeId, action, data = {}) {
    try {
      const store = await this.getStoreByTrackingId(storeId);
      if (!store) {
        throw new Error('Store not found');
      }

      const updates = {
        updatedAt: serverTimestamp()
      };

      switch (action) {
        case 'product_added':
          updates.totalProducts = (store.totalProducts || 0) + 1;
          break;
        case 'product_removed':
          updates.totalProducts = Math.max((store.totalProducts || 0) - 1, 0);
          break;
        case 'order_completed':
          updates.totalOrders = (store.totalOrders || 0) + 1;
          updates.totalRevenue = (store.totalRevenue || 0) + (data.amount || 0);
          break;
      }

      const storeRef = doc(db, 'stores', store.id);
      await updateDoc(storeRef, updates);
      
      return { ...store, ...updates };
    } catch (error) {
      console.error('Error updating store stats:', error);
      throw error;
    }
  },

  // Assign product to store
  async assignProductToStore(productId, storeId) {
    try {
      const batch = writeBatch(db);
      
      // Update product with store assignment
      const productRef = doc(db, 'products', productId);
      batch.update(productRef, {
        storeId,
        updatedAt: serverTimestamp()
      });

      // Update store product count
      const store = await this.getStoreByTrackingId(storeId);
      if (store) {
        const storeRef = doc(db, 'stores', store.id);
        batch.update(storeRef, {
          totalProducts: (store.totalProducts || 0) + 1,
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error assigning product to store:', error);
      throw error;
    }
  },

  // Get products by store
  async getProductsByStore(storeId, limit = 50) {
    try {
      const q = query(
        collection(db, 'products'),
        where('storeId', '==', storeId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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

      const docRef = await addDoc(collection(db, 'orders'), orderPayload);
      return { id: docRef.id, trackingNumber, ...orderPayload };
    } catch (error) {
      console.error('Error creating order with tracking:', error);
      throw error;
    }
  },

  // Get order by tracking number
  async getOrderByTrackingNumber(trackingNumber) {
    try {
      const q = query(
        collection(db, 'orders'),
        where('trackingNumber', '==', trackingNumber)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const orderDoc = snapshot.docs[0];
        return { id: orderDoc.id, ...orderDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching order by tracking number:', error);
      throw error;
    }
  },

  // Update order status
  async updateOrderStatus(orderId, status, additionalData = {}) {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status,
        ...additionalData,
        updatedAt: serverTimestamp()
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

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
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
// PRODUCT OPERATIONS
// ===============================

export const productService = {
  // Create a new product
  async create(productData, vendorId) {
    try {
      const docRef = await addDoc(collection(db, 'products'), {
        ...productData,
        vendorId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active'
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  // Get all products with optional filtering
  async getAll(filters = {}) {
    try {
      let q = collection(db, 'products');
      
      if (filters.category && filters.category !== 'all') {
        q = query(q, where('category', '==', filters.category));
      }
      
      if (filters.vendorId) {
        q = query(q, where('vendorId', '==', filters.vendorId));
      }
      
      q = query(q, orderBy('createdAt', 'desc'));
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Get single product
  async getById(productId) {
    try {
      const docRef = doc(db, 'products', productId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  },

  // Update product
  async update(productId, updates) {
    try {
      const docRef = doc(db, 'products', productId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  // Delete product
  async delete(productId) {
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }
};

// ===============================
// ORDER OPERATIONS
// ===============================

export const orderService = {
  // Create a new order
  async create(orderData) {
    try {
      const docRef = await addDoc(collection(db, 'orders'), {
        ...orderData,
        status: 'pending_wallet_funding',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  // Get orders for a user
  async getByUser(userId, userType = 'buyer') {
    try {
      const field = userType === 'buyer' ? 'buyerId' : 'vendorId';
      const q = query(
        collection(db, 'orders'),
        where(field, '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  },

  // Update order status
  async updateStatus(orderId, status, additionalData = {}) {
    try {
      const docRef = doc(db, 'orders', orderId);
      await updateDoc(docRef, {
        status,
        ...additionalData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  // Get single order
  async getById(orderId) {
    try {
      const docRef = doc(db, 'orders', orderId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  }
};

// ===============================
// WALLET OPERATIONS
// ===============================

export const walletService = {
  // Create wallet transaction
  async createTransaction(transactionData) {
    try {
      const docRef = await addDoc(collection(db, 'wallet_transactions'), {
        ...transactionData,
        createdAt: serverTimestamp(),
        status: 'completed'
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating wallet transaction:', error);
      throw error;
    }
  },

  // Get user's wallet transactions
  async getUserTransactions(userId) {
    try {
      const q = query(
        collection(db, 'wallet_transactions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching wallet transactions:', error);
      throw error;
    }
  },

  // Fund wallet for order
  async fundWallet(orderId, userId, amount, paymentIntentId) {
    try {
      const batch = writeBatch(db);
      
      // Create wallet transaction
      const transactionRef = doc(collection(db, 'wallet_transactions'));
      batch.set(transactionRef, {
        userId,
        orderId,
        type: 'wallet_funding',
        amount,
        paymentIntentId,
        status: 'completed',
        createdAt: serverTimestamp()
      });
      
      // Update order status
      const orderRef = doc(db, 'orders', orderId);
      batch.update(orderRef, {
        status: 'wallet_funded',
        walletTransactionId: transactionRef.id,
        updatedAt: serverTimestamp()
      });
      
      await batch.commit();
      return transactionRef.id;
    } catch (error) {
      console.error('Error funding wallet:', error);
      throw error;
    }
  },

  // Release wallet funds to vendor
  async releaseWallet(orderId, vendorId, amount) {
    try {
      const batch = writeBatch(db);
      
      // Create release transaction
      const transactionRef = doc(collection(db, 'wallet_transactions'));
      batch.set(transactionRef, {
        userId: vendorId,
        orderId,
        type: 'wallet_release',
        amount,
        status: 'completed',
        createdAt: serverTimestamp()
      });
      
      // Update order status
      const orderRef = doc(db, 'orders', orderId);
      batch.update(orderRef, {
        status: 'completed',
        releaseTransactionId: transactionRef.id,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      await batch.commit();
      return transactionRef.id;
    } catch (error) {
      console.error('Error releasing wallet funds:', error);
      throw error;
    }
  }
};

// ===============================
// LOGISTICS OPERATIONS
// ===============================

export const logisticsService = {
  // Create logistics company
  async createCompany(companyData, ownerId) {
    try {
      const docRef = await addDoc(collection(db, 'logistics_companies'), {
        ...companyData,
        ownerId,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating logistics company:', error);
      throw error;
    }
  },

  // Add route to logistics company
  async addRoute(companyId, routeData) {
    try {
      const docRef = await addDoc(collection(db, 'logistics_routes'), {
        ...routeData,
        companyId,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding route:', error);
      throw error;
    }
  },

  // Get available routes for a journey
  async getAvailableRoutes(fromLocation, toLocation) {
    try {
      const q = query(
        collection(db, 'logistics_routes'),
        where('from', '==', fromLocation),
        where('to', '==', toLocation),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      const routes = [];
      
      for (const routeDoc of snapshot.docs) {
        const routeData = { id: routeDoc.id, ...routeDoc.data() };
        
        // Get company details
        const companyDoc = await getDoc(doc(db, 'logistics_companies', routeData.companyId));
        if (companyDoc.exists()) {
          routeData.company = companyDoc.data();
        }
        
        routes.push(routeData);
      }
      
      return routes;
    } catch (error) {
      console.error('Error fetching available routes:', error);
      throw error;
    }
  },

  // Create delivery
  async createDelivery(deliveryData) {
    try {
      const docRef = await addDoc(collection(db, 'deliveries'), {
        ...deliveryData,
        status: 'pending_pickup',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating delivery:', error);
      throw error;
    }
  },

  // Update delivery status
  async updateDeliveryStatus(deliveryId, status, location = null) {
    try {
      const updateData = {
        status,
        updatedAt: serverTimestamp()
      };
      
      if (location) {
        updateData.currentLocation = location;
      }
      
      // Add to tracking history
      const trackingUpdate = {
        status,
        timestamp: serverTimestamp(),
        location: location || 'Unknown'
      };
      
      const docRef = doc(db, 'deliveries', deliveryId);
      await updateDoc(docRef, {
        ...updateData,
        trackingHistory: [...(await getDoc(docRef)).data().trackingHistory || [], trackingUpdate]
      });
    } catch (error) {
      console.error('Error updating delivery status:', error);
      throw error;
    }
  }
};

// ===============================
// DISPUTE OPERATIONS
// ===============================

export const disputeService = {
  // Create dispute
  async create(disputeData) {
    try {
      const docRef = await addDoc(collection(db, 'disputes'), {
        ...disputeData,
        status: 'open',
        priority: 'medium',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating dispute:', error);
      throw error;
    }
  },

  // Get disputes for user
  async getByUser(userId) {
    try {
      const q = query(
        collection(db, 'disputes'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching disputes:', error);
      throw error;
    }
  },

  // Update dispute
  async update(disputeId, updates) {
    try {
      const docRef = doc(db, 'disputes', disputeId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating dispute:', error);
      throw error;
    }
  }
};

// ===============================
// ANALYTICS OPERATIONS
// ===============================

export const analyticsService = {
  // Get vendor analytics
  async getVendorStats(vendorId) {
    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('vendorId', '==', vendorId)
      );
      
      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => doc.data());
      
      const totalSales = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
      const activeOrders = orders.filter(order => 
        ['pending_wallet_funding', 'wallet_funded', 'shipped'].includes(order.status)
      ).length;
      
      return {
        totalSales,
        activeOrders,
        totalOrders: orders.length,
        completedOrders: orders.filter(order => order.status === 'completed').length
      };
    } catch (error) {
      console.error('Error fetching vendor stats:', error);
      throw error;
    }
  },

  // Get buyer analytics
  async getBuyerStats(buyerId) {
    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('buyerId', '==', buyerId)
      );
      
      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => doc.data());
      
      const totalSpent = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
      const activeOrders = orders.filter(order => 
        ['pending_wallet_funding', 'wallet_funded', 'shipped'].includes(order.status)
      ).length;
      
      return {
        totalSpent,
        activeOrders,
        totalOrders: orders.length,
        completedOrders: orders.filter(order => order.status === 'completed').length
      };
    } catch (error) {
      console.error('Error fetching buyer stats:', error);
      throw error;
    }
  }
};

// ===============================
// TRACKING OPERATIONS
// ===============================

export const trackingService = {
  // Get tracking information
  async getTrackingInfo(trackingId) {
    try {
      const q = query(
        collection(db, 'deliveries'),
        where('trackingId', '==', trackingId)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const deliveryDoc = snapshot.docs[0];
        const deliveryData = { id: deliveryDoc.id, ...deliveryDoc.data() };
        
        // Get related order data
        if (deliveryData.orderId) {
          const orderDoc = await getDoc(doc(db, 'orders', deliveryData.orderId));
          if (orderDoc.exists()) {
            deliveryData.order = orderDoc.data();
          }
        }
        
        return deliveryData;
      }
      return null;
    } catch (error) {
      console.error('Error fetching tracking info:', error);
      throw error;
    }
  },

  // Update tracking status
  async updateStatus(trackingId, status, location, notes = '') {
    try {
      const q = query(
        collection(db, 'deliveries'),
        where('trackingId', '==', trackingId)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const deliveryDoc = snapshot.docs[0];
        const currentData = deliveryDoc.data();
        
        const trackingUpdate = {
          status,
          timestamp: serverTimestamp(),
          location,
          notes
        };
        
        await updateDoc(deliveryDoc.ref, {
          status,
          currentLocation: location,
          trackingHistory: [...(currentData.trackingHistory || []), trackingUpdate],
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating tracking status:', error);
      throw error;
    }
  }
};

// ===============================
// USER OPERATIONS
// ===============================

export const userService = {
  // Get user profile
  async getProfile(userId) {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  // Update user profile
  async updateProfile(userId, updates) {
    try {
      const docRef = doc(db, 'users', userId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  // Get vendors that user has purchased from
  async getPurchasedVendors(buyerId) {
    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('buyerId', '==', buyerId),
        where('status', '==', 'completed')
      );
      
      const ordersSnapshot = await getDocs(ordersQuery);
      const vendorIds = [...new Set(ordersSnapshot.docs.map(doc => doc.data().vendorId))];
      
      const vendors = [];
      for (const vendorId of vendorIds) {
        const vendorDoc = await getDoc(doc(db, 'users', vendorId));
        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data();
          const vendorOrders = ordersSnapshot.docs
            .filter(doc => doc.data().vendorId === vendorId)
            .map(doc => doc.data());
          
          vendors.push({
            ...vendorData,
            totalOrders: vendorOrders.length,
            totalSpent: vendorOrders.reduce((sum, order) => sum + order.amount, 0)
          });
        }
      }
      
      return vendors;
    } catch (error) {
      console.error('Error fetching purchased vendors:', error);
      throw error;
    }
  }
};

// ===============================
// EXPORT ALL SERVICES
// ===============================

export default {
  products: productService,
  orders: orderService,
  wallet: walletService,
  logistics: logisticsService,
  disputes: disputeService,
  tracking: trackingService,
  users: userService,
  analytics: analyticsService
};

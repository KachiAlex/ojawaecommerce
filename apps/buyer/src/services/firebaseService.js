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
  writeBatch,
  limit as fsLimit,
  startAfter
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from '../firebase/config';

// ===============================
// PRODUCT OPERATIONS
// ===============================

export const productService = {
  // Upload images to Firebase Storage and return URL list
  async uploadImages(files = [], vendorId) {
    const urls = [];
    for (const file of files) {
      if (!file) continue;
      const safeName = (file.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `products/${vendorId}/${Date.now()}-${safeName}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      urls.push(url);
    }
    return urls;
  },

  // Count products for a vendor
  async countByVendor(vendorId) {
    try {
      const q = query(
        collection(db, 'products'),
        where('vendorId', '==', vendorId)
      );
      // Aggregate count
      const { getCountFromServer } = await import('firebase/firestore');
      const snap = await getCountFromServer(q);
      return snap.data().count || 0;
    } catch (error) {
      console.error('Error counting vendor products:', error);
      return 0;
    }
  },

  // Create or update product handling image uploads
  async saveWithUploads(productData, vendorId, productId = null) {
    return await productService.saveWithUploadsWithProgress(productData, vendorId, productId);
  },

  // Internal: same as saveWithUploads but exposes a progress callback via options
  async saveWithUploadsWithProgress(productData, vendorId, productId = null, options = {}) {
    const { onProgress } = options;
    const items = Array.isArray(productData.images) ? productData.images : [];
    const resolvedImages = [];
    const fileItems = items.filter((i) => typeof i !== 'string');
    const totalBytes = fileItems.reduce((sum, f) => sum + (f?.size || 0), 0) || 0;
    let uploadedBytes = 0;

    const notify = () => {
      if (typeof onProgress === 'function' && totalBytes > 0) {
        const pct = Math.min(100, Math.round((uploadedBytes / totalBytes) * 100));
        onProgress(pct);
      }
    };

    // First push existing URLs preserving order
    for (const img of items) {
      if (typeof img === 'string') {
        resolvedImages.push(img);
      } else if (img) {
        const safeName = (img.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `products/${vendorId}/${Date.now()}-${safeName}`;
        const storageRef = ref(storage, path);
        // Use resumable upload to get progress
        const task = uploadBytesResumable(storageRef, img);
        await new Promise((resolve, reject) => {
          task.on('state_changed', (snapshot) => {
            // Estimate overall uploaded bytes
            const bytesTransferred = snapshot.bytesTransferred;
            const total = snapshot.totalBytes || img.size || 0;
            // For single file, bytesTransferred goes 0..total; we need delta from last callback
            // Simplify: compute ratio and multiply by this file size, then clamp
            const currentFileUploaded = Math.min(total, bytesTransferred);
            // Recompute uploadedBytes from other files plus current
            const indexOfCurrent = resolvedImages.length; // approx position
            const priorFiles = fileItems.slice(0, indexOfCurrent);
            const priorBytes = priorFiles.reduce((s, f) => s + (f?.size || 0), 0);
            uploadedBytes = priorBytes + currentFileUploaded;
            notify();
          }, reject, async () => {
            try {
              const url = await getDownloadURL(task.snapshot.ref);
              resolvedImages.push(url);
              // After file completes update uploadedBytes to include full file
              uploadedBytes = fileItems.slice(0, resolvedImages.length).reduce((s, f) => s + (f?.size || 0), 0);
              notify();
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        });
      }
    }
    if (totalBytes === 0 && typeof onProgress === 'function') {
      onProgress(100);
    }
    const payload = {
      ...productData,
      images: resolvedImages,
    };
    if (productId) {
      await productService.update(productId, payload);
      return productId;
    }
    return await productService.create(payload, vendorId);
  },
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

  // Paged fetch for vendor's products
  async getByVendorPaged({ vendorId, pageSize = 10, cursor = null }) {
    try {
      let q = query(
        collection(db, 'products'),
        where('vendorId', '==', vendorId),
        orderBy('createdAt', 'desc'),
        fsLimit(pageSize)
      );
      if (cursor) {
        q = query(
          collection(db, 'products'),
          where('vendorId', '==', vendorId),
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          fsLimit(pageSize)
        );
      }
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const nextCursor = snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : null;
      return { items, nextCursor };
    } catch (error) {
      console.error('Error fetching vendor products (paged):', error);
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

  // Count orders for user
  async countByUser(userId, userType = 'buyer') {
    try {
      const field = userType === 'buyer' ? 'buyerId' : 'vendorId';
      const q = query(
        collection(db, 'orders'),
        where(field, '==', userId)
      );
      const { getCountFromServer } = await import('firebase/firestore');
      const snap = await getCountFromServer(q);
      return snap.data().count || 0;
    } catch (error) {
      console.error('Error counting user orders:', error);
      return 0;
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

  // Paged orders for a user
  async getByUserPaged({ userId, userType = 'buyer', pageSize = 10, cursor = null }) {
    try {
      const field = userType === 'buyer' ? 'buyerId' : 'vendorId';
      let q = query(
        collection(db, 'orders'),
        where(field, '==', userId),
        orderBy('createdAt', 'desc'),
        fsLimit(pageSize)
      );
      if (cursor) {
        q = query(
          collection(db, 'orders'),
          where(field, '==', userId),
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          fsLimit(pageSize)
        );
      }
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const nextCursor = snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : null;
      return { items, nextCursor };
    } catch (error) {
      console.error('Error fetching orders (paged):', error);
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
  },

  // Mark order as shipped with tracking info
  async markShipped(orderId, { carrier, trackingNumber, eta }) {
    try {
      const shipmentData = {
        shippingCarrier: carrier || null,
        trackingNumber: trackingNumber || null,
        estimatedDeliveryDate: eta || null
      };
      await orderService.updateStatus(orderId, 'shipped', shipmentData);
    } catch (error) {
      console.error('Error marking order as shipped:', error);
      throw error;
    }
  }
};

// ===============================
// WALLET OPERATIONS
// ===============================

export const walletService = {
  // Create wallet account for user
  async createWallet(userId, userType) {
    try {
      const walletData = {
        userId,
        userType,
        balance: 0,
        currency: 'NGN', // Default currency, can be updated
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'wallets'), walletData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  },

  // Get user's wallet
  async getUserWallet(userId) {
    try {
      const q = query(
        collection(db, 'wallets'),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const walletDoc = snapshot.docs[0];
        return { id: walletDoc.id, ...walletDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching wallet:', error);
      throw error;
    }
  },

  // Add funds to wallet
  async addFunds(walletId, amount, paymentIntentId, description = 'Wallet top-up') {
    try {
      const batch = writeBatch(db);
      
      // Get current wallet
      const walletRef = doc(db, 'wallets', walletId);
      const walletSnap = await getDoc(walletRef);
      
      if (!walletSnap.exists()) {
        throw new Error('Wallet not found');
      }
      
      const currentBalance = walletSnap.data().balance || 0;
      const newBalance = currentBalance + amount;
      
      // Update wallet balance
      batch.update(walletRef, {
        balance: newBalance,
        updatedAt: serverTimestamp()
      });
      
      // Create transaction record
      const transactionRef = doc(collection(db, 'wallet_transactions'));
      batch.set(transactionRef, {
        walletId,
        userId: walletSnap.data().userId,
        type: 'credit',
        amount,
        description,
        paymentIntentId,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        status: 'completed',
        createdAt: serverTimestamp()
      });
      
      await batch.commit();
      return { newBalance, transactionId: transactionRef.id };
    } catch (error) {
      console.error('Error adding funds to wallet:', error);
      throw error;
    }
  },

  // Deduct funds from wallet
  async deductFunds(walletId, amount, orderId, description = 'Order payment') {
    try {
      const batch = writeBatch(db);
      
      // Get current wallet
      const walletRef = doc(db, 'wallets', walletId);
      const walletSnap = await getDoc(walletRef);
      
      if (!walletSnap.exists()) {
        throw new Error('Wallet not found');
      }
      
      const currentBalance = walletSnap.data().balance || 0;
      
      if (currentBalance < amount) {
        throw new Error('Insufficient wallet balance');
      }
      
      const newBalance = currentBalance - amount;
      
      // Update wallet balance
      batch.update(walletRef, {
        balance: newBalance,
        updatedAt: serverTimestamp()
      });
      
      // Create transaction record
      const transactionRef = doc(collection(db, 'wallet_transactions'));
      batch.set(transactionRef, {
        walletId,
        userId: walletSnap.data().userId,
        type: 'debit',
        amount,
        description,
        orderId,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        status: 'completed',
        createdAt: serverTimestamp()
      });
      
      await batch.commit();
      return { newBalance, transactionId: transactionRef.id };
    } catch (error) {
      console.error('Error deducting funds from wallet:', error);
      throw error;
    }
  },

  // Transfer funds to external account (bank/mobile money)
  async transferToExternalAccount(walletId, amount, accountDetails, description = 'Wallet withdrawal') {
    try {
      const batch = writeBatch(db);
      
      // Get current wallet
      const walletRef = doc(db, 'wallets', walletId);
      const walletSnap = await getDoc(walletRef);
      
      if (!walletSnap.exists()) {
        throw new Error('Wallet not found');
      }
      
      const currentBalance = walletSnap.data().balance || 0;
      
      if (currentBalance < amount) {
        throw new Error('Insufficient wallet balance');
      }
      
      const newBalance = currentBalance - amount;
      
      // Update wallet balance
      batch.update(walletRef, {
        balance: newBalance,
        updatedAt: serverTimestamp()
      });
      
      // Create withdrawal transaction record
      const transactionRef = doc(collection(db, 'wallet_transactions'));
      batch.set(transactionRef, {
        walletId,
        userId: walletSnap.data().userId,
        type: 'withdrawal',
        amount,
        description,
        accountDetails: {
          type: accountDetails.type, // 'bank' or 'mobile_money'
          accountNumber: accountDetails.accountNumber,
          accountName: accountDetails.accountName,
          bankName: accountDetails.bankName || null,
          provider: accountDetails.provider || null // For mobile money
        },
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        status: 'pending', // Will be updated by payment processor
        processingFee: Math.max(100, amount * 0.015), // 1.5% or minimum ₦100
        netAmount: amount - Math.max(100, amount * 0.015),
        createdAt: serverTimestamp()
      });
      
      await batch.commit();
      return { 
        newBalance, 
        transactionId: transactionRef.id,
        processingFee: Math.max(100, amount * 0.015),
        netAmount: amount - Math.max(100, amount * 0.015)
      };
    } catch (error) {
      console.error('Error transferring to external account:', error);
      throw error;
    }
  },

  // Transfer funds between wallets (for order completion)
  async transferFunds(fromWalletId, toWalletId, amount, orderId, description) {
    try {
      const batch = writeBatch(db);
      
      // Get both wallets
      const fromWalletRef = doc(db, 'wallets', fromWalletId);
      const toWalletRef = doc(db, 'wallets', toWalletId);
      
      const [fromWalletSnap, toWalletSnap] = await Promise.all([
        getDoc(fromWalletRef),
        getDoc(toWalletRef)
      ]);
      
      if (!fromWalletSnap.exists() || !toWalletSnap.exists()) {
        throw new Error('One or both wallets not found');
      }
      
      const fromBalance = fromWalletSnap.data().balance || 0;
      const toBalance = toWalletSnap.data().balance || 0;
      
      if (fromBalance < amount) {
        throw new Error('Insufficient balance in source wallet');
      }
      
      const newFromBalance = fromBalance - amount;
      const newToBalance = toBalance + amount;
      
      // Update both wallets
      batch.update(fromWalletRef, {
        balance: newFromBalance,
        updatedAt: serverTimestamp()
      });
      
      batch.update(toWalletRef, {
        balance: newToBalance,
        updatedAt: serverTimestamp()
      });
      
      // Create transaction records for both wallets
      const fromTransactionRef = doc(collection(db, 'wallet_transactions'));
      const toTransactionRef = doc(collection(db, 'wallet_transactions'));
      
      batch.set(fromTransactionRef, {
        walletId: fromWalletId,
        userId: fromWalletSnap.data().userId,
        type: 'debit',
        amount,
        description: `Payment: ${description}`,
        orderId,
        relatedTransactionId: toTransactionRef.id,
        balanceBefore: fromBalance,
        balanceAfter: newFromBalance,
        status: 'completed',
        createdAt: serverTimestamp()
      });
      
      batch.set(toTransactionRef, {
        walletId: toWalletId,
        userId: toWalletSnap.data().userId,
        type: 'credit',
        amount,
        description: `Payment received: ${description}`,
        orderId,
        relatedTransactionId: fromTransactionRef.id,
        balanceBefore: toBalance,
        balanceAfter: newToBalance,
        status: 'completed',
        createdAt: serverTimestamp()
      });
      
      await batch.commit();
      return {
        fromBalance: newFromBalance,
        toBalance: newToBalance,
        fromTransactionId: fromTransactionRef.id,
        toTransactionId: toTransactionRef.id
      };
    } catch (error) {
      console.error('Error transferring funds:', error);
      throw error;
    }
  },
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
  },

  // Get disputes for vendor
  async getByVendor(vendorId) {
    try {
      const q = query(
        collection(db, 'disputes'),
        where('vendorId', '==', vendorId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching vendor disputes:', error);
      throw error;
    }
  },

  // Create dispute with automatic wallet hold
  async createWithWalletHold(disputeData, orderId, amount) {
    try {
      const batch = writeBatch(db);
      
      // Create dispute
      const disputeRef = doc(collection(db, 'disputes'));
      const disputePayload = {
        ...disputeData,
        status: 'open',
        priority: 'medium',
        orderId,
        disputedAmount: amount,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      batch.set(disputeRef, disputePayload);

      // Create wallet hold transaction
      const holdTransactionRef = doc(collection(db, 'wallet_transactions'));
      batch.set(holdTransactionRef, {
        orderId,
        type: 'dispute_hold',
        amount,
        description: `Dispute hold for order ${orderId}`,
        status: 'completed',
        disputeId: disputeRef.id,
        createdAt: serverTimestamp()
      });

      // Update order status to disputed
      const orderRef = doc(db, 'orders', orderId);
      batch.update(orderRef, {
        status: 'disputed',
        disputeId: disputeRef.id,
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      return disputeRef.id;
    } catch (error) {
      console.error('Error creating dispute with wallet hold:', error);
      throw error;
    }
  },

  // Resolve dispute and release/refund funds
  async resolveDispute(disputeId, resolution, refundAmount = 0, paymentIntentId = null) {
    try {
      const batch = writeBatch(db);
      
      // Get dispute details
      const disputeRef = doc(db, 'disputes', disputeId);
      const disputeSnap = await getDoc(disputeRef);
      if (!disputeSnap.exists()) throw new Error('Dispute not found');
      
      const dispute = disputeSnap.data();
      
      // Process Stripe refund if paymentIntentId is provided and refundAmount > 0
      let refundId = null;
      if (paymentIntentId && refundAmount > 0) {
        try {
          const { processRefund } = await import('../utils/stripe');
          const refundResult = await processRefund(
            paymentIntentId, 
            refundAmount / 100, // Convert from cents to dollars
            'dispute_resolution'
          );
          refundId = refundResult.refundId;
        } catch (refundError) {
          console.error('Stripe refund failed:', refundError);
          // Continue with dispute resolution even if refund fails
        }
      }
      
      // Update dispute status
      batch.update(disputeRef, {
        status: 'resolved',
        resolution,
        refundAmount,
        refundId,
        resolvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Create resolution transaction
      const resolutionTransactionRef = doc(collection(db, 'wallet_transactions'));
      batch.set(resolutionTransactionRef, {
        orderId: dispute.orderId,
        type: 'dispute_resolution',
        amount: refundAmount,
        description: `Dispute resolution: ${resolution}`,
        status: 'completed',
        disputeId,
        refundId,
        createdAt: serverTimestamp()
      });

      // Update order status
      const orderRef = doc(db, 'orders', dispute.orderId);
      batch.update(orderRef, {
        status: refundAmount > 0 ? 'refunded' : 'completed',
        disputeResolved: true,
        refundId,
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      return { success: true, refundId };
    } catch (error) {
      console.error('Error resolving dispute:', error);
      throw error;
    }
  },

  // Get disputes for vendor (paged)
  async getByVendorPaged({ vendorId, pageSize = 10, cursor = null }) {
    try {
      let q = query(
        collection(db, 'disputes'),
        where('vendorId', '==', vendorId),
        orderBy('createdAt', 'desc'),
        fsLimit(pageSize)
      );
      if (cursor) {
        q = query(
          collection(db, 'disputes'),
          where('vendorId', '==', vendorId),
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          fsLimit(pageSize)
        );
      }
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const nextCursor = snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : null;
      return { items, nextCursor };
    } catch (e) {
      console.error('Error fetching disputes (paged):', e);
      throw e;
    }
  },

  // Count disputes for vendor
  async countByVendor(vendorId) {
    try {
      const q = query(
        collection(db, 'disputes'),
        where('vendorId', '==', vendorId)
      );
      const { getCountFromServer } = await import('firebase/firestore');
      const snap = await getCountFromServer(q);
      return snap.data().count || 0;
    } catch (e) {
      console.error('Error counting disputes:', e);
      return 0;
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
// PAYOUT OPERATIONS
// ===============================

export const payoutsService = {
  // Create payout request
  async request({ vendorId, method, amount, account }) {
    try {
      const docRef = await addDoc(collection(db, 'payouts'), {
        vendorId,
        method,
        amount,
        account,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating payout request:', error);
      throw error;
    }
  },

  // Get payouts for vendor
  async getByVendor(vendorId) {
    try {
      const q = query(
        collection(db, 'payouts'),
        where('vendorId', '==', vendorId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching vendor payouts:', error);
      throw error;
    }
  },

  // Get payouts for vendor (paged)
  async getByVendorPaged({ vendorId, pageSize = 10, cursor = null }) {
    try {
      let q = query(
        collection(db, 'payouts'),
        where('vendorId', '==', vendorId),
        orderBy('createdAt', 'desc'),
        fsLimit(pageSize)
      );
      if (cursor) {
        q = query(
          collection(db, 'payouts'),
          where('vendorId', '==', vendorId),
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          fsLimit(pageSize)
        );
      }
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const nextCursor = snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : null;
      return { items, nextCursor };
    } catch (e) {
      console.error('Error fetching payouts (paged):', e);
      throw e;
    }
  },

  // Count payouts for vendor
  async countByVendor(vendorId) {
    try {
      const q = query(
        collection(db, 'payouts'),
        where('vendorId', '==', vendorId)
      );
      const { getCountFromServer } = await import('firebase/firestore');
      const snap = await getCountFromServer(q);
      return snap.data().count || 0;
    } catch (e) {
      console.error('Error counting payouts:', e);
      return 0;
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
// ADMIN OPERATIONS
// ===============================

export const adminService = {
  // Get all users with pagination
  async getAllUsers({ pageSize = 50, cursor = null }) {
    try {
      let q = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        fsLimit(pageSize)
      );
      if (cursor) {
        q = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          fsLimit(pageSize)
        );
      }
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const nextCursor = snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : null;
      return { items, nextCursor };
    } catch (error) {
      console.error('Error fetching all users:', error);
      throw error;
    }
  },

  // Get all orders with pagination
  async getAllOrders({ pageSize = 50, cursor = null }) {
    try {
      let q = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc'),
        fsLimit(pageSize)
      );
      if (cursor) {
        q = query(
          collection(db, 'orders'),
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          fsLimit(pageSize)
        );
      }
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const nextCursor = snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : null;
      return { items, nextCursor };
    } catch (error) {
      console.error('Error fetching all orders:', error);
      throw error;
    }
  },

  // Get all disputes with pagination
  async getAllDisputes({ pageSize = 50, cursor = null }) {
    try {
      let q = query(
        collection(db, 'disputes'),
        orderBy('createdAt', 'desc'),
        fsLimit(pageSize)
      );
      if (cursor) {
        q = query(
          collection(db, 'disputes'),
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          fsLimit(pageSize)
        );
      }
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const nextCursor = snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : null;
      return { items, nextCursor };
    } catch (error) {
      console.error('Error fetching all disputes:', error);
      throw error;
    }
  },

  // Get platform analytics
  async getPlatformAnalytics() {
    try {
      const [usersSnapshot, ordersSnapshot, disputesSnapshot, vendorsSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'disputes')),
        getDocs(query(collection(db, 'users'), where('isVendor', '==', true)))
      ]);

      const users = usersSnapshot.docs.map(d => d.data());
      const orders = ordersSnapshot.docs.map(d => d.data());
      const disputes = disputesSnapshot.docs.map(d => d.data());
      const vendors = vendorsSnapshot.docs.map(d => d.data());

      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const activeOrders = orders.filter(order => 
        ['pending_wallet_funding', 'wallet_funded', 'shipped'].includes(order.status)
      ).length;
      const completedOrders = orders.filter(order => order.status === 'completed').length;
      const pendingDisputes = disputes.filter(dispute => dispute.status === 'open').length;
      const pendingVendors = vendors.filter(vendor => 
        vendor.vendorProfile?.verificationStatus === 'pending'
      ).length;

      return {
        totalUsers: users.length,
        totalVendors: vendors.length,
        totalOrders: orders.length,
        totalRevenue,
        activeOrders,
        completedOrders,
        pendingDisputes,
        pendingVendors,
        totalDisputes: disputes.length
      };
    } catch (error) {
      console.error('Error fetching platform analytics:', error);
      throw error;
    }
  },

  // Suspend/unsuspend user
  async toggleUserSuspension(userId, suspended) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        suspended,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error toggling user suspension:', error);
      throw error;
    }
  },

  // Verify vendor
  async verifyVendor(userId, verified) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'vendorProfile.verificationStatus': verified ? 'verified' : 'rejected',
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error verifying vendor:', error);
      throw error;
    }
  },

  // Get pending vendor applications
  async getPendingVendors() {
    try {
      const q = query(
        collection(db, 'users'),
        where('isVendor', '==', true),
        where('vendorProfile.verificationStatus', '==', 'pending')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching pending vendors:', error);
      throw error;
    }
  },

  // Get user details with full profile
  async getUserDetails(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        throw new Error('User not found');
      }

      const userData = { id: userSnap.id, ...userSnap.data() };

      // Get user's orders
      const ordersQuery = query(
        collection(db, 'orders'),
        where('buyerId', '==', userId)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const userOrders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Get user's disputes
      const disputesQuery = query(
        collection(db, 'disputes'),
        where('userId', '==', userId)
      );
      const disputesSnapshot = await getDocs(disputesQuery);
      const userDisputes = disputesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return {
        ...userData,
        orders: userOrders,
        disputes: userDisputes
      };
    } catch (error) {
      console.error('Error fetching user details:', error);
      throw error;
    }
  },

  // Update user role
  async updateUserRole(userId, role) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  },

  // Get system logs (if implemented)
  async getSystemLogs({ pageSize = 100, cursor = null }) {
    try {
      let q = query(
        collection(db, 'system_logs'),
        orderBy('timestamp', 'desc'),
        fsLimit(pageSize)
      );
      if (cursor) {
        q = query(
          collection(db, 'system_logs'),
          orderBy('timestamp', 'desc'),
          startAfter(cursor),
          fsLimit(pageSize)
        );
      }
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const nextCursor = snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : null;
      return { items, nextCursor };
    } catch (error) {
      console.error('Error fetching system logs:', error);
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
  analytics: analyticsService,
  payouts: payoutsService,
  admin: adminService
};

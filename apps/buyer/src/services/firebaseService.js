import { 
  collection, 
  doc, 
  addDoc, 
  setDoc,
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
  increment,
  startAfter,
  onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { 
  walletTrackingService, 
  productTrackingService, 
  storeService,
  trackingLookupService 
} from './trackingService';

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
  // Create product with tracking number
  async createProduct(productData, vendorId, storeId = null) {
    try {
      return await productTrackingService.createProduct(productData, vendorId, storeId);
    } catch (error) {
      console.error('Error creating product with tracking:', error);
      throw error;
    }
  },

  // Get product by tracking number
  async getProductByTrackingNumber(trackingNumber) {
    try {
      return await productTrackingService.getProductByTrackingNumber(trackingNumber);
    } catch (error) {
      console.error('Error fetching product by tracking number:', error);
      throw error;
    }
  },

  async saveWithUploads(productData, vendorId, productId = null, storeId = null, options = {}) {
    return await productService.saveWithUploadsWithProgress(productData, vendorId, productId, storeId, options);
  },

  // Internal: same as saveWithUploads but exposes a progress callback via options
  async saveWithUploadsWithProgress(productData, vendorId, productId = null, storeId = null, options = {}) {
    const { onProgress } = options;
    const items = Array.isArray(productData.images) ? productData.images : [];
    const videoItems = Array.isArray(productData.videos) ? productData.videos : [];
    const resolvedImages = [];
    const resolvedVideos = [];
    const fileItems = [
      ...items.filter((i) => typeof i !== 'string'),
      ...videoItems.filter((v) => typeof v !== 'string')
    ];
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
            const indexOfCurrent = resolvedImages.length; // approx position within images
            const priorImageFiles = items.filter((i) => typeof i !== 'string').slice(0, indexOfCurrent);
            const priorVideoFiles = []; // ignore videos for this estimate
            const priorFiles = [...priorImageFiles, ...priorVideoFiles];
            const priorBytes = priorFiles.reduce((s, f) => s + (f?.size || 0), 0);
            uploadedBytes = priorBytes + currentFileUploaded;
            notify();
          }, reject, async () => {
            try {
              const url = await getDownloadURL(task.snapshot.ref);
              resolvedImages.push(url);
              // After file completes update uploadedBytes to include full file
              const completedImageFiles = items.filter((i) => typeof i !== 'string').slice(0, resolvedImages.length);
              uploadedBytes = completedImageFiles.reduce((s, f) => s + (f?.size || 0), 0);
              notify();
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        });
      }
    }

    // Then resolve videos: keep URLs, upload File objects and get URLs
    for (const vid of videoItems) {
      if (typeof vid === 'string') {
        resolvedVideos.push(vid);
      } else if (vid) {
        const safeName = (vid.name || 'video').replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `products/${vendorId}/videos/${Date.now()}-${safeName}`;
        const storageRef = ref(storage, path);
        // Upload without progress integration (keeps implementation simple)
        await uploadBytes(storageRef, vid);
        const url = await getDownloadURL(storageRef);
        resolvedVideos.push(url);
      }
    }
    if (totalBytes === 0 && typeof onProgress === 'function') {
      onProgress(100);
    }
    // Final payload: whitelist known fields and ensure no File/Blob sneaks in
    const coerceNumber = (v) => {
      const n = typeof v === 'number' ? v : parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };
    const ensureStringArray = (arr) => (Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []);
    const sanitizeScalar = (v) => (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? v : null);

    const payload = {
      name: sanitizeScalar(productData?.name) || '',
      category: sanitizeScalar(productData?.category) || 'Uncategorized',
      description: sanitizeScalar(productData?.description) || '',
      price: coerceNumber(productData?.price),
      currency: sanitizeScalar(productData?.currency) || '₦ NGN',
      stock: coerceNumber(productData?.stock),
      condition: sanitizeScalar(productData?.condition) || 'new',
      images: ensureStringArray(resolvedImages),
      videos: ensureStringArray(resolvedVideos),
    };
    if (productId) {
      // Update existing product
      await productService.update(productId, payload);
      // Also update storeId if provided
      if (storeId) {
        try {
          await productService.update(productId, { storeId });
        } catch (err) {
          console.warn('Could not update product storeId:', err);
        }
      }
      return productId;
    }
    // Create new product with storeId
    return await productService.create(payload, vendorId, storeId);
  },
  // Create a new product
  async create(productData, vendorId, storeId = null) {
    try {
      if (!vendorId) {
        throw new Error('vendorId is required to create a product');
      }
      
      // Fetch vendor info to ensure we have vendorEmail as well for proper referencing
      let vendorEmail = productData.vendorEmail;
      try {
        const vendorDoc = await getDoc(doc(db, 'users', vendorId));
        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data();
          vendorEmail = vendorEmail || vendorData.email || null;
        } else {
          throw new Error(`Vendor with ID ${vendorId} does not exist`);
        }
      } catch (vendorError) {
        console.error('Error fetching vendor info for product creation:', vendorError);
        // If vendor doesn't exist, we should not create the product
        throw new Error(`Invalid vendorId: ${vendorId}. Vendor not found in users collection.`);
      }
      
      const productPayload = {
        ...productData,
        vendorId, // Primary reference - always required
        vendorEmail: vendorEmail || productData.vendorEmail || null, // Secondary reference for fallback queries
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'pending' // Require admin approval
      };
      // Include storeId if provided
      if (storeId) {
        productPayload.storeId = storeId;
      }
      const docRef = await addDoc(collection(db, 'products'), productPayload);
      console.log('✅ Product created with vendorId:', vendorId, 'vendorEmail:', vendorEmail);
      return docRef.id;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  // Get all products with optional filtering
  async getAll(filters = {}) {
    try {
      console.log('🔍 products.getAll: Filters:', filters);
      let q = collection(db, 'products');
      
      if (filters.category && filters.category !== 'all') {
        q = query(q, where('category', '==', filters.category));
      }
      
      if (filters.vendorId) {
        q = query(q, where('vendorId', '==', filters.vendorId));
      }
      
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      } else if (!filters.showAll) {
        // Default: only show active products unless showAll is true
        q = query(q, where('status', '==', 'active'));
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
      console.log('🔍 getByVendorPaged: Querying products for vendorId:', vendorId, 'pageSize:', pageSize, 'cursor:', cursor ? 'exists' : 'null');
      
      // Try query with orderBy first
      let q;
      try {
        if (cursor) {
          q = query(
            collection(db, 'products'),
            where('vendorId', '==', vendorId),
            orderBy('createdAt', 'desc'),
            startAfter(cursor),
            fsLimit(pageSize)
          );
        } else {
          q = query(
            collection(db, 'products'),
            where('vendorId', '==', vendorId),
            orderBy('createdAt', 'desc'),
            fsLimit(pageSize)
          );
        }
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const nextCursor = snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : null;
        console.log('✅ getByVendorPaged: Found', items.length, 'products');
        return { items, nextCursor };
      } catch (orderByError) {
        // If orderBy fails (missing index), try without orderBy
        console.warn('⚠️ Query with orderBy failed, trying without orderBy:', orderByError.message);
        let fallbackQ = query(
          collection(db, 'products'),
          where('vendorId', '==', vendorId),
          fsLimit(pageSize * 2) // Fetch more to sort client-side
        );
        
        const snapshot = await getDocs(fallbackQ);
        let items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Sort by createdAt client-side
        items.sort((a, b) => {
          const aTime = a.createdAt?.seconds || a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.seconds || b.createdAt?.toMillis?.() || 0;
          if (a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt) {
            const aDate = a.createdAt.toDate();
            const bDate = b.createdAt.toDate();
            return bDate - aDate;
          }
          return bTime - aTime;
        });
        
        // Apply pagination client-side
        if (cursor) {
          // Find cursor position
          const cursorIndex = items.findIndex(item => item.id === cursor.id);
          if (cursorIndex >= 0) {
            items = items.slice(cursorIndex + 1, cursorIndex + 1 + pageSize);
          } else {
            items = items.slice(0, pageSize);
          }
        } else {
          items = items.slice(0, pageSize);
        }
        
        const nextCursor = items.length === pageSize ? items[items.length - 1] : null;
        console.log('✅ getByVendorPaged (fallback): Found', items.length, 'products');
        return { items, nextCursor };
      }
    } catch (error) {
      console.error('❌ Error fetching vendor products (paged):', error);
      throw error;
    }
  },

  // Get all products for a vendor (non-paged)
  async getByVendor(vendorId) {
    try {
      console.log('🔍 getByVendor: Querying all products for vendorId:', vendorId);
      
      // Try query with orderBy first
      try {
        const q = query(
          collection(db, 'products'),
          where('vendorId', '==', vendorId),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('✅ getByVendor: Found', products.length, 'products');
        return products;
      } catch (orderByError) {
        // If orderBy fails (missing index), try without orderBy
        console.warn('⚠️ Query with orderBy failed, trying without orderBy:', orderByError.message);
        const fallbackQ = query(
          collection(db, 'products'),
          where('vendorId', '==', vendorId)
        );
        const snapshot = await getDocs(fallbackQ);
        let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort by createdAt client-side
        products.sort((a, b) => {
          const aTime = a.createdAt?.seconds || a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.seconds || b.createdAt?.toMillis?.() || 0;
          if (a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt) {
            const aDate = a.createdAt.toDate();
            const bDate = b.createdAt.toDate();
            return bDate - aDate;
          }
          return bTime - aTime;
        });
        
        console.log('✅ getByVendor (fallback): Found', products.length, 'products');
        return products;
      }
    } catch (error) {
      console.error('❌ Error fetching vendor products:', error);
      throw error;
    }
  },

  // Get products by vendor email (fallback if vendorId doesn't match)
  async getByVendorEmail(vendorEmail) {
    try {
      console.log('🔍 getByVendorEmail: Querying products for vendorEmail:', vendorEmail);
      
      // Try query with orderBy first
      try {
        const q = query(
          collection(db, 'products'),
          where('vendorEmail', '==', vendorEmail),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('✅ getByVendorEmail: Found', products.length, 'products');
        return products;
      } catch (orderByError) {
        // If orderBy fails (missing index), try without orderBy
        console.warn('⚠️ Query with orderBy failed, trying without orderBy:', orderByError.message);
        try {
          const fallbackQ = query(
            collection(db, 'products'),
            where('vendorEmail', '==', vendorEmail)
          );
          const snapshot = await getDocs(fallbackQ);
          let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Sort by createdAt client-side
          products.sort((a, b) => {
            const aTime = a.createdAt?.seconds || a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.seconds || b.createdAt?.toMillis?.() || 0;
            if (a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt) {
              const aDate = a.createdAt.toDate();
              const bDate = b.createdAt.toDate();
              return bDate - aDate;
            }
            return bTime - aTime;
          });
          
          console.log('✅ getByVendorEmail (fallback): Found', products.length, 'products');
          return products;
        } catch (whereError) {
          // If where clause also fails, fetch all products and filter client-side
          console.warn('⚠️ Query with where clause failed, fetching all products and filtering client-side:', whereError.message);
          const allProductsQuery = query(collection(db, 'products'));
          const snapshot = await getDocs(allProductsQuery);
          let allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Filter by vendorEmail client-side
          const products = allProducts.filter(p => {
            const email = p.vendorEmail || p.vendor?.email || '';
            return email.toLowerCase() === vendorEmail.toLowerCase();
          });
          
          // Sort by createdAt client-side
          products.sort((a, b) => {
            const aTime = a.createdAt?.seconds || a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.seconds || b.createdAt?.toMillis?.() || 0;
            if (a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt) {
              const aDate = a.createdAt.toDate();
              const bDate = b.createdAt.toDate();
              return bDate - aDate;
            }
            return bTime - aTime;
          });
          
          console.log('✅ getByVendorEmail (client-side filter): Found', products.length, 'products out of', allProducts.length, 'total');
          return products;
        }
      }
    } catch (error) {
      console.error('❌ Error fetching products by vendorEmail:', error);
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
        status: orderData.status || 'pending_wallet_funding', // Use provided status or default
        // Use Order ID as the tracking identifier
        trackingId: null, // Will be set after creation
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Set the Order ID as the tracking ID
      await updateDoc(docRef, {
        trackingId: docRef.id
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  // Get order by tracking ID (Order ID)
  async getByTrackingId(trackingId) {
    try {
      const orderRef = doc(db, 'orders', trackingId);
      const orderDoc = await getDoc(orderRef);
      
      if (orderDoc.exists()) {
        return { id: orderDoc.id, ...orderDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching order by tracking ID:', error);
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
      
      // Temporary workaround: Get all orders and filter client-side while index builds
      const q = query(
        collection(db, 'orders'),
        where(field, '==', userId)
        // Removed orderBy temporarily to avoid index requirement
      );
      
      const snapshot = await getDocs(q);
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort client-side as temporary workaround
      return orders.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return bTime - aTime; // Descending order
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  },

  // Get orders for a vendor (alias for getByUser with vendorId)
  async getByVendor(vendorId) {
    return this.getByUser(vendorId, 'vendor');
  },

  // Paged orders for a user
  async getByUserPaged({ userId, userType = 'buyer', pageSize = 10, cursor = null }) {
    try {
      // Validate userId before making query
      if (!userId) {
        console.warn('getByUserPaged called with undefined userId');
        return { items: [], nextCursor: null };
      }
      
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
  // Create wallet account for user with tracking ID
  async createWallet(userId, userType) {
    try {
      return await walletTrackingService.createWallet(userId, userType);
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  },

  // Get user's wallet by user ID
  async getUserWallet(userId) {
    try {
      return await walletTrackingService.getWalletByUserId(userId);
    } catch (error) {
      console.error('Error fetching wallet:', error);
      throw error;
    }
  },

  // Get wallet by tracking ID
  async getWalletByTrackingId(walletId) {
    try {
      return await walletTrackingService.getWalletByTrackingId(walletId);
    } catch (error) {
      console.error('Error fetching wallet by tracking ID:', error);
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
  
  // Top up escrow wallet for an order
  async topUpEscrowWallet(walletId, amount, metadata = {}) {
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
        description: metadata.note || 'Escrow wallet top-up',
        orderId: metadata.orderId || null,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        status: 'completed',
        createdAt: serverTimestamp()
      });
      
      await batch.commit();
      return { newBalance, transactionId: transactionRef.id };
    } catch (error) {
      console.error('Error topping up escrow wallet:', error);
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
      // Temporary workaround: Remove orderBy while index builds
      const q = query(
        collection(db, 'wallet_transactions'),
        where('userId', '==', userId)
        // Removed orderBy temporarily to avoid index requirement
      );
      
      const snapshot = await getDocs(q);
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort client-side as temporary workaround
      return transactions.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return bTime - aTime; // Descending order
      });
    } catch (error) {
      console.error('Error fetching wallet transactions:', error);
      throw error;
    }
  },

  // Get transactions for a specific order
  async getOrderTransactions(orderId, userId = null) {
    try {
      const constraints = [where('orderId', '==', orderId)];
      if (userId) constraints.push(where('userId', '==', userId));
      
      const q = query(
        collection(db, 'wallet_transactions'),
        ...constraints
      );
      
      const snapshot = await getDocs(q);
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort client-side as temporary workaround
      return transactions.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return bTime - aTime; // Descending order
      });
    } catch (error) {
      console.error('Error fetching order transactions:', error);
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

  // Release wallet funds to vendor (escrow release)
  async releaseWallet(orderId, vendorId, amount) {
    try {
      // Get order details to find buyer ID
      const order = await orderService.getById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }
      
      const buyerId = order.buyerId;
      if (!buyerId) {
        throw new Error('Buyer ID not found in order');
      }
      
      // Get buyer and vendor wallets by userId
      const [buyerWallet, vendorWallet] = await Promise.all([
        walletService.getUserWallet(buyerId),
        walletService.getUserWallet(vendorId)
      ]);
      
      if (!buyerWallet) {
        console.error('Buyer wallet not found for user:', buyerId);
        throw new Error('Buyer wallet not found. Please ensure the buyer has a wallet.');
      }
      
      const batch = writeBatch(db);
      
      // Update buyer wallet (deduct amount from escrow)
      const buyerWalletRef = doc(db, 'wallets', buyerWallet.id);
      const buyerBalance = buyerWallet.balance || 0;
      if (buyerBalance < amount) {
        throw new Error('Insufficient funds in buyer wallet');
      }
      
      batch.update(buyerWalletRef, {
        balance: buyerBalance - amount,
        updatedAt: serverTimestamp()
      });
      
      // Update or create vendor wallet (add amount)
      if (vendorWallet) {
        const vendorWalletRef = doc(db, 'wallets', vendorWallet.id);
        const vendorBalance = vendorWallet.balance || 0;
        batch.update(vendorWalletRef, {
          balance: vendorBalance + amount,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create vendor wallet if it doesn't exist
        console.log('Creating vendor wallet for:', vendorId);
        const vendorWalletRef = doc(collection(db, 'wallets'));
        batch.set(vendorWalletRef, {
          userId: vendorId,
          userType: 'vendor',
          balance: amount,
          currency: 'NGN',
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      // Create release transaction record
      const transactionRef = doc(collection(db, 'wallet_transactions'));
      batch.set(transactionRef, {
        walletId: vendorWallet?.id || 'new_vendor_wallet',
        userId: vendorId,
        orderId,
        type: 'escrow_release',
        amount,
        description: `Escrow release for order ${orderId}`,
        status: 'completed',
        balanceBefore: vendorWallet?.balance || 0,
        balanceAfter: (vendorWallet?.balance || 0) + amount,
        createdAt: serverTimestamp()
      });
      
      // Don't update order status here - it's already updated by the caller
      // This prevents conflicts when multiple operations try to update the same order
      
      await batch.commit();
      console.log('✅ Escrow released successfully:', transactionRef.id);
      return transactionRef.id;
    } catch (error) {
      console.error('Error releasing escrow funds:', error);
      throw error;
    }
  }
};

// ===============================
// AUX VIEW HELPERS (Transactions per order)
// ===============================

export async function getOrderTransactions(orderId, userId) {
  try {
    const constraints = [where('orderId', '==', orderId)];
    if (userId) constraints.push(where('userId', '==', userId));
    const q = query(
      collection(db, 'wallet_transactions'),
      ...constraints,
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching order transactions (helper):', error);
    return [];
  }
}

// ===============================
// LOGISTICS OPERATIONS
// ===============================

// import googleMapsService from './googleMapsService'; // Disabled

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

  // Get routes by logistics partner
  async getRoutesByPartner(partnerId) {
    try {
      const q = query(
        collection(db, 'logistics_routes'),
        where('companyId', '==', partnerId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Format price display
        priceDisplay: `${doc.data().currency} ${Number(doc.data().price).toLocaleString()}`,
        distanceDisplay: `${doc.data().distance} km`
      }));
    } catch (error) {
      console.error('Error fetching routes by partner:', error);
      throw error;
    }
  },

  // Update route
  async updateRoute(routeId, updateData) {
    try {
      const routeRef = doc(db, 'logistics_routes', routeId);
      await updateDoc(routeRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating route:', error);
      throw error;
    }
  },

  // Toggle route status (activate/deactivate)
  async toggleRouteStatus(routeId, currentStatus) {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const routeRef = doc(db, 'logistics_routes', routeId);
      await updateDoc(routeRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      return newStatus;
    } catch (error) {
      console.error('Error toggling route status:', error);
      throw error;
    }
  },

  // Delete route
  async deleteRoute(routeId) {
    try {
      const routeRef = doc(db, 'logistics_routes', routeId);
      await deleteDoc(routeRef);
      return true;
    } catch (error) {
      console.error('Error deleting route:', error);
      throw error;
    }
  },

  // Get route analytics
  async getRouteAnalytics(partnerId, timeRange = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      // Get all routes for the partner
      const routesQuery = query(
        collection(db, 'logistics_routes'),
        where('companyId', '==', partnerId)
      );
      const routesSnapshot = await getDocs(routesQuery);
      const routes = routesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Get deliveries for these routes with date range filters (requires index)
      const deliveriesQuery = query(
        collection(db, 'deliveries'),
        where('logisticsPartnerId', '==', partnerId),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate)
      );
      const deliveriesSnapshot = await getDocs(deliveriesQuery);
      const deliveries = deliveriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate analytics
      const analytics = {
        totalRoutes: routes.length,
        activeRoutes: routes.filter(route => route.status === 'active').length,
        inactiveRoutes: routes.filter(route => route.status === 'inactive').length,
        totalDeliveries: deliveries.length,
        completedDeliveries: deliveries.filter(d => d.status === 'delivered').length,
        pendingDeliveries: deliveries.filter(d => d.status === 'pending_pickup').length,
        inTransitDeliveries: deliveries.filter(d => d.status === 'in_transit').length,
        totalRevenue: deliveries.reduce((sum, d) => sum + (d.price || 0), 0),
        averageDeliveryTime: this.calculateAverageDeliveryTime(deliveries),
        topRoutes: this.getTopRoutes(routes, deliveries),
        routePerformance: this.getRoutePerformance(routes, deliveries),
        timeRange: timeRange
      };

      return analytics;
    } catch (error) {
      // If index doesn't exist yet, try without date range and filter client-side
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.warn('Route analytics index not ready yet, fetching without date filters and filtering client-side');
        try {
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - timeRange);

          // Get all routes for the partner
          const routesQuery = query(
            collection(db, 'logistics_routes'),
            where('companyId', '==', partnerId)
          );
          const routesSnapshot = await getDocs(routesQuery);
          const routes = routesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          // Get all deliveries for the partner (without date filters)
          const deliveriesQuery = query(
            collection(db, 'deliveries'),
            where('logisticsPartnerId', '==', partnerId)
          );
          const deliveriesSnapshot = await getDocs(deliveriesQuery);
          const allDeliveries = deliveriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          // Filter by date range client-side
          const deliveries = allDeliveries.filter(delivery => {
            const createdAt = delivery.createdAt?.toDate?.() || new Date(delivery.createdAt || 0);
            return createdAt >= startDate && createdAt <= endDate;
          });

          // Calculate analytics
          const analytics = {
            totalRoutes: routes.length,
            activeRoutes: routes.filter(route => route.status === 'active').length,
            inactiveRoutes: routes.filter(route => route.status === 'inactive').length,
            totalDeliveries: deliveries.length,
            completedDeliveries: deliveries.filter(d => d.status === 'delivered').length,
            pendingDeliveries: deliveries.filter(d => d.status === 'pending_pickup').length,
            inTransitDeliveries: deliveries.filter(d => d.status === 'in_transit').length,
            totalRevenue: deliveries.reduce((sum, d) => sum + (d.price || 0), 0),
            averageDeliveryTime: this.calculateAverageDeliveryTime(deliveries),
            topRoutes: this.getTopRoutes(routes, deliveries),
            routePerformance: this.getRoutePerformance(routes, deliveries),
            timeRange: timeRange
          };

          return analytics;
        } catch (fallbackError) {
          console.error('Error getting route analytics (fallback):', fallbackError);
          // Return empty analytics instead of throwing
          return {
            totalRoutes: 0,
            activeRoutes: 0,
            inactiveRoutes: 0,
            totalDeliveries: 0,
            completedDeliveries: 0,
            pendingDeliveries: 0,
            inTransitDeliveries: 0,
            totalRevenue: 0,
            averageDeliveryTime: 0,
            topRoutes: [],
            routePerformance: [],
            timeRange: timeRange
          };
        }
      }
      console.error('Error getting route analytics:', error);
      throw error;
    }
  },

  // Helper: Calculate average delivery time
  calculateAverageDeliveryTime(deliveries) {
    const completedDeliveries = deliveries.filter(d => 
      d.status === 'delivered' && d.deliveredAt && d.pickedUpAt
    );

    if (completedDeliveries.length === 0) return 0;

    const totalTime = completedDeliveries.reduce((sum, delivery) => {
      const pickupTime = delivery.pickedUpAt?.toDate?.() || new Date(delivery.pickedUpAt);
      const deliveryTime = delivery.deliveredAt?.toDate?.() || new Date(delivery.deliveredAt);
      return sum + (deliveryTime - pickupTime);
    }, 0);

    return Math.round(totalTime / completedDeliveries.length / (1000 * 60 * 60)); // Hours
  },

  // Helper: Get top performing routes
  getTopRoutes(routes, deliveries) {
    const routeStats = routes.map(route => {
      const routeDeliveries = deliveries.filter(d => d.routeId === route.id);
      return {
        routeId: route.id,
        from: route.from,
        to: route.to,
        deliveries: routeDeliveries.length,
        revenue: routeDeliveries.reduce((sum, d) => sum + (d.price || 0), 0),
        completionRate: routeDeliveries.length > 0 
          ? (routeDeliveries.filter(d => d.status === 'delivered').length / routeDeliveries.length) * 100
          : 0
      };
    });

    return routeStats
      .sort((a, b) => b.deliveries - a.deliveries)
      .slice(0, 5);
  },

  // Helper: Get route performance metrics
  getRoutePerformance(routes, deliveries) {
    return routes.map(route => {
      const routeDeliveries = deliveries.filter(d => d.routeId === route.id);
      const completedDeliveries = routeDeliveries.filter(d => d.status === 'delivered');
      
      return {
        routeId: route.id,
        from: route.from,
        to: route.to,
        status: route.status,
        totalDeliveries: routeDeliveries.length,
        completedDeliveries: completedDeliveries.length,
        completionRate: routeDeliveries.length > 0 
          ? (completedDeliveries.length / routeDeliveries.length) * 100 
          : 0,
        revenue: routeDeliveries.reduce((sum, d) => sum + (d.price || 0), 0),
        averageDeliveryTime: this.calculateRouteAverageTime(routeDeliveries)
      };
    });
  },

  // Helper: Calculate average time for a specific route
  calculateRouteAverageTime(deliveries) {
    const completedDeliveries = deliveries.filter(d => 
      d.status === 'delivered' && d.deliveredAt && d.pickedUpAt
    );

    if (completedDeliveries.length === 0) return 0;

    const totalTime = completedDeliveries.reduce((sum, delivery) => {
      const pickupTime = delivery.pickedUpAt?.toDate?.() || new Date(delivery.pickedUpAt);
      const deliveryTime = delivery.deliveredAt?.toDate?.() || new Date(delivery.deliveredAt);
      return sum + (deliveryTime - pickupTime);
    }, 0);

    return Math.round(totalTime / completedDeliveries.length / (1000 * 60 * 60)); // Hours
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
  },

  // Create logistics partner profile
  async createProfile(profileData) {
    try {
      const docRef = await addDoc(collection(db, 'logistics_profiles'), {
        ...profileData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating logistics profile:', error);
      throw error;
    }
  },

  // Get logistics profile by user ID
  async getProfileByUserId(userId) {
    try {
      const q = query(
        collection(db, 'logistics_profiles'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error getting logistics profile:', error);
      throw error;
    }
  },

  // Alias for getProfileByUserId for consistency
  async getProfile(userId) {
    return this.getProfileByUserId(userId);
  },

  // Update logistics profile
  async updateProfile(profileId, updateData) {
    try {
      const profileRef = doc(db, 'logistics_profiles', profileId);
      await updateDoc(profileRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating logistics profile:', error);
      throw error;
    }
  },

  // Get all logistics partners
  async getAllPartners() {
    try {
      const q = query(
        collection(db, 'logistics_profiles'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching logistics partners:', error);
      throw error;
    }
  },

  // Get available logistics partners for delivery
  async getAvailablePartners(deliveryData) {
    try {
      const { pickupLocation, deliveryLocation, weight, distance } = deliveryData;
      
      const q = query(
        collection(db, 'logistics_profiles'),
        where('status', '==', 'approved'),
        where('serviceAreas', 'array-contains-any', [pickupLocation, deliveryLocation])
      );
      
      const snapshot = await getDocs(q);
      const partners = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter by weight and distance capabilities
      return partners.filter(partner => 
        partner.maxWeight >= weight && 
        partner.maxDistance >= distance
      );
    } catch (error) {
      console.error('Error fetching available partners:', error);
      throw error;
    }
  },

  // Get deliveries for logistics partner
  async getDeliveriesByPartner(partnerId) {
    try {
      // Try with orderBy first (requires index)
      const q = query(
        collection(db, 'deliveries'),
        where('logisticsPartnerId', '==', partnerId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      // If index doesn't exist yet, try without orderBy and sort client-side
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.warn('Index not ready yet, fetching without orderBy and sorting client-side');
        try {
          const q = query(
            collection(db, 'deliveries'),
            where('logisticsPartnerId', '==', partnerId)
          );
          const snapshot = await getDocs(q);
          const deliveries = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Sort client-side by createdAt descending
          return deliveries.sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
            const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
            return bTime - aTime;
          });
        } catch (fallbackError) {
          console.error('Error fetching deliveries (fallback):', fallbackError);
          return []; // Return empty array instead of throwing
        }
      }
      console.error('Error fetching deliveries:', error);
      throw error;
    }
  },

  // Enhanced dynamic pricing calculation with Google Maps integration
  async calculateCostWithMaps(partner, deliveryData) {
    try {
      const {
        pickupLocation,
        deliveryLocation,
        weight = 1,
        deliveryType = 'standard',
        urgency = 'normal',
        itemValue = 0,
        isFragile = false,
        requiresSignature = false,
        timeOfDay = 'business'
      } = deliveryData;

      // Get optimized pricing using Google Maps - DISABLED
      // Use fallback calculation instead
      console.warn('Maps pricing unavailable, using fallback calculation');
      return this.calculateCost(partner, deliveryData);

      // Apply partner-specific adjustments
      const partnerAdjustment = partner.priceAdjustment || 1.0;
      const adjustedCost = Math.round(optimizedPricing.cost * partnerAdjustment);

      return {
        cost: adjustedCost,
        routeAnalysis: optimizedPricing.routeAnalysis,
        breakdown: {
          ...optimizedPricing.breakdown,
          partnerAdjustment,
          finalCost: adjustedCost
        },
        partner: {
          id: partner.id,
          name: partner.name,
          adjustment: partnerAdjustment
        }
      };
    } catch (error) {
      console.error('Error calculating cost with Maps:', error);
      // Fallback to legacy calculation
      return this.calculateCost(partner, deliveryData);
    }
  },

  // Legacy pricing calculation (fallback)
  calculateCost(partner, deliveryData) {
    const {
      distance,
      weight,
      deliveryType = 'standard',
      pickupLocation,
      deliveryLocation,
      urgency = 'normal',
      itemValue = 0,
      isFragile = false,
      requiresSignature = false,
      timeOfDay = 'business'
    } = deliveryData;

    // Base pricing components
    const baseRate = partner.baseRate || 0;
    const perKmRate = partner.perKmRate || 0;
    
    // Distance-based pricing with intracity optimization
    let distanceCost = 0;
    if (distance <= 5) {
      // Intracity short distance (0-5km) - flat rate with small per-km
      distanceCost = Math.max(baseRate, 500) + (distance * 50);
    } else if (distance <= 15) {
      // Intracity medium distance (5-15km) - standard per-km rate
      distanceCost = baseRate + (distance * perKmRate);
    } else if (distance <= 30) {
      // Intracity long distance (15-30km) - premium rate
      distanceCost = baseRate + (distance * perKmRate * 1.2);
    } else {
      // Intercity (30km+) - standard rate
      distanceCost = baseRate + (distance * perKmRate);
    }

    // Weight-based pricing tiers
    let weightMultiplier = 1;
    if (weight <= 1) {
      weightMultiplier = 0.8; // Light items discount
    } else if (weight <= 5) {
      weightMultiplier = 1; // Standard weight
    } else if (weight <= 10) {
      weightMultiplier = 1.3; // Heavy items
    } else if (weight <= 20) {
      weightMultiplier = 1.6; // Very heavy items
    } else {
      weightMultiplier = 2.0; // Oversized items
    }

    // Delivery type multipliers
    const deliveryTypeMultipliers = {
      'same_day': 2.5,
      'express': 2.0,
      'standard': 1.0,
      'economy': 0.8,
      'overnight': 1.5
    };

    // Urgency multipliers
    const urgencyMultipliers = {
      'urgent': 1.8,
      'normal': 1.0,
      'flexible': 0.9
    };

    // Time of day multipliers
    const timeMultipliers = {
      'business': 1.0,
      'after_hours': 1.3,
      'weekend': 1.2,
      'holiday': 1.5
    };

    // Special service charges
    let specialCharges = 0;
    if (isFragile) specialCharges += 200; // Fragile handling fee
    if (requiresSignature) specialCharges += 100; // Signature confirmation fee
    if (itemValue > 10000) specialCharges += 300; // High-value insurance fee

    // Route complexity analysis
    let routeComplexityMultiplier = 1;
    const isIntracity = this.isIntracityRoute(pickupLocation, deliveryLocation);
    const isSameCity = this.isSameCity(pickupLocation, deliveryLocation);
    
    if (isIntracity) {
      // Intracity routes get volume discounts
      routeComplexityMultiplier = 0.9;
    } else if (isSameCity) {
      // Same city but different areas
      routeComplexityMultiplier = 1.1;
    } else {
      // Intercity routes
      routeComplexityMultiplier = 1.3;
    }

    // Calculate final cost
    const baseCost = distanceCost * weightMultiplier;
    const deliveryMultiplier = deliveryTypeMultipliers[deliveryType] || 1;
    const urgencyMultiplier = urgencyMultipliers[urgency] || 1;
    const timeMultiplier = timeMultipliers[timeOfDay] || 1;
    
    const finalCost = (baseCost * deliveryMultiplier * urgencyMultiplier * timeMultiplier * routeComplexityMultiplier) + specialCharges;

    // Minimum and maximum cost limits
    const minCost = 300; // Minimum ₦300
    const maxCost = 50000; // Maximum ₦50,000

    return Math.max(minCost, Math.min(maxCost, Math.round(finalCost)));
  },

  // Helper function to determine if route is intracity
  isIntracityRoute(pickupLocation, deliveryLocation) {
    if (!pickupLocation || !deliveryLocation) return false;
    
    // Extract city names (simple implementation)
    const pickupCity = pickupLocation.split(',')[0].trim().toLowerCase();
    const deliveryCity = deliveryLocation.split(',')[0].trim().toLowerCase();
    
    return pickupCity === deliveryCity;
  },

  // Helper function to determine if route is same city
  isSameCity(pickupLocation, deliveryLocation) {
    if (!pickupLocation || !deliveryLocation) return false;
    
    const pickupCity = pickupLocation.split(',')[0].trim().toLowerCase();
    const deliveryCity = deliveryLocation.split(',')[0].trim().toLowerCase();
    
    return pickupCity === deliveryCity;
  },

  // Get dynamic pricing options for a route
  async getPricingOptions(partner, deliveryData) {
    const baseCost = this.calculateCost(partner, deliveryData);
    
    return {
      standard: {
        name: 'Standard Delivery',
        cost: baseCost,
        estimatedDays: partner.estimatedDeliveryDays || 2,
        features: ['Regular handling', 'Standard tracking']
      },
      express: {
        name: 'Express Delivery',
        cost: Math.round(baseCost * 1.8),
        estimatedDays: 1,
        features: ['Priority handling', 'Real-time tracking', 'SMS notifications']
      },
      same_day: {
        name: 'Same Day Delivery',
        cost: Math.round(baseCost * 2.5),
        estimatedDays: 0.5,
        features: ['Immediate dispatch', 'Live tracking', 'Guaranteed delivery']
      },
      economy: {
        name: 'Economy Delivery',
        cost: Math.round(baseCost * 0.8),
        estimatedDays: 3,
        features: ['Standard handling', 'Basic tracking']
      }
    };
  },

  // Search products with enhanced functionality for Osoahia
  async searchProducts(searchTerm, options = {}) {
    try {
      const { pageSize = 20, category, minPrice, maxPrice, sortBy = 'relevance' } = options;
      
      let q = query(collection(db, 'products'));
      
      // Add search filters
      if (category) {
        q = query(q, where('category', '==', category));
      }
      
      if (minPrice !== undefined) {
        q = query(q, where('price', '>=', minPrice));
      }
      
      if (maxPrice !== undefined) {
        q = query(q, where('price', '<=', maxPrice));
      }
      
      // Add sorting
      if (sortBy === 'price_low') {
        q = query(q, orderBy('price', 'asc'));
      } else if (sortBy === 'price_high') {
        q = query(q, orderBy('price', 'desc'));
      } else if (sortBy === 'newest') {
        q = query(q, orderBy('createdAt', 'desc'));
      } else if (sortBy === 'rating') {
        q = query(q, orderBy('rating', 'desc'));
      }
      
      const snapshot = await getDocs(q);
      let products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter by search term if provided
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        products = products.filter(product => 
          product.name.toLowerCase().includes(searchLower) ||
          product.description.toLowerCase().includes(searchLower) ||
          product.category.toLowerCase().includes(searchLower)
        );
      }
      
      return products.slice(0, pageSize);
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  },

  // Get popular products for recommendations
  async getPopular(options = {}) {
    try {
      const { pageSize = 10 } = options;
      
      // In a real app, this would be based on actual sales data
      // For now, we'll return products with high ratings
      let q = query(
        collection(db, 'products'),
        where('status', '==', 'active'),
        where('rating', '>=', 4.0),
        orderBy('rating', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return products.slice(0, pageSize);
    } catch (error) {
      console.error('Error getting popular products:', error);
      return [];
    }
  },

  // Get trending products
  async getTrending(options = {}) {
    try {
      const { pageSize = 10 } = options;
      
      // In a real app, this would be based on recent views/sales
      // For now, we'll return recently created products
      const q = query(
        collection(db, 'products'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return products.slice(0, pageSize);
    } catch (error) {
      console.error('Error getting trending products:', error);
      return [];
    }
  },

  // Get featured products
  async getFeatured(options = {}) {
    try {
      const { pageSize = 10 } = options;
      
      // Return a mix of popular and new products
      const [popular, trending] = await Promise.all([
        this.getPopular({ pageSize: Math.ceil(pageSize / 2) }),
        this.getTrending({ pageSize: Math.floor(pageSize / 2) })
      ]);
      
      // Combine and shuffle
      const combined = [...popular, ...trending];
      return combined.slice(0, pageSize);
    } catch (error) {
      console.error('Error getting featured products:', error);
      return [];
    }
  },

  // Get products by category
  async getByCategory(category, options = {}) {
    try {
      const { pageSize = 20 } = options;
      
      const q = query(
        collection(db, 'products'),
        where('status', '==', 'active'),
        where('category', '==', category),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return products.slice(0, pageSize);
    } catch (error) {
      console.error('Error getting products by category:', error);
      return [];
    }
  },

  // Get similar products
  async getSimilar(productId, options = {}) {
    try {
      const { pageSize = 6 } = options;
      
      // Get the original product
      const product = await this.getById(productId);
      if (!product) return [];
      
      // Find similar products by category
      const q = query(
        collection(db, 'products'),
        where('category', '==', product.category),
        where('__name__', '!=', productId)
      );
      
      const snapshot = await getDocs(q);
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return products.slice(0, pageSize);
    } catch (error) {
      console.error('Error getting similar products:', error);
      return [];
    }
  },

  // Get all categories
  async getCategories() {
    try {
      const q = query(
        collection(db, 'products'),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(q);
      const categories = new Set();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.category) {
          categories.add(data.category);
        }
      });
      
      return Array.from(categories).sort();
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },

  // Get delivery analytics
  async getAnalytics(partnerId, startDate, endDate) {
    try {
      // Try with date range filters (requires index)
      const q = query(
        collection(db, 'deliveries'),
        where('logisticsPartnerId', '==', partnerId),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate)
      );
      
      const snapshot = await getDocs(q);
      const deliveries = snapshot.docs.map(doc => doc.data());
      
      const analytics = {
        totalDeliveries: deliveries.length,
        completedDeliveries: deliveries.filter(d => d.status === 'delivered').length,
        pendingDeliveries: deliveries.filter(d => d.status === 'pending').length,
        inTransitDeliveries: deliveries.filter(d => d.status === 'in_transit').length,
        totalEarnings: deliveries
          .filter(d => d.status === 'delivered')
          .reduce((sum, d) => sum + (d.amount || 0), 0),
        averageDeliveryTime: this.calculateAverageDeliveryTime(deliveries)
      };
      
      return analytics;
    } catch (error) {
      // If index doesn't exist yet, try without date range and filter client-side
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.warn('Analytics index not ready yet, fetching without date filters and filtering client-side');
        try {
          const q = query(
            collection(db, 'deliveries'),
            where('logisticsPartnerId', '==', partnerId)
          );
          
          const snapshot = await getDocs(q);
          const allDeliveries = snapshot.docs.map(doc => doc.data());
          
          // Filter by date range client-side
          const deliveries = allDeliveries.filter(delivery => {
            const createdAt = delivery.createdAt?.toDate?.() || new Date(delivery.createdAt || 0);
            return createdAt >= startDate && createdAt <= endDate;
          });
          
          const analytics = {
            totalDeliveries: deliveries.length,
            completedDeliveries: deliveries.filter(d => d.status === 'delivered').length,
            pendingDeliveries: deliveries.filter(d => d.status === 'pending').length,
            inTransitDeliveries: deliveries.filter(d => d.status === 'in_transit').length,
            totalEarnings: deliveries
              .filter(d => d.status === 'delivered')
              .reduce((sum, d) => sum + (d.amount || 0), 0),
            averageDeliveryTime: this.calculateAverageDeliveryTime(deliveries)
          };
          
          return analytics;
        } catch (fallbackError) {
          console.error('Error fetching analytics (fallback):', fallbackError);
          // Return empty analytics instead of throwing
          return {
            totalDeliveries: 0,
            completedDeliveries: 0,
            pendingDeliveries: 0,
            inTransitDeliveries: 0,
            totalEarnings: 0,
            averageDeliveryTime: 0
          };
        }
      }
      console.error('Error fetching analytics:', error);
      throw error;
    }
  },

  calculateAverageDeliveryTime(deliveries) {
    const completedDeliveries = deliveries.filter(d => 
      d.status === 'delivered' && d.deliveredAt && d.createdAt
    );
    
    if (completedDeliveries.length === 0) return 0;
    
    const totalHours = completedDeliveries.reduce((sum, delivery) => {
      const created = delivery.createdAt.toDate();
      const delivered = delivery.deliveredAt.toDate();
      return sum + (delivered - created) / (1000 * 60 * 60); // Convert to hours
    }, 0);
    
    return totalHours / completedDeliveries.length;
  },

  // Get enhanced logistics partners with route analysis
  async getEnhancedLogisticsPartners(pickupLocation, deliveryLocation, deliveryData = {}) {
    try {
      // Get nearby logistics partners - DISABLED
      // const nearbyPartners = await googleMapsService.getNearbyLogisticsPartners(pickupLocation);
      const nearbyPartners = []; // Fallback to empty array
      
      // Calculate pricing for each partner
      const partnersWithPricing = await Promise.all(
        nearbyPartners.map(async (partner) => {
          try {
            const pricing = await this.calculateCostWithMaps(partner, {
              pickupLocation,
              deliveryLocation,
              ...deliveryData
            });
            
            // Safely access route analysis properties
            const routeAnalysis = pricing?.routeAnalysis || {};
            const duration = routeAnalysis.duration || {};
            const distance = routeAnalysis.distance || {};
            
            return {
              ...partner,
              pricing,
              estimatedDelivery: duration.text || 'Calculating...',
              routeType: routeAnalysis.routeType || 'standard',
              distance: distance.text || 'N/A'
            };
          } catch (error) {
            console.error(`Error calculating pricing for partner ${partner.id}:`, error);
            return {
              ...partner,
              pricing: { cost: 0, error: 'Pricing unavailable' },
              estimatedDelivery: 'N/A',
              routeType: 'unknown',
              distance: 'N/A'
            };
          }
        })
      );

      // Sort by cost and rating
      return partnersWithPricing.sort((a, b) => {
        if (a.pricing.error || b.pricing.error) return 0;
        const costA = a.pricing.cost;
        const costB = b.pricing.cost;
        const ratingA = a.rating || 0;
        const ratingB = b.rating || 0;
        
        // Primary sort by cost, secondary by rating
        if (costA !== costB) return costA - costB;
        return ratingB - ratingA;
      });
    } catch (error) {
      console.error('Error getting enhanced logistics partners:', error);
      throw error;
    }
  },

  // Create delivery with enhanced route analysis
  async createDeliveryWithAnalysis(deliveryData) {
    try {
      const {
        pickupLocation,
        deliveryLocation,
        orderId,
        buyerId,
        vendorId,
        logisticsPartnerId,
        ...otherData
      } = deliveryData;

      // Analyze route - DISABLED
      // const routeAnalysis = await googleMapsService.analyzeRouteType(pickupLocation, deliveryLocation);
      const routeAnalysis = { type: 'standard', difficulty: 'normal' }; // Fallback
      
      // Create delivery record with route analysis
      const docRef = await addDoc(collection(db, 'deliveries'), {
        ...otherData,
        orderId,
        buyerId,
        vendorId,
        logisticsPartnerId,
        pickupLocation,
        deliveryLocation,
        routeAnalysis: {
          routeType: routeAnalysis.routeType,
          distance: routeAnalysis.distance,
          duration: routeAnalysis.duration,
          isSameCity: routeAnalysis.isSameCity,
          isSameState: routeAnalysis.isSameState,
          distanceKm: routeAnalysis.distanceKm,
          pickupCoordinates: routeAnalysis.pickup,
          deliveryCoordinates: routeAnalysis.delivery
        },
        status: 'pending_pickup',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating delivery with analysis:', error);
      throw error;
    }
  },

  // Update delivery status with location tracking
  async updateDeliveryStatus(deliveryId, status, locationData = null) {
    try {
      const deliveryRef = doc(db, 'deliveries', deliveryId);
      const updateData = {
        status,
        updatedAt: serverTimestamp()
      };

      if (locationData) {
        updateData.currentLocation = locationData;
        updateData.lastLocationUpdate = serverTimestamp();
      }

      await updateDoc(deliveryRef, updateData);
      
      // Log status change
      await addDoc(collection(db, 'delivery_status_logs'), {
        deliveryId,
        status,
        location: locationData,
        timestamp: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error updating delivery status:', error);
      throw error;
    }
  }
};

// ===============================
// DELIVERIES OPERATIONS
// ===============================

export const deliveriesService = {
  // Create delivery
  async create(deliveryData) {
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
  async updateStatus(deliveryId, status, additionalData = {}) {
    try {
      const updateData = {
        status,
        updatedAt: serverTimestamp(),
        ...additionalData
      };
      
      const docRef = doc(db, 'deliveries', deliveryId);
      await updateDoc(docRef, updateData);
      
      return { success: true, deliveryId };
    } catch (error) {
      console.error('Error updating delivery status:', error);
      throw error;
    }
  },

  // Get deliveries by order
  async getByOrder(orderId) {
    try {
      const q = query(
        collection(db, 'deliveries'),
        where('orderId', '==', orderId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching deliveries by order:', error);
      throw error;
    }
  },

  // Get deliveries by logistics partner
  async getByPartner(partnerId) {
    try {
      const q = query(
        collection(db, 'deliveries'),
        where('logisticsPartnerId', '==', partnerId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching deliveries by partner:', error);
      throw error;
    }
  },

  // Add tracking event
  async addTrackingEvent(deliveryId, eventData) {
    try {
      const docRef = doc(db, 'deliveries', deliveryId);
      const trackingEvent = {
        ...eventData,
        timestamp: serverTimestamp()
      };
      
      await updateDoc(docRef, {
        trackingHistory: {
          ...eventData,
          timestamp: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error adding tracking event:', error);
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

      // Handle wallet transactions based on resolution
      if (refundAmount > 0) {
        // Refund buyer - create credit transaction for buyer
        const buyerRefundTransactionRef = doc(collection(db, 'wallet_transactions'));
        batch.set(buyerRefundTransactionRef, {
          userId: dispute.buyerId,
          orderId: dispute.orderId,
          type: 'dispute_refund',
          amount: refundAmount,
          description: `Dispute resolution refund: ${resolution}`,
          status: 'completed',
          disputeId,
          refundId,
          createdAt: serverTimestamp()
        });

        // Update buyer wallet balance
        const buyerWalletRef = doc(db, 'wallets', dispute.buyerId);
        batch.update(buyerWalletRef, {
          balance: increment(refundAmount),
          updatedAt: serverTimestamp()
        });

        // Debit vendor - create debit transaction for vendor
        const vendorDebitTransactionRef = doc(collection(db, 'wallet_transactions'));
        batch.set(vendorDebitTransactionRef, {
          userId: dispute.vendorId,
          orderId: dispute.orderId,
          type: 'dispute_penalty',
          amount: -refundAmount, // Negative amount for debit
          description: `Dispute resolution penalty: ${resolution}`,
          status: 'completed',
          disputeId,
          refundId,
          createdAt: serverTimestamp()
        });

        // Update vendor wallet balance (debit)
        const vendorWalletRef = doc(db, 'wallets', dispute.vendorId);
        batch.update(vendorWalletRef, {
          balance: increment(-refundAmount),
          updatedAt: serverTimestamp()
        });
      } else {
        // Favor vendor - release escrow to vendor
        const releaseAmount = dispute.totalAmount || dispute.disputedAmount || 0;
        const vendorReleaseTransactionRef = doc(collection(db, 'wallet_transactions'));
        batch.set(vendorReleaseTransactionRef, {
          userId: dispute.vendorId,
          orderId: dispute.orderId,
          type: 'dispute_release',
          amount: releaseAmount,
          description: `Dispute resolution - funds released to vendor: ${resolution}`,
          status: 'completed',
          disputeId,
          createdAt: serverTimestamp()
        });

        // Update vendor wallet balance (credit)
        const vendorWalletRef = doc(db, 'wallets', dispute.vendorId);
        batch.update(vendorWalletRef, {
          balance: increment(releaseAmount),
          updatedAt: serverTimestamp()
        });
      }

      // Create resolution transaction record
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
        disputeResolution: resolution,
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
  },

  // Get disputes by buyer
  async getByBuyer(buyerId) {
    try {
      const q = query(
        collection(db, 'disputes'),
        where('buyerId', '==', buyerId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching buyer disputes:', error);
      return [];
    }
  },

  // Get disputes by logistics
  async getByLogistics(logisticsId) {
    try {
      const q = query(
        collection(db, 'disputes'),
        where('logisticsCompanyId', '==', logisticsId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching logistics disputes:', error);
      return [];
    }
  },

  // Add response to dispute
  async addResponse(disputeId, response) {
    try {
      const disputeRef = doc(db, 'disputes', disputeId);
      const disputeDoc = await getDoc(disputeRef);
      
      if (!disputeDoc.exists()) {
        throw new Error('Dispute not found');
      }

      const currentResponses = disputeDoc.data().responses || [];
      await updateDoc(disputeRef, {
        responses: [...currentResponses, response],
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding dispute response:', error);
      throw error;
    }
  },

  // Get all disputes (admin)
  async getAll() {
    try {
      const q = query(
        collection(db, 'disputes'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching all disputes:', error);
      return [];
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

  // Alias for updateProfile for backward compatibility
  async update(userId, updates) {
    return this.updateProfile(userId, updates);
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
  },

  // Get all admin users
  async getAdmins() {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'admin')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching admins:', error);
      return [];
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
  },

  // Commission management functions
  async getCommissionSettings() {
    try {
      const settingsRef = doc(db, 'admin_settings', 'commission_settings');
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        return settingsDoc.data();
      } else {
        // Return default settings without trying to update non-existent document
        const defaultSettings = {
          platformCommissionRate: 5.0, // 5% platform commission
          minCommission: 0.50, // Minimum 50 kobo
          maxCommission: 1000.00, // Maximum 1000 naira
          lastUpdated: serverTimestamp()
        };
        
        // Create the document with default settings
        await setDoc(settingsRef, defaultSettings);
        return defaultSettings;
      }
    } catch (error) {
      console.error('Error fetching commission settings:', error);
      // Return default settings on error
      return {
        platformCommissionRate: 5.0,
        minCommission: 0.50,
        maxCommission: 1000.00,
        lastUpdated: new Date()
      };
    }
  },

  async updateCommissionSettings(newSettings) {
    try {
      const settingsRef = doc(db, 'admin_settings', 'commission_settings');
      
      // Check if document exists first
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        await updateDoc(settingsRef, {
          ...newSettings,
          lastUpdated: serverTimestamp()
        });
      } else {
        // Create document if it doesn't exist
        await setDoc(settingsRef, {
          ...newSettings,
          lastUpdated: serverTimestamp()
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error updating commission settings:', error);
      throw error;
    }
  },

  async getCommissionHistory({ pageSize = 50, cursor = null } = {}) {
    try {
      let q = query(
        collection(db, 'commission_history'),
        orderBy('createdAt', 'desc'),
        fsLimit(pageSize)
      );

      if (cursor) {
        q = query(q, startAfter(cursor));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching commission history:', error);
      // Return empty array on permission error instead of throwing
      if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
        console.warn('Permission denied - user may not be admin');
        return [];
      }
      throw error;
    }
  },

  async recordCommissionTransaction(transactionData) {
    try {
      const commissionRef = collection(db, 'commission_history');
      await addDoc(commissionRef, {
        ...transactionData,
        createdAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error recording commission transaction:', error);
      throw error;
    }
  },

  // Featured product management
  async setProductFeatured(productId, isFeatured) {
    try {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        isFeatured: isFeatured,
        featuredAt: isFeatured ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating product featured status:', error);
      throw error;
    }
  },

  async getFeaturedProducts() {
    try {
      // First get all products that are featured
      const q = query(
        collection(db, 'products'),
        where('isFeatured', '==', true)
      );
      
      const snapshot = await getDocs(q);
      let products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter for active products and sort by featuredAt
      products = products
        .filter(product => product.status === 'active')
        .sort((a, b) => {
          const aTime = a.featuredAt?.seconds || 0;
          const bTime = b.featuredAt?.seconds || 0;
          return bTime - aTime; // Most recent first
        });
      
      return products;
    } catch (error) {
      console.error('Error fetching featured products:', error);
      // Return empty array on error instead of throwing
      return [];
    }
  }
};

// ===============================
// NOTIFICATIONS OPERATIONS
// ===============================

export const notifications = {
  // Create notification
  async create(notificationData) {
    try {
      const docRef = await addDoc(collection(db, 'notifications'), {
        ...notificationData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...notificationData
      };
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  // Get notifications for a specific user
  async getByUser(userId, options = {}) {
    try {
      const { limit = 50, orderBy: orderByField = 'createdAt', orderDirection = 'desc' } = options;
      
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy(orderByField, orderDirection)
      );
      
      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return limit ? notifications.slice(0, limit) : notifications;
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  },

  // Listen to real-time notifications for a user
  listenToUserNotifications(userId, callback, options = {}) {
    try {
      const { limit = 50, orderBy: orderByField = 'createdAt', orderDirection = 'desc' } = options;
      
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy(orderByField, orderDirection)
      );
      
      return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        const limitedNotifications = limit ? notifications.slice(0, limit) : notifications;
        callback(limitedNotifications);
      });
    } catch (error) {
      console.error('Error setting up notifications listener:', error);
      throw error;
    }
  },

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const batch = [];
      
      snapshot.docs.forEach(doc => {
        batch.push(updateDoc(doc.ref, {
          read: true,
          readAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }));
      });
      
      await Promise.all(batch);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  // Delete notification
  async delete(notificationId) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await deleteDoc(notificationRef);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  // Create order notification
  async createOrderNotification(orderData, eventType) {
    try {
      const notificationTypes = {
        'order_placed': {
          title: 'Order Placed Successfully',
          message: `Your order #${orderData.id} has been placed and payment is being processed.`,
          type: 'success',
          icon: '📦'
        },
        'payment_processed': {
          title: 'Payment Processed',
          message: `Payment for order #${orderData.id} has been processed. Funds are held in escrow.`,
          type: 'info',
          icon: '💰'
        },
        'order_shipped': {
          title: 'Order Shipped',
          message: `Your order #${orderData.id} has been shipped. Track your delivery.`,
          type: 'info',
          icon: '🚚'
        },
        'order_delivered': {
          title: 'Order Delivered',
          message: `Your order #${orderData.id} has been delivered. Please confirm receipt.`,
          type: 'success',
          icon: '✅'
        },
        'order_completed': {
          title: 'Order Completed',
          message: `Order #${orderData.id} has been completed. Thank you for your business!`,
          type: 'success',
          icon: '🎉'
        },
        'order_cancelled': {
          title: 'Order Cancelled',
          message: `Order #${orderData.id} has been cancelled. Refund will be processed.`,
          type: 'warning',
          icon: '❌'
        },
        'dispute_created': {
          title: 'Dispute Created',
          message: `A dispute has been created for order #${orderData.id}. We'll review and resolve it.`,
          type: 'warning',
          icon: '⚖️'
        },
        'dispute_resolved': {
          title: 'Dispute Resolved',
          message: `The dispute for order #${orderData.id} has been resolved.`,
          type: 'info',
          icon: '✅'
        }
      };

      const notificationConfig = notificationTypes[eventType];
      if (!notificationConfig) {
        throw new Error(`Unknown notification type: ${eventType}`);
      }

      return await this.create({
        userId: orderData.buyerId,
        title: notificationConfig.title,
        message: notificationConfig.message,
        type: notificationConfig.type,
        icon: notificationConfig.icon,
        orderId: orderData.id,
        orderStatus: orderData.status,
        read: false,
        priority: 'normal'
      });
    } catch (error) {
      console.error('Error creating order notification:', error);
      throw error;
    }
  },

  // Create vendor notification
  async createVendorNotification(vendorId, eventType, orderData) {
    try {
      const notificationTypes = {
        'new_order': {
          title: 'New Order Received',
          message: `You have received a new order #${orderData.id} for ₦${orderData.totalAmount.toLocaleString()}.`,
          type: 'info',
          icon: '🛒'
        },
        'payment_released': {
          title: 'Payment Released',
          message: `Payment for order #${orderData.id} has been released to your wallet.`,
          type: 'success',
          icon: '💰'
        },
        'dispute_created': {
          title: 'Dispute Created',
          message: `A dispute has been created for order #${orderData.id}. Please respond.`,
          type: 'warning',
          icon: '⚖️'
        },
        'dispute_resolved': {
          title: 'Dispute Resolved',
          message: `The dispute for order #${orderData.id} has been resolved.`,
          type: 'info',
          icon: '✅'
        }
      };

      const notificationConfig = notificationTypes[eventType];
      if (!notificationConfig) {
        throw new Error(`Unknown notification type: ${eventType}`);
      }

      return await this.create({
        userId: vendorId,
        title: notificationConfig.title,
        message: notificationConfig.message,
        type: notificationConfig.type,
        icon: notificationConfig.icon,
        orderId: orderData.id,
        orderStatus: orderData.status,
        read: false,
        priority: 'normal'
      });
    } catch (error) {
      console.error('Error creating vendor notification:', error);
      throw error;
    }
  }
};

// ===============================
// MESSAGING OPERATIONS
// ===============================

export const messagingService = {
  // Create a new conversation
  async createConversation(conversationData) {
    try {
      const docRef = await addDoc(collection(db, 'conversations'), {
        ...conversationData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadCount: 0
      });
      
      return {
        id: docRef.id,
        ...conversationData
      };
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  },

  // Get user's conversations
  async getUserConversations(userId) {
    try {
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching user conversations:', error);
      throw error;
    }
  },

  // Listen to user's conversations in real-time
  listenToUserConversations(userId, callback) {
    try {
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
      );
      
      return onSnapshot(q, (snapshot) => {
        const conversations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(conversations);
      });
    } catch (error) {
      console.error('Error setting up conversations listener:', error);
      throw error;
    }
  },

  // Send a message
  async sendMessage(messageData) {
    try {
      const docRef = await addDoc(collection(db, 'messages'), {
        ...messageData,
        timestamp: serverTimestamp(),
        read: false
      });
      
      // Update conversation's last message and timestamp
      await updateDoc(doc(db, 'conversations', messageData.conversationId), {
        lastMessage: {
          content: messageData.content,
          type: messageData.type,
          senderId: messageData.senderId,
          timestamp: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...messageData
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Get messages for a conversation
  async getConversationMessages(conversationId, options = {}) {
    try {
      const { limit: messageLimit = 50, orderBy: orderByField = 'timestamp', orderDirection = 'desc' } = options;
      
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        orderBy(orderByField, orderDirection),
        fsLimit(messageLimit)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      throw error;
    }
  },

  // Listen to messages in real-time
  listenToMessages(conversationId, callback, options = {}) {
    try {
      const { limit: messageLimit = 50, orderBy: orderByField = 'timestamp', orderDirection = 'desc' } = options;
      
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        orderBy(orderByField, orderDirection),
        fsLimit(messageLimit)
      );
      
      return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(messages);
      });
    } catch (error) {
      console.error('Error setting up messages listener:', error);
      throw error;
    }
  },

  // Mark conversation as read
  async markAsRead(conversationId, userId) {
    try {
      // Update unread count for the user
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        [`unreadCount.${userId}`]: 0,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  },

  // Get or create conversation between two users
  async getOrCreateConversation(userId1, userId2, orderId = null) {
    try {
      // First, try to find existing conversation
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId1)
      );
      
      const snapshot = await getDocs(q);
      const existingConversation = snapshot.docs.find(doc => {
        const data = doc.data();
        return data.participants.includes(userId2);
      });
      
      if (existingConversation) {
        return {
          id: existingConversation.id,
          ...existingConversation.data()
        };
      }
      
      // Create new conversation if none exists
      return await this.createConversation({
        participants: [userId1, userId2],
        orderId,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error getting or creating conversation:', error);
      throw error;
    }
  },

  // Send file attachment
  async sendFileMessage(conversationId, file, senderId) {
    try {
      // Upload file to Firebase Storage
      const fileName = `messages/${conversationId}/${Date.now()}-${file.name}`;
      const downloadURL = await firebaseService.storage.uploadFile(file, fileName);
      
      // Create message with file attachment
      return await this.sendMessage({
        conversationId,
        senderId,
        content: downloadURL,
        type: file.type.startsWith('image/') ? 'image' : 
              file.type.startsWith('video/') ? 'video' : 'file',
        fileName: file.name,
        fileSize: file.size,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending file message:', error);
      throw error;
    }
  }
};

// ===============================
// AUTHENTICATION & SECURITY OPERATIONS
// ===============================

export const authService = {
  // Generate 2FA secret
  async generate2FASecret(userId) {
    try {
      // In a real implementation, this would call a Cloud Function
      // For now, we'll simulate the response
      const secret = Math.random().toString(36).substring(2, 15);
      const qrCode = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
      
      return {
        secret,
        qrCode,
        backupCodes: Array.from({ length: 10 }, () => 
          Math.random().toString(36).substring(2, 8).toUpperCase()
        )
      };
    } catch (error) {
      console.error('Error generating 2FA secret:', error);
      throw error;
    }
  },

  // Verify 2FA code
  async verify2FACode(userId, code, secret) {
    try {
      // In a real implementation, this would verify the TOTP code
      // For demo purposes, we'll accept any 6-digit code
      const isValid = /^\d{6}$/.test(code);
      
      if (isValid) {
        // Update user's 2FA status
        await updateDoc(doc(db, 'users', userId), {
          twoFactorEnabled: true,
          twoFactorSecret: secret,
          twoFactorEnabledAt: serverTimestamp()
        });
      }
      
      return {
        valid: isValid,
        backupCodes: isValid ? Array.from({ length: 10 }, () => 
          Math.random().toString(36).substring(2, 8).toUpperCase()
        ) : []
      };
    } catch (error) {
      console.error('Error verifying 2FA code:', error);
      throw error;
    }
  },

  // Disable 2FA
  async disable2FA(userId, password) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorDisabledAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw error;
    }
  }
};

// ===============================
// FRAUD DETECTION OPERATIONS
// ===============================

export const fraudService = {
  // Analyze order for fraud
  async analyzeOrder(orderData) {
    try {
      const { amount, buyerId, vendorId, paymentMethod } = orderData;
      let riskScore = 0;
      const alerts = [];

      // Check for high-value transactions
      if (amount > 100000) {
        riskScore += 20;
        alerts.push({
          message: 'High-value transaction detected',
          severity: 'medium',
          recommendation: 'Verify buyer identity'
        });
      }

      // Check for rapid transactions
      const recentOrders = await this.getRecentOrders(buyerId, 1); // Last hour
      if (recentOrders.length > 5) {
        riskScore += 30;
        alerts.push({
          message: 'Multiple transactions in short time',
          severity: 'high',
          recommendation: 'Review transaction pattern'
        });
      }

      // Check for new user
      const userAge = await this.getUserAccountAge(buyerId);
      if (userAge < 24) { // Less than 24 hours
        riskScore += 25;
        alerts.push({
          message: 'New user account',
          severity: 'medium',
          recommendation: 'Verify account details'
        });
      }

      // Check for unusual payment method
      if (paymentMethod === 'crypto' || paymentMethod === 'bank_transfer') {
        riskScore += 15;
        alerts.push({
          message: 'Unusual payment method',
          severity: 'low',
          recommendation: 'Monitor transaction'
        });
      }

      // Check for geographic anomalies
      const locationRisk = await this.checkLocationRisk(buyerId, vendorId);
      if (locationRisk > 50) {
        riskScore += locationRisk;
        alerts.push({
          message: 'Geographic risk detected',
          severity: 'high',
          recommendation: 'Verify location'
        });
      }

      return {
        riskScore: Math.min(riskScore, 100),
        alerts,
        recommendations: this.getRecommendations(riskScore)
      };
    } catch (error) {
      console.error('Error analyzing order for fraud:', error);
      throw error;
    }
  },

  // Get recent orders for a user
  async getRecentOrders(userId, hours = 1) {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const q = query(
        collection(db, 'orders'),
        where('buyerId', '==', userId),
        where('createdAt', '>=', cutoffTime)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting recent orders:', error);
      return [];
    }
  },

  // Get user account age
  async getUserAccountAge(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const createdAt = userDoc.data().createdAt;
        const now = new Date();
        const ageInHours = (now - createdAt.toDate()) / (1000 * 60 * 60);
        return ageInHours;
      }
      return 0;
    } catch (error) {
      console.error('Error getting user account age:', error);
      return 0;
    }
  },

  // Check location risk
  async checkLocationRisk(buyerId, vendorId) {
    try {
      // In a real implementation, this would check IP geolocation
      // For demo purposes, we'll return a random risk score
      return Math.random() * 30;
    } catch (error) {
      console.error('Error checking location risk:', error);
      return 0;
    }
  },

  // Get fraud prevention recommendations
  getRecommendations(riskScore) {
    const recommendations = [];
    
    if (riskScore > 70) {
      recommendations.push('Manual review required');
      recommendations.push('Verify buyer identity');
      recommendations.push('Check payment method');
    } else if (riskScore > 40) {
      recommendations.push('Monitor transaction closely');
      recommendations.push('Verify order details');
    } else {
      recommendations.push('Standard processing');
    }
    
    return recommendations;
  },

  // Flag order for review
  async flagOrder(orderId, flagType) {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        fraudFlag: flagType,
        fraudFlaggedAt: serverTimestamp(),
        fraudFlaggedBy: 'system'
      });
      return { success: true };
    } catch (error) {
      console.error('Error flagging order:', error);
      throw error;
    }
  }
};

// ===============================
// SUBSCRIPTION SERVICE
// ===============================

export const subscriptionService = {
  // Create subscription
  async create(subscriptionData) {
    try {
      const docRef = await addDoc(collection(db, 'subscriptions'), {
        ...subscriptionData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  },

  // Get user subscription
  async getByUser(userId) {
    try {
      const q = query(
        collection(db, 'subscriptions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        fsLimit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      return null;
    }
  },

  // Update subscription
  async update(subscriptionId, updates) {
    try {
      const docRef = doc(db, 'subscriptions', subscriptionId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  },

  // Cancel subscription
  async cancel(subscriptionId) {
    try {
      const docRef = doc(db, 'subscriptions', subscriptionId);
      await updateDoc(docRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }
};

// ===============================
// REVIEWS SERVICE
// ===============================

export const reviewsService = {
  // Create a review
  async create(reviewData) {
    try {
      const docRef = await addDoc(collection(db, 'reviews'), {
        ...reviewData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        helpful: 0,
        reported: false
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  },

  // Get reviews for a product
  async getByProduct(productId) {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('productId', '==', productId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching product reviews:', error);
      return [];
    }
  },

  // Get reviews for a vendor
  async getByVendor(vendorId) {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('vendorId', '==', vendorId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching vendor reviews:', error);
      return [];
    }
  },

  // Get reviews by user
  async getByUser(userId) {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching user reviews:', error);
      return [];
    }
  },

  // Mark review as helpful
  async markHelpful(reviewId) {
    try {
      const reviewRef = doc(db, 'reviews', reviewId);
      const reviewDoc = await getDoc(reviewRef);
      if (reviewDoc.exists()) {
        await updateDoc(reviewRef, {
          helpful: (reviewDoc.data().helpful || 0) + 1,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error marking review as helpful:', error);
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
  stores: storeService,
  tracking: trackingLookupService,
  users: userService,
  analytics: analyticsService,
  payouts: payoutsService,
  admin: adminService,
  deliveries: deliveriesService,
  notifications: notifications,
  messaging: messagingService,
  auth: authService,
  fraud: fraudService,
  reviews: reviewsService,
  subscriptions: subscriptionService
};

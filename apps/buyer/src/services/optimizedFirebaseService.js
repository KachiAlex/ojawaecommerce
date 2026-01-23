import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  doc, 
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Cache for frequently accessed data
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache management
const isCacheValid = (timestamp) => {
  return Date.now() - timestamp < CACHE_DURATION;
};

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// Optimized product fetching with caching
export const getProductsOptimized = async (filters = {}, options = {}) => {
  const cacheKey = `products_${JSON.stringify(filters)}_${JSON.stringify(options)}`;
  
  // Check cache first
  const cached = getCachedData(cacheKey);
  if (cached) {
    console.log('🚀 Using cached products data');
    return cached;
  }

  try {
    const { pageSize = 12, lastDoc = null, category = null, searchTerm = null } = options;
    
    let q = query(collection(db, 'products'));
    
    // Apply filters efficiently
    if (category) {
      q = query(q, where('category', '==', category));
    }
    
    if (searchTerm) {
      // Use array-contains for better performance than text search
      q = query(q, where('searchKeywords', 'array-contains', searchTerm.toLowerCase()));
    }
    
    // Always filter for approved products
    q = query(q, where('status', '==', 'approved'));
    
    // Order by creation date for consistent pagination
    q = query(q, orderBy('createdAt', 'desc'));
    
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    q = query(q, limit(pageSize));
    
    const snapshot = await getDocs(q);
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const result = {
      products,
      lastDoc: snapshot.docs[snapshot.docs.length - 1],
      hasMore: snapshot.docs.length === pageSize
    };
    
    // Cache the result
    setCachedData(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

// Optimized store fetching
export const getStoreOptimized = async (storeSlug) => {
  const cacheKey = `store_${storeSlug}`;
  
  const cached = getCachedData(cacheKey);
  if (cached) {
    console.log('🚀 Using cached store data');
    return cached;
  }

  try {
    const storesRef = collection(db, 'stores');
    const snapshot = await getDocs(storesRef);
    
    let foundStore = null;
    for (const doc of snapshot.docs) {
      const storeData = { id: doc.id, ...doc.data() };
      const storeName = storeData.name || storeData.storeName || '';
      const slug = storeName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      
      if (slug === storeSlug) {
        foundStore = storeData;
        break;
      }
    }
    
    if (foundStore) {
      setCachedData(cacheKey, foundStore);
    }
    
    return foundStore;
  } catch (error) {
    console.error('Error fetching store:', error);
    throw error;
  }
};

// Optimized vendor data fetching with minimal initial load
export const getVendorDataOptimized = async (vendorId, dataType = 'overview') => {
  const cacheKey = `vendor_${vendorId}_${dataType}`;
  
  const cached = getCachedData(cacheKey);
  if (cached) {
    console.log('🚀 Using cached vendor data');
    return cached;
  }

  try {
    let result = {};
    
    switch (dataType) {
      case 'overview': {
        const [ordersCount, productsCount, statsData] = await Promise.all([
          getOrdersCount(vendorId),
          getProductsCount(vendorId),
          getVendorStats(vendorId)
        ]);
        result = {
          ordersCount,
          productsCount,
          stats: statsData
        };
        break;
      }
      case 'orders': {
        result = await getOrdersByVendor(vendorId, { pageSize: 10 });
        break;
      }
      case 'products': {
        result = await getProductsByVendor(vendorId, { pageSize: 10 });
        break;
      }
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }
    
    setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching vendor data:', error);
    throw error;
  }
};

// Helper functions for optimized queries
const getOrdersCount = async (vendorId) => {
  const q = query(
    collection(db, 'orders'),
    where('vendorId', '==', vendorId)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
};

const getProductsCount = async (vendorId) => {
  // Count all products for vendor regardless of status (dashboard should show all)
  try {
    // 1) Primary: by vendorId
    const idQuery = query(
      collection(db, 'products'),
      where('vendorId', '==', vendorId)
    );
    const idSnap = await getDocs(idQuery);
    if (idSnap.size > 0) return idSnap.size;

    // 2) Fallback: by vendor email (some older products saved with vendorEmail only)
    try {
      const userSnap = await getDoc(doc(db, 'users', vendorId));
      const email = userSnap.exists() ? (userSnap.data()?.email || '').toLowerCase() : '';
      if (email) {
        const emailQuery = query(
          collection(db, 'products'),
          where('vendorEmail', '==', email)
        );
        const emailSnap = await getDocs(emailQuery);
        if (emailSnap.size > 0) return emailSnap.size;
      }
    } catch (error) {
      console.warn('Unable to fetch vendor email for product count fallback:', error);
    }

    return 0;
  } catch (err) {
    console.warn('getProductsCount fallback counting failed:', err);
    return 0;
  }
};

const getVendorStats = async (vendorId) => {
  // This would typically involve aggregation queries
  // For now, return basic stats
  return {
    vendorId,
    totalSales: 0,
    activeOrders: 0,
    totalProducts: 0
  };
};

const getOrdersByVendor = async (vendorId, options = {}) => {
  const { pageSize = 10, lastDoc = null } = options;
  
  let q = query(
    collection(db, 'orders'),
    where('vendorId', '==', vendorId),
    orderBy('createdAt', 'desc')
  );
  
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }
  
  q = query(q, limit(pageSize));
  
  const snapshot = await getDocs(q);
  const orders = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  return {
    orders,
    lastDoc: snapshot.docs[snapshot.docs.length - 1],
    hasMore: snapshot.docs.length === pageSize
  };
};

const getProductsByVendor = async (vendorId, options = {}) => {
  const { pageSize = 10, lastDoc = null } = options;
  
  // Query all products for vendor regardless of status (vendor dashboard should show all)
  let q = query(
    collection(db, 'products'),
    where('vendorId', '==', vendorId),
    orderBy('createdAt', 'desc')
  );
  
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }
  
  q = query(q, limit(pageSize));
  
  try {
    const snapshot = await getDocs(q);
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return {
      products,
      lastDoc: snapshot.docs[snapshot.docs.length - 1],
      hasMore: snapshot.docs.length === pageSize
    };
  } catch (error) {
    console.error('Error fetching vendor products:', error);
    // If query fails (e.g., missing index), try without orderBy
    console.warn('Falling back to query without orderBy');
    let fallbackQ = query(
      collection(db, 'products'),
      where('vendorId', '==', vendorId)
    );
    if (lastDoc) {
      // Can't use startAfter without orderBy, so fetch all and paginate client-side
      const allSnapshot = await getDocs(fallbackQ);
      const allProducts = allSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      const startIdx = lastDoc ? allProducts.findIndex(p => p.id === lastDoc.id) + 1 : 0;
      const products = allProducts.slice(startIdx, startIdx + pageSize);
      return {
        products,
        lastDoc: products.length === pageSize ? products[products.length - 1] : null,
        hasMore: products.length === pageSize
      };
    } else {
      const snapshot = await getDocs(fallbackQ);
      const allProducts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      const products = allProducts.slice(0, pageSize);
      return {
        products,
        lastDoc: products.length === pageSize ? products[products.length - 1] : null,
        hasMore: products.length === pageSize
      };
    }
  }
};

// Clear cache when needed
export const clearCache = (pattern = null) => {
  if (pattern) {
    for (const [key] of cache) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
  console.log('🗑️ Cache cleared');
};

export default {
  getProductsOptimized,
  getStoreOptimized,
  getVendorDataOptimized,
  clearCache
};

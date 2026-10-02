// REST-backed optimized data helpers with in-memory caching
// Replaces previous Firestore-based implementation so frontend talks to Render `/api/*` endpoints.

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

const isCacheValid = (ts) => Date.now() - ts < CACHE_DURATION;
const getCached = (key) => {
  const v = cache.get(key);
  if (!v) return null;
  if (!isCacheValid(v.ts)) {
    cache.delete(key);
    return null;
  }
  return v.data;
};
const setCached = (key, data) => cache.set(key, { data, ts: Date.now() });

const getBaseUrl = () => {
  if (typeof window === 'undefined') return '';
  return import.meta.env.PROD
    ? (import.meta.env.VITE_API_BASE_URL || window.location.origin)
    : window.location.origin;
};

const api = {
  async request(path, opts = {}) {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('authToken') : null;
    const fullPath = path.startsWith('http') ? path : `${getBaseUrl()}${path}`;
    const res = await fetch(fullPath + (opts.qs || ''), {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {})
      },
      ...opts,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`API ${path} failed: ${res.status} ${res.statusText} ${text}`);
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return null;
    const ct = res.headers.get('content-type') || '';
    return ct.includes('application/json') ? res.json() : res.text();
  }
};

export const getProductsOptimized = async (filters = {}, options = {}) => {
  const cacheKey = `products_${JSON.stringify(filters)}_${JSON.stringify(options)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const { pageSize = 12, lastId = null, category = null, searchTerm = null } = options;
  const params = new URLSearchParams({ pageSize });
  if (category) params.set('category', category);
  if (searchTerm) params.set('search', searchTerm);
  if (lastId) params.set('lastId', lastId);

  const res = await api.request(`/api/products?${params.toString()}`);
  const result = {
    products: res.items || res.products || [],
    lastId: res.lastId || null,
    hasMore: !!res.hasMore
  };
  setCached(cacheKey, result);
  return result;
};

export const getStoreOptimized = async (storeSlug) => {
  const cacheKey = `store_${storeSlug}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const res = await api.request(`/api/stores?slug=${encodeURIComponent(storeSlug)}`);
  const stores = Array.isArray(res) ? res : (res?.stores || res?.data?.stores || []);
  const store = stores[0] || null;
  if (store) setCached(cacheKey, store);
  return store;
};

export const getStorefrontOptimized = async (storeSlug) => {
  const res = await api.request(`/api/stores/${encodeURIComponent(storeSlug)}/products`);
  return {
    store: res?.store || res?.data?.store || null,
    products: res?.products || res?.data?.products || []
  };
};

export const getVendorDataOptimized = async (vendorId, dataType = 'overview') => {
  const cacheKey = `vendor_${vendorId}_${dataType}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let result = null;
  switch (dataType) {
    case 'overview': {
      // Use existing backend routes to build overview
      const [ordersRes, productsRes] = await Promise.all([
        api.request(`/api/users/${encodeURIComponent(vendorId)}/orders?type=vendor&limit=1`).catch(() => ({ items: [] })),
        api.request(`/api/products?vendorId=${encodeURIComponent(vendorId)}&limit=1`).catch(() => ({ data: { products: [] } }))
      ]);
      const ordersCount = ordersRes.items?.length ?? 0;
      const productsCount = productsRes.data?.products?.length ?? 0;
      result = {
        stats: { revenue: 0, orders: ordersCount, products: productsCount },
        ordersCount,
        productsCount
      };
      break;
    }
    case 'orders': {
      const ordersRes = await api.request(`/api/users/${encodeURIComponent(vendorId)}/orders?type=vendor&limit=10`);
      result = { orders: ordersRes.items || [] };
      break;
    }
    case 'products': {
      const productsRes = await api.request(`/api/products?vendorId=${encodeURIComponent(vendorId)}&limit=10`);
      result = { products: productsRes.data?.products || [] };
      break;
    }
    default:
      throw new Error(`Unknown data type: ${dataType}`);
  }

  setCached(cacheKey, result);
  return result;
};

export const clearCache = (pattern = null) => {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const k of Array.from(cache.keys())) {
    if (k.includes(pattern)) cache.delete(k);
  }
};

export default {
  getProductsOptimized,
  getStoreOptimized,
  getVendorDataOptimized,
  clearCache,
};

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

const api = {
  async request(path, opts = {}) {
    const res = await fetch(path + (opts.qs || ''), {
      credentials: 'include',
      headers: { Accept: 'application/json', ...(opts.headers || {}) },
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
  const store = Array.isArray(res) ? res[0] || null : res || null;
  if (store) setCached(cacheKey, store);
  return store;
};

export const getVendorDataOptimized = async (vendorId, dataType = 'overview') => {
  const cacheKey = `vendor_${vendorId}_${dataType}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let result = null;
  switch (dataType) {
    case 'overview': {
      // backend should provide aggregated overview
      result = await api.request(`/api/vendors/${encodeURIComponent(vendorId)}/overview`);
      break;
    }
    case 'orders': {
      result = await api.request(`/api/vendors/${encodeURIComponent(vendorId)}/orders?limit=10`);
      break;
    }
    case 'products': {
      result = await api.request(`/api/vendors/${encodeURIComponent(vendorId)}/products?limit=10`);
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

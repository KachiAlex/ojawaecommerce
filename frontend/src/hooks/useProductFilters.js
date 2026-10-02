import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productService } from '../services/products';

const DEFAULT_FILTERS = {
  search: '',
  category: 'all',
  brand: 'all',
  minPrice: '',
  maxPrice: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
};

const SORT_MAP = {
  relevance: { sortBy: 'createdAt', sortOrder: 'desc' },
  'price-low': { sortBy: 'price', sortOrder: 'asc' },
  'price-high': { sortBy: 'price', sortOrder: 'desc' },
  rating: { sortBy: 'rating', sortOrder: 'desc' },
  newest: { sortBy: 'createdAt', sortOrder: 'desc' },
  popular: { sortBy: 'name', sortOrder: 'asc' },
};

export function useProductFilters(config = {}) {
  const defaultLimit = config.limit || 20;
  const syncURL = config.syncURL !== false;
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ categories: [], brands: [], priceRange: { min: 0, max: 10000000 } });
  const [filters, setFilters] = useState(() => readFiltersFromURL(searchParams));
  const [sortKey, setSortKey] = useState(() => searchParams.get('sort') || 'relevance');
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  function readFiltersFromURL(params) {
    return {
      search: params.get('q') || '',
      category: params.get('category') || 'all',
      brand: params.get('brand') || 'all',
      minPrice: params.get('minPrice') || '',
      maxPrice: params.get('maxPrice') || '',
      page: parseInt(params.get('page')) || 1,
      limit: parseInt(params.get('limit')) || defaultLimit,
    };
  }

  function writeFiltersToURL(currentFilters, currentSortKey) {
    if (!syncURL) return;
    const params = new URLSearchParams();
    if (currentFilters.search) params.set('q', currentFilters.search);
    if (currentFilters.category !== 'all') params.set('category', currentFilters.category);
    if (currentFilters.brand !== 'all') params.set('brand', currentFilters.brand);
    if (currentFilters.minPrice) params.set('minPrice', currentFilters.minPrice);
    if (currentFilters.maxPrice) params.set('maxPrice', currentFilters.maxPrice);
    if (currentSortKey !== 'relevance') params.set('sort', currentSortKey);
    if (currentFilters.page > 1) params.set('page', String(currentFilters.page));
    setSearchParams(params, { replace: true });
  }

  const fetchProducts = useCallback(async (currentFilters, currentSortKey) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const sortConfig = SORT_MAP[currentSortKey] || SORT_MAP.relevance;
      const apiParams = {
        page: currentFilters.page || 1,
        limit: currentFilters.limit || 20,
        sortBy: sortConfig.sortBy,
        sortOrder: sortConfig.sortOrder,
      };
      if (currentFilters.search) apiParams.search = currentFilters.search;
      if (currentFilters.category !== 'all') apiParams.category = currentFilters.category;
      if (currentFilters.brand !== 'all') apiParams.brand = currentFilters.brand;
      if (currentFilters.minPrice) apiParams.minPrice = currentFilters.minPrice;
      if (currentFilters.maxPrice) apiParams.maxPrice = currentFilters.maxPrice;

      const { products: items, pagination: pg } = await productService.getProductsPaged(apiParams);
      if (!controller.signal.aborted) {
        setProducts(items);
        setPagination(pg);
      }
    } catch (err) {
      if (err.name !== 'AbortError' && !controller.signal.aborted) {
        console.error('Error fetching products:', err);
        setError(err.message || 'Failed to load products');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const fetchMeta = useCallback(async () => {
    try {
      const data = await productService.getMeta();
      setMeta(data);
    } catch (err) {
      console.error('Error fetching product meta:', err);
    }
  }, []);

  // Fetch meta once on mount
  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  // Debounced fetch + URL sync when filters or sort change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      writeFiltersToURL(filters, sortKey);
      fetchProducts(filters, sortKey);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, sortKey, fetchProducts]);

  // Sync from URL on browser back/forward
  useEffect(() => {
    if (!syncURL) return;
    const urlFilters = readFiltersFromURL(searchParams);
    const urlSort = searchParams.get('sort') || 'relevance';
    setFilters(prev => {
      if (JSON.stringify(prev) === JSON.stringify({ ...DEFAULT_FILTERS, ...urlFilters })) return prev;
      return { ...DEFAULT_FILTERS, ...urlFilters };
    });
    setSortKey(prev => prev === urlSort ? prev : urlSort);
  }, [searchParams, syncURL]);

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: key === 'page' ? value : 1 }));
  }, []);

  const updateSort = useCallback((key) => {
    setSortKey(key);
  }, []);

  const loadMore = useCallback(() => {
    if (pagination?.hasNextPage) {
      setFilters(prev => ({ ...prev, page: prev.page + 1 }));
    }
  }, [pagination]);

  const clearFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS, limit: defaultLimit });
    setSortKey('relevance');
  }, [defaultLimit]);

  const hasActiveFilters =
    filters.search ||
    filters.category !== 'all' ||
    filters.brand !== 'all' ||
    filters.minPrice ||
    filters.maxPrice ||
    sortKey !== 'relevance';

  return {
    products,
    pagination,
    loading,
    error,
    meta,
    filters,
    sortKey,
    hasActiveFilters: !!hasActiveFilters,
    updateFilter,
    updateSort,
    loadMore,
    clearFilters,
    refetch: () => fetchProducts(filters, sortKey),
  };
}

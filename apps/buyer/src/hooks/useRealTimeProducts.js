import { useState, useEffect, useMemo } from 'react';
import { errorLogger } from '../utils/errorLogger';
import { usePageVisibility } from './usePageVisibility';

const api = {
  async request(path, options = {}) {
    const res = await fetch(path, {
      credentials: 'include',
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      ...options,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`Products API ${path} failed: ${res.status} ${res.statusText} ${text}`);
      err.status = res.status;
      throw err;
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res.text();
  }
};

export const useRealTimeProducts = (filters = {}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isPageVisible = usePageVisibility();

  const {
    category,
    vendorId,
    status,
    showActiveOnly,
    limit: limitCount = 50
  } = filters;

  useEffect(() => {
    let stopped = false;
    let intervalId = null;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (category && category !== 'all') params.append('category', category);
        if (vendorId) params.append('vendorId', vendorId);
        if (status && status !== 'all') params.append('status', status);
        else if (showActiveOnly === true) params.append('status', 'active');
        if (limitCount) params.append('limit', String(limitCount));

        const res = await api.request(`/api/products?${params.toString()}`);
        const items = (res.items || res || []).map(item => ({
          ...item,
          id: item.id || item._id || item.productId,
          stock: item.stock || item.stockQuantity || 0,
          inStock: item.inStock !== false && (item.stock || item.stockQuantity || 0) > 0,
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
        }));

        if (!stopped) {
          setProducts(items);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch products (polling):', err);
        setError('Failed to load products');
        setLoading(false);
        errorLogger.error('Polling products failed', err);
      }
    };

    if (isPageVisible) {
      fetchProducts();
      // Poll every 15 seconds for updates
      intervalId = setInterval(fetchProducts, 15000);
    } else {
      setLoading(false);
    }

    return () => {
      stopped = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [category, vendorId, status, showActiveOnly, limitCount, isPageVisible]);

  // Memoized filtered products (same as before)
  const filteredProducts = useMemo(() => {
    if (!products.length) return [];

    let filtered = [...products];

    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(product => {
        const searchFields = [
          product.name,
          product.description,
          product.brand,
          product.category,
          ...(product.features || [])
        ];
        
        return searchFields.some(field => 
          field && field.toString().toLowerCase().includes(searchLower)
        );
      });
    }

    // Price range filter
    if (filters.priceRange?.min || filters.priceRange?.max) {
      filtered = filtered.filter(product => {
        const price = parseFloat(product.price) || 0;
        const minPrice = parseFloat(filters.priceRange.min) || 0;
        const maxPrice = parseFloat(filters.priceRange.max) || Infinity;
        
        return price >= minPrice && price <= maxPrice;
      });
    }

    // Rating filter
    if (filters.rating) {
      const minRating = parseFloat(filters.rating);
      filtered = filtered.filter(product => 
        (product.rating || 0) >= minRating
      );
    }

    // Stock filter
    if (filters.inStock) {
      filtered = filtered.filter(product => 
        product.inStock !== false && (product.stock || 0) > 0
      );
    }

    // Sort products
    switch (filters.sortBy) {
      case 'price-low':
        filtered.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
        break;
      case 'price-high':
        filtered.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case 'popular':
        filtered.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
        break;
      case 'stock-low':
        filtered.sort((a, b) => (a.stock || 0) - (b.stock || 0));
        break;
      case 'stock-high':
        filtered.sort((a, b) => (b.stock || 0) - (a.stock || 0));
        break;
      case 'relevance':
      default:
        // Keep original order for relevance
        break;
    }

    return filtered;
  }, [products, filters]);

  // Get unique categories
  const categories = useMemo(() => {
    return [...new Set(products.map(p => p.category).filter(Boolean))];
  }, [products]);

  // Get filter counts
  const getFilterCounts = () => {
    const counts = {
      categories: {},
      priceRanges: {
        'under-50': 0,
        '50-100': 0,
        '100-500': 0,
        'over-500': 0
      },
      ratings: {
        '5': 0,
        '4': 0,
        '3': 0,
        '2': 0,
        '1': 0
      },
      inStock: 0,
      outOfStock: 0
    };

    products.forEach(product => {
      // Category counts
      const category = product.category || 'uncategorized';
      counts.categories[category] = (counts.categories[category] || 0) + 1;

      // Price range counts
      const price = parseFloat(product.price) || 0;
      if (price < 50) counts.priceRanges['under-50']++;
      else if (price <= 100) counts.priceRanges['50-100']++;
      else if (price <= 500) counts.priceRanges['100-500']++;
      else counts.priceRanges['over-500']++;

      // Rating counts
      const rating = Math.floor(product.rating || 0);
      if (rating >= 5) counts.ratings['5']++;
      else if (rating >= 4) counts.ratings['4']++;
      else if (rating >= 3) counts.ratings['3']++;
      else if (rating >= 2) counts.ratings['2']++;
      else if (rating >= 1) counts.ratings['1']++;

      // Stock counts
      if (product.inStock !== false && (product.stock || 0) > 0) {
        counts.inStock++;
      } else {
        counts.outOfStock++;
      }
    });

    return counts;
  };

  // Search suggestions
  const getSearchSuggestions = (query) => {
    if (!query || query.length < 2) return [];
    
    const suggestions = [];
    const queryLower = query.toLowerCase();
    
    // Category suggestions
    const categories = [...new Set(products.map(p => p.category))];
    categories.forEach(category => {
      if (category.toLowerCase().includes(queryLower)) {
        suggestions.push({
          type: 'category',
          text: category,
          value: category
        });
      }
    });
    
    // Brand suggestions
    const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
    brands.forEach(brand => {
      if (brand.toLowerCase().includes(queryLower)) {
        suggestions.push({
          type: 'brand',
          text: brand,
          value: brand
        });
      }
    });
    
    // Product name suggestions
    products.slice(0, 5).forEach(product => {
      if (product.name.toLowerCase().includes(queryLower)) {
        suggestions.push({
          type: 'product',
          text: product.name,
          value: product.name
        });
      }
    });
    
    return suggestions.slice(0, 8);
  };

  return {
    products: filteredProducts,
    allProducts: products,
    loading,
    error,
    categories,
    getFilterCounts,
    getSearchSuggestions,
    totalCount: filteredProducts.length,
    hasFilters: Object.values(filters).some(v => 
      v && (typeof v !== 'object' || (v.min || v.max))
    )
  };
};

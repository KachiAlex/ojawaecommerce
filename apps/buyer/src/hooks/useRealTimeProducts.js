import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { errorLogger } from '../utils/errorLogger';

export const useRealTimeProducts = (filters = {}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribe = null;

    const setupRealTimeListener = () => {
      try {
        setLoading(true);
        setError(null);

        // Build the query
        let q = collection(db, 'products');

        // Apply filters
        if (filters.category && filters.category !== 'all') {
          q = query(q, where('category', '==', filters.category));
        }

        if (filters.vendorId) {
          q = query(q, where('vendorId', '==', filters.vendorId));
        }

        // Only show approved (active) products to buyers by default
        // Unless explicitly overridden (e.g., for admin/vendor views)
        if (filters.status) {
          q = query(q, where('status', '==', filters.status));
        } else if (filters.showAll !== true) {
          // Default: only show active products to buyers
          q = query(q, where('status', '==', 'active'));
        }

        // Always order by creation date (newest first)
        q = query(q, orderBy('createdAt', 'desc'));

        // Set up real-time listener
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const productsData = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                // Ensure stock fields are properly handled
                stock: data.stock || data.stockQuantity || 0,
                inStock: data.inStock !== false && (data.stock || data.stockQuantity || 0) > 0,
                // Handle timestamps
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now())
              };
            });

            setProducts(productsData);
            setLoading(false);
            
            console.log(`Real-time products updated: ${productsData.length} products`);
          },
          (error) => {
            console.error('Real-time products listener error:', error);
            setError('Failed to load products in real-time');
            setLoading(false);
            errorLogger.error('Real-time products listener failed', error);
          }
        );

      } catch (error) {
        console.error('Error setting up real-time listener:', error);
        setError('Failed to setup real-time listener');
        setLoading(false);
        errorLogger.error('Failed to setup real-time products listener', error);
      }
    };

    setupRealTimeListener();

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
        console.log('Real-time products listener cleaned up');
      }
    };
  }, [filters.category, filters.vendorId, filters.status]);

  // Memoized filtered products
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

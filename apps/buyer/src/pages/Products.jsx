import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as Framer from 'framer-motion';
const { motion } = Framer;
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import firebaseService from '../services/firebaseService';
import ProductCard from '../components/ProductCard';
import Product3DCard from '../components/Product3DCard';
import { ProductListSkeleton } from '../components/SkeletonLoaders';
import { collection, query, where, getDocs, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '../firebase/config';

const Products = () => {
  console.log('🛍️ Products: Component function called');
  const { currentUser } = useAuth();
  const { addToCart } = useCart();
  
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Debug logging
  console.log('🛍️ Products component rendered');
  console.log('🛍️ Products: Component state - loading:', loading, 'products.length:', products.length);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });
  const [categories, setCategories] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState('3D'); // '2D' or '3D'

  // Price slider constants and derived percentages for styled track
  const PRICE_MIN = 0;
  const PRICE_MAX = 100000;
  const clampedMin = Math.max(PRICE_MIN, Math.min(priceRange.min, PRICE_MAX));
  const clampedMax = Math.max(PRICE_MIN, Math.min(priceRange.max, PRICE_MAX));
  const minPercent = ((Math.min(clampedMin, clampedMax) - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
  const maxPercent = ((Math.max(clampedMin, clampedMax) - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

  // Fetch products
  const fetchProducts = async (reset = false) => {
    console.log('🛍️ Products: fetchProducts called with reset =', reset);
    try {
      setLoading(true);
      setError(null);

      // Check if db is available
      if (!db) {
        throw new Error('Database not initialized');
      }

      // Use simple query to avoid Firestore internal errors
      const q = query(collection(db, 'products'));
      console.log('🛍️ Products: Executing Firestore query...');

      const snapshot = await getDocs(q);
      let allProducts = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
        id: doc.id,
          ...data,
          // Ensure required fields exist
          name: data.name || 'Unnamed Product',
          price: parseFloat(data.price) || 0,
          category: data.category || 'Uncategorized',
          isActive: data.isActive !== false,
          createdAt: data.createdAt || new Date()
        };
      });

      // Apply client-side filtering
      allProducts = allProducts.filter(product => {
        // Filter by isActive
        if (product.isActive === false) return false;
        
        // Filter by category
        if (selectedCategory !== 'all' && product.category !== selectedCategory) {
          return false;
        }
        
        // Filter by price range
        const price = product.price || 0;
        if (price < priceRange.min || price > priceRange.max) {
          return false;
        }
        
        return true;
      });

      // Apply client-side sorting
      switch (sortBy) {
        case 'newest':
          allProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
        case 'oldest':
          allProducts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          break;
        case 'price-low':
          allProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
          break;
        case 'price-high':
          allProducts.sort((a, b) => (b.price || 0) - (a.price || 0));
          break;
        case 'name':
          allProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          break;
        default:
          allProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
      }

      // Apply pagination client-side
      const startIndex = reset ? 0 : products.length;
      const endIndex = startIndex + 20;
      const newProducts = allProducts.slice(startIndex, endIndex);

      console.log('🛍️ Products: Fetched', newProducts.length, 'products');
      console.log('🛍️ Products: Product data:', newProducts);
      
      // Mobile debugging - also log to alert for immediate visibility
      if (newProducts.length === 0) {
        console.warn('🛍️ Products: No products found - this might be the issue');
      }

      if (reset) {
        setProducts(newProducts);
      } else {
        setProducts(prev => [...prev, ...newProducts]);
      }

      setHasMore(endIndex < allProducts.length);
      
      // If no products found, show a helpful message
      if (allProducts.length === 0) {
        console.log('🛍️ Products: No products found in database');
      }

    } catch (err) {
      console.error('Error fetching products:', err);
      console.error('Error details:', {
        code: err.code,
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      
      // More specific error handling for mobile
      if (err.code === 'unavailable') {
        setError('Network error. Please check your connection and try again.');
      } else if (err.code === 'permission-denied') {
        setError('Access denied. Please refresh the page.');
      } else if (err.message && err.message.includes('Database not initialized')) {
        setError('App initialization error. Please restart the app.');
      } else {
        setError(`Failed to load products: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      // Direct Firestore query to get categories
      const q = query(
        collection(db, 'products'),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(q);
      const categoriesSet = new Set();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.category) {
          categoriesSet.add(data.category);
        }
      });
      
      const categoriesData = Array.from(categoriesSet).sort();
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Fallback categories
      setCategories(['Electronics', 'Fashion', 'Home & Living', 'Food', 'Services']);
    }
  };

  // Search products
  const searchProducts = async () => {
    if (!searchQuery.trim()) {
      fetchProducts(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const q = query(
        collection(db, 'products'),
        where('isActive', '==', true),
        where('name', '>=', searchQuery),
        where('name', '<=', searchQuery + '\uf8ff'),
        limit(20)
      );

      const snapshot = await getDocs(q);
      const searchResults = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setProducts(searchResults);
      setFilteredProducts(searchResults);
      setHasMore(false);
    } catch (err) {
      console.error('Error searching products:', err);
      // More specific error handling for mobile
      if (err.code === 'unavailable') {
        setError('Network error. Please check your connection and try again.');
      } else if (err.code === 'permission-denied') {
        setError('Access denied. Please refresh the page.');
      } else {
      setError('Search failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle search results from filter component
  const handleSearchResults = (searchResults) => {
    console.log('🔍 Products: Search results received:', searchResults.length, 'products');
    console.log('🔍 Products: Search results data:', searchResults);
    setFilteredProducts(searchResults);
    setIsSearching(false);
  };

  const handleSearchLoading = (loading) => {
    console.log('🔍 Products: Search loading:', loading);
    setIsSearching(loading);
  };

  // Load more products
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchProducts(false);
    }
  };

  // Handle add to cart
  const handleAddToCart = async (product) => {
    try {
      await addToCart(product, 1);
      console.log('✅ Product added to cart:', product.name);
    } catch (error) {
      console.error('❌ Failed to add to cart:', error);
    }
  };

  // Effects
  useEffect(() => {
    console.log('🛍️ Products: useEffect triggered - Component mounted, fetching products...');
    fetchProducts(true);
    fetchCategories();
  }, []);

  useEffect(() => {
    console.log('🛍️ Products: Filters changed, refetching products...');
    fetchProducts(true);
  }, [selectedCategory, sortBy, priceRange]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchProducts();
      } else {
        fetchProducts(true);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Initialize filtered products when products change
  useEffect(() => {
    setFilteredProducts(products);
  }, [products]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl sm:text-6xl mb-4">😞</div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 px-4">{error}</p>
            <button
              onClick={() => fetchProducts(true)}
              className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen bg-gray-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <motion.div 
          className="mb-6 sm:mb-8 flex justify-between items-start"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">Products</h1>
            <p className="text-sm sm:text-base text-gray-600">Discover amazing products from local vendors</p>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setViewMode('2D')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                viewMode === '2D' 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title="2D View"
            >
              📐 2D
            </button>
            <button
              onClick={() => setViewMode('3D')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                viewMode === '3D' 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title="3D View"
            >
              🎮 3D
            </button>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div 
          className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm md:shadow-md md:border md:border-gray-100 p-3 sm:p-6 mb-6 sm:mb-8 sticky top-[env(safe-area-inset-top,0px)] md:top-4 z-30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <motion.div 
              className="md:col-span-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Products
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                  {/* Search icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 4.253 11.97l4.264 4.264a.75.75 0 1 0 1.06-1.06l-4.264-4.264A6.75 6.75 0 0 0 10.5 3.75Zm-5.25 6.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Z" clipRule="evenodd" />
                  </svg>
                </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products, categories..."
                  aria-label="Search products"
                  className="w-full pl-11 pr-11 py-3 rounded-xl bg-gray-50 border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all duration-200"
                />
                {searchQuery && (
                  loading ? (
                    <span className="absolute inset-y-0 right-0 mr-3 flex items-center">
                      <span className="h-5 w-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute inset-y-0 right-0 mr-2 flex items-center justify-center rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                    >
                      {/* Clear (X) icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                        <path fillRule="evenodd" d="M6.225 4.811a.75.75 0 0 1 1.06 0L12 9.525l4.715-4.714a.75.75 0 1 1 1.06 1.06L13.06 10.586l4.715 4.714a.75.75 0 1 1-1.06 1.061L12 11.647l-4.715 4.714a.75.75 0 0 1-1.06-1.06l4.714-4.715-4.714-4.715a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )
                )}
              </div>
            </motion.div>

            {/* Category Filter */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full appearance-none pl-4 pr-10 py-3 rounded-xl bg-gray-50 border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all duration-200"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                  {/* Chevron icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path fillRule="evenodd" d="M12 14.5a.75.75 0 0 1-.53-.22l-4-4a.75.75 0 1 1 1.06-1.06L12 12.69l3.47-3.47a.75.75 0 0 1 1.06 1.06l-4 4a.75.75 0 0 1-.53.22Z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            </motion.div>

            {/* Sort */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                  className="w-full appearance-none pl-4 pr-10 py-3 rounded-xl bg-gray-50 border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all duration-200"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name A-Z</option>
              </select>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                  {/* Chevron icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path fillRule="evenodd" d="M12 14.5a.75.75 0 0 1-.53-.22l-4-4a.75.75 0 1 1 1.06-1.06L12 12.69l3.47-3.47a.75.75 0 0 1 1.06 1.06l-4 4a.75.75 0 0 1-.53.22Z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            </motion.div>
          </div>

          {/* Quick category chips */}
          {categories.length > 0 && (
            <motion.div 
              className="mt-3 flex items-center gap-2 overflow-x-auto pb-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.45 }}
            >
              {["all", ...categories.slice(0, 8)].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`${selectedCategory === cat ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} px-3 py-1.5 rounded-full text-sm transition whitespace-nowrap`}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
              {(searchQuery || selectedCategory !== 'all' || priceRange.min !== 0 || priceRange.max !== 100000) && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setPriceRange({ min: 0, max: 100000 }); fetchProducts(true); }}
                  className="ml-auto text-sm text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  Reset filters
                </button>
              )}
            </motion.div>
          )}

          {/* Price Range */}
          <motion.div 
            className="mt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Range: ₦{priceRange.min} - ₦{priceRange.max}
            </label>
            {/* Dual range slider with styled track */}
            <div className="price-range relative mb-3 pt-3">
              {/* Track */}
              <div className="absolute left-0 right-0 top-1.5 h-2 rounded-full bg-gray-200" />
              {/* Active range highlight */}
              <div
                className="absolute top-1.5 h-2 rounded-full bg-emerald-500"
                style={{ left: `${minPercent}%`, width: `${Math.max(0, maxPercent - minPercent)}%` }}
              />
              {/* Min slider */}
              <input
                type="range"
                min={PRICE_MIN}
                max={PRICE_MAX}
                step={100}
                value={Math.min(priceRange.min, priceRange.max)}
                onChange={(e) => {
                  const newMin = parseInt(e.target.value) || PRICE_MIN;
                  setPriceRange(prev => ({ ...prev, min: Math.min(newMin, prev.max) }));
                }}
                className="absolute inset-x-0 top-0 w-full appearance-none bg-transparent"
                style={{ zIndex: 30 }}
              />
              {/* Max slider */}
              <input
                type="range"
                min={PRICE_MIN}
                max={PRICE_MAX}
                step={100}
                value={Math.max(priceRange.min, priceRange.max)}
                onChange={(e) => {
                  const newMax = parseInt(e.target.value) || PRICE_MIN;
                  setPriceRange(prev => ({ ...prev, max: Math.max(newMax, prev.min) }));
                }}
                className="absolute inset-x-0 top-0 w-full appearance-none bg-transparent"
                style={{ zIndex: 20 }}
              />
            </div>
            <div className="flex space-x-4">
              <input
                type="number"
                value={priceRange.min}
                onChange={(e) => setPriceRange(prev => ({ ...prev, min: parseInt(e.target.value) || 0 }))}
                placeholder="Min price"
                className="flex-1 px-3 py-2 rounded-xl bg-gray-50 border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all duration-200"
              />
              <input
                type="number"
                value={priceRange.max}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: parseInt(e.target.value) || 100000 }))}
                placeholder="Max price"
                className="flex-1 px-3 py-2 rounded-xl bg-gray-50 border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all duration-200"
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Products Grid */}
        <Framer.AnimatePresence mode="wait">
        {loading && products.length === 0 ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ProductListSkeleton count={8} />
            </motion.div>
        ) : products.length === 0 ? (
            <motion.div 
              key="empty"
              className="text-center py-12"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div 
                className="text-6xl mb-4"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                🔍
              </motion.div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No products found</h2>
            <p className="text-gray-600 mb-4">
              {searchQuery ? `No products match "${searchQuery}"` : 'No products available in this category'}
            </p>
              <motion.button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setPriceRange({ min: 0, max: 100000 });
                fetchProducts(true);
              }}
                className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-all duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
              Clear Filters
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="products"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div 
                className="mb-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-gray-600">Showing {products.length} products</p>
              </motion.div>
              
              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                layout
              >
                <Framer.AnimatePresence mode="wait">
                  {products.map((product, index) => (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20, scale: 0.9 }}
                      transition={{ 
                        duration: 0.3, 
                        delay: index * 0.05,
                        layout: { duration: 0.3 }
                      }}
                    >
                      {viewMode === '3D' ? (
                        <Product3DCard
                          product={product}
                          onAddToCart={handleAddToCart}
                        />
                      ) : (
                        <ProductCard
                          product={product}
                          onAddToCart={handleAddToCart}
                        />
                      )}
                    </motion.div>
              ))}
                </Framer.AnimatePresence>
              </motion.div>

            {/* Load More Button */}
            {hasMore && (
                <motion.div 
                  className="text-center mt-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <motion.button
                  onClick={loadMore}
                  disabled={loading}
                    className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg hover:bg-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <motion.div
                          className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full mr-2"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        Loading...
              </div>
                    ) : (
                      'Load More Products'
                    )}
                  </motion.button>
                </motion.div>
            )}
            </motion.div>
        )}
        </Framer.AnimatePresence>

        {/* Results Count */}
        {products.length > 0 && (
          <motion.div 
            className="mt-8 text-center text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Showing {products.length} product{products.length !== 1 ? 's' : ''}
            {searchQuery && ` for "${searchQuery}"`}
          </motion.div>
        )}
      </div>
    {/* Slider styling */}
    <style>{`
      .price-range input[type=range] { -webkit-appearance: none; appearance: none; height: 0; }
      .price-range input[type=range]::-webkit-slider-runnable-track { height: 0; background: transparent; }
      .price-range input[type=range]::-moz-range-track { height: 0; background: transparent; }
      .price-range input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; height: 18px; width: 18px; border-radius: 9999px; background: #fff; border: 2px solid #059669; box-shadow: 0 1px 2px rgba(0,0,0,0.1); margin-top: -8px; cursor: pointer; position: relative; }
      .price-range input[type=range]::-moz-range-thumb { height: 18px; width: 18px; border-radius: 9999px; background: #fff; border: 2px solid #059669; box-shadow: 0 1px 2px rgba(0,0,0,0.1); cursor: pointer; position: relative; }
      .price-range input[type=range]:focus { outline: none; }
    `}</style>
    </motion.div>
  );
};

export default Products;
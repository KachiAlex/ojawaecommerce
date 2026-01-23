import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import * as Framer from 'framer-motion';
const { motion } = Framer;
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import firebaseService from '../services/firebaseService';
import ProductCard from '../components/ProductCard';
import Product3DCard from '../components/Product3DCard';
import { ProductListSkeleton } from '../components/SkeletonLoaders';
import AdvancedFilters from '../components/AdvancedFilters';
import SearchAutocomplete from '../components/SearchAutocomplete';
import ProductComparison from '../components/ProductComparison';
import ProductFilterSidebar from '../components/ProductFilterSidebar';
import WishlistButton from '../components/WishlistButton';
import { collection, query, where, getDocs, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '../firebase/config';

function normalizeSidebarFilters(filters = {}) {
  return {
    searchQuery: typeof filters.searchQuery === 'string' ? filters.searchQuery : '',
    categories: Array.isArray(filters.categories) ? filters.categories : [],
    expressDelivery: Boolean(filters.expressDelivery),
    priceRange: typeof filters.priceRange === 'object' ? filters.priceRange : null,
    discountPercentage:
      typeof filters.discountPercentage === 'number' ? filters.discountPercentage : null,
    brands: Array.isArray(filters.brands) ? filters.brands : [],
    sizes: Array.isArray(filters.sizes) ? filters.sizes : [],
  };
}

const Products = () => {
  console.log('🛍️ Products: Component function called');
  const { currentUser } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState([]);
  const [allFilteredProducts, setAllFilteredProducts] = useState([]); // Store ALL filtered products (not paginated)
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Debug logging
  console.log('🛍️ Products component rendered');
  console.log('🛍️ Products: Component state - loading:', loading, 'products.length:', products.length);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const PRICE_MIN = 0;
  const PRICE_MAX = 10000000;
  const [priceRange, setPriceRange] = useState({ min: PRICE_MIN, max: PRICE_MAX });

  const [categories, setCategories] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState('3D'); // '2D' or '3D'
  const [showFilters, setShowFilters] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [compareProducts, setCompareProducts] = useState([]);
  const [advancedFilters, setAdvancedFilters] = useState({
    category: 'all',
    priceRange: { min: PRICE_MIN, max: PRICE_MAX },
    brand: 'all',
    condition: 'all',
    inStock: true,
    minRating: 0
  });
  const [brands, setBrands] = useState([]);

  const [searchParams] = useSearchParams();
  const [sidebarFilters, setSidebarFilters] = useState(() => normalizeSidebarFilters());
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(true);

  // Price slider constants and derived percentages for styled track
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
        
        // Handle images - ensure we have proper image URLs
        let images = [];
        
        // Check various image field names that might be used (prioritize single image fields first)
        const imageFields = ['image', 'imageUrl', 'imageURL', 'photo', 'photoUrl', 'thumbnail', 'img', 'picture'];
        for (const field of imageFields) {
          if (data[field] && typeof data[field] === 'string' && data[field].trim() !== '' && data[field] !== 'undefined') {
            if (!images.includes(data[field])) {
              images.push(data[field]); // Add to array if not already present
            }
          }
        }
        
        // Then add from images array
        if (data.images && Array.isArray(data.images) && data.images.length > 0) {
          const validImages = data.images.filter(img => 
            img && typeof img === 'string' && img.trim() !== '' && img !== 'undefined'
          );
          validImages.forEach(img => {
            if (!images.includes(img)) {
              images.push(img);
            }
          });
        }
        
        const product = {
          id: doc.id,
          ...data,
          // Ensure required fields exist
          name: data.name || 'Unnamed Product',
          price: parseFloat(data.price) || 0,
          category: data.category || 'Uncategorized',
          isActive: data.isActive !== false,
          createdAt: data.createdAt || new Date(),
          // Normalize images - always use array
          images: images,
          image: images.length > 0 ? images[0] : null,
          // Also set imageUrls for backward compatibility with Product3DCard
          imageUrls: images.length > 0 ? images : []
        };
        
        // Debug logging for images
        if (images.length > 0) {
          console.log('✅ Product image found:', product.name, '- Image URL:', product.image);
        } else {
          console.log('⚠️ No images found for product:', product.name, '- Data:', { 
            hasImages: !!data.images, 
            imagesLength: data.images?.length || 0,
            hasImage: !!data.image,
            imageUrl: data.image,
            imageUrl2: data.imageUrl,
            imageURL: data.imageURL,
            allFields: Object.keys(data).filter(k => k.toLowerCase().includes('image') || k.toLowerCase().includes('photo'))
          });
        }
        
        return product;
      });

      // Apply client-side filtering ONLY - NO SORTING HERE
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

      // Store ALL filtered products (not paginated)
      // Store all filtered products - always replace on reset, append on load more
      if (reset) {
        setAllFilteredProducts(allProducts);
        // Also set filteredProducts directly to avoid race conditions
        setFilteredProducts(allProducts);
        setProducts(allProducts);
      } else {
        // For pagination, append to existing allFilteredProducts
        setAllFilteredProducts(prev => {
          const combined = [...prev, ...allProducts];
          // Also update filteredProducts and products
          setFilteredProducts(combined);
          setProducts(combined);
          return combined;
        });
      }

      console.log('🛍️ Products: Fetched', allProducts.length, 'filtered products');
      console.log('🛍️ Products: Total filtered products:', reset ? allProducts.length : 'appended');
      
      // Mobile debugging - also log to alert for immediate visibility
      if (allProducts.length === 0) {
        console.warn('🛍️ Products: No products found - this might be the issue');
      }

      // Note: hasMore and pagination are now handled in the display useEffect
      // We load all products at once, then display them
      
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

  // Fetch categories and brands
  const fetchCategories = async () => {
    try {
      // Direct Firestore query to get categories
      const q = query(
        collection(db, 'products'),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(q);
      const categoriesSet = new Set();
      const brandsSet = new Set();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.category) {
          categoriesSet.add(data.category);
        }
        if (data.brand) {
          brandsSet.add(data.brand);
        }
      });

      const categoriesData = Array.from(categoriesSet).sort();
      const brandsData = Array.from(brandsSet).sort();
      setCategories(categoriesData);
      setBrands(brandsData);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Fallback categories
      setCategories(['Electronics', 'Fashion', 'Home & Living', 'Food', 'Services']);
      setBrands([]);
    }
  };

  // Handle add to cart - allow guest users to add to cart (they'll be prompted at checkout)
  const handleAddToCart = async (product) => {
    try {
      await addToCart(product, 1);
      console.log('✅ Product added to cart:', product.name);
      // Toast notification is handled by CartToast component via cart:add event
    } catch (error) {
      console.error('❌ Failed to add to cart:', error);
      // Show error toast if available
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cart:error', { 
          detail: { message: error.message || 'Failed to add product to cart' } 
        }));
      }
    }
  };

  // Effects
  useEffect(() => {
    console.log('🛍️ Products: useEffect triggered - Component mounted, fetching products...');
    fetchProducts(true);
    fetchCategories();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    console.log('🛍️ Products: Filters changed, refetching products...');
    fetchProducts(true);
  }, [selectedCategory, priceRange, advancedFilters.category, advancedFilters.brand, advancedFilters.condition, advancedFilters.priceRange, advancedFilters.inStock, advancedFilters.minRating]);

  // Apply sidebar filters to products
  const applySidebarFilters = (productsToFilter, filters) => {
    if (!filters) return productsToFilter;

    const normalized = normalizeSidebarFilters(filters);
    let filtered = [...productsToFilter];

    if (normalized.searchQuery && normalized.searchQuery.trim()) {
      const searchLower = normalized.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => {
        const nameMatch = p.name?.toLowerCase().includes(searchLower);
        const descMatch = p.description?.toLowerCase().includes(searchLower);
        const categoryMatch = p.category?.toLowerCase().includes(searchLower);
        const brandMatch = p.brand?.toLowerCase().includes(searchLower);
        const tagsMatch = p.tags?.some(tag => tag.toLowerCase().includes(searchLower));
        return nameMatch || descMatch || categoryMatch || brandMatch || tagsMatch;
      });
    }

    if (normalized.categories.length > 0) {
      filtered = filtered.filter(p => normalized.categories.includes(p.category));
    }

    if (normalized.expressDelivery) {
      filtered = filtered.filter(p => p.expressDelivery === true || p.fastDelivery === true);
    }

    if (normalized.priceRange) {
      const { min = 0, max = Number.MAX_VALUE } = normalized.priceRange;
      filtered = filtered.filter(p => {
        const price = parseFloat(p.price) || 0;
        return price >= min && price <= max;
      });
    }

    if (normalized.discountPercentage !== null) {
      filtered = filtered.filter(p => {
        if (!p.originalPrice || !p.price) return false;
        const original = parseFloat(p.originalPrice);
        const current = parseFloat(p.price);
        if (original <= current) return false;
        const discount = Math.round(((original - current) / original) * 100);
        return discount >= normalized.discountPercentage;
      });
    }

    if (normalized.brands.length > 0) {
      filtered = filtered.filter(p => normalized.brands.includes(p.brand));
    }

    if (normalized.sizes.length > 0) {
      filtered = filtered.filter(p => {
        if (p.size) {
          if (Array.isArray(p.size)) {
            return p.size.some(s => normalized.sizes.includes(s));
          }
          return normalized.sizes.includes(p.size);
        }
        if (p.sizes && Array.isArray(p.sizes)) {
          return p.sizes.some(s => normalized.sizes.includes(s));
        }
        return false;
      });
    }
    return filtered;
  };

  // Recompute filtered products whenever data or filters change
  useEffect(() => {
    if (loading) return;

    if (!allFilteredProducts || allFilteredProducts.length === 0) {
      setFilteredProducts([]);
      setProducts([]);
      setHasMore(false);
      return;
    }

    const filtersToApply = {
      ...(sidebarFilters || {}),
      searchQuery: searchQuery || ''
    };

    const productsToDisplay = applySidebarFilters(allFilteredProducts, filtersToApply);
    setFilteredProducts(productsToDisplay);
    setProducts(productsToDisplay);
    setHasMore(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFilteredProducts, sidebarFilters, searchQuery, loading]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl sm:text-6xl mb-4">😞</div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-4">Something went wrong</h1>
            <p className="text-sm sm:text-base text-teal-200 mb-6 sm:mb-8 px-4">{error}</p>
            <button
              onClick={() => fetchProducts(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:from-emerald-400 hover:to-teal-400 transition-colors text-sm sm:text-base font-semibold"
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
      className="min-h-screen bg-slate-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex">
        {/* Filter Sidebar */}
        <div className="hidden lg:block">
          <ProductFilterSidebar
            products={allFilteredProducts}
            onFilterChange={handleSidebarFilterChange}
            onSearchChange={handleSidebarSearchChange}
            onSearchSubmit={handleSidebarSearchSubmit}
            searchQuery={searchQuery}
            categories={categories}
            brands={brands}
            isOpen={isFilterSidebarOpen}
          />

        </div>
        
        {/* Mobile Filter Overlay */}
        {isFilterSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div 
              className="absolute inset-0 bg-black/60"
              onClick={() => setIsFilterSidebarOpen(false)}
            />
            <div className="absolute left-0 top-0 bottom-0 w-64 z-50">
              <ProductFilterSidebar
                products={allFilteredProducts}
                onFilterChange={handleSidebarFilterChange}
                onSearchChange={handleSidebarSearchChange}
                onSearchSubmit={handleSidebarSearchSubmit}
                searchQuery={searchQuery}
                categories={categories}
                brands={brands}
                isOpen={isFilterSidebarOpen}

                onClose={() => setIsFilterSidebarOpen(false)}
              />
            </div>
          </div>
        )}
        
        {/* Main Content */}
        <div className="flex-1 max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <motion.div 
          className="mb-6 sm:mb-8 flex justify-between items-start"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-4">Products</h1>
            <p className="text-sm sm:text-base text-teal-200">Discover amazing products from local vendors</p>
          </div>
          
          {/* View Mode Toggle & Filters */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFilterSidebarOpen(!isFilterSidebarOpen)}
              className="lg:hidden px-4 py-2 rounded-md font-medium text-sm transition-all bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm hover:from-emerald-400 hover:to-teal-400"
              title="Filters"
            >
              🔍 Filters
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="hidden lg:block px-4 py-2 rounded-md font-medium text-sm transition-all bg-white/90 backdrop-blur-sm shadow-sm border border-gray-200 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50"
              title="Advanced Filters"
            >
              🔍 Advanced
            </button>
            {compareProducts.length > 0 && (
              <button
                onClick={() => setShowComparison(true)}
                className="px-4 py-2 rounded-md font-medium text-sm transition-all bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                title="Compare Products"
              >
                Compare ({compareProducts.length})
              </button>
            )}
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
          </div>
        </motion.div>

        {/* Search and Filters - Search moved to sidebar, only show category filter here */}
        <motion.div 
          className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm md:shadow-md md:border md:border-gray-100 p-3 sm:p-6 mb-6 sm:mb-8 sticky top-[env(safe-area-inset-top,0px)] md:top-4 z-20 hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search - Hidden, now in sidebar */}
            <motion.div 
              className="md:col-span-2 hidden"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Products
              </label>
              <SearchAutocomplete 
                placeholder="Search products, categories..."
                onSearch={(query) => {
                  setSearchQuery(query);
                }}
                onSelect={(product) => {
                  navigate(`/products/${product.id}`);
                }}
                initialQuery={searchQuery}
                products={products}
              />
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
              {(searchQuery || selectedCategory !== 'all' || priceRange.min !== PRICE_MIN || priceRange.max !== PRICE_MAX) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setPriceRange({ min: PRICE_MIN, max: PRICE_MAX });
                    fetchProducts(true);
                  }}
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

        {/* Advanced Filters Sidebar */}
        {showFilters && (
          <>
            {/* Overlay to close filters on mobile */}
            <div 
              className="fixed inset-0 bg-black/20 z-30 lg:hidden"
              onClick={() => setShowFilters(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mb-6 relative z-40"
            >
              <AdvancedFilters
                categories={categories}
                brands={brands}
                onFiltersChange={(filters) => {
                  setAdvancedFilters(filters);
                  // Don't refetch, just update filters
                }}
                initialFilters={advancedFilters}
                isOpen={showFilters}
                onToggle={() => setShowFilters(false)}
              />
            </motion.div>
          </>
        )}

        {/* Products Grid */}
        <Framer.AnimatePresence mode="wait">
        {loading && filteredProducts.length === 0 ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ProductListSkeleton count={8} />
            </motion.div>
        ) : filteredProducts.length === 0 ? (
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
              className="w-full"
            >
              <motion.div 
                className="mb-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-gray-600">Showing {filteredProducts.length} products</p>
              </motion.div>
              
              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                layout
              >
                <Framer.AnimatePresence mode="wait">
                  {filteredProducts.map((product, index) => (
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
                      <div className="relative group">
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
                        {/* Wishlist Button - Top Left */}
                        <div className="absolute top-2 left-2 z-10">
                          <WishlistButton product={product} size="md" showText={false} />
                        </div>
                        {/* Compare Button - Top Right */}
                        <div className="absolute top-2 right-2 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (compareProducts.includes(product.id)) {
                                setCompareProducts(prev => prev.filter(id => id !== product.id));
                              } else {
                                if (compareProducts.length < 4) {
                                  setCompareProducts(prev => [...prev, product.id]);
                                } else {
                                  alert('You can compare up to 4 products at once');
                                }
                              }
                            }}
                            className={`p-2 rounded-full transition-colors ${
                              compareProducts.includes(product.id)
                                ? 'bg-blue-600 text-white'
                                : 'bg-white/90 text-gray-600 hover:bg-blue-50'
                            } shadow-md hover:shadow-lg`}
                            title={compareProducts.includes(product.id) ? 'Remove from comparison' : 'Add to comparison'}
                          >
                            {compareProducts.includes(product.id) ? (
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
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

        {/* Product Comparison Modal */}
        <ProductComparison
          isOpen={showComparison}
          onClose={() => {
            setShowComparison(false);
            setCompareProducts([]);
          }}
          productIds={compareProducts}
        />
        {/* Slider styling */}
        <style>{`
          .price-range input[type=range] { -webkit-appearance: none; appearance: none; height: 0; }
          .price-range input[type=range]::-webkit-slider-runnable-track { height: 0; background: transparent; }
          .price-range input[type=range]::-moz-range-track { height: 0; background: transparent; }
          .price-range input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; height: 18px; width: 18px; border-radius: 9999px; background: #fff; border: 2px solid #059669; box-shadow: 0 1px 2px rgba(0,0,0,0.1); margin-top: -8px; cursor: pointer; position: relative; }
          .price-range input[type=range]::-moz-range-thumb { height: 18px; width: 18px; border-radius: 9999px; background: #fff; border: 2px solid #059669; box-shadow: 0 1px 2px rgba(0,0,0,0.1); cursor: pointer; position: relative; }
          .price-range input[type=range]:focus { outline: none; }
        `}</style>
        </div>
      </div>
    </motion.div>
  );
};

export default Products;
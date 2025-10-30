import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

const ProductSearchFilter = ({ onSearchResults, onLoading, featuredProducts = [] }) => {
  console.log('🔍 ProductSearchFilter: Component initialized');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });
  const [sortBy, setSortBy] = useState('newest');
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Price slider constants and derived percentages for styled track
  const PRICE_MIN = 0;
  const PRICE_MAX = 100000;
  const clampedMin = Math.max(PRICE_MIN, Math.min(priceRange.min || 0, PRICE_MAX));
  const clampedMax = Math.max(PRICE_MIN, Math.min(priceRange.max || PRICE_MAX, PRICE_MAX));
  const minPercent = ((Math.min(clampedMin, clampedMax) - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
  const maxPercent = ((Math.max(clampedMin, clampedMax) - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

  // Fetch categories and stores for filter options (only from featured products)
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Fetch unique categories from featured products only
        const productsQuery = query(
          collection(db, 'products'),
          where('isFeatured', '==', true),
          where('isActive', '==', true)
        );
        const productsSnapshot = await getDocs(productsQuery);
        const productData = productsSnapshot.docs.map(doc => doc.data());
        
        const uniqueCategories = [...new Set(productData.map(p => p.category))].filter(Boolean);
        setCategories(uniqueCategories);

        // Fetch stores that have featured products
        const featuredVendorIds = [...new Set(productData.map(p => p.vendorId))].filter(Boolean);
        if (featuredVendorIds.length > 0) {
          const storesQuery = query(
            collection(db, 'stores'),
            where('__name__', 'in', featuredVendorIds)
          );
          const storesSnapshot = await getDocs(storesQuery);
          const storeData = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setStores(storeData);
        }

      } catch (error) {
        console.error('Error fetching filter options from featured products:', error);
        // Fallback: get all data
        try {
          const productsRef = collection(db, 'products');
          const productsSnapshot = await getDocs(productsRef);
          const productData = productsSnapshot.docs.map(doc => doc.data());
          
          const uniqueCategories = [...new Set(productData.map(p => p.category))].filter(Boolean);
          setCategories(uniqueCategories);

          const storesRef = collection(db, 'stores');
          const storesSnapshot = await getDocs(storesRef);
          const storeData = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setStores(storeData);
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
    };

    fetchFilterOptions();
  }, []);

  // Search products with filters - only search within featured products
  const searchProducts = async () => {
    console.log('🔍 ProductSearchFilter: Starting search within featured products...');
    if (onLoading) onLoading(true);
    setIsLoading(true);

    try {
      // Only search within featured products
      const productsQuery = query(
        collection(db, 'products'),
        where('isFeatured', '==', true),
        where('isActive', '==', true)
      );
      console.log('🔍 ProductSearchFilter: Executing Firestore query...');
      const snapshot = await getDocs(productsQuery);
      console.log('🔍 ProductSearchFilter: Query completed, got', snapshot.docs.length, 'documents');
      let products = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Ensure required fields exist
          name: data.name || 'Unnamed Product',
          price: parseFloat(data.price) || 0,
          category: data.category || 'Uncategorized',
          vendorId: data.vendorId || '',
          status: data.status || 'approved',
          createdAt: data.createdAt || new Date(),
          isActive: data.isActive !== false
        };
      });

      // Client-side filtering for active products
      products = products.filter(product => product.isActive === true);

      // Apply category filter
      if (selectedCategory) {
        products = products.filter(product => product.category === selectedCategory);
      }
      
      // Apply store filter
      if (selectedStore) {
        products = products.filter(product => product.vendorId === selectedStore);
      }

      // Apply text search filter
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        products = products.filter(product => 
          product.name?.toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower) ||
          product.brand?.toLowerCase().includes(searchLower) ||
          (product.tags && product.tags.some(tag => tag.toLowerCase().includes(searchLower)))
        );
      }

      // Apply price range filter
      if (priceRange.min || priceRange.max) {
        products = products.filter(product => {
          const price = parseFloat(product.price);
          const min = priceRange.min ? parseFloat(priceRange.min) : 0;
          const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
          return price >= min && price <= max;
        });
      }

      // Apply sorting
      switch (sortBy) {
        case 'newest':
          products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
        case 'oldest':
          products.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          break;
        case 'price-low':
          products.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
          break;
        case 'price-high':
          products.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
          break;
        case 'name':
          products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          break;
      }

      console.log('🔍 Search completed:', products.length, 'products found');
      onSearchResults(products);
    } catch (error) {
      console.error('❌ Error searching featured products:', error);
      // Fallback: try to get all products and filter client-side for featured
      try {
        console.log('🔄 Fallback: Fetching all products for client-side filtering...');
        const fallbackQuery = query(collection(db, 'products'));
        const fallbackSnapshot = await getDocs(fallbackQuery);
        let fallbackProducts = fallbackSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            name: data.name || 'Unnamed Product',
            price: parseFloat(data.price) || 0,
            category: data.category || 'Uncategorized',
            vendorId: data.vendorId || '',
            status: data.status || 'approved',
            createdAt: data.createdAt || new Date(),
            isActive: data.isActive !== false,
            isFeatured: data.isFeatured === true
          };
        }).filter(product => product.isActive === true && product.isFeatured === true);
        
        console.log('🔄 Fallback: Found', fallbackProducts.length, 'featured products');
        onSearchResults(fallbackProducts);
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        onSearchResults([]);
      }
    } finally {
      setIsLoading(false);
      if (onLoading) onLoading(false);
    }
  };

  // Auto-search when filters change (only if any filter is active)
  useEffect(() => {
    // Only search if user has applied any filters
    const hasActiveFilters = searchTerm || selectedCategory || selectedStore || 
                           priceRange.min || priceRange.max || sortBy !== 'newest';
    
    if (!hasActiveFilters) {
      // No filters active, reset to featured products
      console.log('🔍 No active filters, resetting to featured products');
      onSearchResults(featuredProducts);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      searchProducts();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedCategory, selectedStore, priceRange, sortBy, featuredProducts]);

  // Don't run initial search on mount - let the parent component handle initial display
  // Only search when user actively interacts with filters

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedStore('');
    setPriceRange({ min: PRICE_MIN, max: PRICE_MAX });
    setSortBy('newest');
    // Reset to featured products when filters are cleared
    onSearchResults(featuredProducts);
    setIsFiltersOpen(false);
  };

  const hasAnyFilter = !!(searchTerm || selectedCategory || selectedStore || priceRange.min !== PRICE_MIN || priceRange.max !== PRICE_MAX || sortBy !== 'newest');

  return (
    <div className="bg-white/90 backdrop-blur-sm p-3 sm:p-4 rounded-xl shadow-sm border sticky top-[env(safe-area-inset-top,0px)] md:top-4 z-20">
      {/* Compact toolbar */}
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex items-stretch gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 4.253 11.97l4.264 4.264a.75.75 0 1 0 1.06-1.06l-4.264-4.264A6.75 6.75 0 0 0 10.5 3.75Zm-5.25 6.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Z" clipRule="evenodd" />
              </svg>
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-50 border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
            {searchTerm && (
              isLoading ? (
                <span className="absolute inset-y-0 right-0 mr-3 flex items-center">
                  <span className="h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                  className="absolute inset-y-0 right-0 mr-1.5 flex items-center justify-center rounded-full p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M6.225 4.811a.75.75 0 0 1 1.06 0L12 9.525l4.715-4.714a.75.75 0 1 1 1.06 1.06L13.06 10.586l4.715 4.714a.75.75 0 1 1-1.06 1.061L12 11.647l-4.715 4.714a.75.75 0 0 1-1.06-1.06l4.714-4.715-4.714-4.715a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>
              )
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-9 py-2.5 rounded-xl bg-gray-50 border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="price-low">Price: Low</option>
              <option value="price-high">Price: High</option>
              <option value="name">Name A-Z</option>
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M12 14.5a.75.75 0 0 1-.53-.22l-4-4a.75.75 0 1 1 1.06-1.06L12 12.69l3.47-3.47a.75.75 0 0 1 1.06 1.06l-4 4a.75.75 0 0 1-.53.22Z" clipRule="evenodd" />
              </svg>
            </span>
          </div>

          {/* Filters button */}
          <button
            type="button"
            onClick={() => setIsFiltersOpen(true)}
            className="px-3 sm:px-4 py-2.5 rounded-xl bg-white border shadow-sm text-gray-700 hover:bg-gray-50"
          >
            Filters
          </button>
        </div>

        {/* Active filter pills */}
        {hasAnyFilter && (
          <div className="flex items-center flex-wrap gap-2">
            {selectedCategory && (
              <button onClick={() => setSelectedCategory('')} className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm">Category: {selectedCategory} ✕</button>
            )}
            {selectedStore && (
              <button onClick={() => setSelectedStore('')} className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm">Store ✕</button>
            )}
            {(priceRange.min !== PRICE_MIN || priceRange.max !== PRICE_MAX) && (
              <button onClick={() => setPriceRange({ min: PRICE_MIN, max: PRICE_MAX })} className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm">₦{priceRange.min} - ₦{priceRange.max} ✕</button>
            )}
            {(sortBy !== 'newest') && (
              <button onClick={() => setSortBy('newest')} className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm">Sort: {sortBy} ✕</button>
            )}
            <button onClick={clearFilters} className="ml-auto text-sm text-emerald-700 hover:underline">Reset</button>
          </div>
        )}
      </div>

      {/* Quick category chips (single row) */}
      {categories.length > 0 && (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          {["", ...categories.slice(0, 10)].map((cat, idx) => (
            <button
              key={cat || `all-${idx}`}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`${selectedCategory === cat ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} px-3 py-1.5 rounded-full text-sm transition whitespace-nowrap`}
            >
              {cat ? cat : 'All'}
            </button>
          ))}
        </div>
      )}

      {/* Slide-over advanced filters */}
      {isFiltersOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setIsFiltersOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl p-4 sm:p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">Filters</h4>
              <button onClick={() => setIsFiltersOpen(false)} className="text-gray-500 hover:text-gray-700">Close</button>
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full appearance-none pl-4 pr-10 py-3 rounded-xl bg-gray-50 border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M12 14.5a.75.75 0 0 1-.53-.22l-4-4a.75.75 0 1 1 1.06-1.06L12 12.69l3.47-3.47a.75.75 0 0 1 1.06 1.06l-4 4a.75.75 0 0 1-.53.22Z" clipRule="evenodd" /></svg>
                </span>
              </div>
            </div>

            {/* Store */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Store</label>
              <div className="relative">
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full appearance-none pl-4 pr-10 py-3 rounded-xl bg-gray-50 border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                >
                  <option value="">All Stores</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.vendorId}>{store.name || store.storeName || 'Unnamed Store'}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M12 14.5a.75.75 0 0 1-.53-.22l-4-4a.75.75 0 1 1 1.06-1.06L12 12.69l3.47-3.47a.75.75 0 0 1 1.06 1.06l-4 4a.75.75 0 0 1-.53.22Z" clipRule="evenodd" /></svg>
                </span>
              </div>
            </div>

            {/* Price Range Filter - styled dual slider */}
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Price Range: ₦{priceRange.min} - ₦{priceRange.max}</label>
              <div className="price-range relative mb-3 pt-3">
                <div className="absolute left-0 right-0 top-1.5 h-2 rounded-full bg-gray-200" />
                <div className="absolute top-1.5 h-2 rounded-full bg-emerald-500" style={{ left: `${minPercent}%`, width: `${Math.max(0, maxPercent - minPercent)}%` }} />
                <input type="range" min={PRICE_MIN} max={PRICE_MAX} step={100} value={Math.min(priceRange.min, priceRange.max)} onChange={(e) => { const newMin = parseInt(e.target.value) || PRICE_MIN; setPriceRange(prev => ({ ...prev, min: Math.min(newMin, prev.max) })); }} className="absolute inset-x-0 top-0 w-full appearance-none bg-transparent" style={{ zIndex: 30 }} />
                <input type="range" min={PRICE_MIN} max={PRICE_MAX} step={100} value={Math.max(priceRange.min, priceRange.max)} onChange={(e) => { const newMax = parseInt(e.target.value) || PRICE_MIN; setPriceRange(prev => ({ ...prev, max: Math.max(newMax, prev.min) })); }} className="absolute inset-x-0 top-0 w-full appearance-none bg-transparent" style={{ zIndex: 20 }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={priceRange.min} onChange={(e) => setPriceRange(prev => ({ ...prev, min: parseInt(e.target.value) || PRICE_MIN }))} className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white" placeholder="Min price" />
                <input type="number" value={priceRange.max} onChange={(e) => setPriceRange(prev => ({ ...prev, max: parseInt(e.target.value) || PRICE_MAX }))} className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white" placeholder="Max price" />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center gap-3">
              <button onClick={() => { setIsFiltersOpen(false); searchProducts(); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg">Apply filters</button>
              <button onClick={clearFilters} className="text-gray-700 hover:underline">Reset</button>
            </div>

            {isLoading && (
              <div className="mt-4 flex items-center text-gray-600 text-sm"><span className="h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-2"/> Searching...</div>
            )}
          </div>
        </div>
      )}

      {/* Hidden block keeps slider CSS in scope when panel opens */}
      <div className="hidden">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Price Range: ₦{priceRange.min} - ₦{priceRange.max}
        </label>
        <div className="price-range relative mb-3 pt-3">
          <div className="absolute left-0 right-0 top-1.5 h-2 rounded-full bg-gray-200" />
          <div
            className="absolute top-1.5 h-2 rounded-full bg-emerald-500"
            style={{ left: `${minPercent}%`, width: `${Math.max(0, maxPercent - minPercent)}%` }}
          />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="number"
            value={priceRange.min}
            onChange={(e) => setPriceRange(prev => ({ ...prev, min: parseInt(e.target.value) || PRICE_MIN }))}
            placeholder="Min price"
            className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all duration-200"
          />
          <input
            type="number"
            value={priceRange.max}
            onChange={(e) => setPriceRange(prev => ({ ...prev, max: parseInt(e.target.value) || PRICE_MAX }))}
            placeholder="Max price"
            className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all duration-200"
          />
        </div>
      </div>

      {isLoading && (
        <div className="mt-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent"></div>
          <span className="ml-2 text-sm text-gray-600">Searching...</span>
        </div>
      )}

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
  );
};

export default ProductSearchFilter;

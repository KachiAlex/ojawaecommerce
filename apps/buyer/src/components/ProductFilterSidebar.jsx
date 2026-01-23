import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

const ProductFilterSidebar = ({ 
  products = [], 
  onFilterChange, 
  categories = [],
  brands = [],
  sizes = [],
  isOpen = true,
  onClose,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
  showSearch = true
}) => {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [expressDelivery, setExpressDelivery] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000000 });
  const [priceInputs, setPriceInputs] = useState({ min: 0, max: 10000000 });
  const [discountPercentage, setDiscountPercentage] = useState(null);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [brandSearch, setBrandSearch] = useState('');
  const [isPriceApplied, setIsPriceApplied] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  const buildFiltersPayload = () => ({
    searchQuery: localSearchQuery,
    categories: selectedCategories,
    expressDelivery,
    priceRange: isPriceApplied ? priceRange : null,
    discountPercentage,
    brands: selectedBrands,
    sizes: selectedSizes
  });

  // Calculate min/max prices from products
  const calculatedPriceRange = useMemo(() => {
    if (!products || products.length === 0) return { min: 0, max: 10000000 };
    
    const prices = products
      .map(p => parseFloat(p.price) || 0)
      .filter(p => p > 0);
    
    if (prices.length === 0) return { min: 0, max: 10000000 };
    
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices))
    };
  }, [products]);

  // Initialize price range from products
  useEffect(() => {
    if (calculatedPriceRange.min !== 0 || calculatedPriceRange.max !== 10000000) {
      setPriceRange(calculatedPriceRange);
      setPriceInputs(calculatedPriceRange);
    }
  }, [calculatedPriceRange]);

  // Extract unique brands from products
  const availableBrands = useMemo(() => {
    const brandSet = new Set();
    products.forEach(product => {
      if (product.brand) brandSet.add(product.brand);
    });
    return Array.from(brandSet).sort();
  }, [products]);

  // Extract unique sizes from products
  const availableSizes = useMemo(() => {
    const sizeSet = new Set();
    products.forEach(product => {
      if (product.size) {
        if (Array.isArray(product.size)) {
          product.size.forEach(s => sizeSet.add(s));
        } else {
          sizeSet.add(product.size);
        }
      }
      if (product.sizes && Array.isArray(product.sizes)) {
        product.sizes.forEach(s => sizeSet.add(s));
      }
    });
    return Array.from(sizeSet).sort();
  }, [products]);

  // Filter brands by search
  const filteredBrands = useMemo(() => {
    if (!brandSearch) return availableBrands;
    const searchLower = brandSearch.toLowerCase();
    return availableBrands.filter(brand => 
      brand.toLowerCase().includes(searchLower)
    );
  }, [availableBrands, brandSearch]);

  // Calculate discount percentage for a product
  const getDiscountPercentage = (product) => {
    if (!product.originalPrice || !product.price) return 0;
    const original = parseFloat(product.originalPrice);
    const current = parseFloat(product.price);
    if (original <= current) return 0;
    return Math.round(((original - current) / original) * 100);
  };

  // Sync search query from parent
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  // Apply filters and notify parent
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(buildFiltersPayload());
    }
  }, [
    localSearchQuery,
    selectedCategories,
    expressDelivery,
    priceRange,
    isPriceApplied,
    discountPercentage,
    selectedBrands,
    selectedSizes,
    onFilterChange
  ]);

  // Handle search input change
  const handleSearchChange = (value) => {
    setLocalSearchQuery(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  const handleSearchSubmit = () => {
    if (onSearchChange) {
      onSearchChange(localSearchQuery);
    }
    if (onSearchSubmit) {
      onSearchSubmit(localSearchQuery);
    }
    if (onFilterChange) {
      onFilterChange(buildFiltersPayload());
    }
  };

  // Handle category toggle
  const toggleCategory = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Handle brand toggle
  const toggleBrand = (brand) => {
    setSelectedBrands(prev => 
      prev.includes(brand)
        ? prev.filter(b => b !== brand)
        : [...prev, brand]
    );
  };

  // Handle size toggle
  const toggleSize = (size) => {
    setSelectedSizes(prev => 
      prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  // Handle price slider change
  const handlePriceSliderChange = (type, value) => {
    const numValue = parseInt(value);
    if (type === 'min') {
      const newMin = Math.min(numValue, priceRange.max - 1000);
      setPriceRange(prev => ({ ...prev, min: newMin }));
      setPriceInputs(prev => ({ ...prev, min: newMin }));
    } else {
      const newMax = Math.max(numValue, priceRange.min + 1000);
      setPriceRange(prev => ({ ...prev, max: newMax }));
      setPriceInputs(prev => ({ ...prev, max: newMax }));
    }
    setIsPriceApplied(false);
  };

  // Handle price input change
  const handlePriceInputChange = (type, value) => {
    const numValue = parseInt(value) || 0;
    setPriceInputs(prev => ({ ...prev, [type]: numValue }));
  };

  // Apply price filter
  const applyPriceFilter = () => {
    setPriceRange(priceInputs);
    setIsPriceApplied(true);
  };

  // Calculate slider percentages
  const minPercent = ((priceRange.min - calculatedPriceRange.min) / (calculatedPriceRange.max - calculatedPriceRange.min)) * 100;
  const maxPercent = ((priceRange.max - calculatedPriceRange.min) / (calculatedPriceRange.max - calculatedPriceRange.min)) * 100;

  // Clear all filters
  const clearFilters = () => {
    setLocalSearchQuery('');
    if (onSearchChange) {
      onSearchChange('');
    }
    setSelectedCategories([]);
    setExpressDelivery(false);
    setPriceRange(calculatedPriceRange);
    setPriceInputs(calculatedPriceRange);
    setIsPriceApplied(false);
    setDiscountPercentage(null);
    setSelectedBrands([]);
    setSelectedSizes([]);
    setBrandSearch('');
  };

  // Count active filters
  const activeFilterCount = 
    (localSearchQuery && localSearchQuery.trim() ? 1 : 0) +
    selectedCategories.length +
    (expressDelivery ? 1 : 0) +
    (isPriceApplied ? 1 : 0) +
    (discountPercentage !== null ? 1 : 0) +
    selectedBrands.length +
    selectedSizes.length;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="w-64 bg-slate-900 border-r border-emerald-900/60 h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin"
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-900/60 pb-2 sticky top-0 bg-slate-900 z-10 -mt-4 pt-4 -mx-4 px-4">
          <h2 className="text-lg font-bold text-white">Filters</h2>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-teal-300 hover:text-teal-200"
            >
              Clear ({activeFilterCount})
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-teal-200 hover:text-white lg:hidden"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search Section - conditionally rendered */}
        {showSearch && (
          <div>
            <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">
              SEARCH PRODUCTS
            </h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={localSearchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchSubmit();
                    }
                  }}
                  placeholder="Search products..."
                  className="w-full px-3 py-2 pl-10 pr-9 bg-slate-800 border border-emerald-900/60 rounded-lg text-sm text-white placeholder-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-teal-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {localSearchQuery && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-teal-400 hover:text-teal-300"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                onClick={handleSearchSubmit}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors"
                aria-label="Apply search"
              >
                Search
              </button>
            </div>
          </div>
        )}

        {/* CATEGORY Section */}
        <div>
          <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">
            CATEGORY
          </h3>
          <div className="space-y-1.5">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategories.includes(category)
                    ? 'bg-emerald-900/40 text-emerald-200 border border-emerald-700/60'
                    : 'text-teal-200 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* EXPRESS DELIVERY Section */}
        <div>
          <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">
            EXPRESS DELIVERY
          </h3>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={expressDelivery}
              onChange={(e) => setExpressDelivery(e.target.checked)}
              className="w-4 h-4 rounded border-emerald-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-2"
            />
            <span className="text-sm text-teal-200">OJawa Express</span>
            <span className="text-teal-400 text-xs cursor-help" title="Fast delivery within 24-48 hours">
              ℹ️
            </span>
          </label>
        </div>

        {/* PRICE Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              PRICE (₦)
            </h3>
            <button
              onClick={applyPriceFilter}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300"
            >
              Apply
            </button>
          </div>
          
          {/* Price Slider */}
          <div className="relative mb-3">
            <div className="relative h-2 bg-slate-800 rounded-full">
              {/* Active range */}
              <div
                className="absolute h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                style={{
                  left: `${minPercent}%`,
                  width: `${maxPercent - minPercent}%`
                }}
              />
              
              {/* Min handle */}
              <input
                type="range"
                min={calculatedPriceRange.min}
                max={calculatedPriceRange.max}
                value={priceRange.min}
                onChange={(e) => handlePriceSliderChange('min', e.target.value)}
                className="absolute w-full h-2 opacity-0 cursor-pointer z-10"
                style={{ left: 0 }}
              />
              
              {/* Max handle */}
              <input
                type="range"
                min={calculatedPriceRange.min}
                max={calculatedPriceRange.max}
                value={priceRange.max}
                onChange={(e) => handlePriceSliderChange('max', e.target.value)}
                className="absolute w-full h-2 opacity-0 cursor-pointer z-10"
                style={{ left: 0 }}
              />
              
              {/* Visual handles */}
              <div
                className="absolute w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950 -top-1 transform -translate-x-1/2 cursor-pointer shadow-lg"
                style={{ left: `${minPercent}%` }}
              />
              <div
                className="absolute w-4 h-4 bg-teal-500 rounded-full border-2 border-slate-950 -top-1 transform -translate-x-1/2 cursor-pointer shadow-lg"
                style={{ left: `${maxPercent}%` }}
              />
            </div>
          </div>

          {/* Price Inputs */}
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={priceInputs.min}
              onChange={(e) => handlePriceInputChange('min', e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-800 border border-emerald-900/60 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Min"
            />
            <span className="text-teal-200">-</span>
            <input
              type="number"
              value={priceInputs.max}
              onChange={(e) => handlePriceInputChange('max', e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-800 border border-emerald-900/60 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Max"
            />
          </div>
        </div>

        {/* DISCOUNT PERCENTAGE Section */}
        <div>
          <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">
            DISCOUNT PERCENTAGE
          </h3>
          <div className="space-y-1.5">
            {[50, 40, 30, 20, 10].map((percent) => (
              <label key={percent} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="discount"
                  checked={discountPercentage === percent}
                  onChange={() => setDiscountPercentage(percent)}
                  className="w-4 h-4 border-emerald-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm text-teal-200">{percent}% or more</span>
              </label>
            ))}
          </div>
        </div>

        {/* BRAND Section */}
        {availableBrands.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">
              BRAND
            </h3>
            
            {/* Brand Search */}
            <div className="relative mb-2">
              <input
                type="text"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                placeholder="Search"
                className="w-full px-3 py-2 pl-8 bg-slate-800 border border-emerald-900/60 rounded-lg text-sm text-white placeholder-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <svg
                className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-teal-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Brand List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin">
              {filteredBrands.map((brand) => (
                <label key={brand} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => toggleBrand(brand)}
                    className="w-4 h-4 rounded border-emerald-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-2"
                  />
                  <span className="text-sm text-teal-200">{brand}</span>
                </label>
              ))}
              {filteredBrands.length === 0 && (
                <p className="text-xs text-teal-400 text-center py-2">No brands found</p>
              )}
            </div>
          </div>
        )}

        {/* SIZE Section */}
        {availableSizes.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">
              SIZE
            </h3>
            <div className="space-y-1.5">
              {availableSizes.map((size) => (
                <label key={size} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSizes.includes(size)}
                    onChange={() => toggleSize(size)}
                    className="w-4 h-4 rounded border-emerald-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-2"
                  />
                  <span className="text-sm text-teal-200">{size}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ProductFilterSidebar;


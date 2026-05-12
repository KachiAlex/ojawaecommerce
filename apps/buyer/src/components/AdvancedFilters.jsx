import { useState, useEffect } from 'react';

const AdvancedFilters = ({ 
  categories = [], 
  onFiltersChange, 
  initialFilters = {},
  brands = [],
  conditions = ['New', 'Used', 'Refurbished'],
  isOpen = false,
  onToggle
}) => {
  const [filters, setFilters] = useState({
    category: initialFilters.category || 'all',
    priceRange: initialFilters.priceRange || { min: 0, max: 100000 },
    brand: initialFilters.brand || 'all',
    condition: initialFilters.condition || 'all',
    inStock: initialFilters.inStock ?? true,
    minRating: initialFilters.minRating || 0,
    ...initialFilters
  });

  const [localPriceRange, setLocalPriceRange] = useState(filters.priceRange);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handlePriceRangeChange = (type, value) => {
    const newRange = { ...localPriceRange, [type]: parseFloat(value) || 0 };
    setLocalPriceRange(newRange);
    // Debounce the actual filter update
    setTimeout(() => {
      setFilters(prev => ({ ...prev, priceRange: newRange }));
    }, 300);
  };

  const clearFilters = () => {
    const defaultFilters = {
      category: 'all',
      priceRange: { min: 0, max: 100000 },
      brand: 'all',
      condition: 'all',
      inStock: true,
      minRating: 0
    };
    setFilters(defaultFilters);
    setLocalPriceRange(defaultFilters.priceRange);
  };

  const hasActiveFilters = 
    filters.category !== 'all' ||
    filters.brand !== 'all' ||
    filters.condition !== 'all' ||
    filters.priceRange.min > 0 ||
    filters.priceRange.max < 100000 ||
    filters.minRating > 0 ||
    !filters.inStock;

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 transition-all duration-300 ${isOpen ? 'block' : 'hidden lg:block'}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Clear All
          </button>
        )}
        <button
          onClick={onToggle}
          className="lg:hidden text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-6">
        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price Range: ₦{localPriceRange.min.toLocaleString()} - ₦{localPriceRange.max.toLocaleString()}
          </label>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={localPriceRange.min}
                onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                placeholder="Min"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="number"
                value={localPriceRange.max}
                onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                placeholder="Max"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <input
              type="range"
              min="0"
              max="100000"
              value={localPriceRange.max}
              onChange={(e) => {
                const newMax = parseInt(e.target.value);
                setLocalPriceRange(prev => ({ ...prev, max: newMax }));
                handlePriceRangeChange('max', newMax);
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Brand Filter */}
        {brands.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
            <select
              value={filters.brand}
              onChange={(e) => handleFilterChange('brand', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Brands</option>
              {brands.map(brand => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Condition Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
          <select
            value={filters.condition}
            onChange={(e) => handleFilterChange('condition', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Conditions</option>
            {conditions.map(condition => (
              <option key={condition} value={condition.toLowerCase()}>
                {condition}
              </option>
            ))}
          </select>
        </div>

        {/* Stock Availability */}
        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.inStock}
              onChange={(e) => handleFilterChange('inStock', e.target.checked)}
              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
            />
            <span className="text-sm font-medium text-gray-700">In Stock Only</span>
          </label>
        </div>

        {/* Minimum Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Rating: {filters.minRating > 0 ? `${filters.minRating}+ ⭐` : 'Any'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={filters.minRating}
              onChange={(e) => handleFilterChange('minRating', parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-600 w-12 text-right">
              {filters.minRating > 0 ? filters.minRating.toFixed(1) : 'Any'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFilters;


import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoadingSpinner } from './LoadingStates'

const AdvancedSearch = ({ onSearch, onFiltersChange, initialFilters = {} }) => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState({
    searchTerm: '',
    category: 'all',
    priceRange: { min: '', max: '' },
    rating: '',
    sortBy: 'relevance',
    inStock: false,
    ...initialFilters
  })
  
  const [showFilters, setShowFilters] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef(null)

  // Initialize filters from URL params
  useEffect(() => {
    const urlFilters = {
      searchTerm: searchParams.get('q') || '',
      category: searchParams.get('category') || 'all',
      priceRange: {
        min: searchParams.get('minPrice') || '',
        max: searchParams.get('maxPrice') || ''
      },
      rating: searchParams.get('rating') || '',
      sortBy: searchParams.get('sort') || 'relevance',
      inStock: searchParams.get('inStock') === 'true'
    }
    setFilters(urlFilters)
  }, [searchParams])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      updateURL()
      if (onSearch) {
        setIsSearching(true)
        onSearch(filters).finally(() => setIsSearching(false))
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [filters])

  const updateURL = () => {
    const params = new URLSearchParams()
    
    if (filters.searchTerm) params.set('q', filters.searchTerm)
    if (filters.category !== 'all') params.set('category', filters.category)
    if (filters.priceRange.min) params.set('minPrice', filters.priceRange.min)
    if (filters.priceRange.max) params.set('maxPrice', filters.priceRange.max)
    if (filters.rating) params.set('rating', filters.rating)
    if (filters.sortBy !== 'relevance') params.set('sort', filters.sortBy)
    if (filters.inStock) params.set('inStock', 'true')

    navigate(`/products?${params.toString()}`, { replace: true })
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
    if (onFiltersChange) {
      onFiltersChange({ ...filters, [key]: value })
    }
  }

  const handlePriceRangeChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      priceRange: {
        ...prev.priceRange,
        [key]: value
      }
    }))
  }

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      category: 'all',
      priceRange: { min: '', max: '' },
      rating: '',
      sortBy: 'relevance',
      inStock: false
    })
    navigate('/products', { replace: true })
  }

  const hasActiveFilters = filters.searchTerm || 
    filters.category !== 'all' || 
    filters.priceRange.min || 
    filters.priceRange.max || 
    filters.rating || 
    filters.sortBy !== 'relevance' || 
    filters.inStock

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Main Search Bar */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {isSearching ? (
                <LoadingSpinner size="sm" />
              ) : (
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
            <input
              type="text"
              placeholder="Search products, brands, categories..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-md border flex items-center gap-2 ${
              showFilters || hasActiveFilters
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="bg-emerald-500 text-white text-xs rounded-full px-2 py-1">
                {Object.values(filters).filter(v => 
                  v && (typeof v !== 'object' || (v.min || v.max))
                ).length}
              </span>
            )}
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="all">All Categories</option>
                  <option value="electronics">Electronics</option>
                  <option value="clothing">Clothing</option>
                  <option value="home">Home & Living</option>
                  <option value="beauty">Beauty</option>
                  <option value="sports">Sports</option>
                  <option value="books">Books</option>
                  <option value="toys">Toys</option>
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.priceRange.min}
                    onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.priceRange.max}
                    onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Rating
                </label>
                <select
                  value={filters.rating}
                  onChange={(e) => handleFilterChange('rating', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Any Rating</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                  <option value="2">2+ Stars</option>
                  <option value="1">1+ Stars</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="relevance">Relevance</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Rating</option>
                  <option value="newest">Newest</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>
            </div>

            {/* Additional Options */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="inStock"
                  type="checkbox"
                  checked={filters.inStock}
                  onChange={(e) => handleFilterChange('inStock', e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="inStock" className="ml-2 block text-sm text-gray-700">
                  In Stock Only
                </label>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-emerald-600 hover:text-emerald-500 font-medium"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quick Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => handleFilterChange('category', 'electronics')}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              filters.category === 'electronics'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Electronics
          </button>
          <button
            onClick={() => handleFilterChange('category', 'clothing')}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              filters.category === 'clothing'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Clothing
          </button>
          <button
            onClick={() => handleFilterChange('sortBy', 'price-low')}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              filters.sortBy === 'price-low'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Under $100
          </button>
          <button
            onClick={() => handleFilterChange('rating', '4')}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              filters.rating === '4'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Highly Rated
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdvancedSearch

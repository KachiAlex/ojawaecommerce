import { useState } from 'react';
import { useProductSearch } from '../hooks/useProductSearch';
import AdvancedSearch from '../components/AdvancedSearch';
import ProductCard from '../components/ProductCard';
import ProductQuickView from '../components/ProductQuickView';
import { ProductListSkeleton, LoadingSpinner } from '../components/LoadingStates';
import ComponentErrorBoundary from '../components/ComponentErrorBoundary';
import { errorLogger } from '../utils/errorLogger';

const Products = () => {
  const {
    products,
    allProducts,
    loading,
    error,
    filters,
    categories,
    totalCount,
    hasFilters
  } = useProductSearch()

  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [showFilters, setShowFilters] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showQuickView, setShowQuickView] = useState(false)

  const handleAddToCart = (product) => {
    // Show a toast notification instead of alert
    errorLogger.info(`Added ${product.name} to cart`, { productId: product.id })
  }

  const handleProductClick = (product) => {
    setSelectedProduct(product)
    setShowQuickView(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600">Loading products...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Products</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <ComponentErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Advanced Search Component */}
        <AdvancedSearch />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {hasFilters ? 'Search Results' : 'All Products'}
              </h1>
              <p className="text-gray-600 mt-1">
                {totalCount} {totalCount === 1 ? 'product' : 'products'} found
                {hasFilters && ' with current filters'}
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">View:</span>
              <div className="flex border border-gray-300 rounded-md">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {hasFilters && (
            <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Active filters:</span>
                  <div className="flex flex-wrap gap-2">
                    {filters.searchTerm && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        Search: {filters.searchTerm}
                        <button className="ml-1.5 inline-flex h-4 w-4 rounded-full inline-flex items-center justify-center text-emerald-400 hover:bg-emerald-200 hover:text-emerald-500 focus:outline-none focus:bg-emerald-500 focus:text-white">
                          <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                            <path strokeLinecap="round" strokeWidth="1.5" d="m1 1 6 6m0-6L1 7" />
                          </svg>
                        </button>
                      </span>
                    )}
                    {filters.category !== 'all' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Category: {filters.category}
                      </span>
                    )}
                    {(filters.priceRange.min || filters.priceRange.max) && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Price: ${filters.priceRange.min || '0'} - ${filters.priceRange.max || '∞'}
                      </span>
                    )}
                    {filters.rating && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Rating: {filters.rating}+ stars
                      </span>
                    )}
                    {filters.inStock && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        In Stock Only
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Products Grid/List */}
          {products.length > 0 ? (
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }>
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onClick={() => handleProductClick(product)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500 mb-6">
                {hasFilters
                  ? 'Try adjusting your search criteria or clearing some filters.'
                  : 'No products are available at the moment.'}
              </p>
              {hasFilters && (
                <button
                  onClick={() => window.location.href = '/products'}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}

          {/* Load More Button (for pagination) */}
          {products.length > 0 && products.length >= 20 && (
            <div className="mt-8 text-center">
              <button className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-50 transition-colors">
                Load More Products
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Product Quick View Modal */}
      <ProductQuickView
        product={selectedProduct}
        isOpen={showQuickView}
        onClose={() => {
          setShowQuickView(false)
          setSelectedProduct(null)
        }}
      />
    </ComponentErrorBoundary>
  )
};

export default Products;

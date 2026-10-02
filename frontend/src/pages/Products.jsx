import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../contexts/CartContext';
import { usePageTracking, useProductTracking, useClickTracking } from '../hooks/useAnalytics';
import { useProductFilters } from '../hooks/useProductFilters';
import ProductCard from '../components/ProductCard';
import Product3DCard from '../components/Product3DCard';
import { ProductListSkeleton } from '../components/SkeletonLoaders';
import ProductFilterSidebar from '../components/ProductFilterSidebar';
import ProductComparison from '../components/ProductComparison';
import WishlistButton from '../components/WishlistButton';
import Seo from '../components/Seo';
import RecentlyViewed from '../components/RecentlyViewed';

const Products = () => {
  const { addToCart } = useCart();
  const navigate = useNavigate();

  usePageTracking('Products List');
  useProductTracking();
  useClickTracking();

  const {
    products,
    pagination,
    loading,
    error,
    meta,
    filters,
    sortKey,
    hasActiveFilters,
    updateFilter,
    updateSort,
    loadMore,
    clearFilters,
    refetch,
  } = useProductFilters();

  const [viewMode, setViewMode] = useState('3D');
  const [showComparison, setShowComparison] = useState(false);
  const [compareProducts, setCompareProducts] = useState([]);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(true);

  const handleAddToCart = async (product) => {
    try {
      await addToCart(product, 1);
    } catch (err) {
      console.error('Failed to add product to cart:', err);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cart:error', {
          detail: { message: err.message || 'Failed to add product to cart' }
        }));
      }
    }
  };

  const handleCompareToggle = (productId) => {
    setCompareProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      }
      if (prev.length >= 4) {
        alert('You can compare up to 4 products at once');
        return prev;
      }
      return [...prev, productId];
    });
  };

  const handleSidebarFilterChange = (sidebarFilters) => {
    if (sidebarFilters.searchQuery !== undefined) {
      updateFilter('search', sidebarFilters.searchQuery);
    }
    if (sidebarFilters.categories && sidebarFilters.categories.length > 0) {
      updateFilter('category', sidebarFilters.categories[0]);
    } else if (sidebarFilters.categories && sidebarFilters.categories.length === 0) {
      updateFilter('category', 'all');
    }
    if (sidebarFilters.priceRange) {
      updateFilter('minPrice', sidebarFilters.priceRange.min || '');
      updateFilter('maxPrice', sidebarFilters.priceRange.max || '');
    }
    if (sidebarFilters.brands && sidebarFilters.brands.length > 0) {
      updateFilter('brand', sidebarFilters.brands[0]);
    } else if (sidebarFilters.brands && sidebarFilters.brands.length === 0) {
      updateFilter('brand', 'all');
    }
  };

  const handleSidebarSearchChange = (searchQuery) => {
    updateFilter('search', searchQuery);
  };

  const handleSidebarSearchSubmit = (searchQuery) => {
    updateFilter('search', searchQuery);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl sm:text-6xl mb-4">😞</div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-4">Something went wrong</h1>
            <p className="text-sm sm:text-base text-teal-200 mb-6 sm:mb-8 px-4">{error}</p>
            <button
              onClick={refetch}
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
      <Seo
        title="All Products"
        description="Browse all products on Ojawa — secure Pan-African marketplace with escrow protection."
        url="/products"
      />
      <div className="flex">
        {/* Filter Sidebar */}
        <div className="hidden lg:block">
          <ProductFilterSidebar
            products={products}
            onFilterChange={handleSidebarFilterChange}
            onSearchChange={handleSidebarSearchChange}
            onSearchSubmit={handleSidebarSearchSubmit}
            searchQuery={filters.search}
            categories={meta.categories}
            brands={meta.brands}
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
                products={products}
                onFilterChange={handleSidebarFilterChange}
                onSearchChange={handleSidebarSearchChange}
                onSearchSubmit={handleSidebarSearchSubmit}
                searchQuery={filters.search}
                categories={meta.categories}
                brands={meta.brands}
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
                Filters
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
                  2D
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
                  3D
                </button>
              </div>
            </div>
          </motion.div>

          {/* Sort Bar */}
          <motion.div
            className="flex items-center justify-between mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <p className="text-sm text-teal-200">
              {loading ? 'Loading...' : `${pagination?.totalItems || products.length} product${(pagination?.totalItems || products.length) !== 1 ? 's' : ''}`}
              {filters.search && ` for "${filters.search}"`}
            </p>
            <div className="flex items-center gap-2">
              <select
                value={sortKey}
                onChange={(e) => updateSort(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-emerald-900/60 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="relevance">Relevance</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Rating</option>
                <option value="newest">Newest</option>
              </select>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-teal-300 hover:text-teal-200 px-2 py-1"
                >
                  Clear
                </button>
              )}
            </div>
          </motion.div>

          {/* Products Grid */}
          <AnimatePresence mode="wait">
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
                <div className="text-6xl mb-4">🔍</div>
                <h2 className="text-xl font-semibold text-white mb-2">No products found</h2>
                <p className="text-teal-200 mb-4">
                  {filters.search ? `No products match "${filters.search}"` : 'No products available'}
                </p>
                <button
                  onClick={clearFilters}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-all duration-200"
                >
                  Clear Filters
                </button>
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
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  layout
                >
                  <AnimatePresence mode="wait">
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
                          <div className="absolute top-2 left-2 z-10">
                            <WishlistButton product={product} size="md" showText={false} />
                          </div>
                          <div className="absolute top-2 right-2 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompareToggle(product.id);
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
                  </AnimatePresence>
                </motion.div>

                {/* Load More Button */}
                {pagination?.hasNextPage && (
                  <motion.div
                    className="text-center mt-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <motion.button
                      onClick={loadMore}
                      disabled={loading}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-3 rounded-lg hover:from-emerald-400 hover:to-teal-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <motion.div
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
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
          </AnimatePresence>

          {/* Product Comparison Modal */}
          <ProductComparison
            isOpen={showComparison}
            onClose={() => {
              setShowComparison(false);
              setCompareProducts([]);
            }}
            productIds={compareProducts}
          />
        </div>
      </div>
      <RecentlyViewed />
    </motion.div>
  );
};

export default Products;

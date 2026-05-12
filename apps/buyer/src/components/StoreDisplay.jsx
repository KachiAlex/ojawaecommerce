import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { storeService, productTrackingService } from '../services/trackingService';
import { useCart } from '../contexts/CartContext';

const StoreDisplay = () => {
  const { storeId } = useParams();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { addToCart } = useCart();

  useEffect(() => {
    if (storeId) {
      fetchStoreData();
    }
  }, [storeId]);

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 StoreDisplay: Fetching store with ID:', storeId);

      // Fetch store information
      let storeData = await storeService.getStoreByTrackingId(storeId);
      
      // If not found by tracking ID, try to find by slug or other identifier
      if (!storeData) {
        console.log('🔄 StoreDisplay: Store not found by tracking ID, trying alternative lookup...');
        // This could be a slug-based lookup - we'll need to implement this
        // For now, we'll show an error but log the attempt
        console.log('🔍 StoreDisplay: Attempted lookup for:', storeId);
      }
      
      console.log('📦 StoreDisplay: Store data:', storeData);
      
      if (!storeData) {
        console.error('❌ StoreDisplay: Store not found for ID:', storeId);
        setError('Store not found');
        return;
      }

      if (!storeData.isActive) {
        console.warn('⚠️ StoreDisplay: Store is inactive');
        setError('This store is currently inactive');
        return;
      }

      setStore(storeData);

      // Fetch store products
      const storeProducts = await storeService.getProductsByStore(storeId);
      console.log('🛍️ StoreDisplay: Store products:', storeProducts);
      setProducts(storeProducts);
      setFilteredProducts(storeProducts);
    } catch (error) {
      console.error('❌ StoreDisplay: Error fetching store data:', error);
      setError('Error loading store. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort products
  useEffect(() => {
    let filtered = [...products];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        break;
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, sortBy, categoryFilter]);

  // Get unique categories from products
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const formatPrice = (price) => {
    return `₦${parseFloat(price || 0).toLocaleString()}`;
  };

  const getStockStatus = (product) => {
    const isOutOfStock = product.inStock === false || (product.stock || 0) <= 0;
    return {
      isOutOfStock,
      stock: product.stock || 0,
      label: isOutOfStock ? 'Out of Stock' : `In Stock (${product.stock || 0})`
    };
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading store...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-red-400 text-6xl mb-4">🏪</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Store Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            to="/"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Store Header */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
        {store.banner && (
          <div className="h-64 bg-cover bg-center" style={{ backgroundImage: `url(${store.banner})` }}>
            <div className="h-full bg-black bg-opacity-40 flex items-end">
              <div className="p-6 text-white">
                <h1 className="text-3xl font-bold">{store.name}</h1>
                <p className="text-lg opacity-90">{store.description}</p>
              </div>
            </div>
          </div>
        )}

        {!store.banner && (
          <div className="p-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <div className="flex items-center space-x-4">
              {store.logo && (
                <img
                  src={store.logo}
                  alt={`${store.name} logo`}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold">{store.name}</h1>
                <p className="text-lg opacity-90">{store.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Store Info Bar */}
        <div className="p-6 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{store.totalProducts || 0}</p>
              <p className="text-sm text-gray-600">Products</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{store.totalOrders || 0}</p>
              <p className="text-sm text-gray-600">Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{store.rating || 0}</p>
              <p className="text-sm text-gray-600">Rating</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{store.reviewCount || 0}</p>
              <p className="text-sm text-gray-600">Reviews</p>
            </div>
          </div>
        </div>
      </div>

      {/* Store Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Store Information */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Information</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Category</p>
                <p className="text-gray-900 capitalize">{store.category}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700">Store ID</p>
                <p className="text-blue-600 font-mono text-sm">{store.storeId}</p>
              </div>

              {store.settings.showContactInfo && (
                <>
                  {store.contactInfo.email && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email</p>
                      <a href={`mailto:${store.contactInfo.email}`} className="text-blue-600 hover:underline">
                        {store.contactInfo.email}
                      </a>
                    </div>
                  )}

                  {store.contactInfo.phone && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Phone</p>
                      <a href={`tel:${store.contactInfo.phone}`} className="text-blue-600 hover:underline">
                        {store.contactInfo.phone}
                      </a>
                    </div>
                  )}

                  {store.contactInfo.address && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Address</p>
                      <p className="text-gray-900">{store.contactInfo.address}</p>
                    </div>
                  )}
                </>
              )}

              <div>
                <p className="text-sm font-medium text-gray-700">Store Status</p>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  store.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {store.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Share Store */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Store link copied to clipboard!');
                }}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Share Store
              </button>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Products</h2>
            
            {/* Search and Filters */}
            <div className="space-y-4 mb-6">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Filters and Sort */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Category Filter */}
                {categories.length > 0 && (
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                )}

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Name: A-Z</option>
                </select>
              </div>

              {/* Results Count */}
              <p className="text-sm text-gray-600">
                Showing {filteredProducts.length} of {products.length} products
                {searchQuery && ` for "${searchQuery}"`}
              </p>
            </div>
          </div>

          {filteredProducts.length === 0 && products.length > 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Products Found</h3>
              <p className="text-gray-600">Try adjusting your search or filters.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                }}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear Filters
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Products Yet</h3>
              <p className="text-gray-600">This store doesn't have any products listed yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product);
                
                return (
                  <div key={product.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                    <Link to={`/products/${product.id}`}>
                      <div className="relative">
                        {product.image && (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-48 object-cover"
                          />
                        )}
                        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                          stockStatus.isOutOfStock 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {stockStatus.label}
                        </div>
                        <div className="absolute top-2 left-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                          {product.trackingNumber}
                        </div>
                      </div>
                    </Link>

                    <div className="p-4">
                      <Link to={`/products/${product.id}`}>
                        <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors mb-2">
                          {product.name}
                        </h3>
                      </Link>
                      
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {product.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xl font-bold text-green-600">
                            {formatPrice(product.price)}
                          </p>
                          {product.rating && (
                            <div className="flex items-center mt-1">
                              <span className="text-yellow-400">⭐</span>
                              <span className="text-sm text-gray-600 ml-1">
                                {product.rating} ({product.reviewCount || 0})
                              </span>
                            </div>
                          )}
                        </div>

                        <Link
                          to={`/products/${product.id}`}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            stockStatus.isOutOfStock
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {stockStatus.isOutOfStock ? 'View Details' : 'View & Buy'}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Store Footer */}
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-600">
          Store ID: <span className="font-mono text-blue-600">{store.storeId}</span> • 
          Created: <span className="text-gray-500">{new Date(store.createdAt?.toDate?.() || store.createdAt).toLocaleDateString()}</span>
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Powered by Ojawa E-commerce Platform
        </p>
      </div>
    </div>
  );
};

export default StoreDisplay;

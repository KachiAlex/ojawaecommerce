import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import firebaseService from '../services/firebaseService';
import ProductCard from './ProductCard';
import VendorProfileModal from './VendorProfileModal';
// import UnifiedVendorStore from './UnifiedVendorStore'; // Removed - not used and causing errors

const UnifiedStore = () => {
  const { vendorId } = useParams();
  const { currentUser, userProfile } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showVendorProfile, setShowVendorProfile] = useState(false);

  // Check if current user is viewing their own store
  const isOwnStore = currentUser && currentUser.uid === vendorId;
  const isVendor = userProfile?.isVendor;

  useEffect(() => {
    if (vendorId) {
      // Add a small delay to ensure Firestore has time to propagate updates
      const timeoutId = setTimeout(() => {
        fetchStoreData();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [vendorId]);

  const fetchStoreData = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 Fetching store for vendorId:', vendorId, '(Attempt:', retryCount + 1, ')');

      // Fetch vendor profile with cache bypass
      const vendorProfile = await firebaseService.users.getProfile(vendorId);
      console.log('👤 Vendor profile fetched:', vendorProfile);
      
      if (!vendorProfile) {
        // Retry logic for newly created vendors
        if (retryCount < 2) {
          console.warn('⚠️ Vendor profile not found, retrying in 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchStoreData(retryCount + 1);
        }
        console.error('❌ Vendor profile not found after retries');
        setError('Store not found. If you just completed onboarding, please wait a moment and refresh.');
        return;
      }

      if (!vendorProfile.isVendor) {
        console.error('❌ User is not marked as vendor. isVendor:', vendorProfile.isVendor);
        
        // Retry for newly onboarded vendors
        if (retryCount < 2) {
          console.warn('⚠️ Vendor flag not set, retrying in 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchStoreData(retryCount + 1);
        }
        setError('This user is not a vendor. If you just completed onboarding, please refresh the page.');
        return;
      }

      if (!vendorProfile.vendorProfile) {
        console.error('❌ Vendor profile data missing');
        
        // Retry for newly onboarded vendors
        if (retryCount < 2) {
          console.warn('⚠️ Vendor profile data missing, retrying in 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchStoreData(retryCount + 1);
        }
        setError('Vendor profile incomplete. Please complete vendor onboarding or refresh the page.');
        return;
      }

      console.log('✅ Vendor profile valid');
      setVendor(vendorProfile);

      // Fetch vendor's products
      console.log('📦 Fetching products for vendor:', vendorId);
      const vendorProducts = await firebaseService.products.getByVendor(vendorId);
      console.log('📦 Products fetched:', vendorProducts.length, 'products');
      
      setProducts(vendorProducts);
      setFilteredProducts(vendorProducts);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching store data:', error);
      
      // Retry on error
      if (retryCount < 2) {
        console.warn('⚠️ Error occurred, retrying in 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchStoreData(retryCount + 1);
      }
      
      setError('Error loading store. Please refresh the page or try again later.');
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

  const handleAddToCart = async (product) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    try {
      await addToCart(product);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading store...</p>
          <p className="text-gray-400 text-sm mt-2">This may take a moment for newly created stores</p>
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
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              🔄 Refresh Page
            </button>
            <Link
              to="/"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Store Header */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
        <div className="p-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-lg flex items-center justify-center bg-white/10 border border-white/30 backdrop-blur">
                <span className="text-3xl">🏪</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold">{vendor.vendorProfile.storeName}</h1>
                <p className="text-lg opacity-90">{vendor.vendorProfile.storeDescription}</p>
                <p className="text-sm opacity-75 mt-1">
                  By {vendor.displayName || vendor.email}
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-3">
              {isOwnStore && (
                <button
                  onClick={() => navigate('/vendor')}
                  className="ojawa-pill text-sm font-semibold px-4 py-2 rounded-lg"
                >
                  Manage Store
                </button>
              )}
              
              {!isOwnStore && (
                <button
                  onClick={() => setShowVendorProfile(true)}
                  className="ojawa-pill text-sm font-semibold px-4 py-2 rounded-lg"
                >
                  View Profile
                </button>
              )}
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Store link copied to clipboard!');
                }}
                className="ojawa-pill text-sm font-semibold px-4 py-2 rounded-lg"
              >
                Share Store
              </button>
            </div>
          </div>
        </div>

        {/* Store Info Bar */}
        <div className="p-6 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{products.length}</p>
              <p className="text-sm text-gray-600">Products</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{vendor.vendorProfile.businessType || 'General'}</p>
              <p className="text-sm text-gray-600">Category</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{vendor.vendorProfile.verificationStatus || 'Pending'}</p>
              <p className="text-sm text-gray-600">Status</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{new Date(vendor.vendorProfile.onboardedAt).toLocaleDateString()}</p>
              <p className="text-sm text-gray-600">Since</p>
            </div>
          </div>
        </div>
      </div>

      {/* Store Details & Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Store Information */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Information</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Business Name</p>
                <p className="text-gray-900">{vendor.vendorProfile.businessName}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700">Business Type</p>
                <p className="text-gray-900 capitalize">{vendor.vendorProfile.businessType}</p>
              </div>

              {vendor.vendorProfile.businessPhone && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Contact Phone</p>
                  <a href={`tel:${vendor.vendorProfile.businessPhone}`} className="text-blue-600 hover:underline">
                    {vendor.vendorProfile.businessPhone}
                  </a>
                </div>
              )}

              {vendor.vendorProfile.businessAddress && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Business Address</p>
                  <p className="text-gray-900 text-sm">{vendor.vendorProfile.businessAddress}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-700">Verification Status</p>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  vendor.vendorProfile.verificationStatus === 'verified' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {vendor.vendorProfile.verificationStatus || 'Pending'}
                </span>
              </div>
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
              {isOwnStore && (
                <button
                  onClick={() => navigate('/vendor')}
                  className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Products
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vendor Profile Modal */}
      {showVendorProfile && vendor && (
        <VendorProfileModal
          vendor={vendor}
          onClose={() => setShowVendorProfile(false)}
        />
      )}
    </div>
  );
};

export default UnifiedStore;

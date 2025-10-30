import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import firebaseService from '../services/firebaseService';
import ProductCard from './ProductCard';

const VendorStoreDisplay = () => {
  const { storeSlug } = useParams();
  const { currentUser } = useAuth();
  const { addToCart } = useCart();
  
  console.log('🏪 VendorStoreDisplay: Component loaded with storeSlug:', storeSlug);
  
  // Simple test to see if component is reached
  console.log('🏪 VendorStoreDisplay: Component is working! Store slug:', storeSlug);
  
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    console.log('🏪 VendorStoreDisplay: Component mounted with storeSlug:', storeSlug);
    fetchStoreData();
  }, [storeSlug]);

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🏪 VendorStoreDisplay: Fetching store data for storeSlug:', storeSlug);

      // Find vendor by store slug
      const vendors = await firebaseService.users.getAllUsers();
      const matchingVendor = vendors.find(user => {
        if (!user.vendorProfile) return false;
        
        const vendorStoreName = user.vendorProfile.storeName || user.vendorProfile.businessName || user.displayName || '';
        const vendorSlug = vendorStoreName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        
        return vendorSlug === storeSlug;
      });

      if (!matchingVendor) {
        setError('Store not found');
        return;
      }

      console.log('🏪 VendorStoreDisplay: Found matching vendor:', matchingVendor);
      setVendor(matchingVendor);

      // Get vendor's products
      const vendorProducts = await firebaseService.products.getByVendor(matchingVendor.uid);
      console.log('🏪 VendorStoreDisplay: Found products:', vendorProducts.length);
      
      setProducts(vendorProducts);
      setFilteredProducts(vendorProducts);

    } catch (error) {
      console.error('❌ VendorStoreDisplay: Error fetching store data:', error);
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

    // Sort products
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'price-low':
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, sortBy, categoryFilter]);

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log(`📋 ${type} link copied to clipboard:`, text);
    } catch (error) {
      console.error('❌ Failed to copy to clipboard:', error);
    }
  };

  const shareStore = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${vendor?.vendorProfile?.storeName || 'Store'}`,
          text: `Check out this store!`,
          url: window.location.href
        });
      } else {
        // Fallback to copying link
        await copyToClipboard(window.location.href, 'store');
      }
    } catch (error) {
      console.error('❌ Failed to share store:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading store...</p>
          <p className="text-sm text-gray-500 mt-2">Store Slug: {storeSlug}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Store Not Found</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                {vendor?.photoURL ? (
                  <img 
                    src={vendor.photoURL} 
                    alt={vendor.displayName}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">🏪</span>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {vendor?.vendorProfile?.storeName || vendor?.displayName || 'Store'}
                </h1>
                <p className="text-emerald-100 mt-1">
                  {vendor?.vendorProfile?.storeDescription || 'Welcome to my store!'}
                </p>
                <div className="flex items-center mt-2 space-x-4 text-sm">
                  <span>⭐ 4.8 (24 reviews)</span>
                  <span>📦 {products.length} products</span>
                  <span>🛒 {filteredProducts.length} available</span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => copyToClipboard(window.location.href, 'store')}
                className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition-colors"
              >
                📋 Copy Link
              </button>
              <button
                onClick={shareStore}
                className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition-colors"
              >
                📱 Share Store
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Store Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name A-Z</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">All Categories</option>
                {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products available</h3>
            <p className="text-gray-600 mb-6">This store doesn't have any products yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
                showVendorInfo={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorStoreDisplay;

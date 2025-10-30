import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { storeService } from '../services/trackingService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import firebaseService from '../services/firebaseService';
import ProductEditorModal from './ProductEditorModal';

const VendorStoreManager = ({ 
  products = [], 
  onEditProduct, 
  onDeleteProduct, 
  onCreateProduct,
  onRefreshProducts 
}) => {
  console.log('🏪 VendorStoreManager component loaded');
  const { currentUser, userProfile } = useAuth();
  const [activeStoreTab, setActiveStoreTab] = useState('overview');
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [storeSettings, setStoreSettings] = useState({
    businessName: '',
    storeDescription: '',
    storeSlug: '',
    contactEmail: '',
    contactPhone: '',
    contactAddress: '',
    showContactInfo: true,
  });

  useEffect(() => {
    console.log('🏪 VendorStoreManager useEffect triggered');
    console.log('  - userProfile:', userProfile);
    console.log('  - userProfile?.vendorProfile:', userProfile?.vendorProfile);
    if (userProfile?.vendorProfile) {
      const slug = userProfile.vendorProfile.storeSlug || 
                    userProfile.vendorProfile.storeName?.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      
      setStoreSettings({
        businessName: userProfile.vendorProfile.businessName || userProfile.vendorProfile.storeName || '',
        storeDescription: userProfile.vendorProfile.storeDescription || '',
        storeSlug: slug || '',
        contactEmail: userProfile.email || '',
        contactPhone: userProfile.vendorProfile.businessPhone || '',
        contactAddress: userProfile.vendorProfile.businessAddress || '',
        showContactInfo: true,
      });
      
      fetchOrCreateStore(slug);
    }
  }, [userProfile]);

  const fetchOrCreateStore = async (slug) => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // First, check if vendor already has any stores
      const existingStores = await storeService.getStoresByVendor(currentUser.uid);
      console.log('🔍 VendorStoreManager fetchOrCreateStore debug:');
      console.log('  - existingStores:', existingStores);
      console.log('  - existingStores.length:', existingStores.length);
      
      if (existingStores.length > 0) {
        // Use the first (most recent) store
        console.log('  - Using existing store:', existingStores[0]);
        setStore(existingStores[0]);
        return;
      }
      
      // Only create a new store if vendor has no stores at all
        const newStore = await storeService.createStore(currentUser.uid, {
          name: storeSettings.businessName || 'My Store',
          description: storeSettings.storeDescription || 'Welcome to my store',
          category: userProfile?.vendorProfile?.businessType || 'general',
          contactInfo: {
            email: storeSettings.contactEmail,
            phone: storeSettings.contactPhone,
            address: storeSettings.contactAddress,
          },
          settings: {
            isPublic: true,
            allowReviews: true,
            showContactInfo: storeSettings.showContactInfo,
          }
        });
        setStore(newStore);
    } catch (error) {
      console.error('Error fetching/creating store:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!userProfile || !currentUser) return;

    try {
      setSaving(true);
      
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        'vendorProfile.storeName': storeSettings.businessName,
        'vendorProfile.storeDescription': storeSettings.storeDescription,
        'vendorProfile.storeSlug': storeSettings.storeSlug,
        'vendorProfile.businessPhone': storeSettings.contactPhone,
        'vendorProfile.businessAddress': storeSettings.contactAddress,
        updatedAt: new Date()
      });

      alert('Store settings updated successfully!');
    } catch (error) {
      console.error('Error updating store settings:', error);
      alert('Failed to update store settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(label);
    setTimeout(() => setCopiedLink(''), 2000);
  };

  const getStoreLink = () => {
    console.log('🔍 VendorStoreManager getStoreLink debug:');
    console.log('  - store:', store);
    console.log('  - storeSettings:', storeSettings);
    console.log('  - storeSettings.businessName:', storeSettings.businessName);
    console.log('  - currentUser.displayName:', currentUser?.displayName);
    console.log('  - userProfile?.vendorProfile?.storeName:', userProfile?.vendorProfile?.storeName);
    
    // Use business name for consistency with store link format
    const storeName = storeSettings.businessName || 
                      userProfile?.vendorProfile?.storeName || 
                      store?.name || 
                      store?.storeName || 
                      currentUser?.displayName || 
                      'store';
    const storeSlug = storeName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    
    const link = `${window.location.origin}/store/${storeSlug}`;
    console.log('  - Generated vendor store link:', link);
    console.log('  - storeName used:', storeName);
    console.log('  - storeSlug generated:', storeSlug);
    console.log('  - store object keys:', store ? Object.keys(store) : 'store is null');
    console.log('  - store.name value:', store?.name);
    console.log('  - store.storeName value:', store?.storeName);
    return link;
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery || 
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (product.status || 'draft').toLowerCase() === statusFilter.toLowerCase();
    
    const matchesCategory = categoryFilter === 'all' || 
      product.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];

  // Product counts by status
  const productCounts = {
    all: products.length,
    active: products.filter(p => (p.status || '').toLowerCase() === 'active').length,
    pending: products.filter(p => (p.status || '').toLowerCase() === 'pending').length,
    draft: products.filter(p => !p.status || p.status.toLowerCase() === 'draft').length,
    'out of stock': products.filter(p => (p.status || '').toLowerCase() === 'out of stock').length,
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <p className="text-gray-600">Loading store information...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Store Header with Links */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border border-emerald-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Your Store</h2>
            <p className="text-sm text-gray-600">Manage your store, products, and settings</p>
          </div>
          <div className="text-4xl">🏪</div>
        </div>

        <div className="bg-white rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <p className="text-sm text-gray-600 mb-1">Store URL</p>
              <p className="font-mono text-blue-600 break-all">{getStoreLink()}</p>
            </div>
            <button
              onClick={() => copyToClipboard(getStoreLink(), 'store')}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
            >
              {copiedLink === 'store' ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href={getStoreLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-emerald-200 rounded-lg p-4 hover:bg-emerald-50 transition-colors text-center"
          >
            <div className="text-2xl mb-2">👁️</div>
            <p className="font-medium text-gray-900">Preview Store</p>
            <p className="text-xs text-gray-600 mt-1">See how customers view your store</p>
          </a>
          
          <button
            onClick={() => {
              const shareText = `Check out my store on Ojawa: ${getStoreLink()}`;
              if (navigator.share) {
                navigator.share({ title: storeSettings.businessName, text: shareText, url: getStoreLink() });
              } else {
                copyToClipboard(shareText, 'share');
              }
            }}
            className="bg-white border border-blue-200 rounded-lg p-4 hover:bg-blue-50 transition-colors"
          >
            <div className="text-2xl mb-2">📱</div>
            <p className="font-medium text-gray-900">Share Store</p>
            <p className="text-xs text-gray-600 mt-1">Share on social media</p>
          </button>
        </div>
      </div>

      {/* Store Tabs */}
      <div className="bg-white rounded-xl border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 px-6" aria-label="Store Tabs">
            <button
              onClick={() => setActiveStoreTab('overview')}
              className={`py-4 px-3 text-sm font-medium border-b-2 transition-colors ${
                activeStoreTab === 'overview'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveStoreTab('products')}
              className={`py-4 px-3 text-sm font-medium border-b-2 transition-colors ${
                activeStoreTab === 'products'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🛍️ Products ({products.length})
            </button>
            <button
              onClick={() => setActiveStoreTab('settings')}
              className={`py-4 px-3 text-sm font-medium border-b-2 transition-colors ${
                activeStoreTab === 'settings'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ⚙️ Settings
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeStoreTab === 'overview' && store && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{store.totalProducts || products.length}</p>
                <p className="text-sm text-gray-600">Products</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{store.totalOrders || 0}</p>
                <p className="text-sm text-gray-600">Orders</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{store.rating?.toFixed(1) || 0}</p>
                <p className="text-sm text-gray-600">Rating</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{store.reviewCount || 0}</p>
                <p className="text-sm text-gray-600">Reviews</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={onCreateProduct}
                  className="bg-emerald-600 text-white p-4 rounded-lg hover:bg-emerald-700 transition-colors text-left"
                >
                  <div className="text-2xl mb-2">➕</div>
                  <p className="font-medium">Add Product</p>
                  <p className="text-xs opacity-90 mt-1">Create a new product</p>
                </button>
                <button
                  onClick={() => setActiveStoreTab('products')}
                  className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors text-left"
                >
                  <div className="text-2xl mb-2">📦</div>
                  <p className="font-medium">View Products</p>
                  <p className="text-xs opacity-90 mt-1">Manage your inventory</p>
                </button>
                <button
                  onClick={() => setActiveStoreTab('settings')}
                  className="bg-gray-600 text-white p-4 rounded-lg hover:bg-gray-700 transition-colors text-left"
                >
                  <div className="text-2xl mb-2">⚙️</div>
                  <p className="font-medium">Store Settings</p>
                  <p className="text-xs opacity-90 mt-1">Customize your store</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeStoreTab === 'products' && (
          <div className="p-6 space-y-6">
            {/* Search and Filters */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search products by name, description, or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={onCreateProduct}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap font-medium"
                >
                  ➕ Add Product
                </button>
              </div>

              {/* Status Filters */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(productCounts).map(([status, count]) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === status
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
                  </button>
                ))}
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Category:</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="text-gray-400 text-6xl mb-4">📦</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' 
                    ? 'No products found' 
                    : 'No products yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Add your first product to get started'}
                </p>
                {!searchQuery && statusFilter === 'all' && categoryFilter === 'all' && (
                  <button
                    onClick={onCreateProduct}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                  >
                    ➕ Add Your First Product
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative h-48 bg-gray-100">
                      {product.images && product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl">
                          🖼️
                        </div>
                      )}
                      <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-medium ${
                        (product.status || '').toLowerCase() === 'active' ? 'bg-green-100 text-green-800' :
                        (product.status || '').toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        (product.status || '').toLowerCase() === 'out of stock' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {product.status || 'Draft'}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{product.category}</p>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold text-emerald-600">{product.price}</span>
                        <span className="text-sm text-gray-500">Stock: {product.stock || 0}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEditProduct(product)}
                          className="flex-1 bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            const productLink = `${window.location.origin}/products/${product.id}`;
                            navigator.clipboard.writeText(productLink);
                            alert('Product link copied!');
                          }}
                          className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Share
                        </button>
                        <button
                          onClick={() => onDeleteProduct(product)}
                          className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeStoreTab === 'settings' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Settings</h3>
              <p className="text-sm text-gray-600 mb-6">Customize how your store appears to customers</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name
              </label>
              <input
                type="text"
                value={storeSettings.businessName}
                onChange={(e) => setStoreSettings({ ...storeSettings, businessName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Your Business Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store Description
              </label>
              <textarea
                value={storeSettings.storeDescription}
                onChange={(e) => setStoreSettings({ ...storeSettings, storeDescription: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Tell customers about your store..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store URL Slug
              </label>
              <div className="flex items-center">
                <span className="text-gray-600 mr-2">{window.location.origin}/store/</span>
                <input
                  type="text"
                  value={storeSettings.storeSlug}
                  onChange={(e) => {
                    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    setStoreSettings({ ...storeSettings, storeSlug: slug });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="your-store-name"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Only lowercase letters, numbers, and hyphens</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={storeSettings.contactEmail}
                  onChange={(e) => setStoreSettings({ ...storeSettings, contactEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="store@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={storeSettings.contactPhone}
                  onChange={(e) => setStoreSettings({ ...storeSettings, contactPhone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="+234 xxx xxx xxxx"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Address
              </label>
              <input
                type="text"
                value={storeSettings.contactAddress}
                onChange={(e) => setStoreSettings({ ...storeSettings, contactAddress: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Your business address"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="showContactInfo"
                checked={storeSettings.showContactInfo}
                onChange={(e) => setStoreSettings({ ...storeSettings, showContactInfo: e.target.checked })}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <label htmlFor="showContactInfo" className="ml-2 text-sm text-gray-700">
                Show contact information on public store page
              </label>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {saving ? 'Saving...' : 'Save Store Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorStoreManager;

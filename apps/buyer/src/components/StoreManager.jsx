import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { storeService, productTrackingService } from '../services/trackingService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

const StoreManager = () => {
  const { currentUser } = useAuth();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [storeProducts, setStoreProducts] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general',
    logo: null,
    banner: null,
    contactInfo: {
      email: '',
      phone: '',
      address: ''
    },
    settings: {
      isPublic: true,
      allowReviews: true,
      showContactInfo: true
    }
  });

  useEffect(() => {
    if (currentUser) {
      fetchStores();
    }
  }, [currentUser]);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const userStores = await storeService.getStoresByVendor(currentUser.uid);
      setStores(userStores);

      // Fetch products for each store
      const productsPromises = userStores.map(async (store) => {
        const products = await storeService.getProductsByStore(store.storeId);
        return { storeId: store.storeId, products };
      });

      const productsResults = await Promise.all(productsPromises);
      const productsMap = {};
      productsResults.forEach(({ storeId, products }) => {
        productsMap[storeId] = products;
      });
      setStoreProducts(productsMap);
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleFileUpload = async (file, type) => {
    if (!file) return null;
    
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `stores/${currentUser.uid}/${type}/${Date.now()}-${safeName}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Upload images if provided
      let logoUrl = null;
      let bannerUrl = null;
      
      if (formData.logo) {
        logoUrl = await handleFileUpload(formData.logo, 'logo');
      }
      
      if (formData.banner) {
        bannerUrl = await handleFileUpload(formData.banner, 'banner');
      }

      const storeData = {
        ...formData,
        logo: logoUrl,
        banner: bannerUrl
      };

      let result;
      if (editingStore) {
        // Update existing store
        result = await storeService.updateStore(editingStore.id, storeData);
      } else {
        // Create new store
        result = await storeService.createStore(currentUser.uid, storeData);
      }

      // Reset form and refresh stores
      setFormData({
        name: '',
        description: '',
        category: 'general',
        logo: null,
        banner: null,
        contactInfo: {
          email: '',
          phone: '',
          address: ''
        },
        settings: {
          isPublic: true,
          allowReviews: true,
          showContactInfo: true
        }
      });
      setShowCreateForm(false);
      setEditingStore(null);
      fetchStores();
      
      alert(editingStore ? 'Store updated successfully!' : 'Store created successfully!');
    } catch (error) {
      console.error('Error saving store:', error);
      alert('Error saving store. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStore = (store) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      description: store.description,
      category: store.category,
      logo: null,
      banner: null,
      contactInfo: store.contactInfo,
      settings: store.settings
    });
    setShowCreateForm(true);
  };

  const handleDeleteStore = async (storeId) => {
    if (!window.confirm('Are you sure you want to delete this store? This action cannot be undone.')) {
      return;
    }

    try {
      // Note: In a real implementation, you'd want to handle product reassignment
      // For now, we'll just show a message
      alert('Store deletion functionality would be implemented here. Products should be reassigned or archived.');
    } catch (error) {
      console.error('Error deleting store:', error);
      alert('Error deleting store. Please try again.');
    }
  };

  const copyStoreLink = (shareableLink) => {
    const fullLink = `${window.location.origin}${shareableLink}`;
    navigator.clipboard.writeText(fullLink);
    alert('Store link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading stores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Store Management</h1>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create New Store
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Store Management Features</h3>
          <ul className="text-blue-700 space-y-1">
            <li>• Create multiple stores with unique tracking IDs</li>
            <li>• Each store has a shareable link for easy access</li>
            <li>• Assign products to specific stores</li>
            <li>• Track store performance and statistics</li>
            <li>• Customize store appearance and settings</li>
          </ul>
        </div>
      </div>

      {/* Create/Edit Store Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            {editingStore ? 'Edit Store' : 'Create New Store'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter store name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="electronics">Electronics</option>
                    <option value="fashion">Fashion</option>
                    <option value="home">Home & Garden</option>
                    <option value="sports">Sports & Outdoors</option>
                    <option value="books">Books & Media</option>
                    <option value="beauty">Beauty & Health</option>
                    <option value="automotive">Automotive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe your store..."
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="contactInfo.email"
                    value={formData.contactInfo.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="store@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="contactInfo.phone"
                    value={formData.contactInfo.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+234 800 000 0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    name="contactInfo.address"
                    value={formData.contactInfo.address}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Store address..."
                  />
                </div>
              </div>
            </div>

            {/* File Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store Logo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData(prev => ({ ...prev, logo: e.target.files[0] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store Banner
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData(prev => ({ ...prev, banner: e.target.files[0] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Store Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="settings.isPublic"
                    checked={formData.settings.isPublic}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Public Store</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="settings.allowReviews"
                    checked={formData.settings.allowReviews}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Allow Reviews</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="settings.showContactInfo"
                    checked={formData.settings.showContactInfo}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Show Contact Info</span>
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingStore(null);
                  setFormData({
                    name: '',
                    description: '',
                    category: 'general',
                    logo: null,
                    banner: null,
                    contactInfo: { email: '', phone: '', address: '' },
                    settings: { isPublic: true, allowReviews: true, showContactInfo: true }
                  });
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : (editingStore ? 'Update Store' : 'Create Store')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stores List */}
      <div className="space-y-6">
        {stores.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-gray-400 text-6xl mb-4">🏪</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Stores Yet</h3>
            <p className="text-gray-600 mb-6">Create your first store to start selling products</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Store
            </button>
          </div>
        ) : (
          stores.map((store) => (
            <div key={store.id} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-4">
                  {store.logo && (
                    <img
                      src={store.logo}
                      alt={`${store.name} logo`}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{store.name}</h3>
                    <p className="text-gray-600">{store.category}</p>
                    <p className="text-sm text-blue-600">ID: {store.storeId}</p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyStoreLink(store.shareableLink)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    Copy Link
                  </button>
                  <button
                    onClick={() => handleEditStore(store)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteStore(store.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {store.banner && (
                <img
                  src={store.banner}
                  alt={`${store.name} banner`}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}

              <p className="text-gray-700 mb-4">{store.description}</p>

              {/* Store Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{store.totalProducts || 0}</p>
                  <p className="text-sm text-gray-600">Products</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{store.totalOrders || 0}</p>
                  <p className="text-sm text-gray-600">Orders</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">₦{(store.totalRevenue || 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Revenue</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-orange-600">{store.rating || 0}</p>
                  <p className="text-sm text-gray-600">Rating</p>
                </div>
              </div>

              {/* Store Products Preview */}
              {storeProducts[store.storeId] && storeProducts[store.storeId].length > 0 && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Products in this Store</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {storeProducts[store.storeId].slice(0, 3).map((product) => (
                      <div key={product.id} className="bg-gray-50 p-3 rounded-lg">
                        <h5 className="font-medium text-gray-900">{product.name}</h5>
                        <p className="text-sm text-gray-600">₦{product.price?.toLocaleString()}</p>
                        <p className="text-xs text-blue-600">Track: {product.trackingNumber}</p>
                      </div>
                    ))}
                    {storeProducts[store.storeId].length > 3 && (
                      <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-center">
                        <p className="text-sm text-gray-600">
                          +{storeProducts[store.storeId].length - 3} more products
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StoreManager;

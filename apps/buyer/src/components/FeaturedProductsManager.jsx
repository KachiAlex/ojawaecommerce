import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

const FeaturedProductsManager = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Fetch all products and current featured products
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get all products
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const products = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Get featured products (products with isFeatured: true)
        const featured = products.filter(product => product.isFeatured === true);
        
        setAllProducts(products);
        setFeaturedProducts(featured);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Toggle featured status for a product
  const toggleFeatured = async (productId, isCurrentlyFeatured) => {
    try {
      setSaving(true);
      
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        isFeatured: !isCurrentlyFeatured,
        featuredAt: !isCurrentlyFeatured ? new Date() : null
      });

      // Update local state
      if (isCurrentlyFeatured) {
        setFeaturedProducts(prev => prev.filter(p => p.id !== productId));
      } else {
        const product = allProducts.find(p => p.id === productId);
        if (product) {
          setFeaturedProducts(prev => [...prev, { ...product, isFeatured: true, featuredAt: new Date() }]);
        }
      }

      // Update allProducts state
      setAllProducts(prev => 
        prev.map(p => 
          p.id === productId 
            ? { ...p, isFeatured: !isCurrentlyFeatured, featuredAt: !isCurrentlyFeatured ? new Date() : null }
            : p
        )
      );

    } catch (error) {
      console.error('Error updating featured status:', error);
      alert('Failed to update featured status. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Filter products based on search and category
  const filteredProducts = allProducts.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading products...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Featured Products Management</h2>
        <p className="text-gray-600">
          Select products to feature on the home page. Currently featuring {featuredProducts.length} products.
        </p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Products
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Featured Products Summary */}
      {featuredProducts.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Currently Featured Products ({featuredProducts.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {featuredProducts.map(product => (
              <div key={product.id} className="bg-white p-3 rounded border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500">${product.price}</p>
                  </div>
                  <button
                    onClick={() => toggleFeatured(product.id, true)}
                    disabled={saving}
                    className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Products List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            All Products ({filteredProducts.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredProducts.map(product => (
            <div key={product.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No Image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </h4>
                    <p className="text-sm text-gray-500 truncate">
                      {product.description}
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm font-medium text-green-600">
                        ${product.price}
                      </span>
                      <span className="text-xs text-gray-500">
                        {product.category}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        product.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {product.isFeatured ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Featured
                    </span>
                  ) : (
                    <button
                      onClick={() => toggleFeatured(product.id, false)}
                      disabled={saving}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : 'Make Featured'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">How it works:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Featured products appear on the home page</li>
          <li>• Only active products can be featured</li>
          <li>• You can feature as many products as you want</li>
          <li>• Changes take effect immediately</li>
        </ul>
      </div>
    </div>
  );
};

export default FeaturedProductsManager;

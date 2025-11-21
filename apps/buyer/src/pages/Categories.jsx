import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';

const Categories = () => {
  const { currentUser } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Sample categories with enhanced data
  const sampleCategories = [
    {
      id: 'fashion',
      name: 'Fashion',
      description: 'Clothing, accessories, and style items',
      icon: '👗',
      color: 'from-pink-100 to-pink-200',
      productCount: 1247,
      featured: true
    },
    {
      id: 'beauty',
      name: 'Beauty & Personal Care',
      description: 'Skincare, cosmetics, and wellness products',
      icon: '💄',
      color: 'from-purple-100 to-purple-200',
      productCount: 892,
      featured: true
    },
    {
      id: 'electronics',
      name: 'Electronics',
      description: 'Gadgets, accessories, and tech products',
      icon: '📱',
      color: 'from-blue-100 to-blue-200',
      productCount: 1563,
      featured: true
    },
    {
      id: 'home-living',
      name: 'Home & Living',
      description: 'Furniture, decor, and household items',
      icon: '🏠',
      color: 'from-green-100 to-green-200',
      productCount: 743,
      featured: false
    },
    {
      id: 'food',
      name: 'Food & Beverages',
      description: 'Local cuisine, ingredients, and drinks',
      icon: '🍽️',
      color: 'from-yellow-100 to-yellow-200',
      productCount: 456,
      featured: false
    },
    {
      id: 'crafts',
      name: 'Arts & Crafts',
      description: 'Handmade items and artistic creations',
      icon: '🎨',
      color: 'from-orange-100 to-orange-200',
      productCount: 678,
      featured: false
    },
    {
      id: 'services',
      name: 'Services',
      description: 'Professional and personal services',
      icon: '🔧',
      color: 'from-gray-100 to-gray-200',
      productCount: 234,
      featured: false
    },
    {
      id: 'agriculture',
      name: 'Agriculture',
      description: 'Farm products and agricultural supplies',
      icon: '🌾',
      color: 'from-emerald-100 to-emerald-200',
      productCount: 345,
      featured: false
    },
    {
      id: 'health',
      name: 'Health & Wellness',
      description: 'Medical supplies and health products',
      icon: '🏥',
      color: 'from-red-100 to-red-200',
      productCount: 189,
      featured: false
    },
    {
      id: 'sports',
      name: 'Sports & Fitness',
      description: 'Equipment and fitness accessories',
      icon: '⚽',
      color: 'from-indigo-100 to-indigo-200',
      productCount: 267,
      featured: false
    }
  ];

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        // Build categories from existing products' category field
        const allProducts = await firebaseService.products.getAll();
        const categoryMap = new Map();
        for (const p of allProducts) {
          const id = (p.category || 'Uncategorized');
          const current = categoryMap.get(id) || { id, name: id, description: '', icon: '🗂️', color: 'from-gray-100 to-gray-200', productCount: 0, featured: false };
          current.productCount += 1;
          categoryMap.set(id, current);
        }
        const derived = Array.from(categoryMap.values());
        if (derived.length > 0) {
          setCategories(derived);
        } else {
          setCategories(sampleCategories);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories(sampleCategories);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleCategoryClick = async (category) => {
    setSelectedCategory(category);
    setLoadingProducts(true);
    
    try {
      // Fetch products for this category
      const categoryProducts = await firebaseService.products.getByCategory(category.id || category.name);
      setProducts(categoryProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      // Use sample products as fallback
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const featuredCategories = categories.filter(cat => cat.featured);
  const otherCategories = categories.filter(cat => !cat.featured);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
              <p className="text-gray-600 mt-2">Explore products by category across Africa</p>
            </div>
            <Link
              to="/products"
              className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              View All Products
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Featured Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Featured Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredCategories.map((category) => (
              <div
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className="bg-white rounded-xl border hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className={`h-32 bg-gradient-to-br ${category.color} rounded-t-xl flex items-center justify-center`}>
                  <span className="text-6xl">{category.icon}</span>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{category.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{category.productCount} products</span>
                    <span className="text-emerald-600 group-hover:text-emerald-700 font-medium">
                      Explore →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">All Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {otherCategories.map((category) => (
              <div
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className="bg-white rounded-lg border hover:shadow-md transition-all cursor-pointer p-4 group"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${category.color} rounded-lg flex items-center justify-center`}>
                    <span className="text-2xl">{category.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.productCount} products</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Category Products */}
        {selectedCategory && (
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Products in {selectedCategory.name}
                </h3>
                <p className="text-gray-600">{products.length} products found</p>
              </div>
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {loadingProducts ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 rounded-lg h-48 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                      <span className="text-4xl">📦</span>
                    </div>
                    <div className="p-4">
                      <h4 className="font-medium text-gray-900 mb-2">{product.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">by {product.vendorName}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">{product.price}</span>
                        <Link
                          to={`/product/${product.id}`}
                          className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600 mb-4">No products available in this category yet.</p>
                <Link
                  to="/products"
                  className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Browse All Products
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Popular Searches */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Popular Searches</h2>
          <div className="flex flex-wrap gap-3">
            {[
              'Ankara dresses',
              'Shea butter',
              'Phone cases',
              'Handmade jewelry',
              'African art',
              'Traditional crafts',
              'Organic food',
              'Leather goods'
            ].map((search) => (
              <Link
                key={search}
                to={`/products?q=${encodeURIComponent(search)}`}
                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {search}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;


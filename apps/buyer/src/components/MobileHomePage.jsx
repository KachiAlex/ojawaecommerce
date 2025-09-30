import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MobilePullToRefresh from './MobilePullToRefresh';
import MobileProductCard from './MobileProductCard';
import MobileTouchHandler from './MobileTouchHandler';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';

const MobileHomePage = () => {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        firebaseService.products.getFeatured(8),
        firebaseService.products.getCategories()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddToCart = (product) => {
    // Add to cart logic
    console.log('Adding to cart:', product);
  };

  const handleAddToWishlist = (product) => {
    // Add to wishlist logic
    console.log('Adding to wishlist:', product);
  };

  const handleQuickView = (product) => {
    // Quick view logic
    console.log('Quick view:', product);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-lg h-48"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MobilePullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-6">
          <h1 className="text-2xl font-bold mb-2">Welcome to Ojawa</h1>
          <p className="text-emerald-100 mb-4">
            Discover amazing products with secure escrow payments
          </p>
          <Link
            to="/products"
            className="bg-white text-emerald-600 px-6 py-3 rounded-lg font-medium inline-block"
          >
            Shop Now
          </Link>
        </div>

        {/* Categories */}
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Categories</h2>
          <div className="flex space-x-4 overflow-x-auto pb-2">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/products?category=${category.name}`}
                className="flex-shrink-0 bg-white rounded-lg p-4 shadow-sm border border-gray-200 min-w-[120px] text-center"
              >
                <div className="text-2xl mb-2">{category.icon || '📦'}</div>
                <div className="text-sm font-medium text-gray-900">
                  {category.name}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Featured Products */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Featured Products</h2>
            <Link
              to="/products"
              className="text-emerald-600 text-sm font-medium"
            >
              View All
            </Link>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {products.map((product) => (
              <MobileProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                onAddToWishlist={handleAddToWishlist}
                onQuickView={handleQuickView}
              />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/wallet"
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center"
            >
              <div className="text-2xl mb-2">💰</div>
              <div className="text-sm font-medium text-gray-900">Wallet</div>
            </Link>
            
            <Link
              to="/enhanced-buyer"
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center"
            >
              <div className="text-2xl mb-2">📦</div>
              <div className="text-sm font-medium text-gray-900">My Orders</div>
            </Link>
          </div>
        </div>

        {/* How It Works */}
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">How It Works</h2>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <span className="text-sm text-gray-700">Browse and add products to cart</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <span className="text-sm text-gray-700">Pay securely with escrow protection</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <span className="text-sm text-gray-700">Confirm delivery and release payment</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobilePullToRefresh>
  );
};

export default MobileHomePage;

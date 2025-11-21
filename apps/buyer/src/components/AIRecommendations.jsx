import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import MobileProductCard from './MobileProductCard';

const AIRecommendations = ({ userId, limit = 6 }) => {
  const { currentUser } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (currentUser) {
      fetchRecommendations();
    }
  }, [currentUser]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      
      // Get user's order history for personalized recommendations
      const orderHistory = await firebaseService.orders.getUserOrders(currentUser.uid);
      const userPreferences = analyzeUserPreferences(orderHistory);
      
      // Generate AI recommendations based on preferences
      const aiRecommendations = await generateAIRecommendations(userPreferences);
      setRecommendations(aiRecommendations);
      
      // Get trending categories
      const trendingCategories = await getTrendingCategories();
      setCategories(trendingCategories);
      
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeUserPreferences = (orders) => {
    const preferences = {
      categories: {},
      priceRange: { min: Number.POSITIVE_INFINITY, max: 0 },
      brands: {},
      totalSpent: 0
    };

    orders.forEach(order => {
      order.items?.forEach(item => {
        // Category preferences
        if (item.category) {
          preferences.categories[item.category] = (preferences.categories[item.category] || 0) + 1;
        }
        
        // Price range analysis (defensive against strings/undefined)
        const numericPrice = Number(item.price);
        if (Number.isFinite(numericPrice) && numericPrice >= 0) {
          preferences.priceRange.min = Math.min(preferences.priceRange.min, numericPrice);
          preferences.priceRange.max = Math.max(preferences.priceRange.max, numericPrice);
        }
        
        // Brand preferences
        if (item.brand) {
          preferences.brands[item.brand] = (preferences.brands[item.brand] || 0) + 1;
        }
      });
      
      const numericTotal = Number(order.totalAmount);
      preferences.totalSpent += Number.isFinite(numericTotal) ? numericTotal : 0;
    });

    // Normalize min if no valid prices were found
    if (!Number.isFinite(preferences.priceRange.min)) {
      preferences.priceRange.min = 0;
    }
    return preferences;
  };

  const generateAIRecommendations = async (preferences) => {
    // Simulate AI recommendation algorithm
    const recommendations = [];
    
    // Get top categories
    const topCategories = Object.entries(preferences.categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    // Generate recommendations based on preferences
    for (const category of topCategories) {
      const products = await firebaseService.products.getByCategory(category, 2);
      recommendations.push(...products);
    }

    // Add trending products
    const trendingProducts = await firebaseService.products.getTrending(2);
    recommendations.push(...trendingProducts);

    // Add price-based recommendations (only if we have a sensible range)
    if (preferences.priceRange.max > 0) {
      const priceBasedProducts = await firebaseService.products.getByPriceRange(
        Math.max(0, preferences.priceRange.min || 0),
        preferences.priceRange.max,
        2
      );
      recommendations.push(...priceBasedProducts);
    }

    // Remove duplicates and limit results
    const uniqueRecommendations = recommendations.filter((product, index, self) => 
      index === self.findIndex(p => p.id === product.id)
    );

    return uniqueRecommendations.slice(0, limit);
  };

  const getTrendingCategories = async () => {
    // Simulate trending categories
    return [
      { name: 'Electronics', icon: '📱', trend: '+15%' },
      { name: 'Fashion', icon: '👕', trend: '+8%' },
      { name: 'Home & Garden', icon: '🏠', trend: '+12%' },
      { name: 'Sports', icon: '⚽', trend: '+5%' }
    ];
  };

  const handleAddToCart = (product) => {
    console.log('Adding to cart:', product);
    // Implement add to cart logic
  };

  const handleAddToWishlist = (product) => {
    console.log('Adding to wishlist:', product);
    // Implement add to wishlist logic
  };

  const handleQuickView = (product) => {
    console.log('Quick view:', product);
    // Implement quick view logic
  };

  if (loading) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">AI Recommendations</h3>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-48 mb-2"></div>
              <div className="bg-gray-200 rounded h-4 mb-1"></div>
              <div className="bg-gray-200 rounded h-4 w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">AI Recommendations</h3>
        <div className="flex items-center space-x-1 text-emerald-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span className="text-sm font-medium">Powered by AI</span>
        </div>
      </div>

      {/* Trending Categories */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Trending Categories</h4>
        <div className="flex space-x-3 overflow-x-auto pb-2">
          {categories.map((category, index) => (
            <div
              key={index}
              className="flex-shrink-0 bg-white rounded-lg p-3 shadow-sm border border-gray-200 min-w-[100px] text-center"
            >
              <div className="text-2xl mb-1">{category.icon}</div>
              <div className="text-xs font-medium text-gray-900">{category.name}</div>
              <div className="text-xs text-emerald-600">{category.trend}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Products */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Recommended for You</h4>
        <div className="grid grid-cols-2 gap-4">
          {recommendations.map((product) => (
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

      {/* AI Insights */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div>
            <h5 className="font-medium text-gray-900 mb-1">AI Insight</h5>
            <p className="text-sm text-gray-600">
              Based on your shopping history, we've found products that match your style and budget preferences. 
              These recommendations are updated in real-time as you shop.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIRecommendations;

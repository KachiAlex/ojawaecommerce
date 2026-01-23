import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import ProductCard from '../components/ProductCard';
import { ProductListSkeleton } from '../components/SkeletonLoaders';
import WishlistButton from '../components/WishlistButton';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const Wishlist = () => {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadWishlist = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get wishlist items
      const items = await firebaseService.wishlist.getWishlist(currentUser.uid);

      // Fetch full product details
      if (items.length > 0) {
        const productIds = items.map(item => item.productId);

        // Fetch products by their IDs
        const fetchedProducts = [];
        for (const productId of productIds) {
          try {
            const productDoc = await getDoc(doc(db, 'products', productId));
            if (productDoc.exists()) {
              fetchedProducts.push({ id: productDoc.id, ...productDoc.data() });
            }
          } catch (err) {
            console.error(`Error fetching product ${productId}:`, err);
          }
        }

        // Merge with wishlist data
        const mergedProducts = items.map(item => {
          const product = fetchedProducts.find(p => p.id === item.productId);
          return product ? { ...product, ...item } : null;
        }).filter(Boolean);

        setProducts(mergedProducts);
      }
    } catch (err) {
      console.error('Error loading wishlist:', err);
      setError('Failed to load wishlist. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">💝</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to view your wishlist</p>
          <Link
            to="/login"
            className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <ProductListSkeleton count={6} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadWishlist}
            className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Wishlist</h1>
          <p className="text-gray-600">
            {products.length === 0 
              ? 'Your wishlist is empty' 
              : `${products.length} item${products.length !== 1 ? 's' : ''} saved`}
          </p>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">💝</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Wishlist is Empty</h2>
            <p className="text-gray-600 mb-6">
              Start saving your favorite products for later!
            </p>
            <Link
              to="/products"
              className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product.id} className="relative">
                <WishlistButton 
                  product={product} 
                  size="md"
                  className="absolute top-2 right-2 z-10"
                />
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;


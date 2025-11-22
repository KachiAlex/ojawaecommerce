import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import WishlistButton from './WishlistButton';

const ProductComparison = ({ isOpen, onClose, productIds = [] }) => {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [maxCompare] = useState(4); // Maximum products to compare

  useEffect(() => {
    if (isOpen && productIds.length > 0) {
      loadProducts();
    }
  }, [isOpen, productIds]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const fetchedProducts = [];

      for (const productId of productIds.slice(0, maxCompare)) {
        try {
          const productDoc = await getDoc(doc(db, 'products', productId));
          if (productDoc.exists()) {
            fetchedProducts.push({
              id: productDoc.id,
              ...productDoc.data()
            });
          }
        } catch (err) {
          console.error(`Error fetching product ${productId}:`, err);
        }
      }

      setProducts(fetchedProducts);
    } catch (error) {
      console.error('Error loading products for comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeProduct = (productId) => {
    const updated = products.filter(p => p.id !== productId);
    setProducts(updated);
    if (updated.length === 0 && onClose) {
      onClose();
    }
  };

  const getFeatureValue = (product, feature) => {
    switch (feature) {
      case 'Price':
        return `₦${(product.price || 0).toLocaleString()}`;
      case 'Category':
        return product.category || 'N/A';
      case 'Brand':
        return product.brand || 'N/A';
      case 'Stock':
        const stock = product.stock || product.stockQuantity || 0;
        return stock > 0 ? `${stock} available` : 'Out of stock';
      case 'Rating':
        // Calculate average rating from reviews if available
        return product.averageRating ? `${product.averageRating.toFixed(1)} ⭐` : 'N/A';
      case 'Condition':
        return product.condition || 'New';
      case 'Warranty':
        return product.warranty || 'Not specified';
      case 'Shipping':
        return product.shippingCost ? `₦${product.shippingCost.toLocaleString()}` : 'Free';
      default:
        return 'N/A';
    }
  };

  const comparisonFeatures = [
    'Price',
    'Category',
    'Brand',
    'Stock',
    'Rating',
    'Condition',
    'Warranty',
    'Shipping'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full">
          {/* Header */}
          <div className="bg-emerald-600 px-4 py-3 sm:px-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              Compare Products ({products.length}/{maxCompare})
            </h3>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No products to compare</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-white z-10">
                        Features
                      </th>
                      {products.map((product) => (
                        <th key={product.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative min-w-[200px]">
                          <button
                            onClick={() => removeProduct(product.id)}
                            className="absolute top-0 right-0 text-gray-400 hover:text-gray-600"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Product Images and Names */}
                    <tr className="bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-gray-50 z-10">
                        Product
                      </td>
                      {products.map((product) => (
                        <td key={product.id} className="px-4 py-4">
                          <div className="flex flex-col items-center">
                            <Link
                              to={`/products/${product.id}`}
                              className="block mb-2"
                              onClick={onClose}
                            >
                              <img
                                src={product.image || product.images?.[0] || '/placeholder.png'}
                                alt={product.name}
                                className="w-32 h-32 object-cover rounded-lg"
                              />
                            </Link>
                            <Link
                              to={`/products/${product.id}`}
                              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 mb-2 text-center"
                              onClick={onClose}
                            >
                              {product.name}
                            </Link>
                            {currentUser && (
                              <WishlistButton product={product} size="sm" />
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Feature Comparisons */}
                    {comparisonFeatures.map((feature) => (
                      <tr key={feature} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-700 sticky left-0 bg-white z-10">
                          {feature}
                        </td>
                        {products.map((product) => (
                          <td key={product.id} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {getFeatureValue(product, feature)}
                          </td>
                        ))}
                      </tr>
                    ))}

                    {/* Description */}
                    <tr className="bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-700 sticky left-0 bg-gray-50 z-10">
                        Description
                      </td>
                      {products.map((product) => (
                        <td key={product.id} className="px-4 py-3 text-sm text-gray-900">
                          <p className="line-clamp-3">
                            {product.description || 'No description available'}
                          </p>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductComparison;


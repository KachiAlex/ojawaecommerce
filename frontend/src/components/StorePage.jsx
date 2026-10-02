import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStorefrontOptimized } from '../services/optimizedApiService';
import MessageVendorModal from './MessageVendorModal';

const StorePage = () => {
  const { storeSlug } = useParams();
  const { currentUser } = useAuth();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  console.log('🏪 StorePage component loaded with storeSlug:', storeSlug);

  const formatAddress = (addr) => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    const parts = [addr.street, addr.city, addr.state, addr.country].filter(Boolean);
    return parts.join(', ');
  };

  // Periodically refresh products to ensure they're always shown
  useEffect(() => {
    if (store && products.length > 0) {
      console.log('✅ StorePage: Products are loaded:', products.length);
    }
  }, [store, products]);

  // Share functions
  const copyProductLink = (product) => {
    const productUrl = `${window.location.origin}/products/${product.id}`;
    navigator.clipboard.writeText(productUrl).then(() => {
      alert('Product link copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = productUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Product link copied to clipboard!');
    });
  };

  const shareProduct = async (product) => {
    const productUrl = `${window.location.origin}/products/${product.id}`;
    const shareText = `Check out this product: ${product.name} - ${product.description}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: shareText,
          url: productUrl,
        });
      } catch (error) {
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback: copy to clipboard with share text
      const shareContent = `${shareText}\n\n${productUrl}`;
      navigator.clipboard.writeText(shareContent).then(() => {
        alert('Product details copied to clipboard! You can now paste it to share.');
      }).catch(() => {
        alert('Share not supported. Product link: ' + productUrl);
      });
    }
  };

  const copyStoreLink = () => {
    const storeUrl = window.location.href;
    navigator.clipboard.writeText(storeUrl).then(() => {
      alert('Store link copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = storeUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Store link copied to clipboard!');
    });
  };

  const shareStore = async () => {
    const storeUrl = window.location.href;
    const storeName = store?.name || store?.storeName || 'Store';
    const shareText = `Check out this amazing store: ${storeName} - ${products.length} products available!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: storeName,
          text: shareText,
          url: storeUrl,
        });
      } catch (error) {
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback: copy to clipboard with share text
      const shareContent = `${shareText}\n\n${storeUrl}`;
      navigator.clipboard.writeText(shareContent).then(() => {
        alert('Store details copied to clipboard! You can now paste it to share.');
      }).catch(() => {
        alert('Share not supported. Store link: ' + storeUrl);
      });
    }
  };

  const messageVendor = (product) => {
    console.log('💬 Message vendor clicked for product:', product);
    setSelectedProduct(product);
    setShowMessageModal(true);
    console.log('💬 Modal should be opening now');
  };

  useEffect(() => {
    const fetchStoreAndProducts = async () => {
      try {
        setLoading(true);
        console.log('🏪 StorePage: Fetching store with slug:', storeSlug);

        const storefront = await getStorefrontOptimized(storeSlug);
        if (storefront.store) {
          setStore(storefront.store);
          setProducts(storefront.products || []);
          setError(null);
          return;
        }

        console.warn('🏪 StorePage: No store returned from API for slug:', storeSlug);
        setError('Store not found');
      } catch (err) {
        console.error('❌ StorePage: Error fetching store data:', err);
        setError('Failed to load store');
      } finally {
        setLoading(false);
      }
    };

    if (storeSlug) {
      fetchStoreAndProducts();
    }
  }, [storeSlug]);

  // Update document title when store loads
  useEffect(() => {
    if (store) {
      const titleName = store.name || store.storeName || 'Store';
      document.title = `${titleName} | Ojawa`;
    }
  }, [store]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading store...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Store Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <a href="/" className="text-blue-600 hover:text-blue-800">Go Home</a>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Store Not Found</h1>
          <p className="text-gray-600 mb-4">The store you're looking for doesn't exist.</p>
          <a href="/" className="text-blue-600 hover:text-blue-800">Go Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-6">
            {store.logo ? (
              <img 
                src={store.logo} 
                alt={store.name} 
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">
                  {store.name?.charAt(0) || 'S'}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{store.name || store.storeName || 'Store'}</h1>
              <p className="text-gray-600 mt-1">{store.description || store.settings?.storeDescription || ''}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                {store.contactInfo?.address && (<span>📍 {formatAddress(store.contactInfo.address)}</span>)}
                {store.contactInfo?.phone && (<span>📞 {store.contactInfo.phone}</span>)}
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>📦 {products.length} products available</span>
                  <span>⭐ {store.rating || 'No ratings yet'}</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyStoreLink()}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                    title="Copy store link"
                  >
                    📋 Copy Store Link
                  </button>
                  <button
                    onClick={() => shareStore()}
                    className="bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200 transition-colors text-sm"
                    title="Share store"
                  >
                    📤 Share Store
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Our Products</h2>
          <p className="text-gray-600">{products.length} products available</p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Products Yet</h3>
            <p className="text-gray-600">This store hasn't added any products yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="aspect-w-16 aspect-h-12">
                  {product.images && product.images.length > 0 ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 rounded-t-lg flex items-center justify-center">
                      <span className="text-gray-400 text-4xl">📦</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-green-600">
                      ₦{product.price?.toLocaleString() || '0'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {product.stock || 0} in stock
                    </span>
                  </div>
                  <div className="flex space-x-2 mt-3">
                    <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                      View Details
                    </button>
                    <button
                      onClick={() => messageVendor(product)}
                      className="bg-purple-100 text-purple-700 py-2 px-3 rounded-lg hover:bg-purple-200 transition-colors text-sm"
                      title="Message vendor about this product"
                    >
                      💬
                    </button>
                    <button
                      onClick={() => copyProductLink(product)}
                      className="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      title="Copy product link"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => shareProduct(product)}
                      className="bg-green-100 text-green-700 py-2 px-3 rounded-lg hover:bg-green-200 transition-colors text-sm"
                      title="Share product"
                    >
                      📤
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Vendor Modal */}
      <MessageVendorModal
        isOpen={showMessageModal}
        onClose={() => {
          setShowMessageModal(false);
          setSelectedProduct(null);
        }}
        vendor={{
          id: store?.vendorId,
          name: store?.name || store?.storeName || 'Vendor'
        }}
        product={selectedProduct}
      />
    </div>
  );
};

export default StorePage;

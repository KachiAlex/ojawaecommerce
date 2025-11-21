import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import MessageVendorModal from './MessageVendorModal';
import firebaseService from '../services/firebaseService';

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
    const sleep = (ms) => new Promise(res => setTimeout(res, ms));
    const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    const fetchProductsForStore = async (resolvedStore) => {
      try {
        if (!resolvedStore) return [];
        let allProducts = [];
        const storeId = resolvedStore.id || resolvedStore.storeId;
        console.log('🏪 StorePage: Starting product queries with storeId:', storeId, 'vendorId:', resolvedStore.vendorId);
        // First try: Query by storeId
        if (storeId) {
          try {
            console.log('🏪 StorePage: Attempt 1 - Querying by storeId:', storeId);
            const productsRef = collection(db, 'products');
            const storeProductsQuery = query(
              productsRef,
              where('storeId', '==', storeId)
            );
            const storeProductsSnapshot = await getDocs(storeProductsQuery);
            allProducts = storeProductsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log('🏪 StorePage: Products found by storeId:', allProducts.length);
          } catch (storeQueryErr) {
            console.warn('🏪 StorePage: Error querying by storeId, will try vendorId:', storeQueryErr);
          }
        }

        // Second try: Use firebaseService.getByVendor
        if (allProducts.length === 0 && resolvedStore.vendorId) {
          try {
            console.log('🏪 StorePage: Attempt 2 - Using firebaseService.getByVendor:', resolvedStore.vendorId);
            allProducts = await firebaseService.products.getByVendor(resolvedStore.vendorId);
            console.log('🏪 StorePage: Products found by firebaseService.getByVendor:', allProducts.length);
          } catch (vendorServiceErr) {
            console.warn('🏪 StorePage: firebaseService.getByVendor failed, trying direct query:', vendorServiceErr);
            try {
              console.log('🏪 StorePage: Attempt 3 - Direct Firestore query by vendorId:', resolvedStore.vendorId);
              const productsRef = collection(db, 'products');
              const vendorProductsQuery = query(
                productsRef,
                where('vendorId', '==', resolvedStore.vendorId)
              );
              const vendorProductsSnapshot = await getDocs(vendorProductsQuery);
              allProducts = vendorProductsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              console.log('🏪 StorePage: Products found by direct vendorId query:', allProducts.length);
            } catch (vendorQueryErr) {
              console.error('🏪 StorePage: Direct vendorId query also failed:', vendorQueryErr);
            }
          }
        }

        // Fourth try: Try vendorEmail if we have it
        if (allProducts.length === 0 && resolvedStore.vendorId) {
          try {
            let vendorEmail = null;
            try {
              const vendorProfile = await firebaseService.users.getProfile(resolvedStore.vendorId);
              vendorEmail = vendorProfile?.email || vendorProfile?.vendorProfile?.contactEmail || null;
              console.log('🏪 StorePage: Attempt 4 - Trying vendorEmail:', vendorEmail);
              if (vendorEmail) {
                allProducts = await firebaseService.products.getByVendorEmail(vendorEmail);
                console.log('🏪 StorePage: Products found by vendorEmail:', allProducts.length);
              }
            } catch (emailErr) {
              console.warn('🏪 StorePage: Could not fetch vendor email:', emailErr);
            }
          } catch (emailQueryErr) {
            console.error('🏪 StorePage: vendorEmail query failed:', emailQueryErr);
          }
        }

        // Ultimate fallback: Fetch ALL and filter
        if (allProducts.length === 0 && resolvedStore.vendorId) {
          try {
            console.log('🏪 StorePage: Attempt 5 - Ultimate fallback: Fetching all products and filtering client-side...');
            const allProductsSnapshot = await firebaseService.products.getAll({ showAll: true });
            console.log('🏪 StorePage: Total products in database:', allProductsSnapshot.length);
            let vendorEmail = null;
            try {
              const vendorProfile = await firebaseService.users.getProfile(resolvedStore.vendorId).catch(() => null);
              vendorEmail = vendorProfile?.email || null;
              console.log('🏪 StorePage: Vendor email for matching:', vendorEmail);
            } catch (e) {
              console.warn('🏪 StorePage: Could not fetch vendor email:', e);
            }
            allProducts = allProductsSnapshot.filter(product => {
              const matchesVendorId = product.vendorId === resolvedStore.vendorId;
              const matchesStoreId = storeId && (product.storeId === storeId || product.storeId === resolvedStore.storeId);
              let matchesVendorEmail = false;
              if (vendorEmail && product.vendorEmail) {
                matchesVendorEmail = product.vendorEmail.toLowerCase() === vendorEmail.toLowerCase();
              }
              return matchesVendorId || matchesStoreId || matchesVendorEmail;
            });
            console.log('🏪 StorePage: Filtered products for vendor/store:', allProducts.length);
          } catch (ultimateErr) {
            console.error('🏪 StorePage: Ultimate fallback failed:', ultimateErr);
          }
        }

        // Last resort: fetch all unfiltered and filter by ids
        if (allProducts.length === 0 && resolvedStore.vendorId) {
          console.log('🏪 StorePage: Attempt 6 - Last resort: Fetching ALL products without any filters...');
          try {
            const productsRef = collection(db, 'products');
            const allProductsQuery = query(productsRef);
            const allProductsSnapshot = await getDocs(allProductsQuery);
            const allProductsUnfiltered = allProductsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allProducts = allProductsUnfiltered.filter(product => {
              return product.vendorId === resolvedStore.vendorId || 
                     (storeId && product.storeId === storeId) ||
                     (resolvedStore.storeId && product.storeId === resolvedStore.storeId);
            });
            console.log('🏪 StorePage: Filtered products (last resort):', allProducts.length);
          } catch (lastResortErr) {
            console.error('🏪 StorePage: Last resort failed:', lastResortErr);
          }
        }

        // Show all products regardless of status for now
        const approvedProducts = allProducts.filter(p => 
          p.status === 'approved' || 
          p.status === 'active' || 
          p.status === 'pending' || 
          !p.status || 
          p.status === 'draft'
        );
        setProducts(allProducts.length > 0 ? allProducts : approvedProducts);
        console.log('🏪 StorePage: FINAL products set:', allProducts.length > 0 ? allProducts.length : approvedProducts.length);
        return allProducts;
      } catch (e) {
        console.error('🏪 StorePage: fetchProductsForStore failed:', e);
        return [];
      }
    };

    const fetchStoreAndProducts = async (attempt = 0) => {
      try {
        setLoading(true);
        console.log('🏪 StorePage: Fetching store with slug:', storeSlug);

        // First, try to resolve by users.vendorProfile.storeSlug for immediate preview
        let effectiveStore = null;
        try {
          const usersRefImmediate = collection(db, 'users');
          const directSlugQueryImmediate = query(usersRefImmediate, where('vendorProfile.storeSlug', '==', storeSlug));
          const directSlugSnapImmediate = await getDocs(directSlugQueryImmediate);
          if (!directSlugSnapImmediate.empty) {
            const u = directSlugSnapImmediate.docs[0];
            const uData = u.data();
            effectiveStore = {
              id: null,
              vendorId: u.id,
              name: uData?.vendorProfile?.storeName || uData?.displayName || uData?.name || 'Store',
              description: uData?.vendorProfile?.storeDescription || '',
              contactInfo: {
                address: uData?.vendorProfile?.businessAddress || '',
                phone: uData?.vendorProfile?.businessPhone || ''
              },
              settings: {
                storeSlug
              }
            };
            console.log('🏪 StorePage: ✅ Immediate resolution by users.vendorProfile.storeSlug');
            setStore(prev => prev || effectiveStore);
            // Kick off product fetch immediately for a responsive preview
            if (products.length === 0) {
              fetchProductsForStore(effectiveStore);
            }
          }
        } catch (immediateResolveErr) {
          console.warn('🏪 StorePage: Immediate user-based resolution failed:', immediateResolveErr);
        }

        // If not resolved by exact slug, try client-side normalized match across users
        if (!effectiveStore) {
          try {
            const usersRefAll = collection(db, 'users');
            const usersSnapshot = await getDocs(usersRefAll);
            const req = norm(storeSlug);
            for (const u of usersSnapshot.docs) {
              const d = u.data();
              const candidates = [
                d?.vendorProfile?.storeSlug,
                d?.vendorProfile?.storeName,
                d?.vendorProfile?.businessName,
                d?.displayName,
                d?.name
              ];
              if (candidates.some(v => norm(v) === req)) {
                effectiveStore = {
                  id: null,
                  vendorId: u.id,
                  name: d?.vendorProfile?.storeName || d?.vendorProfile?.businessName || d?.displayName || d?.name || 'Store',
                  description: d?.vendorProfile?.storeDescription || '',
                  contactInfo: {
                    address: d?.vendorProfile?.businessAddress || '',
                    phone: d?.vendorProfile?.businessPhone || ''
                  },
                  settings: { storeSlug }
                };
                console.log('🏪 StorePage: ✅ Immediate resolution by users normalized name/slug');
                setStore(prev => prev || effectiveStore);
                if (products.length === 0) {
                  fetchProductsForStore(effectiveStore);
                }
                break;
              }
            }
          } catch (usersAllErr) {
            console.warn('🏪 StorePage: Users normalized match failed:', usersAllErr);
          }
        }

        // Find store by slug in stores collection (authoritative when available)
        const storesRef = collection(db, 'stores');
        const storesSnapshot = await getDocs(storesRef);
        
        console.log('🏪 StorePage: Looking for store with slug:', storeSlug);
        console.log('🏪 StorePage: Available stores:', storesSnapshot.docs.length);
        
        let foundStore = null;
        
        // First, try to find store by settings.storeSlug (preferred method - most reliable)
        for (const doc of storesSnapshot.docs) {
          const storeData = { id: doc.id, ...doc.data() };
          const storeSlugFromSettings = storeData.settings?.storeSlug || 
                                        storeData.storeSlug ||
                                        storeData.vendorProfile?.storeSlug;
          
          // Normalize both slugs for comparison (lowercase, replace non-alphanumeric with dash)
          const normalizedSettingsSlug = (storeSlugFromSettings || '').toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
          const normalizedRequestSlug = storeSlug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
          
          if (normalizedSettingsSlug === normalizedRequestSlug && normalizedSettingsSlug !== '') {
            foundStore = storeData;
            console.log('🏪 StorePage: ✅ Found matching store by settings.storeSlug:', storeData.name);
            break;
          }
        }
        
        // If not found by storeSlug, try matching by store name slug
        if (!foundStore) {
          console.log('🏪 StorePage: Not found by storeSlug, trying store name...');
          for (const doc of storesSnapshot.docs) {
            const storeData = { id: doc.id, ...doc.data() };
            const storeName = storeData.name || 
                             storeData.storeName || 
                             storeData.settings?.businessName ||
                             storeData.vendorProfile?.storeName || 
                             '';
            const slug = storeName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            const normalizedRequestSlug = storeSlug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
            
            if (slug === normalizedRequestSlug && slug !== '') {
              foundStore = storeData;
              console.log('🏪 StorePage: ✅ Found matching store by name slug!');
              break;
            }
          }
        }
        
        // If still not found, attempt to resolve by vendor profile storeSlug or name
        if (!foundStore) {
          console.log('🏪 StorePage: Not found by slug/name in stores. Looking up vendor profiles...');
          try {
            const usersRef = collection(db, 'users');
            // 1) Exact match on vendorProfile.storeSlug if present
            const directSlugQuery = query(usersRef, where('vendorProfile.storeSlug', '==', storeSlug));
            const directSlugSnap = await getDocs(directSlugQuery);
            if (!directSlugSnap.empty) {
              const u = directSlugSnap.docs[0];
              foundStore = { id: null, vendorId: u.id, name: u.data()?.vendorProfile?.storeName || u.data()?.displayName || u.data()?.name || 'Store' };
              console.log('🏪 StorePage: ✅ Resolved by users.vendorProfile.storeSlug');
            }

            // 2) If still not found, fetch a small set of users and match by normalized store/business name client-side
            if (!foundStore) {
              const usersSnapshot = await getDocs(usersRef);
              const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
              const req = norm(storeSlug);
              for (const u of usersSnapshot.docs) {
                const d = u.data();
                const candidates = [
                  d?.vendorProfile?.storeName,
                  d?.vendorProfile?.businessName,
                  d?.displayName,
                  d?.name
                ];
                if (candidates.some(v => norm(v) === req)) {
                  foundStore = { id: null, vendorId: u.id, name: candidates.find(Boolean) || 'Store' };
                  console.log('🏪 StorePage: ✅ Resolved by users name match');
                  break;
                }
              }
            }
          } catch (resolveErr) {
            console.warn('🏪 StorePage: Vendor profile resolution failed:', resolveErr);
          }
        }

        if (!foundStore) {
          if (attempt < 5) {
            const delay = 300 + attempt * 250; // incremental backoff
            console.log(`🏪 StorePage: Store not found yet. Retrying in ${delay}ms (attempt ${attempt + 1}/5)...`);
            await sleep(delay);
            return fetchStoreAndProducts(attempt + 1);
          } else {
            if (!effectiveStore) {
              setError('Store not found');
              setLoading(false);
              return;
            }
            // Use effectiveStore if we have it from user profile
            foundStore = effectiveStore;
          }
        }

        setStore(prev => prev || foundStore);
        console.log('🏪 StorePage: Found store:', foundStore);

        // Fetch products for this store using firebaseService methods with fallback logic
        console.log('🏪 StorePage: Store details:', {
          id: foundStore.id,
          storeId: foundStore.storeId,
          vendorId: foundStore.vendorId,
          name: foundStore.name,
          storeSlug: foundStore.settings?.storeSlug || foundStore.storeSlug
        });
        console.log('🏪 StorePage: Fetching products for vendorId:', foundStore.vendorId, 'storeId:', foundStore.id || foundStore.storeId);
        
        await fetchProductsForStore(foundStore);
        
      } catch (error) {
        console.error('❌ StorePage: Error fetching store data:', error);
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
                {store.contactInfo?.address && (<span>📍 {store.contactInfo.address}</span>)}
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

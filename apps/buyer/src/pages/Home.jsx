import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import AdminPanel from '../components/AdminPanel';
import EscrowTimeline from '../components/EscrowTimeline';
import Footer from '../components/Footer';
import OsoahiaWidget from '../components/OsoahiaWidget';
import RecentOrdersFlow from '../components/RecentOrdersFlow';
import RealTimeStockMonitor from '../components/RealTimeStockMonitor';
import ComponentErrorBoundary from '../components/ComponentErrorBoundary';
import { ProductListSkeleton, PageLoadingSkeleton } from '../components/LoadingStates';
import { useAuth } from '../contexts/AuthContext';
import { useRealTimeProducts } from '../hooks/useRealTimeProducts';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const categories = [
  'Fashion',
  'Beauty',
  'Electronics',
  'Home & Living',
  'Food',
  'Crafts',
  'Services',
  'Agriculture',
];

const products = [
  { 
    id: 'p1', 
    name: 'Custom Ankara Dress', 
    vendor: 'Lagos Atelier', 
    price: '₦85,000', 
    rating: 4.8, 
    reviews: 128, 
    verified: true, 
    bgColor: 'bg-gradient-to-br from-pink-100 to-pink-200',
    icon: '👗'
  },
  { 
    id: 'p2', 
    name: 'Shea Butter (1kg)', 
    vendor: 'Tamale Naturals', 
    price: '₵220', 
    rating: 4.7, 
    reviews: 203, 
    verified: true, 
    bgColor: 'bg-gradient-to-br from-yellow-100 to-yellow-200',
    icon: '🧴'
  },
  { 
    id: 'p3', 
    name: 'Leather Sandals', 
    vendor: 'Mombasa Crafts', 
    price: 'KSh 6,800', 
    rating: 4.6, 
    reviews: 89, 
    verified: false, 
    bgColor: 'bg-gradient-to-br from-green-100 to-green-200',
    icon: '👡'
  },
  { 
    id: 'p4', 
    name: 'Kente Scarf', 
    vendor: 'Accra Weaves', 
    price: '₵150', 
    rating: 4.9, 
    reviews: 57, 
    verified: true, 
    bgColor: 'bg-gradient-to-br from-purple-100 to-purple-200',
    icon: '🧣'
  },
  { 
    id: 'p5', 
    name: 'Bespoke Suit', 
    vendor: 'Abuja Tailors', 
    price: '₦120,000', 
    rating: 4.5, 
    reviews: 41, 
    verified: false, 
    bgColor: 'bg-gradient-to-br from-blue-100 to-blue-200',
    icon: '🤵'
  },
  { 
    id: 'p6', 
    name: 'Ethiopian Coffee Beans', 
    vendor: 'Addis Coffee', 
    price: 'Br 2,900', 
    rating: 4.7, 
    reviews: 310, 
    verified: true, 
    bgColor: 'bg-gradient-to-br from-yellow-100 to-amber-200',
    icon: '☕'
  },
  { 
    id: 'p7', 
    name: 'Hand-carved Bowl', 
    vendor: 'Kigali Woodworks', 
    price: 'RWF 18,000', 
    rating: 4.4, 
    reviews: 23, 
    verified: false, 
    bgColor: 'bg-gradient-to-br from-green-100 to-teal-200',
    icon: '🥣'
  },
  { 
    id: 'p8', 
    name: 'Phone Case', 
    vendor: 'Accra Gadgets', 
    price: '₵90', 
    rating: 4.2, 
    reviews: 76, 
    verified: false, 
    bgColor: 'bg-gradient-to-br from-gray-100 to-gray-200',
    icon: '📱'
  },
];

// Helper function to get product display properties
const getProductDisplayProps = (product, index) => {
  const colors = [
    'bg-gradient-to-br from-pink-100 to-pink-200',
    'bg-gradient-to-br from-yellow-100 to-yellow-200',
    'bg-gradient-to-br from-green-100 to-green-200',
    'bg-gradient-to-br from-purple-100 to-purple-200',
    'bg-gradient-to-br from-blue-100 to-blue-200',
    'bg-gradient-to-br from-amber-100 to-amber-200',
    'bg-gradient-to-br from-orange-100 to-orange-200',
    'bg-gradient-to-br from-rose-100 to-rose-200'
  ];
  
  const icons = ['👗', '🧴', '👡', '🧣', '🤵', '☕', '🧺', '💎'];
  
  return {
    bgColor: colors[index % colors.length],
    icon: icons[index % icons.length]
  };
};

const Home = () => {
  const { currentUser, userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  
  // Get real-time featured products (limit to 8 for display)
  const { products: realTimeProducts, loading: productsLoading } = useRealTimeProducts({
    sortBy: 'newest'
  });
  
  // Take first 8 products for featured display
  const featuredProducts = realTimeProducts.slice(0, 8);

  useEffect(() => {
    // Simulate loading time for demo
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);


  if (isLoading) {
    return <PageLoadingSkeleton />;
  }

  // Determine dashboard route based on user role
  const getDashboardRoute = () => {
    if (!userProfile?.role) return '/dashboard';
    
    switch (userProfile.role) {
      case 'vendor': return '/vendor';
      case 'logistics': return '/logistics';
      case 'buyer':
      case 'customer':
      default:
        return '/buyer';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 pt-16 pb-12 space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-slate-600 bg-white">
          Secure wallets • Pan-African marketplace
        </div>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
          Trade confidently across Africa with wallet-protected payments
            </h1>
        <p className="text-lg text-slate-600 max-w-3xl">
          Ojawa connects buyers and vendors with trusted wallet protection—your funds are held safely until delivery is confirmed.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/products" className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-6 py-3 text-white hover:bg-emerald-700 font-medium">
            Browse Products
          </Link>
          <Link to="/products" className="inline-flex items-center justify-center rounded-md bg-purple-600 px-6 py-3 text-white hover:bg-purple-700 font-medium">
            🛍️ Marketplace
          </Link>
                   {!currentUser && (
                     <Link to="/register" className="inline-flex items-center justify-center rounded-md border px-6 py-3 text-slate-800 hover:bg-slate-100 font-medium">
                       Join Ojawa
                     </Link>
                   )}
                   <Link to="/admin" className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 font-medium">
                     🎛️ Admin Dashboard
                   </Link>
        </div>
        <div className="flex items-center gap-4 pt-2">
          <div className="text-xs text-slate-600">Backed by dispute resolution and identity verification</div>
        </div>
      </section>

      {/* Featured Products */}
      <section id="products" className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Featured Products</h2>
          <Link to="/products" className="text-sm text-emerald-700 hover:underline">View all products</Link>
      </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {productsLoading ? (
            // Show loading skeleton
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border bg-white animate-pulse">
                <div className="aspect-square w-full bg-gray-200"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))
          ) : featuredProducts.length > 0 ? (
            featuredProducts.map((product, index) => {
              const displayProps = getProductDisplayProps(product, index);
              
              // Get the first product image or fallback to generic icon
              const productImage = product.images && Array.isArray(product.images) && product.images.length > 0 
                ? product.images[0] 
                : product.image || null;
              
              // Format price properly
              const formatPrice = (price, currency) => {
                if (!price && price !== 0) return 'Price TBD';
                
                // Extract currency symbol and code from currency string like "₦ NGN"
                const currencyParts = currency ? currency.split(' ') : ['₦', 'NGN'];
                const symbol = currencyParts[0] || '₦';
                
                return `${symbol}${Number(price).toLocaleString()}`;
              };
              
              return (
                <Link key={product.id} to={`/products/${product.id}`} className="block overflow-hidden rounded-xl border bg-white group hover:shadow-lg transition-shadow">
                  <div className={`relative aspect-square w-full overflow-hidden ${productImage ? 'bg-white' : displayProps.bgColor}`}>
                    {productImage ? (
                      <img
                        src={productImage}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Fallback to generic icon if image fails to load
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`flex items-center justify-center h-full ${productImage ? 'hidden' : ''}`}>
                      <span className="text-6xl">{displayProps.icon}</span>
                    </div>
                    
                    {/* Stock Status Badge */}
                    {product.inStock === false || (product.stock || 0) <= 0 ? (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        Out of Stock
                      </div>
                    ) : (
                      <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        In Stock ({product.stock || 0})
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="mb-2">
                      <h3 className="font-semibold text-gray-900 leading-tight">{product.name}</h3>
                      <p className="text-sm text-gray-600">by {product.vendorName || 'Vendor'}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-gray-900">
                        {formatPrice(product.price, product.currency)}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        <span aria-hidden>⭐</span> {(product.rating || 0).toFixed(1)} ({(product.reviewCount || 0)})
                      </div>
                      <span className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white group-hover:bg-emerald-700 transition-colors">
                        View Product
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            // Fallback to static products if no real-time products available
            products.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-xl border bg-white group hover:shadow-lg transition-shadow">
              <div className={`relative aspect-square w-full overflow-hidden ${p.bgColor}`}>
                <div className="flex items-center justify-center h-full">
                  <span className="text-6xl">{p.icon}</span>
          </div>
                {p.verified && (
                  <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-emerald-600 px-2 py-1 text-xs font-medium text-white">Verified</span>
                )}
              </div>
              <div className="p-4">
                <div className="mb-2">
                  <h3 className="font-semibold text-gray-900 leading-tight">{p.name}</h3>
                  <p className="text-sm text-gray-600">by {p.vendor}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-gray-900">{p.price}</div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <span aria-hidden>⭐</span> {p.rating.toFixed(1)} ({p.reviews})
                  </div>
                    <Link to="/products" className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
                      Browse Products
              </Link>
            </div>
          </div>
        </div>
            ))
          )}
      </div>
      </section>

      {/* Recent Orders Flow - Only show for logged in users */}
      {currentUser && (
        <section className="max-w-7xl mx-auto px-4 py-10">
          <ComponentErrorBoundary>
            <RecentOrdersFlow />
          </ComponentErrorBoundary>
        </section>
      )}

      {/* Real-Time Stock Monitor - Only show for logged in users */}
      {currentUser && (
        <section className="max-w-7xl mx-auto px-4 py-10">
          <ComponentErrorBoundary>
            <RealTimeStockMonitor />
          </ComponentErrorBoundary>
        </section>
      )}

      {/* Escrow Explainer */}
      <section className="max-w-7xl mx-auto px-4 py-10" id="how-it-works">
        <div className="rounded-lg border bg-gradient-to-br from-emerald-50/60 to-white">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">How Ojawa Wallet Works</h3>
          </div>
          <div className="p-4">
            <EscrowTimeline />
          </div>
          </div>
      </section>

      {/* Categories */}
      <section id="categories" className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Popular Categories</h2>
          <Link to="/products" className="text-sm text-emerald-700 hover:underline">Explore all</Link>
              </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span key={c} className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-800 hover:bg-slate-200">
              {c}
            </span>
          ))}
            </div>
      </section>

      {/* Value Props */}
      <section className="max-w-7xl mx-auto px-4 py-10 grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border bg-white">
          <div className="p-4 border-b"><p className="font-semibold">Featured Vendors</p></div>
          <div className="p-4 text-sm text-slate-600">Discover trusted vendors with verified identities and strong ratings.</div>
        </div>
        <div className="rounded-lg border bg-white">
          <div className="p-4 border-b"><p className="font-semibold">Buyer Protection</p></div>
          <div className="p-4 text-sm text-slate-600">Your payment stays in your wallet until you confirm delivery—simple and safe.</div>
              </div>
        <div className="rounded-lg border bg-white">
          <div className="p-4 border-b"><p className="font-semibold">Low Fees & Fast Payouts</p></div>
          <div className="p-4 text-sm text-slate-600">Transparent fees and smooth vendor payouts to mobile money or bank.</div>
            </div>
      </section>

      {/* Trust */}
      <section id="trust" className="max-w-7xl mx-auto px-4 pb-16">
        <div className="rounded-lg border bg-slate-50">
          <div className="p-6 grid gap-6 md:grid-cols-3">
            <div>
              <p className="font-medium">Wallet Secured</p>
              <p className="text-sm text-slate-600">Funds held by Ojawa until buyer confirms delivery.</p>
              </div>
            <div>
              <p className="font-medium">Dispute Resolution</p>
              <p className="text-sm text-slate-600">Fair mediation if something goes wrong.</p>
            </div>
            <div>
              <p className="font-medium">Identity Verification</p>
              <p className="text-sm text-slate-600">Trustworthy participants improve marketplace safety.</p>
          </div>
        </div>
      </div>
      </section>

      {/* Osoahia AI Assistant Widget */}
      {currentUser && (
        <div className="max-w-7xl mx-auto px-4 pb-10">
          <ComponentErrorBoundary>
            <OsoahiaWidget />
          </ComponentErrorBoundary>
        </div>
      )}

      {/* Keep Admin tools visible for now */}
      <div className="max-w-7xl mx-auto px-4 pb-10">
        <ComponentErrorBoundary>
          <AdminPanel />
        </ComponentErrorBoundary>
      </div>

      <Footer />
    </div>
  );
};

export default Home;

import { Link } from 'react-router-dom';
import AdminPanel from '../components/AdminPanel';
import EscrowTimeline from '../components/EscrowTimeline';
import Footer from '../components/Footer';

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

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 pt-16 pb-12 space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-slate-600 bg-white">
          Secure escrow • Pan-African marketplace
        </div>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
          Trade confidently across Africa with escrow-protected payments
        </h1>
        <p className="text-lg text-slate-600 max-w-3xl">
          Ojawa connects buyers and vendors with a trusted escrow layer—your funds are held safely until delivery is confirmed.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/register" className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">
            Start Selling
          </Link>
          <Link to="/products" className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-slate-800 hover:bg-slate-100">
            Start Buying
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
          <Link to="/products" className="text-sm text-emerald-700 hover:underline">View marketplace</Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
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
                  <Link to="/checkout" className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
                    Buy with Escrow
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Escrow Explainer */}
      <section className="max-w-7xl mx-auto px-4 py-10" id="how-it-works">
        <div className="rounded-lg border bg-gradient-to-br from-emerald-50/60 to-white">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">How Ojawa Escrow Works</h3>
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
          <div className="p-4 text-sm text-slate-600">Your payment stays in escrow until you confirm delivery—simple and safe.</div>
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
              <p className="font-medium">Escrow Secured</p>
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

      {/* Keep Admin tools visible for now */}
      <div className="max-w-7xl mx-auto px-4 pb-10">
        <AdminPanel />
      </div>

      <Footer />
    </div>
  );
};

export default Home;

import { Link } from 'react-router-dom';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';

export default function RecentlyViewed({ limit = 6 }) {
  const { recentlyViewed, clear } = useRecentlyViewed();

  if (!recentlyViewed || recentlyViewed.length === 0) return null;

  const items = recentlyViewed.slice(0, limit);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Recently Viewed</h2>
        <button
          onClick={clear}
          className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {items.map(item => (
          <Link
            key={item.id}
            to={`/products/${item.id}`}
            className="group bg-slate-800/50 rounded-lg overflow-hidden border border-emerald-900/40 hover:border-emerald-700/60 transition-colors"
          >
            <div className="aspect-square bg-slate-700/30 overflow-hidden">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                  No image
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="text-xs text-white truncate font-medium">{item.name}</p>
              {item.price != null && (
                <p className="text-xs text-amber-400 mt-1">
                  {item.price.toLocaleString()} {item.currency || 'USD'}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

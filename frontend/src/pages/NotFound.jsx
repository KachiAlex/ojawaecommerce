import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <h1 className="text-8xl font-extrabold text-amber-400 tracking-tight">404</h1>
          <div className="h-1 w-24 bg-emerald-500 mx-auto rounded-full mt-2" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Page Not Found</h2>
        <p className="text-teal-300/70 mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="px-6 py-3 bg-amber-500 text-slate-950 font-semibold rounded-xl hover:bg-amber-400 transition-colors"
          >
            Back to Home
          </Link>
          <Link
            to="/products"
            className="px-6 py-3 border border-teal-700 text-teal-300 font-semibold rounded-xl hover:bg-teal-900/40 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

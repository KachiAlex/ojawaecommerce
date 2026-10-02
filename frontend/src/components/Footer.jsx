import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SimpleLogo from './SimpleLogo';

const Footer = () => {
  const year = new Date().getFullYear();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const handleStartSelling = (e) => {
    e.preventDefault();
    
    // Check if user is authenticated
    if (!currentUser) {
      // Not authenticated - route to login with vendor intent
      navigate('/login', { 
        state: { 
          userType: 'vendor',
          message: 'Sign up as a vendor to start selling on Ojawa'
        } 
      });
      return;
    }

    // Check if user is already a vendor
    const isVendor = userProfile?.role === 'vendor' || userProfile?.isVendor;
    
    if (isVendor) {
      // User is a vendor - route to vendor dashboard
      navigate('/vendor');
    } else {
      // User is authenticated but not a vendor - route to become vendor page
      navigate('/become-vendor');
    }
  };

  return (
    <footer className="border-t bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8 grid gap-4 md:grid-cols-3 text-sm text-slate-600">
        <div>
          <SimpleLogo size="large" variant="icon" className="mb-2" />
          <p className="mt-1">Pan-African marketplace with wallet-protected payments.</p>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="font-medium text-slate-900">Buyers</p>
            <ul className="mt-1 space-y-1">
              <li><a href="/products" className="hover:underline">Browse Products</a></li>
              <li><a href="/checkout" className="hover:underline">Checkout</a></li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-slate-900">Vendors</p>
            <ul className="mt-1 space-y-1">
              <li><a href="#" onClick={handleStartSelling} className="hover:underline">Start Selling</a></li>
              <li><a href="/dashboard" className="hover:underline">Dashboard</a></li>
            </ul>
          </div>
        </div>
        <div className="md:text-right">
          <p>© {year} All rights reserved.</p>
          <div className="flex md:justify-end gap-4 mt-2 text-slate-500">
            <Link to="/privacy" className="hover:text-slate-900">Privacy</Link>
            <Link to="/terms" className="hover:text-slate-900">Terms</Link>
            <Link to="/refund-policy" className="hover:text-slate-900">Refunds</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;



import SimpleLogo from './SimpleLogo';

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8 grid gap-4 md:grid-cols-3 text-sm text-slate-600">
        <div>
          <SimpleLogo size="default" variant="icon" className="mb-2" />
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
              <li><a href="/vendor" className="hover:underline">Start Selling</a></li>
              <li><a href="/dashboard" className="hover:underline">Dashboard</a></li>
            </ul>
          </div>
        </div>
        <div className="md:text-right">
          <p>© {year} All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;



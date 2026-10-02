import React from 'react';
import { Link } from 'react-router-dom';

const Help = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Help Center</h1>
          
          <div className="space-y-8">
            {/* Getting Started */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Getting Started</h2>
              <div className="space-y-4">
                <div className="border-l-4 border-emerald-500 pl-4">
                  <h3 className="font-medium text-gray-900">How to create an account</h3>
                  <p className="text-gray-600 mt-1">
                    Click on "Sign In" in the top right corner, then select "Create Account" to register with your email address.
                  </p>
                </div>
                <div className="border-l-4 border-emerald-500 pl-4">
                  <h3 className="font-medium text-gray-900">How to browse products</h3>
                  <p className="text-gray-600 mt-1">
                    Use the "Products" menu or search bar to find items. You can filter by categories or use keywords to search.
                  </p>
                </div>
                <div className="border-l-4 border-emerald-500 pl-4">
                  <h3 className="font-medium text-gray-900">How to add items to cart</h3>
                  <p className="text-gray-600 mt-1">
                    Click on any product to view details, then use the "Add to Cart" button. Your cart icon will show the number of items.
                  </p>
                </div>
              </div>
            </section>

            {/* Wallet System */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Wallet System</h2>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-medium text-gray-900">How the wallet works</h3>
                  <p className="text-gray-600 mt-1">
                    Our wallet system protects your money during transactions. When you buy something, your payment is held in escrow until you receive and confirm your order.
                  </p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-medium text-gray-900">Adding money to wallet</h3>
                  <p className="text-gray-600 mt-1">
                    Go to your dashboard and select "Wallet" to add funds using various payment methods including bank transfer and mobile money.
                  </p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-medium text-gray-900">Withdrawing money</h3>
                  <p className="text-gray-600 mt-1">
                    You can withdraw funds to your bank account or mobile money. Processing usually takes 1-3 business days.
                  </p>
                </div>
              </div>
            </section>

            {/* Orders & Tracking */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Orders & Tracking</h2>
              <div className="space-y-4">
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="font-medium text-gray-900">How to track your order</h3>
                  <p className="text-gray-600 mt-1">
                    Use the <Link to="/tracking" className="text-emerald-600 hover:text-emerald-700 underline">Track Package</Link> feature to monitor your order status in real-time.
                  </p>
                </div>
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="font-medium text-gray-900">Order status updates</h3>
                  <p className="text-gray-600 mt-1">
                    You'll receive notifications when your order status changes: Processing → Shipped → In Transit → Delivered.
                  </p>
                </div>
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="font-medium text-gray-900">What if my order is delayed?</h3>
                  <p className="text-gray-600 mt-1">
                    Contact our support team or use the dispute system if your order is significantly delayed or doesn't arrive.
                  </p>
                </div>
              </div>
            </section>

            {/* Categories */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Categories</h2>
              <div className="space-y-4">
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="font-medium text-gray-900">Browse by category</h3>
                  <p className="text-gray-600 mt-1">
                    Visit our <Link to="/categories" className="text-emerald-600 hover:text-emerald-700 underline">Categories</Link> page to explore products by type, brand, or price range.
                  </p>
                </div>
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="font-medium text-gray-900">Popular categories</h3>
                  <p className="text-gray-600 mt-1">
                    Electronics, Fashion, Home & Garden, Health & Beauty, Sports, and more are available.
                  </p>
                </div>
              </div>
            </section>

            {/* Support */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Need More Help?</h2>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Contact Support</h3>
                    <p className="text-gray-600 text-sm mb-3">
                      Our support team is available 24/7 to help with any questions or issues.
                    </p>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Email:</span> support@ojawa.com</p>
                      <p><span className="font-medium">Phone:</span> +234 800 OJAWA</p>
                      <p><span className="font-medium">Live Chat:</span> Available in your dashboard</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Quick Actions</h3>
                    <div className="space-y-2">
                      <Link 
                        to="/tracking" 
                        className="block text-emerald-600 hover:text-emerald-700 text-sm"
                      >
                        → Track your order
                      </Link>
                      <Link 
                        to="/categories" 
                        className="block text-emerald-600 hover:text-emerald-700 text-sm"
                      >
                        → Browse categories
                      </Link>
                      <Link 
                        to="/how-wallet-works" 
                        className="block text-emerald-600 hover:text-emerald-700 text-sm"
                      >
                        → Learn about wallet
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;

import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import WalletManager from '../components/WalletManager';

const Vendor = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchVendorData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Fetch vendor orders
        const ordersData = await firebaseService.orders.getByUser(currentUser.uid, 'vendor');
        setOrders(ordersData);
        
        // Fetch vendor products
        const productsData = await firebaseService.products.getAll({ vendorId: currentUser.uid });
        setProducts(productsData);
        
        // Fetch vendor analytics
        const statsData = await firebaseService.analytics.getVendorStats(currentUser.uid);
        setStats(statsData);
        
      } catch (error) {
        console.error('Error fetching vendor data:', error);
        // Fallback to mock data
        setOrders([]);
        setProducts([]);
        setStats({ totalSales: 0, activeOrders: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [currentUser]);

  const handleAddProduct = async (productData) => {
    try {
      await firebaseService.products.create(productData, currentUser.uid);
      setShowAddProductForm(false);
      // Refresh products
      const productsData = await firebaseService.products.getAll({ vendorId: currentUser.uid });
      setProducts(productsData);
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your vendor dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-6">
            <Link to="/" className="flex items-center mb-8">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">O</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">Ojawa</span>
            </Link>
            
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">VENDOR MENU</p>
              <button 
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'overview' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                📊 Overview
              </button>
              <button 
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'orders' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                📦 Orders
              </button>
              <button 
                onClick={() => setActiveTab('products')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'products' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                🛍️ Products
              </button>
              <button 
                onClick={() => setActiveTab('payouts')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'payouts' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                💰 Payouts
              </button>
              <button 
                onClick={() => setActiveTab('disputes')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'disputes' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                ⚖️ Disputes
              </button>
              <button 
                onClick={() => setActiveTab('wallet')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'wallet' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                💳 My Wallet
              </button>
              <button 
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'analytics' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                📈 Analytics
              </button>
            </div>
          </div>
          
          <div className="absolute bottom-4 left-4">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">← Back to Home</Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Add Product Modal */}
          {showAddProductForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Add New Product</h2>
                    <button 
                      onClick={() => setShowAddProductForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                <form className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="Enter product name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                        <option>Fashion</option>
                        <option>Beauty</option>
                        <option>Electronics</option>
                        <option>Home & Living</option>
                        <option>Food</option>
                        <option>Crafts</option>
                        <option>Services</option>
                        <option>Agriculture</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea rows="4" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="Describe your product..."></textarea>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                      <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                        <option>₦ NGN</option>
                        <option>₵ GHS</option>
                        <option>KSh KES</option>
                        <option>Br ETB</option>
                        <option>$ USD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Stock Quantity</label>
                      <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="0" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <div className="text-gray-400 mb-2">📷</div>
                      <p className="text-sm text-gray-600">Drop images here or click to upload</p>
                      <input type="file" multiple accept="image/*" className="hidden" />
                      <button type="button" className="mt-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium">Choose Files</button>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button type="submit" className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700">
                      Add Product
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowAddProductForm(false)}
                      className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Sales (30d)</p>
                      <p className="text-2xl font-bold text-gray-900">₦2,450,000</p>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <span className="mr-1">▲</span> 12.4%
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 text-xl">💰</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Orders</p>
                      <p className="text-2xl font-bold text-gray-900">12</p>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <span className="mr-1">▲</span> 2.0%
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-xl">📦</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Funds in Escrow</p>
                      <p className="text-2xl font-bold text-gray-900">₦540,000</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <span className="text-yellow-600 text-xl">🔒</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Products Listed</p>
                      <p className="text-2xl font-bold text-gray-900">24</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 text-xl">🛍️</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl border">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600">💰</span>
                          </div>
                          <div>
                            <p className="font-medium">Payment received - Kente Scarf</p>
                            <p className="text-sm text-gray-600">From John D. • ₵150 • Sep 10, 2025</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600">📦</span>
                          </div>
                          <div>
                            <p className="font-medium">Order shipped - Leather Sandals</p>
                            <p className="text-sm text-gray-600">To Peter M. • KSh 6,800 • Sep 4, 2025</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                            <span className="text-yellow-600">🔒</span>
                          </div>
                          <div>
                            <p className="font-medium">Escrow funded - Ankara Dress</p>
                            <p className="text-sm text-gray-600">From Amina K. • ₦85,000 • Sep 1, 2025</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-xl border">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                    </div>
                    <div className="p-6 space-y-3">
                      <button 
                        onClick={() => setShowAddProductForm(true)}
                        className="w-full bg-emerald-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                      >
                        Add Product
                      </button>
                      <button 
                        onClick={() => setActiveTab('orders')}
                        className="w-full border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Manage Orders
                      </button>
                      <button 
                        onClick={() => setActiveTab('payouts')}
                        className="w-full border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        View Payouts
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Performance</h2>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Conversion Rate</span>
                          <span className="text-sm font-medium">3.2%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Avg Order Value</span>
                          <span className="text-sm font-medium">₦28,500</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Customer Rating</span>
                          <span className="text-sm font-medium">4.8 ⭐</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'orders' && (
            <div className="bg-white rounded-xl border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Order Management</h2>
                  <div className="flex gap-3">
                    <select className="text-sm border rounded-lg px-3 py-1">
                      <option>All Orders</option>
                      <option>In Escrow</option>
                      <option>Shipped</option>
                      <option>Delivered</option>
                      <option>Awaiting Escrow</option>
                    </select>
                    <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
                      Export Orders
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Escrow ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.item}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <p>{order.buyer}</p>
                            <p className="text-xs text-gray-400">{order.buyerPhone}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${order.statusColor}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.escrowId || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button className="text-emerald-600 hover:text-emerald-700 font-medium">View</button>
                            <button className="text-blue-600 hover:text-blue-700 font-medium">Ship</button>
                            <button className="text-gray-600 hover:text-gray-700 font-medium">Contact</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Product Management</h2>
                <button 
                  onClick={() => setShowAddProductForm(true)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700"
                >
                  Add New Product
                </button>
              </div>

              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Your Products</h3>
                    <div className="flex gap-3">
                      <select className="text-sm border rounded-lg px-3 py-1">
                        <option>All Products</option>
                        <option>Active</option>
                        <option>Out of Stock</option>
                        <option>Draft</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sold</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <span className="text-lg">{product.image}</span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{product.name}</p>
                                <p className="text-xs text-gray-500">{product.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.price}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.stock}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sold}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              product.status === 'Active' ? 'bg-green-100 text-green-800' : 
                              product.status === 'Out of Stock' ? 'bg-red-100 text-red-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {product.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button className="text-emerald-600 hover:text-emerald-700 font-medium">Edit</button>
                              <button className="text-blue-600 hover:text-blue-700 font-medium">View</button>
                              <button className="text-red-600 hover:text-red-700 font-medium">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payouts' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Payout History</h2>
                    <div className="flex gap-3">
                      <button className="text-sm text-gray-600 hover:text-gray-900">Export</button>
                      <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
                        Request Payout
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payout ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payouts.map((payout) => (
                        <tr key={payout.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payout.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payout.amount}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payout.orders} orders</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payout.method}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payout.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              payout.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                              payout.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {payout.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Payout Settings</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Payout Method</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option>Bank Transfer</option>
                        <option>Mobile Money</option>
                        <option>PayPal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Payout</label>
                      <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="100.00" />
                    </div>
                  </div>
                  <button className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700">
                    Update Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'disputes' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Dispute Management</h2>
                    <div className="flex gap-3">
                      <select className="text-sm border rounded-lg px-3 py-1">
                        <option>All Disputes</option>
                        <option>Open</option>
                        <option>Resolved</option>
                        <option>Escalated</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispute ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {disputes.map((dispute) => (
                        <tr key={dispute.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dispute.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dispute.order}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dispute.buyer}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dispute.issue}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              dispute.priority === 'High' ? 'bg-red-100 text-red-800' : 
                              dispute.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-800'
                            }`}>
                              {dispute.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              dispute.status === 'Open' ? 'bg-red-100 text-red-800' : 
                              'bg-green-100 text-green-800'
                            }`}>
                              {dispute.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dispute.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button className="text-emerald-600 hover:text-emerald-700 font-medium">Respond</button>
                              <button className="text-blue-600 hover:text-blue-700 font-medium">View</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Overview</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">This Month</span>
                      <span className="text-sm font-medium">₦2,450,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Last Month</span>
                      <span className="text-sm font-medium">₦2,180,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Growth</span>
                      <span className="text-sm font-medium text-green-600">+12.4%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">👗</span>
                        <span className="text-sm">Ankara Dress</span>
                      </div>
                      <span className="text-sm font-medium">45 sold</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🧣</span>
                        <span className="text-sm">Kente Scarf</span>
                      </div>
                      <span className="text-sm font-medium">89 sold</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">👡</span>
                        <span className="text-sm">Leather Sandals</span>
                      </div>
                      <span className="text-sm font-medium">23 sold</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">New Customers</span>
                      <span className="text-sm font-medium">23</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Repeat Customers</span>
                      <span className="text-sm font-medium">67</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Avg Rating</span>
                      <span className="text-sm font-medium">4.8 ⭐</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Performance Insights</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Revenue Trends</h4>
                      <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl mb-2">📈</div>
                          <p className="text-sm text-gray-600">Revenue chart would go here</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Order Volume</h4>
                      <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl mb-2">📊</div>
                          <p className="text-sm text-gray-600">Order volume chart would go here</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wallet' && (
            <WalletManager userType="vendor" />
          )}
        </div>
      </div>
    </div>
  );
};

export default Vendor;



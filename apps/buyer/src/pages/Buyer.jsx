import { Link } from 'react-router-dom';
import { useState } from 'react';

const Buyer = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const orders = [
    { id: 'ORD-2001', item: 'Bespoke Suit', vendor: 'Lagos Tailors', status: 'In Escrow', amount: '₦120,000', date: '2025-09-03', statusColor: 'bg-yellow-100 text-yellow-800', escrowId: 'ESC-2001' },
    { id: 'ORD-2002', item: 'Ethiopian Coffee Beans', vendor: 'Addis Coffee', status: 'Shipped', amount: 'Br 2,900', date: '2025-09-05', statusColor: 'bg-blue-100 text-blue-800', escrowId: 'ESC-2002' },
    { id: 'ORD-2003', item: 'Shea Butter (500g)', vendor: 'Tamale Naturals', status: 'Delivered', amount: '₵110', date: '2025-09-07', statusColor: 'bg-green-100 text-green-800', escrowId: 'ESC-2003' },
    { id: 'ORD-2004', item: 'Phone Case', vendor: 'Accra Gadgets', status: 'Awaiting Escrow', amount: '₵90', date: '2025-09-10', statusColor: 'bg-gray-100 text-gray-800', escrowId: null },
  ];

  const transactions = [
    { id: 'TXN-001', type: 'Escrow Funding', order: 'ORD-2001', amount: '₦120,000', date: '2025-09-03 14:30', status: 'Completed' },
    { id: 'TXN-002', type: 'Escrow Release', order: 'ORD-2003', amount: '₵110', date: '2025-09-07 09:15', status: 'Completed' },
    { id: 'TXN-003', type: 'Escrow Funding', order: 'ORD-2002', amount: 'Br 2,900', date: '2025-09-05 16:45', status: 'Completed' },
    { id: 'TXN-004', type: 'Refund', order: 'ORD-1998', amount: '₵45', date: '2025-09-01 11:20', status: 'Completed' },
  ];

  const vendors = [
    { name: 'Lagos Tailors', orders: 3, totalSpent: '₦340,000', rating: 4.8, lastOrder: '2025-09-03', verified: true },
    { name: 'Addis Coffee', orders: 5, totalSpent: 'Br 14,500', rating: 4.9, lastOrder: '2025-09-05', verified: true },
    { name: 'Tamale Naturals', orders: 2, totalSpent: '₵330', rating: 4.6, lastOrder: '2025-09-07', verified: true },
    { name: 'Accra Gadgets', orders: 1, totalSpent: '₵90', rating: 4.2, lastOrder: '2025-09-10', verified: false },
  ];

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
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">BUYER MENU</p>
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
                onClick={() => setActiveTab('transactions')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'transactions' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                💳 Transaction History
              </button>
              <button 
                onClick={() => setActiveTab('vendors')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'vendors' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                🏪 Vendors & Ratings
              </button>
              <button 
                onClick={() => setActiveTab('support')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'support' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                🆘 Help & Support
              </button>
            </div>
          </div>
          
          <div className="absolute bottom-4 left-4">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">← Back to Home</Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Orders</p>
                      <p className="text-2xl font-bold text-gray-900">4</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-xl">📦</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Spent</p>
                      <p className="text-2xl font-bold text-gray-900">₦684,500</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 text-xl">💰</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Trusted Vendors</p>
                      <p className="text-2xl font-bold text-gray-900">4</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 text-xl">🏪</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Rating Given</p>
                      <p className="text-2xl font-bold text-gray-900">4.7</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <span className="text-yellow-600 text-xl">⭐</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600">✅</span>
                      </div>
                      <div>
                        <p className="font-medium">Order delivered - Shea Butter (500g)</p>
                        <p className="text-sm text-gray-600">From Tamale Naturals • Sep 7, 2025</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600">🚚</span>
                      </div>
                      <div>
                        <p className="font-medium">Order shipped - Ethiopian Coffee Beans</p>
                        <p className="text-sm text-gray-600">From Addis Coffee • Sep 5, 2025</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-yellow-600">🔒</span>
                      </div>
                      <div>
                        <p className="font-medium">Escrow funded - Bespoke Suit</p>
                        <p className="text-sm text-gray-600">To Lagos Tailors • Sep 3, 2025</p>
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
                  <h2 className="text-lg font-semibold text-gray-900">All Orders</h2>
                  <div className="flex gap-3">
                    <button className="text-sm text-gray-600 hover:text-gray-900">Filter</button>
                    <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
                      Fund Escrow
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.vendor}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${order.statusColor}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.escrowId || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button className="text-emerald-600 hover:text-emerald-700 font-medium">View Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="bg-white rounded-xl border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
                  <div className="flex gap-3">
                    <button className="text-sm text-gray-600 hover:text-gray-900">Export</button>
                    <select className="text-sm border rounded-lg px-3 py-1">
                      <option>Last 30 days</option>
                      <option>Last 3 months</option>
                      <option>Last year</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{txn.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{txn.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{txn.order}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{txn.amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{txn.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            {txn.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'vendors' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Your Vendors</h2>
                  <p className="text-sm text-gray-600 mt-1">Vendors you've purchased from and their ratings</p>
                </div>
                
                <div className="p-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    {vendors.map((vendor, idx) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                              <span className="text-emerald-600 font-semibold">{vendor.name.charAt(0)}</span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                {vendor.name}
                                {vendor.verified && <span className="text-emerald-600">✓</span>}
                              </h3>
                              <p className="text-sm text-gray-600">{vendor.orders} orders • {vendor.totalSpent} spent</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span key={star} className={`text-sm ${star <= Math.floor(vendor.rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
                                  ⭐
                                </span>
                              ))}
                            </div>
                            <span className="text-sm font-medium">{vendor.rating}</span>
                          </div>
                          <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                            Rate Vendor
                          </button>
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-2">Last order: {vendor.lastOrder}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Help & Support</h2>
                  <p className="text-sm text-gray-600 mt-1">Get help with your orders and account</p>
                </div>
                
                <div className="p-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="border rounded-lg p-6">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                        <span className="text-blue-600 text-xl">💬</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Live Chat</h3>
                      <p className="text-sm text-gray-600 mb-4">Chat with our support team in real-time</p>
                      <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
                        Start Chat
                      </button>
                    </div>
                    
                    <div className="border rounded-lg p-6">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                        <span className="text-green-600 text-xl">📧</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
                      <p className="text-sm text-gray-600 mb-4">Send us an email and we'll respond within 24 hours</p>
                      <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                        Send Email
                      </button>
                    </div>
                    
                    <div className="border rounded-lg p-6">
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                        <span className="text-yellow-600 text-xl">⚖️</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Dispute Resolution</h3>
                      <p className="text-sm text-gray-600 mb-4">File a dispute for order issues</p>
                      <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                        File Dispute
                      </button>
                    </div>
                    
                    <div className="border rounded-lg p-6">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                        <span className="text-purple-600 text-xl">📚</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Help Center</h3>
                      <p className="text-sm text-gray-600 mb-4">Browse our FAQ and guides</p>
                      <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                        Browse FAQ
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-8 bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Track an order</span>
                        <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">Track →</button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Request refund</span>
                        <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">Request →</button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Report vendor</span>
                        <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">Report →</button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Update payment method</span>
                        <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">Update →</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Buyer;



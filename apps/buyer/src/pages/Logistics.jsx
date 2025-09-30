import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import WalletManager from '../components/WalletManager';

const Logistics = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddRouteForm, setShowAddRouteForm] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      loadLogisticsData();
    }
  }, [currentUser]);

  const loadLogisticsData = async () => {
    try {
      setLoading(true);
      
      // Get logistics profile
      const logisticsProfile = await firebaseService.logistics.getProfileByUserId(currentUser.uid);
      setProfile(logisticsProfile);

      if (logisticsProfile) {
        // Get deliveries
        const deliveriesData = await firebaseService.logistics.getDeliveriesByPartner(logisticsProfile.id);
        setDeliveries(deliveriesData);

        // Get analytics for last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        const analyticsData = await firebaseService.logistics.getAnalytics(
          logisticsProfile.id, 
          startDate, 
          endDate
        );
        setAnalytics(analyticsData);
      }
    } catch (error) {
      console.error('Error loading logistics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Remove hardcoded data - now using real data from backend

  const routes = [
    { id: 'RT-001', from: 'Lagos, Nigeria', to: 'Abuja, Nigeria', distance: '462 km', price: '₦5,000', estimatedTime: '1-2 days', status: 'Active' },
    { id: 'RT-002', from: 'Lagos, Nigeria', to: 'Port Harcourt, Nigeria', distance: '435 km', price: '₦4,500', estimatedTime: '1-2 days', status: 'Active' },
    { id: 'RT-003', from: 'Accra, Ghana', to: 'Kumasi, Ghana', distance: '270 km', price: '₵80', estimatedTime: '1 day', status: 'Active' },
    { id: 'RT-004', from: 'Addis Ababa, Ethiopia', to: 'Dire Dawa, Ethiopia', distance: '515 km', price: 'Br 150', estimatedTime: '2-3 days', status: 'Active' },
    { id: 'RT-005', from: 'Nairobi, Kenya', to: 'Mombasa, Kenya', distance: '480 km', price: 'KSh 500', estimatedTime: '1-2 days', status: 'Inactive' },
  ];

  const earnings = [
    { id: 'ERN-001', month: 'September 2025', deliveries: 45, revenue: '₦225,000', commission: '₦33,750', payout: 'Pending' },
    { id: 'ERN-002', month: 'August 2025', deliveries: 38, revenue: '₦190,000', commission: '₦28,500', payout: 'Completed' },
    { id: 'ERN-003', month: 'July 2025', deliveries: 52, revenue: '₦260,000', commission: '₦39,000', payout: 'Completed' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'In Transit': return 'bg-blue-100 text-blue-800';
      case 'Picked Up': return 'bg-yellow-100 text-yellow-800';
      case 'Pending Pickup': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
              <span className="text-xl font-semibold text-gray-900">Ojawa Logistics</span>
            </Link>
            
            {/* Dashboard Switcher */}
            <div className="mb-8">
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">LOGISTICS MENU</p>
              <button 
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'overview' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                📊 Overview
              </button>
              <button 
                onClick={() => setActiveTab('deliveries')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'deliveries' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                🚚 Deliveries
              </button>
              <button 
                onClick={() => setActiveTab('routes')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'routes' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                🗺️ Routes & Pricing
              </button>
              <button 
                onClick={() => setActiveTab('tracking')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'tracking' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                📍 Tracking
              </button>
              <button 
                onClick={() => setActiveTab('earnings')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'earnings' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                💰 Earnings
              </button>
              <button 
                onClick={() => setActiveTab('wallet')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'wallet' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                💳 My Wallet
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'settings' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                ⚙️ Settings
              </button>
            </div>
          </div>
          
          <div className="absolute bottom-4 left-4">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">← Back to Home</Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Add Route Modal */}
          {showAddRouteForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Add New Route</h2>
                    <button 
                      onClick={() => setShowAddRouteForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                <form className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">From (Pickup Location)</label>
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="City, Country" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">To (Delivery Location)</label>
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="City, Country" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Distance (km)</label>
                      <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Price</label>
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
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Delivery Time</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="e.g., 1-2 days" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                      <option>Standard Delivery</option>
                      <option>Express Delivery</option>
                      <option>Same Day Delivery</option>
                      <option>Overnight Delivery</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button type="submit" className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700">
                      Add Route
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowAddRouteForm(false)}
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
                      <p className="text-sm font-medium text-gray-600">Active Deliveries</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : (analytics?.inTransitDeliveries || 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-xl">🚚</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : (analytics?.totalDeliveries || 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 text-xl">📦</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : `₦${(analytics?.totalEarnings || 0).toLocaleString()}`}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <span className="text-yellow-600 text-xl">💰</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : analytics?.totalDeliveries > 0 
                          ? `${Math.round((analytics.completedDeliveries / analytics.totalDeliveries) * 100)}%`
                          : '0%'
                        }
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 text-xl">📈</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl border">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Recent Deliveries</h2>
                    </div>
                    <div className="p-6">
                      {loading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                          <p className="text-gray-600 mt-2">Loading deliveries...</p>
                        </div>
                      ) : deliveries.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-600">No deliveries yet</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {deliveries.slice(0, 3).map((delivery) => (
                            <div key={delivery.id} className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                delivery.status === 'delivered' ? 'bg-green-100' :
                                delivery.status === 'in_transit' ? 'bg-blue-100' :
                                delivery.status === 'picked_up' ? 'bg-yellow-100' : 'bg-gray-100'
                              }`}>
                                <span className={
                                  delivery.status === 'delivered' ? 'text-green-600' :
                                  delivery.status === 'in_transit' ? 'text-blue-600' :
                                  delivery.status === 'picked_up' ? 'text-yellow-600' : 'text-gray-600'
                                }>
                                  {delivery.status === 'delivered' ? '✅' : 
                                   delivery.status === 'in_transit' ? '🚚' :
                                   delivery.status === 'picked_up' ? '📦' : '⏳'}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{delivery.pickupLocation} → {delivery.deliveryLocation}</p>
                                <p className="text-sm text-gray-600">
                                  {delivery.customerName} • ₦{delivery.amount?.toLocaleString()} • {delivery.status}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
                        onClick={() => setShowAddRouteForm(true)}
                        className="w-full bg-emerald-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                      >
                        Add New Route
                      </button>
                      <button 
                        onClick={() => setActiveTab('deliveries')}
                        className="w-full border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Manage Deliveries
                      </button>
                      <button 
                        onClick={() => setActiveTab('tracking')}
                        className="w-full border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Track Packages
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
                          <span className="text-sm text-gray-600">On-Time Delivery</span>
                          <span className="text-sm font-medium">98.5%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Customer Rating</span>
                          <span className="text-sm font-medium">4.9 ⭐</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Active Routes</span>
                          <span className="text-sm font-medium">12</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'deliveries' && (
            <div className="bg-white rounded-xl border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Delivery Management</h2>
                  <div className="flex gap-3">
                    <select className="text-sm border rounded-lg px-3 py-1">
                      <option>All Deliveries</option>
                      <option>Pending Pickup</option>
                      <option>In Transit</option>
                      <option>Delivered</option>
                    </select>
                    <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
                      Export Data
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Delivery</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deliveries.map((delivery) => (
                      <tr key={delivery.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{delivery.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{delivery.orderId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <p className="font-medium">{delivery.pickup}</p>
                            <p className="text-xs text-gray-400">→ {delivery.delivery}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{delivery.customer}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                            {delivery.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{delivery.amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{delivery.estimatedDelivery}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button className="text-emerald-600 hover:text-emerald-700 font-medium">Track</button>
                            <button className="text-blue-600 hover:text-blue-700 font-medium">Update</button>
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

          {activeTab === 'routes' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Routes & Pricing Management</h2>
                <button 
                  onClick={() => setShowAddRouteForm(true)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700"
                >
                  Add New Route
                </button>
              </div>

              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Available Routes</h3>
                    <div className="flex gap-3">
                      <select className="text-sm border rounded-lg px-3 py-1">
                        <option>All Routes</option>
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {routes.map((route) => (
                        <tr key={route.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{route.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{route.from}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{route.to}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{route.distance}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{route.price}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{route.estimatedTime}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              route.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {route.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button className="text-emerald-600 hover:text-emerald-700 font-medium">Edit</button>
                              <button className="text-blue-600 hover:text-blue-700 font-medium">
                                {route.status === 'Active' ? 'Deactivate' : 'Activate'}
                              </button>
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

          {activeTab === 'tracking' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Package Tracking</h2>
                </div>
                
                <div className="p-6">
                  <div className="mb-6">
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        placeholder="Enter tracking ID or order ID"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      <button className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700">
                        Track
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {deliveries.slice(0, 4).map((delivery) => (
                      <div key={delivery.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{delivery.trackingId}</h3>
                            <p className="text-sm text-gray-600">{delivery.orderId}</p>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                            {delivery.status}
                          </span>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">From:</span>
                            <span className="font-medium">{delivery.pickup}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">To:</span>
                            <span className="font-medium">{delivery.delivery}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Customer:</span>
                            <span className="font-medium">{delivery.customer}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Est. Delivery:</span>
                            <span className="font-medium">{delivery.estimatedDelivery}</span>
                          </div>
                        </div>
                        
                        <button className="w-full text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                          View Full Tracking Details
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'earnings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Earnings Overview</h2>
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deliveries</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission (15%)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payout Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {earnings.map((earning) => (
                        <tr key={earning.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{earning.month}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{earning.deliveries}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{earning.revenue}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{earning.commission}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              earning.payout === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {earning.payout}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Company Information</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" value="Swift Logistics" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                      <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2" value="info@swiftlogistics.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input type="tel" className="w-full border border-gray-300 rounded-lg px-3 py-2" value="+234-xxx-xxxx" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Business License</label>
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" value="BL-2023-001" />
                    </div>
                  </div>
                  <button className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700">
                    Update Information
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Payout Settings</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Enter bank name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Enter account number" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Enter account name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Payout</label>
                      <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="10000" />
                    </div>
                  </div>
                  <button className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700">
                    Update Payout Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wallet' && (
            <WalletManager userType="logistics" />
          )}
        </div>
      </div>
    </div>
  );
};

export default Logistics;

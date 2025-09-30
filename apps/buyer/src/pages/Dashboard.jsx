import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

const Dashboard = () => {
  const { userProfile, currentUser } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Redirect to appropriate dashboard based on user role
  useEffect(() => {
    if (userProfile && !loading) {
      // All users start as buyers, so redirect to buyer dashboard
      navigate('/buyer', { replace: true });
    }
  }, [userProfile, loading, navigate]);

  useEffect(() => {
    if (currentUser) {
      fetchUserOrders();
    }
  }, [currentUser]);

  const fetchUserOrders = async () => {
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('buyerId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown date';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Welcome, {userProfile?.displayName || 'User'}!</h2>
          <p className="text-gray-600 mb-4">This is your personal dashboard where you can manage your account and view your orders.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Total Orders</h3>
              <p className="text-blue-700 text-2xl font-bold">{orders.length}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Account Info</h3>
              <p className="text-green-700">Email: {userProfile?.email}</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">Total Spent</h3>
              <p className="text-purple-700 text-2xl font-bold">
                ₦{orders.reduce((sum, order) => sum + (order.total || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Your Orders</h2>
          </div>
          
          {orders.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500 text-lg mb-4">No orders yet</p>
              <p className="text-gray-400">Start shopping to see your orders here!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {orders.map((order) => (
                <div key={order.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Order #{order.id.slice(-8)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Placed on {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        ${order.total?.toFixed(2) || '0.00'}
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status || 'pending'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {order.items?.map((item, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <img
                          src={item.image || (Array.isArray(item.images) && item.images[0]) || '/placeholder.png'}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  {order.paymentIntentId && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Payment ID: {order.paymentIntentId}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

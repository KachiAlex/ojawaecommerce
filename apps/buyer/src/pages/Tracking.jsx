import { useState } from 'react';
import TrackingStatus from '../components/TrackingStatus';

const Tracking = () => {
  const [trackingId, setTrackingId] = useState('');
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Mock tracking data
  const mockTrackingData = {
    'TRK-001': {
      orderId: 'ORD-2001',
      trackingId: 'TRK-001',
      status: 'In Transit',
      item: 'Bespoke Suit',
      vendor: 'Lagos Tailors',
      customer: 'Amina K.',
      pickup: 'Lagos, Nigeria',
      delivery: 'Abuja, Nigeria',
      estimatedDelivery: '2025-09-18',
      logisticsCompany: 'Swift Logistics',
      timeline: [
        { status: 'Order Placed', timestamp: '2025-09-03 14:30', location: 'Lagos, Nigeria', completed: true },
        { status: 'Pending Pickup', timestamp: '2025-09-03 16:00', location: 'Lagos, Nigeria', completed: true },
        { status: 'Picked Up', timestamp: '2025-09-04 09:15', location: 'Lagos, Nigeria', completed: true },
        { status: 'In Transit', timestamp: '2025-09-04 11:30', location: 'En route to Abuja', completed: true },
        { status: 'Out for Delivery', timestamp: null, location: 'Abuja, Nigeria', completed: false },
        { status: 'Delivered', timestamp: null, location: 'Abuja, Nigeria', completed: false },
      ]
    },
    'TRK-002': {
      orderId: 'ORD-2002',
      trackingId: 'TRK-002',
      status: 'Delivered',
      item: 'Ethiopian Coffee Beans',
      vendor: 'Addis Coffee',
      customer: 'Peter M.',
      pickup: 'Addis Ababa, Ethiopia',
      delivery: 'Dire Dawa, Ethiopia',
      estimatedDelivery: '2025-09-16',
      logisticsCompany: 'Express Delivery Co.',
      timeline: [
        { status: 'Order Placed', timestamp: '2025-09-05 10:20', location: 'Addis Ababa, Ethiopia', completed: true },
        { status: 'Pending Pickup', timestamp: '2025-09-05 12:00', location: 'Addis Ababa, Ethiopia', completed: true },
        { status: 'Picked Up', timestamp: '2025-09-06 08:30', location: 'Addis Ababa, Ethiopia', completed: true },
        { status: 'In Transit', timestamp: '2025-09-06 10:45', location: 'En route to Dire Dawa', completed: true },
        { status: 'Out for Delivery', timestamp: '2025-09-07 07:00', location: 'Dire Dawa, Ethiopia', completed: true },
        { status: 'Delivered', timestamp: '2025-09-07 14:30', location: 'Dire Dawa, Ethiopia', completed: true },
      ]
    }
  };

  const handleTrack = () => {
    if (!trackingId.trim()) {
      setError('Please enter a tracking ID');
      return;
    }

    setLoading(true);
    setError('');

    // Simulate API call
    setTimeout(() => {
      const data = mockTrackingData[trackingId.toUpperCase()];
      if (data) {
        setTrackingData(data);
        setError('');
      } else {
        setError('Tracking ID not found. Please check and try again.');
        setTrackingData(null);
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Track Your Package</h1>
        <p className="text-gray-600">Enter your tracking ID to get real-time updates on your delivery</p>
      </div>

      {/* Tracking Search */}
      <div className="bg-white rounded-xl border p-6 mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            placeholder="Enter tracking ID (e.g., TRK-001)"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
          />
          <button
            onClick={handleTrack}
            disabled={loading}
            className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Tracking...' : 'Track Package'}
          </button>
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Tracking Results */}
      {trackingData && (
        <div className="space-y-6">
          {/* Package Info */}
          <div className="bg-white rounded-xl border p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Package Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-medium">{trackingData.orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Item:</span>
                    <span className="font-medium">{trackingData.item}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vendor:</span>
                    <span className="font-medium">{trackingData.vendor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">{trackingData.customer}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">From:</span>
                    <span className="font-medium">{trackingData.pickup}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">To:</span>
                    <span className="font-medium">{trackingData.delivery}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Logistics Partner:</span>
                    <span className="font-medium">{trackingData.logisticsCompany}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Est. Delivery:</span>
                    <span className="font-medium">{trackingData.estimatedDelivery}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tracking Timeline */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Tracking Timeline</h3>
            
            <div className="space-y-6">
              {trackingData.timeline.map((event, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    event.completed 
                      ? 'bg-emerald-100 text-emerald-600' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    <span className="text-lg">
                      {event.status === 'Order Placed' ? '📋' :
                       event.status === 'Pending Pickup' ? '⏳' :
                       event.status === 'Picked Up' ? '📦' :
                       event.status === 'In Transit' ? '🚚' :
                       event.status === 'Out for Delivery' ? '🏃‍♂️' :
                       event.status === 'Delivered' ? '✅' : '📍'}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`font-medium ${event.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                        {event.status}
                      </h4>
                      {event.timestamp && (
                        <span className="text-sm text-gray-500">{event.timestamp}</span>
                      )}
                    </div>
                    <p className={`text-sm ${event.completed ? 'text-gray-600' : 'text-gray-400'}`}>
                      📍 {event.location}
                    </p>
                    {event.status === trackingData.status && (
                      <span className="inline-block mt-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                        Current Status
                      </span>
                    )}
                  </div>
                  
                  {event.completed && (
                    <div className="flex-shrink-0">
                      <span className="text-emerald-600">✓</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact & Support */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="flex items-center gap-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50">
                <span className="text-xl">📞</span>
                <div className="text-left">
                  <p className="font-medium text-sm">Contact Logistics</p>
                  <p className="text-xs text-gray-600">{trackingData.logisticsCompany}</p>
                </div>
              </button>
              
              <button className="flex items-center gap-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50">
                <span className="text-xl">💬</span>
                <div className="text-left">
                  <p className="font-medium text-sm">Chat with Vendor</p>
                  <p className="text-xs text-gray-600">{trackingData.vendor}</p>
                </div>
              </button>
              
              <button className="flex items-center gap-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50">
                <span className="text-xl">🆘</span>
                <div className="text-left">
                  <p className="font-medium text-sm">Report Issue</p>
                  <p className="text-xs text-gray-600">Get help from Ojawa</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sample Tracking IDs for Demo */}
      {!trackingData && !loading && (
        <div className="bg-gray-50 rounded-xl border p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Demo Tracking IDs</h3>
          <p className="text-gray-600 mb-4">Try these sample tracking IDs to see the system in action:</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button 
              onClick={() => setTrackingId('TRK-001')}
              className="bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              TRK-001 (In Transit)
            </button>
            <button 
              onClick={() => setTrackingId('TRK-002')}
              className="bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              TRK-002 (Delivered)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tracking;

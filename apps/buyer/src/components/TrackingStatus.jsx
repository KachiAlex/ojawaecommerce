import { useState } from 'react';

const TrackingStatus = ({ orderId, trackingId, initialStatus = 'Pending Pickup' }) => {
  const [currentStatus, setCurrentStatus] = useState(initialStatus);

  const trackingSteps = [
    { 
      id: 1, 
      status: 'Order Placed', 
      description: 'Order confirmed and ready for pickup',
      icon: '📋',
      completed: true
    },
    { 
      id: 2, 
      status: 'Pending Pickup', 
      description: 'Waiting for logistics partner to collect package',
      icon: '⏳',
      completed: currentStatus !== 'Order Placed'
    },
    { 
      id: 3, 
      status: 'Picked Up', 
      description: 'Package collected from vendor location',
      icon: '📦',
      completed: ['Picked Up', 'In Transit', 'Out for Delivery', 'Delivered'].includes(currentStatus)
    },
    { 
      id: 4, 
      status: 'In Transit', 
      description: 'Package is on the way to destination',
      icon: '🚚',
      completed: ['In Transit', 'Out for Delivery', 'Delivered'].includes(currentStatus)
    },
    { 
      id: 5, 
      status: 'Out for Delivery', 
      description: 'Package is out for final delivery',
      icon: '🏃‍♂️',
      completed: ['Out for Delivery', 'Delivered'].includes(currentStatus)
    },
    { 
      id: 6, 
      status: 'Delivered', 
      description: 'Package successfully delivered to customer',
      icon: '✅',
      completed: currentStatus === 'Delivered'
    }
  ];

  const getCurrentStepIndex = () => {
    return trackingSteps.findIndex(step => step.status === currentStatus);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered': return 'text-green-600 bg-green-100';
      case 'Out for Delivery': return 'text-blue-600 bg-blue-100';
      case 'In Transit': return 'text-blue-600 bg-blue-100';
      case 'Picked Up': return 'text-yellow-600 bg-yellow-100';
      case 'Pending Pickup': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Package Tracking</h3>
          <p className="text-sm text-gray-600">Order: {orderId} • Tracking: {trackingId}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentStatus)}`}>
          {currentStatus}
        </span>
      </div>

      <div className="space-y-4">
        {trackingSteps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              step.completed 
                ? 'bg-emerald-100 text-emerald-600' 
                : 'bg-gray-100 text-gray-400'
            }`}>
              <span className="text-lg">{step.icon}</span>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={`font-medium ${step.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                  {step.status}
                </h4>
                {step.status === currentStatus && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                    Current
                  </span>
                )}
              </div>
              <p className={`text-sm ${step.completed ? 'text-gray-600' : 'text-gray-400'}`}>
                {step.description}
              </p>
              {step.completed && step.status !== 'Order Placed' && (
                <p className="text-xs text-gray-500 mt-1">
                  {step.status === currentStatus ? 'In progress' : 'Completed'}
                </p>
              )}
            </div>
            
            {step.completed && (
              <div className="flex-shrink-0">
                <span className="text-emerald-600">✓</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Estimated Delivery:</span>
            <p className="font-medium">Sep 18, 2025</p>
          </div>
          <div>
            <span className="text-gray-600">Logistics Partner:</span>
            <p className="font-medium">Swift Logistics</p>
          </div>
        </div>
      </div>

      {currentStatus !== 'Delivered' && (
        <div className="mt-4 text-center">
          <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
            Get Real-time Updates via SMS
          </button>
        </div>
      )}
    </div>
  );
};

export default TrackingStatus;

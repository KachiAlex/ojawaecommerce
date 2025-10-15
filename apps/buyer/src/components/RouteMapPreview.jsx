import { useState, useEffect } from 'react';

const RouteMapPreview = ({ route, isOpen, onClose }) => {
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    if (isOpen && route) {
      // Create static map URL (no API key needed for basic display)
      // Or use Google Maps embed link
      const from = encodeURIComponent(route.from);
      const to = encodeURIComponent(route.to);
      
      // Google Maps directions link (opens in new tab)
      const directionsUrl = `https://www.google.com/maps/dir/${from}/${to}`;
      setMapUrl(directionsUrl);
    }
  }, [isOpen, route]);

  if (!isOpen || !route) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900">🗺️ Route Preview</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
          </div>
          
          {/* Route Info */}
          <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-2xl font-bold text-gray-900">{route.from}</div>
                <div className="text-sm text-gray-600">Origin</div>
              </div>
              <div className="text-3xl text-gray-400">→</div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{route.to}</div>
                <div className="text-sm text-gray-600">Destination</div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-200">
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-600">{route.distance} km</div>
                <div className="text-xs text-gray-600">Distance</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">₦{route.price?.toLocaleString()}</div>
                <div className="text-xs text-gray-600">Price</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">{route.estimatedTime}</div>
                <div className="text-xs text-gray-600">Est. Time</div>
              </div>
            </div>
          </div>
          
          {/* Map Placeholder / Link */}
          <div className="mb-6">
            <div className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
              <div className="text-6xl mb-4">🗺️</div>
              <div className="text-gray-700 font-medium mb-4">
                View this route on Google Maps
              </div>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Open in Google Maps →
              </a>
              <div className="text-xs text-gray-500 mt-3">
                Opens in a new tab with full route details and navigation
              </div>
            </div>
          </div>
          
          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-xs text-blue-600 font-medium mb-1">Vehicle Type</div>
              <div className="text-sm text-blue-900">{route.vehicleType || 'Van'}</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-xs text-purple-600 font-medium mb-1">Service Type</div>
              <div className="text-sm text-purple-900">{route.serviceType || 'Standard Delivery'}</div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteMapPreview;


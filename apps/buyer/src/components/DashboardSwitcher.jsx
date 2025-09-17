import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DashboardSwitcher = ({ currentDashboard = 'buyer' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile } = useAuth();

  // Get available dashboards based on user profile
  const getAvailableDashboards = () => {
    const allDashboards = [
      {
        key: 'buyer',
        name: 'Buyer Dashboard',
        icon: '🛒',
        description: 'Orders, wallet, vendors',
        color: 'emerald',
        path: '/buyer',
        available: true // All users are buyers
      },
      {
        key: 'vendor',
        name: 'Vendor Dashboard', 
        icon: '🏪',
        description: 'Products, sales, analytics',
        color: 'blue',
        path: '/vendor',
        available: userProfile?.isVendor || false
      },
      {
        key: 'logistics',
        name: 'Logistics Dashboard',
        icon: '🚚', 
        description: 'Deliveries, routes, earnings',
        color: 'purple',
        path: '/logistics',
        available: userProfile?.isLogisticsPartner || false
      }
    ];

    return allDashboards.filter(dashboard => dashboard.available);
  };

  const dashboards = getAvailableDashboards();

  const currentDashboardInfo = dashboards.find(d => d.key === currentDashboard) || dashboards[0];
  const otherDashboards = dashboards.filter(d => d.key !== currentDashboard);

  const handleSwitch = (dashboard) => {
    setIsOpen(false);
    navigate(dashboard.path);
  };

  const getColorClasses = (color, isActive = false) => {
    const colorMap = {
      emerald: {
        bg: isActive ? 'bg-emerald-100' : 'hover:bg-emerald-50',
        text: isActive ? 'text-emerald-700' : 'hover:text-emerald-600',
        border: 'border-emerald-200'
      },
      blue: {
        bg: isActive ? 'bg-blue-100' : 'hover:bg-blue-50',
        text: isActive ? 'text-blue-700' : 'hover:text-blue-600',
        border: 'border-blue-200'
      },
      purple: {
        bg: isActive ? 'bg-purple-100' : 'hover:bg-purple-50',
        text: isActive ? 'text-purple-700' : 'hover:text-purple-600',
        border: 'border-purple-200'
      }
    };
    return colorMap[color] || colorMap.emerald;
  };

  return (
    <div className="relative">
      {/* Current Dashboard Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${getColorClasses(currentDashboardInfo.color, true).bg} ${getColorClasses(currentDashboardInfo.color, true).text} ${getColorClasses(currentDashboardInfo.color).border}`}
      >
        <span className="text-xl">{currentDashboardInfo.icon}</span>
        <div className="text-left">
          <p className="font-semibold text-sm">{currentDashboardInfo.name}</p>
          <p className="text-xs opacity-75">{currentDashboardInfo.description}</p>
        </div>
        <svg 
          className={`w-4 h-4 transition-transform ml-2 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-lg border z-50 overflow-hidden">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b mb-2">
              Switch Dashboard
            </div>
            
            {otherDashboards.map((dashboard) => (
              <button
                key={dashboard.key}
                onClick={() => handleSwitch(dashboard)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${getColorClasses(dashboard.color).bg} ${getColorClasses(dashboard.color).text}`}
              >
                <span className="text-lg">{dashboard.icon}</span>
                <div className="text-left">
                  <p className="font-medium text-sm">{dashboard.name}</p>
                  <p className="text-xs opacity-75">{dashboard.description}</p>
                </div>
              </button>
            ))}
            
            {/* Show "Become a Vendor" option if user isn't a vendor yet */}
            {!userProfile?.isVendor && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/become-vendor');
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors hover:bg-blue-50 hover:text-blue-600 border-t border-gray-100 mt-2 pt-3"
              >
                <span className="text-lg">🏪</span>
                <div className="text-left">
                  <p className="font-medium text-sm">Become a Vendor</p>
                  <p className="text-xs opacity-75">Start selling on Ojawa</p>
                </div>
                <span className="text-blue-500 text-xs ml-auto">→</span>
              </button>
            )}
            
            {/* Show "Become a Logistics Partner" option if user isn't one yet */}
            {!userProfile?.isLogisticsPartner && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/become-logistics');
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors hover:bg-purple-50 hover:text-purple-600"
              >
                <span className="text-lg">🚚</span>
                <div className="text-left">
                  <p className="font-medium text-sm">Become a Logistics Partner</p>
                  <p className="text-xs opacity-75">Provide delivery services</p>
                </div>
                <span className="text-purple-500 text-xs ml-auto">→</span>
              </button>
            )}
          </div>

          {/* Info Section */}
          <div className="bg-gray-50 p-3 border-t">
            <div className="flex items-start gap-2">
              <span className="text-blue-500">ℹ️</span>
              <div className="text-xs text-gray-600">
                <p className="font-medium mb-1">Multi-Role Access</p>
                <p>You can be both a buyer and vendor on Ojawa. Switch between dashboards to manage different activities.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardSwitcher;

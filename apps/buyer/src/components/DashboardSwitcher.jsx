import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RoleAuthModal from './RoleAuthModal';

const DashboardSwitcher = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showRoleAuthModal, setShowRoleAuthModal] = useState(false);
  const [targetRole, setTargetRole] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Determine current dashboard
  const getCurrentDashboard = () => {
    const path = location.pathname;
    if (path.includes('/vendor')) return 'vendor';
    if (path.includes('/logistics')) return 'logistics';
    if (path.includes('/admin')) return 'admin';
    return 'buyer';
  };

  // Determine user's available roles
  const getUserRoles = () => {
    const roles = ['buyer']; // Everyone can be a buyer
    
    if (userProfile?.role === 'vendor' || userProfile?.isVendor) {
      roles.push('vendor');
    }
    if (userProfile?.role === 'logistics' || userProfile?.isLogisticsPartner) {
      roles.push('logistics');
    }
    if (userProfile?.role === 'admin' || userProfile?.isAdmin) {
      roles.push('admin');
    }
    
    return roles;
  };

  // Get primary dashboard (first available)
  const getPrimaryDashboard = () => {
    const roles = getUserRoles();
    if (roles.includes('vendor')) return 'vendor';
    if (roles.includes('logistics')) return 'logistics';
    if (roles.includes('admin')) return 'admin';
    return 'buyer';
  };

  // Handle dashboard switch
  const handleDashboardSwitch = (dashboard) => {
    setIsDropdownOpen(false);
    const userRoles = getUserRoles();

    // Check if user has access to this dashboard
    if (userRoles.includes(dashboard)) {
      // User has access, navigate directly
      navigate(`/${dashboard}`);
    } else {
      // User doesn't have access, show auth modal
      setTargetRole(dashboard);
      setShowRoleAuthModal(true);
    }
  };

  // Handle successful role creation/login
  const handleRoleAuthSuccess = (role) => {
    setShowRoleAuthModal(false);
    setTargetRole(null);
    navigate(`/${role}`);
  };

  const currentDashboard = getCurrentDashboard();
  const userRoles = getUserRoles();

  const dashboards = [
    {
      id: 'buyer',
      name: 'Buyer',
      icon: '🛒',
      description: 'Orders & Shopping',
      color: 'emerald'
    },
    {
      id: 'vendor',
      name: 'Vendor',
      icon: '🏪',
      description: 'Store & Products',
      color: 'blue'
    },
    {
      id: 'logistics',
      name: 'Logistics',
      icon: '🚚',
      description: 'Deliveries & Routes',
      color: 'purple'
    }
  ];

  // Filter admin if user is admin
  if (userRoles.includes('admin')) {
    dashboards.push({
      id: 'admin',
      name: 'Admin',
      icon: '⚙️',
      description: 'Platform Management',
      color: 'red'
    });
  }

  const currentDashboardInfo = dashboards.find(d => d.id === currentDashboard);

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
        >
          <span className="text-lg">{currentDashboardInfo?.icon}</span>
          <span className="font-medium text-gray-700">{currentDashboardInfo?.name} Dashboard</span>
          <svg 
            className={`w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>

        {isDropdownOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-30" 
              onClick={() => setIsDropdownOpen(false)}
            ></div>

            {/* Dropdown */}
            <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border z-40">
              <div className="p-2">
                <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Switch Dashboard
                </p>
                
                {dashboards.map((dashboard) => {
                  const hasAccess = userRoles.includes(dashboard.id);
                  const isCurrent = dashboard.id === currentDashboard;

                  return (
                    <button
                      key={dashboard.id}
                      onClick={() => handleDashboardSwitch(dashboard.id)}
                      disabled={isCurrent}
                      className={`
                        w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors
                        ${isCurrent 
                          ? 'bg-gray-100 cursor-default' 
                          : `hover:bg-${dashboard.color}-50 hover:text-${dashboard.color}-600`
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{dashboard.icon}</span>
                        <div className="text-left">
                          <p className="font-medium text-sm">{dashboard.name}</p>
                          <p className="text-xs text-gray-500">{dashboard.description}</p>
                        </div>
                      </div>
                      
                      {isCurrent && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                          Active
                        </span>
                      )}
                      
                      {!isCurrent && !hasAccess && (
                        <span className="text-xs text-gray-400">
                          🔒
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Role Auth Modal */}
      {showRoleAuthModal && (
        <RoleAuthModal
          role={targetRole}
          onClose={() => {
            setShowRoleAuthModal(false);
            setTargetRole(null);
          }}
          onSuccess={handleRoleAuthSuccess}
        />
      )}
    </>
  );
};

export default DashboardSwitcher;


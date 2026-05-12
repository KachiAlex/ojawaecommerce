import { lazy, Suspense } from 'react';
import { LoadingSpinner } from './LoadingStates';

// Lazy load heavy components
export const LazyAdminDashboard = lazy(() => import('../pages/AdminDashboard'));
export const LazyVendor = lazy(() => import('../pages/Vendor'));
export const LazyLogistics = lazy(() => import('../pages/Logistics'));
export const LazyTracking = lazy(() => import('../pages/Tracking'));
export const LazyBecomeVendor = lazy(() => import('../pages/BecomeVendor'));
export const LazyBecomeLogistics = lazy(() => import('../pages/BecomeLogistics'));
export const LazyMessagingInterface = lazy(() => import('./MessagingInterface'));
export const LazyDisputeResolutionDashboard = lazy(() => import('./DisputeResolutionDashboard'));
export const LazyAdvancedDisputeModal = lazy(() => import('./AdvancedDisputeModal'));
export const LazyOrderTransactionModal = lazy(() => import('./OrderTransactionModal'));
export const LazyDeliveryTrackingModal = lazy(() => import('./DeliveryTrackingModal'));
export const LazyOrderSatisfactionModal = lazy(() => import('./OrderSatisfactionModal'));

// Lazy load with fallback
export const withLazyLoading = (Component) => {
  return (props) => (
    <Suspense fallback={<LoadingSpinner />}>
      <Component {...props} />
    </Suspense>
  );
};

// Preload components for better UX
export const preloadComponents = () => {
  // Preload critical components
  import('../pages/AdminDashboard');
  import('../pages/Vendor');
  import('./MessagingInterface');
};

// Route-based code splitting
export const LazyRoute = ({ children }) => (
  <Suspense fallback={<LoadingSpinner />}>
    {children}
  </Suspense>
);

import React from 'react';

// Base skeleton component
const Skeleton = ({ className = '', children, ...props }) => (
  <div
    className={`animate-pulse bg-gray-200 rounded ${className}`}
    {...props}
  >
    {children}
  </div>
);

// Product card skeleton
export const ProductCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    <Skeleton className="h-48 w-full" />
    <div className="p-4">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2 mb-2" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  </div>
);

// Product list skeleton
export const ProductListSkeleton = ({ count = 8 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {Array.from({ length: count }).map((_, index) => (
      <ProductCardSkeleton key={index} />
    ))}
  </div>
);

// Order item skeleton
export const OrderItemSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
    <div className="flex items-center space-x-4">
      <Skeleton className="h-16 w-16 rounded" />
      <div className="flex-1">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2 mb-2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <div className="text-right">
        <Skeleton className="h-4 w-16 mb-2" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  </div>
);

// Order list skeleton
export const OrderListSkeleton = ({ count = 5 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, index) => (
      <OrderItemSkeleton key={index} />
    ))}
  </div>
);

// Table skeleton
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="bg-white rounded-lg shadow overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200">
      <Skeleton className="h-4 w-1/4" />
    </div>
    <div className="divide-y divide-gray-200">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4 flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

// Dashboard stats skeleton
export const DashboardStatsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="bg-white rounded-lg shadow p-6">
        <Skeleton className="h-4 w-1/2 mb-2" />
        <Skeleton className="h-8 w-1/3 mb-2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    ))}
  </div>
);

// Chart skeleton
export const ChartSkeleton = ({ height = 300 }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <Skeleton className="h-6 w-1/3 mb-4" />
    <Skeleton className={`w-full rounded`} style={{ height: `${height}px` }} />
  </div>
);

// Profile skeleton
export const ProfileSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center space-x-4 mb-6">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div>
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
    <div className="space-y-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  </div>
);

// Message skeleton
export const MessageSkeleton = () => (
  <div className="flex space-x-3 mb-4">
    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
    <div className="flex-1">
      <Skeleton className="h-4 w-1/4 mb-2" />
      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
  </div>
);

// Notification skeleton
export const NotificationSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm p-4 mb-2">
    <div className="flex items-start space-x-3">
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1">
        <Skeleton className="h-4 w-1/3 mb-2" />
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-3 w-12" />
    </div>
  </div>
);

// Page loading skeleton
export const PageLoadingSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    {/* Header skeleton */}
    <div className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Skeleton className="h-8 w-32" />
          <div className="flex space-x-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
    </div>

    {/* Content skeleton */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Skeleton className="h-8 w-1/3 mb-6" />
      <DashboardStatsSkeleton />
    </div>
  </div>
);

// Generic content skeleton
export const ContentSkeleton = ({ lines = 3, className = '' }) => (
  <div className={className}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        className={`h-4 mb-2 ${index === lines - 1 ? 'w-2/3' : 'w-full'}`}
      />
    ))}
  </div>
);

export default Skeleton;

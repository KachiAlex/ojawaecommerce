import React from 'react'

// Skeleton loader for product cards
export const ProductCardSkeleton = () => (
  <div className="overflow-hidden rounded-xl border bg-white animate-pulse">
    <div className="aspect-square w-full bg-gray-200"></div>
    <div className="p-4">
      <div className="mb-2">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="flex items-center justify-between">
        <div className="h-5 bg-gray-200 rounded w-1/4"></div>
        <div className="h-8 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  </div>
)

// Skeleton loader for product list
export const ProductListSkeleton = ({ count = 8 }) => (
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: count }).map((_, index) => (
      <ProductCardSkeleton key={index} />
    ))}
  </div>
)

// Loading spinner component
export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }

  return (
    <div className={`animate-spin rounded-full border-b-2 border-emerald-600 ${sizeClasses[size]} ${className}`}></div>
  )
}

// Loading overlay
export const LoadingOverlay = ({ isLoading, children, message = 'Loading...' }) => {
  if (!isLoading) return children

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">{message}</p>
        </div>
      </div>
    </div>
  )
}

// Button loading state
export const LoadingButton = ({ isLoading, children, disabled, className = '', ...props }) => (
  <button
    disabled={disabled || isLoading}
    className={`inline-flex items-center justify-center ${className}`}
    {...props}
  >
    {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
    {children}
  </button>
)

// Page loading skeleton
export const PageLoadingSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
    {/* Header skeleton */}
    <div className="max-w-7xl mx-auto px-4 pt-16 pb-12 space-y-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-48"></div>
      <div className="h-12 bg-gray-200 rounded w-3/4"></div>
      <div className="h-6 bg-gray-200 rounded w-1/2"></div>
      <div className="flex gap-3">
        <div className="h-10 bg-gray-200 rounded w-32"></div>
        <div className="h-10 bg-gray-200 rounded w-24"></div>
      </div>
    </div>

    {/* Products skeleton */}
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
      <ProductListSkeleton count={8} />
    </div>
  </div>
)

// Table loading skeleton
export const TableLoadingSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="animate-pulse">
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} className="px-6 py-3">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

// Card loading skeleton
export const CardLoadingSkeleton = () => (
  <div className="bg-white rounded-lg shadow animate-pulse">
    <div className="p-6">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="space-y-3">
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        <div className="h-3 bg-gray-200 rounded w-4/6"></div>
      </div>
    </div>
  </div>
)

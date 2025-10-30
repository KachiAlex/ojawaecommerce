import { useState, useEffect } from 'react'
import { orderWorkflowManager } from '../services/orderWorkflow'
import { LoadingSpinner } from './LoadingStates'

const OrderTimeline = ({ order, showDetails = true, compact = false }) => {
  const [timeline, setTimeline] = useState([])
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (order) {
      const orderTimeline = orderWorkflowManager.getOrderTimeline(order)
      const orderProgress = orderWorkflowManager.getOrderProgress(order)
      setTimeline(orderTimeline)
      setProgress(orderProgress)
    }
  }, [order])

  if (!order || timeline.length === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        <LoadingSpinner size="sm" />
      </div>
    )
  }

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      payment_pending: '💳',
      payment_failed: '❌',
      confirmed: '✅',
      escrow_funded: '🔒',
      processing: '🔄',
      ready_for_shipment: '📦',
      shipped: '🚚',
      in_transit: '🚛',
      out_for_delivery: '🏃‍♂️',
      delivered: '📬',
      completed: '🎉',
      cancelled: '🚫',
      refunded: '💰',
      disputed: '⚖️',
      returned: '↩️'
    }
    return icons[status] || '📋'
  }

  const getStatusColorClasses = (status, isCurrent) => {
    const colors = {
      yellow: isCurrent ? 'bg-yellow-100 border-yellow-400 text-yellow-800' : 'bg-yellow-50 border-yellow-200 text-yellow-600',
      blue: isCurrent ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-blue-50 border-blue-200 text-blue-600',
      green: isCurrent ? 'bg-green-100 border-green-400 text-green-800' : 'bg-green-50 border-green-200 text-green-600',
      emerald: isCurrent ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : 'bg-emerald-50 border-emerald-200 text-emerald-600',
      red: isCurrent ? 'bg-red-100 border-red-400 text-red-800' : 'bg-red-50 border-red-200 text-red-600',
      purple: isCurrent ? 'bg-purple-100 border-purple-400 text-purple-800' : 'bg-purple-50 border-purple-200 text-purple-600',
      orange: isCurrent ? 'bg-orange-100 border-orange-400 text-orange-800' : 'bg-orange-50 border-orange-200 text-orange-600',
      gray: isCurrent ? 'bg-gray-100 border-gray-400 text-gray-800' : 'bg-gray-50 border-gray-200 text-gray-600'
    }

    const color = orderWorkflowManager.getStatusColor(status)
    return colors[color] || colors.gray
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60)
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours)
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24)
      return `${days} day${days !== 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">Order Status</h3>
          <span className="text-xs text-gray-500">{progress}% Complete</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{getStatusIcon(order.status)}</span>
              <span className={`text-sm font-medium px-2 py-1 rounded-full border ${getStatusColorClasses(order.status, true)}`}>
                {orderWorkflowManager.getStatusDisplayName(order.status)}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {orderWorkflowManager.getStatusDescription(order.status)}
            </p>
          </div>
          
          <div className="w-16 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Order Timeline</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Progress:</span>
          <span className="text-sm font-medium text-emerald-600">{progress}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {timeline.map((item, index) => (
          <div key={index} className="flex items-start gap-4">
            {/* Icon */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center ${
              item.isCurrent ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 bg-white'
            }`}>
              <span className="text-lg">
                {item.isCurrent ? '📍' : getStatusIcon(item.status)}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={`text-sm font-medium px-2 py-1 rounded-full border ${getStatusColorClasses(item.status, item.isCurrent)}`}>
                  {item.name}
                </h4>
                {item.isCurrent && (
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
                    Current
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                {item.description}
              </p>
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{formatTimestamp(item.timestamp)}</span>
                {item.updatedBy && item.userType && (
                  <span>Updated by {item.userType}</span>
                )}
              </div>

              {/* Show details if available */}
              {showDetails && item.additionalData && Object.keys(item.additionalData).length > 0 && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                  <details>
                    <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                      View Details
                    </summary>
                    <pre className="mt-1 text-gray-600 whitespace-pre-wrap">
                      {JSON.stringify(item.additionalData, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Estimated Delivery */}
      {order.estimatedDelivery && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">📅</span>
            <span className="text-sm font-medium text-blue-900">Estimated Delivery</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            {new Date(order.estimatedDelivery).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Tracking Information - Only show when order is shipped */}
      {order.trackingId && (order.status === 'shipped' || order.status === 'in_transit' || order.status === 'out_for_delivery' || order.status === 'delivered') && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-900">Tracking Number</span>
              <p className="text-sm text-gray-600 font-mono">{order.trackingId}</p>
            </div>
            <button 
              onClick={() => window.location.href = `/tracking/${order.trackingId}`}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Track Package
            </button>
          </div>
        </div>
      )}

      {/* Tracking ID exists but not shipped yet */}
      {order.trackingId && !(order.status === 'shipped' || order.status === 'in_transit' || order.status === 'out_for_delivery' || order.status === 'delivered') && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600">📦</span>
            <div>
              <span className="text-sm font-medium text-yellow-900">Tracking Number Ready</span>
              <p className="text-sm text-yellow-700">
                Your tracking number is {order.trackingId}, but the package hasn't been shipped yet. 
                You'll be able to track it once the vendor ships your order.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderTimeline

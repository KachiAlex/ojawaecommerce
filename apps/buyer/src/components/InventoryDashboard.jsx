import { useState, useEffect } from 'react'
import { useInventoryManagement } from '../hooks/useInventoryManagement'
import { LoadingSpinner } from './LoadingStates'
import ComponentErrorBoundary from './ComponentErrorBoundary'
import { 
  INVENTORY_STATUS, 
  INVENTORY_TRANSACTION_TYPES, 
  INVENTORY_ALERT_TYPES 
} from '../services/inventoryService'
import { errorLogger } from '../utils/errorLogger'
import firebaseService from '../services/firebaseService'

const InventoryDashboard = ({ vendorId }) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedInventory, setSelectedInventory] = useState(null)
  const [showStockModal, setShowStockModal] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState([])

  const {
    inventories,
    loading,
    error,
    analytics,
    recommendations,
    updating,
    fetchInventories,
    updateStock,
    getInventorySummary,
    getStatusColor,
    getStatusDisplayName,
    getAlertDisplayName,
    getAlertColor,
    getLowStockInventories,
    getOutOfStockInventories,
    getInventoriesWithAlerts,
    hasLowStock,
    hasOutOfStock,
    hasAlerts,
    refresh
  } = useInventoryManagement(vendorId)

  // Fetch products for inventory management
  useEffect(() => {
    const fetchProducts = async () => {
      if (!vendorId) return
      
      try {
        const productsData = await firebaseService.products.getByVendor(vendorId)
        setProducts(productsData)
      } catch (error) {
        errorLogger.error('Failed to fetch products for inventory', error)
      }
    }

    fetchProducts()
  }, [vendorId])

  // Filter inventories
  const filteredInventories = inventories.filter(inventory => {
    const product = products.find(p => p.id === inventory.productId)
    const matchesStatus = !filterStatus || inventory.status === filterStatus
    const matchesSearch = !searchTerm || 
      (product && product.name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesStatus && matchesSearch
  })

  // Handle stock update
  const handleStockUpdate = async (inventoryId, quantity, type, reason = '') => {
    try {
      await updateStock(inventoryId, quantity, type, { reason })
      setShowStockModal(false)
      setSelectedInventory(null)
      
      // Show success message
      errorLogger.info('Stock updated successfully', { inventoryId, quantity, type })
    } catch (error) {
      errorLogger.error('Failed to update stock', error)
      alert('Failed to update stock. Please try again.')
    }
  }

  // Get product name by ID
  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId)
    return product ? product.name : 'Unknown Product'
  }

  // Get product image by ID
  const getProductImage = (productId) => {
    const product = products.find(p => p.id === productId)
    return product ? (product.images?.[0] || '/placeholder.png') : '/placeholder.png'
  }

  const summary = getInventorySummary()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Inventory</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <ComponentErrorBoundary componentName="InventoryDashboard">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-600 mt-1">Track and manage your product inventory</p>
          </div>

          {/* Alerts */}
          {hasAlerts && (
            <div className="mb-6 space-y-4">
              {hasLowStock && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="text-yellow-600 text-2xl">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Low Stock Alert
                      </h3>
                      <p className="text-yellow-700 mt-1">
                        {getLowStockInventories().length} products are running low on stock.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {hasOutOfStock && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="text-red-600 text-2xl">🚨</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Out of Stock Alert
                      </h3>
                      <p className="text-red-700 mt-1">
                        {getOutOfStockInventories().length} products are out of stock.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">📦</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Products</p>
                  <p className="text-2xl font-semibold text-gray-900">{summary.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">✅</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">In Stock</p>
                  <p className="text-2xl font-semibold text-gray-900">{summary.inStock}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">⚠️</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Low Stock</p>
                  <p className="text-2xl font-semibold text-gray-900">{summary.lowStock}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">❌</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Out of Stock</p>
                  <p className="text-2xl font-semibold text-gray-900">{summary.outOfStock}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Summary */}
          {analytics && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Inventory Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Total Inventory Value</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${analytics.totalValue.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Stock Units</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {analytics.totalStock.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Alerts</p>
                  <p className="text-2xl font-bold text-red-600">
                    {analytics.alerts.lowStock + analytics.alerts.outOfStock + analytics.alerts.overstock}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: '📊' },
                { id: 'inventory', name: 'Inventory', icon: '📦' },
                { id: 'alerts', name: 'Alerts', icon: '⚠️' },
                { id: 'recommendations', name: 'Recommendations', icon: '💡' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setShowRecommendations(true)}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">💡</span>
                      <div>
                        <h4 className="font-medium text-gray-900">View Recommendations</h4>
                        <p className="text-sm text-gray-500">Get AI-powered inventory suggestions</p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('alerts')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">⚠️</span>
                      <div>
                        <h4 className="font-medium text-gray-900">Check Alerts</h4>
                        <p className="text-sm text-gray-500">Review inventory alerts and issues</p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('inventory')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">📦</span>
                      <div>
                        <h4 className="font-medium text-gray-900">Manage Inventory</h4>
                        <p className="text-sm text-gray-500">Update stock levels and settings</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {inventories.slice(0, 5).map((inventory) => {
                    const product = products.find(p => p.id === inventory.productId)
                    return (
                      <div key={inventory.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <img
                            src={getProductImage(inventory.productId)}
                            alt={getProductName(inventory.productId)}
                            className="w-10 h-10 rounded-lg object-cover mr-3"
                          />
                          <div>
                            <p className="font-medium text-gray-900">
                              {getProductName(inventory.productId)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Stock: {inventory.currentStock} units
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(inventory.status)}`}>
                          {getStatusDisplayName(inventory.status)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {/* Filters and Search */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">All Status</option>
                      <option value={INVENTORY_STATUS.IN_STOCK}>In Stock</option>
                      <option value={INVENTORY_STATUS.LOW_STOCK}>Low Stock</option>
                      <option value={INVENTORY_STATUS.OUT_OF_STOCK}>Out of Stock</option>
                      <option value={INVENTORY_STATUS.DISCONTINUED}>Discontinued</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Inventory List */}
              <div className="bg-white shadow rounded-lg">
                {filteredInventories.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {filteredInventories.map((inventory) => {
                      const product = products.find(p => p.id === inventory.productId)
                      return (
                        <div key={inventory.id} className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <img
                                src={getProductImage(inventory.productId)}
                                alt={getProductName(inventory.productId)}
                                className="w-16 h-16 rounded-lg object-cover mr-4"
                              />
                              <div>
                                <h3 className="text-lg font-medium text-gray-900">
                                  {getProductName(inventory.productId)}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  Product ID: {inventory.productId}
                                </p>
                                <div className="flex items-center gap-4 mt-2">
                                  <span className="text-sm text-gray-600">
                                    Current Stock: <strong>{inventory.currentStock}</strong>
                                  </span>
                                  <span className="text-sm text-gray-600">
                                    Reserved: <strong>{inventory.reservedStock}</strong>
                                  </span>
                                  <span className="text-sm text-gray-600">
                                    Available: <strong>{inventory.availableStock}</strong>
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(inventory.status)}`}>
                                {getStatusDisplayName(inventory.status)}
                              </span>
                              
                              {inventory.alerts && inventory.alerts.length > 0 && (
                                <div className="flex gap-1">
                                  {inventory.alerts.map((alert, index) => (
                                    <span
                                      key={index}
                                      className={`px-2 py-1 text-xs font-medium rounded-full ${getAlertColor(alert)}`}
                                    >
                                      {getAlertDisplayName(alert)}
                                    </span>
                                  ))}
                                </div>
                              )}
                              
                              <button
                                onClick={() => {
                                  setSelectedInventory(inventory)
                                  setShowStockModal(true)
                                }}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 text-sm font-medium"
                              >
                                Update Stock
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-4xl mb-4">📦</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No inventory found</h3>
                    <p className="text-gray-500">
                      {searchTerm || filterStatus ? 'Try adjusting your filters' : 'No products have inventory records yet.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Inventory Alerts</h3>
                
                {getInventoriesWithAlerts().length > 0 ? (
                  <div className="space-y-4">
                    {getInventoriesWithAlerts().map((inventory) => {
                      const product = products.find(p => p.id === inventory.productId)
                      return (
                        <div key={inventory.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <img
                                src={getProductImage(inventory.productId)}
                                alt={getProductName(inventory.productId)}
                                className="w-12 h-12 rounded-lg object-cover mr-3"
                              />
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {getProductName(inventory.productId)}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  Stock: {inventory.currentStock} | Available: {inventory.availableStock}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {inventory.alerts.map((alert, index) => (
                                <span
                                  key={index}
                                  className={`px-3 py-1 text-sm font-medium rounded-full ${getAlertColor(alert)}`}
                                >
                                  {getAlertDisplayName(alert)}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-green-500 text-4xl mb-4">✅</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Alerts</h3>
                    <p className="text-gray-500">All your inventory levels are healthy!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && recommendations && (
            <div className="space-y-6">
              {/* Restock Recommendations */}
              {recommendations.restock.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Restock Recommendations</h3>
                  <div className="space-y-4">
                    {recommendations.restock.map((rec) => {
                      const product = products.find(p => p.id === rec.productId)
                      return (
                        <div key={rec.inventoryId} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <img
                                src={getProductImage(rec.productId)}
                                alt={getProductName(rec.productId)}
                                className="w-12 h-12 rounded-lg object-cover mr-3"
                              />
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {getProductName(rec.productId)}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  Current: {rec.currentStock} | Recommended: {rec.recommendedQuantity}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                rec.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {rec.priority} priority
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedInventory({ id: rec.inventoryId, productId: rec.productId })
                                  setShowStockModal(true)
                                }}
                                className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                              >
                                Restock
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Reduce Stock Recommendations */}
              {recommendations.reduce.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Reduce Stock Recommendations</h3>
                  <div className="space-y-4">
                    {recommendations.reduce.map((rec) => {
                      const product = products.find(p => p.id === rec.productId)
                      return (
                        <div key={rec.inventoryId} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <img
                                src={getProductImage(rec.productId)}
                                alt={getProductName(rec.productId)}
                                className="w-12 h-12 rounded-lg object-cover mr-3"
                              />
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {getProductName(rec.productId)}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  Current: {rec.currentStock} | Reduce by: {rec.recommendedReduction}
                                </p>
                              </div>
                            </div>
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                              Overstock
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stock Update Modal */}
        {showStockModal && selectedInventory && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Update Stock - {getProductName(selectedInventory.productId)}
                  </h3>
                  <button
                    onClick={() => {
                      setShowStockModal(false)
                      setSelectedInventory(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <StockUpdateForm
                  inventory={selectedInventory}
                  onUpdate={handleStockUpdate}
                  onCancel={() => {
                    setShowStockModal(false)
                    setSelectedInventory(null)
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ComponentErrorBoundary>
  )
}

// Stock Update Form Component
const StockUpdateForm = ({ inventory, onUpdate, onCancel }) => {
  const [quantity, setQuantity] = useState('')
  const [type, setType] = useState(INVENTORY_TRANSACTION_TYPES.RESTOCK)
  const [reason, setReason] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (quantity && parseFloat(quantity) > 0) {
      onUpdate(inventory.id, parseFloat(quantity), type, reason)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Transaction Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value={INVENTORY_TRANSACTION_TYPES.RESTOCK}>Restock</option>
          <option value={INVENTORY_TRANSACTION_TYPES.ADJUSTMENT}>Adjustment</option>
          <option value={INVENTORY_TRANSACTION_TYPES.RETURN}>Return</option>
          <option value={INVENTORY_TRANSACTION_TYPES.DAMAGE}>Damage</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quantity
        </label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Enter quantity"
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reason (Optional)
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason for this update"
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
        >
          Update Stock
        </button>
      </div>
    </form>
  )
}

export default InventoryDashboard

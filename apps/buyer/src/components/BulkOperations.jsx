import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';

const BulkOperations = ({ products, onProductsUpdate }) => {
  const { userProfile } = useAuth();
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [actionData, setActionData] = useState({});

  // Check if user has bulk operations access
  const hasBulkAccess = userProfile?.subscriptionPlan === 'pro' || userProfile?.subscriptionPlan === 'premium';

  useEffect(() => {
    if (!hasBulkAccess) {
      setSelectedProducts([]);
      setBulkAction('');
    }
  }, [hasBulkAccess]);

  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  };

  const handleBulkAction = (action) => {
    if (selectedProducts.length === 0) {
      alert('Please select products to perform bulk action');
      return;
    }

    setBulkAction(action);
    setActionData({});
    setShowModal(true);
  };

  const executeBulkAction = async () => {
    if (selectedProducts.length === 0) return;

    setLoading(true);
    try {
      switch (bulkAction) {
        case 'update_status':
          await bulkUpdateStatus(actionData.status);
          break;
        case 'update_price':
          await bulkUpdatePrice(actionData.priceChange, actionData.priceType);
          break;
        case 'update_category':
          await bulkUpdateCategory(actionData.category);
          break;
        case 'update_inventory':
          await bulkUpdateInventory(actionData.inventoryChange, actionData.inventoryType);
          break;
        case 'delete':
          await bulkDelete();
          break;
        case 'export':
          await bulkExport();
          break;
        case 'duplicate':
          await bulkDuplicate();
          break;
        default:
          throw new Error('Unknown bulk action');
      }

      setShowModal(false);
      setSelectedProducts([]);
      setBulkAction('');
      setActionData({});
      onProductsUpdate();
    } catch (error) {
      console.error('Error executing bulk action:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const bulkUpdateStatus = async (status) => {
    const batch = await firebaseService.products.batchUpdate(selectedProducts, { status });
    return batch;
  };

  const bulkUpdatePrice = async (priceChange, priceType) => {
    const updates = selectedProducts.map(productId => {
      const product = products.find(p => p.id === productId);
      const currentPrice = product.price || 0;
      let newPrice;

      if (priceType === 'percentage') {
        newPrice = currentPrice * (1 + priceChange / 100);
      } else {
        newPrice = currentPrice + priceChange;
      }

      return {
        id: productId,
        data: { price: Math.max(0, newPrice) }
      };
    });

    return await firebaseService.products.batchUpdate(selectedProducts, updates);
  };

  const bulkUpdateCategory = async (category) => {
    return await firebaseService.products.batchUpdate(selectedProducts, { category });
  };

  const bulkUpdateInventory = async (inventoryChange, inventoryType) => {
    const updates = selectedProducts.map(productId => {
      const product = products.find(p => p.id === productId);
      const currentStock = product.stock || 0;
      let newStock;

      if (inventoryType === 'percentage') {
        newStock = currentStock * (1 + inventoryChange / 100);
      } else {
        newStock = currentStock + inventoryChange;
      }

      return {
        id: productId,
        data: { stock: Math.max(0, Math.round(newStock)) }
      };
    });

    return await firebaseService.products.batchUpdate(selectedProducts, updates);
  };

  const bulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedProducts.length} products? This action cannot be undone.`)) {
      return;
    }

    return await firebaseService.products.batchDelete(selectedProducts);
  };

  const bulkExport = async () => {
    const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));
    const csvContent = generateCSV(selectedProductsData);
    downloadCSV(csvContent, 'products-export.csv');
  };

  const bulkDuplicate = async () => {
    const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));
    
    for (const product of selectedProductsData) {
      const duplicateData = {
        ...product,
        name: `${product.name} (Copy)`,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      delete duplicateData.id;
      
      await firebaseService.products.create(duplicateData);
    }
  };

  const generateCSV = (products) => {
    const headers = ['Name', 'Price', 'Category', 'Stock', 'Status', 'Description'];
    const rows = products.map(product => [
      product.name || '',
      product.price || 0,
      product.category || '',
      product.stock || 0,
      product.status || '',
      product.description || ''
    ]);

    return [headers, ...rows].map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!hasBulkAccess) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Bulk Operations Available</h3>
            <p className="text-sm text-yellow-700">
              Upgrade to Pro or Premium plan to access bulk operations for managing multiple products at once.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Bulk Operations</h3>
        <div className="text-sm text-gray-500">
          {selectedProducts.length} of {products.length} products selected
        </div>
      </div>

      {/* Selection Controls */}
      <div className="flex items-center space-x-4 mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={selectedProducts.length === products.length && products.length > 0}
            onChange={handleSelectAll}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Select All</span>
        </label>
      </div>

      {/* Bulk Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          onClick={() => handleBulkAction('update_status')}
          disabled={selectedProducts.length === 0}
          className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Update Status
        </button>
        <button
          onClick={() => handleBulkAction('update_price')}
          disabled={selectedProducts.length === 0}
          className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Update Price
        </button>
        <button
          onClick={() => handleBulkAction('update_category')}
          disabled={selectedProducts.length === 0}
          className="px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Update Category
        </button>
        <button
          onClick={() => handleBulkAction('update_inventory')}
          disabled={selectedProducts.length === 0}
          className="px-3 py-2 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Update Stock
        </button>
        <button
          onClick={() => handleBulkAction('export')}
          disabled={selectedProducts.length === 0}
          className="px-3 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Export CSV
        </button>
        <button
          onClick={() => handleBulkAction('duplicate')}
          disabled={selectedProducts.length === 0}
          className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Duplicate
        </button>
        <button
          onClick={() => handleBulkAction('delete')}
          disabled={selectedProducts.length === 0}
          className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete
        </button>
      </div>

      {/* Bulk Action Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {getActionTitle(bulkAction)}
            </h3>
            
            {renderActionForm()}
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={executeBulkAction}
                disabled={loading}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Execute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function getActionTitle(action) {
    const titles = {
      update_status: 'Update Product Status',
      update_price: 'Update Product Prices',
      update_category: 'Update Product Category',
      update_inventory: 'Update Product Stock',
      delete: 'Delete Products',
      export: 'Export Products',
      duplicate: 'Duplicate Products'
    };
    return titles[action] || 'Bulk Action';
  }

  function renderActionForm() {
    switch (bulkAction) {
      case 'update_status':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={actionData.status || ''}
              onChange={(e) => setActionData({ ...actionData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
              <option value="outofstock">Out of Stock</option>
            </select>
          </div>
        );

      case 'update_price':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price Change Type</label>
              <select
                value={actionData.priceType || ''}
                onChange={(e) => setActionData({ ...actionData, priceType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Type</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {actionData.priceType === 'percentage' ? 'Percentage Change' : 'Amount Change'}
              </label>
              <input
                type="number"
                value={actionData.priceChange || ''}
                onChange={(e) => setActionData({ ...actionData, priceChange: parseFloat(e.target.value) || 0 })}
                placeholder={actionData.priceType === 'percentage' ? '10 (for 10%)' : '1000 (for ₦1000)'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      case 'update_category':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <input
              type="text"
              value={actionData.category || ''}
              onChange={(e) => setActionData({ ...actionData, category: e.target.value })}
              placeholder="Enter new category"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        );

      case 'update_inventory':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stock Change Type</label>
              <select
                value={actionData.inventoryType || ''}
                onChange={(e) => setActionData({ ...actionData, inventoryType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Type</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {actionData.inventoryType === 'percentage' ? 'Percentage Change' : 'Amount Change'}
              </label>
              <input
                type="number"
                value={actionData.inventoryChange || ''}
                onChange={(e) => setActionData({ ...actionData, inventoryChange: parseInt(e.target.value) || 0 })}
                placeholder={actionData.inventoryType === 'percentage' ? '10 (for 10%)' : '50 (for 50 units)'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      case 'delete':
        return (
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <p className="text-gray-600">
              Are you sure you want to delete <strong>{selectedProducts.length}</strong> products? 
              This action cannot be undone.
            </p>
          </div>
        );

      case 'export':
        return (
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-gray-600">
              Export <strong>{selectedProducts.length}</strong> products to CSV file?
            </p>
          </div>
        );

      case 'duplicate':
        return (
          <div className="text-center">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-gray-600">
              Duplicate <strong>{selectedProducts.length}</strong> products? 
              New products will be created as drafts.
            </p>
          </div>
        );

      default:
        return null;
    }
  }
};

export default BulkOperations;

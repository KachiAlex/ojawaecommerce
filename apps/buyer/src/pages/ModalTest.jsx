import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import OrderTransactionModal from '../components/OrderTransactionModal';
import OrderDetailsModal from '../components/OrderDetailsModal';

const ModalTest = () => {
  const { currentUser } = useAuth();
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);

  // Mock order data for testing
  const mockOrder = {
    id: 'test-order-123',
    vendorName: 'Test Vendor',
    status: 'pending_wallet_funding',
    totalAmount: 5000,
    currency: '₦5000',
    createdAt: { toDate: () => new Date() },
    walletId: 'wallet-123',
    items: [
      { name: 'Test Product 1', quantity: 2 },
      { name: 'Test Product 2', quantity: 1 }
    ],
    deliveryOption: 'home_delivery',
    deliveryAddress: '123 Test Street, Lagos',
    escrowStatus: 'funds_transferred_to_escrow'
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h2 className="text-2xl font-bold mb-6">Modal Test Page</h2>
      <p className="mb-6 text-gray-600">
        Use this page to test the order modals and ensure they're working properly.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Transaction Modal Test */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Order Transaction Modal</h3>
          <p className="text-sm text-gray-600 mb-4">
            Test the transaction details modal that shows order payment history.
          </p>
          <button
            onClick={() => setIsTransactionModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Test Transaction Modal
          </button>
        </div>

        {/* Order Details Modal Test */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Order Details Modal</h3>
          <p className="text-sm text-gray-600 mb-4">
            Test the order details modal that shows basic order information.
          </p>
          <button
            onClick={() => setIsOrderDetailsModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm font-medium"
          >
            Test Order Details Modal
          </button>
        </div>
      </div>

      {/* Mock Order Data Display */}
      <div className="mt-8 border rounded-lg p-4 bg-gray-50">
        <h3 className="text-lg font-semibold mb-3">Mock Order Data</h3>
        <pre className="text-sm text-gray-700 overflow-x-auto">
          {JSON.stringify(mockOrder, null, 2)}
        </pre>
      </div>

      {/* Modals */}
      {isTransactionModalOpen && (
        <OrderTransactionModal
          order={mockOrder}
          isOpen={isTransactionModalOpen}
          onClose={() => setIsTransactionModalOpen(false)}
        />
      )}

      {isOrderDetailsModalOpen && (
        <OrderDetailsModal
          open={isOrderDetailsModalOpen}
          order={mockOrder}
          onClose={() => setIsOrderDetailsModalOpen(false)}
          onFundWallet={(order) => {
            console.log('Fund wallet for order:', order.id);
            alert(`Fund wallet functionality for order ${order.id}`);
          }}
        />
      )}

      {!currentUser && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            ⚠️ You must be logged in to fully test the modals with real data.
          </p>
        </div>
      )}
    </div>
  );
};

export default ModalTest;

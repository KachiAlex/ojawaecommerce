import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logisticsTrackingService, DELIVERY_STAGES, DELIVERY_STAGE_DETAILS } from '../services/logisticsTrackingService';

const LogisticsTrackingManager = () => {
  const { currentUser } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateData, setUpdateData] = useState({
    stage: '',
    location: '',
    description: '',
    additionalInfo: {}
  });

  useEffect(() => {
    if (currentUser) {
      fetchDeliveries();
    }
  }, [currentUser]);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const userDeliveries = await logisticsTrackingService.getDeliveriesByLogisticsPartner(currentUser.uid);
      setDeliveries(userDeliveries);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStageUpdate = async () => {
    if (!selectedDelivery || !updateData.stage) return;

    try {
      setLoading(true);
      
      await logisticsTrackingService.updateDeliveryStage(
        selectedDelivery.id,
        updateData.stage,
        {
          location: updateData.location,
          description: updateData.description,
          additionalInfo: updateData.additionalInfo,
          updatedBy: currentUser.email
        }
      );

      // Refresh deliveries
      await fetchDeliveries();
      setShowUpdateModal(false);
      setSelectedDelivery(null);
      setUpdateData({ stage: '', location: '', description: '', additionalInfo: {} });
      
      alert('Delivery status updated successfully!');
    } catch (error) {
      console.error('Error updating delivery stage:', error);
      alert('Error updating delivery status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationUpdate = async (deliveryId, locationData) => {
    try {
      await logisticsTrackingService.addLocationUpdate(deliveryId, {
        ...locationData,
        updatedBy: currentUser.email
      });
      
      await fetchDeliveries();
      alert('Location updated successfully!');
    } catch (error) {
      console.error('Error updating location:', error);
      alert('Error updating location. Please try again.');
    }
  };

  const handleDeliveryAttempt = async (deliveryId, attemptData) => {
    try {
      await logisticsTrackingService.addDeliveryAttempt(deliveryId, {
        ...attemptData,
        updatedBy: currentUser.email
      });
      
      await fetchDeliveries();
      alert('Delivery attempt recorded successfully!');
    } catch (error) {
      console.error('Error recording delivery attempt:', error);
      alert('Error recording delivery attempt. Please try again.');
    }
  };

  const handleCompleteDelivery = async (deliveryId, deliveryData) => {
    try {
      await logisticsTrackingService.completeDelivery(deliveryId, {
        ...deliveryData,
        updatedBy: currentUser.email
      });
      
      await fetchDeliveries();
      alert('Delivery completed successfully!');
    } catch (error) {
      console.error('Error completing delivery:', error);
      alert('Error completing delivery. Please try again.');
    }
  };

  const getStageColor = (stage) => {
    const stageDetails = DELIVERY_STAGE_DETAILS[stage];
    return stageDetails ? stageDetails.color : 'gray';
  };

  const getNextAvailableStages = (currentStage) => {
    const stageOrder = Object.values(DELIVERY_STAGES);
    const currentIndex = stageOrder.indexOf(currentStage);
    
    return stageOrder.slice(currentIndex).map(stage => ({
      value: stage,
      label: DELIVERY_STAGE_DETAILS[stage]?.name || stage,
      description: DELIVERY_STAGE_DETAILS[stage]?.description || ''
    }));
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString();
      }
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading deliveries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Logistics Tracking Manager</h1>
        <p className="text-gray-600">
          Manage delivery tracking and provide real-time updates to customers
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">Total Deliveries</p>
              <p className="text-2xl font-bold text-blue-900">{deliveries.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-lg">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">Completed</p>
              <p className="text-2xl font-bold text-green-900">
                {deliveries.filter(d => d.currentStage === DELIVERY_STAGES.DELIVERED).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 p-6 rounded-lg">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-orange-600">In Transit</p>
              <p className="text-2xl font-bold text-orange-900">
                {deliveries.filter(d => [
                  DELIVERY_STAGES.IN_TRANSIT,
                  DELIVERY_STAGES.AT_DISTRIBUTION_CENTER,
                  DELIVERY_STAGES.OUT_FOR_DELIVERY
                ].includes(d.currentStage)).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-6 rounded-lg">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-yellow-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">
                {deliveries.filter(d => [
                  DELIVERY_STAGES.ORDER_CONFIRMED,
                  DELIVERY_STAGES.VENDOR_NOTIFIED,
                  DELIVERY_STAGES.PACKAGE_PREPARED,
                  DELIVERY_STAGES.PICKUP_SCHEDULED
                ].includes(d.currentStage)).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Deliveries List */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Active Deliveries</h2>
        </div>

        {deliveries.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Deliveries</h3>
            <p className="text-gray-600">No deliveries assigned to you yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {deliveries.map((delivery) => {
              const currentStageDetails = DELIVERY_STAGE_DETAILS[delivery.currentStage];
              
              return (
                <div key={delivery.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {delivery.trackingNumber}
                        </h3>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium bg-${getStageColor(delivery.currentStage)}-100 text-${getStageColor(delivery.currentStage)}-800`}>
                          {currentStageDetails?.name || delivery.currentStage}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <p className="font-medium">Order ID:</p>
                          <p>{delivery.orderId}</p>
                        </div>
                        <div>
                          <p className="font-medium">Route:</p>
                          <p>{delivery.pickupLocation} → {delivery.deliveryLocation}</p>
                        </div>
                        <div>
                          <p className="font-medium">Estimated Delivery:</p>
                          <p>{formatDate(delivery.estimatedDeliveryDate)}</p>
                        </div>
                      </div>

                      <div className="mt-2 text-sm text-gray-500">
                        <p>Customer: {delivery.customerInfo?.name || 'N/A'}</p>
                        <p>Package: {delivery.packageDetails?.description || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedDelivery(delivery);
                          setShowUpdateModal(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Update Status
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>Progress</span>
                      <span>{Math.round(((Object.values(DELIVERY_STAGES).indexOf(delivery.currentStage) + 1) / Object.values(DELIVERY_STAGES).length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${((Object.values(DELIVERY_STAGES).indexOf(delivery.currentStage) + 1) / Object.values(DELIVERY_STAGES).length) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Update Status Modal */}
      {showUpdateModal && selectedDelivery && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Update Delivery Status
              </h3>
              
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-700 mb-2">Delivery Details:</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium">Tracking: {selectedDelivery.trackingNumber}</p>
                  <p className="text-sm text-gray-600">Current Status: {DELIVERY_STAGE_DETAILS[selectedDelivery.currentStage]?.name}</p>
                  <p className="text-sm text-gray-600">Route: {selectedDelivery.pickupLocation} → {selectedDelivery.deliveryLocation}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Status:
                  </label>
                  <select
                    value={updateData.stage}
                    onChange={(e) => setUpdateData({ ...updateData, stage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select new status...</option>
                    {getNextAvailableStages(selectedDelivery.currentStage).map((stage) => (
                      <option key={stage.value} value={stage.value}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Location:
                  </label>
                  <input
                    type="text"
                    value={updateData.location}
                    onChange={(e) => setUpdateData({ ...updateData, location: e.target.value })}
                    placeholder="Enter current location..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes:
                  </label>
                  <textarea
                    value={updateData.description}
                    onChange={(e) => setUpdateData({ ...updateData, description: e.target.value })}
                    rows={3}
                    placeholder="Add any additional notes or details..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => {
                    setShowUpdateModal(false);
                    setSelectedDelivery(null);
                    setUpdateData({ stage: '', location: '', description: '', additionalInfo: {} });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStageUpdate}
                  disabled={loading || !updateData.stage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogisticsTrackingManager;

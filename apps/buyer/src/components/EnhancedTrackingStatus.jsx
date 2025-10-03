import React, { useState, useEffect } from 'react';
import { logisticsTrackingService, DELIVERY_STAGES, DELIVERY_STAGE_DETAILS } from '../services/logisticsTrackingService';

const EnhancedTrackingStatus = ({ orderId, trackingNumber }) => {
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationUpdates, setLocationUpdates] = useState([]);

  useEffect(() => {
    if (orderId || trackingNumber) {
      fetchTrackingData();
    }
  }, [orderId, trackingNumber]);

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      setError('');
      
      let data = null;
      if (trackingNumber) {
        data = await logisticsTrackingService.getTrackingByNumber(trackingNumber);
      } else if (orderId) {
        data = await logisticsTrackingService.getTrackingByOrderId(orderId);
      }

      if (data) {
        setTrackingData(data);
        setLocationUpdates(data.locationHistory || []);
      } else {
        setError('Tracking information not found');
      }
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      setError('Error loading tracking information');
    } finally {
      setLoading(false);
    }
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

  const getStageProgress = (currentStage) => {
    const allStages = Object.values(DELIVERY_STAGES);
    const currentIndex = allStages.indexOf(currentStage);
    return ((currentIndex + 1) / allStages.length) * 100;
  };

  const getStageIcon = (stage) => {
    return DELIVERY_STAGE_DETAILS[stage]?.icon || '📦';
  };

  const getStageColor = (stage, isCompleted = false, isCurrent = false) => {
    const stageDetails = DELIVERY_STAGE_DETAILS[stage];
    if (!stageDetails) return 'gray';
    
    if (isCompleted) return 'green';
    if (isCurrent) return stageDetails.color;
    return 'gray';
  };

  const getEstimatedDeliveryStatus = () => {
    if (!trackingData) return null;
    
    const estimatedDate = trackingData.estimatedDeliveryDate;
    const actualDate = trackingData.actualDeliveryDate;
    
    if (actualDate) {
      return { status: 'delivered', message: 'Delivered successfully!' };
    }
    
    if (estimatedDate) {
      const estimated = estimatedDate.toDate ? estimatedDate.toDate() : new Date(estimatedDate);
      const now = new Date();
      const diffHours = (estimated - now) / (1000 * 60 * 60);
      
      if (diffHours < 0) {
        return { status: 'delayed', message: 'Delivery is delayed' };
      } else if (diffHours < 24) {
        return { status: 'soon', message: 'Delivery expected soon' };
      } else {
        return { status: 'on-time', message: 'On track for delivery' };
      }
    }
    
    return { status: 'unknown', message: 'Delivery time TBD' };
  };

  const isStageCompleted = (stage, currentStage) => {
    const stageOrder = Object.values(DELIVERY_STAGES);
    const stageIndex = stageOrder.indexOf(stage);
    const currentIndex = stageOrder.indexOf(currentStage);
    return stageIndex < currentIndex;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading tracking information...</p>
        </div>
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-8">
          <div className="text-red-400 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tracking Not Found</h2>
          <p className="text-gray-600">{error || 'No tracking information available for this order'}</p>
        </div>
      </div>
    );
  }

  const deliveryStatus = getEstimatedDeliveryStatus();

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Track Your Package</h1>
            <p className="text-gray-600">Tracking Number: <span className="font-mono text-blue-600">{trackingData.trackingNumber}</span></p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Order ID</p>
            <p className="font-mono text-gray-900">{trackingData.orderId}</p>
          </div>
        </div>

        {/* Delivery Status */}
        <div className={`p-4 rounded-lg ${
          deliveryStatus.status === 'delivered' ? 'bg-green-50 border border-green-200' :
          deliveryStatus.status === 'delayed' ? 'bg-red-50 border border-red-200' :
          deliveryStatus.status === 'soon' ? 'bg-yellow-50 border border-yellow-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${
              deliveryStatus.status === 'delivered' ? 'bg-green-100' :
              deliveryStatus.status === 'delayed' ? 'bg-red-100' :
              deliveryStatus.status === 'soon' ? 'bg-yellow-100' :
              'bg-blue-100'
            }`}>
              <span className="text-2xl">
                {deliveryStatus.status === 'delivered' ? '🎉' :
                 deliveryStatus.status === 'delayed' ? '⏰' :
                 deliveryStatus.status === 'soon' ? '🚚' :
                 '📦'}
              </span>
            </div>
            <div className="ml-4">
              <p className={`font-medium ${
                deliveryStatus.status === 'delivered' ? 'text-green-800' :
                deliveryStatus.status === 'delayed' ? 'text-red-800' :
                deliveryStatus.status === 'soon' ? 'text-yellow-800' :
                'text-blue-800'
              }`}>
                {deliveryStatus.message}
              </p>
              <p className="text-sm text-gray-600">
                Current Status: {DELIVERY_STAGE_DETAILS[trackingData.currentStage]?.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Delivery Progress</h2>
        
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{Math.round(getStageProgress(trackingData.currentStage))}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${getStageProgress(trackingData.currentStage)}%` }}
            ></div>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-6">
          {Object.values(DELIVERY_STAGES).map((stage, index) => {
            const stageDetails = DELIVERY_STAGE_DETAILS[stage];
            const isCompleted = isStageCompleted(stage, trackingData.currentStage);
            const isCurrent = stage === trackingData.currentStage;
            const stageHistory = trackingData.trackingHistory?.find(h => h.stage === stage);
            
            return (
              <div key={stage} className="flex items-start space-x-4">
                {/* Stage Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  isCompleted ? 'bg-green-100 text-green-600' :
                  isCurrent ? 'bg-blue-100 text-blue-600' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  <span className="text-lg">
                    {isCompleted ? '✅' : isCurrent ? stageDetails?.icon || '📦' : '⏳'}
                  </span>
                </div>

                {/* Stage Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-medium ${
                      isCompleted ? 'text-green-900' :
                      isCurrent ? 'text-blue-900' :
                      'text-gray-500'
                    }`}>
                      {stageDetails?.name || stage}
                    </h3>
                    {stageHistory && (
                      <span className="text-sm text-gray-500">
                        {formatDate(stageHistory.timestamp)}
                      </span>
                    )}
                  </div>
                  
                  <p className={`text-sm ${
                    isCompleted ? 'text-green-700' :
                    isCurrent ? 'text-blue-700' :
                    'text-gray-500'
                  }`}>
                    {stageHistory?.description || stageDetails?.description || ''}
                  </p>
                  
                  {stageHistory?.location && (
                    <p className="text-xs text-gray-500 mt-1">
                      📍 {stageHistory.location}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Package Details */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Package Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Route Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">From:</span>
                <span className="font-medium">{trackingData.pickupLocation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">To:</span>
                <span className="font-medium">{trackingData.deliveryLocation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Logistics Partner:</span>
                <span className="font-medium">{trackingData.logisticsPartnerName}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Delivery Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated Delivery:</span>
                <span className="font-medium">{formatDate(trackingData.estimatedDeliveryDate)}</span>
              </div>
              {trackingData.actualDeliveryDate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Actual Delivery:</span>
                  <span className="font-medium text-green-600">{formatDate(trackingData.actualDeliveryDate)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Package Type:</span>
                <span className="font-medium">{trackingData.packageDetails?.type || 'Standard'}</span>
              </div>
            </div>
          </div>
        </div>

        {trackingData.specialInstructions && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-800 mb-1">Special Instructions</h4>
            <p className="text-sm text-yellow-700">{trackingData.specialInstructions}</p>
          </div>
        )}
      </div>

      {/* Location Updates */}
      {locationUpdates.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Location Updates</h2>
          
          <div className="space-y-4">
            {locationUpdates.slice(-5).reverse().map((update, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm">📍</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{update.address}</p>
                  <p className="text-sm text-gray-600">{formatDate(update.timestamp)}</p>
                  {update.accuracy && (
                    <p className="text-xs text-gray-500">Accuracy: {update.accuracy}m</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery Attempts */}
      {trackingData.deliveryAttempts && trackingData.deliveryAttempts.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Delivery Attempts</h2>
          
          <div className="space-y-4">
            {trackingData.deliveryAttempts.map((attempt, index) => (
              <div key={index} className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-yellow-800">Attempt #{attempt.attemptNumber}</h3>
                    <p className="text-sm text-yellow-700">{attempt.reason}</p>
                    {attempt.notes && (
                      <p className="text-sm text-yellow-600 mt-1">{attempt.notes}</p>
                    )}
                  </div>
                  <span className="text-sm text-yellow-600">{formatDate(attempt.timestamp)}</span>
                </div>
                {attempt.nextAttemptDate && (
                  <p className="text-xs text-yellow-600 mt-2">
                    Next attempt: {formatDate(attempt.nextAttemptDate)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTrackingStatus;

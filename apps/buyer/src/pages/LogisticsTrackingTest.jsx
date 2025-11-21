import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  logisticsTrackingService, 
  DELIVERY_STAGES, 
  DELIVERY_STAGE_DETAILS 
} from '../services/logisticsTrackingService';

const LogisticsTrackingTest = () => {
  const { currentUser } = useAuth();
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [currentStage, setCurrentStage] = useState(DELIVERY_STAGES.ORDER_CONFIRMED);

  const addTestResult = (test, status, details, data = null) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test,
      status,
      details,
      data,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const testCreateDeliveryTracking = async () => {
    try {
      setLoading(true);
      addTestResult('Create Delivery Tracking', 'INFO', 'Creating a new delivery tracking record...');

      if (!currentUser) {
        addTestResult('Create Delivery Tracking', 'SKIP', 'User not authenticated');
        return;
      }

      const sampleLogisticsData = {
        logisticsPartnerId: currentUser.uid,
        logisticsPartnerName: 'Test Logistics Partner',
        estimatedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        pickupLocation: 'Lagos, Nigeria',
        deliveryLocation: 'Abuja, Nigeria',
        packageDetails: {
          description: 'Test Package for Logistics Tracking',
          weight: '2.5kg',
          dimensions: '30x20x15 cm',
          type: 'fragile'
        },
        customerInfo: {
          userId: 'test-customer-id',
          name: 'Test Customer',
          phone: '+234 800 000 0000',
          email: 'customer@test.com'
        },
        vendorInfo: {
          userId: 'test-vendor-id',
          name: 'Test Vendor',
          address: 'Lagos, Nigeria'
        },
        specialInstructions: 'Handle with care - fragile item',
        requiresSignature: true,
        isFragile: true,
        isHighValue: false
      };

      const trackingRecord = await logisticsTrackingService.createDeliveryTracking(
        'TEST-ORDER-001',
        sampleLogisticsData
      );

      setTrackingData(trackingRecord);
      addTestResult(
        'Create Delivery Tracking',
        'PASS',
        `Delivery tracking created with tracking number: ${trackingRecord.trackingNumber}`,
        trackingRecord
      );

    } catch (error) {
      addTestResult('Create Delivery Tracking', 'FAIL', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testStageProgression = async () => {
    if (!trackingData) {
      addTestResult('Stage Progression', 'SKIP', 'No tracking data available');
      return;
    }

    try {
      setLoading(true);
      addTestResult('Stage Progression', 'INFO', 'Testing stage progression...');

      const stages = [
        DELIVERY_STAGES.VENDOR_NOTIFIED,
        DELIVERY_STAGES.PACKAGE_PREPARED,
        DELIVERY_STAGES.PICKUP_SCHEDULED,
        DELIVERY_STAGES.PICKUP_IN_PROGRESS,
        DELIVERY_STAGES.PICKED_UP,
        DELIVERY_STAGES.IN_TRANSIT,
        DELIVERY_STAGES.AT_DISTRIBUTION_CENTER,
        DELIVERY_STAGES.OUT_FOR_DELIVERY,
        DELIVERY_STAGES.DELIVERED
      ];

      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const stageDetails = DELIVERY_STAGE_DETAILS[stage];
        
        await logisticsTrackingService.updateDeliveryStage(trackingData.id, stage, {
          location: stage === DELIVERY_STAGES.PICKED_UP ? 'Lagos, Nigeria' :
                   stage === DELIVERY_STAGES.IN_TRANSIT ? 'En route to Abuja' :
                   stage === DELIVERY_STAGES.AT_DISTRIBUTION_CENTER ? 'Abuja Distribution Center' :
                   stage === DELIVERY_STAGES.OUT_FOR_DELIVERY ? 'Abuja, Nigeria' :
                   stage === DELIVERY_STAGES.DELIVERED ? 'Abuja, Nigeria' : 'Various',
          description: stageDetails?.description || '',
          additionalInfo: {
            estimatedTime: stage === DELIVERY_STAGES.IN_TRANSIT ? '12-24 hours' : null,
            driverName: stage === DELIVERY_STAGES.OUT_FOR_DELIVERY ? 'John Doe' : null,
            vehicleNumber: stage === DELIVERY_STAGES.IN_TRANSIT ? 'LAG-123-ABC' : null
          },
          updatedBy: 'test-logistics-partner'
        });

        addTestResult(
          `Stage Update: ${stageDetails?.name}`,
          'PASS',
          `Successfully updated to ${stageDetails?.name}`
        );

        setCurrentStage(stage);
        
        // Small delay to simulate real-time updates
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      addTestResult('Stage Progression', 'FAIL', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testLocationUpdates = async () => {
    if (!trackingData) {
      addTestResult('Location Updates', 'SKIP', 'No tracking data available');
      return;
    }

    try {
      setLoading(true);
      addTestResult('Location Updates', 'INFO', 'Testing location updates...');

      const locationUpdates = [
        { latitude: 6.5244, longitude: 3.3792, address: 'Lagos Island, Lagos, Nigeria', accuracy: 10 },
        { latitude: 6.4474, longitude: 3.3903, address: 'Lagos Mainland, Lagos, Nigeria', accuracy: 15 },
        { latitude: 6.5244, longitude: 3.3792, address: 'Lagos Port, Lagos, Nigeria', accuracy: 8 },
        { latitude: 9.0765, longitude: 7.3986, address: 'Abuja City Center, Abuja, Nigeria', accuracy: 12 },
        { latitude: 9.0579, longitude: 7.4951, address: 'Abuja Distribution Center, Abuja, Nigeria', accuracy: 5 }
      ];

      for (const location of locationUpdates) {
        await logisticsTrackingService.addLocationUpdate(trackingData.id, {
          ...location,
          updatedBy: 'test-driver'
        });

        addTestResult(
          'Location Update',
          'PASS',
          `Updated location to: ${location.address}`
        );

        // Small delay between updates
        await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (error) {
      addTestResult('Location Updates', 'FAIL', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testDeliveryAttempts = async () => {
    if (!trackingData) {
      addTestResult('Delivery Attempts', 'SKIP', 'No tracking data available');
      return;
    }

    try {
      setLoading(true);
      addTestResult('Delivery Attempts', 'INFO', 'Testing delivery attempts...');

      // Simulate a failed delivery attempt
      await logisticsTrackingService.addDeliveryAttempt(trackingData.id, {
        attemptNumber: 1,
        location: 'Abuja, Nigeria',
        reason: 'Customer not available',
        notes: 'Customer was not at the delivery address. Left notification card.',
        nextAttemptDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next day
        updatedBy: 'test-driver'
      });

      addTestResult(
        'Delivery Attempt',
        'PASS',
        'Recorded failed delivery attempt with next attempt scheduled'
      );

    } catch (error) {
      addTestResult('Delivery Attempts', 'FAIL', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testCompleteDelivery = async () => {
    if (!trackingData) {
      addTestResult('Complete Delivery', 'SKIP', 'No tracking data available');
      return;
    }

    try {
      setLoading(true);
      addTestResult('Complete Delivery', 'INFO', 'Testing delivery completion...');

      await logisticsTrackingService.completeDelivery(trackingData.id, {
        deliveredTo: 'Test Customer',
        signature: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiB2aWV3Qm94PSIwIDAgMTAwIDUwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNTAiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSI1MCIgeT0iMzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2YjczODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiI+U2lnbmF0dXJlPC90ZXh0Pjwvc3ZnPg==',
        photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        notes: 'Package delivered successfully. Customer was available and signed for receipt.',
        updatedBy: 'test-driver'
      });

      addTestResult(
        'Complete Delivery',
        'PASS',
        'Successfully completed delivery with proof'
      );

      setCurrentStage(DELIVERY_STAGES.DELIVERED);

    } catch (error) {
      addTestResult('Complete Delivery', 'FAIL', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testTrackingRetrieval = async () => {
    if (!trackingData) {
      addTestResult('Tracking Retrieval', 'SKIP', 'No tracking data available');
      return;
    }

    try {
      setLoading(true);
      addTestResult('Tracking Retrieval', 'INFO', 'Testing tracking data retrieval...');

      // Test retrieval by tracking number
      const retrievedByNumber = await logisticsTrackingService.getTrackingByNumber(trackingData.trackingNumber);
      if (retrievedByNumber) {
        addTestResult(
          'Retrieve by Tracking Number',
          'PASS',
          `Successfully retrieved tracking data: ${retrievedByNumber.trackingNumber}`
        );
      } else {
        addTestResult('Retrieve by Tracking Number', 'FAIL', 'Could not retrieve tracking data');
      }

      // Test retrieval by order ID
      const retrievedByOrder = await logisticsTrackingService.getTrackingByOrderId('TEST-ORDER-001');
      if (retrievedByOrder) {
        addTestResult(
          'Retrieve by Order ID',
          'PASS',
          `Successfully retrieved tracking data for order: ${retrievedByOrder.orderId}`
        );
      } else {
        addTestResult('Retrieve by Order ID', 'FAIL', 'Could not retrieve tracking data by order ID');
      }

    } catch (error) {
      addTestResult('Tracking Retrieval', 'FAIL', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    clearTestResults();
    addTestResult('Logistics Tracking Test Suite', 'INFO', 'Starting comprehensive logistics tracking tests...');

    await testCreateDeliveryTracking();
    await testStageProgression();
    await testLocationUpdates();
    await testDeliveryAttempts();
    await testCompleteDelivery();
    await testTrackingRetrieval();

    addTestResult('Logistics Tracking Test Suite', 'INFO', 'All tests completed!');
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Logistics Tracking System Test</h1>
        <p className="text-gray-600 mb-6">
          Comprehensive testing for the logistics delivery tracking system with stage-by-stage updates
        </p>

        {/* Current Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Current Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-blue-700">
                <span className="font-medium">User:</span> {currentUser ? currentUser.email : 'Not authenticated'}
              </p>
              <p className="text-blue-700">
                <span className="font-medium">Current Stage:</span> {DELIVERY_STAGE_DETAILS[currentStage]?.name || currentStage}
              </p>
            </div>
            {trackingData && (
              <div>
                <p className="text-blue-700">
                  <span className="font-medium">Tracking Number:</span> {trackingData.trackingNumber}
                </p>
                <p className="text-blue-700">
                  <span className="font-medium">Order ID:</span> {trackingData.orderId}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Test Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <button
          onClick={testCreateDeliveryTracking}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          Create Delivery Tracking
        </button>
        
        <button
          onClick={testStageProgression}
          disabled={loading || !trackingData}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          Test Stage Progression
        </button>
        
        <button
          onClick={testLocationUpdates}
          disabled={loading || !trackingData}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          Test Location Updates
        </button>
        
        <button
          onClick={testDeliveryAttempts}
          disabled={loading || !trackingData}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
        >
          Test Delivery Attempts
        </button>
        
        <button
          onClick={testCompleteDelivery}
          disabled={loading || !trackingData}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          Test Complete Delivery
        </button>
        
        <button
          onClick={testTrackingRetrieval}
          disabled={loading || !trackingData}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          Test Tracking Retrieval
        </button>
        
        <button
          onClick={runAllTests}
          disabled={loading}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 col-span-full"
        >
          {loading ? 'Running Tests...' : 'Run All Tests'}
        </button>
      </div>

      {/* Test Results */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Test Results</h2>
          <button
            onClick={clearTestResults}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Clear Results
          </button>
        </div>

        {testResults.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No test results yet. Click "Run All Tests" to begin.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {testResults.map((result) => (
              <div
                key={result.id}
                className={`p-4 rounded-lg border-l-4 ${
                  result.status === 'PASS'
                    ? 'bg-green-50 border-green-400'
                    : result.status === 'FAIL'
                    ? 'bg-red-50 border-red-400'
                    : result.status === 'SKIP'
                    ? 'bg-yellow-50 border-yellow-400'
                    : 'bg-blue-50 border-blue-400'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{result.test}</h4>
                    <p className="text-sm text-gray-600 mt-1">{result.details}</p>
                    
                    {result.data && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer">
                          View Data
                        </summary>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        result.status === 'PASS'
                          ? 'bg-green-100 text-green-800'
                          : result.status === 'FAIL'
                          ? 'bg-red-100 text-red-800'
                          : result.status === 'SKIP'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {result.status}
                    </span>
                    <span className="text-xs text-gray-500">{result.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delivery Stages Overview */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Delivery Stages</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(DELIVERY_STAGE_DETAILS).map(([stage, details]) => (
            <div
              key={stage}
              className={`p-3 rounded-lg border ${
                currentStage === stage ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">{details.icon}</span>
                <h4 className="font-medium text-gray-900">{details.name}</h4>
              </div>
              <p className="text-sm text-gray-600">{details.description}</p>
              <p className="text-xs text-gray-500 mt-1">Duration: {details.estimatedDuration}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LogisticsTrackingTest;

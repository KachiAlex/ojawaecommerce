import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';

const FraudDetection = ({ order, onFraudDetected, onClear }) => {
  const { currentUser } = useAuth();
  const [riskScore, setRiskScore] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isHighRisk, setIsHighRisk] = useState(false);

  useEffect(() => {
    if (order) {
      analyzeOrder();
    }
  }, [order]);

  const analyzeOrder = async () => {
    try {
      setLoading(true);
      const analysis = await firebaseService.fraud.analyzeOrder({
        orderId: order.id,
        buyerId: order.buyerId,
        vendorId: order.vendorId,
        amount: order.totalAmount,
        paymentMethod: order.paymentProvider,
        timestamp: order.createdAt
      });

      setRiskScore(analysis.riskScore);
      setAlerts(analysis.alerts);
      setIsHighRisk(analysis.riskScore > 70);

      if (analysis.riskScore > 70) {
        onFraudDetected(analysis);
      }
    } catch (error) {
      console.error('Fraud detection error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score) => {
    if (score < 30) return 'text-green-600 bg-green-100';
    if (score < 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getRiskLabel = (score) => {
    if (score < 30) return 'Low Risk';
    if (score < 70) return 'Medium Risk';
    return 'High Risk';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (riskScore === 0) return null;

  return (
    <div className={`border rounded-lg p-4 ${isHighRisk ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">Fraud Detection</h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(riskScore)}`}>
          {getRiskLabel(riskScore)} ({riskScore}%)
        </span>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div key={index} className="flex items-start space-x-2">
              <div className={`w-2 h-2 rounded-full mt-2 ${alert.severity === 'high' ? 'bg-red-500' : alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
              <div className="flex-1">
                <p className="text-sm text-gray-700">{alert.message}</p>
                {alert.recommendation && (
                  <p className="text-xs text-gray-500 mt-1">{alert.recommendation}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isHighRisk && (
        <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm text-red-800 font-medium">
              High risk transaction detected. Manual review recommended.
            </p>
          </div>
        </div>
      )}

      <div className="mt-3 flex space-x-2">
        <button
          onClick={() => firebaseService.fraud.flagOrder(order.id, 'manual_review')}
          className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
        >
          Flag for Review
        </button>
        <button
          onClick={() => firebaseService.fraud.flagOrder(order.id, 'approved')}
          className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
        >
          Approve
        </button>
        {isHighRisk && (
          <button
            onClick={() => firebaseService.fraud.flagOrder(order.id, 'blocked')}
            className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
          >
            Block
          </button>
        )}
      </div>
    </div>
  );
};

export default FraudDetection;

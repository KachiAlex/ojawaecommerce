import React, { useState, useEffect } from 'react';
import performanceMonitor from '../utils/performanceMonitor';

/**
 * Performance Dashboard Component for AI Assistant
 * Only visible in development mode
 */
const AIAssistantPerformance = () => {
  const [metrics, setMetrics] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Update metrics every 2 seconds
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getSummary());
    }, 2000);

    // Check if user wants to see performance metrics (localStorage flag)
    const showMetrics = localStorage.getItem('aiAssistant_showPerformance') === 'true';
    setIsVisible(showMetrics);

    return () => clearInterval(interval);
  }, []);

  // Toggle visibility
  const toggleVisibility = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    localStorage.setItem('aiAssistant_showPerformance', String(newVisibility));
  };

  if (process.env.NODE_ENV !== 'development' || !metrics) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={toggleVisibility}
        className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-blue-700 text-xs"
        aria-label="Toggle performance metrics"
      >
        ⚡ Performance
      </button>

      {/* Metrics Panel */}
      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-64 text-xs">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-900">Performance Metrics</h3>
            <button
              onClick={toggleVisibility}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <div className="text-gray-600">Avg Render Time</div>
              <div className="text-lg font-semibold text-blue-600">
                {metrics.averageRenderTime.toFixed(2)}ms
              </div>
              <div className="text-xs text-gray-500">
                {metrics.renderCount} renders
              </div>
            </div>

            <div className="border-t pt-2">
              <div className="text-gray-600">Avg API Time</div>
              <div className="text-lg font-semibold text-green-600">
                {metrics.averageApiTime.toFixed(2)}ms
              </div>
              <div className="text-xs text-gray-500">
                {metrics.apiCount} API calls
              </div>
            </div>

            <div className="border-t pt-2">
              <button
                onClick={() => performanceMonitor.clear()}
                className="text-red-600 hover:text-red-700 text-xs"
              >
                Clear Metrics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistantPerformance;

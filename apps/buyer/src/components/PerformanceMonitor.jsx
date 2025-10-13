import React, { useEffect, useState } from 'react';
import performanceMonitor from '../utils/performanceMonitor';

const PerformanceMonitor = ({ showInDevelopment = true }) => {
  const [metrics, setMetrics] = useState({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && showInDevelopment) {
      const updateMetrics = () => {
        setMetrics(performanceMonitor.getReport());
      };

      // Update metrics every 5 seconds
      const interval = setInterval(updateMetrics, 5000);
      updateMetrics(); // Initial load

      return () => clearInterval(interval);
    }
  }, [showInDevelopment]);

  if (process.env.NODE_ENV !== 'development' || !showInDevelopment) {
    return null;
  }

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPerformanceColor = (value, threshold) => {
    if (value <= threshold * 0.5) return 'text-green-600';
    if (value <= threshold) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-black text-white px-3 py-2 rounded-lg text-sm font-mono shadow-lg hover:bg-gray-800 transition-colors"
      >
        📊 Perf
      </button>

      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900">Performance Monitor</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3 text-sm">
            {/* Core Web Vitals */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Core Web Vitals</h4>
              <div className="space-y-1">
                {metrics.metrics?.lcp && (
                  <div className="flex justify-between">
                    <span>LCP:</span>
                    <span className={getPerformanceColor(metrics.metrics.lcp, 2500)}>
                      {metrics.metrics.lcp.toFixed(0)}ms
                    </span>
                  </div>
                )}
                {metrics.metrics?.fid && (
                  <div className="flex justify-between">
                    <span>FID:</span>
                    <span className={getPerformanceColor(metrics.metrics.fid, 100)}>
                      {metrics.metrics.fid.toFixed(0)}ms
                    </span>
                  </div>
                )}
                {metrics.metrics?.cls && (
                  <div className="flex justify-between">
                    <span>CLS:</span>
                    <span className={getPerformanceColor(metrics.metrics.cls, 0.1)}>
                      {metrics.metrics.cls.toFixed(3)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Memory Usage */}
            {metrics.metrics?.memory_used && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Memory Usage</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Used:</span>
                    <span>{formatBytes(metrics.metrics.memory_used)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Limit:</span>
                    <span>{formatBytes(metrics.metrics.memory_limit)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(metrics.metrics.memory_used / metrics.metrics.memory_limit) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Connection Info */}
            {metrics.connection && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Connection</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="capitalize">{metrics.connection.effectiveType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Downlink:</span>
                    <span>{metrics.connection.downlink} Mbps</span>
                  </div>
                  <div className="flex justify-between">
                    <span>RTT:</span>
                    <span>{metrics.connection.rtt}ms</span>
                  </div>
                </div>
              </div>
            )}

            {/* Bundle Metrics */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Bundle Loading</h4>
              <div className="space-y-1">
                {Object.entries(metrics.metrics || {})
                  .filter(([key]) => key.startsWith('bundle_'))
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span>{key.replace('bundle_', '')}:</span>
                      <span>{value.toFixed(0)}ms</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Timestamp */}
            <div className="pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;

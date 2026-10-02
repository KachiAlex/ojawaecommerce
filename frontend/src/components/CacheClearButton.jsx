import { useState } from 'react';
import { clearCachesAndReload, getCacheInfo } from '../utils/cacheManager';

const CacheClearButton = () => {
  const [clearing, setClearing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [cacheInfo, setCacheInfo] = useState([]);

  const handleClearCache = async () => {
    if (window.confirm('This will clear all cached data and reload the page. Continue?')) {
      setClearing(true);
      await clearCachesAndReload();
    }
  };

  const handleShowInfo = async () => {
    const info = await getCacheInfo();
    setCacheInfo(info);
    setShowInfo(!showInfo);
  };

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          🔧 Cache Management
        </h3>
        <p className="text-xs text-gray-600 mb-3">
          If pages aren't loading properly, try clearing the cache.
        </p>
        
        <div className="space-y-2">
          <button
            onClick={handleClearCache}
            disabled={clearing}
            className="w-full bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {clearing ? 'Clearing...' : 'Clear Cache & Reload'}
          </button>
          
          <button
            onClick={handleShowInfo}
            className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            {showInfo ? 'Hide Info' : 'Show Cache Info'}
          </button>
        </div>

        {showInfo && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Cached Data:</h4>
            {cacheInfo.length > 0 ? (
              <ul className="space-y-1">
                {cacheInfo.map((cache, index) => (
                  <li key={index} className="text-xs text-gray-600">
                    {cache.name}: {cache.entries} items
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">No cache data</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CacheClearButton;


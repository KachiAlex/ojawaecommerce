import { useState, useEffect } from 'react';
import googleMapsService from '../services/googleMapsService';
import googleMapsDiagnostics from '../utils/googleMapsDiagnostics';
import GoogleMapsLocationPicker from '../components/GoogleMapsLocationPicker';

const GoogleMapsTest = () => {
  const [diagnosticResults, setDiagnosticResults] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const results = await googleMapsDiagnostics.runFullDiagnostic();
      setDiagnosticResults(results);
    } catch (error) {
      console.error('Diagnostic error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testGeocoding = async () => {
    setLoading(true);
    try {
      await googleMapsService.initialize();
      const result = await googleMapsService.geocodeAddress('1 Lagos Street, Lagos, Nigeria');
      setTestResults(prev => ({
        ...prev,
        geocoding: result ? { success: true, data: result } : { success: false, error: 'No result' }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        geocoding: { success: false, error: error.message }
      }));
    } finally {
      setLoading(false);
    }
  };

  const testRouteCalculation = async () => {
    setLoading(true);
    try {
      await googleMapsService.initialize();
      const result = await googleMapsService.calculateRoute(
        '1 Lagos Street, Lagos, Nigeria',
        '10 Abuja Road, Abuja, Nigeria'
      );
      setTestResults(prev => ({
        ...prev,
        routing: result ? { success: true, data: result } : { success: false, error: 'No result' }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        routing: { success: false, error: error.message }
      }));
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'PASS') return '✅';
    if (status === 'NEEDS_CONFIGURATION') return '⚠️';
    return '❌';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🗺️ Google Maps Integration Test
          </h1>
          <p className="text-gray-600">
            Verify your Google Maps API configuration and test all features
          </p>
        </div>

        {/* Diagnostic Results */}
        {diagnosticResults && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Diagnostic Results</h2>
              <button
                onClick={runDiagnostics}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                disabled={loading}
              >
                {loading ? 'Running...' : 'Refresh'}
              </button>
            </div>

            {/* Overall Status */}
            <div className={`p-4 rounded-lg mb-4 ${
              diagnosticResults.overall === 'PASS' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-center">
                <span className="text-3xl mr-3">
                  {getStatusIcon(diagnosticResults.overall)}
                </span>
                <div>
                  <p className="font-semibold text-lg">
                    {diagnosticResults.overall === 'PASS' 
                      ? 'All Systems Operational' 
                      : 'Configuration Needed'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {diagnosticResults.overall === 'PASS'
                      ? 'Google Maps is ready to use'
                      : 'Please complete the setup steps below'}
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* API Key */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">API Key</h3>
                <div className="space-y-1 text-sm">
                  <p>Exists: {diagnosticResults.apiKey.exists ? '✅' : '❌'}</p>
                  <p>Valid Format: {diagnosticResults.apiKey.isValid ? '✅' : '❌'}</p>
                  <p className="text-gray-600">Value: {diagnosticResults.apiKey.value}</p>
                </div>
              </div>

              {/* Browser Support */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Browser Support</h3>
                <div className="space-y-1 text-sm">
                  <p>Geolocation: {diagnosticResults.browser.geolocation ? '✅' : '❌'}</p>
                  <p>Service Worker: {diagnosticResults.browser.serviceWorker ? '✅' : '❌'}</p>
                  <p>Local Storage: {diagnosticResults.browser.localStorage ? '✅' : '❌'}</p>
                </div>
              </div>

              {/* Maps Library */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Maps Library</h3>
                <div className="space-y-1 text-sm">
                  <p>Loaded: {diagnosticResults.loaded ? '✅' : '❌'}</p>
                  <p className="text-gray-600">
                    {diagnosticResults.loaded 
                      ? 'Google Maps JavaScript loaded' 
                      : 'Not loaded (will load when needed)'}
                  </p>
                </div>
              </div>

              {/* Connection Test */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">API Connection</h3>
                <div className="space-y-1 text-sm">
                  <p>Status: {diagnosticResults.connection.success ? '✅' : '❌'}</p>
                  <p className="text-gray-600">{diagnosticResults.connection.message}</p>
                  {diagnosticResults.connection.errorMessage && (
                    <p className="text-red-600 text-xs mt-2">
                      {diagnosticResults.connection.errorMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Setup Instructions */}
            {diagnosticResults.overall !== 'PASS' && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-3">🔧 Setup Required:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                  <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                  <li>Click your API key to edit</li>
                  <li>Add HTTP referrers:
                    <ul className="ml-6 mt-1 space-y-1 text-xs font-mono">
                      <li>https://ojawa-ecommerce.web.app/*</li>
                      <li>https://ojawa-ecommerce.firebaseapp.com/*</li>
                      <li>http://localhost:5173/*</li>
                    </ul>
                  </li>
                  <li>Enable APIs: Maps JavaScript, Places, Geocoding, Directions</li>
                  <li>Save and wait 2 minutes for propagation</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Feature Tests */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Feature Tests</h2>
          
          <div className="space-y-4">
            {/* Test 1: Geocoding */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">1. Geocoding Test</h3>
                <button
                  onClick={testGeocoding}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Test Geocoding
                </button>
              </div>
              {testResults.geocoding && (
                <div className={`p-3 rounded ${
                  testResults.geocoding.success ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <p className="text-sm font-medium">
                    {testResults.geocoding.success ? '✅ Success' : '❌ Failed'}
                  </p>
                  {testResults.geocoding.data && (
                    <p className="text-xs text-gray-600 mt-1">
                      Coordinates: {testResults.geocoding.data.coordinates.lat}, {testResults.geocoding.data.coordinates.lng}
                    </p>
                  )}
                  {testResults.geocoding.error && (
                    <p className="text-xs text-red-600 mt-1">
                      Error: {testResults.geocoding.error}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Test 2: Route Calculation */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">2. Route Calculation Test</h3>
                <button
                  onClick={testRouteCalculation}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  Test Routing
                </button>
              </div>
              {testResults.routing && (
                <div className={`p-3 rounded ${
                  testResults.routing.success ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <p className="text-sm font-medium">
                    {testResults.routing.success ? '✅ Success' : '❌ Failed'}
                  </p>
                  {testResults.routing.data && (
                    <div className="text-xs text-gray-600 mt-1 space-y-1">
                      <p>Distance: {testResults.routing.data.distance?.text}</p>
                      <p>Duration: {testResults.routing.data.duration?.text}</p>
                    </div>
                  )}
                  {testResults.routing.error && (
                    <p className="text-xs text-red-600 mt-1">
                      Error: {testResults.routing.error}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Test 3: Address Autocomplete */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">3. Address Autocomplete Test</h3>
              <p className="text-sm text-gray-600 mb-3">
                Start typing an address to test autocomplete:
              </p>
              <GoogleMapsLocationPicker
                value={selectedLocation?.address || ''}
                onChange={(location) => {
                  setSelectedLocation(location);
                  setTestResults(prev => ({
                    ...prev,
                    autocomplete: location ? { success: true, data: location } : null
                  }));
                }}
                placeholder="Type an address (e.g., 1 Lagos Street)"
              />
              {testResults.autocomplete && (
                <div className="mt-3 p-3 bg-green-50 rounded">
                  <p className="text-sm font-medium">✅ Autocomplete Working</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Selected: {testResults.autocomplete.data.address}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium">API Credentials</span>
              <span>→</span>
            </a>
            <a
              href="https://console.cloud.google.com/apis/library/maps-backend.googleapis.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium">Enable Maps API</span>
              <span>→</span>
            </a>
            <a
              href="https://console.cloud.google.com/apis/library/places-backend.googleapis.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium">Enable Places API</span>
              <span>→</span>
            </a>
            <a
              href="https://console.cloud.google.com/apis/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium">API Dashboard</span>
              <span>→</span>
            </a>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">📖 How to Use This Page:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Run diagnostics to check configuration status</li>
            <li>If errors appear, follow the setup instructions above</li>
            <li>Test individual features after configuration</li>
            <li>Check browser console for detailed logs</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapsTest;


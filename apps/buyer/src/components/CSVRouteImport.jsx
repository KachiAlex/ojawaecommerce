import { useState } from 'react';

const CSVRouteImport = ({ isOpen, onClose, onImport, currency = '₦ NGN' }) => {
  const [csvText, setCsvText] = useState('');
  const [previewData, setPreviewData] = useState([]);
  const [errors, setErrors] = useState([]);

  const sampleCSV = `Route Type,From,To,Distance (km),Price,Estimated Time,Vehicle Type
intercity,Lagos,Abuja,750,45000,8-12 hours,Truck
intercity,Lagos,Port Harcourt,630,38000,8-10 hours,Van
international,Lagos Nigeria,Accra Ghana,400,120000,5-7 days,Flight
intracity,Lagos State,Lagos,0,5000,1-2 hours,Motorcycle`;

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      setErrors(['CSV file must have at least a header row and one data row.']);
      return null;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['route type', 'from', 'to', 'price', 'estimated time'];
    
    const missingHeaders = requiredHeaders.filter(h => !headers.some(header => header.includes(h.replace(' ', ''))));
    if (missingHeaders.length > 0) {
      setErrors([`Missing required columns: ${missingHeaders.join(', ')}`]);
      return null;
    }

    const routes = [];
    const newErrors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) {
        newErrors.push(`Row ${i + 1}: Column count mismatch`);
        continue;
      }

      const route = {};
      headers.forEach((header, idx) => {
        if (header.includes('type')) route.routeType = values[idx].toLowerCase();
        else if (header.includes('from')) route.from = values[idx];
        else if (header.includes('to')) route.to = values[idx];
        else if (header.includes('distance')) route.distance = parseFloat(values[idx]) || 0;
        else if (header.includes('price')) route.price = parseFloat(values[idx]) || 0;
        else if (header.includes('time')) route.estimatedTime = values[idx];
        else if (header.includes('vehicle')) route.vehicleType = values[idx] || 'Van';
      });

      // Validate route
      if (!route.routeType || !['intracity', 'intercity', 'international'].includes(route.routeType)) {
        newErrors.push(`Row ${i + 1}: Invalid route type "${route.routeType}". Must be: intracity, intercity, or international`);
        continue;
      }
      if (!route.price || route.price <= 0) {
        newErrors.push(`Row ${i + 1}: Invalid price`);
        continue;
      }
      if (!route.estimatedTime) {
        newErrors.push(`Row ${i + 1}: Missing estimated time`);
        continue;
      }

      routes.push(route);
    }

    setErrors(newErrors);
    return routes;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setCsvText(text);
      const parsed = parseCSV(text);
      if (parsed) {
        setPreviewData(parsed);
      }
    };
    reader.readAsText(file);
  };

  const handleTextChange = (text) => {
    setCsvText(text);
    if (text.trim()) {
      const parsed = parseCSV(text);
      if (parsed) {
        setPreviewData(parsed);
      }
    } else {
      setPreviewData([]);
      setErrors([]);
    }
  };

  const handleImport = () => {
    if (previewData.length === 0) {
      alert('No valid routes to import');
      return;
    }

    const routesWithMetadata = previewData.map(route => ({
      ...route,
      currency: currency,
      serviceType: 'Standard Delivery',
      status: 'active',
      country: route.routeType === 'intracity' ? (route.from.includes('State') ? route.from : '') : '',
      state: route.routeType === 'intracity' ? (route.from.includes('State') ? route.from : '') : '',
      city: route.routeType === 'intracity' ? route.to : '',
      createdAt: new Date().toISOString()
    }));

    onImport(routesWithMetadata);
    setCsvText('');
    setPreviewData([]);
    setErrors([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">📊 Import Routes from CSV</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
          </div>

          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">📋 CSV Format Instructions</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• First row must be headers (column names)</p>
              <p>• Required columns: Route Type, From, To, Price, Estimated Time</p>
              <p>• Optional columns: Distance (km), Vehicle Type</p>
              <p>• Route Type must be: intracity, intercity, or international</p>
            </div>
          </div>

          {/* Sample CSV */}
          <div className="mb-6">
            <button
              onClick={() => handleTextChange(sampleCSV)}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              💡 Load Sample CSV
            </button>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
            />
          </div>

          {/* Manual Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Or Paste CSV Data</label>
            <textarea
              value={csvText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="w-full h-48 border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
              placeholder={sampleCSV}
            />
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-900 mb-2">⚠️ Errors Found ({errors.length})</h3>
              <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview */}
          {previewData.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">📋 Preview ({previewData.length} routes)</h3>
              <div className="border border-gray-300 rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">From</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">To</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Distance</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Price</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Time</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Vehicle</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((route, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded ${
                            route.routeType === 'intracity' ? 'bg-green-100 text-green-800' :
                            route.routeType === 'intercity' ? 'bg-blue-100 text-blue-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {route.routeType}
                          </span>
                        </td>
                        <td className="px-3 py-2">{route.from}</td>
                        <td className="px-3 py-2">{route.to}</td>
                        <td className="px-3 py-2">{route.distance} km</td>
                        <td className="px-3 py-2 font-medium">₦{route.price.toLocaleString()}</td>
                        <td className="px-3 py-2">{route.estimatedTime}</td>
                        <td className="px-3 py-2">{route.vehicleType || 'Van'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={previewData.length === 0}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import {previewData.length} Route(s)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVRouteImport;


import { useState, useEffect } from 'react';

const AddressInput = ({ value, onChange, label = "Address", required = false, readOnly = false }) => {
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    country: 'Nigeria',
    ...value
  });

  useEffect(() => {
    if (value && typeof value === 'object') {
      setAddress({ ...address, ...value });
    }
  }, [value]);

  const handleChange = (field, val) => {
    const updated = { ...address, [field]: val };
    setAddress(updated);
    if (onChange) {
      onChange(updated);
    }
  };

  const nigerianStates = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
    'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
    'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
    'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
    'Yobe', 'Zamfara'
  ];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Street Address */}
      <div>
        <input
          type="text"
          value={address.street}
          onChange={(e) => handleChange('street', e.target.value)}
          placeholder="Street address (e.g., 15 Marina Street)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          disabled={readOnly}
        />
      </div>

      {/* City */}
      <div>
        <input
          type="text"
          value={address.city}
          onChange={(e) => handleChange('city', e.target.value)}
          placeholder="City (e.g., Lagos Island)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          disabled={readOnly}
        />
      </div>

      {/* State */}
      <div>
        <select
          value={address.state}
          onChange={(e) => handleChange('state', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          disabled={readOnly}
        >
          <option value="">Select State</option>
          {nigerianStates.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </div>

      {/* Country */}
      <div>
        <input
          type="text"
          value={address.country}
          onChange={(e) => handleChange('country', e.target.value)}
          placeholder="Country"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          disabled={readOnly}
        />
      </div>

      {/* Full Address Preview */}
      {address.street && address.city && address.state && (
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
          <strong>Full Address:</strong> {address.street}, {address.city}, {address.state}, {address.country}
        </div>
      )}
    </div>
  );
};

export default AddressInput;


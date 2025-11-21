import { useState, useEffect } from 'react';
import { getAllCountries, getStatesForCountry } from '../data/countriesAndStates';

const ServiceAreaModal = ({ isOpen, onClose, onAdd, existingAreas = [] }) => {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedStates, setSelectedStates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const countries = getAllCountries();

  useEffect(() => {
    if (!isOpen) {
      setSelectedCountry('');
      setSelectedStates([]);
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleCountryChange = (country) => {
    setSelectedCountry(country);
    setSelectedStates([]);
  };

  const handleStateToggle = (state) => {
    setSelectedStates(prev => 
      prev.includes(state)
        ? prev.filter(s => s !== state)
        : [...prev, state]
    );
  };

  const handleSelectAll = () => {
    const allStates = getStatesForCountry(selectedCountry);
    const filtered = allStates.filter(state => 
      state.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const allSelected = filtered.every(state => selectedStates.includes(state));
    
    if (allSelected) {
      // Deselect all filtered states
      setSelectedStates(prev => prev.filter(s => !filtered.includes(s)));
    } else {
      // Select all filtered states
      setSelectedStates(prev => {
        const newStates = [...prev];
        filtered.forEach(state => {
          if (!newStates.includes(state)) {
            newStates.push(state);
          }
        });
        return newStates;
      });
    }
  };

  const handleAddServiceAreas = () => {
    if (!selectedCountry || selectedStates.length === 0) {
      alert('Please select a country and at least one state');
      return;
    }

    // Add each selected state as a service area
    const newAreas = selectedStates.map(state => ({
      country: selectedCountry,
      state: state,
      id: `${selectedCountry}-${state}`.replace(/\s+/g, '-').toLowerCase()
    }));

    // Filter out duplicates
    const uniqueNewAreas = newAreas.filter(newArea => 
      !existingAreas.some(existing => 
        existing.country === newArea.country && existing.state === newArea.state
      )
    );

    if (uniqueNewAreas.length === 0) {
      alert('All selected states are already added');
      return;
    }

    onAdd(uniqueNewAreas);
    onClose();
  };

  if (!isOpen) return null;

  const availableStates = getStatesForCountry(selectedCountry);
  const filteredStates = availableStates.filter(state =>
    state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Add Service Areas</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Country Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Country *
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              >
                <option value="">Choose a country...</option>
                {countries.map(country => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            {/* States Selection */}
            {selectedCountry && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Select States/Regions * ({selectedStates.length} selected)
                  </label>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {filteredStates.every(state => selectedStates.includes(state))
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>

                {/* Search */}
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Search states..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                {/* States Grid */}
                <div className="border border-gray-200 rounded-lg p-4 max-h-80 overflow-y-auto bg-gray-50">
                  {filteredStates.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {filteredStates.map(state => (
                        <label
                          key={state}
                          className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-colors ${
                            selectedStates.includes(state)
                              ? 'bg-blue-50 border-blue-200 border'
                              : 'bg-white border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedStates.includes(state)}
                            onChange={() => handleStateToggle(state)}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">{state}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No states found matching "{searchQuery}"</p>
                    </div>
                  )}
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  💡 Tip: You can select multiple states from the same country
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddServiceAreas}
            disabled={!selectedCountry || selectedStates.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Add {selectedStates.length > 0 && `(${selectedStates.length})`} State{selectedStates.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceAreaModal;


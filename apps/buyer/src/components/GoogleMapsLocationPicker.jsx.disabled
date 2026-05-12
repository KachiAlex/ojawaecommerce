import React, { useState, useEffect, useRef } from 'react';
import googleMapsService from '../services/googleMapsService';

const GoogleMapsLocationPicker = ({ 
  onLocationSelect, 
  initialLocation = null, 
  placeholder = "Enter address...",
  label = "Location",
  required = false 
}) => {
  const [location, setLocation] = useState(initialLocation || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapsInitialized, setMapsInitialized] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Handle input change with debouncing
  useEffect(() => {
    if (!location || location.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsLoading(true);
        
        // Lazy initialize Google Maps only when user starts typing
        if (!mapsInitialized) {
          const initialized = await googleMapsService.initialize();
          setMapsInitialized(initialized);
        }
        
        // In a real implementation, you would use Google Places Autocomplete
        // For now, we'll simulate with a simple geocoding call
        const result = await googleMapsService.geocodeAddress(location);
        
        // Check if result is null (Maps service not available)
        if (!result) {
          // Maps not available - just use the entered text
          setSuggestions([{
            address: location,
            placeId: null,
            location: { address: location, lat: null, lng: null }
          }]);
        } else {
          setSuggestions([{
            address: result.address,
            placeId: result.placeId,
            location: result
          }]);
        }
        setShowSuggestions(true);
        setError(null);
      } catch (error) {
        console.error('Error getting location suggestions:', error);
        setError('Location not found');
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [location, mapsInitialized]);

  // Handle location selection
  const handleLocationSelect = async (selectedLocation) => {
    try {
      setLocation(selectedLocation.address);
      setShowSuggestions(false);
      setError(null);
      
      if (onLocationSelect) {
        onLocationSelect(selectedLocation);
      }
    } catch (error) {
      console.error('Error selecting location:', error);
      setError('Failed to select location');
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          required={required}
        />
        
        {isLoading && (
          <div className="absolute right-3 top-2.5">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Location Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.placeId || index}
              onClick={() => handleLocationSelect(suggestion)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
            >
              <div className="text-sm text-gray-900">
                {suggestion.address}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GoogleMapsLocationPicker;

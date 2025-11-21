import { useState, useEffect, useRef } from 'react';
import googleMapsService from '../services/googleMapsService';

const AddressInput = ({ value, onChange, label = "Address", required = false, readOnly = false }) => {
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    country: 'Nigeria',
    ...value
  });

  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isLoadingMaps, setIsLoadingMaps] = useState(false);
  const [mapsInitialized, setMapsInitialized] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const autocompleteRef = useRef(null);
  const inputRefs = useRef({});
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);

  useEffect(() => {
    if (value && typeof value === 'object') {
      setAddress(prev => ({ ...prev, ...value }));
    }
  }, [value]);

  // Initialize Google Maps and Autocomplete Service
  const initializeMaps = async () => {
    if (mapsInitialized || isLoadingMaps) {
      console.log('⏭️ Maps already initialized or loading');
      return;
    }
    
    try {
      console.log('🚀 Starting Google Maps initialization...');
      setIsLoadingMaps(true);
      
      // Initialize the Google Maps service (loads script and Places library)
      const initialized = await googleMapsService.initialize();
      console.log('📡 Google Maps service.initialize():', initialized);
      
      // Check if Google Maps is actually loaded (even if service returns false)
      const mapsActuallyLoaded = !!(window.google && window.google.maps && window.google.maps.places);
      console.log('📡 Google Maps actually loaded:', mapsActuallyLoaded);
      
      if (mapsActuallyLoaded) {
        console.log('🎯 Creating AutocompleteService...');
        
        try {
          autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
          console.log('✅ AutocompleteService created:', !!autocompleteServiceRef.current);
          
          // Create a hidden div for PlacesService (it requires a map or div)
          const hiddenDiv = document.createElement('div');
          hiddenDiv.id = 'hidden-places-service';
          placesServiceRef.current = new google.maps.places.PlacesService(hiddenDiv);
          console.log('✅ PlacesService created:', !!placesServiceRef.current);
          
          setMapsInitialized(true);
          console.log('🎉 Google Places Autocomplete fully initialized and ready!');
        } catch (serviceError) {
          console.error('❌ Failed to create Places services:', serviceError);
        }
      } else {
        console.error('❌ Google Maps Places API not available');
        console.log('   - window.google:', !!window.google);
        console.log('   - window.google.maps:', !!window.google?.maps);
        console.log('   - window.google.maps.places:', !!window.google?.maps?.places);
      }
    } catch (error) {
      console.error('❌ Failed to initialize Google Maps:', error);
    } finally {
      setIsLoadingMaps(false);
    }
  };

  // Fetch autocomplete predictions
  const fetchAutocompletePredictions = async (input, fieldType) => {
    if (!input || input.length < 2) {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      return;
    }

    // Initialize maps if not already done
    if (!mapsInitialized) {
      console.log('🗺️ Initializing Google Maps for autocomplete...');
      await initializeMaps();
    }

    if (!autocompleteServiceRef.current) {
      console.warn('⚠️ Autocomplete service not available yet');
      return;
    }

    try {
      console.log(`🔍 Fetching predictions for "${input}" (type: ${fieldType})`);
      
      const request = {
        input: input,
        componentRestrictions: { country: 'ng' }, // Restrict to Nigeria
        types: fieldType === 'street' ? ['address'] : ['(cities)'],
      };

      autocompleteServiceRef.current.getPlacePredictions(request, (predictions, status) => {
        console.log('📍 Autocomplete status:', status);
        console.log('📍 Predictions received:', predictions?.length || 0);
        
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
          console.log('✅ Setting autocomplete results:', predictions.length);
          setAutocompleteResults(predictions);
          setShowAutocomplete(true);
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          console.log('⚠️ No results found for:', input);
          setAutocompleteResults([]);
          setShowAutocomplete(false);
        } else {
          console.error('❌ Autocomplete error:', status);
          setAutocompleteResults([]);
          setShowAutocomplete(false);
        }
      });
    } catch (error) {
      console.error('❌ Error fetching autocomplete predictions:', error);
      setAutocompleteResults([]);
      setShowAutocomplete(false);
    }
  };

  // Handle place selection
  const handlePlaceSelect = async (placeId, description) => {
    setShowAutocomplete(false);
    
    if (!placesServiceRef.current) return;

    try {
      placesServiceRef.current.getDetails(
        { placeId: placeId },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            // const components = googleMapsService.parseAddressComponents(place.address_components); // Disabled
            const components = { streetNumber: '', route: '', locality: '', administrative_area_level_1: '', country: '' }; // Fallback
            
            const updatedAddress = {
              street: components.streetNumber && components.route 
                ? `${components.streetNumber} ${components.route}` 
                : components.route || address.street || '',
              city: components.city || address.city || '',
              state: components.state || address.state || '',
              country: components.country || address.country || 'Nigeria',
            };

            setAddress(updatedAddress);
            if (onChange) {
              onChange(updatedAddress);
            }
          }
        }
      );
    } catch (error) {
      console.error('Error getting place details:', error);
      // Fallback: just use the description
      if (activeField === 'street') {
        handleChange('street', description);
      }
    }
  };

  // Handle field change
  const handleChange = (field, val) => {
    const updated = { ...address, [field]: val };
    console.log('🏠 AddressInput - Field changed:', field, 'to:', val);
    console.log('🏠 AddressInput - Updated address:', updated);
    setAddress(updated);
    if (onChange) {
      onChange(updated);
    }
  };

  // Debounce timer ref
  const debounceTimerRef = useRef(null);

  // Handle input with autocomplete (debounced)
  const handleInputChange = (field, value) => {
    handleChange(field, value);
    setSearchTerm(value);
    setActiveField(field);
    
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Trigger autocomplete after debounce
    if (!readOnly && value.length >= 2) {
      setIsLoadingMaps(true);
      debounceTimerRef.current = setTimeout(() => {
        fetchAutocompletePredictions(value, field);
        setIsLoadingMaps(false);
      }, 500); // 500ms debounce
    } else {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      setIsLoadingMaps(false);
    }
  };

  // Close autocomplete on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

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

      {/* Street Address with Autocomplete */}
      <div className="relative" ref={autocompleteRef}>
        <input
          ref={(el) => inputRefs.current['street'] = el}
          type="text"
          value={address.street}
          onChange={(e) => handleInputChange('street', e.target.value)}
          onFocus={() => {
            setActiveField('street');
            if (!mapsInitialized) initializeMaps();
          }}
          placeholder="🔍 Start typing street address... (e.g., 15 Marina Street)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          disabled={readOnly}
        />
        
        {/* Autocomplete Dropdown */}
        {showAutocomplete && activeField === 'street' && autocompleteResults.length > 0 && (
          <div 
            className="absolute w-full mt-1 bg-white border-2 border-emerald-500 rounded-lg shadow-2xl max-h-64 overflow-y-auto"
            style={{ zIndex: 9999 }}
          >
            <div className="px-3 py-2 text-xs text-gray-500 bg-emerald-50 border-b border-emerald-200">
              📍 Google Maps Suggestions
            </div>
            {autocompleteResults.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                onClick={() => handlePlaceSelect(prediction.place_id, prediction.description)}
                className="w-full px-3 py-3 text-left hover:bg-emerald-100 focus:bg-emerald-100 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5 text-lg">📍</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 font-semibold">
                      {prediction.structured_formatting.main_text}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {prediction.structured_formatting.secondary_text}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* City with Autocomplete */}
      <div className="relative">
        <input
          ref={(el) => inputRefs.current['city'] = el}
          type="text"
          value={address.city}
          onChange={(e) => handleInputChange('city', e.target.value)}
          onFocus={() => {
            setActiveField('city');
            if (!mapsInitialized) initializeMaps();
          }}
          placeholder="🔍 City (e.g., Lagos Island)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          disabled={readOnly}
        />
        
        {/* Autocomplete Dropdown for City */}
        {showAutocomplete && activeField === 'city' && autocompleteResults.length > 0 && (
          <div 
            className="absolute w-full mt-1 bg-white border-2 border-emerald-500 rounded-lg shadow-2xl max-h-64 overflow-y-auto"
            style={{ zIndex: 9999 }}
          >
            <div className="px-3 py-2 text-xs text-gray-500 bg-emerald-50 border-b border-emerald-200">
              🏙️ Google Maps City Suggestions
            </div>
            {autocompleteResults.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                onClick={() => {
                  handleChange('city', prediction.structured_formatting.main_text);
                  setShowAutocomplete(false);
                }}
                className="w-full px-3 py-3 text-left hover:bg-emerald-100 focus:bg-emerald-100 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5 text-lg">🏙️</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 font-semibold">
                      {prediction.structured_formatting.main_text}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {prediction.structured_formatting.secondary_text}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
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
        <div className="text-xs text-gray-600 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
          <div className="flex items-start gap-2">
            <span className="text-emerald-600">✅</span>
            <div>
              <strong className="text-emerald-900">Complete Address:</strong>
              <div className="mt-1 text-gray-700">
                {address.street}, {address.city}, {address.state}, {address.country}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isLoadingMaps && (
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-600"></div>
          <span>Loading Google Maps autocomplete...</span>
        </div>
      )}
    </div>
  );
};

export default AddressInput;


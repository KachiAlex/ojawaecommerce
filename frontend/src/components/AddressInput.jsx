import { useState, useEffect, useRef } from 'react';
import MapPicker from './MapPicker';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const MAPBOX_GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

// Map of country names to ISO 3166-1 alpha-2 codes for Mapbox API
const COUNTRIES = [
  { name: 'Nigeria', code: 'ng' },
  { name: 'Ghana', code: 'gh' },
  { name: 'Kenya', code: 'ke' },
  { name: 'South Africa', code: 'za' },
  { name: 'Egypt', code: 'eg' },
  { name: 'Morocco', code: 'ma' },
  { name: 'Algeria', code: 'dz' },
  { name: 'Tunisia', code: 'tn' },
  { name: 'Ethiopia', code: 'et' },
  { name: 'Tanzania', code: 'tz' },
  { name: 'Uganda', code: 'ug' },
  { name: 'Cameroon', code: 'cm' },
  { name: 'Senegal', code: 'sn' },
  { name: 'Ivory Coast', code: 'ci' },
  { name: 'Benin', code: 'bj' },
  { name: 'Togo', code: 'tg' },
  { name: 'Burkina Faso', code: 'bf' },
  { name: 'Mali', code: 'ml' },
  { name: 'Niger', code: 'ne' },
  { name: 'Chad', code: 'td' },
  { name: 'Sudan', code: 'sd' },
  { name: 'Rwanda', code: 'rw' },
  { name: 'Burundi', code: 'bi' },
  { name: 'Zambia', code: 'zm' },
  { name: 'Zimbabwe', code: 'zw' },
  { name: 'Malawi', code: 'mw' },
  { name: 'Mozambique', code: 'mz' },
  { name: 'Angola', code: 'ao' },
  { name: 'Botswana', code: 'bw' },
  { name: 'Namibia', code: 'na' },
  { name: 'Lesotho', code: 'ls' },
  { name: 'Eswatini', code: 'sz' },
  { name: 'Madagascar', code: 'mg' },
  { name: 'Mauritius', code: 'mu' },
  { name: 'Seychelles', code: 'sc' },
  { name: 'Cape Verde', code: 'cv' },
  { name: 'Guinea', code: 'gn' },
  { name: 'Sierra Leone', code: 'sl' },
  { name: 'Liberia', code: 'lr' },
  { name: 'Mauritania', code: 'mr' },
  { name: 'Gambia', code: 'gm' },
  { name: 'Gabon', code: 'ga' },
  { name: 'Congo', code: 'cg' },
  { name: 'DR Congo', code: 'cd' },
  { name: 'Central African Republic', code: 'cf' },
  { name: 'Equatorial Guinea', code: 'gq' },
  { name: 'Djibouti', code: 'dj' },
  { name: 'Eritrea', code: 'er' },
  { name: 'Somalia', code: 'so' },
  { name: 'South Sudan', code: 'ss' },
  { name: 'Comoros', code: 'km' },
  { name: 'United States', code: 'us' },
  { name: 'United Kingdom', code: 'gb' },
  { name: 'Canada', code: 'ca' },
  { name: 'Australia', code: 'au' },
  { name: 'Germany', code: 'de' },
  { name: 'France', code: 'fr' },
  { name: 'Spain', code: 'es' },
  { name: 'Italy', code: 'it' },
  { name: 'Netherlands', code: 'nl' },
  { name: 'Belgium', code: 'be' },
  { name: 'Switzerland', code: 'ch' },
  { name: 'Portugal', code: 'pt' },
  { name: 'Ireland', code: 'ie' },
  { name: 'Sweden', code: 'se' },
  { name: 'Norway', code: 'no' },
  { name: 'Denmark', code: 'dk' },
  { name: 'Finland', code: 'fi' },
  { name: 'Poland', code: 'pl' },
  { name: 'Austria', code: 'at' },
  { name: 'Greece', code: 'gr' },
  { name: 'Turkey', code: 'tr' },
  { name: 'Russia', code: 'ru' },
  { name: 'China', code: 'cn' },
  { name: 'Japan', code: 'jp' },
  { name: 'South Korea', code: 'kr' },
  { name: 'India', code: 'in' },
  { name: 'Pakistan', code: 'pk' },
  { name: 'Bangladesh', code: 'bd' },
  { name: 'Indonesia', code: 'id' },
  { name: 'Malaysia', code: 'my' },
  { name: 'Singapore', code: 'sg' },
  { name: 'Philippines', code: 'ph' },
  { name: 'Thailand', code: 'th' },
  { name: 'Vietnam', code: 'vn' },
  { name: 'Brazil', code: 'br' },
  { name: 'Argentina', code: 'ar' },
  { name: 'Mexico', code: 'mx' },
  { name: 'Colombia', code: 'co' },
  { name: 'Chile', code: 'cl' },
  { name: 'Peru', code: 'pe' },
  { name: 'Venezuela', code: 've' },
  { name: 'UAE', code: 'ae' },
  { name: 'Saudi Arabia', code: 'sa' },
  { name: 'Qatar', code: 'qa' },
  { name: 'Kuwait', code: 'kw' },
  { name: 'Bahrain', code: 'bh' },
  { name: 'Oman', code: 'om' },
  { name: 'Israel', code: 'il' },
  { name: 'Jordan', code: 'jo' },
  { name: 'Lebanon', code: 'lb' },
  { name: 'Iraq', code: 'iq' },
  { name: 'Iran', code: 'ir' },
];

const getCountryCode = (countryName) => {
  const found = COUNTRIES.find(c => c.name.toLowerCase() === (countryName || '').toLowerCase());
  return found ? found.code : 'ng';
};

const AddressInput = ({ value, onChange, label = 'Address', required = false, readOnly = false }) => {
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    country: 'Nigeria',
    ...value,
  });

  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [mapsUrl, setMapsUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [urlSuccess, setUrlSuccess] = useState(false);

  const autocompleteRef = useRef(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (value && typeof value === 'object') {
      setAddress((prev) => ({ ...prev, ...value }));
    }
  }, [value]);

  // Parse coordinates from a Google Maps URL
  const parseGoogleMapsUrl = (url) => {
    if (!url) return null;
    const trimmed = url.trim();

    // Format: @lat,lng zoom (e.g., https://www.google.com/maps/place/.../@6.5244,3.3792,17z)
    const atMatch = trimmed.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    }

    // Format: ?q=lat,lng (e.g., https://maps.google.com/?q=6.5244,3.3792)
    const qMatch = trimmed.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) {
      return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    }

    // Format: ?q=place+name (no coords) — try center param
    const centerMatch = trimmed.match(/[?&]center=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (centerMatch) {
      return { lat: parseFloat(centerMatch[1]), lng: parseFloat(centerMatch[2]) };
    }

    // Format: !3dlat!4dlng (e.g., in place URLs with data=!3m4!1s...!3d6.5244!4d3.3792)
    const dMatch = trimmed.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (dMatch) {
      return { lat: parseFloat(dMatch[1]), lng: parseFloat(dMatch[2]) };
    }

    return null;
  };

  // Reverse geocode coordinates using Mapbox to fill in address fields
  const reverseGeocode = async (lat, lng) => {
    if (!MAPBOX_TOKEN) return null;
    try {
      const url = `${MAPBOX_GEOCODING_URL}/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1&types=address,poi,place,locality,neighborhood`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.features || data.features.length === 0) return null;
      const feature = data.features[0];
      return {
        place_name: feature.place_name || '',
        text: feature.text || '',
        address: feature.address || '',
        center: feature.center,
        context: feature.context || [],
        place_type: feature.place_type || [],
      };
    } catch (e) {
      return null;
    }
  };

  // Handle Google Maps URL paste
  const handleMapsUrlSubmit = async () => {
    setUrlError('');
    setUrlSuccess(false);
    if (!mapsUrl || mapsUrl.trim().length < 10) {
      setUrlError('Please paste a valid Google Maps URL');
      return;
    }

    // First try client-side parsing (works for full URLs with @lat,lng)
    let coords = parseGoogleMapsUrl(mapsUrl);

    // If client-side parsing fails, use backend to follow redirects (for short links)
    if (!coords) {
      try {
        setUrlError('');
        const resp = await fetch(
          `${window.location.origin}/api/logistics/resolve-maps-url?url=${encodeURIComponent(mapsUrl)}`
        );
        const data = await resp.json();
        if (data.success && data.coords) {
          coords = data.coords;
        } else {
          setUrlError(data.error || 'Could not extract coordinates from this URL.');
          return;
        }
      } catch (e) {
        setUrlError('Failed to resolve the link. Please try the full URL from the browser address bar.');
        return;
      }
    }

    // Try to reverse geocode to fill in address fields
    const place = await reverseGeocode(coords.lat, coords.lng);
    let updatedAddress;

    if (place) {
      const parts = extractAddressParts(place);
      updatedAddress = {
        street: parts.street || address.street || '',
        city: parts.city || address.city || '',
        state: parts.state || address.state || '',
        country: parts.country || address.country || 'Nigeria',
        lat: coords.lat,
        lng: coords.lng,
        displayName: place.place_name || `${coords.lat}, ${coords.lng}`,
        verified: true,
      };
    } else {
      updatedAddress = {
        ...address,
        lat: coords.lat,
        lng: coords.lng,
        displayName: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
        verified: true,
      };
    }

    setAddress(updatedAddress);
    setShowMap(true);
    setUrlSuccess(true);
    setMapsUrl('');
    if (onChange) {
      onChange(updatedAddress);
    }
  };

  // Build a context-aware search query from the current address state
  const buildSearchQuery = (input, field) => {
    const parts = [input];
    // Add context from other fields to improve accuracy
    if (field !== 'city' && address.city) parts.push(address.city);
    if (field !== 'state' && address.state) parts.push(address.state);
    return parts.join(', ');
  };

  // Fetch autocomplete suggestions from Mapbox Geocoding API
  const fetchSuggestions = async (input, field) => {
    if (!input || input.length < 2 || !MAPBOX_TOKEN) {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      return;
    }

    const countryCode = getCountryCode(address.country);
    const searchQuery = buildSearchQuery(input, field);

    try {
      const url = `${MAPBOX_GEOCODING_URL}/${encodeURIComponent(
        searchQuery
      )}.json?access_token=${MAPBOX_TOKEN}&country=${countryCode}&limit=5&types=address,poi,place,locality,neighborhood`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const results = (data.features || []).map((feature) => ({
        id: feature.id,
        place_name: feature.place_name,
        text: feature.text,
        center: feature.center,
        context: feature.context || [],
        place_type: feature.place_type || [],
        address: feature.address || '',
      }));
      setAutocompleteResults(results);
      setShowAutocomplete(results.length > 0);
    } catch (error) {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
    }
  };

  // Extract address components from Mapbox feature
  const extractAddressParts = (result) => {
    const parts = {
      street: '',
      city: '',
      state: '',
      country: address.country || 'Nigeria',
    };

    if (result.address) {
      parts.street = `${result.address} ${result.text}`.trim();
    } else if (result.place_type?.includes('address') || result.place_type?.includes('poi')) {
      parts.street = result.text;
    }

    for (const ctx of result.context || []) {
      const id = ctx.id || '';
      if (id.includes('place') || id.includes('locality') || id.includes('neighborhood')) {
        if (!parts.city) parts.city = ctx.text;
      }
      if (id.includes('region')) {
        parts.state = ctx.text;
      }
      if (id.includes('country')) {
        parts.country = ctx.text;
      }
    }

    if (!parts.street && (result.place_type?.includes('place') || result.place_type?.includes('locality'))) {
      parts.city = parts.city || result.text;
    }

    return parts;
  };

  // Handle place selection from Mapbox
  const handlePlaceSelect = (result) => {
    setShowAutocomplete(false);
    const parts = extractAddressParts(result);
    const existing = address;

    const updatedAddress = {
      street: parts.street || existing.street || '',
      city: parts.city || existing.city || '',
      state: parts.state || existing.state || '',
      country: parts.country || existing.country || 'Nigeria',
      lat: result.center ? result.center[1] : null,
      lng: result.center ? result.center[0] : null,
      displayName: result.place_name || '',
      verified: true,
    };
    setAddress(updatedAddress);
    setShowMap(true);
    if (onChange) {
      onChange(updatedAddress);
    }
  };

  // Handle map pin drag
  const handleMapCoordsChange = (newCoords) => {
    const updated = { ...address, lat: newCoords.lat, lng: newCoords.lng, verified: true };
    setAddress(updated);
    if (onChange) {
      onChange(updated);
    }
  };

  // Handle manual field change (clears verified status and coordinates)
  const handleChange = (field, val) => {
    const updated = { ...address, [field]: val, verified: false, lat: null, lng: null, displayName: null };
    setAddress(updated);
    if (onChange) {
      onChange(updated);
    }
  };

  // Handle input with autocomplete (debounced)
  const handleInputChange = (field, val) => {
    handleChange(field, val);
    setActiveField(field);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!readOnly && val.length >= 2) {
      setIsLoading(true);
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(val, field);
        setIsLoading(false);
      }, 350);
    } else {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      setIsLoading(false);
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
    'Yobe', 'Zamfara',
  ];

  const isNigeria = (address.country || '').toLowerCase() === 'nigeria';

  const renderAutocomplete = () => {
    if (!showAutocomplete || autocompleteResults.length === 0) return null;
    return (
      <div
        className="absolute w-full mt-1 bg-white border-2 border-emerald-500 rounded-lg shadow-2xl max-h-64 overflow-y-auto"
        style={{ zIndex: 9999 }}
      >
        <div className="px-3 py-2 text-xs text-gray-500 bg-emerald-50 border-b border-emerald-200">
          {'Address Suggestions (Mapbox)'}
        </div>
        {autocompleteResults.map((result) => (
          <button
            key={result.id}
            type="button"
            onClick={() => handlePlaceSelect(result)}
            className="w-full px-3 py-3 text-left hover:bg-emerald-100 focus:bg-emerald-100 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0"
          >
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 mt-0.5">{'📍'}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900 font-semibold">{result.text}</div>
                <div className="text-xs text-gray-600 mt-0.5">{result.place_name}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Country Dropdown */}
      <div>
        <select
          value={address.country}
          onChange={(e) => handleChange('country', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          disabled={readOnly}
          required={required}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Street Address with Autocomplete */}
      <div className="relative" ref={autocompleteRef}>
        <input
          type="text"
          value={address.street}
          onChange={(e) => handleInputChange('street', e.target.value)}
          onFocus={() => setActiveField('street')}
          placeholder="Start typing street address... (e.g., 15 Marina Street)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          disabled={readOnly}
          required={required}
        />
        {activeField === 'street' && renderAutocomplete()}
      </div>

      {/* City with Autocomplete */}
      <div className="relative">
        <input
          type="text"
          value={address.city}
          onChange={(e) => handleInputChange('city', e.target.value)}
          onFocus={() => setActiveField('city')}
          placeholder="City (e.g., Lagos Island)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          disabled={readOnly}
          required={required}
        />
        {activeField === 'city' && renderAutocomplete()}
      </div>

      {/* State — dropdown for Nigeria, text input for other countries */}
      <div>
        {isNigeria ? (
          <select
            value={address.state}
            onChange={(e) => handleChange('state', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            disabled={readOnly}
            required={required}
          >
            <option value="">Select State</option>
            {nigerianStates.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={address.state}
            onChange={(e) => handleChange('state', e.target.value)}
            placeholder="State / Province / Region"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            disabled={readOnly}
            required={required}
          />
        )}
      </div>

      {/* Full Address Preview with verification status */}
      {address.street && address.city && address.state && (
        <div
          className={`text-xs p-3 rounded-lg border ${
            address.verified ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-start gap-2">
            <span className={address.verified ? 'text-emerald-600' : 'text-amber-600'}>
              {address.verified ? '✅' : '⚠️'}
            </span>
            <div className="flex-1">
              <strong className={address.verified ? 'text-emerald-900' : 'text-amber-900'}>
                {address.verified ? 'Verified Address' : 'Unverified Address'}
              </strong>
              <div className="mt-1 text-gray-700">
                {address.street}, {address.city}, {address.state}, {address.country}
              </div>
              {address.verified && address.displayName && (
                <div className="mt-1 text-gray-500 text-[10px]">Map: {address.displayName}</div>
              )}
              {!address.verified && (
                <div className="mt-1 text-amber-700 text-[10px]">
                  Select from suggestions or use the map pin for accurate distance calculation
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Map Pin Picker */}
      {!readOnly && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <span>{showMap ? 'Hide Map' : 'Confirm Location on Map'}</span>
            {address.lat && address.lng && !showMap && (
              <span className="text-emerald-600">{'✓'}</span>
            )}
          </button>
          {showMap ? (
            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">
                Search for your area, then drag the pin (or tap the map) to your exact location.
                This ensures accurate delivery distance.
              </p>
              <MapPicker
                initialCoords={
                  address.lat && address.lng ? { lat: address.lat, lng: address.lng } : null
                }
                onCoordsChange={handleMapCoordsChange}
                countryCode={getCountryCode(address.country)}
                height={280}
              />
            </div>
          ) : null}
        </div>
      )}

      {/* Google Maps URL paste */}
      {!readOnly && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={mapsUrl}
              onChange={(e) => { setMapsUrl(e.target.value); setUrlError(''); setUrlSuccess(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleMapsUrlSubmit(); } }}
              placeholder="Or paste a Google Maps share link here..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleMapsUrlSubmit}
              className="px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
            >
              Use Link
            </button>
          </div>
          {urlError && (
            <p className="text-xs text-red-600">{urlError}</p>
          )}
          {urlSuccess && (
            <p className="text-xs text-emerald-600">Location extracted from Google Maps link.</p>
          )}
          <p className="text-[10px] text-gray-400">
            In Google Maps, tap the location &gt; Share &gt; Copy link, then paste it here.
          </p>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-600"></div>
          <span>Loading address suggestions...</span>
        </div>
      )}
    </div>
  );
};

export default AddressInput;

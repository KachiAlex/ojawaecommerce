// This file is kept for backward compatibility.
// All Google Maps functionality has been replaced with free OpenStreetMap Nominatim.
// See geoService.js for the implementation.
export {
  geoService as googleMapsService,
  geoService as default,
  GeoError as GoogleMapsError,
  GeoApiKeyError as GoogleMapsApiKeyError,
  GeoNetworkError as GoogleMapsNetworkError,
  GeoError as GoogleMapsPermissionError
} from './geoService';


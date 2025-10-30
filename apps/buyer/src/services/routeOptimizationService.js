import axios from 'axios';

const getBaseUrl = () => {
  // Prefer explicit Functions base URL if provided (useful for emulators/custom domains)
  const configured = import.meta.env.VITE_FUNCTIONS_BASE_URL;
  if (configured) return configured.replace(/\/$/, '');
  // Default to Firebase default region URL
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ojawa-ecommerce';
  return `https://us-central1-${projectId}.cloudfunctions.net`;
};

const baseUrl = getBaseUrl();

const routeOptimizationService = {
  async optimizeRoute({ origin, destination, waypoints = [], optimize = true, travelMode = 'DRIVE', routingPreference = 'TRAFFIC_AWARE' }) {
    const url = `${baseUrl}/optimizeRoute`;
    const { data } = await axios.post(url, {
      origin,
      destination,
      waypoints,
      optimize,
      travelMode,
      routingPreference
    });
    return data;
  }
};

export default routeOptimizationService;


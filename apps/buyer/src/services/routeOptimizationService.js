import axios from 'axios';
import { buildApiUrl } from '../utils/apiClient';

const routeOptimizationService = {
  async optimizeRoute({ origin, destination, waypoints = [], optimize = true, travelMode = 'DRIVE', routingPreference = 'TRAFFIC_AWARE' }) {
    const url = buildApiUrl('/optimizeRoute');
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


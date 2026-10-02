import React, { useState, useEffect, useRef } from 'react';
import geoService from '../services/geoService';

const RouteVisualization = ({ 
  pickupLocation, 
  deliveryLocation, 
  routeAnalysis = null,
  height = '400px',
  showDetails = true,
  // Optional: intermediate stops for multi-stop routes
  intermediateStops = [],
  // Optional: use backend optimization (Google Routes API) for best stop order/ETA
  useOptimization = false
}) => {
  const [map, setMap] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const routePolylineRef = useRef(null);
  const [optimizedInfo, setOptimizedInfo] = useState(null);

  // Initialize map using OpenStreetMap embed (free, no API key)
  useEffect(() => {
    const initializeMap = async () => {
      if (!mapRef.current || !pickupLocation || !deliveryLocation) return;

      try {
        setIsLoading(true);
        setError(null);

        // Build OpenStreetMap embed URL with route markers
        const from = encodeURIComponent(pickupLocation);
        const to = encodeURIComponent(deliveryLocation);
        const bbox = '6.3,3.2,6.7,3.6'; // Lagos area default
        const markerFrom = encodeURIComponent(pickupLocation);
        const markerTo = encodeURIComponent(deliveryLocation);

        // Use OpenStreetMap embed with markers
        const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=6.5244,3.3792`;

        // Create iframe for the map
        if (mapRef.current) {
          mapRef.current.innerHTML = `<iframe src="${embedUrl}" style="width:100%;height:100%;border:0;" loading="lazy"></iframe>`;
        }

        setMap(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing map:', error);
        setError('Failed to load map');
        setIsLoading(false);
      }
    };

    initializeMap();
  }, [pickupLocation, deliveryLocation, intermediateStops, useOptimization]);

  // Optional: Use OSRM to compute optimized route info
  useEffect(() => {
    const runOptimization = async () => {
      if (!useOptimization || !map || !pickupLocation || !deliveryLocation) return;
      if (!intermediateStops || intermediateStops.length === 0) return;
      try {
        setIsLoading(true);
        setError(null);

        const route = await geoService.calculateRoute(pickupLocation, deliveryLocation);
        if (route) {
          setOptimizedInfo({
            distanceMeters: route.distance.value,
            duration: `${Math.round(route.duration.value / 60)} min`
          });
        }
      } catch (e) {
        console.error('Route optimization failed:', e);
        setError('Failed to optimize route');
      } finally {
        setIsLoading(false);
      }
    };

    runOptimization();
  }, [useOptimization, intermediateStops, pickupLocation, deliveryLocation, map]);

  // Format distance for display
  const formatDistance = (distance) => {
    if (!distance) return 'N/A';
    return typeof distance === 'object' ? distance.text : `${distance} km`;
  };

  // Format duration for display
  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    return typeof duration === 'object' ? duration.text : `${duration} min`;
  };

  // Get route type display
  const getRouteTypeDisplay = (routeType) => {
    const types = {
      'intracity_short': 'Intra-city (Short)',
      'intracity_long': 'Intra-city (Long)',
      'intracity_extended': 'Intra-city (Extended)',
      'intercity': 'Inter-city',
      'interstate': 'Inter-state'
    };
    return types[routeType] || 'Unknown';
  };

  // Get route type color
  const getRouteTypeColor = (routeType) => {
    const colors = {
      'intracity_short': 'text-green-600 bg-green-100',
      'intracity_long': 'text-blue-600 bg-blue-100',
      'intracity_extended': 'text-purple-600 bg-purple-100',
      'intercity': 'text-orange-600 bg-orange-100',
      'interstate': 'text-red-600 bg-red-100'
    };
    return colors[routeType] || 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div className="relative">
        <div 
          ref={mapRef}
          style={{ height }}
          className="w-full rounded-lg border border-gray-300 bg-gray-100"
        />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading route...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
            <div className="text-center">
              <div className="text-red-500 text-2xl mb-2">⚠️</div>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Route Details */}
      {showDetails && (routeAnalysis || optimizedInfo) && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Route Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Route Type */}
            <div className="text-center">
              <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getRouteTypeColor(routeAnalysis?.routeType)}`}>
                {routeAnalysis ? getRouteTypeDisplay(routeAnalysis.routeType) : 'Optimized Route'}
              </div>
              <p className="text-xs text-gray-500 mt-1">Route Type</p>
            </div>

            {/* Distance */}
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {optimizedInfo?.distanceMeters ? `${(optimizedInfo.distanceMeters/1000).toFixed(1)} km` : formatDistance(routeAnalysis?.distance)}
              </div>
              <p className="text-xs text-gray-500">Distance</p>
            </div>

            {/* Duration */}
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {optimizedInfo?.duration ? optimizedInfo.duration.replace('s',' sec') : formatDuration(routeAnalysis?.duration)}
              </div>
              <p className="text-xs text-gray-500">Estimated Time</p>
            </div>

            {/* City Status */}
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900">
                {routeAnalysis.isSameCity ? 'Same City' : 'Different City'}
              </div>
              <p className="text-xs text-gray-500">Location</p>
            </div>
          </div>

          {/* Additional Details */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Pickup:</span>
                <span className="ml-2 text-gray-600">{pickupLocation}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Delivery:</span>
                <span className="ml-2 text-gray-600">{deliveryLocation}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fallback when no route analysis */}
      {showDetails && !routeAnalysis && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-center text-gray-500">
            <div className="text-2xl mb-2">🗺️</div>
            <p className="text-sm">Route details will appear once locations are selected</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteVisualization;

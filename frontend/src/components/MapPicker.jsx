import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const MapPicker = ({ initialCoords, onCoordsChange, countryCode = 'ng', height = 300 }) => {
  const [coords, setCoords] = useState(initialCoords || { lat: 6.5244, lng: 3.3792 });
  const [mapReady, setMapReady] = useState(false);

  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [coords.lng, coords.lat],
      zoom: 14,
    });

    mapRef.current.on('load', () => {
      setMapReady(true);
    });

    // Add draggable marker
    markerRef.current = new mapboxgl.Marker({ draggable: true })
      .setLngLat([coords.lng, coords.lat])
      .addTo(mapRef.current);

    markerRef.current.on('dragend', () => {
      const lngLat = markerRef.current.getLngLat();
      const newCoords = { lat: lngLat.lat, lng: lngLat.lng };
      setCoords(newCoords);
      onCoordsChange?.(newCoords);
    });

    // Click on map to move marker
    mapRef.current.on('click', (e) => {
      const newCoords = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      markerRef.current.setLngLat([newCoords.lng, newCoords.lat]);
      setCoords(newCoords);
      onCoordsChange?.(newCoords);
    });

    // Add geocoder search control
    const geocoder = new MapboxGeocoder({
      accessToken: MAPBOX_TOKEN,
      mapboxgl: mapboxgl,
      placeholder: 'Search for your area (e.g., Agege, Lagos)',
      countries: countryCode,
      marker: false,
    });

    geocoder.on('result', (e) => {
      const result = e.result;
      const newCoords = { lat: result.center[1], lng: result.center[0] };
      markerRef.current.setLngLat([newCoords.lng, newCoords.lat]);
      mapRef.current.flyTo({ center: [newCoords.lng, newCoords.lat], zoom: 16 });
      setCoords(newCoords);
      onCoordsChange?.(newCoords);
    });

    mapRef.current.addControl(geocoder, 'top-left');

    // Fix rendering in case of dynamic mount
    setTimeout(() => mapRef.current?.resize(), 100);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update marker when initialCoords changes externally
  useEffect(() => {
    if (mapReady && markerRef.current && initialCoords) {
      markerRef.current.setLngLat([initialCoords.lng, initialCoords.lat]);
      mapRef.current?.flyTo({ center: [initialCoords.lng, initialCoords.lat], zoom: 14 });
    }
  }, [initialCoords, mapReady]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
        Mapbox token not configured. Set VITE_MAPBOX_TOKEN in your .env file.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={mapContainer}
        style={{ height: `${height}px`, width: '100%' }}
        className="rounded-lg border border-gray-300 overflow-hidden"
      />
      <div className="text-xs text-gray-500 flex items-center gap-2">
        <span className="text-emerald-600">{'📌'}</span>
        <span>
          Lat: {coords.lat.toFixed(5)}, Lng: {coords.lng.toFixed(5)}
        </span>
        <span className="text-gray-400">{' — '}Drag the pin or click the map to adjust</span>
      </div>
    </div>
  );
};

export default MapPicker;

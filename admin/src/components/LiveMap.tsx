import { useMemo, useEffect, useRef, useCallback } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Circle,
} from '@react-google-maps/api';
import type { EmployeeMap } from '../types';

const KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

const darkStyle: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#16202f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7d8ba6' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0e1726' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#26344f' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c1422' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const isValidCoord = (c: any): boolean => {
  if (!c) return false;
  const lat = Number(c.latitude);
  const lng = Number(c.longitude);
  return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
};

export default function LiveMap({ data, live }: { data: EmployeeMap | null; live?: { latitude: number; longitude: number } | null }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'gmaps',
    googleMapsApiKey: KEY,
  });

  const current = useMemo(() => {
    if (isValidCoord(live)) return live;
    if (isValidCoord(data?.current)) return data!.current;
    
    const route = data?.route || [];
    const last = route.length > 0 ? route[route.length - 1] : null;
    if (isValidCoord(last)) return last;
    
    return null;
  }, [data, live]);

  const center = useMemo(() => {
    if (current) return { lat: Number(current.latitude), lng: Number(current.longitude) };
    if (isValidCoord(data?.office)) return { lat: Number(data!.office.latitude), lng: Number(data!.office.longitude) };
    return { lat: 20.5937, lng: 78.9629 };
  }, [current, data]);

  const path = useMemo(() => {
    return (data?.route || [])
      .filter(isValidCoord)
      .map((p) => ({ lat: Number(p.latitude), lng: Number(p.longitude) }));
  }, [data]);

  const polylineRef = useRef<google.maps.Polyline | null>(null);

  // BLAST SHIELD 1: Catch initialization errors on broken maps
  const onMapLoad = useCallback((map: google.maps.Map) => {
    try {
      if (window.google && window.google.maps) {
        const rawPolyline = new window.google.maps.Polyline({
          strokeColor: '#f4a340',
          strokeOpacity: 0.9,
          strokeWeight: 3,
          map: map, 
        });
        polylineRef.current = rawPolyline;
      }
    } catch (err) {
      console.warn("Safely caught map initialization error.", err);
    }
  }, []);

  const onMapUnmount = useCallback(() => {
    try {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    } catch (err) {}
  }, []);

  // BLAST SHIELD 2: Catch drawing errors when switching users
  useEffect(() => {
    try {
      if (polylineRef.current) {
        if (path.length > 1) {
          polylineRef.current.setPath(path);
        } else {
          polylineRef.current.setPath([]); 
        }
      }
    } catch (err) {
      console.warn("Safely caught path drawing error.", err);
    }
  }, [path]);

  const circleOptions = useMemo(() => ({
    strokeColor: '#36c2a6', strokeOpacity: 0.7, strokeWeight: 1.5, fillColor: '#36c2a6', fillOpacity: 0.08
  }), []);

  if (!KEY) {
    return <div style={{ color: '#7d8ba6', padding: '20px', textAlign: 'center', backgroundColor: '#0e1726', height: '100%', minHeight: '400px' }}>Set VITE_GOOGLE_MAPS_API_KEY</div>;
  }
  if (loadError) return <div style={{ color: '#ff6b6b', padding: '20px', textAlign: 'center', backgroundColor: '#0e1726', height: '100%', minHeight: '400px' }}>Map failed to load. Check API Key.</div>;
  if (!isLoaded) return <div style={{ color: '#7d8ba6', padding: '20px', textAlign: 'center', backgroundColor: '#0e1726', height: '100%', minHeight: '400px' }}>Loading map…</div>;

  return (
    <GoogleMap
      mapContainerClassName="map-canvas"
      mapContainerStyle={{ width: '100%', height: '100%', minHeight: '400px', display: 'block' }}
      center={center}
      zoom={14}
      onLoad={onMapLoad}
      onUnmount={onMapUnmount}
      options={{
        styles: darkStyle,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      }}
    >
      {/* Office geofence */}
      {isValidCoord(data?.office) && (
        <>
          <Circle
            center={{ lat: Number(data!.office.latitude), lng: Number(data!.office.longitude) }}
            radius={Number(data!.office.radius || 100)}
            options={circleOptions}
          />
          <Marker
            position={{ lat: Number(data!.office.latitude), lng: Number(data!.office.longitude) }}
            title={data!.office.name || 'Office'}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: '#36c2a6',
              fillOpacity: 1,
              strokeColor: '#0e1726',
              strokeWeight: 2,
            }}
          />
        </>
      )}

      {/* Stop markers */}
      {(data?.stops || []).filter(isValidCoord).map((s) => (
        <Marker
          key={s._id || Math.random().toString()}
          position={{ lat: Number(s.latitude), lng: Number(s.longitude) }}
          title={`Stopped ${Math.round(s.durationMinutes || 0)} min`}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: '#5b9bd5',
            fillOpacity: 0.9,
            strokeColor: '#0e1726',
            strokeWeight: 1.5,
          }}
        />
      ))}

      {/* Current position */}
      {current && (
        <Marker
          position={{ lat: Number(current.latitude), lng: Number(current.longitude) }}
          title="Current position"
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#f4a340',
            fillOpacity: 1,
            strokeColor: '#1b1205',
            strokeWeight: 2,
          }}
        />
      )}
    </GoogleMap>
  );
}
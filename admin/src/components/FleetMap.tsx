import { useEffect, useRef } from 'react';
import type { EmployeeCard } from '../types';

const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyD2CF3PlGBd0tQhusHwX3ngfPaad0pmJ_Q';

// Office location (same constant the per-employee LiveMap uses).
const COMPANY = { lat: 23.037760027900347, lng: 72.50345096369577 };

const darkStyle: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#16202f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7d8ba6' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0e1726' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#26344f' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c1422' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const isPlottable = (e: EmployeeCard): boolean => {
  const loc = e.currentLocation;
  if (!loc) return false;
  const { latitude: lat, longitude: lng } = loc;
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
};

const statusColor = (e: EmployeeCard): string => {
  if (!e.isOnline) return '#64748b'; // offline grey
  if (e.locationStatus === 'INSIDE_OFFICE') return '#36c2a6'; // at office
  if (e.currentSpeed >= 3) return '#f4a340'; // moving
  return '#5b9bd5'; // in field, idle
};

/**
 * Live fleet map: every employee with a known location is plotted as a pin,
 * colour-coded by status. Clicking a pin selects that employee (the dashboard
 * opens their detail drawer). Reuses the single shared Google Maps script tag.
 */
export default function FleetMap({
  employees,
  selectedId,
  onSelect,
}: {
  employees: EmployeeCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markers = useRef<{ [id: string]: google.maps.Marker }>({});
  const fitted = useRef(false);
  // Keep the latest onSelect without re-binding marker listeners.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // ── Init map (shares the '#google-maps-script' tag with LiveMap) ──
  useEffect(() => {
    const initMap = () => {
      if (mapRef.current && window.google && window.google.maps && !mapInstance.current) {
        mapInstance.current = new window.google.maps.Map(mapRef.current, {
          center: COMPANY,
          zoom: 13,
          styles: darkStyle,
          disableDefaultUI: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          gestureHandling: 'greedy',
        });

        new window.google.maps.Marker({
          position: COMPANY,
          map: mapInstance.current,
          title: 'Office',
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: '#e11d48',
            fillOpacity: 1,
            strokeColor: '#0e1726',
            strokeWeight: 2,
          },
        });
        new window.google.maps.Circle({
          map: mapInstance.current,
          center: COMPANY,
          radius: 500,
          strokeColor: '#e11d48',
          strokeOpacity: 0.35,
          strokeWeight: 1.5,
          fillColor: '#e11d48',
          fillOpacity: 0.04,
          clickable: false,
        });
      }
    };

    if (window.google && window.google.maps) {
      initMap();
    } else {
      const scriptId = 'google-maps-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}`;
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
      script.addEventListener('load', initMap);
      return () => script?.removeEventListener('load', initMap);
    }
  }, []);

  // ── Render / update employee pins ──
  useEffect(() => {
    if (!mapInstance.current || !window.google) return;
    const g = window.google;
    const bounds = new g.maps.LatLngBounds();
    bounds.extend(COMPANY);
    const seen = new Set<string>();
    let hasPin = false;

    employees.forEach((e) => {
      if (!isPlottable(e)) return;
      const pos = { lat: e.currentLocation!.latitude, lng: e.currentLocation!.longitude };
      seen.add(e._id);
      hasPin = true;
      bounds.extend(pos);

      const selected = e._id === selectedId;
      const icon: google.maps.Symbol = {
        path: g.maps.SymbolPath.CIRCLE,
        scale: selected ? 11 : 8,
        fillColor: statusColor(e),
        fillOpacity: 1,
        strokeColor: selected ? '#ffffff' : '#0e1726',
        strokeWeight: selected ? 3 : 2,
      };

      const existing = markers.current[e._id];
      if (existing) {
        existing.setPosition(pos);
        existing.setIcon(icon);
        existing.setTitle(e.name);
      } else {
        const m = new g.maps.Marker({ position: pos, map: mapInstance.current!, title: e.name, icon });
        m.addListener('click', () => onSelectRef.current(e._id));
        markers.current[e._id] = m;
      }
    });

    // Drop markers for employees that are gone / no longer plottable.
    Object.keys(markers.current).forEach((id) => {
      if (!seen.has(id)) {
        markers.current[id].setMap(null);
        delete markers.current[id];
      }
    });

    // Fit to all pins once, on first data arrival (don't fight the user's panning).
    if (hasPin && !fitted.current) {
      mapInstance.current.fitBounds(bounds);
      fitted.current = true;
      const listener = g.maps.event.addListener(mapInstance.current, 'idle', () => {
        if (mapInstance.current!.getZoom()! > 16) mapInstance.current!.setZoom(16);
        g.maps.event.removeListener(listener);
      });
    }
  }, [employees, selectedId]);

  return (
    <div className="fleet-map">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

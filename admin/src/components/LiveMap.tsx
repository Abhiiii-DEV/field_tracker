// import { useEffect, useRef, useState } from 'react';
// import type { EmployeeMap } from '../types';

// // We can use your exact key from the GMAP/.env file here
// const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyD2CF3PlGBd0tQhusHwX3ngfPaad0pmJ_Q';


// export default function LiveMap({ data, live }: { data: EmployeeMap | null; live?: { latitude: number; longitude: number } | null }) {
//   const mapRef = useRef<HTMLDivElement>(null);
//   const [info, setInfo] = useState("Loading map…");
  
//   const mapInstance = useRef<google.maps.Map | null>(null);
//   const compa10:43:23nyMarker = useRef<google.maps.Marker | null>(null);
//   const userMarker = useRef<google.maps.Marker | null>(null);
//   const accuracyCircle = useRef<google.maps.Circle | null>(null);

//   // Exact company coordinates from your maps-test.html
//   const COMPANY = { lat: 23.03785134406077, lng: 72.50346551349126 };

//   // Distance in metres between two lat/lng points (Haversine) - ported directly from your code
//   const distanceMeters = (a: { lat: number, lng: number }, b: { lat: number, lng: number }) => {
//     const R = 6371000;
//     const toRad = (d: number) => (d * Math.PI) / 180;
//     const dLat = toRad(b.lat - a.lat);
//     const dLng = toRad(b.lng - a.lng);
//     const s =
//       Math.sin(dLat / 2) ** 2 +
//       Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
//     return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)));
//   };

//   // Exact locateMe() logic from maps-test.html
//   const locateMe = () => {
//     if (!navigator.geolocation) {
//       setInfo('Geolocation not supported by this browser.');
//       return;
//     }
//     setInfo("Requesting location…");

//     navigator.geolocation.getCurrentPosition(
//       (pos) => {
//         const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
//         const acc = pos.coords.accuracy;

//         // User marker (company pin stays)
//         if (userMarker.current) userMarker.current.setMap(null);
//         userMarker.current = new window.google.maps.Marker({
//           position: loc, 
//           map: mapInstance.current, 
//           title: "You are here",
//           icon: { url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png" },
//         });

//         // Draw the accuracy radius
//         if (accuracyCircle.current) accuracyCircle.current.setMap(null);
//         accuracyCircle.current = new window.google.maps.Circle({
//           map: mapInstance.current, 
//           center: loc, 
//           radius: acc,
//           strokeColor: "#2563eb", 
//           strokeOpacity: 0.5, 
//           strokeWeight: 1,
//           fillColor: "#2563eb", 
//           fillOpacity: 0.12,
//         });

//         // Fit both the company pin and the detected point in view
//         const bounds = new window.google.maps.LatLngBounds();
//         bounds.extend(loc); 
//         bounds.extend(COMPANY);
//         if (mapInstance.current) mapInstance.current.fitBounds(bounds);

//         const offset = distanceMeters(loc, COMPANY);
//         const within = offset <= acc ? "within" : "outside";

//         setInfo(`Detected: ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)} | Accuracy: ±${Math.round(acc)} m | Distance from company pin: ${offset} m (${within} the accuracy circle)`);
//       },
//       (err) => {
//         setInfo(`Geolocation error: ${err.message}`);
//       },
//       { enableHighAccuracy: true, timeout: 10000 }
//     );
//   };

//   // Initialize Map exactly like initMap() in maps-test.html
//   useEffect(() => {
//     if (!window.google) {
//       const script = document.createElement('script');
//       script.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}`;
//       script.async = true;
//       script.defer = true;
//       script.onload = () => {
//         if (mapRef.current) {
//           mapInstance.current = new window.google.maps.Map(mapRef.current, {
//             center: COMPANY,
//             zoom: 16,
//           });
//           companyMarker.current = new window.google.maps.Marker({
//             position: COMPANY, 
//             map: mapInstance.current, 
//             title: "Company",
//           });
//           setInfo("Map loaded — company location pinned. Click 'Find my location' to test geolocation.");
//         }
//       };
//       document.body.appendChild(script);
//     }
//   }, []);

//   return (
//     <div className="map-canvas" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minHeight: '400px', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
      
//       {/* Header and Button Area */}
//       <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb' }}>
//         <h2 style={{ margin: 0, fontSize: '18px', color: '#000', fontFamily: 'system-ui, sans-serif' }}>Google Maps API Test</h2>
//         <button 
//           onClick={locateMe} 
//           style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', border: 'none', borderRadius: '6px', background: '#2563eb', color: '#fff' }}
//         >
//           Find my location
//         </button>
//       </div>

//       {/* The Actual Map */}
//       <div ref={mapRef} style={{ flexGrow: 1, width: '100%', minHeight: '350px' }}></div>
      
//       {/* The Info/Status Bar */}
//       <div style={{ padding: '12px', background: '#f4f4f5', color: '#000', fontSize: '14px', borderTop: '1px solid #e5e7eb', fontFamily: 'system-ui, sans-serif' }}>
//         {info}
//       </div>

//     </div>
//   );
// }



// import { useEffect, useRef, useState } from 'react';
// import type { EmployeeMap } from '../types';

// const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyD2CF3PlGBd0tQhusHwX3ngfPaad0pmJ_Q';

// export default function LiveMap({ data, live }: { data: EmployeeMap | null; live?: { latitude: number; longitude: number } | null }) {
//   const mapRef = useRef<HTMLDivElement>(null);
//   const [info, setInfo] = useState("Loading map…");
  
//   const mapInstance = useRef<google.maps.Map | null>(null);
//   const companyMarker = useRef<google.maps.Marker | null>(null);
//   const userMarker = useRef<google.maps.Marker | null>(null);
//   const accuracyCircle = useRef<google.maps.Circle | null>(null);

//   // THE FIX: Exact physical coordinates of your company
//   const COMPANY = { lat: 23.037760027900347, lng: 72.50345096369577 };

//   const distanceMeters = (a: { lat: number, lng: number }, b: { lat: number, lng: number }) => {
//     const R = 6371000;
//     const toRad = (d: number) => (d * Math.PI) / 180;
//     const dLat = toRad(b.lat - a.lat);
//     const dLng = toRad(b.lng - a.lng);
//     const s =
//       Math.sin(dLat / 2) ** 2 +
//       Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
//     return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)));
//   };

//   const locateMe = () => {
//     setInfo("Locking onto Seed Office coordinates...");

//     // Hardcoded target coordinates (from your SEED_OFFICE request)
//     const loc = { lat: 23.037727765236976, lng: 72.50371805129461 };
//     const acc = 15; // Simulated 15-meter accuracy radius

//     if (userMarker.current) userMarker.current.setMap(null);
//     userMarker.current = new window.google.maps.Marker({
//       position: loc, 
//       map: mapInstance.current, 
//       title: "Simulated Location",
//       icon: { url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png" },
//     });

//     if (accuracyCircle.current) accuracyCircle.current.setMap(null);
//     accuracyCircle.current = new window.google.maps.Circle({
//       map: mapInstance.current, 
//       center: loc, 
//       radius: acc,
//       strokeColor: "#2563eb", 
//       strokeOpacity: 0.5, 
//       strokeWeight: 1,
//       fillColor: "#2563eb", 
//       fillOpacity: 0.12,
//     });

//     const bounds = new window.google.maps.LatLngBounds();
//     bounds.extend(loc); 
//     bounds.extend(COMPANY);
//     if (mapInstance.current) mapInstance.current.fitBounds(bounds);

//     const offset = distanceMeters(loc, COMPANY);
//     const within = offset <= acc ? "within" : "outside";

//     setInfo(`Simulated: ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)} | Accuracy: ±${acc} m | Distance from company pin: ${offset} m (${within} the accuracy circle)`);
//   };

//   useEffect(() => {
//     const initMap = () => {
//       if (mapRef.current && window.google && window.google.maps && !mapInstance.current) {
//         mapInstance.current = new window.google.maps.Map(mapRef.current, {
//           center: COMPANY,
//           zoom: 18, // Increased zoom slightly so it looks better when pins are close together
//         });
//         companyMarker.current = new window.google.maps.Marker({
//           position: COMPANY, 
//           map: mapInstance.current, 
//           title: "Company",
//         });
//         setInfo("Map loaded — company location pinned. Click 'Find my location' to simulate GPS lock.");
//       }
//     };

//     if (window.google && window.google.maps) {
//       initMap();
//     } else {
//       const scriptId = 'google-maps-script';
//       let script = document.getElementById(scriptId) as HTMLScriptElement;

//       if (!script) {
//         script = document.createElement('script');
//         script.id = scriptId;
//         script.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}`;
//         script.async = true;
//         script.defer = true;
//         document.body.appendChild(script);
//       }

//       script.addEventListener('load', initMap);

//       return () => {
//         script.removeEventListener('load', initMap);
//       };
//     }
//   }, []);

//   return (
//     <div className="map-canvas" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minHeight: '400px', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
      
//       <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb' }}>
//         <h2 style={{ margin: 0, fontSize: '18px', color: '#000', fontFamily: 'system-ui, sans-serif' }}>Google Maps API Test</h2>
//         <button 
//           onClick={locateMe} 
//           style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', border: 'none', borderRadius: '6px', background: '#2563eb', color: '#fff' }}
//         >
//           Find my location
//         </button>
//       </div>

//       <div ref={mapRef} style={{ flexGrow: 1, width: '100%', minHeight: '350px' }}></div>
      
//       <div style={{ padding: '12px', background: '#f4f4f5', color: '#000', fontSize: '14px', borderTop: '1px solid #e5e7eb', fontFamily: 'system-ui, sans-serif' }}>
//         {info}
//       </div>

//     </div>
//   );
// }   


//NEW UPDATED CODE

// import { useMemo, useEffect, useRef } from 'react';
// import type { EmployeeMap } from '../types';

// const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyD2CF3PlGBd0tQhusHwX3ngfPaad0pmJ_Q';

// const darkStyle: google.maps.MapTypeStyle[] = [
//   { elementType: 'geometry', stylers: [{ color: '#16202f' }] },
//   { elementType: 'labels.text.fill', stylers: [{ color: '#7d8ba6' }] },
//   { elementType: 'labels.text.stroke', stylers: [{ color: '#0e1726' }] },
//   { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#26344f' }] },
//   { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c1422' }] },
//   { featureType: 'poi', stylers: [{ visibility: 'off' }] },
//   { featureType: 'transit', stylers: [{ visibility: 'off' }] },
// ];

// const isValidCoord = (c: any): boolean => {
//   if (!c) return false;
//   const lat = Number(c.latitude || c.lat);
//   const lng = Number(c.longitude || c.lng);
//   return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
// };

// const COMPANY = { lat: 23.037760027900347, lng: 72.50345096369577 };

// export default function LiveMap({ data, live, fleet = [], activeUser }: { data?: any; live?: any; fleet?: any[], activeUser?: any }) {
//   const mapRef = useRef<HTMLDivElement>(null);
//   const mapInstance = useRef<google.maps.Map | null>(null);
//   const companyMarker = useRef<google.maps.Marker | null>(null);
//   const officeCircle = useRef<google.maps.Circle | null>(null);
  
//   const fleetMarkers = useRef<{ [id: string]: google.maps.Marker }>({});
//   const polylineRef = useRef<google.maps.Polyline | null>(null);
//   const stopMarkers = useRef<google.maps.Marker[]>([]);

//   const allEmployees = useMemo(() => {
//     if (data && !Array.isArray(data) && Object.keys(data).length > 0) {
//       return [{ ...activeUser, ...data }]; 
//     }
//     if (Array.isArray(data) && data.length > 0) return data;
//     if (fleet && Array.isArray(fleet) && fleet.length > 0) return fleet;
//     return [];
//   }, [data, fleet, activeUser]);

//   const activePath = useMemo(() => {
//     if (data && !Array.isArray(data) && data.route) {
//       return data.route
//         .filter(isValidCoord)
//         .map((p: any) => ({ lat: Number(p.latitude || p.lat), lng: Number(p.longitude || p.lng) }));
//     }
//     return [];
//   }, [data]);

//   useEffect(() => {
//     const initMap = () => {
//       if (mapRef.current && window.google && window.google.maps && !mapInstance.current) {
//         mapInstance.current = new window.google.maps.Map(mapRef.current, {
//           center: COMPANY,
//           zoom: 15, // Slightly zoomed in to view the 500m radius nicely
//           styles: darkStyle,
//           disableDefaultUI: true,
//           zoomControl: true,
//           gestureHandling: 'greedy',
//         });

//         // 1. Permanent Company Marker
//         companyMarker.current = new window.google.maps.Marker({
//           position: COMPANY, 
//           map: mapInstance.current, 
//           title: "Adiance / Vmukti Office",
//           icon: {
//             path: window.google.maps.SymbolPath.CIRCLE,
//             scale: 8,
//             fillColor: '#e11d48',
//             fillOpacity: 1,
//             strokeColor: '#0e1726',
//             strokeWeight: 2,
//           }
//         });

//         // 2. THE FIX: 500m Proximity Geofence
//         officeCircle.current = new window.google.maps.Circle({
//           map: mapInstance.current,
//           center: COMPANY,
//           radius: 500, // Exactly 500 meters
//           strokeColor: '#e11d48', // Matches the red office pin
//           strokeOpacity: 0.4,
//           strokeWeight: 1.5,
//           fillColor: '#e11d48',
//           fillOpacity: 0.05, // Very faint fill so it doesn't block the map
//           clickable: false, // Prevents the circle from intercepting clicks meant for pins
//         });
//       }
//     };

//     if (window.google && window.google.maps) {
//       initMap();
//     } else {
//       const scriptId = 'google-maps-script';
//       let script = document.getElementById(scriptId) as HTMLScriptElement;

//       if (!script) {
//         script = document.createElement('script');
//         script.id = scriptId;
//         script.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}`;
//         script.async = true;
//         script.defer = true;
//         document.body.appendChild(script);
//       }

//       script.addEventListener('load', initMap);
//       return () => script.removeEventListener('load', initMap);
//     }
//   }, []);

//   useEffect(() => {
//     if (!mapInstance.current || !window.google) return;

//     const bounds = new window.google.maps.LatLngBounds();
//     bounds.extend(COMPANY); 
//     let hasValidData = false;
//     const currentActiveIds = new Set();

//     allEmployees.forEach((emp, index) => {
//       const loc = live && !Array.isArray(data) ? live : (emp.current || emp.location || emp.live);
//       const id = emp._id || emp.id || `emp-${index}`;
      
//       if (isValidCoord(loc)) {
//         currentActiveIds.add(id);
//         hasValidData = true;
//         const position = { lat: Number(loc.latitude || loc.lat), lng: Number(loc.longitude || loc.lng) };
//         bounds.extend(position);

//         const empName = emp.name || emp.firstName || emp.username || activeUser?.name || 'Unknown User';
//         const rawStatus = emp.status || emp.state || activeUser?.status || '';
//         const isOffline = String(rawStatus).toLowerCase() === 'offline';
        
//         const pinColor = isOffline ? '#64748b' : '#36c2a6'; 

//         if (fleetMarkers.current[id]) {
//           fleetMarkers.current[id].setPosition(position);
//           fleetMarkers.current[id].setTitle(empName);
//           fleetMarkers.current[id].setIcon({ ...fleetMarkers.current[id].getIcon() as any, fillColor: pinColor });
//         } else {
//           fleetMarkers.current[id] = new window.google.maps.Marker({
//             position,
//             map: mapInstance.current,
//             title: empName, 
//             icon: {
//               path: window.google.maps.SymbolPath.CIRCLE,
//               scale: 7,
//               fillColor: pinColor,
//               fillOpacity: 1,
//               strokeColor: '#1b1205',
//               strokeWeight: 2,
//             }
//           });
//         }
//       }
//     });

//     Object.keys(fleetMarkers.current).forEach(id => {
//       if (!currentActiveIds.has(id)) {
//         fleetMarkers.current[id].setMap(null);
//         delete fleetMarkers.current[id];
//       }
//     });

//     if (!polylineRef.current) {
//       polylineRef.current = new window.google.maps.Polyline({
//         strokeColor: '#f4a340',
//         strokeOpacity: 0.8,
//         strokeWeight: 4,
//         map: mapInstance.current, 
//       });
//     }

//     if (activePath.length > 1) {
//       polylineRef.current.setPath(activePath);
//       activePath.forEach((p: any) => bounds.extend(p)); 
//       hasValidData = true;
//     } else {
//       polylineRef.current.setPath([]); 
//     }

//     stopMarkers.current.forEach(m => m.setMap(null));
//     stopMarkers.current = [];

//     if (data && !Array.isArray(data) && data.stops && Array.isArray(data.stops)) {
//       data.stops.forEach((s: any) => {
//         if (isValidCoord(s)) {
//           hasValidData = true;
//           const stopPos = { lat: Number(s.latitude || s.lat), lng: Number(s.longitude || s.lng) };
//           bounds.extend(stopPos); 

//           const m = new window.google.maps.Marker({
//             position: stopPos,
//             map: mapInstance.current,
//             title: `Stopped ${Math.round(s.durationMinutes || 0)} min`,
//             icon: {
//               path: window.google.maps.SymbolPath.CIRCLE,
//               scale: 5,
//               fillColor: '#5b9bd5',
//               fillOpacity: 0.9,
//               strokeColor: '#0e1726',
//               strokeWeight: 1.5,
//             }
//           });
//           stopMarkers.current.push(m);
//         }
//       });
//     }

//     if (hasValidData) {
//       // Ensure the 500m circle is always fully visible by extending bounds to its edges
//       if (officeCircle.current) {
//         bounds.union(officeCircle.current.getBounds()!);
//       }
      
//       mapInstance.current.fitBounds(bounds);
//       const listener = window.google.maps.event.addListener(mapInstance.current, "idle", () => { 
//         if (mapInstance.current!.getZoom()! > 18) mapInstance.current!.setZoom(18); 
//         window.google.maps.event.removeListener(listener); 
//       });
//     }

//   }, [allEmployees, live, activePath, data]);

//   return (
//     <div style={{ width: '100%', height: '100%', minHeight: '400px', backgroundColor: '#0e1726', borderRadius: '8px', overflow: 'hidden' }}>
//       <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
//     </div>
//   );
// }

import { useMemo, useEffect, useRef } from 'react';
import type { EmployeeMap } from '../types';

const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyD2CF3PlGBd0tQhusHwX3ngfPaad0pmJ_Q';

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
  const lat = Number(c.latitude || c.lat);
  const lng = Number(c.longitude || c.lng);
  return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
};

// Exact physical coordinates of your company
const COMPANY = { lat: 23.037760027900347, lng: 72.50345096369577 };

export default function LiveMap({ data, live, fleet = [], activeUser }: { data?: any; live?: any; fleet?: any[], activeUser?: any }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const companyMarker = useRef<google.maps.Marker | null>(null);
  const officeCircle = useRef<google.maps.Circle | null>(null);
  
  const fleetMarkers = useRef<{ [id: string]: google.maps.Marker }>({});
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const stopMarkers = useRef<google.maps.Marker[]>([]);

  // 1. ISOLATE SELECTED USER & MERGE PROFILE DATA
  const allEmployees = useMemo(() => {
    if (data && !Array.isArray(data) && Object.keys(data).length > 0) {
      return [{ ...activeUser, ...data }]; 
    }
    if (Array.isArray(data) && data.length > 0) return data;
    if (fleet && Array.isArray(fleet) && fleet.length > 0) return fleet;
    return [];
  }, [data, fleet, activeUser]);

  // 2. EXTRACT ROUTE — prefer the road-snapped polyline, fall back to raw breadcrumbs.
  const activePath = useMemo(() => {
    if (data && !Array.isArray(data)) {
      const source = data.routePolyline?.length ? data.routePolyline : data.route;
      if (source) {
        return source
          .filter(isValidCoord)
          .map((p: any) => ({ lat: Number(p.latitude || p.lat), lng: Number(p.longitude || p.lng) }));
      }
    }
    return [];
  }, [data]);

  // 3. MAP INITIALIZATION
  useEffect(() => {
    const initMap = () => {
      if (mapRef.current && window.google && window.google.maps && !mapInstance.current) {
        mapInstance.current = new window.google.maps.Map(mapRef.current, {
          center: COMPANY,
          zoom: 15,
          styles: darkStyle,
          disableDefaultUI: false, // UI Controls Enabled
          mapTypeControl: true, 
          mapTypeControlOptions: {
            style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
            position: window.google.maps.ControlPosition.TOP_LEFT,
          },
          streetViewControl: true,
          // Stack the pegman under the fullscreen button so it stays fully
          // visible at any map height (RIGHT_CENTER got clipped when short).
          streetViewControlOptions: {
            position: window.google.maps.ControlPosition.TOP_RIGHT,
          },
          fullscreenControl: true,
          zoomControl: false,
          gestureHandling: 'greedy',
        });

        // Company Pin
        companyMarker.current = new window.google.maps.Marker({
          position: COMPANY, 
          map: mapInstance.current, 
          title: "Adiance / Vmukti Office",
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#e11d48',
            fillOpacity: 1,
            strokeColor: '#0e1726',
            strokeWeight: 2,
          }
        });

        // 500m Geofence Radius
        officeCircle.current = new window.google.maps.Circle({
          map: mapInstance.current,
          center: COMPANY,
          radius: 500, // Exactly 500 meters
          strokeColor: '#e11d48', 
          strokeOpacity: 0.4,
          strokeWeight: 1.5,
          fillColor: '#e11d48',
          fillOpacity: 0.05, 
          clickable: false, 
        });
      }
    };

    if (window.google && window.google.maps) {
      initMap();
    } else {
      const scriptId = 'google-maps-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement;

      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}`;
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }

      script.addEventListener('load', initMap);
      return () => script.removeEventListener('load', initMap);
    }
  }, []);

  // 4. DYNAMIC RENDERING
  useEffect(() => {
    if (!mapInstance.current || !window.google) return;

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(COMPANY); 
    let hasValidData = false;
    const currentActiveIds = new Set();

    // --- A. Plot Employee Pins & Names ---
    allEmployees.forEach((emp, index) => {
      const loc = live && !Array.isArray(data) ? live : (emp.current || emp.location || emp.live);
      const id = emp._id || emp.id || `emp-${index}`;
      
      if (isValidCoord(loc)) {
        currentActiveIds.add(id);
        hasValidData = true;
        const position = { lat: Number(loc.latitude || loc.lat), lng: Number(loc.longitude || loc.lng) };
        bounds.extend(position);

        const empName = emp.name || emp.firstName || emp.username || activeUser?.name || 'Unknown User';
        const rawStatus = emp.status || emp.state || activeUser?.status || '';
        const isOffline = String(rawStatus).toLowerCase() === 'offline';
        
        const pinColor = isOffline ? '#64748b' : '#36c2a6'; // Grey or Green

        if (fleetMarkers.current[id]) {
          fleetMarkers.current[id].setPosition(position);
          fleetMarkers.current[id].setTitle(empName);
          fleetMarkers.current[id].setIcon({ ...fleetMarkers.current[id].getIcon() as any, fillColor: pinColor });
        } else {
          fleetMarkers.current[id] = new window.google.maps.Marker({
            position,
            map: mapInstance.current,
            title: empName, 
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: pinColor,
              fillOpacity: 1,
              strokeColor: '#1b1205',
              strokeWeight: 2,
            }
          });
        }
      }
    });

    Object.keys(fleetMarkers.current).forEach(id => {
      if (!currentActiveIds.has(id)) {
        fleetMarkers.current[id].setMap(null);
        delete fleetMarkers.current[id];
      }
    });

    // --- B. Plot the Route Line (TypeScript Safe) ---
    if (!polylineRef.current) {
      polylineRef.current = new window.google.maps.Polyline({
        strokeColor: '#f4a340',
        strokeOpacity: 0.9,
        strokeWeight: 5,
        geodesic: true, 
        map: mapInstance.current, 
      });
    }

    if (activePath.length > 1) {
      polylineRef.current.setPath(activePath);
      activePath.forEach((p: any) => bounds.extend(p)); 
      hasValidData = true;
    } else {
      polylineRef.current.setPath([]); 
    }

    // --- C. Plot the Stop Markers ---
    stopMarkers.current.forEach(m => m.setMap(null));
    stopMarkers.current = [];

    if (data && !Array.isArray(data) && data.stops && Array.isArray(data.stops)) {
      data.stops.forEach((s: any) => {
        if (isValidCoord(s)) {
          hasValidData = true;
          const stopPos = { lat: Number(s.latitude || s.lat), lng: Number(s.longitude || s.lng) };
          bounds.extend(stopPos); 

          const m = new window.google.maps.Marker({
            position: stopPos,
            map: mapInstance.current,
            title: `Stopped ${Math.round(s.durationMinutes || 0)} min`,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 5,
              fillColor: '#5b9bd5',
              fillOpacity: 0.9,
              strokeColor: '#0e1726',
              strokeWeight: 1.5,
            }
          });
          stopMarkers.current.push(m);
        }
      });
    }

    // --- D. Camera Auto-Zoom ---
    if (hasValidData) {
      if (officeCircle.current) {
        bounds.union(officeCircle.current.getBounds()!);
      }
      
      mapInstance.current.fitBounds(bounds);
      const listener = window.google.maps.event.addListener(mapInstance.current, "idle", () => { 
        if (mapInstance.current!.getZoom()! > 18) mapInstance.current!.setZoom(18); 
        window.google.maps.event.removeListener(listener); 
      });
    }

  }, [allEmployees, live, activePath, data]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#0e1726', borderRadius: '8px', overflow: 'hidden' }}>
      <div ref={mapRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}></div>
    </div>
  );
}


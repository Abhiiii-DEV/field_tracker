// import { useEffect, useState, useCallback } from 'react';
// import LiveMap from './LiveMap';
// import Timeline from './Timeline';
// import { getEmployeeDetail, getEmployeeMap, getEmployeeTimeline } from '../api/endpoints';
// import { getSocket } from '../realtime/socket';
// import { fmtTime, fmtDuration, fmtCoord, fmtAgo } from '../utils/format';
// import type { EmployeeDetail as Detail, EmployeeMap, TimelineEvent, LocationUpdate } from '../types';

// export default function EmployeeDetail({ employeeId }: { employeeId: string }) {
//   const [detail, setDetail] = useState<Detail | null>(null);
//   const [map, setMap] = useState<EmployeeMap | null>(null);
//   const [events, setEvents] = useState<TimelineEvent[]>([]);
//   const [livePos, setLivePos] = useState<{ latitude: number; longitude: number; speed: number } | null>(null);
//   const [loading, setLoading] = useState(true);

//   const load = useCallback(async () => {
//     setLoading(true);
//     try {
//       const [d, m, t] = await Promise.all([
//         getEmployeeDetail(employeeId),
//         getEmployeeMap(employeeId),
//         getEmployeeTimeline(employeeId),
//       ]);
//       setDetail(d);
//       setMap(m);
//       setEvents(t?.events || []); // Safe fallback for events
//       setLivePos(null);
//     } catch (err) {
//       console.error("Failed to load employee details", err);
//     } finally {
//       setLoading(false);
//     }
//   }, [employeeId]);

//   useEffect(() => {
//     void load();
//   }, [load]);

//   // Subscribe to this employee's live stream while the panel is open.
//   useEffect(() => {
//     const socket = getSocket();
//     socket.emit('subscribe:employee', employeeId);
//     const onUpdate = (u: LocationUpdate) => {
//       if (u.userId !== employeeId) return;
//       setLivePos({ latitude: u.latitude, longitude: u.longitude, speed: u.speed });
      
//       setDetail((prev) =>
//         prev
//           ? {
//               ...prev,
//               live: {
//                 ...(prev.live || {}), // Prevent crash if live was previously null
//                 currentLocation: { latitude: u.latitude, longitude: u.longitude },
//                 currentSpeed: u.speed,
//                 isMoving: u.isMoving,
//                 locationStatus: u.locationStatus,
//                 trackingStatus: u.trackingStatus,
//                 isOnline: true,
//                 lastSeenAt: u.timestamp,
//               },
//             }
//           : prev
//       );
//     };
//     socket.on('location:update', onUpdate);
//     return () => {
//       socket.emit('unsubscribe:employee', employeeId);
//       socket.off('location:update', onUpdate);
//     };
//   }, [employeeId]);

//   if (loading || !detail || !map) {
//     return <div className="detail-loading">Loading employee…</div>;
//   }

//   const { user, live, today, stops } = detail;
//   const safeStops = stops || []; // Fallback for stops array

//   return (
//     <div className="detail">
//       <header className="detail-head">
//         <div>
//           <h2 className="detail-name">{user?.name || 'Unknown User'}</h2>
//           <span className="detail-email tele">{user?.email || '—'}</span>
//         </div>
//         <div className="detail-status">
//           <span className={`badge ${live?.isOnline ? (live?.isMoving ? 'motion' : 'office') : 'alert'}`}>
//             <span className={`pulse ${live?.isOnline ? (live?.isMoving ? '' : 'idle') : 'off'}`} />
//             {!live?.isOnline
//               ? 'Offline'
//               : live?.locationStatus === 'INSIDE_OFFICE'
//                 ? 'At office'
//                 : 'In field'}
//           </span>
//         </div>
//       </header>

//       <div className="map-shell card">
//         <LiveMap data={map} live={livePos} />
//         <div className="map-readout tele">
//           {/* Safe Speed Formatting */}
//           <span><b>{(live?.currentSpeed ?? 0).toFixed(0)}</b> km/h</span>
          
//           {/* Safe Coordinate Formatting */}
//           {live?.currentLocation?.latitude && live?.currentLocation?.longitude && (
//             <span>{fmtCoord(live.currentLocation.latitude, live.currentLocation.longitude)}</span>
//           )}
          
//           {/* Safe Date Formatting */}
//           <span>seen {fmtAgo(live?.lastSeenAt || null)}</span>
//         </div>
//       </div>

//       <div className="readout-grid">
//         {/* Safe Number Formatting */}
//         <Stat label="Distance today" value={`${(today?.distanceTravelledKm ?? 0).toFixed(1)} km`} />
//         <Stat label="Travel time" value={fmtDuration(today?.travelMinutes ?? 0)} />
//         <Stat label="Left office" value={fmtTime(today?.leftOfficeAt || null)} />
//         <Stat label="Returned" value={fmtTime(today?.returnedOfficeAt || null)} />
//         <Stat label="Stops" value={String(today?.stopCount ?? 0)} />
//         <Stat label="Stopped for" value={fmtDuration(today?.stopDurationMinutes ?? 0)} />
//         <Stat label="GPS points" value={String(today?.totalLocationPoints ?? 0)} />
//         <Stat label="Battery" value={live?.batteryLevel != null ? `${live.batteryLevel}%` : '—'} />
//       </div>

//       <div className="detail-columns">
//         <section className="card detail-section">
//           <span className="eyebrow">Today's timeline</span>
//           <Timeline events={events} />
//         </section>
//         <section className="card detail-section">
//           <span className="eyebrow">Stops · {safeStops.length}</span>
//           <div className="stops-list">
//             {safeStops.length === 0 && <div className="timeline-empty">No stops detected.</div>}
//             {safeStops.map((s) => (
//               <div key={s._id || Math.random().toString()} className="stop-row">
//                 <span className="tele">{fmtTime(s.startTime || null)} → {fmtTime(s.endTime || null)}</span>
//                 <span className="stop-dur">{Math.round(s.durationMinutes ?? 0)} min</span>
//               </div>
//             ))}
//           </div>
//         </section>
//       </div>
//     </div>
//   );
// }

// function Stat({ label, value }: { label: string; value: string }) {
//   return (
//     <div className="readout card">
//       <span className="readout-value tele">{value}</span>
//       <span className="readout-label eyebrow">{label}</span>
//     </div>
//   );
// }




import { useEffect, useState, useCallback } from 'react';
import LiveMap from './LiveMap';
import Timeline from './Timeline';
import { getEmployeeDetail, getEmployeeMap, getEmployeeTimeline } from '../api/endpoints';
import { getSocket } from '../realtime/socket';
import { fmtTime, fmtDuration, fmtCoord, fmtAgo } from '../utils/format';
import type { EmployeeDetail as Detail, EmployeeMap, TimelineEvent, LocationUpdate } from '../types';

export default function EmployeeDetail({
  employeeId,
  date,
  from,
  to,
}: {
  employeeId: string;
  date?: string;
  from?: string;
  to?: string;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [map, setMap] = useState<EmployeeMap | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [livePos, setLivePos] = useState<{ latitude: number; longitude: number; speed: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, m, t] = await Promise.all([
        getEmployeeDetail(employeeId, date, from, to),
        getEmployeeMap(employeeId, date, from, to),
        getEmployeeTimeline(employeeId, date, from, to),
      ]);
      setDetail(d);
      setMap(m);
      setEvents(t?.events || []); // Safe fallback for events
      setLivePos(null);
    } catch (err) {
      console.error("Failed to load employee details", err);
    } finally {
      setLoading(false);
    }
  }, [employeeId, date, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  // Subscribe to this employee's live stream while the panel is open.
  useEffect(() => {
    const socket = getSocket();
    socket.emit('subscribe:employee', employeeId);
    const onUpdate = (u: LocationUpdate) => {
      if (u.userId !== employeeId) return;
      setLivePos({ latitude: u.latitude, longitude: u.longitude, speed: u.speed });
      
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              live: {
                ...(prev.live || {}), // Prevent crash if live was previously null
                currentLocation: { latitude: u.latitude, longitude: u.longitude },
                currentSpeed: u.speed,
                isMoving: u.isMoving,
                locationStatus: u.locationStatus,
                trackingStatus: u.trackingStatus,
                isOnline: true,
                lastSeenAt: u.timestamp,
              },
            }
          : prev
      );
    };
    socket.on('location:update', onUpdate);
    return () => {
      socket.emit('unsubscribe:employee', employeeId);
      socket.off('location:update', onUpdate);
    };
  }, [employeeId]);

  if (loading || !detail || !map) {
    return <div className="detail-loading">Loading employee…</div>;
  }

  const { user, live, today, stops } = detail;
  const safeStops = stops || []; // Fallback for stops array

  return (
    <div className="detail">
      <header className="detail-head">
        <div>
          <h2 className="detail-name">{user?.name || 'Unknown User'}</h2>
          <span className="detail-email tele">{user?.email || '—'}</span>
        </div>
        <div className="detail-status">
          <span className={`badge ${live?.isOnline ? (live?.isMoving ? 'motion' : 'office') : 'alert'}`}>
            <span className={`pulse ${live?.isOnline ? (live?.isMoving ? '' : 'idle') : 'off'}`} />
            {!live?.isOnline
              ? 'Offline'
              : live?.locationStatus === 'INSIDE_OFFICE'
                ? 'At office'
                : 'In field'}
          </span>
        </div>
      </header>

      <div className="map-shell card">
        {/* THE FIX: Explicitly passing the user profile and translating the online status to the map! */}
        <LiveMap 
          data={map} 
          live={livePos} 
          activeUser={{ ...user, status: live?.isOnline ? 'online' : 'offline' }} 
        />
        
        <div className="map-readout tele">
          {/* Safe Speed Formatting */}
          <span><b>{(live?.currentSpeed ?? 0).toFixed(0)}</b> km/h</span>
          
          {/* Safe Coordinate Formatting */}
          {live?.currentLocation?.latitude && live?.currentLocation?.longitude && (
            <span>{fmtCoord(live.currentLocation.latitude, live.currentLocation.longitude)}</span>
          )}
          
          {/* Safe Date Formatting */}
          <span>seen {fmtAgo(live?.lastSeenAt || null)}</span>
        </div>
      </div>

      <div className="readout-grid">
        {/* Safe Number Formatting */}
        <Stat label="Distance today" value={`${(today?.distanceTravelledKm ?? 0).toFixed(1)} km`} />
        <Stat label="Travel time" value={fmtDuration(today?.travelMinutes ?? 0)} />
        <Stat label="Left office" value={fmtTime(today?.leftOfficeAt || null)} />
        <Stat label="Returned" value={fmtTime(today?.returnedOfficeAt || null)} />
        <Stat label="Stops" value={String(today?.stopCount ?? 0)} />
        <Stat label="Stopped for" value={fmtDuration(today?.stopDurationMinutes ?? 0)} />
        <Stat label="GPS points" value={String(today?.totalLocationPoints ?? 0)} />
        <Stat label="Battery" value={live?.batteryLevel != null ? `${live.batteryLevel}%` : '—'} />
      </div>

      <div className="detail-columns">
        <section className="card detail-section">
          <span className="eyebrow">Today's timeline</span>
          <Timeline events={events} />
        </section>
        <section className="card detail-section">
          <span className="eyebrow">Stops · {safeStops.length}</span>
          <div className="stops-list">
            {safeStops.length === 0 && <div className="timeline-empty">No stops detected.</div>}
            {safeStops.map((s) => (
              <div key={s._id || Math.random().toString()} className="stop-row">
                <span className="tele">{fmtTime(s.startTime || null)} → {fmtTime(s.endTime || null)}</span>
                <span className="stop-dur">{Math.round(s.durationMinutes ?? 0)} min</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="readout card">
      <span className="readout-value tele">{value}</span>
      <span className="readout-label eyebrow">{label}</span>
    </div>
  );
}
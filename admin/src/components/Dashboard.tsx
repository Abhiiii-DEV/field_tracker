import { useEffect, useState, useCallback } from 'react';
import FleetMap from './FleetMap';
import EmployeeDetail from './EmployeeDetail';
import { getOverview, getEmployees } from '../api/endpoints';
import { getSocket } from '../realtime/socket';
import { fmtAgo } from '../utils/format';
import type { Overview, EmployeeCard, LocationUpdate } from '../types';

const cards: { key: keyof Overview; label: string; tone?: string }[] = [
  { key: 'totalEmployees', label: 'Total' },
  { key: 'onlineEmployees', label: 'Online', tone: 'office' },
  { key: 'offlineEmployees', label: 'Offline', tone: 'alert' },
  { key: 'moving', label: 'Moving', tone: 'motion' },
  { key: 'stopped', label: 'Stopped' },
  { key: 'insideOffice', label: 'At office', tone: 'office' },
  { key: 'outsideOffice', label: 'In field' },
];

const statusLabel = (e: EmployeeCard): string =>
  !e.isOnline ? 'Offline' : e.locationStatus === 'INSIDE_OFFICE' ? 'At office' : 'In field';

const dotClass = (e: EmployeeCard): string =>
  !e.isOnline ? 'off' : e.locationStatus === 'INSIDE_OFFICE' ? 'office' : 'motion';

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [employees, setEmployees] = useState<EmployeeCard[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [ov, emps] = await Promise.all([getOverview(), getEmployees()]);
    setOverview(ov);
    setEmployees(emps);
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  // Live patching from the socket stream (same contract as the old Console).
  useEffect(() => {
    const socket = getSocket();
    const onLocation = (u: LocationUpdate) => {
      setEmployees((prev) =>
        prev.map((e) =>
          e._id === u.userId
            ? {
                ...e,
                currentSpeed: u.speed,
                locationStatus: u.locationStatus,
                trackingStatus: u.trackingStatus,
                isOnline: true,
                lastSeenAt: u.timestamp,
                currentLocation: { latitude: u.latitude, longitude: u.longitude },
              }
            : e
        )
      );
    };
    const onStatus = () => void refresh();
    socket.on('location:update', onLocation);
    socket.on('employee:status', onStatus);
    return () => {
      socket.off('location:update', onLocation);
      socket.off('employee:status', onStatus);
    };
  }, [refresh]);

  return (
    <div className="dash">
      <div className="dash-cards">
        {cards.map((c) => (
          <div className={`stat-card ${c.tone ?? ''}`} key={c.key}>
            <span className="stat-num">{overview ? overview[c.key] : '—'}</span>
            <span className="stat-label">{c.label}</span>
          </div>
        ))}
      </div>

      <div className="dash-main">
        <div className="dash-map card">
          <FleetMap employees={employees} selectedId={selected} onSelect={setSelected} />
        </div>

        <aside className="dash-list card">
          <div className="dash-list-head">
            <span>Field team</span>
            <span className="dash-list-count">{employees.length}</span>
          </div>
          <div className="dash-list-scroll">
            {employees.length === 0 && <div className="emp-empty">No employees yet.</div>}
            {employees.map((e) => (
              <button
                key={e._id}
                className={`fleet-row ${selected === e._id ? 'selected' : ''}`}
                onClick={() => setSelected(e._id)}
              >
                <span className={`dot ${dotClass(e)}`} />
                <span className="fleet-row-main">
                  <span className="fleet-row-name">{e.name}</span>
                  <span className="fleet-row-meta">
                    {statusLabel(e)} · seen {fmtAgo(e.lastSeenAt)}
                  </span>
                </span>
                <span className="fleet-row-km tele">
                  {(e.distanceTravelledKm ?? 0).toFixed(1)} km
                </span>
              </button>
            ))}
          </div>
        </aside>
      </div>

      {selected && (
        <div className="drawer-overlay" onClick={() => setSelected(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close" onClick={() => setSelected(null)} aria-label="Close">
              ✕
            </button>
            <EmployeeDetail key={selected} employeeId={selected} />
          </div>
        </div>
      )}
    </div>
  );
}

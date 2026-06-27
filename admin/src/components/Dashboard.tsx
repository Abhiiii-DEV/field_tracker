import { useEffect, useState, useCallback } from 'react';
import FleetMap from './FleetMap';
import { getOverview, getEmployees } from '../api/endpoints';
import { getSocket } from '../realtime/socket';
import { fmtAgo, fmtCoord } from '../utils/format';
import type { Overview, EmployeeCard, LocationUpdate } from '../types';

const cards: { key: keyof Overview; label: string; tone?: string }[] = [
  { key: 'totalEmployees', label: 'Total' },
  { key: 'onlineEmployees', label: 'Online', tone: 'office' },
  { key: 'offlineEmployees', label: 'Offline', tone: 'alert' },
  { key: 'insideOffice', label: 'At office', tone: 'office' },
  { key: 'outsideOffice', label: 'In field' },
];

const statusLabel = (e: EmployeeCard): string =>
  !e.isOnline ? 'Offline' : e.locationStatus === 'INSIDE_OFFICE' ? 'At office' : 'In field';

const statusTone = (e: EmployeeCard): string =>
  !e.isOnline ? 'alert' : e.locationStatus === 'INSIDE_OFFICE' ? 'office' : 'motion';

export default function Dashboard({ onOpenUser }: { onOpenUser: (id: string) => void }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [employees, setEmployees] = useState<EmployeeCard[]>([]);

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

  // Live patching from the socket stream.
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

      {/* Live fleet map (full width) */}
      <div className="dash-map card">
        <FleetMap employees={employees} selectedId={null} onSelect={onOpenUser} />
      </div>

      {/* All users — per-user distance & stats */}
      <div className="dash-users card">
        <div className="dash-users-head">
          <span>Field team</span>
          <span className="dash-list-count">{employees.length} users</span>
        </div>
        <div className="du-row du-row-head">
          <span>User</span>
          <span>Status</span>
          <span>Speed</span>
          <span>Distance today</span>
          <span>Battery</span>
          <span>Location</span>
          <span>Last update</span>
        </div>
        <div className="du-scroll">
          {employees.length === 0 && <div className="emp-empty">No employees yet.</div>}
          {employees.map((e) => (
            <button key={e._id} className="du-row" onClick={() => onOpenUser(e._id)}>
              <span className="du-user">
                <span className="du-name">{e.name}</span>
                <span className="du-email tele">{e.email}</span>
              </span>
              <span>
                <span className={`badge ${statusTone(e)}`}>
                  <span className={`pulse ${e.isOnline ? '' : 'off'}`} />
                  {statusLabel(e)}
                </span>
              </span>
              <span className="tele">{(e.currentSpeed ?? 0).toFixed(0)} km/h</span>
              <span className="tele du-km">{(e.distanceTravelledKm ?? 0).toFixed(1)} km</span>
              <span className="tele">{e.batteryLevel != null ? `${e.batteryLevel}%` : '—'}</span>
              <span className="tele du-loc">
                {e.currentLocation
                  ? fmtCoord(e.currentLocation.latitude, e.currentLocation.longitude)
                  : '—'}
              </span>
              <span className="du-seen">seen {fmtAgo(e.lastSeenAt)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

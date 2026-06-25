import { useEffect, useState, useCallback } from 'react';
import DashboardOverview from './DashboardOverview';
import EmployeeList from './EmployeeList';
import EmployeeDetail from './EmployeeDetail';
import { getOverview, getEmployees } from '../api/endpoints';
import { getSocket } from '../realtime/socket';
import type { Overview, EmployeeCard, LocationUpdate } from '../types';

export default function Console() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [employees, setEmployees] = useState<EmployeeCard[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [ov, emps] = await Promise.all([getOverview(), getEmployees()]);
    setOverview(ov);
    setEmployees(emps);
    setSelected((cur) => cur ?? (emps[0]?._id ?? null));
  }, []);

  useEffect(() => {
    void refresh();
    // Periodic safety refresh for counts (sockets handle the fast path).
    const t = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  // Live patching of the employee list from the socket stream.
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
    <div className="console">
      <DashboardOverview data={overview} />
      <div className="console-body">
        <EmployeeList employees={employees} selectedId={selected} onSelect={setSelected} />
        <div className="console-detail">
          {selected ? (
            <EmployeeDetail key={selected} employeeId={selected} />
          ) : (
            <div className="detail-loading">Select an employee to see their day.</div>
          )}
        </div>
      </div>
    </div>
  );
}

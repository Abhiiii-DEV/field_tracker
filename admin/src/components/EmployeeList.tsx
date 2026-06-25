import type { EmployeeCard } from '../types';
import { fmtAgo } from '../utils/format';

function statusBadge(emp: EmployeeCard) {
  if (!emp.isOnline) return <span className="badge alert"><span className="pulse off" />Offline</span>;
  if (emp.locationStatus === 'INSIDE_OFFICE')
    return <span className="badge office"><span className="pulse idle" />At office</span>;
  if (emp.currentSpeed >= 3 || emp.locationStatus === 'OUTSIDE_OFFICE')
    return <span className="badge motion"><span className="pulse" />In field</span>;
  return <span className="badge"><span className="pulse idle" />Idle</span>;
}

export default function EmployeeList({
  employees,
  selectedId,
  onSelect,
}: {
  employees: EmployeeCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="emp-list">
      <div className="emp-list-head">
        <span className="eyebrow">Field team</span>
        <span className="eyebrow">{employees.length} tracked</span>
      </div>
      <div className="emp-list-scroll">
        {employees.length === 0 && (
          <div className="emp-empty">No salespeople yet. Seed the backend or add users.</div>
        )}
        {employees.map((emp) => (
          <button
            key={emp._id}
            className={`emp-card ${selectedId === emp._id ? 'selected' : ''}`}
            onClick={() => onSelect(emp._id)}
          >
            <div className="emp-card-top">
              <span className="emp-name">{emp.name}</span>
              {statusBadge(emp)}
            </div>
            <div className="emp-card-meta tele">
              <span>{emp.currentSpeed.toFixed(0)} km/h</span>
              <span>·</span>
              <span>{emp.distanceTravelledKm.toFixed(1)} km today</span>
              <span>·</span>
              <span>{fmtAgo(emp.lastSeenAt)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

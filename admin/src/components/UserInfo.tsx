import { useEffect, useState } from 'react';
import EmployeeDetail from './EmployeeDetail';
import { getEmployees } from '../api/endpoints';
import type { EmployeeCard } from '../types';

/**
 * Dedicated tab that shows one user's full live information (route map, today's
 * stats, stops, timeline). Reached by clicking a user on the Dashboard, or by
 * picking one from the dropdown here. `selectedId`/`onSelect` are lifted to App
 * so a Dashboard click lands on this tab with the right user pre-selected.
 */
export default function UserInfo({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [employees, setEmployees] = useState<EmployeeCard[]>([]);

  useEffect(() => {
    void getEmployees().then((es) => {
      setEmployees(es);
      // If we arrived here without a selection, default to the first user.
      if (!selectedId && es[0]) onSelect(es[0]._id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="reports">
      <div className="reports-bar card">
        <label>
          <span>User</span>
          <select value={selectedId ?? ''} onChange={(e) => onSelect(e.target.value)}>
            {employees.length === 0 && <option value="">No users</option>}
            {employees.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="reports-body">
        {selectedId ? (
          <EmployeeDetail key={selectedId} employeeId={selectedId} />
        ) : (
          <div className="detail-loading">Select a user to see their information.</div>
        )}
      </div>
    </div>
  );
}

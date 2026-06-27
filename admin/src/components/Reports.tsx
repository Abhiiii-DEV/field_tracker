import { useEffect, useState } from 'react';
import EmployeeDetail from './EmployeeDetail';
import { getEmployees } from '../api/endpoints';
import type { EmployeeCard } from '../types';

/**
 * Per-employee day report. Pick a person and (optionally) a date; the existing
 * EmployeeDetail renders their route map, today/day stats, stops and timeline.
 * The backend endpoints already accept ?date=YYYY-MM-DD — no API change needed.
 */
export default function Reports() {
  const [employees, setEmployees] = useState<EmployeeCard[]>([]);
  const [empId, setEmpId] = useState<string>('');
  const [date, setDate] = useState<string>(''); // '' = today
  const [from, setFrom] = useState<string>(''); // '' = start of day
  const [to, setTo] = useState<string>(''); // '' = end of day

  useEffect(() => {
    void getEmployees().then((es) => {
      setEmployees(es);
      setEmpId((prev) => prev || (es[0]?._id ?? ''));
    });
  }, []);

  // Only send a bound to the API when it's set; an inverted range (to < from) is
  // ignored so a half-typed time never returns an empty report.
  const validRange = !from || !to || from <= to;
  const fromQ = validRange ? from || undefined : undefined;
  const toQ = validRange ? to || undefined : undefined;

  return (
    <div className="reports">
      <div className="reports-bar card">
        <label>
          <span>Employee</span>
          <select value={empId} onChange={(e) => setEmpId(e.target.value)}>
            {employees.length === 0 && <option value="">No employees</option>}
            {employees.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          <span>From</span>
          <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          <span>To</span>
          <input type="time" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        {(date || from || to) && (
          <button
            className="btn btn-sm"
            onClick={() => {
              setDate('');
              setFrom('');
              setTo('');
            }}
          >
            Reset
          </button>
        )}
        {!validRange && <span className="team-error">“To” must be after “From”.</span>}
      </div>

      <div className="reports-body">
        {empId ? (
          <EmployeeDetail
            key={`${empId}:${date}:${fromQ ?? ''}:${toQ ?? ''}`}
            employeeId={empId}
            date={date || undefined}
            from={fromQ}
            to={toQ}
          />
        ) : (
          <div className="detail-loading">Select an employee to see their report.</div>
        )}
      </div>
    </div>
  );
}

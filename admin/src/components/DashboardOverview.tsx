import type { Overview } from '../types';

const items: { key: keyof Overview; label: string; tone?: string }[] = [
  { key: 'totalEmployees', label: 'Total' },
  { key: 'onlineEmployees', label: 'Online', tone: 'office' },
  { key: 'offlineEmployees', label: 'Offline', tone: 'alert' },
  { key: 'moving', label: 'Moving', tone: 'motion' },
  { key: 'stopped', label: 'Stopped' },
  { key: 'insideOffice', label: 'At office', tone: 'office' },
  { key: 'outsideOffice', label: 'In field' },
];

export default function DashboardOverview({ data }: { data: Overview | null }) {
  return (
    <div className="overview-strip">
      {items.map((it) => (
        <div className={`overview-stat ${it.tone ?? ''}`} key={it.key}>
          <span className="overview-num tele">{data ? data[it.key] : '—'}</span>
          <span className="overview-label eyebrow">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

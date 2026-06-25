import type { TimelineEvent } from '../types';
import { fmtTime } from '../utils/format';

const dotFor = (type: string): string => {
  switch (type) {
    case 'LOGIN':
      return 'office';
    case 'LOGOUT':
      return 'off';
    case 'LEFT_OFFICE':
      return 'motion';
    case 'RETURNED_OFFICE':
      return 'office';
    case 'STOP':
      return 'info';
    default:
      return '';
  }
};

export default function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) {
    return <div className="timeline-empty">No activity recorded for this day yet.</div>;
  }
  return (
    <ol className="timeline">
      {events.map((e, i) => (
        <li key={`${e.type}-${e.at}-${i}`} className="timeline-row">
          <span className="timeline-time tele">{fmtTime(e.at)}</span>
          <span className={`timeline-dot ${dotFor(e.type)}`} />
          <span className="timeline-label">{e.label}</span>
        </li>
      ))}
    </ol>
  );
}

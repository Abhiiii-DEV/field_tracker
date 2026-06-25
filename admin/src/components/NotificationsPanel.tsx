import { useEffect, useState } from 'react';
import { getNotifications, markAllNotificationsRead } from '../api/endpoints';
import { getSocket } from '../realtime/socket';
import { fmtAgo } from '../utils/format';
import type { AppNotification } from '../types';

const toneFor = (type: string): string => {
  if (type === 'LEFT_OFFICE' || type === 'OFFLINE' || type.includes('REVOKED') || type.includes('DISABLED'))
    return 'alert';
  if (type === 'RETURNED_OFFICE' || type === 'LOGIN') return 'office';
  return '';
};

export default function NotificationsPanel({
  open,
  onClose,
  onUnread,
}: {
  open: boolean;
  onClose: () => void;
  onUnread: (n: number) => void;
}) {
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = async () => {
    const res = await getNotifications();
    setItems(res.items);
    onUnread(res.unread);
  };

  useEffect(() => {
    void load();
    const socket = getSocket();
    const onNotif = (n: AppNotification) => {
      setItems((prev) => [n, ...prev].slice(0, 100));
      onUnread(-1); // signal increment; parent recomputes on open
    };
    socket.on('notification', onNotif);
    return () => {
      socket.off('notification', onNotif);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearAll = async () => {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    onUnread(0);
  };

  return (
    <>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`notif-panel ${open ? 'open' : ''}`}>
        <header className="notif-head">
          <span className="eyebrow">Notifications</span>
          <div className="notif-actions">
            <button className="btn" onClick={clearAll}>Mark all read</button>
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </header>
        <div className="notif-scroll">
          {items.length === 0 && <div className="timeline-empty">Nothing yet.</div>}
          {items.map((n) => (
            <div key={n._id} className={`notif-row ${n.isRead ? 'read' : ''}`}>
              <span className={`notif-dot ${toneFor(n.type)}`} />
              <div className="notif-body">
                <span className="notif-text">
                  <b>{n.userName}</b> {n.message}
                </span>
                <span className="notif-time tele">{fmtAgo(n.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

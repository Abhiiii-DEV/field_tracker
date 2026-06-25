import { useEffect, useState } from 'react';
import { useAuth } from './store/auth';
import Login from './components/Login';
import Console from './components/Console';
import TeamView from './components/TeamView';
import NotificationsPanel from './components/NotificationsPanel';
import { getNotifications } from './api/endpoints';
import './app.css';

export default function App() {
  const { user, loading, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [view, setView] = useState<'live' | 'team'>('live');

  useEffect(() => {
    if (!user) return;
    void getNotifications().then((r) => setUnread(r.unread)).catch(() => {});
  }, [user]);

  // -1 from the panel means "recompute" (a socket push arrived).
  const handleUnread = (n: number) => {
    if (n === -1) {
      void getNotifications().then((r) => setUnread(r.unread)).catch(() => {});
    } else {
      setUnread(n);
    }
  };

  if (loading) {
    return <div className="boot">Loading console…</div>;
  }
  if (!user) return <Login />;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="pulse" />
          <span className="brand-name">Fleet Console</span>
          <nav className="topbar-nav">
            <button
              className={`nav-tab ${view === 'live' ? 'active' : ''}`}
              onClick={() => setView('live')}
            >
              Live
            </button>
            <button
              className={`nav-tab ${view === 'team' ? 'active' : ''}`}
              onClick={() => setView('team')}
            >
              Team
            </button>
          </nav>
        </div>
        <div className="topbar-actions">
          <button className="btn notif-btn" onClick={() => setNotifOpen(true)}>
            Alerts
            {unread > 0 && <span className="notif-count tele">{unread}</span>}
          </button>
          <span className="topbar-user">{user.name}</span>
          <button className="btn" onClick={() => void logout()}>Sign out</button>
        </div>
      </header>

      <main className="main">{view === 'live' ? <Console /> : <TeamView />}</main>

      <NotificationsPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        onUnread={handleUnread}
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useAuth } from './store/auth';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import UserInfo from './components/UserInfo';
import Reports from './components/Reports';
import TeamView from './components/TeamView';
import NotificationsPanel from './components/NotificationsPanel';
import { getNotifications } from './api/endpoints';
import './app.css';

type View = 'dashboard' | 'userinfo' | 'reports' | 'users';

const nav: { key: View; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '▥' },
  { key: 'userinfo', label: 'User Info', icon: '◎' },
  { key: 'reports', label: 'Reports', icon: '▤' },
  { key: 'users', label: 'User Creation', icon: '＋' },
];

export default function App() {
  const { user, loading, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [view, setView] = useState<View>('dashboard');
  const [activeUser, setActiveUser] = useState<string | null>(null);

  // Clicking a user on the Dashboard opens the dedicated User Info tab.
  const openUser = (id: string) => {
    setActiveUser(id);
    setView('userinfo');
  };

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
    <div className="shell-h">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="pulse" />
          <span className="brand-name">Fleet Console</span>
        </div>

        <nav className="sidebar-nav">
          {nav.map((n) => (
            <button
              key={n.key}
              className={`side-tab ${view === n.key ? 'active' : ''}`}
              onClick={() => setView(n.key)}
            >
              <span className="side-ico">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <button className="btn notif-btn" onClick={() => setNotifOpen(true)}>
            Alerts
            {unread > 0 && <span className="notif-count tele">{unread}</span>}
          </button>
          <div className="sidebar-user">
            <span className="topbar-user">{user.name}</span>
            <button className="btn btn-sm" onClick={() => void logout()}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="main-h">
        {view === 'dashboard' && <Dashboard onOpenUser={openUser} />}
        {view === 'userinfo' && <UserInfo selectedId={activeUser} onSelect={setActiveUser} />}
        {view === 'reports' && <Reports />}
        {view === 'users' && <TeamView />}
      </main>

      <NotificationsPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        onUnread={handleUnread}
      />
    </div>
  );
}

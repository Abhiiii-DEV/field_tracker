import { useState, FormEvent } from 'react';
import { useAuth } from '../store/auth';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@vmukti.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-aside">
        <div className="login-brand">
          <span className="pulse" />
          <span className="eyebrow">Field Tracking</span>
        </div>
        <h1 className="login-headline">Fleet Console</h1>
        <p className="login-sub">
          Live positions, office geofence events, halts and daily movement
          analytics for the field team — in one operations view.
        </p>
        <div className="login-readout tele">
          <div><span>ONLINE</span><b>—</b></div>
          <div><span>MOVING</span><b>—</b></div>
          <div><span>AT OFFICE</span><b>—</b></div>
        </div>
      </div>

      <form className="login-form card" onSubmit={submit}>
        <span className="eyebrow">Administrator sign in</span>
        <label>
          <span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoFocus />
        </label>
        <label>
          <span>Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
          />
        </label>
        {error && <div className="login-error">{error}</div>}
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? 'Signing in…' : 'Open console'}
        </button>
      </form>
    </div>
  );
}

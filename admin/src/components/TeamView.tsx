import { useEffect, useState, FormEvent } from 'react';
import { getUsers, createUser, updateUser, resetUserPassword } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { ManagedUser } from '../types';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'salesperson' as 'salesperson' | 'admin',
  phone: '',
};

export default function TeamView() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setUsers(await getUsers());
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await createUser({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        phone: form.phone.trim() || undefined,
      });
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create user');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (u: ManagedUser) => {
    await updateUser(u._id, { isActive: !u.isActive });
    await load();
  };

  const resetPw = async (u: ManagedUser) => {
    const pw = window.prompt(`New password for ${u.name} (min 8 characters):`);
    if (!pw) return;
    if (pw.length < 8) {
      window.alert('Password must be at least 8 characters.');
      return;
    }
    try {
      await resetUserPassword(u._id, pw);
      window.alert('Password updated. The user will need to sign in again.');
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Reset failed');
    }
  };

  return (
    <div className="team">
      <div className="team-head">
        <div>
          <span className="eyebrow">Team</span>
          <h2 className="team-title">{users.length} users</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Add user'}
        </button>
      </div>

      {showForm && (
        <form className="card team-form" onSubmit={submit}>
          <div className="team-form-grid">
            <label>
              <span>Full name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </label>
            <label>
              <span>Temporary password</span>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="min 8 characters"
                required
              />
            </label>
            <label>
              <span>Phone (optional)</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label>
              <span>Role</span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as 'salesperson' | 'admin' })}
              >
                <option value="salesperson">Salesperson</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>
          {error && <div className="team-error">{error}</div>}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? 'Creating…' : 'Create user'}
          </button>
        </form>
      )}

      <div className="card team-table">
        <div className="team-row team-row-head">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {loading && <div className="team-empty">Loading…</div>}
        {!loading && users.length === 0 && (
          <div className="team-empty">No users yet. Add your first salesperson above.</div>
        )}
        {users.map((u) => (
          <div className="team-row" key={u._id}>
            <span className="team-name">{u.name}</span>
            <span className="tele team-email">{u.email}</span>
            <span>
              <span className={`badge ${u.role === 'admin' ? 'motion' : ''}`}>{u.role}</span>
            </span>
            <span>
              <span className={`badge ${u.isActive ? 'office' : 'alert'}`}>
                {u.isActive ? 'Active' : 'Disabled'}
              </span>
            </span>
            <span className="team-actions">
              <button className="btn btn-sm" onClick={() => toggleActive(u)}>
                {u.isActive ? 'Disable' : 'Enable'}
              </button>
              <button className="btn btn-sm" onClick={() => resetPw(u)}>
                Reset password
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

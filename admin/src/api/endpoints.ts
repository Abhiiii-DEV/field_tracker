import { api, tokens } from './client';
import type {
  User,
  ManagedUser,
  Overview,
  EmployeeCard,
  EmployeeDetail,
  EmployeeMap,
  TimelineEvent,
  AppNotification,
} from '../types';

export async function login(email: string, password: string) {
  const data = await api<{ accessToken: string; refreshToken: string; user: User }>(
    '/api/auth/login',
    { method: 'POST', auth: false, body: JSON.stringify({ email, password }) }
  );
  tokens.set(data.accessToken, data.refreshToken);
  return data.user;
}

export async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) });
  } finally {
    tokens.clear();
  }
}

export const getMe = () => api<{ user: User }>('/api/auth/me').then((r) => r.user);

export const getOverview = () => api<Overview>('/api/admin/dashboard/overview');

export const getEmployees = () =>
  api<{ employees: EmployeeCard[] }>('/api/admin/employees').then((r) => r.employees);

// Build a ?date=&from=&to= query string from whichever filters are set.
const reportQuery = (date?: string, from?: string, to?: string): string => {
  const q = new URLSearchParams();
  if (date) q.set('date', date);
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  const s = q.toString();
  return s ? `?${s}` : '';
};

export const getEmployeeDetail = (id: string, date?: string, from?: string, to?: string) =>
  api<EmployeeDetail>(`/api/admin/employees/${id}${reportQuery(date, from, to)}`);

export const getEmployeeMap = (id: string, date?: string, from?: string, to?: string) =>
  api<EmployeeMap>(`/api/admin/employees/${id}/map${reportQuery(date, from, to)}`);

export const getEmployeeTimeline = (id: string, date?: string, from?: string, to?: string) =>
  api<{ date: string; events: TimelineEvent[] }>(
    `/api/admin/employees/${id}/timeline${reportQuery(date, from, to)}`
  );

export const getNotifications = () =>
  api<{ items: AppNotification[]; unread: number; total: number }>(
    '/api/admin/notifications?limit=50'
  );

export const markAllNotificationsRead = () =>
  api('/api/admin/notifications/read-all', { method: 'POST', body: JSON.stringify({}) });

// ── User / team management ────────────────────────────────────────────────
export const getUsers = () =>
  api<{ users: ManagedUser[] }>('/api/admin/users').then((r) => r.users);

export const createUser = (input: {
  name: string;
  email: string;
  password: string;
  role: 'salesperson' | 'admin';
  phone?: string;
}) =>
  api<{ user: ManagedUser }>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((r) => r.user);

export const updateUser = (
  id: string,
  patch: Partial<{ name: string; phone: string; role: 'salesperson' | 'admin'; isActive: boolean }>
) =>
  api<{ user: ManagedUser }>(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }).then((r) => r.user);

export const resetUserPassword = (id: string, password: string) =>
  api(`/api/admin/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });

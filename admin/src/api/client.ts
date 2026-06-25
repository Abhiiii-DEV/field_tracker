const API_BASE = (import.meta.env.VITE_API_BASE as string) || '';

const ACCESS_KEY = 'ft_access';
const REFRESH_KEY = 'ft_refresh';

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

let refreshing: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const rt = tokens.refresh;
  if (!rt) return false;
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    tokens.set(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

/**
 * Fetch wrapper that injects the bearer token and transparently refreshes once
 * on a 401, retrying the original request. Concurrent 401s share one refresh.
 */
export async function api<T = unknown>(
  path: string,
  opts: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = true, headers, ...rest } = opts;

  const build = (): RequestInit => ({
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && tokens.access ? { Authorization: `Bearer ${tokens.access}` } : {}),
      ...headers,
    },
  });

  let res = await fetch(`${API_BASE}${path}`, build());

  if (res.status === 401 && auth && tokens.refresh) {
    refreshing = refreshing ?? doRefresh();
    const ok = await refreshing;
    refreshing = null;
    if (ok) {
      res = await fetch(`${API_BASE}${path}`, build());
    } else {
      tokens.clear();
      window.dispatchEvent(new Event('ft:logout'));
    }
  }

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.message ?? 'Request failed', body?.error?.code);
  }
  return body as T;
}

export { API_BASE };

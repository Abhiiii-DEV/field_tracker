import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getMe, login as apiLogin, logout as apiLogout } from '../api/endpoints';
import { tokens } from '../api/client';
import { disconnectSocket } from '../realtime/socket';
import type { User } from '../types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!tokens.access) {
        setLoading(false);
        return;
      }
      try {
        const me = await getMe();
        if (active) setUser(me);
      } catch {
        tokens.clear();
      } finally {
        if (active) setLoading(false);
      }
    })();

    const onForcedLogout = () => setUser(null);
    window.addEventListener('ft:logout', onForcedLogout);
    return () => {
      active = false;
      window.removeEventListener('ft:logout', onForcedLogout);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const u = await apiLogin(email, password);
    if (u.role !== 'admin') {
      tokens.clear();
      throw new Error('This console is for administrators only.');
    }
    setUser(u);
  };

  const logout = async () => {
    await apiLogout();
    disconnectSocket();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(Ctx);

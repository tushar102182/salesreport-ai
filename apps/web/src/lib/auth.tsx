import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthResponse, LoginInput, RegisterInput, UserDto } from '@salesreport/shared';
import { authRequest, hasSessionHint, refreshSession, registerSessionListener, setAccessToken } from './api';

interface AuthContextValue {
  user: UserDto | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  applySession: (auth: AuthResponse) => void;
  /** Replaces the cached user (e.g. after saving preferences). */
  updateUser: (user: UserDto) => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  // Without the CSRF cookie there can't be a refresh cookie either, so skip the network round-trip.
  const [status, setStatus] = useState<AuthContextValue['status']>(() => (hasSessionHint() ? 'loading' : 'anonymous'));
  const qc = useQueryClient();

  const applySession = useCallback((auth: AuthResponse | null) => {
    setAccessToken(auth?.accessToken ?? null);
    setUser(auth?.user ?? null);
    setStatus(auth ? 'authenticated' : 'anonymous');
  }, []);

  // Restore the session from the refresh cookie on load, and keep the access token fresh.
  useEffect(() => {
    registerSessionListener((auth) => {
      applySession(auth);
      if (!auth) qc.clear();
    });
    if (hasSessionHint()) void refreshSession().then(applySession);
  }, [applySession, qc]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const id = setInterval(() => void refreshSession().then((a) => a && applySession(a)), 12 * 60_000);
    return () => clearInterval(id);
  }, [status, applySession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAdmin: user?.role === 'admin',
      applySession,
      updateUser: (u) => setUser(u),
      login: async (input) => applySession(await authRequest<AuthResponse>('/auth/login', input)),
      register: async (input) => applySession(await authRequest<AuthResponse>('/auth/register', input)),
      logout: async () => {
        try {
          await authRequest('/auth/logout');
        } finally {
          applySession(null);
          qc.clear();
        }
      },
    }),
    [user, status, applySession, qc],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

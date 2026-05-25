"use client";

import { useTheme } from "next-themes";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { api } from "@/lib/api";
import type { AuthUser } from "@/lib/auth-schemas";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signup: (input: { email: string; password: string; name: string }) => Promise<AuthUser>;
  login: (input: { email: string; password: string }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { setTheme } = useTheme();
  /** Garde-fou : on ne re-synchronise next-themes ↔ backend qu'une fois par
   *  session pour éviter les boucles si l'user toggle son thème localement. */
  const themeSyncedRef = useRef(false);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get<{ user: AuthUser }>("/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchMe();
      setLoading(false);
    })();
  }, [fetchMe]);

  // Synchronise la préférence backend avec next-themes au premier load utile.
  // L'admin pourrait avoir bossé en dark sur un autre device — on respecte ça.
  useEffect(() => {
    if (!user || themeSyncedRef.current) return;
    themeSyncedRef.current = true;
    if (user.theme && ["light", "dark", "system"].includes(user.theme)) {
      setTheme(user.theme);
    }
  }, [user, setTheme]);

  const signup = useCallback<AuthContextValue["signup"]>(async (input) => {
    const { data } = await api.post<{ user: AuthUser }>("/auth/signup", input);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback<AuthContextValue["login"]>(async (input) => {
    const { data } = await api.post<{ user: AuthUser }>("/auth/login", input);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback<AuthContextValue["logout"]>(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  }, []);

  const refresh = useCallback<AuthContextValue["refresh"]>(async () => {
    await fetchMe();
  }, [fetchMe]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signup, login, logout, refresh }),
    [user, loading, signup, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé sous <AuthProvider>");
  return ctx;
}

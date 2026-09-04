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
import type { AuthUser, SignupResult } from "@/lib/auth-schemas";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** Crée le compte et déclenche l'envoi du code — ne connecte pas. */
  signup: (input: {
    email: string;
    password: string;
    name: string;
  }) => Promise<SignupResult>;
  /** Valide le code reçu par email et connecte dans la foulée. */
  verifyEmail: (input: { email: string; code: string }) => Promise<AuthUser>;
  resendVerification: (email: string) => Promise<void>;
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
    // Pas de setUser ici : tant que le code n'est pas validé, aucune session.
    const { data } = await api.post<SignupResult>("/auth/signup", input);
    return data;
  }, []);

  const verifyEmail = useCallback<AuthContextValue["verifyEmail"]>(
    async (input) => {
      const { data } = await api.post<{ user: AuthUser }>(
        "/auth/verify-email",
        input,
      );
      setUser(data.user);
      return data.user;
    },
    [],
  );

  const resendVerification = useCallback<AuthContextValue["resendVerification"]>(
    async (email) => {
      await api.post("/auth/resend-verification", { email });
    },
    [],
  );

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
    () => ({
      user,
      loading,
      signup,
      verifyEmail,
      resendVerification,
      login,
      logout,
      refresh,
    }),
    [
      user,
      loading,
      signup,
      verifyEmail,
      resendVerification,
      login,
      logout,
      refresh,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé sous <AuthProvider>");
  return ctx;
}

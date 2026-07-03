import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

export const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  // 20 s : suffisant pour un cold start Render Free (le service peut mettre
  // ~15 s à se réveiller), mais empêche les requêtes qui pendent à l'infini
  // sur un réseau mort.
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
});

// --- Refresh-on-401 (single in-flight) ---------------------------------------
let refreshPromise: Promise<void> | null = null;

async function performRefresh(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${API_URL}/api/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const url = original?.url ?? "";

    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/signup") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/logout") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password");

    if (status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        await performRefresh();
        return api.request(original);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

// --- Helpers -----------------------------------------------------------------
export function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(" • ") : data.message;
    }
  }
  return fallback;
}

import {
  ApiError,
  authApi,
  getAuthToken,
  isApiConfigured,
  setAuthToken,
} from "@/lib/api";
import {
  mapApiRoleToAppRole,
  usernameToLoginEmail,
} from "@/lib/api/session";

const AUTH_STORAGE_KEY = "getreal.auth";
const ROLE_STORAGE_KEY = "getreal.role";
const LAST_ACTIVE_KEY = "getreal.lastActive";
const USER_NAME_KEY = "getreal.userName";

/** Log out after this much idle time (1 hour). */
export const IDLE_TIMEOUT_MS = 60 * 60 * 1000;

export type AppRole = "superadmin" | "warehouse";

/** Demo credentials when VITE_API_URL is empty (offline / local-only mode). */
export const DEMO_ACCOUNTS = {
  superadmin: {
    username: "admin",
    password: "getreal",
    role: "superadmin" as const,
    home: "/distributors",
  },
  warehouse: {
    username: "warehouse",
    password: "getreal",
    role: "warehouse" as const,
    home: "/distributor-deliveries",
  },
} as const;

/** Backend accounts used when the API is configured. */
export const API_LOGIN_HINTS = {
  superadmin: {
    email: "admin@example.com",
    password: "password123",
  },
  warehouse: {
    email: "warehouse@example.com",
    password: "password123",
  },
} as const;

/** @deprecated Prefer DEMO_ACCOUNTS — kept for existing login hint copy */
export const DEMO_CREDENTIALS = {
  username: DEMO_ACCOUNTS.superadmin.username,
  password: DEMO_ACCOUNTS.superadmin.password,
} as const;

function readLastActive(): number {
  try {
    const raw = localStorage.getItem(LAST_ACTIVE_KEY);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function touchActivity(): void {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
  } catch {
    // no-op
  }
}

export function isIdleExpired(): boolean {
  const last = readLastActive();
  if (!last) return false;
  return Date.now() - last > IDLE_TIMEOUT_MS;
}

function clearSessionStorage(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(ROLE_STORAGE_KEY);
    localStorage.removeItem(LAST_ACTIVE_KEY);
    localStorage.removeItem(USER_NAME_KEY);
    setAuthToken(null);
  } catch {
    // no-op
  }
}

export function isAuthenticated(): boolean {
  try {
    if (localStorage.getItem(AUTH_STORAGE_KEY) !== "1") return false;

    // When API is configured, a Bearer token is required for authorized calls.
    if (isApiConfigured() && !getAuthToken()) {
      clearSessionStorage();
      return false;
    }

    const last = readLastActive();
    if (!last) {
      touchActivity();
      return true;
    }
    if (Date.now() - last > IDLE_TIMEOUT_MS) {
      logout();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getRole(): AppRole | null {
  if (!isAuthenticated()) return null;
  try {
    const role = localStorage.getItem(ROLE_STORAGE_KEY);
    if (role === "superadmin" || role === "warehouse") return role;
  } catch {
    // fall through
  }
  return "superadmin";
}

export function getSessionUserName(): string {
  try {
    return localStorage.getItem(USER_NAME_KEY) ?? "James Miller";
  } catch {
    return "James Miller";
  }
}

export function getHomeRoute(): string {
  const role = getRole();
  if (role === "warehouse") return DEMO_ACCOUNTS.warehouse.home;
  return DEMO_ACCOUNTS.superadmin.home;
}

function loginLocal(username: string, password: string): AppRole | null {
  const trimmed = username.trim();
  const account = Object.values(DEMO_ACCOUNTS).find(
    (entry) => entry.username === trimmed && entry.password === password,
  );
  if (!account) return null;

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, "1");
    localStorage.setItem(ROLE_STORAGE_KEY, account.role);
    localStorage.setItem(USER_NAME_KEY, account.username);
    setAuthToken(null);
    touchActivity();
  } catch {
    // Still treat as logged in for this session if storage is unavailable.
  }

  return account.role;
}

function extractLoginToken(response: unknown): string {
  if (!response || typeof response !== "object") return "";
  const record = response as Record<string, unknown>;
  if (typeof record.token === "string" && record.token) return record.token;
  if (typeof record.accessToken === "string" && record.accessToken) {
    return record.accessToken;
  }
  return "";
}

function extractLoginUser(response: unknown): {
  role?: string;
  name?: string;
  email?: string;
} {
  if (!response || typeof response !== "object") return {};
  const user = (response as { user?: Record<string, unknown> }).user;
  if (!user || typeof user !== "object") return {};
  return {
    role: typeof user.role === "string" ? user.role : undefined,
    name: typeof user.name === "string" ? user.name : undefined,
    email: typeof user.email === "string" ? user.email : undefined,
  };
}

export type LoginResult =
  | { ok: true; role: AppRole }
  | { ok: false; message: string };

/**
 * Authenticate against the backend when VITE_API_URL is set.
 * Stores the JWT and uses it for subsequent Authorization headers.
 * Demo local login is only used when the API is not configured.
 */
export async function login(
  username: string,
  password: string,
): Promise<LoginResult> {
  if (!isApiConfigured()) {
    const role = loginLocal(username, password);
    if (!role) {
      return { ok: false, message: "Invalid username or password." };
    }
    return { ok: true, role };
  }

  const email = usernameToLoginEmail(username);

  try {
    const response = await authApi.login({ email, password });
    const token = extractLoginToken(response);

    if (!token) {
      return {
        ok: false,
        message: "Login succeeded but no auth token was returned.",
      };
    }

    setAuthToken(token);
    localStorage.setItem(AUTH_STORAGE_KEY, "1");

    const user = extractLoginUser(response);
    const role = mapApiRoleToAppRole(user.role);
    localStorage.setItem(ROLE_STORAGE_KEY, role);
    localStorage.setItem(
      USER_NAME_KEY,
      user.name || user.email || email,
    );
    touchActivity();
    return { ok: true, role };
  } catch (error) {
    clearSessionStorage();
    if (error instanceof ApiError) {
      return {
        ok: false,
        message: error.message || "Invalid email or password.",
      };
    }
    return {
      ok: false,
      message: "Unable to reach the server. Please try again.",
    };
  }
}

/** Clear local session after a 401 from an authenticated API call. */
export function clearAuthOnUnauthorized(): void {
  clearSessionStorage();
}

export function logout(): void {
  const hadToken = Boolean(getAuthToken());

  if (isApiConfigured() && hadToken) {
    void authApi.logout().catch(() => {
      // ignore network errors on logout
    });
  }

  clearSessionStorage();
}

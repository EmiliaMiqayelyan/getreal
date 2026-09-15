import {
  authApi,
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

/** Demo credentials when VITE_API_URL is empty. */
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

export function isAuthenticated(): boolean {
  try {
    if (localStorage.getItem(AUTH_STORAGE_KEY) !== "1") return false;
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

export async function login(
  username: string,
  password: string,
): Promise<AppRole | null> {
  if (!isApiConfigured()) {
    return loginLocal(username, password);
  }

  const email = usernameToLoginEmail(username);

  try {
    const response = await authApi.login({ email, password });
    const token =
      typeof response === "object" && response && "token" in response
        ? String((response as { token: string }).token)
        : "";

    if (!token) return null;

    setAuthToken(token);
    localStorage.setItem(AUTH_STORAGE_KEY, "1");

    const apiRole =
      typeof response === "object" && response && "user" in response
        ? (response as { user?: { role?: string; name?: string } }).user?.role
        : undefined;
    const displayName =
      typeof response === "object" && response && "user" in response
        ? (response as { user?: { name?: string } }).user?.name
        : undefined;

    const role = mapApiRoleToAppRole(apiRole);
    localStorage.setItem(ROLE_STORAGE_KEY, role);
    if (displayName) localStorage.setItem(USER_NAME_KEY, displayName);
    touchActivity();
    return role;
  } catch {
    return loginLocal(username, password);
  }
}

export function logout(): void {
  if (isApiConfigured()) {
    void authApi.logout().catch(() => {
      // ignore network errors on logout
    });
  }

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

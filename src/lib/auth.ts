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
import type { RolePermissions } from "@/types/admin";
import {
  ADMIN_ROLE_PERMISSIONS,
  apiPermissionNames,
  DEFAULT_ROLE_PERMISSIONS,
  permissionsForRoleType,
  permissionsFromApiNames,
  API_PERMISSION_FOR,
} from "@/utils/rolePermissions";

const AUTH_STORAGE_KEY = "getreal.auth";
const ROLE_STORAGE_KEY = "getreal.role";
const LAST_ACTIVE_KEY = "getreal.lastActive";
const USER_NAME_KEY = "getreal.userName";
const SESSION_PROFILE_KEY = "getreal.sessionProfile";

/** API permission strings for the offline warehouse demo account. */
const WAREHOUSE_API_PERMISSIONS = [
  "read:orders",
  "update:orders",
  "update:order_status",
  "read:inventory",
  "manage:inventory",
  "read:receiving",
  "manage:receiving",
  "read:users",
  "read:coolers",
];

type SessionProfile = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  permissions: string[];
};

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
    localStorage.removeItem(SESSION_PROFILE_KEY);
    setAuthToken(null);
  } catch {
    // no-op
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const segment = token.split(".")[1];
  if (!segment) return null;
  try {
    const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function readStoredProfile(): SessionProfile | null {
  try {
    const raw = localStorage.getItem(SESSION_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionProfile;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      id: parsed.id,
      email: parsed.email,
      name: parsed.name,
      role: parsed.role,
      permissions: apiPermissionNames(parsed.permissions),
    };
  } catch {
    return null;
  }
}

function saveSessionProfile(profile: SessionProfile): void {
  try {
    localStorage.setItem(SESSION_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // no-op
  }
}

/** Signed-in user. Permission strings prefer the JWT, which the API enforces. */
export function getSessionProfile(): SessionProfile {
  const stored = readStoredProfile();
  const payload = (() => {
    const token = getAuthToken();
    return token ? decodeJwtPayload(token) : null;
  })();
  const tokenPermissions = apiPermissionNames(payload?.permissions);
  const tokenRole = typeof payload?.role === "string" ? payload.role : undefined;
  const tokenEmail = typeof payload?.email === "string" ? payload.email : undefined;
  const tokenId = typeof payload?.id === "string" ? payload.id : undefined;
  return {
    id: tokenId || stored?.id,
    email: tokenEmail || stored?.email,
    name: stored?.name,
    role: tokenRole || stored?.role,
    permissions: tokenPermissions.length
      ? tokenPermissions
      : (stored?.permissions ?? []),
  };
}

function formatRoleLabel(role: string): string {
  const normalized = role.trim().toLowerCase();
  if (normalized === "admin" || normalized.includes("super")) return "Super Admin";
  return role
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getSessionRoleLabel(): string {
  const role = getSessionProfile().role?.trim();
  if (role) return formatRoleLabel(role);
  if (getRole() === "warehouse") return "Warehouse";
  return "Super Admin";
}

/** API permission strings on the signed-in account. */
export function getSessionPermissionNames(): string[] {
  if (!isAuthenticated()) return [];
  if (!isApiConfigured()) {
    if (getRole() === "warehouse") return [...WAREHOUSE_API_PERMISSIONS];
    return [...new Set([...Object.values(API_PERMISSION_FOR), "manage:orders"])];
  }
  return getSessionProfile().permissions;
}

/** Checkbox permissions for the signed-in user. */
export function getSessionPermissions(): RolePermissions {
  if (!isAuthenticated()) return { ...DEFAULT_ROLE_PERMISSIONS };

  if (!isApiConfigured()) {
    return getRole() === "warehouse"
      ? permissionsFromApiNames(WAREHOUSE_API_PERMISSIONS)
      : { ...ADMIN_ROLE_PERMISSIONS };
  }

  const profile = getSessionProfile();
  if (profile.permissions.length) {
    return permissionsFromApiNames(profile.permissions);
  }
  return permissionsForRoleType(profile.role || getRole() || "");
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
  const profileName = getSessionProfile().name?.trim();
  if (profileName) return profileName;
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
  id?: string;
  role?: string;
  name?: string;
  email?: string;
  permissions: string[];
} {
  if (!response || typeof response !== "object") return { permissions: [] };
  const user = (response as { user?: Record<string, unknown> }).user;
  if (!user || typeof user !== "object") return { permissions: [] };
  return {
    id: typeof user.id === "string" ? user.id : undefined,
    role: typeof user.role === "string" ? user.role : undefined,
    name: typeof user.name === "string" ? user.name : undefined,
    email: typeof user.email === "string" ? user.email : undefined,
    permissions: apiPermissionNames(user.permissions),
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
    const displayName = user.name || user.email || email;
    localStorage.setItem(ROLE_STORAGE_KEY, role);
    localStorage.setItem(USER_NAME_KEY, displayName);
    saveSessionProfile({
      id: user.id,
      email: user.email || email,
      name: displayName,
      role: user.role,
      permissions: user.permissions,
    });
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

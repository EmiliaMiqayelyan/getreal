const AUTH_STORAGE_KEY = "getreal.auth";

/** Demo credentials — replace with API auth when a server exists. */
export const DEMO_CREDENTIALS = {
  username: "admin",
  password: "getreal",
} as const;

export function isAuthenticated(): boolean {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function login(username: string, password: string): boolean {
  const ok =
    username.trim() === DEMO_CREDENTIALS.username &&
    password === DEMO_CREDENTIALS.password;

  if (!ok) return false;

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, "1");
  } catch {
    // Still treat as logged in for this session if storage is unavailable.
  }

  return true;
}

export function logout(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // no-op
  }
}

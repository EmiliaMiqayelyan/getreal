/**
 * Typed access to environment variables.
 * Add validation (e.g. Zod) when runtime config grows.
 */

function getEnv(key: keyof ImportMetaEnv, fallback?: string): string {
  const value = import.meta.env[key] ?? fallback;

  if (value === undefined || value === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

export const env = {
  appUrl: import.meta.env.VITE_APP_URL ?? "http://localhost:3000",
  apiUrl: import.meta.env.VITE_API_URL ?? "",
  appName: import.meta.env.VITE_APP_NAME ?? "Rachel's Habit",
  mode: import.meta.env.MODE,
  get: getEnv,
} as const;

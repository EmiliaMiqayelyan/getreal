/**
 * Typed access to environment variables.
 * Add validation (e.g. Zod) when runtime config grows.
 */

function getEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;

  if (value === undefined) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "",
  nodeEnv: process.env.NODE_ENV ?? "development",
  get: getEnv,
} as const;

/**
 * In-flight request deduplication and optional short-lived GET response cache.
 *
 * Identical concurrent GETs share one network call. Completed GETs may be
 * reused briefly when `cacheTtlMs` is set. Mutations clear related cache entries.
 */

/** Short TTL for catalog/reference list GETs. Mutations invalidate related entries. */
export const CATALOG_LIST_CACHE_MS = 5_000;

export type RequestIdentity = {
  method: string;
  url: string;
  body?: string | null;
  auth: boolean;
};

type CacheEntry = {
  expiresAt: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: Promise<any>;
};

const inflight = new Map<string, Promise<unknown>>();
const responseCache = new Map<string, CacheEntry>();

const isDev = import.meta.env.DEV;

function normalizeMethod(method: string | undefined): string {
  return (method ?? "GET").toUpperCase();
}

/** Stable key for request identity (method + url + auth + body for non-GET). */
export function buildRequestKey(identity: RequestIdentity): string {
  const method = normalizeMethod(identity.method);
  const bodyPart =
    method === "GET" || method === "HEAD" ? "" : `\0${identity.body ?? ""}`;
  return `${method}\0${identity.url}\0${identity.auth ? "1" : "0"}${bodyPart}`;
}

export function isIdempotentMethod(method: string | undefined): boolean {
  const m = normalizeMethod(method);
  return m === "GET" || m === "HEAD";
}

function logRequest(
  phase: "started" | "completed" | "deduplicated" | "cache-hit" | "error",
  method: string,
  url: string,
  detail?: string,
) {
  if (!isDev) return;
  const suffix = detail ? ` ${detail}` : "";
  console.debug(`[api] ${method} ${url} → ${phase}${suffix}`);
}

export function logApiRequest(
  phase: "started" | "completed" | "deduplicated" | "cache-hit" | "error",
  method: string,
  url: string,
  detail?: string,
) {
  logRequest(phase, method, url, detail);
}

/**
 * Run an idempotent request with in-flight sharing and optional TTL cache.
 * Non-idempotent methods always execute `execute` directly (no sharing).
 */
export function runDedupedRequest<T>(
  identity: RequestIdentity,
  execute: () => Promise<T>,
  options: { cacheTtlMs?: number } = {},
): Promise<T> {
  const method = normalizeMethod(identity.method);
  const key = buildRequestKey(identity);
  const pathForLog = identity.url.replace(/^https?:\/\/[^/]+/i, "") || identity.url;

  if (!isIdempotentMethod(method)) {
    // Mutations invalidate cached GETs for the same path prefix.
    invalidateCacheForUrl(identity.url);
    const started = performance.now();
    logRequest("started", method, pathForLog);
    return execute().then(
      (value) => {
        logRequest(
          "completed",
          method,
          pathForLog,
          `${Math.round(performance.now() - started)}ms`,
        );
        return value;
      },
      (error) => {
        logRequest("error", method, pathForLog);
        throw error;
      },
    );
  }

  const ttl = options.cacheTtlMs ?? 0;
  if (ttl > 0) {
    const cached = responseCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      logRequest("cache-hit", method, pathForLog);
      return cached.value as Promise<T>;
    }
  }

  const existing = inflight.get(key);
  if (existing) {
    logRequest("deduplicated", method, pathForLog);
    return existing as Promise<T>;
  }

  const started = performance.now();
  logRequest("started", method, pathForLog);

  const promise = execute().then(
    (value) => {
      logRequest(
        "completed",
        method,
        pathForLog,
        `${Math.round(performance.now() - started)}ms`,
      );
      return value;
    },
    (error) => {
      logRequest("error", method, pathForLog);
      throw error;
    },
  );

  inflight.set(key, promise);

  const tracked = promise.finally(() => {
    if (inflight.get(key) === promise) {
      inflight.delete(key);
    }
  });

  // Keep the same promise instance in the map for joiners.
  inflight.set(key, tracked);

  if (ttl > 0) {
    const cachedPromise = tracked.then(
      (value) => value,
      (error) => {
        responseCache.delete(key);
        throw error;
      },
    );
    responseCache.set(key, {
      expiresAt: Date.now() + ttl,
      value: cachedPromise,
    });
  }

  return tracked as Promise<T>;
}

/** Drop cached GET responses whose URL matches or is under this path. */
export function invalidateCacheForUrl(url: string): void {
  if (responseCache.size === 0) return;

  let path: string;
  try {
    path = url.startsWith("http") ? new URL(url).pathname : url.split("?")[0];
  } catch {
    path = url.split("?")[0];
  }

  for (const key of responseCache.keys()) {
    // key format: METHOD\0url\0auth...
    const parts = key.split("\0");
    const cachedUrl = parts[1] ?? "";
    let cachedPath = cachedUrl;
    try {
      cachedPath = cachedUrl.startsWith("http")
        ? new URL(cachedUrl).pathname
        : cachedUrl.split("?")[0];
    } catch {
      cachedPath = cachedUrl.split("?")[0];
    }
    if (
      cachedPath === path ||
      cachedPath.startsWith(`${path}/`) ||
      path.startsWith(`${cachedPath}/`)
    ) {
      responseCache.delete(key);
    }
  }
}

/** Test / debug helper. */
export function clearRequestDedupeState(): void {
  inflight.clear();
  responseCache.clear();
}

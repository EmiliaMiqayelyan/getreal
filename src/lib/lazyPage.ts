import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const RELOAD_KEY = "getreal:chunk-reload";

function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    message,
  );
}

function hasReloaded(): boolean {
  try {
    return sessionStorage.getItem(RELOAD_KEY) === "1";
  } catch {
    return false;
  }
}

function markReloaded() {
  try {
    sessionStorage.setItem(RELOAD_KEY, "1");
  } catch {
    // sessionStorage can be blocked; the reload still runs.
  }
}

function clearReloaded() {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    // Ignore storage failures. The page still loaded.
  }
}

export function lazyPage<T extends ComponentType>(
  importer: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() =>
    importer()
      .then((module) => {
        clearReloaded();
        return module;
      })
      .catch((error: unknown) => {
        if (!isChunkLoadError(error) || hasReloaded()) {
          throw error;
        }

        markReloaded();
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }),
  );
}

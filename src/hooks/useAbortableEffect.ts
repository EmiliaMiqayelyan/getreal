import { useEffect, useRef, type DependencyList } from "react";

/**
 * Like useEffect, but provides an AbortSignal that aborts on cleanup.
 * Pair with `apiRequest(path, { signal })`. Aborting one consumer does not
 * cancel a shared in-flight GET (see api client dedupe).
 */
export function useAbortableEffect(
  effect: (signal: AbortSignal) => void | Promise<void>,
  deps: DependencyList,
): void {
  const effectRef = useRef(effect);
  effectRef.current = effect;

  useEffect(() => {
    const controller = new AbortController();

    void Promise.resolve(effectRef.current(controller.signal)).catch(
      (error: unknown) => {
        if (controller.signal.aborted) return;
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }
        // Surface unexpected errors in development.
        if (import.meta.env.DEV) {
          console.error(error);
        }
      },
    );

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

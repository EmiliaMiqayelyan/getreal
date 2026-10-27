import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribe to a CSS media query. Uses `useSyncExternalStore` so the value
 * stays consistent with the browser during concurrent renders.
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Tailwind `md:` breakpoint — mount either the mobile or desktop list, not both. */
export function useIsMdUp() {
  return useMediaQuery("(min-width: 768px)");
}

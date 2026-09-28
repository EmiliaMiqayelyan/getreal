import { useCallback, useState } from "react";

import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";

/**
 * Reveals a list in batches as the caller asks for more.
 * `resetKey` should change when filters change so the window starts over.
 */
export function useLazyWindow<T>(items: T[], resetKey: string) {
  const [count, setCount] = useState(DEFAULT_PAGE_LIMIT);
  const [key, setKey] = useState(resetKey);

  if (key !== resetKey) {
    setKey(resetKey);
    setCount(DEFAULT_PAGE_LIMIT);
  }

  const visible = items.slice(0, count);
  const hasMore = visible.length < items.length;

  const loadMore = useCallback(() => {
    setCount((current) => current + DEFAULT_PAGE_LIMIT);
  }, []);

  return { visible, hasMore, loadMore, loadedCount: visible.length };
}

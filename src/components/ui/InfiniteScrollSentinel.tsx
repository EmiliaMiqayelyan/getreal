import { useEffect, useRef } from "react";

import { AppLoader } from "@/components/ui/AppLoader";

type InfiniteScrollSentinelProps = {
  hasMore: boolean;
  loading?: boolean;
  /** Changes after each batch so a still-visible sentinel requests the next one. */
  loadedCount: number;
  onLoadMore: () => void;
};

/**
 * Loads the next batch when this marker scrolls into view.
 * No page controls — the list grows until `hasMore` is false.
 */
export function InfiniteScrollSentinel({
  hasMore,
  loading = false,
  loadedCount,
  onLoadMore,
}: InfiniteScrollSentinelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    const node = ref.current;
    if (!node || !hasMore || loading) return;

    let ignore = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (ignore) return;
        if (!entries.some((entry) => entry.isIntersecting)) return;
        ignore = true;
        onLoadMoreRef.current();
      },
      { rootMargin: "280px" },
    );

    observer.observe(node);
    return () => {
      ignore = true;
      observer.disconnect();
    };
  }, [hasMore, loadedCount, loading]);

  if (!hasMore && !loading) return null;

  return (
    <div
      ref={ref}
      className="flex min-h-10 items-center justify-center py-3"
    >
      {loading ? (
        <AppLoader variant="inline" size="sm" label="Loading more" />
      ) : (
        <span className="sr-only">Loading more</span>
      )}
    </div>
  );
}

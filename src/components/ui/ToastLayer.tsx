import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Topmost app layer for toasts. Portaled to <body> so no table, sticky
 * column, modal or popover stacking context can cover it; keep the z-index
 * above every other layer in the app.
 */
export function ToastLayer({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed right-4 bottom-4 isolate z-[2147483647] flex w-[min(360px,calc(100vw-2rem))] flex-col items-end gap-2">
      {children}
    </div>,
    document.body,
  );
}

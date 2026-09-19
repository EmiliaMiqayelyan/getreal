import type { ReactNode } from "react";

import { CloseIcon } from "@/components/icons";
import { MODAL_TITLE } from "@/constants/table";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/utils/cn";
import { useEffect } from "react";

export type ModalSize = "sm" | "md" | "lg";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  size?: ModalSize;
  /** Stacking order for nested dialogs (e.g. confirms above other modals). */
  zIndexClass?: string;
};

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: "max-w-[420px]",
  md: "max-w-[540px]",
  lg: "max-w-[720px]",
};

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  className,
  size = "md",
  zIndexClass = "z-50",
}: ModalProps) {
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-start justify-center overflow-hidden overscroll-none p-6 sm:items-center",
        zIndexClass,
      )}
    >
      <button
        type="button"
        aria-label="Close dialog overlay"
        className="fixed inset-0 bg-[#333333]/70"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "bg-surface relative z-10 flex max-h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden overscroll-contain rounded-2xl shadow-xl",
          SIZE_CLASS[size],
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="modal-title" className={MODAL_TITLE}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-strong transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <CloseIcon />
          </button>
        </div>

        <div
          data-scroll-lock-allow
          className="flex-1 overflow-y-auto overscroll-contain px-6 py-5"
        >
          {children}
        </div>

        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

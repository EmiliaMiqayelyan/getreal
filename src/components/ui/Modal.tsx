import type { ReactNode } from "react";
import { useEffect } from "react";

import { CloseIcon } from "@/components/icons";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/utils/cn";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  className,
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden overscroll-none p-6 sm:items-center">
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
          "bg-surface relative z-10 flex max-h-[calc(100dvh-3rem)] w-full max-w-[540px] flex-col overflow-hidden overscroll-contain rounded-2xl shadow-xl",
          className,
        )}
      >
        <div className="border-border/70 flex items-center justify-between border-b px-6 py-4">
          <h2
            id="modal-title"
            className="text-foreground text-lg font-semibold tracking-tight"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-strong hover:bg-background hover:text-foreground rounded-md p-1 transition-colors"
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
          <div className="border-border/70 flex items-center justify-end gap-2 border-t px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

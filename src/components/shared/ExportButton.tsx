import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { ExportHandler, ExportScope } from "@/types/export";
import { cn } from "@/utils/cn";

type ExportButtonProps = {
  /** Plural entity name used in copy, e.g. "customers". */
  entityLabel: string;
  /** Rows matching current view/filters. */
  recordCount?: number;
  /** True when search or filters narrow the list. */
  filtersActive?: boolean;
  disabled?: boolean;
  className?: string;
  /** Called when the user confirms an export; should download from the API. */
  onExport?: ExportHandler;
};

export function ExportButton({
  entityLabel,
  recordCount,
  filtersActive = false,
  disabled = false,
  className,
  onExport,
}: ExportButtonProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [scope, setScope] = useState<ExportScope>("filtered");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!panelOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setPanelOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPanelOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [panelOpen]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const countLabel =
    typeof recordCount === "number"
      ? `${recordCount.toLocaleString()} ${entityLabel}`
      : entityLabel;

  async function confirmExport() {
    if (busy) return;
    setBusy(true);

    const request = {
      format: "csv" as const,
      scope,
      recordCount,
      entityLabel,
    };

    try {
      setToast(`Preparing ${entityLabel} export…`);
      if (!onExport) {
        throw new Error("Export handler is not configured");
      }
      await onExport(request);
      setToast("Download started (CSV)");
      setPanelOpen(false);
    } catch {
      setToast("Export failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div ref={rootRef} className={cn("relative", className)}>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || busy}
          aria-haspopup="dialog"
          aria-expanded={panelOpen}
          aria-label={`Export ${entityLabel}`}
          onClick={() => setPanelOpen((open) => !open)}
          className="w-full sm:w-auto"
        >
          {busy ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
          Export
          <ChevronDown size={14} className="opacity-60" />
        </Button>

        {panelOpen ? (
          <div
            role="dialog"
            aria-label={`Export ${entityLabel}`}
            className="absolute top-[calc(100%+6px)] right-0 z-50 w-[280px] rounded-[12px] border border-[#00000014] bg-white p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          >
            <div className="mb-3">
              <div className="text-[14px] font-semibold text-[#111118]">
                Export {entityLabel}
              </div>
              <div className="mt-0.5 text-[12px] text-[#6B7180]">
                CSV file · {countLabel}
                {filtersActive ? " (filtered)" : ""}
              </div>
            </div>

            <fieldset className="mb-3 space-y-1.5">
              <legend className="mb-1.5 text-[11px] font-semibold tracking-[0.04em] text-[#2E2E2E] uppercase">
                Include
              </legend>
              <ScopeOption
                checked={scope === "filtered"}
                label="Current view"
                detail={
                  typeof recordCount === "number"
                    ? `${recordCount.toLocaleString()} matching rows`
                    : filtersActive
                      ? "Rows matching search and filters"
                      : "Rows currently shown"
                }
                onSelect={() => setScope("filtered")}
              />
              <ScopeOption
                checked={scope === "all"}
                label="All records"
                detail="Full dataset, ignore filters"
                onSelect={() => setScope("all")}
              />
            </fieldset>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => setPanelOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="dark"
                disabled={busy}
                onClick={() => void confirmExport()}
              >
                {busy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                Export CSV
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {toast ? (
        <div className="pointer-events-none fixed right-6 bottom-6 z-[60] flex max-w-[320px] items-start gap-2 rounded-[10px] bg-[#242424] px-4 py-2.5 text-[13px] font-medium text-white shadow-lg">
          {toast.startsWith("Download started") ? (
            <Check size={14} className="mt-0.5 shrink-0 text-[#7DDF8A]" />
          ) : busy ? (
            <Loader2 size={14} className="mt-0.5 shrink-0 animate-spin" />
          ) : null}
          <span>{toast}</span>
        </div>
      ) : null}
    </>
  );
}

function ScopeOption({
  checked,
  label,
  detail,
  onSelect,
}: {
  checked: boolean;
  label: string;
  detail: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-[8px] border px-2.5 py-2 text-left transition-colors",
        checked
          ? "border-[#28402B] bg-[#F4F8F4]"
          : "border-[#00000014] bg-white hover:bg-[#FAFAF8]",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full border",
          checked
            ? "border-[#28402B] bg-[#28402B] text-white"
            : "border-[#00000014] bg-white",
        )}
        aria-hidden
      >
        {checked ? <Check size={9} strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-[#111118]">
          {label}
        </span>
        <span className="block text-[11px] leading-[15px] text-[#8A8A8A]">
          {detail}
        </span>
      </span>
    </button>
  );
}

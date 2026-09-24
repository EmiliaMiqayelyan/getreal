import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Header } from "@/components/layout/AdminHeader";
import { LocationHover } from "@/components/shared/LocationHover";
import { AddSourceModal } from "@/components/sources/AddSourceModal";
import { SourceFilters } from "@/components/sources/SourceFilters";
import { IdPill } from "@/components/ui/Badge";
import { AppLoader } from "@/components/ui/AppLoader";
import { EmptyStateBox } from "@/components/ui/EmptyStateBox";
import { TABLE_HEADER } from "@/constants/table";
import { useAppCatalog } from "@/context/AppCatalogContext";
import { useApiFeedback } from "@/hooks/useApiFeedback";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  isApiConfigured,
  mapApiSourceToSource,
  sourcesApi,
} from "@/lib/api";
import { toCreateSourcePayload } from "@/lib/api/payloads";
import type { ExportRequest } from "@/types/export";
import type { Source } from "@/types/source";
import { cn } from "@/utils/cn";
import { apiId } from "@/utils/entityIds";
import {
  filterSources,
  getSourceDistributorDisplay,
  getSourceFullAddress,
  getSourceLocation,
  nextSourceId,
  downloadSourcesCsv,
  uniqueSourceLocations,
} from "@/utils/sources";

const EDIT_LINK =
  "cursor-pointer text-[13px] font-semibold text-[#2165D4] hover:underline";
const NOTES_LINK =
  "cursor-pointer border-0 bg-transparent p-0 text-left text-[13px] font-medium italic underline leading-[18px] text-[#111118] hover:opacity-80";
const BODY = "text-[13px] leading-[18px] font-medium text-[#111118]";

const GRID =
  "grid grid-cols-[90px_67px_minmax(0,1.5fr)_minmax(0,1.25fr)_minmax(0,1.2fr)_88px_48px] items-center gap-x-3";

function SourcePhoto({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  return (
    <div className="flex h-[46px] w-[67px] shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-[#F3F3F1]">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className="size-full object-contain"
        />
      ) : null}
    </div>
  );
}

const DESCRIPTION_PANEL_WIDTH = 360;

function DescriptionHover({ description }: { description: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, maxHeight: 520 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const hideTimer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  function show() {
    window.clearTimeout(hideTimer.current);
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const margin = 16;
      const left = Math.min(
        Math.max(margin, rect.left - DESCRIPTION_PANEL_WIDTH + rect.width),
        window.innerWidth - DESCRIPTION_PANEL_WIDTH - margin,
      );
      const belowTop = rect.bottom + 8;
      const spaceBelow = window.innerHeight - belowTop - margin;
      const spaceAbove = rect.top - margin - 8;
      const openBelow = spaceBelow >= 240 || spaceBelow >= spaceAbove;
      const maxHeight = Math.min(
        520,
        Math.max(220, openBelow ? spaceBelow : spaceAbove),
      );
      const top = openBelow
        ? belowTop
        : Math.max(margin, rect.top - 8 - maxHeight);
      setPos({ top, left, maxHeight });
    }
    setOpen(true);
  }

  function hide() {
    hideTimer.current = window.setTimeout(() => setOpen(false), 140);
  }

  if (!description.trim()) {
    return <span className="text-[13px] text-[#8A8A8A]">—</span>;
  }

  return (
    <div
      className="relative justify-self-start"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        ref={btnRef}
        type="button"
        className={NOTES_LINK}
        aria-haspopup="true"
        aria-expanded={open}
      >
        View
      </button>
      {open
        ? createPortal(
            <div
              role="tooltip"
              className="fixed z-50 flex w-[360px] flex-col rounded-[10px] border border-[#00000014] bg-white px-4 py-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
              style={{ top: pos.top, left: pos.left, maxHeight: pos.maxHeight }}
              onMouseEnter={show}
              onMouseLeave={hide}
            >
              <div className="mb-2 shrink-0 text-[10px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
                Description
              </div>
              <p className="min-h-0 overflow-y-auto pr-1 text-[13px] leading-relaxed whitespace-pre-wrap text-[#111118]">
                {description}
              </p>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default function SourcePage() {
  useDocumentTitle("Source");

  const {
    sources: rows,
    distributors,
    setSources,
    isBootstrapping,
  } = useAppCatalog();
  const { notifyApiError, showSuccess } = useApiFeedback();
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [distributorFilter, setDistributorFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Source | null>(null);

  const locationOptions = useMemo(
    () => uniqueSourceLocations(rows),
    [rows],
  );

  const distributorOptions = useMemo(() => {
    const names = new Set([
      ...rows.map((row) => getSourceDistributorDisplay(row)),
      ...distributors.map((entry) => entry.name),
    ]);
    return Array.from(names).sort();
  }, [distributors, rows]);

  const filtered = useMemo(
    () =>
      filterSources(rows, {
        query,
        location: locationFilter,
        distributor: distributorFilter,
      }),
    [distributorFilter, locationFilter, query, rows],
  );

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(source: Source) {
    setEditing(source);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleRemoveSource() {
    if (!editing) return;
    const id = editing.id;
    const snapshot = editing;
    setSources((current) => current.filter((row) => row.id !== id));
    if (isApiConfigured()) {
      void sourcesApi.remove(apiId(editing)).catch((error) => {
        setSources((current) => [snapshot, ...current]);
        notifyApiError(error, "Failed to delete source.");
      });
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
      <Header
        title="Source"
        toolbar={
          <SourceFilters
            query={query}
            location={locationFilter}
            distributor={distributorFilter}
            locationOptions={locationOptions}
            distributorOptions={distributorOptions}
            recordCount={filtered.length}
            onQueryChange={setQuery}
            onLocationChange={setLocationFilter}
            onDistributorChange={setDistributorFilter}
            onAdd={openCreate}
            onExport={async (request: ExportRequest) => {
              const source = request.scope === "all" ? rows : filtered;
              downloadSourcesCsv(source);
            }}
          />
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA] p-4 md:p-7">
        {isBootstrapping ? (
          <AppLoader variant="table" label="Loading sources" />
        ) : (
          <>
        <div className="min-h-0 flex-1 space-y-2 overflow-auto md:hidden">
          {filtered.length === 0 ? (
            <EmptyStateBox variant="solid" className="rounded-[12px] px-4 py-10 text-[13px]">
              No sources found
            </EmptyStateBox>
          ) : null}
          {filtered.map((row) => (
            <div
              key={row.id}
              className="rounded-[12px] border border-[#00000014] bg-white p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <SourcePhoto logoUrl={row.logoUrl} name={row.name} />
                  <div className="min-w-0">
                    <IdPill>{row.id}</IdPill>
                    <div className={cn(BODY, "mt-2 truncate")}>{row.name}</div>
                    <LocationHover
                      className={cn(BODY, "mt-1")}
                      fullAddress={getSourceFullAddress(row)}
                    >
                      {getSourceLocation(row)}
                    </LocationHover>
                    <div className={cn(BODY, "mt-0.5 truncate")}>
                      {getSourceDistributorDisplay(row)}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className={EDIT_LINK}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden min-h-0 w-full flex-1 overflow-auto rounded-[12px] border border-[#00000014] bg-white md:block">
          <div className="w-full min-w-[860px]">
            <div
              className={cn(
                GRID,
                TABLE_HEADER,
                "sticky top-0 z-20 h-10 border-b border-[#00000014] bg-white px-4",
              )}
            >
              <div>Source ID</div>
              <div>Photo</div>
              <div className="pl-3">Name</div>
              <div>Location</div>
              <div>Distributor</div>
              <div>Description</div>
              <div aria-hidden />
            </div>

            {filtered.length === 0 ? (
              <EmptyStateBox
                variant="solid"
                className="min-h-0 rounded-none border-0 px-4 py-10 text-[13px]"
              >
                No sources found
              </EmptyStateBox>
            ) : null}

            {filtered.map((row, index) => {
              const isLast = index === filtered.length - 1;

              return (
                <div
                  key={row.id}
                  className={cn(
                    GRID,
                    "h-[78px] px-4",
                    !isLast && "border-b border-[#00000014]",
                  )}
                >
                  <IdPill>{row.id}</IdPill>

                  <SourcePhoto logoUrl={row.logoUrl} name={row.name} />

                  <div className={cn(BODY, "min-w-0 truncate pl-3")}>
                    {row.name}
                  </div>
                  <LocationHover
                    className={BODY}
                    fullAddress={getSourceFullAddress(row)}
                  >
                    {getSourceLocation(row)}
                  </LocationHover>
                  <div className={cn(BODY, "min-w-0 truncate")}>
                    {getSourceDistributorDisplay(row)}
                  </div>
                  <DescriptionHover description={row.description} />
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className={cn(EDIT_LINK, "justify-self-end")}
                    aria-label={`Edit ${row.name}`}
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>
        </div>
          </>
        )}
      </div>

      <AddSourceModal
        open={modalOpen}
        source={editing}
        onClose={closeModal}
        onRemove={handleRemoveSource}
        onSave={(source) => {
          void (async () => {
            if (isApiConfigured()) {
              if (!source.distributorId) {
                notifyApiError(
                  new Error("Select a distributor before saving to the server."),
                );
                return;
              }
              try {
                const payload = toCreateSourcePayload(source);
                if (editing) {
                  const updated = await sourcesApi.update(apiId(editing), payload);
                  const mapped = mapApiSourceToSource(
                    updated,
                    0,
                    new Map([[source.distributorId, source.distributor]]),
                  );
                  setSources((current) =>
                    current.map((row) =>
                      row.id === editing.id
                        ? {
                            ...source,
                            ...mapped,
                            id: editing.id,
                            recordId: mapped.recordId ?? editing.recordId,
                            fullAddress: source.fullAddress || mapped.fullAddress,
                            location: source.location || mapped.location,
                            logoUrl: source.logoUrl ?? mapped.logoUrl,
                            logoName: source.logoName,
                          }
                        : row,
                    ),
                  );
                } else {
                  const created = await sourcesApi.create(payload);
                  const mapped = mapApiSourceToSource(
                    created,
                    0,
                    new Map([[source.distributorId, source.distributor]]),
                  );
                  setSources((current) => [
                    {
                      ...source,
                      ...mapped,
                      fullAddress: source.fullAddress || mapped.fullAddress,
                      location: source.location || mapped.location,
                      logoUrl: source.logoUrl ?? mapped.logoUrl,
                      logoName: source.logoName,
                    },
                    ...current,
                  ]);
                }
                showSuccess(editing ? "Source updated." : "Source created.");
                closeModal();
                return;
              } catch (error) {
                notifyApiError(error, "Failed to save source.");
                return;
              }
            }

            setSources((current) => {
              if (editing) {
                return current.map((row) =>
                  row.id === editing.id ? { ...source, id: editing.id } : row,
                );
              }
              return [{ ...source, id: nextSourceId(current) }, ...current];
            });
            closeModal();
          })();
        }}
      />
    </div>
  );
}

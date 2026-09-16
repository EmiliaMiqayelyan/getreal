import { useEffect, useMemo, useRef, useState } from "react";

import { Header } from "@/components/layout/AdminHeader";
import { LocationHover } from "@/components/shared/LocationHover";
import { AddSourceModal } from "@/components/sources/AddSourceModal";
import { SourceFilters } from "@/components/sources/SourceFilters";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { TABLE_HEADER } from "@/constants/table";
import { useAppCatalog } from "@/context/AppCatalogContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { Source } from "@/types/source";
import { cn } from "@/utils/cn";
import {
  filterSources,
  getSourceDistributorDisplay,
  getSourceFullAddress,
  getSourceLocation,
  nextSourceId,
  uniqueSourceLocations,
} from "@/utils/sources";

const EDIT_LINK =
  "cursor-pointer text-[13px] font-semibold text-[#2165D4] hover:underline";
const NOTES_LINK =
  "cursor-pointer border-0 bg-transparent p-0 text-left text-[13px] font-medium italic underline leading-[18px] text-[#111118] hover:opacity-80";
const BODY = "text-[13px] leading-[18px] font-medium text-[#111118]";
const ID_MONO =
  '"SF Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

const GRID =
  "grid grid-cols-[100px_67px_minmax(0,1.5fr)_minmax(0,1.25fr)_minmax(0,1.2fr)_88px_48px] items-center gap-x-3";

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

function DescriptionHover({ description }: { description: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const hideTimer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  function show() {
    window.clearTimeout(hideTimer.current);
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({
        top: rect.bottom + 8,
        left: Math.min(rect.left, window.innerWidth - 320),
      });
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
      {open ? (
        <div
          role="tooltip"
          className="fixed z-50 w-[300px] max-h-[min(280px,calc(100dvh-24px))] overflow-y-auto rounded-[10px] border border-[#ECECEA] bg-white px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <div className="mb-1.5 text-[10px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
            Description
          </div>
          <p className="text-[12px] leading-relaxed whitespace-pre-wrap text-[#111118]">
            {description}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function SourcePage() {
  useDocumentTitle("Source");

  const { sources: rows, distributors, setSources } = useAppCatalog();
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
    setSources((current) => current.filter((row) => row.id !== id));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
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
          />
        }
      />

      <div className="flex-1 overflow-auto px-4 py-5 md:px-7">
        <div className="space-y-2 md:hidden">
          {filtered.length === 0 ? (
            <div className="rounded-[12px] border border-[#ECECEA] bg-white px-4 py-10 text-center text-[13px] text-[#8A8A8A]">
              No sources found
            </div>
          ) : null}
          {filtered.map((row) => (
            <div
              key={row.id}
              className="rounded-[12px] border border-[#ECECEA] bg-white p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <SourcePhoto logoUrl={row.logoUrl} name={row.name} />
                  <div className="min-w-0">
                    <span
                      className="rounded-[6px] bg-id-pill px-2 py-0.5 text-[11px] font-medium text-[#5A5A5A]"
                      style={{ fontFamily: ID_MONO }}
                    >
                      {row.id}
                    </span>
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

        <div className="hidden md:block">
          <ScrollTable minWidth={860} className="w-full">
            <div
              className={cn(
                GRID,
                TABLE_HEADER,
                "h-10 border-b border-[#ECECEA] px-4",
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
              <div className="px-4 py-10 text-center text-[13px] text-[#8A8A8A]">
                No sources found
              </div>
            ) : null}

            {filtered.map((row, index) => {
              const isLast = index === filtered.length - 1;

              return (
                <div
                  key={row.id}
                  className={cn(
                    GRID,
                    "h-[78px] px-4",
                    !isLast && "border-b border-[#ECECEA]",
                  )}
                >
                  <span
                    className="inline-flex h-7 w-fit items-center rounded-[6px] bg-id-pill px-2 text-[11px] font-medium text-[#5A5A5A]"
                    style={{ fontFamily: ID_MONO }}
                  >
                    {row.id}
                  </span>

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
          </ScrollTable>
        </div>
      </div>

      <AddSourceModal
        open={modalOpen}
        source={editing}
        onClose={closeModal}
        onRemove={handleRemoveSource}
        onSave={(source) => {
          setSources((current) => {
            if (editing) {
              return current.map((row) =>
                row.id === editing.id ? { ...source, id: editing.id } : row,
              );
            }
            return [{ ...source, id: nextSourceId(current) }, ...current];
          });
          closeModal();
        }}
      />
    </div>
  );
}

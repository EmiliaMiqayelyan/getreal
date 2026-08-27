import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";

import { UserMenu } from "@/components/layout/UserMenu";
import { AddSourceModal } from "@/components/sources/AddSourceModal";
import { Input } from "@/components/ui/Input";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { Select } from "@/components/ui/Select";
import { SOURCES } from "@/constants/sources";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { Source } from "@/types/source";
import { cn } from "@/utils/cn";

const ORANGE = "#F57850";
const LINK = "text-[13px] font-medium text-[#3B7DC4] hover:underline";

/**
 * Figma: fixed-width data columns packed on the left; `1fr` only on Edit
 * so extra space is after Description — not between Name/Location/Distributor.
 */
const GRID =
  "grid grid-cols-[110px_48px_160px_150px_140px_64px_minmax(48px,1fr)] items-center gap-x-3";

function nextSourceId(rows: Source[]) {
  const numbers = rows
    .map((row) => Number(row.id.replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value));
  const max = numbers.length ? Math.max(...numbers) : 0;
  return `SOR-${String(max + 1).padStart(5, "0")}`;
}

function DescriptionHover({ description }: { description: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const hideTimer = useRef<number>(0);

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

  useEffect(() => {
    return () => window.clearTimeout(hideTimer.current);
  }, []);

  if (!description.trim()) {
    return <span className="text-[13px] text-[#8A8A8A]">—</span>;
  }

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <button ref={btnRef} type="button" className={LINK} onClick={show}>
        View
      </button>
      {open ? (
        <div
          className="fixed z-50 w-[300px] rounded-[10px] border border-[#ECECEA] bg-white px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <div className="mb-1.5 text-[10px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
            Description
          </div>
          <p className="text-[12px] leading-relaxed text-[#111118]">
            {description}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function SourcePage() {
  useDocumentTitle("Source");

  const [rows, setRows] = useState<Source[]>(SOURCES);
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [distributorFilter, setDistributorFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Source | null>(null);

  const locationOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.location))).sort(),
    [rows],
  );

  const distributorOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.distributor))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !normalized || row.name.toLowerCase().includes(normalized);
      const matchesLocation =
        !locationFilter || row.location === locationFilter;
      const matchesDistributor =
        !distributorFilter || row.distributor === distributorFilter;
      return matchesQuery && matchesLocation && matchesDistributor;
    });
  }, [distributorFilter, locationFilter, query, rows]);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F5F5F3]">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white px-4 pt-5 pb-4 md:px-7">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#111118]">
            Source
          </h1>
          <UserMenu showAvatar className="items-center" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative w-full min-w-[160px] flex-1 sm:max-w-[220px] sm:flex-none">
            <Search
              size={13}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#A9A9A9]"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name"
              className="h-[34px] rounded-[8px] border-[#E6E6E3] bg-white pl-8 text-[13px]"
            />
          </div>

          <Select
            value={locationFilter}
            onChange={setLocationFilter}
            className="w-full sm:w-[150px]"
            aria-label="Location"
            placeholder="Location"
            options={[
              { value: "", label: "Location" },
              ...locationOptions.map((location) => ({
                value: location,
                label: location,
              })),
            ]}
          />

          <Select
            value={distributorFilter}
            onChange={setDistributorFilter}
            className="w-full sm:w-[160px]"
            aria-label="Distributor"
            placeholder="Distributor"
            options={[
              { value: "", label: "Distributor" },
              ...distributorOptions.map((distributor) => ({
                value: distributor,
                label: distributor,
              })),
            ]}
          />

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-[34px] w-full items-center justify-center gap-1.5 rounded-[8px] px-3.5 text-[13px] font-medium text-white sm:ml-auto sm:w-auto"
            style={{ background: ORANGE }}
          >
            <Plus size={14} />
            Add Source
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-5 md:px-7">
        <div className="space-y-2 md:hidden">
          {filtered.map((row) => (
            <div
              key={row.id}
              className="rounded-[12px] border border-[#ECECEA] bg-white p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="size-10 shrink-0 overflow-hidden rounded-[8px] bg-[#F3F3F1]">
                    {row.logoUrl ? (
                      <img
                        src={row.logoUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <span className="rounded-full bg-[#F3F3F1] px-2 py-0.5 font-mono text-[11px] font-medium text-[#6B6B6B]">
                      {row.id}
                    </span>
                    <div className="mt-2 text-[14px] font-semibold text-[#111118]">
                      {row.name}
                    </div>
                    <div className="mt-1 text-[12px] text-[#6B6B6B]">
                      {row.location}
                    </div>
                    <div className="mt-0.5 text-[12px] text-[#111118]">
                      {row.distributor}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className={LINK}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block">
          <ScrollTable minWidth={980}>
            <div
              className={cn(
                GRID,
                "h-10 border-b border-[#ECECEA] bg-white px-4 text-[10px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase",
              )}
            >
              <div>Source ID</div>
              <div>Photo</div>
              <div>Name</div>
              <div>Location</div>
              <div>Distributor</div>
              <div>Description</div>
              <div />
            </div>

            {filtered.map((row, index) => {
              const isLast = index === filtered.length - 1;

              return (
                <div
                  key={row.id}
                  className={cn(
                    GRID,
                    "h-[72px] px-4",
                    !isLast && "border-b border-[#ECECEA]",
                  )}
                >
                  <span className="w-fit rounded-[6px] bg-[#F3F3F1] px-2 py-0.5 font-mono text-[11px] font-medium text-[#6B6B6B]">
                    {row.id}
                  </span>

                  <div className="size-10 overflow-hidden rounded-[8px] bg-[#F3F3F1]">
                    {row.logoUrl ? (
                      <img
                        src={row.logoUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="truncate text-[13px] font-semibold text-[#111118]">
                    {row.name}
                  </div>
                  <div className="truncate text-[13px] text-[#111118]">
                    {row.location}
                  </div>
                  <div className="truncate text-[13px] text-[#111118]">
                    {row.distributor}
                  </div>
                  <DescriptionHover description={row.description} />
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className={cn(LINK, "justify-self-end")}
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
        onSave={(source) => {
          setRows((current) => {
            if (editing) {
              return current.map((row) =>
                row.id === editing.id ? { ...source, id: editing.id } : row,
              );
            }
            return [{ ...source, id: nextSourceId(current) }, ...current];
          });
        }}
      />
    </div>
  );
}

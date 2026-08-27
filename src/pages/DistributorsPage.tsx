import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";

import { AddDistributorModal } from "@/components/distributors/AddDistributorModal";
import { UserMenu } from "@/components/layout/UserMenu";
import { Input } from "@/components/ui/Input";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { Select } from "@/components/ui/Select";
import { DISTRIBUTORS } from "@/constants/distributors";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { Distributor } from "@/types/distributor";
import { cn } from "@/utils/cn";
import { formatDeliveryLabel, WEEK_DAYS } from "@/utils/format";

const ORANGE = "#F57850";
const LINK = "text-[13px] font-medium text-[#3B7DC4] hover:underline";
const BODY = "text-[13px] leading-[18px] text-[#111118]";
const SECONDARY = "text-[12px] leading-[16px] text-[#8A8A8A]";
const ID_MONO =
  '"SF Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

/**
 * Figma: ~100px rows, 16px padding, all columns share width so
 * PHONE / DELIVERY INFO / DOCUMENTS stay packed (no empty middle gaps).
 */
const GRID =
  "grid grid-cols-[0.85fr_1.1fr_1.25fr_1.1fr_1.15fr_1fr_0.75fr_0.55fr_0.45fr] items-center gap-x-3";

function nextDistributorId(rows: Distributor[]) {
  const numbers = rows
    .map((row) => Number(row.id.replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value));
  const max = numbers.length ? Math.max(...numbers) : 10000;
  return `DIS-${max + 1}`;
}

function FilesMenu({ documents }: { documents: Distributor["documents"] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPos({ top: rect.bottom + 8, left: rect.left });
          setOpen((current) => !current);
        }}
        className={cn(BODY, "inline-flex items-center gap-1")}
      >
        Files
        <ChevronDown
          size={12}
          className={cn(
            "text-[#8A8A8A] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[220px] rounded-[10px] border border-[#ECECEA] bg-white py-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          style={{ top: pos.top, left: pos.left }}
        >
          {documents.length ? (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="px-3 py-1.5 text-[12px] text-[#111118]"
              >
                {doc.name}
              </div>
            ))
          ) : (
            <div className="px-3 py-1.5 text-[12px] text-[#8A8A8A]">
              No files
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function NotesHover({ notes }: { notes: string }) {
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
        left: Math.min(rect.left, window.innerWidth - 260),
      });
    }
    setOpen(true);
  }

  function hide() {
    hideTimer.current = window.setTimeout(() => setOpen(false), 140);
  }

  if (!notes.trim()) {
    return <span className="text-[13px] text-[#8A8A8A]">—</span>;
  }

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <button ref={btnRef} type="button" className={LINK} onClick={show}>
        View
      </button>
      {open ? (
        <div
          className="fixed z-50 w-[240px] rounded-[10px] border border-[#ECECEA] bg-white px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <div className="mb-1.5 text-[10px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
            Notes
          </div>
          <p className="text-[12px] leading-relaxed text-[#111118]">{notes}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function DistributorsPage() {
  useDocumentTitle("Distributors");

  const [rows, setRows] = useState<Distributor[]>(DISTRIBUTORS);
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [weekdayFilter, setWeekdayFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Distributor | null>(null);

  const locationOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.location))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !normalized || row.name.toLowerCase().includes(normalized);
      const matchesLocation =
        !locationFilter || row.location === locationFilter;
      const matchesWeekday =
        !weekdayFilter ||
        row.deliveryDays.some((slot) => slot.day === weekdayFilter);
      return matchesQuery && matchesLocation && matchesWeekday;
    });
  }, [locationFilter, query, rows, weekdayFilter]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(distributor: Distributor) {
    setEditing(distributor);
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
            Distributors
          </h1>
          <UserMenu showAvatar className="items-center" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 md:flex-nowrap">
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
            value={weekdayFilter}
            onChange={setWeekdayFilter}
            className="w-full sm:w-[150px]"
            aria-label="Weekday"
            placeholder="Weekday"
            options={[
              { value: "", label: "Weekday" },
              ...WEEK_DAYS.map((day) => ({ value: day, label: day })),
            ]}
          />

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-[34px] w-full items-center justify-center gap-1.5 rounded-[8px] px-3.5 text-[13px] font-medium text-white sm:ml-auto sm:w-auto"
            style={{ background: ORANGE }}
          >
            <Plus size={14} />
            Add Distributor
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
                <div className="min-w-0">
                  <span
                    className="rounded-[6px] bg-[#F0F0EE] px-2 py-0.5 text-[11px] font-medium text-[#5A5A5A]"
                    style={{ fontFamily: ID_MONO }}
                  >
                    {row.id}
                  </span>
                  <div className="mt-2 text-[14px] font-semibold text-[#111118]">
                    {row.name}
                  </div>
                  <div className={SECONDARY}>{row.paymentTerms}</div>
                  <div className="mt-1 text-[12px] text-[#111118]">
                    {row.location}
                  </div>
                  <div className="mt-0.5 text-[12px] text-[#111118]">
                    {row.contact}
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

        <div className="hidden w-full md:block">
          <ScrollTable minWidth={1100} className="w-full">
            <div
              className={cn(
                GRID,
                "h-10 border-b border-[#ECECEA] px-4 text-[10px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase",
              )}
            >
              <div>Distr. ID</div>
              <div>Name</div>
              <div>Location</div>
              <div>Contact Info</div>
              <div>Phone</div>
              <div>Delivery Info</div>
              <div>Documents</div>
              <div>Notes</div>
              <div />
            </div>

            {filtered.map((row, index) => {
              const delivery = formatDeliveryLabel(row.deliveryDays);
              const isLast = index === filtered.length - 1;

              return (
                <div
                  key={row.id}
                  className={cn(
                    GRID,
                    "h-[100px] px-4",
                    !isLast && "border-b border-[#ECECEA]",
                  )}
                >
                  <span
                    className="inline-flex h-7 w-fit items-center rounded-[6px] bg-[#F0F0EE] px-2 text-[11px] font-medium text-[#5A5A5A]"
                    style={{ fontFamily: ID_MONO }}
                  >
                    {row.id}
                  </span>

                  <div className="min-w-0">
                    <div className="truncate text-[13px] leading-[18px] font-semibold text-[#111118]">
                      {row.name}
                    </div>
                    <div className={cn("mt-1", SECONDARY)}>
                      {row.paymentTerms}
                    </div>
                  </div>

                  <div className={cn(BODY, "min-w-0 truncate")}>
                    {row.location}
                  </div>
                  <div className={cn(BODY, "min-w-0 truncate")}>
                    {row.contact}
                  </div>
                  <div className={cn(BODY, "whitespace-nowrap")}>
                    {row.phone}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] leading-[18px] font-medium text-[#111118]">
                      {delivery.days}
                    </div>
                    {delivery.time ? (
                      <div className={cn("mt-1", SECONDARY)}>
                        {delivery.time}
                      </div>
                    ) : null}
                  </div>
                  <FilesMenu documents={row.documents} />
                  <NotesHover notes={row.notes} />
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className={cn(LINK, "justify-self-start")}
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </ScrollTable>
        </div>
      </div>

      <AddDistributorModal
        open={modalOpen}
        distributor={editing}
        onClose={closeModal}
        onSave={(distributor) => {
          setRows((current) => {
            if (editing) {
              return current.map((row) =>
                row.id === editing.id
                  ? { ...distributor, id: editing.id }
                  : row,
              );
            }
            return [
              { ...distributor, id: nextDistributorId(current) },
              ...current,
            ];
          });
        }}
      />
    </div>
  );
}

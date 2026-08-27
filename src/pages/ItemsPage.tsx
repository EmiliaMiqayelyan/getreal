import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";

import { AddItemModal } from "@/components/items/AddItemModal";
import { UserMenu } from "@/components/layout/UserMenu";
import { Input } from "@/components/ui/Input";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { Select } from "@/components/ui/Select";
import { ITEMS } from "@/constants/items";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ITEM_CATEGORIES, type Item } from "@/types/item";
import { cn } from "@/utils/cn";

const ORANGE = "#F57850";
const LINK = "text-[13px] font-medium text-[#3B7DC4] hover:underline";
const TABS = ["All", ...ITEM_CATEGORIES] as const;

const GRID =
  "grid grid-cols-[100px_64px_1.5fr_0.9fr_0.95fr_0.85fr_1.1fr_1.1fr_48px] items-center gap-3";

function nextItemId(rows: Item[]) {
  const numbers = rows
    .map((row) => Number(row.id.replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value));
  const max = numbers.length ? Math.max(...numbers) : 0;
  return `IT-${String(max + 1).padStart(6, "0")}`;
}

function formatSalePrice(value: number) {
  if (Number.isInteger(value)) return `$${value}`;
  return `$${value.toFixed(2)}`;
}

function DescriptionHover({ description }: { description: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const hideTimer = useRef(0);

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

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  if (!description.trim()) {
    return <span className="text-[12px] text-[#8A8A8A]">—</span>;
  }

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <button
        ref={btnRef}
        type="button"
        className="text-[12px] text-[#8A8A8A] hover:text-[#5A5A5A]"
        onClick={show}
      >
        View description
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

function PhotoThumb({ item }: { item: Item }) {
  const cover = item.photos[0];
  return (
    <div className="relative size-10 overflow-hidden rounded-[8px] bg-[#F3F3F1]">
      {cover ? (
        <img src={cover.url} alt="" className="size-full object-cover" />
      ) : null}
      {item.photos.length > 1 ? (
        <span className="absolute right-0.5 bottom-0.5 rounded bg-black/65 px-1 text-[9px] font-semibold text-white">
          {item.photos.length}
        </span>
      ) : null}
    </div>
  );
}

export default function ItemsPage() {
  useDocumentTitle("Items");

  const [rows, setRows] = useState<Item[]>(ITEMS);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [distributorFilter, setDistributorFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);

  const distributorOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.distributor))).sort(),
    [rows],
  );

  const sourceOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.source))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !normalized || row.name.toLowerCase().includes(normalized);
      const matchesCategory =
        !categoryFilter || row.category === categoryFilter;
      const matchesDistributor =
        !distributorFilter || row.distributor === distributorFilter;
      const matchesSource = !sourceFilter || row.source === sourceFilter;
      const matchesTab = tab === "All" || row.category === tab;
      return (
        matchesQuery &&
        matchesCategory &&
        matchesDistributor &&
        matchesSource &&
        matchesTab
      );
    });
  }, [categoryFilter, distributorFilter, query, rows, sourceFilter, tab]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(item: Item) {
    setEditing(item);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F5F5F3]">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white px-4 pt-5 pb-0 md:px-7">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#111118]">
            Items
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
            value={categoryFilter}
            onChange={setCategoryFilter}
            className="w-full sm:w-[140px]"
            aria-label="Category"
            placeholder="Category"
            options={[
              { value: "", label: "Category" },
              ...ITEM_CATEGORIES.map((category) => ({
                value: category,
                label: category,
              })),
            ]}
          />

          <Select
            value={distributorFilter}
            onChange={setDistributorFilter}
            className="w-full sm:w-[150px]"
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

          <Select
            value={sourceFilter}
            onChange={setSourceFilter}
            className="w-full sm:w-[160px]"
            aria-label="Source"
            placeholder="Source"
            options={[
              { value: "", label: "Source" },
              ...sourceOptions.map((source) => ({
                value: source,
                label: source,
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
            Add Item
          </button>
        </div>

        <div className="mt-4 flex gap-5 overflow-x-auto">
          {TABS.map((entry) => {
            const active = tab === entry;
            return (
              <button
                key={entry}
                type="button"
                onClick={() => setTab(entry)}
                className={cn(
                  "relative shrink-0 pb-3 text-[13px] font-medium transition-colors",
                  active
                    ? "text-[#111118]"
                    : "text-[#8A8A8A] hover:text-[#111118]",
                )}
              >
                {entry}
                {active ? (
                  <span
                    className="absolute right-0 bottom-0 left-0 h-[2px] rounded-full"
                    style={{ background: ORANGE }}
                  />
                ) : null}
              </button>
            );
          })}
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
                  <PhotoThumb item={row} />
                  <div className="min-w-0">
                    <span className="rounded-full bg-[#F3F3F1] px-2 py-0.5 font-mono text-[11px] font-medium text-[#6B6B6B]">
                      {row.id}
                    </span>
                    <div className="mt-2 text-[14px] font-semibold text-[#111118]">
                      {row.name}
                    </div>
                    <div className="mt-1 text-[12px] text-[#6B6B6B]">
                      {row.category}
                      {row.subcategory ? ` · ${row.subcategory}` : ""}
                    </div>
                    <div className="mt-0.5 text-[13px] font-semibold text-[#111118]">
                      {formatSalePrice(row.sellingPrice)}
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
          <ScrollTable minWidth={1100}>
            <div
              className={cn(
                GRID,
                "border-b border-[#ECECEA] bg-white px-4 py-2.5 text-[11px] font-semibold tracking-[0.04em] text-[#8A8A8A] uppercase",
              )}
            >
              <div>ID</div>
              <div>Photo</div>
              <div>Name / Description</div>
              <div>Category</div>
              <div>Sub-category</div>
              <div>Sale Price</div>
              <div>Source</div>
              <div>Distributor</div>
              <div />
            </div>

            {filtered.map((row, index) => {
              const isLast = index === filtered.length - 1;
              return (
                <div
                  key={row.id}
                  className={cn(
                    GRID,
                    "px-4 py-3.5",
                    !isLast && "border-b border-[#F0F0EE]",
                  )}
                >
                  <span className="w-fit rounded-full bg-[#F3F3F1] px-2 py-0.5 font-mono text-[11px] font-medium text-[#6B6B6B]">
                    {row.id}
                  </span>
                  <PhotoThumb item={row} />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-[#111118]">
                      {row.name}
                    </div>
                    <div className="mt-0.5">
                      <DescriptionHover description={row.description} />
                    </div>
                  </div>
                  <div className="text-[13px] text-[#111118]">{row.category}</div>
                  <div className="text-[13px] text-[#111118]">
                    {row.subcategory || "—"}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#111118]">
                      {formatSalePrice(row.sellingPrice)}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#8A8A8A]">
                      {row.singleItemUnit || "—"}
                    </div>
                  </div>
                  <div className="truncate text-[13px] text-[#111118]">
                    {row.source || "—"}
                  </div>
                  <div className="truncate text-[13px] text-[#111118]">
                    {row.distributor || "—"}
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className={LINK}
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </ScrollTable>
        </div>
      </div>

      <AddItemModal
        open={modalOpen}
        item={editing}
        onClose={closeModal}
        onSave={(item) => {
          setRows((current) => {
            if (editing) {
              return current.map((row) =>
                row.id === editing.id ? { ...item, id: editing.id } : row,
              );
            }
            return [{ ...item, id: nextItemId(current) }, ...current];
          });
        }}
      />
    </div>
  );
}

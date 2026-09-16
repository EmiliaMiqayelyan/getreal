import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Plus, Search } from "lucide-react";

import { AddItemModal } from "@/components/items/AddItemModal";
import { Header } from "@/components/layout/AdminHeader";
import { ExportButton } from "@/components/shared/ExportButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { Select } from "@/components/ui/Select";
import { SEARCH_ICON, SEARCH_INPUT, TABLE_HEADER } from "@/constants/table";
import { useAppCatalog } from "@/context/AppCatalogContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { isApiConfigured, productsApi } from "@/lib/api";
import { ITEM_CATEGORIES, type Item } from "@/types/item";
import { cn } from "@/utils/cn";
import {
  getItemDisplayName,
  getItemPrimaryPhoto,
  nextItemId,
} from "@/utils/items";

const EDIT_LINK =
  "cursor-pointer text-[13px] font-semibold text-[#2165D4] hover:underline";
const SECONDARY =
  "text-[12px] font-medium leading-[18px] text-[#6B718099]";
const VIEW_DESCRIPTION_LINK =
  "cursor-pointer border-0 bg-transparent p-0 text-left text-[12px] font-medium italic underline leading-[18px] text-[#6B718099] hover:opacity-80";
const BODY = "text-[13px] leading-[18px] font-medium text-[#111118]";
const ID_MONO =
  '"SF Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
const TABS = ["All", ...ITEM_CATEGORIES] as const;
type ItemTab = (typeof TABS)[number];

const GRID =
  "grid grid-cols-[100px_64px_1.5fr_0.9fr_0.95fr_0.85fr_1.1fr_1.1fr_minmax(48px,1fr)] items-center gap-3";

function formatSalePrice(value: number) {
  if (Number.isInteger(value)) return `$${value}`;
  return `$${value.toFixed(2)}`;
}

function SourceCell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className="h-6 w-px shrink-0 self-center bg-[#E0E0DC]"
        aria-hidden
      />
      <div className={cn(BODY, "min-w-0 truncate")}>{children}</div>
    </div>
  );
}

function DescriptionHover({ description }: { description: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const hideTimer = useRef(0);

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
    return <span className={SECONDARY}>—</span>;
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
        className={VIEW_DESCRIPTION_LINK}
        aria-haspopup="true"
        aria-expanded={open}
      >
        View description
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

function PhotoThumb({ item }: { item: Item }) {
  const src = getItemPrimaryPhoto(item);
  const hasUploadedPhoto = item.photos.length > 0;

  return (
    <div className="relative h-[51px] w-[53px] overflow-hidden rounded-[8px] bg-[#F3F3F1]">
      <img
        src={src}
        alt={getItemDisplayName(item)}
        className={cn(
          "size-full",
          hasUploadedPhoto ? "object-cover" : "object-contain p-1",
        )}
      />
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

  const { items: rows, setItems } = useAppCatalog();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [distributorFilter, setDistributorFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [tab, setTab] = useState<ItemTab>("All");
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
      const displayName = getItemDisplayName(row).toLowerCase();
      const matchesQuery =
        !normalized ||
        row.name.toLowerCase().includes(normalized) ||
        displayName.includes(normalized);
      const matchesCategory =
        tab === "All"
          ? !categoryFilter || row.category === categoryFilter
          : row.category === tab;
      const matchesDistributor =
        !distributorFilter || row.distributor === distributorFilter;
      const matchesSource = !sourceFilter || row.source === sourceFilter;
      return (
        matchesQuery &&
        matchesCategory &&
        matchesDistributor &&
        matchesSource
      );
    });
  }, [categoryFilter, distributorFilter, query, rows, sourceFilter, tab]);

  function selectTab(nextTab: ItemTab) {
    setTab(nextTab);
    setCategoryFilter(nextTab === "All" ? "" : nextTab);
  }

  function selectCategoryFilter(value: string) {
    setCategoryFilter(value);
    if (!value) {
      setTab("All");
      return;
    }
    if ((ITEM_CATEGORIES as readonly string[]).includes(value)) {
      setTab(value as ItemTab);
    }
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(item: Item) {
    const latest = rows.find((row) => row.id === item.id) ?? item;
    setEditing(latest);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleRemoveItem() {
    if (!editing) return;
    const id = editing.id;
    setItems((current) => current.filter((row) => row.id !== id));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <Header
        title="Items"
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <div className="relative w-full min-w-[160px] flex-1 sm:max-w-[220px] sm:flex-none">
              <Search size={14} className={SEARCH_ICON} />
              <Input
                inputSize="md"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name"
                aria-label="Search name"
                className={SEARCH_INPUT}
              />
            </div>

            <Select
              value={categoryFilter}
              onChange={selectCategoryFilter}
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

            <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:flex-nowrap">
              <ExportButton
                entityLabel="items"
                recordCount={filtered.length}
                filtersActive={Boolean(
                  query.trim() ||
                    categoryFilter ||
                    distributorFilter ||
                    sourceFilter ||
                    tab !== "All",
                )}
                className="w-full sm:w-auto"
              />
              <Button
                variant="primary"
                onClick={openCreate}
                className="w-full sm:w-auto"
              >
                <Plus size={14} />
                Add Item
              </Button>
            </div>
          </div>
        }
        below={
          <div className="flex gap-5 overflow-x-auto overflow-y-hidden border-b border-[#ECECEA] bg-white px-4 md:px-7">
            {TABS.map((entry) => {
              const active = tab === entry;
              return (
                <button
                  key={entry}
                  type="button"
                  onClick={() => selectTab(entry)}
                  className={cn(
                    "relative shrink-0 cursor-pointer px-0 pt-3 pb-3 text-[13px] font-medium transition-colors",
                    active
                      ? "text-[#111118]"
                      : "text-[#8A8A8A] hover:text-[#111118]",
                  )}
                >
                  {entry}
                  {active ? (
                    <span
                      className="absolute -bottom-px -left-1 -right-1 h-[3px] bg-badge"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        }
      />

      <div className="flex-1 overflow-auto px-4 py-5 md:px-7">
        <div className="space-y-2 md:hidden">
          {filtered.length === 0 ? (
            <div className="rounded-[12px] border border-[#ECECEA] bg-white px-4 py-10 text-center text-[13px] text-[#8A8A8A]">
              No items found
            </div>
          ) : null}
          {filtered.map((row) => (
            <div
              key={row.id}
              className="rounded-[12px] border border-[#ECECEA] bg-white p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <PhotoThumb item={row} />
                  <div className="min-w-0">
                    <span
                      className="rounded-[6px] bg-id-pill px-2 py-0.5 text-[11px] font-medium text-[#5A5A5A]"
                      style={{ fontFamily: ID_MONO }}
                    >
                      {row.id}
                    </span>
                    <div className={cn(BODY, "mt-2 font-semibold")}>
                      {getItemDisplayName(row)}
                    </div>
                    <div className="mt-1 text-[12px] text-[#6B6B6B]">
                      {row.category}
                      {row.subcategory ? ` · ${row.subcategory}` : ""}
                    </div>
                    <div className="mt-0.5 text-[13px] font-semibold text-[#111118]">
                      {formatSalePrice(row.sellingPrice)}
                    </div>
                    <div className={cn(SECONDARY, "mt-0.5")}>
                      {row.singleItemUnit || "—"}
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
          <ScrollTable minWidth={1100}>
            <div
              className={cn(
                GRID,
                TABLE_HEADER,
                "border-b border-[#ECECEA] bg-white px-4 py-2.5",
              )}
            >
              <div>Item ID</div>
              <div>Photo</div>
              <div>Name / Description</div>
              <div>Category</div>
              <div>Sub-Category</div>
              <div>Sale Price</div>
              <div className="min-w-0 truncate pl-[13px] text-[#111118]">Source</div>
              <div className="min-w-0 truncate text-[#111118]">Distributor</div>
              <div aria-hidden />
            </div>

            {filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-[13px] text-[#8A8A8A]">
                No items found
              </div>
            ) : null}

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
                  <span
                    className="inline-flex h-7 w-fit items-center rounded-[6px] bg-id-pill px-2 text-[11px] font-medium text-[#5A5A5A]"
                    style={{ fontFamily: ID_MONO }}
                  >
                    {row.id}
                  </span>
                  <PhotoThumb item={row} />
                  <div className="min-w-0">
                    <div className={cn(BODY, "truncate font-semibold")}>
                      {getItemDisplayName(row)}
                    </div>
                    <div className="mt-0.5">
                      <DescriptionHover description={row.description} />
                    </div>
                  </div>
                  <div className={cn(BODY, "min-w-0 truncate")}>{row.category}</div>
                  <div className={cn(BODY, "min-w-0 truncate")}>
                    {row.subcategory || "—"}
                  </div>
                  <div>
                    <div className={cn(BODY, "font-semibold")}>
                      {formatSalePrice(row.sellingPrice)}
                    </div>
                    <div className={cn(SECONDARY, "mt-0.5")}>
                      {row.singleItemUnit || "—"}
                    </div>
                  </div>
                  <SourceCell>{row.source || "—"}</SourceCell>
                  <div className={cn(BODY, "min-w-0 truncate")}>
                    {row.distributor || "—"}
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className={cn(EDIT_LINK, "justify-self-end")}
                    aria-label={`Edit ${getItemDisplayName(row)}`}
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
        onRemove={handleRemoveItem}
        onSave={(item) => {
          setItems((current) => {
            if (editing) {
              return current.map((row) =>
                row.id === editing.id
                  ? {
                      ...item,
                      id: editing.id,
                      sourceId: item.sourceId ?? editing.sourceId,
                      distributorId: item.distributorId ?? editing.distributorId,
                    }
                  : row,
              );
            }
            return [{ ...item, id: nextItemId(current) }, ...current];
          });

          if (isApiConfigured() && !editing) {
            void productsApi
              .create({
                name: item.name,
                categoryNames: [item.category, item.subcategory].filter(Boolean),
                type: item.category.toLowerCase(),
                price: Math.round(item.sellingPrice * 100),
                description: item.description,
              })
              .catch(() => {});
          }

          closeModal();
        }}
      />
    </div>
  );
}

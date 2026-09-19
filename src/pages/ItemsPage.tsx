import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";

import { AddItemModal } from "@/components/items/AddItemModal";
import { Header } from "@/components/layout/AdminHeader";
import { ExportButton } from "@/components/shared/ExportButton";
import { IdPill } from "@/components/ui/Badge";
import { AppLoader } from "@/components/ui/AppLoader";
import { Button } from "@/components/ui/Button";
import { EmptyStateBox } from "@/components/ui/EmptyStateBox";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { TABLE_HEADER } from "@/constants/table";
import { useAppCatalog } from "@/context/AppCatalogContext";
import { useApiFeedback } from "@/hooks/useApiFeedback";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { isApiConfigured, itemsApi, categoriesApi, downloadListExport } from "@/lib/api";
import { mapApiItemToItem } from "@/lib/api/mappers";
import { toCreateItemPayload } from "@/lib/api/payloads";
import type { ExportRequest } from "@/types/export";
import { ITEM_CATEGORIES, type Item } from "@/types/item";
import { cn } from "@/utils/cn";
import { apiId } from "@/utils/entityIds";
import {
  getItemDisplayName,
  getItemPrimaryPhoto,
  nextItemId,
} from "@/utils/items";
import { subcategoriesForCategory } from "@/utils/subcategories";
const EDIT_LINK =
  "cursor-pointer text-[13px] font-semibold text-[#2165D4] hover:underline";
const SECONDARY =
  "text-[12px] font-medium leading-[18px] text-[#6B718099]";
const VIEW_DESCRIPTION_LINK =
  "cursor-pointer border-0 bg-transparent p-0 text-left text-[12px] font-medium italic underline leading-[18px] text-[#6B718099] hover:opacity-80";
const BODY = "text-[13px] leading-[18px] font-medium text-[#111118]";
const TABS = ["All", ...ITEM_CATEGORIES] as const;
type ItemTab = (typeof TABS)[number];

const GRID =
  "grid grid-cols-[90px_64px_1.5fr_0.9fr_0.95fr_0.85fr_1.1fr_1.1fr_minmax(48px,1fr)] items-center gap-3";

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
          className="fixed z-50 w-[300px] max-h-[min(280px,calc(100dvh-24px))] overflow-y-auto rounded-[10px] border border-[#00000014] bg-white px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
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

  const {
    items: rows,
    setItems,
    categories,
    subcategoryRecords,
    subcategoriesByCategory,
    isBootstrapping,
  } = useAppCatalog();
  const { notifyApiError, showSuccess } = useApiFeedback();
  const [query, setQuery] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
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

  const activeCategory = tab === "All" ? "" : tab;

  const subcategoryOptions = useMemo(() => {
    if (activeCategory) {
      return subcategoriesForCategory(subcategoriesByCategory, activeCategory);
    }
    return Array.from(
      new Set(
        Object.values(subcategoriesByCategory).flatMap((names) => names),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [activeCategory, subcategoriesByCategory]);

  useEffect(() => {
    if (
      subcategoryFilter &&
      !subcategoryOptions.includes(subcategoryFilter)
    ) {
      setSubcategoryFilter("");
    }
  }, [subcategoryFilter, subcategoryOptions]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const displayName = getItemDisplayName(row).toLowerCase();
      const matchesQuery =
        !normalized ||
        row.name.toLowerCase().includes(normalized) ||
        displayName.includes(normalized);
      const matchesCategory = tab === "All" || row.category === tab;
      const matchesSubcategory =
        !subcategoryFilter || row.subcategory === subcategoryFilter;
      const matchesDistributor =
        !distributorFilter || row.distributor === distributorFilter;
      const matchesSource = !sourceFilter || row.source === sourceFilter;
      return (
        matchesQuery &&
        matchesCategory &&
        matchesSubcategory &&
        matchesDistributor &&
        matchesSource
      );
    });
  }, [
    distributorFilter,
    query,
    rows,
    sourceFilter,
    subcategoryFilter,
    tab,
  ]);

  function selectTab(nextTab: ItemTab) {
    setTab(nextTab);
    setSubcategoryFilter("");
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
    const previous = rows;
    setItems((current) => current.filter((row) => row.id !== id));
    if (isApiConfigured()) {
      void itemsApi.remove(apiId(editing)).catch((error) => {
        setItems(previous);
        notifyApiError(error, "Failed to delete item.");
      });
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
      <Header
        title="Items"
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <SearchField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search"
            />

            <Select
              value={subcategoryFilter}
              onChange={setSubcategoryFilter}
              className="w-full sm:w-[150px]"
              aria-label="Subcategory"
              placeholder="Subcategory"
              options={[
                { value: "", label: "Subcategory" },
                ...subcategoryOptions.map((subcategory) => ({
                  value: subcategory,
                  label: subcategory,
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
                    subcategoryFilter ||
                    distributorFilter ||
                    sourceFilter ||
                    tab !== "All",
                )}
                onExport={async (request: ExportRequest) => {
                  await downloadListExport(
                    "/items",
                    {},
                    request.format,
                    "items",
                  );
                }}
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
          <Tabs
            aria-label="Item categories"
            items={TABS.map((entry) => ({ id: entry, label: entry }))}
            value={tab}
            onChange={(id) => selectTab(id as ItemTab)}
          />
        }
      />

      <div className="flex-1 overflow-auto bg-[#FAFAFA] px-4 py-5 md:px-7">
        {isBootstrapping ? (
          <AppLoader variant="table" label="Loading items" />
        ) : (
          <>
        <div className="space-y-2 md:hidden">
          {filtered.length === 0 ? (
            <EmptyStateBox variant="solid" className="rounded-[12px] px-4 py-10 text-[13px]">
              No items found
            </EmptyStateBox>
          ) : null}
          {filtered.map((row) => (
            <div
              key={row.id}
              className="rounded-[12px] border border-[#00000014] bg-white p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <PhotoThumb item={row} />
                  <div className="min-w-0">
                    <IdPill>{row.id}</IdPill>
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
                "border-b border-[#00000014] bg-white px-4 py-2.5",
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
              <EmptyStateBox
                variant="solid"
                className="min-h-0 rounded-none border-0 px-4 py-10 text-[13px]"
              >
                No items found
              </EmptyStateBox>
            ) : null}

            {filtered.map((row, index) => {
              const isLast = index === filtered.length - 1;
              return (
                <div
                  key={row.id}
                  className={cn(
                    GRID,
                    "px-4 py-3.5",
                    !isLast && "border-b border-[#00000014]",
                  )}
                >
                  <IdPill>{row.id}</IdPill>
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
          </>
        )}
      </div>

      <AddItemModal
        open={modalOpen}
        item={editing}
        onClose={closeModal}
        onRemove={handleRemoveItem}
        onSave={(item) => {
          void (async () => {
            if (isApiConfigured()) {
              try {
                const categoryList =
                  categories.length > 0
                    ? categories
                    : await categoriesApi.list();
                const payload = toCreateItemPayload(
                  item,
                  categoryList,
                  subcategoryRecords,
                );
                const categoriesById = new Map(
                  categoryList
                    .filter((c) => c.id && c.name)
                    .map((c) => [c.id as string, c.name as string]),
                );
                const subcategoriesById = new Map(
                  subcategoryRecords
                    .filter((entry) => entry.id)
                    .map((entry) => [entry.id as string, entry.name] as const),
                );
                const distributorsById = new Map(
                  item.distributorId
                    ? [[item.distributorId, item.distributor]]
                    : [],
                );
                if (editing) {
                  const updated = await itemsApi.update(apiId(editing), payload);
                  const mapped = mapApiItemToItem(updated, 0, {
                    categoriesById,
                    distributorsById,
                    subcategoriesById,
                  });
                  setItems((current) =>
                    current.map((row) =>
                      row.id === editing.id
                        ? {
                            ...item,
                            ...mapped,
                            id: editing.id,
                            recordId: mapped.recordId ?? editing.recordId,
                            // Keep rich UI fields the API does not store yet.
                            merchandisingName: item.merchandisingName,
                            description: item.description,
                            subcategory: item.subcategory,
                            subcategoryId:
                              item.subcategoryId ?? mapped.subcategoryId,
                            source: item.source,
                            sourceId: item.sourceId,
                            sourcePer: item.sourcePer,
                            caseBy: item.caseBy,
                            pieceWeightOz: item.pieceWeightOz,
                            caseWeightLbs: item.caseWeightLbs,
                            singleItemUnit: item.singleItemUnit,
                            sellingPrice: item.sellingPrice,
                            photos: item.photos,
                            preorderInfo: item.preorderInfo,
                          }
                        : row,
                    ),
                  );
                } else {
                  const created = await itemsApi.create(payload);
                  const mapped = mapApiItemToItem(created, 0, {
                    categoriesById,
                    distributorsById,
                    subcategoriesById,
                  });
                  setItems((current) => [
                    {
                      ...item,
                      ...mapped,
                      merchandisingName: item.merchandisingName,
                      description: item.description,
                      subcategory: item.subcategory,
                      subcategoryId:
                        item.subcategoryId ?? mapped.subcategoryId,
                      source: item.source,
                      sourceId: item.sourceId,
                      sourcePer: item.sourcePer,
                      caseBy: item.caseBy,
                      pieceWeightOz: item.pieceWeightOz,
                      caseWeightLbs: item.caseWeightLbs,
                      singleItemUnit: item.singleItemUnit,
                      sellingPrice: item.sellingPrice,
                      photos: item.photos,
                      preorderInfo: item.preorderInfo,
                    },
                    ...current,
                  ]);
                }
                showSuccess(editing ? "Item updated." : "Item created.");
                closeModal();
                return;
              } catch (error) {
                notifyApiError(error, "Failed to save item.");
                return;
              }
            }

            setItems((current) => {
              if (editing) {
                return current.map((row) =>
                  row.id === editing.id
                    ? {
                        ...item,
                        id: editing.id,
                        sourceId: item.sourceId ?? editing.sourceId,
                        distributorId:
                          item.distributorId ?? editing.distributorId,
                      }
                    : row,
                );
              }
              return [{ ...item, id: nextItemId(current) }, ...current];
            });
            closeModal();
          })();
        }}
      />
    </div>
  );
}

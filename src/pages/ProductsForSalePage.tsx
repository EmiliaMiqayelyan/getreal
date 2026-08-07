import { useMemo, useState } from "react";
import {
  ChevronRight,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { UserMenu } from "@/components/layout/UserMenu";
import { Input } from "@/components/ui/Input";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { Select } from "@/components/ui/Select";
import { ADMIN_ITEMS } from "@/data/admin";
import { DISTRIBUTORS } from "@/constants/distributors";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { AdminItem, AdminItemCategory, AdminItemSupplier } from "@/types/admin";
import { cn } from "@/utils/cn";

const ORANGE = "#F57850";

const TOP_CATEGORIES: Record<string, AdminItemCategory[]> = {
  Protein: ["Meat", "Poultry", "Seafood", "Pork"],
  Produce: ["Vegetables", "Fruits"],
  Dairy: ["Dairy"],
  Pantry: ["Grain", "Specials"],
};

const CATEGORY_GROUPS = Object.entries(TOP_CATEGORIES).map(([title, categories]) => ({
  title,
  categories,
}));

const SUPPLIER_UNITS = ["Case/Box", "Pound", "Piece", "Bunch", "Gallon"] as const;
const SELLING_UNITS = [
  "Piece",
  "1lb",
  "8oz ea",
  "16oz ea",
  "6oz ea",
  "2 per pack",
  "3-4 lbs",
] as const;

type SupplierFormDraft = {
  id: string;
  supplierName: string;
  source: string;
  unit: string;
  priceOfUnit: string;
  qtyPerUnit: string;
  itemUnit: string;
};

type ItemFormState = {
  id?: string;
  name: string;
  sku: string;
  topCategory: string;
  category: AdminItemCategory;
  unit: string;
  sellingPrice: string;
  live: boolean;
  suppliers: SupplierFormDraft[];
  notes: string;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function topCategoryFor(sub: AdminItemCategory) {
  for (const [top, subs] of Object.entries(TOP_CATEGORIES)) {
    if (subs.includes(sub)) return top;
  }
  return "Protein";
}

function supplierToDraft(supplier: AdminItemSupplier): SupplierFormDraft {
  return {
    id: uid(),
    supplierName: supplier.supplierName,
    source: supplier.source,
    unit: "Case/Box",
    priceOfUnit: String(supplier.purchasePrice),
    qtyPerUnit: "1",
    itemUnit: supplier.itemUnit,
  };
}

function toFormState(item?: AdminItem): ItemFormState {
  if (!item) {
    return {
      name: "",
      sku: "",
      topCategory: "Protein",
      category: "Meat",
      unit: "Piece",
      sellingPrice: "",
      live: false,
      suppliers: [],
      notes: "",
    };
  }

  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    topCategory: topCategoryFor(item.category),
    category: item.category,
    unit: item.unit,
    sellingPrice: String(item.sellingPrice),
    live: item.live,
    suppliers: item.suppliers.map(supplierToDraft),
    notes: "",
  };
}

function netCost(priceOfUnit: string, qtyPerUnit: string) {
  const price = Number(priceOfUnit);
  const qty = Number(qtyPerUnit);
  if (!price || !qty) return 0;
  return price / qty;
}

function marginPercent(sellingPrice: number, cost: number) {
  if (!sellingPrice) return 0;
  return ((sellingPrice - cost) / sellingPrice) * 100;
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function currency(value: number, digits = 2) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function ItemModal({
  open,
  mode,
  draft,
  onClose,
  onChange,
  onSave,
  pendingDistributor,
  onPendingDistributorChange,
  onAddSupplier,
}: {
  open: boolean;
  mode: "create" | "edit";
  draft: ItemFormState;
  onClose: () => void;
  onChange: (next: ItemFormState) => void;
  onSave: () => void;
  pendingDistributor: string;
  onPendingDistributorChange: (value: string) => void;
  onAddSupplier: () => void;
}) {
  if (!open) return null;

  const sellingPrice = Number(draft.sellingPrice) || 0;
  const subcategoryOptions = TOP_CATEGORIES[draft.topCategory] ?? [];
  const canSave =
    draft.name.trim() &&
    draft.sku.trim() &&
    draft.unit.trim() &&
    draft.sellingPrice.trim() &&
    !Number.isNaN(sellingPrice);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close dialog overlay"
        className="absolute inset-0 bg-[#333333]/70"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex w-full max-w-[640px] flex-col overflow-hidden rounded-[12px] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#F0F0EE] px-6 py-4">
          <h2 className="text-[18px] font-semibold text-[#2E2E2E]">
            {mode === "create" ? "Create a New Product" : "Edit Item"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-[#8A8A8A] hover:bg-[#F5F5F3]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto px-6 py-5">
          <section>
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
              Product Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[#2E2E2E]">
                  Item Name
                </label>
                <Input
                  value={draft.name}
                  onChange={(event) =>
                    onChange({ ...draft, name: event.target.value })
                  }
                  placeholder="e.g., Beef Ribeye Steak"
                  className="h-[36px] rounded-[8px] border-[#E6E6E3] text-[13px]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[#2E2E2E]">
                  SKU #
                </label>
                <Input
                  value={draft.sku}
                  onChange={(event) =>
                    onChange({ ...draft, sku: event.target.value })
                  }
                  placeholder="e.g., BEEF-RIB-001"
                  className="h-[36px] rounded-[8px] border-[#E6E6E3] text-[13px]"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#2E2E2E]">
                    Category
                  </label>
                  <Select
                    value={draft.topCategory}
                    onChange={(top) => {
                      const firstSub = TOP_CATEGORIES[top]?.[0] ?? "Meat";
                      onChange({
                        ...draft,
                        topCategory: top,
                        category: firstSub,
                      });
                    }}
                    className="w-full"
                    aria-label="Category"
                    options={Object.keys(TOP_CATEGORIES).map((category) => ({
                      value: category,
                      label: category,
                    }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#2E2E2E]">
                    Subcategory
                  </label>
                  <Select
                    value={draft.category}
                    onChange={(value) =>
                      onChange({
                        ...draft,
                        category: value as AdminItemCategory,
                      })
                    }
                    className="w-full"
                    aria-label="Subcategory"
                    options={subcategoryOptions.map((category) => ({
                      value: category,
                      label: category,
                    }))}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#2E2E2E]">
                    Selling Unit
                  </label>
                  <Select
                    value={draft.unit}
                    onChange={(value) => onChange({ ...draft, unit: value })}
                    className="w-full"
                    aria-label="Selling Unit"
                    options={SELLING_UNITS.map((unit) => ({
                      value: unit,
                      label: unit,
                    }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#2E2E2E]">
                    Selling Price
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-[#8A8A8A]">
                      $
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.sellingPrice}
                      onChange={(event) =>
                        onChange({ ...draft, sellingPrice: event.target.value })
                      }
                      placeholder="0.00"
                      className="h-[36px] rounded-[8px] border-[#E6E6E3] pl-7 text-[13px]"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-[8px] border border-[#ECECEA] bg-[#FAFAF8] px-4 py-3">
                <div>
                  <div className="text-[13px] font-medium text-[#2E2E2E]">
                    Publish Live to App
                  </div>
                  <div className="text-[12px] text-[#8A8A8A]">
                    This item will be visible to customers.
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Toggle publish live"
                  onClick={() => onChange({ ...draft, live: !draft.live })}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 rounded-full transition",
                    draft.live ? "bg-[#3CB371]" : "bg-[#D1D1CF]",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block size-5 translate-y-0.5 rounded-full bg-white transition",
                      draft.live ? "translate-x-5" : "translate-x-0.5",
                    )}
                  />
                </button>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
              Item Suppliers
            </h3>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[200px] flex-1">
                <label className="mb-1 block text-[12px] font-medium text-[#2E2E2E]">
                  Add Distributor
                </label>
                <Select
                  value={pendingDistributor}
                  onChange={onPendingDistributorChange}
                  className="w-full"
                  aria-label="Add Distributor"
                  options={[
                    { value: "", label: "Select" },
                    ...DISTRIBUTORS.map((distributor) => ({
                      value: distributor.name,
                      label: distributor.name,
                    })),
                  ]}
                />
              </div>
              <button
                type="button"
                onClick={onAddSupplier}
                disabled={!pendingDistributor}
                className="inline-flex h-[36px] items-center gap-1 rounded-[8px] px-3.5 text-[13px] font-medium text-white disabled:opacity-50"
                style={{ background: ORANGE }}
              >
                <Plus size={14} /> Add
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {draft.suppliers.map((supplier) => {
                const cost = netCost(supplier.priceOfUnit, supplier.qtyPerUnit);
                const margin = marginPercent(sellingPrice, cost);

                return (
                  <div
                    key={supplier.id}
                    className="rounded-[10px] border border-[#ECECEA] bg-[#FAFAF8] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[14px] font-semibold text-[#2E2E2E]">
                        {supplier.supplierName}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${supplier.supplierName}`}
                        onClick={() =>
                          onChange({
                            ...draft,
                            suppliers: draft.suppliers.filter(
                              (entry) => entry.id !== supplier.id,
                            ),
                          })
                        }
                        className="rounded-md p-1 text-[#8A8A8A] hover:bg-white hover:text-[#E25B5B]"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                          Source Name
                        </label>
                        <Input
                          value={supplier.source}
                          onChange={(event) =>
                            onChange({
                              ...draft,
                              suppliers: draft.suppliers.map((entry) =>
                                entry.id === supplier.id
                                  ? { ...entry, source: event.target.value }
                                  : entry,
                              ),
                            })
                          }
                          className="h-[36px] rounded-[8px] border-[#E6E6E3] bg-white text-[13px]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                          Unit
                        </label>
                        <Select
                          value={supplier.unit}
                          onChange={(value) =>
                            onChange({
                              ...draft,
                              suppliers: draft.suppliers.map((entry) =>
                                entry.id === supplier.id
                                  ? { ...entry, unit: value }
                                  : entry,
                              ),
                            })
                          }
                          className="w-full"
                          aria-label="Unit"
                          options={SUPPLIER_UNITS.map((unit) => ({
                            value: unit,
                            label: unit,
                          }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                          Price of Unit
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-[#8A8A8A]">
                            $
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={supplier.priceOfUnit}
                            onChange={(event) =>
                              onChange({
                                ...draft,
                                suppliers: draft.suppliers.map((entry) =>
                                  entry.id === supplier.id
                                    ? {
                                        ...entry,
                                        priceOfUnit: event.target.value,
                                      }
                                    : entry,
                                ),
                              })
                            }
                            className="h-[36px] rounded-[8px] border-[#E6E6E3] bg-white pl-7 text-[13px]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                          QTY per Unit
                        </label>
                        <Input
                          type="number"
                          min="1"
                          value={supplier.qtyPerUnit}
                          onChange={(event) =>
                            onChange({
                              ...draft,
                              suppliers: draft.suppliers.map((entry) =>
                                entry.id === supplier.id
                                  ? { ...entry, qtyPerUnit: event.target.value }
                                  : entry,
                              ),
                            })
                          }
                          className="h-[36px] rounded-[8px] border-[#E6E6E3] bg-white text-[13px]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                          Net Cost
                        </label>
                        <Input
                          readOnly
                          value={cost.toFixed(2)}
                          className="h-[36px] rounded-[8px] border-[#E6E6E3] bg-[#F3F3F1] text-[13px] text-[#6B6B6B]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                          Item Unit
                        </label>
                        <Select
                          value={supplier.itemUnit}
                          onChange={(value) =>
                            onChange({
                              ...draft,
                              suppliers: draft.suppliers.map((entry) =>
                                entry.id === supplier.id
                                  ? { ...entry, itemUnit: value }
                                  : entry,
                              ),
                            })
                          }
                          className="w-full"
                          aria-label="Item Unit"
                          options={SELLING_UNITS.map((unit) => ({
                            value: unit,
                            label: unit,
                          }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                          Margin %
                        </label>
                        <Input
                          readOnly
                          value={margin.toFixed(1)}
                          className="h-[36px] rounded-[8px] border-[#E6E6E3] bg-[#F3F3F1] text-[13px] text-[#6B6B6B]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                          Calculated Price
                        </label>
                        <Input
                          readOnly
                          value={sellingPrice.toFixed(2)}
                          className="h-[36px] rounded-[8px] border-[#E6E6E3] bg-[#F3F3F1] text-[13px] text-[#6B6B6B]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between border-t border-[#F0F0EE] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] font-medium text-[#8A8A8A]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className={cn(
              "h-[36px] rounded-[8px] px-5 text-[13px] font-medium text-white",
              canSave ? "bg-[#242424]" : "bg-[#C8C8C6]",
            )}
          >
            {mode === "create" ? "Create Item" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

const ROW_GRID =
  "grid grid-cols-[28px_72px_56px_minmax(0,1.4fr)_100px_100px] items-center gap-2";

const SUPPLIER_GRID =
  "grid grid-cols-[28px_72px_minmax(0,1fr)_minmax(0,1fr)_120px_90px_100px_90px_110px] items-center gap-2";

export default function ProductsForSalePage() {
  useDocumentTitle("Products For Sale");

  const [items, setItems] = useState<AdminItem[]>(ADMIN_ITEMS);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["I001"]));
  const [query, setQuery] = useState("");
  const [liveFilter, setLiveFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [draft, setDraft] = useState<ItemFormState>(toFormState());
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDistributor, setPendingDistributor] = useState("");

  const unitOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.unit))).sort(),
    [items],
  );

  const supplierOptions = useMemo(
    () =>
      Array.from(
        new Set(
          items.flatMap((item) =>
            item.suppliers.map((supplier) => supplier.supplierName),
          ),
        ),
      ).sort(),
    [items],
  );

  const categoryOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.category))).sort(),
    [items],
  );

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery =
        !normalized ||
        item.id.toLowerCase().includes(normalized) ||
        item.name.toLowerCase().includes(normalized) ||
        item.sku.toLowerCase().includes(normalized) ||
        item.suppliers.some(
          (supplier) =>
            supplier.supplierName.toLowerCase().includes(normalized) ||
            supplier.source.toLowerCase().includes(normalized),
        );

      const matchesLive =
        !liveFilter ||
        (liveFilter === "live" && item.live) ||
        (liveFilter === "hidden" && !item.live);

      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      const matchesUnit = !unitFilter || item.unit === unitFilter;
      const matchesSupplier =
        !supplierFilter ||
        item.suppliers.some((supplier) => supplier.supplierName === supplierFilter);

      return (
        matchesQuery &&
        matchesLive &&
        matchesCategory &&
        matchesUnit &&
        matchesSupplier
      );
    });
  }, [
    categoryFilter,
    items,
    liveFilter,
    query,
    supplierFilter,
    unitFilter,
  ]);

  function toggleRow(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreateModal() {
    setDraft(toFormState());
    setPendingDistributor("");
    setModalMode("create");
    setModalOpen(true);
  }

  function openEditModal(item: AdminItem) {
    setDraft(toFormState(item));
    setPendingDistributor("");
    setModalMode("edit");
    setModalOpen(true);
  }

  function addSupplier() {
    if (!pendingDistributor) return;
    if (draft.suppliers.some((s) => s.supplierName === pendingDistributor)) {
      setPendingDistributor("");
      return;
    }

    const distributor = DISTRIBUTORS.find((d) => d.name === pendingDistributor);
    setDraft((current) => ({
      ...current,
      suppliers: [
        ...current.suppliers,
        {
          id: uid(),
          supplierName: pendingDistributor,
          source: distributor?.contact ?? "",
          unit: "Case/Box",
          priceOfUnit: "",
          qtyPerUnit: "1",
          itemUnit: current.unit,
        },
      ],
    }));
    setPendingDistributor("");
  }

  function saveItem() {
    const sellingPrice = Number(draft.sellingPrice);
    if (
      !draft.name.trim() ||
      !draft.sku.trim() ||
      !draft.unit.trim() ||
      Number.isNaN(sellingPrice)
    ) {
      return;
    }

    const suppliers: AdminItemSupplier[] = draft.suppliers.map((supplier) => ({
      supplierName: supplier.supplierName,
      source: supplier.source.trim(),
      quantity: Number(supplier.qtyPerUnit) || 0,
      purchasePrice: netCost(supplier.priceOfUnit, supplier.qtyPerUnit),
      lastDelivered: new Date().toISOString().slice(0, 10),
      itemUnit: supplier.itemUnit,
    }));

    setItems((current) => {
      if (draft.id) {
        return current.map((item) =>
          item.id === draft.id
            ? {
                ...item,
                name: draft.name.trim(),
                sku: draft.sku.trim(),
                category: draft.category,
                unit: draft.unit,
                sellingPrice,
                live: draft.live,
                suppliers,
              }
            : item,
        );
      }

      const nextId = `I${String(current.length + 1).padStart(3, "0")}`;
      return [
        {
          id: nextId,
          name: draft.name.trim(),
          sku: draft.sku.trim(),
          category: draft.category,
          unit: draft.unit,
          sellingPrice,
          totalQuantity: 0,
          live: draft.live,
          suppliers,
        },
        ...current,
      ];
    });

    setModalOpen(false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F5F5F3]">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white px-4 md:px-7 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#2E2E2E]">
            Products For Sale
          </h1>
          <UserMenu showAvatar className="items-center" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-[220px]">
            <Search
              size={13}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#A9A9A9]"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ID, name, distributor"
              className="h-[34px] rounded-[8px] border-[#E6E6E3] bg-white pl-8 text-[13px]"
            />
          </div>

          <Select
            value={liveFilter}
            onChange={setLiveFilter}
            aria-label="All Items"
            options={[
              { value: "", label: "All Items" },
              { value: "live", label: "Live" },
              { value: "hidden", label: "Hidden" },
            ]}
          />
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            aria-label="All Categories"
            options={[
              { value: "", label: "All Categories" },
              ...categoryOptions.map((category) => ({
                value: category,
                label: category,
              })),
            ]}
          />
          <Select
            value={unitFilter}
            onChange={setUnitFilter}
            aria-label="All Units"
            options={[
              { value: "", label: "All Units" },
              ...unitOptions.map((unit) => ({ value: unit, label: unit })),
            ]}
          />
          <Select
            value={supplierFilter}
            onChange={setSupplierFilter}
            aria-label="All Suppliers"
            options={[
              { value: "", label: "All Suppliers" },
              ...supplierOptions.map((supplier) => ({
                value: supplier,
                label: supplier,
              })),
            ]}
          />

          <button
            type="button"
            onClick={openCreateModal}
            className="ml-auto inline-flex h-[34px] items-center gap-1.5 rounded-[8px] px-3.5 text-[13px] font-medium text-white"
            style={{ background: ORANGE }}
          >
            <Plus size={14} /> Add Item
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 md:px-7 py-5">
        <div className="space-y-6">
          {CATEGORY_GROUPS.map(({ title, categories }) => {
            const groupItems = filteredItems.filter((item) =>
              categories.includes(item.category),
            );
            if (!groupItems.length) return null;

            return (
              <section key={title}>
                <h2 className="mb-3 text-[20px] font-semibold text-[#2E2E2E]">
                  {title}
                </h2>
                <div className="space-y-4">
                  {categories.map((subcategory) => {
                    const subItems = groupItems.filter(
                      (item) => item.category === subcategory,
                    );
                    if (!subItems.length) return null;

                    return (
                      <div
                        key={subcategory}
                        className="overflow-hidden rounded-[10px] border border-[#ECECEA] bg-white"
                      >
                        <div className="border-b border-[#F0F0EE] px-4 py-3 text-[14px] font-semibold text-[#2E2E2E]">
                          {subcategory}
                        </div>

                        <ScrollTable minWidth={720} bare className="rounded-none border-0">
                          <div
                            className={cn(
                              ROW_GRID,
                              "border-b border-[#F0F0EE] bg-[#FAFAF8] px-3 py-2 text-[10px] font-semibold tracking-[0.04em] text-[#8A8A8A] uppercase",
                            )}
                          >
                            <div />
                            <div>ID</div>
                            <div>Live</div>
                            <div>Item Name</div>
                            <div>Unit</div>
                            <div>Unit Cost</div>
                          </div>

                          {subItems.map((item, index) => {
                            const open = expanded.has(item.id);
                            const isLast = index === subItems.length - 1;

                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  !isLast || open
                                    ? "border-b border-[#F3F3F1]"
                                    : "",
                                )}
                              >
                                <div className={cn(ROW_GRID, "px-3 py-3")}>
                                  <button
                                    type="button"
                                    onClick={() => toggleRow(item.id)}
                                    className="flex justify-center text-[#8A8A8A]"
                                    aria-label={`${open ? "Collapse" : "Expand"} ${item.name}`}
                                  >
                                    <ChevronRight
                                      size={14}
                                      className={cn(
                                        "transition-transform",
                                        open && "rotate-90 text-[#F57850]",
                                      )}
                                    />
                                  </button>
                                  <span className="rounded-[6px] bg-[#F3F3F1] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#6B6B6B]">
                                    {item.id}
                                  </span>
                                  <div>
                                    <button
                                      type="button"
                                      aria-label={`Toggle ${item.name} live state`}
                                      onClick={() =>
                                        setItems((current) =>
                                          current.map((entry) =>
                                            entry.id === item.id
                                              ? { ...entry, live: !entry.live }
                                              : entry,
                                          ),
                                        )
                                      }
                                      className={cn(
                                        "relative inline-flex h-5 w-9 rounded-full transition",
                                        item.live ? "bg-[#F57850]" : "bg-[#D1D1CF]",
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "inline-block size-4 translate-y-0.5 rounded-full bg-white transition",
                                          item.live
                                            ? "translate-x-4"
                                            : "translate-x-0.5",
                                        )}
                                      />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(item)}
                                    className="truncate text-left text-[13px] font-semibold text-[#2E2E2E] hover:text-[#F57850]"
                                  >
                                    {item.name}
                                  </button>
                                  <div className="text-[13px] text-[#2E2E2E]">
                                    {item.unit}
                                  </div>
                                  <div className="text-[13px] font-semibold text-[#2E2E2E]">
                                    {currency(item.sellingPrice, 0)}
                                  </div>
                                </div>

                                {open ? (
                                  <div className="border-t border-[#ECECEA] bg-[#F5F5F3]">
                                    <div className="overflow-x-auto">
                                      <div className="min-w-[920px]">
                                        <div
                                          className={cn(
                                            SUPPLIER_GRID,
                                            "border-b border-[#ECECEA] bg-[#EEEDEB] px-3 py-2 text-[10px] font-semibold tracking-[0.04em] text-[#8A8A8A] uppercase",
                                          )}
                                        >
                                          <div />
                                          <div />
                                          <div>Distributor</div>
                                          <div>Source</div>
                                          <div>Qty / Last Delivered</div>
                                          <div>Item Unit</div>
                                          <div>Purchase Price</div>
                                          <div>Margin</div>
                                          <div>Unit Cost</div>
                                        </div>

                                        {item.suppliers.length ? (
                                          item.suppliers.map((supplier, supplierIndex) => {
                                            const margin = marginPercent(
                                              item.sellingPrice,
                                              supplier.purchasePrice,
                                            );
                                            const markup =
                                              item.sellingPrice - supplier.purchasePrice;

                                            return (
                                              <div
                                                key={`${item.id}-${supplier.supplierName}-${supplierIndex}`}
                                                className={cn(
                                                  SUPPLIER_GRID,
                                                  "px-3 py-3 text-[12px] text-[#2E2E2E]",
                                                  supplierIndex <
                                                    item.suppliers.length - 1
                                                    ? "border-b border-[#ECECEA]"
                                                    : "",
                                                )}
                                              >
                                                <div />
                                                <div />
                                                <div className="font-medium">
                                                  {supplier.supplierName}
                                                </div>
                                                <div>{supplier.source}</div>
                                                <div>
                                                  <div>{supplier.quantity}</div>
                                                  <div className="text-[11px] text-[#8A8A8A]">
                                                    {formatDate(supplier.lastDelivered)}
                                                  </div>
                                                </div>
                                                <div>{supplier.itemUnit}</div>
                                                <div>
                                                  {currency(supplier.purchasePrice)}
                                                </div>
                                                <div>{margin.toFixed(1)}%</div>
                                                <div>
                                                  <span className="text-[#F57850]">
                                                    +{currency(markup)}
                                                  </span>
                                                  <span className="text-[#8A8A8A]">
                                                    {" "}
                                                    / {currency(item.sellingPrice)}
                                                  </span>
                                                </div>
                                              </div>
                                            );
                                          })
                                        ) : (
                                          <div className="px-4 py-4 text-[13px] text-[#8A8A8A]">
                                            No supplier pricing has been attached yet.
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </ScrollTable>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {!filteredItems.length ? (
            <div className="rounded-[10px] border border-[#ECECEA] bg-white px-6 py-12 text-center text-[14px] text-[#8A8A8A]">
              No products match your filters.
            </div>
          ) : null}
        </div>
      </div>

      <ItemModal
        open={modalOpen}
        mode={modalMode}
        draft={draft}
        onClose={() => setModalOpen(false)}
        onChange={setDraft}
        onSave={saveItem}
        pendingDistributor={pendingDistributor}
        onPendingDistributorChange={setPendingDistributor}
        onAddSupplier={addSupplier}
      />
    </div>
  );
}

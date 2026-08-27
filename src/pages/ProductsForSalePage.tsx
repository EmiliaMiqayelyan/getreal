import { useMemo, useState } from "react";
import { GripVertical, Search, X } from "lucide-react";

import { AddProductForSaleModal } from "@/components/products/AddProductForSaleModal";
import { UserMenu } from "@/components/layout/UserMenu";
import { Input } from "@/components/ui/Input";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { Select } from "@/components/ui/Select";
import { ITEMS } from "@/constants/items";
import {
  nextProductId,
  productFromItem,
  PRODUCTS_FOR_SALE,
} from "@/constants/productsForSale";
import { SOURCES } from "@/constants/sources";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { Item } from "@/types/item";
import {
  PRODUCT_TABS,
  type ProductForSale,
  type ProductTab,
} from "@/types/productForSale";
import { cn } from "@/utils/cn";

const ORANGE = "#F57850";
const LINK = "text-[13px] font-medium text-[#3B7DC4] hover:underline";

const GRID =
  "grid grid-cols-[28px_88px_72px_1.4fr_1fr_88px_1.1fr_100px] items-center gap-3";

function formatSalePrice(value: number) {
  if (Number.isInteger(value)) return `$${value}`;
  return `$${value.toFixed(2)}`;
}

function sourceLogo(name: string) {
  return SOURCES.find((s) => s.name === name)?.logoUrl ?? null;
}

function LiveToggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full p-[2px] transition-colors",
        on ? "bg-[#F57850]" : "bg-[#D0D0CC]",
      )}
    >
      <span
        className={cn(
          "block h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform",
          on ? "translate-x-[18px]" : "translate-x-0",
        )}
      />
    </button>
  );
}

function ProductDetailDrawer({
  product,
  onClose,
}: {
  product: ProductForSale;
  onClose: () => void;
}) {
  const logo = sourceLogo(product.source);

  return (
    <aside className="absolute inset-y-0 right-0 z-50 flex w-full max-w-[600px] flex-col border-l border-[#ECECEA] bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <span className="rounded-full bg-[#F0F0EE] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#6A6A6A]">
          {product.id}
        </span>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="rounded-md p-1 text-[#8A8A8A] hover:bg-[#F5F5F3] hover:text-[#111118]"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <h2 className="text-[22px] leading-snug font-semibold text-[#111118]">
          {product.merchandisingName}
        </h2>

        <div className="mt-4 flex items-center gap-2.5">
          {logo ? (
            <img
              src={logo}
              alt=""
              className="size-9 rounded-[8px] object-cover"
            />
          ) : (
            <div className="flex size-9 items-center justify-center rounded-[8px] bg-[#2F6B4F] text-[11px] font-bold text-white">
              {product.source.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-[13px] font-semibold text-[#111118]">
              {product.source}
            </div>
            <div className="text-[10px] font-semibold tracking-[0.08em] text-[#8A8A8A] uppercase">
              Source
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-[#ECECEA] pt-4 text-[15px] font-semibold text-[#111118]">
          {formatSalePrice(product.salesPrice)}
          <span className="font-normal text-[#6A6A6A]">
            {" "}
            · {product.unitOfSales}
          </span>
        </div>

        {product.photos.length > 0 ? (
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {product.photos.slice(0, 3).map((photo) => (
              <div
                key={photo.id}
                className="aspect-square overflow-hidden rounded-[10px] bg-[#F3F3F1]"
              >
                <img
                  src={photo.url}
                  alt=""
                  className="size-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : null}

        {product.description.trim() ? (
          <p className="mt-5 text-[13px] leading-relaxed whitespace-pre-line text-[#4A4A4A]">
            {product.description}
          </p>
        ) : null}
      </div>
    </aside>
  );
}

function SubcategoryTable({
  title,
  rows,
  onToggleLive,
  onView,
  onEdit,
}: {
  title: string;
  rows: ProductForSale[];
  onToggleLive: (id: string, live: boolean) => void;
  onView: (row: ProductForSale) => void;
  onEdit: (row: ProductForSale) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-[10px] border border-[#ECECEA] bg-white">
      <div className="border-b border-[#ECECEA] px-4 py-3">
        <h3 className="text-[14px] font-semibold text-[#111118]">{title}</h3>
      </div>
      <ScrollTable>
        <div
          className={cn(
            GRID,
            "border-b border-[#ECECEA] bg-[#FAFAF8] px-4 py-2.5 text-[10px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase",
          )}
        >
          <span />
          <span>ID</span>
          <span>Live</span>
          <span>Merchandising Name</span>
          <span>Source</span>
          <span>Sales Price</span>
          <span>Unit of Sales</span>
          <span />
        </div>
        {rows.map((row) => (
          <div
            key={row.id}
            className={cn(
              GRID,
              "border-b border-[#F0F0EE] px-4 py-3 last:border-b-0",
            )}
          >
            <button
              type="button"
              className="cursor-grab text-[#C0C0BC] active:cursor-grabbing"
              aria-label="Reorder"
            >
              <GripVertical className="size-4" />
            </button>
            <span className="w-fit rounded-full bg-[#F0F0EE] px-2 py-0.5 text-[11px] font-medium text-[#6A6A6A]">
              {row.id}
            </span>
            <LiveToggle
              on={row.live}
              onChange={(live) => onToggleLive(row.id, live)}
            />
            <span className="truncate text-[13px] font-medium text-[#111118]">
              {row.merchandisingName}
            </span>
            <span className="truncate text-[13px] text-[#4A4A4A]">
              {row.source}
            </span>
            <span className="text-[13px] text-[#111118]">
              {formatSalePrice(row.salesPrice)}
            </span>
            <span className="truncate text-[13px] text-[#4A4A4A]">
              {row.unitOfSales}
            </span>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className={LINK}
                onClick={() => onView(row)}
              >
                View
              </button>
              <button
                type="button"
                className={LINK}
                onClick={() => onEdit(row)}
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </ScrollTable>
    </div>
  );
}

export default function ProductsForSalePage() {
  useDocumentTitle("Products For Sale");

  const [products, setProducts] = useState<ProductForSale[]>(PRODUCTS_FOR_SALE);
  const [catalog] = useState<Item[]>(ITEMS);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [distributor, setDistributor] = useState("");
  const [source, setSource] = useState("");
  const [tab, setTab] = useState<ProductTab>("All");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProductForSale | null>(null);
  const [viewing, setViewing] = useState<ProductForSale | null>(null);

  const categoryOptions = useMemo(
    () => Array.from(new Set(catalog.map((i) => i.category))).sort(),
    [catalog],
  );
  const distributorOptions = useMemo(
    () => Array.from(new Set(catalog.map((i) => i.distributor))).sort(),
    [catalog],
  );
  const sourceOptions = useMemo(
    () => Array.from(new Set(catalog.map((i) => i.source))).sort(),
    [catalog],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((row) => {
      if (tab !== "All" && row.category !== tab) return false;
      if (category && row.category !== category) return false;
      if (distributor && row.distributor !== distributor) return false;
      if (source && row.source !== source) return false;
      if (
        q &&
        !row.merchandisingName.toLowerCase().includes(q) &&
        !row.id.toLowerCase().includes(q) &&
        !row.source.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [products, search, tab, category, distributor, source]);

  const grouped = useMemo(() => {
    const byCategory = new Map<string, Map<string, ProductForSale[]>>();
    for (const row of filtered) {
      if (!byCategory.has(row.category)) {
        byCategory.set(row.category, new Map());
      }
      const bySub = byCategory.get(row.category)!;
      if (!bySub.has(row.subcategory)) bySub.set(row.subcategory, []);
      bySub.get(row.subcategory)!.push(row);
    }
    return byCategory;
  }, [filtered]);

  const excludedItemIds = useMemo(() => {
    const set = new Set(products.map((p) => p.itemId));
    if (editTarget) set.delete(editTarget.itemId);
    return set;
  }, [products, editTarget]);

  function toggleLive(id: string, live: boolean) {
    setProducts((prev) =>
      prev.map((row) => (row.id === id ? { ...row, live } : row)),
    );
  }

  function handleAdd(item: Item) {
    if (editTarget) {
      setProducts((prev) =>
        prev.map((row) =>
          row.id === editTarget.id
            ? { ...productFromItem(item, row.id), live: row.live }
            : row,
        ),
      );
      setEditTarget(null);
      if (viewing?.id === editTarget.id) {
        setViewing({
          ...productFromItem(item, editTarget.id),
          live: editTarget.live,
        });
      }
      return;
    }
    setProducts((prev) => [...prev, productFromItem(item, nextProductId(prev))]);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F3F3F1]">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white px-8 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-semibold tracking-tight text-[#111118]">
            Products For Sale
          </h1>
          <UserMenu showAvatar className="items-center" />
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-3 px-8 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#9A9A96]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name"
              className="h-10 border-[#E4E4E0] bg-white pl-9"
            />
          </div>
          <Select
            value={category}
            onChange={setCategory}
            placeholder="Category"
            className="w-[150px]"
            options={[
              { value: "", label: "Category" },
              ...categoryOptions.map((name) => ({ value: name, label: name })),
            ]}
          />
          <Select
            value={distributor}
            onChange={setDistributor}
            placeholder="Distributor"
            className="w-[160px]"
            options={[
              { value: "", label: "Distributor" },
              ...distributorOptions.map((name) => ({
                value: name,
                label: name,
              })),
            ]}
          />
          <Select
            value={source}
            onChange={setSource}
            placeholder="Source"
            className="w-[160px]"
            options={[
              { value: "", label: "Source" },
              ...sourceOptions.map((name) => ({ value: name, label: name })),
            ]}
          />
          <button
            type="button"
            onClick={() => {
              setEditTarget(null);
              setAddOpen(true);
            }}
            className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-[8px] px-4 text-[14px] font-semibold text-white"
            style={{ backgroundColor: ORANGE }}
          >
            + Add Product for Sale
          </button>
        </div>

        <div className="flex gap-6 border-b border-[#E4E4E0] px-8">
          {PRODUCT_TABS.map((name) => {
            const active = tab === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setTab(name)}
                className={cn(
                  "relative pb-3 text-[14px] font-medium transition-colors",
                  active
                    ? "text-[#111118]"
                    : "text-[#8A8A8A] hover:text-[#4A4A4A]",
                )}
              >
                {name}
                {active ? (
                  <span
                    className="absolute right-0 bottom-0 left-0 h-[2px] rounded-full"
                    style={{ backgroundColor: ORANGE }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-5">
          {filtered.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-[#DCDCD8] bg-white px-6 py-16 text-center text-[14px] text-[#8A8A8A]">
              No products for sale match your filters.
            </div>
          ) : (
            <div className="space-y-8">
              {Array.from(grouped.entries()).map(([cat, bySub]) => (
                <section key={cat}>
                  <h2 className="mb-3 text-[18px] font-semibold text-[#111118]">
                    {cat}
                  </h2>
                  <div className="space-y-4">
                    {Array.from(bySub.entries()).map(([sub, rows]) => (
                      <SubcategoryTable
                        key={`${cat}-${sub}`}
                        title={sub}
                        rows={rows}
                        onToggleLive={toggleLive}
                        onView={setViewing}
                        onEdit={(row) => {
                          setEditTarget(row);
                          setAddOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <AddProductForSaleModal
          open={addOpen}
          onClose={() => {
            setAddOpen(false);
            setEditTarget(null);
          }}
          onAdd={handleAdd}
          catalog={catalog}
          excludedItemIds={excludedItemIds}
          initialItemId={editTarget?.itemId}
        />

        {viewing ? (
          <ProductDetailDrawer
            product={viewing}
            onClose={() => setViewing(null)}
          />
        ) : null}
      </div>
    </div>
  );
}

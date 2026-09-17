import { useMemo, useState, type DragEvent } from "react";
import { Plus, Search, X } from "lucide-react";

import { AddProductForSaleModal } from "@/components/products/AddProductForSaleModal";
import { Header } from "@/components/layout/AdminHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { Select } from "@/components/ui/Select";
import { SEARCH_ICON, SEARCH_INPUT, TABLE_HEADER } from "@/constants/table";
import {
  nextProductId,
  nextProductSortOrder,
  productFromItem,
  relinkProductToItem,
} from "@/constants/productsForSale";
import { useAppCatalog } from "@/context/AppCatalogContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ITEM_CATEGORIES, type Item } from "@/types/item";
import type { Source } from "@/types/source";
import {
  PRODUCT_TABS,
  type ProductForSale,
  type ProductTab,
} from "@/types/productForSale";
import { cn } from "@/utils/cn";
import { validateAddProductForSale } from "@/utils/productForSaleForm";
import {
  filterProductsForSale,
  formatProductSalePrice,
  formatSubcategoryTitle,
  getProductsForSaleEmptyMessage,
  groupProductsForSale,
  isProductTab,
  reorderProductsInSubcategory,
  resolveProductDetails,
  resolveProductTableDisplay,
  uniqueProductFieldValues,
} from "@/utils/productsForSalePage";

const EDIT_LINK =
  "cursor-pointer text-[13px] font-semibold text-[#2165D4] hover:underline";
const BODY = "text-[13px] leading-[18px] font-medium text-[#111118]";
const ID_MONO =
  '"SF Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

const GRID =
  "grid grid-cols-[24px_76px_56px_minmax(0,260px)_minmax(0,140px)_96px_minmax(0,130px)_auto] items-center gap-2";

function DragHandle() {
  return (
    <span className="flex shrink-0 flex-col gap-[3px] text-[#C0C0BC]" aria-hidden>
      <span className="block h-[2px] w-[10px] rounded-full bg-current" />
      <span className="block h-[2px] w-[10px] rounded-full bg-current" />
    </span>
  );
}

function formatSalePrice(value: number) {
  return formatProductSalePrice(value);
}

function sourceLogo(name: string, sources: Source[]) {
  return sources.find((source) => source.name === name)?.logoUrl ?? null;
}

function LiveToggle({
  on,
  label,
  onChange,
}: {
  on: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer items-center rounded-full p-[2px] transition-colors",
        on ? "bg-badge" : "bg-[#D0D0CC]",
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
  catalog,
  sources,
  onClose,
}: {
  product: ProductForSale;
  catalog: Item[];
  sources: Source[];
  onClose: () => void;
}) {
  const details = resolveProductDetails(product, catalog);
  const logo = sourceLogo(details.source, sources);

  return (
    <aside
      className="absolute inset-y-0 right-0 z-50 flex w-full max-w-[600px] flex-col border-l border-[#ECECEA] bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.08)]"
      aria-label="Product details"
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <span
          className="inline-flex h-7 items-center rounded-[6px] bg-id-pill px-2.5 text-[12px] font-medium text-[#99A1AF]"
          style={{ fontFamily: ID_MONO }}
        >
          {details.id}
        </span>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="cursor-pointer rounded-md p-1 text-[#8A8A8A] hover:bg-[#F5F5F3] hover:text-[#111118]"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <h2 className="text-[22px] leading-snug font-semibold text-[#111118]">
          {details.merchandisingName}
        </h2>

        <div className="mt-4 flex items-center gap-2.5">
          {logo ? (
            <img
              src={logo}
              alt=""
              className="h-10 w-14 shrink-0 rounded-[8px] object-cover"
            />
          ) : (
            <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-[8px] bg-[#2F6B4F] text-[11px] font-bold text-white">
              {details.source.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-[13px] font-semibold text-[#111118]">
              {details.source}
            </div>
            <div className="text-[10px] font-semibold tracking-[0.06em] text-[#99A1AF] uppercase">
              Source
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-[#ECECEA] pt-4 text-[15px] font-semibold text-[#111118]">
          {formatSalePrice(details.salesPrice)}
          <span className="font-normal text-[#111118]">
            {" "}
            · {details.unitOfSales}
          </span>
        </div>

        {details.photos.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2.5">
            {details.photos.slice(0, 3).map((photo) => (
              <div
                key={photo.id}
                className="h-[100px] w-[160px] shrink-0 overflow-hidden rounded-[10px] bg-[#F3F3F1]"
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

        {details.description.trim() ? (
          <p className="mt-5 text-[13px] leading-relaxed whitespace-pre-line break-words text-[#000000]">
            {details.description}
          </p>
        ) : null}
      </div>
    </aside>
  );
}

function SubcategoryTable({
  title,
  rows,
  catalog,
  onToggleLive,
  onView,
  onEdit,
  onReorder,
}: {
  title: string;
  rows: ProductForSale[];
  catalog: Item[];
  onToggleLive: (id: string, live: boolean) => void;
  onView: (row: ProductForSale) => void;
  onEdit: (row: ProductForSale) => void;
  onReorder: (
    draggedId: string,
    targetId: string,
    visibleIds: string[],
  ) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  if (rows.length === 0) return null;

  const visibleIds = rows.map((row) => row.id);

  function handleDragStart(event: DragEvent<HTMLButtonElement>, id: string) {
    setDraggingId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, targetId: string) {
    event.preventDefault();
    const draggedId = draggingId ?? event.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetId) return;
    onReorder(draggedId, targetId, visibleIds);
    setDraggingId(null);
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-[#ECECEA] bg-white">
      <div className="border-b border-[#ECECEA] bg-[#FBF9F9] px-4 py-3">
        <h3 className="text-[14px] font-semibold text-[#111118]">{title}</h3>
      </div>
      <ScrollTable minWidth={760}>
        <div
          className={cn(
            GRID,
            TABLE_HEADER,
            "border-b border-[#ECECEA] bg-white px-4 py-2.5",
          )}
        >
          <span aria-hidden />
          <span>ID</span>
          <span>Live</span>
          <span>Merchandising Name</span>
          <span>Source</span>
          <span className="whitespace-nowrap">Sales Price</span>
          <span>Unit of Sales</span>
          <span aria-hidden />
        </div>
        {rows.map((row) => {
          const display = resolveProductTableDisplay(row, catalog);
          return (
          <div
            key={row.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, row.id)}
            className={cn(
              GRID,
              "border-b border-[#F0F0EE] px-4 py-3 last:border-b-0",
              draggingId === row.id && "opacity-60",
            )}
          >
            <button
              type="button"
              draggable
              onDragStart={(event) => handleDragStart(event, row.id)}
              onDragEnd={() => setDraggingId(null)}
              className="cursor-grab active:cursor-grabbing"
              aria-label={`Reorder ${display.merchandisingName}`}
            >
              <DragHandle />
            </button>
            <span
              className="inline-flex h-7 w-fit items-center rounded-[6px] bg-id-pill px-2 text-[11px] font-medium text-[#5A5A5A]"
              style={{ fontFamily: ID_MONO }}
            >
              {row.id}
            </span>
            <LiveToggle
              on={row.live}
              label={`${row.live ? "Disable" : "Enable"} live for ${display.merchandisingName}`}
              onChange={(live) => onToggleLive(row.id, live)}
            />
            <span className={cn(BODY, "truncate font-semibold")}>
              {display.merchandisingName}
            </span>
            <span className={cn(BODY, "truncate")}>{display.source}</span>
            <span className={cn(BODY, "whitespace-nowrap font-semibold")}>
              {formatSalePrice(display.salesPrice)}
            </span>
            <span className={cn(BODY, "truncate")}>{display.unitOfSales}</span>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className={EDIT_LINK}
                onClick={() => onView(row)}
              >
                View
              </button>
              <button
                type="button"
                className={EDIT_LINK}
                onClick={() => onEdit(row)}
              >
                Edit
              </button>
            </div>
          </div>
          );
        })}
      </ScrollTable>
    </div>
  );
}

export default function ProductsForSalePage() {
  useDocumentTitle("Products For Sale");

  const {
    products,
    setProducts,
    items: catalog,
    sources,
    subcategoriesByCategory,
  } = useAppCatalog();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [distributorFilter, setDistributorFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [tab, setTab] = useState<ProductTab>("All");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProductForSale | null>(null);
  const [viewing, setViewing] = useState<ProductForSale | null>(null);

  const distributorOptions = useMemo(
    () => uniqueProductFieldValues(products, "distributor", catalog),
    [catalog, products],
  );
  const sourceOptions = useMemo(
    () => uniqueProductFieldValues(products, "source", catalog),
    [catalog, products],
  );

  const filterCriteria = useMemo(
    () => ({
      query: search,
      tab,
      category: categoryFilter,
      distributor: distributorFilter,
      source: sourceFilter,
    }),
    [categoryFilter, distributorFilter, search, sourceFilter, tab],
  );

  const filtered = useMemo(
    () => filterProductsForSale(products, filterCriteria, catalog),
    [catalog, filterCriteria, products],
  );

  const grouped = useMemo(
    () => groupProductsForSale(filtered, catalog, subcategoriesByCategory),
    [catalog, filtered, subcategoriesByCategory],
  );

  const viewingProduct = useMemo(() => {
    if (!viewing) return null;
    return products.find((product) => product.id === viewing.id) ?? viewing;
  }, [products, viewing]);

  const excludedItemIds = useMemo(() => {
    const set = new Set(products.map((product) => product.itemId));
    if (editTarget) set.delete(editTarget.itemId);
    return set;
  }, [products, editTarget]);

  function selectTab(nextTab: ProductTab) {
    setTab(nextTab);
    setCategoryFilter(nextTab === "All" ? "" : nextTab);
  }

  function selectCategoryFilter(value: string) {
    setCategoryFilter(value);
    if (!value) {
      setTab("All");
      return;
    }
    if (isProductTab(value)) {
      setTab(value);
    }
  }

  function toggleLive(id: string, live: boolean) {
    setProducts((current) =>
      current.map((row) => (row.id === id ? { ...row, live } : row)),
    );
    setViewing((current) =>
      current?.id === id ? { ...current, live } : current,
    );
  }

  function handleReorder(
    category: string,
    subcategory: string,
    draggedId: string,
    targetId: string,
    visibleIds: string[],
  ) {
    setProducts((current) =>
      reorderProductsInSubcategory(
        current,
        category,
        subcategory,
        draggedId,
        targetId,
        visibleIds,
        catalog,
      ),
    );
  }

  function handleAdd(item: Item) {
    const errors = validateAddProductForSale({
      selectedItemId: item.id,
      catalog,
      existingProducts: products,
      editingProductId: editTarget?.id ?? null,
    });
    if (errors.item) return;

    if (editTarget) {
      const updated = relinkProductToItem(editTarget, item);
      setProducts((current) =>
        current.map((row) => (row.id === editTarget.id ? updated : row)),
      );
      setEditTarget(null);
      if (viewing?.id === editTarget.id) {
        setViewing(updated);
      }
      return;
    }
    setProducts((current) => [
      ...current,
      productFromItem(
        item,
        nextProductId(current),
        nextProductSortOrder(current),
      ),
    ]);
  }

  function handleRemoveProduct() {
    if (!editTarget) return;
    const id = editTarget.id;
    setProducts((current) => current.filter((row) => row.id !== id));
    setViewing((current) => (current?.id === id ? null : current));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <Header
        title="Products For Sale"
        toolbarBorder={false}
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <div className="relative w-full min-w-0 sm:w-[160px] sm:shrink-0 sm:flex-none">
              <Search size={14} className={SEARCH_ICON} />
              <Input
                inputSize="md"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
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
                ...distributorOptions.map((name) => ({
                  value: name,
                  label: name,
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
                ...sourceOptions.map((name) => ({
                  value: name,
                  label: name,
                })),
              ]}
            />

            <Button
              variant="primary"
              onClick={() => {
                setEditTarget(null);
                setAddOpen(true);
              }}
              className="w-full sm:ml-auto sm:w-auto"
            >
              <Plus size={14} />
              Add Product for Sale
            </Button>
          </div>
        }
        below={
          <div className="flex overflow-x-auto overflow-y-hidden border-b border-[#ECECEA] bg-white px-4 md:px-7">
            {PRODUCT_TABS.map((entry) => {
              const active = tab === entry;
              return (
                <button
                  key={entry}
                  type="button"
                  onClick={() => selectTab(entry)}
                  className={cn(
                    "relative flex h-7 min-w-[77px] shrink-0 cursor-pointer items-center justify-center px-4 text-[13px] font-medium transition-colors",
                    active
                      ? "text-[#111118]"
                      : "text-[#8A8A8A] hover:text-[#111118]",
                  )}
                >
                  {entry}
                  {active ? (
                    <span
                      className="absolute inset-x-0 -bottom-px h-[3px] bg-badge"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        }
      />

      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-7">
        {filtered.length === 0 || grouped.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-[#DCDCD8] bg-white px-6 py-16 text-center text-[14px] text-[#8A8A8A]">
            {getProductsForSaleEmptyMessage(products.length, filterCriteria)}
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ category, subcategories }) => (
              <section key={category}>
                <h2 className="mb-3 text-[18px] font-semibold text-[#111118]">
                  {category}
                </h2>
                <div className="space-y-4">
                  {subcategories.map(({ subcategory, rows }) => (
                    <SubcategoryTable
                      key={`${category}-${subcategory || "other"}`}
                      title={formatSubcategoryTitle(subcategory)}
                      rows={rows}
                      catalog={catalog}
                      onToggleLive={toggleLive}
                      onView={setViewing}
                      onEdit={(row) => {
                        setEditTarget(row);
                        setAddOpen(true);
                      }}
                      onReorder={(draggedId, targetId, visibleIds) =>
                        handleReorder(
                          category,
                          subcategory,
                          draggedId,
                          targetId,
                          visibleIds,
                        )
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <AddProductForSaleModal
          open={addOpen}
          mode={editTarget ? "edit" : "add"}
          onClose={() => {
            setAddOpen(false);
            setEditTarget(null);
          }}
          onAdd={handleAdd}
          onRemove={handleRemoveProduct}
          catalog={catalog}
          existingProducts={products}
          excludedItemIds={excludedItemIds}
          initialItemId={editTarget?.itemId}
          editingProductId={editTarget?.id ?? null}
        />

        {viewingProduct ? (
          <ProductDetailDrawer
            product={viewingProduct}
            catalog={catalog}
            sources={sources}
            onClose={() => setViewing(null)}
          />
        ) : null}
      </div>
    </div>
  );
}

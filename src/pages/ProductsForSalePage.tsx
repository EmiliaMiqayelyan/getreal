import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { Plus, X } from "lucide-react";

import { AddProductForSaleModal } from "@/components/products/AddProductForSaleModal";
import { Header } from "@/components/layout/AdminHeader";
import { IdPill } from "@/components/ui/Badge";
import { AppLoader } from "@/components/ui/AppLoader";
import { Button } from "@/components/ui/Button";
import { EmptyStateBox } from "@/components/ui/EmptyStateBox";
import { IconButton } from "@/components/ui/IconButton";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Tabs } from "@/components/ui/Tabs";
import { TABLE_HEADER } from "@/constants/table";
import {
  nextProductId,
  nextProductSortOrder,
  productFromItem,
  relinkProductToItem,
} from "@/constants/productsForSale";
import { useAppCatalog } from "@/context/AppCatalogContext";
import { useApiFeedback } from "@/hooks/useApiFeedback";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  isApiConfigured,
  mapApiProductToProductForSale,
  productsApi,
} from "@/lib/api";
import { toCreateProductPayload } from "@/lib/api/payloads";
import { type Item } from "@/types/item";
import type { Source } from "@/types/source";
import {
  PRODUCT_TABS,
  type ProductForSale,
  type ProductTab,
} from "@/types/productForSale";
import { cn } from "@/utils/cn";
import { apiId, findByEntityRef } from "@/utils/entityIds";
import { validateAddProductForSale } from "@/utils/productForSaleForm";
import {
  filterProductsForSale,
  formatProductSalePrice,
  formatSubcategoryTitle,
  getProductsForSaleEmptyMessage,
  groupProductsForSale,
  reorderProductsInSubcategory,
  resolveProductDetails,
  resolveProductTableDisplay,
  uniqueProductFieldValues,
} from "@/utils/productsForSalePage";
import { subcategoriesForCategory } from "@/utils/subcategories";

const EDIT_LINK =
  "cursor-pointer text-[13px] font-semibold text-[#2165D4] hover:underline";
const BODY = "text-[13px] leading-[18px] font-medium text-[#111118]";

const HEAD =
  "sticky top-0 z-20 bg-white px-2 py-2.5 text-left shadow-[inset_0_-1px_0_#00000014] first:pl-4 last:pr-4";
const CELL =
  "border-b border-[#00000014] bg-white px-2 py-3 align-middle first:pl-4 last:pr-4";

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
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      onClose();
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [onClose]);

  return (
    <aside
      ref={panelRef}
      className="absolute inset-y-0 right-0 z-50 flex w-full max-w-[600px] flex-col border-l border-[#00000014] bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.08)]"
      aria-label="Product details"
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <IdPill className="text-[#99A1AF]">{details.id}</IdPill>
        <IconButton aria-label="Close" onClick={onClose}>
          <X className="size-5" />
        </IconButton>
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

        <div className="mt-5 border-t border-[#00000014] pt-4 text-[15px] font-semibold text-[#111118]">
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
  onRemove,
  onReorder,
}: {
  title: string;
  rows: ProductForSale[];
  catalog: Item[];
  onToggleLive: (id: string, live: boolean) => void;
  onView: (row: ProductForSale) => void;
  onRemove: (row: ProductForSale) => void;
  onReorder: (
    draggedId: string,
    targetId: string,
    visibleIds: string[],
  ) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [previewIds, setPreviewIds] = useState<string[] | null>(null);

  const sourceIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const rowById = useMemo(
    () => new Map(rows.map((row) => [row.id, row])),
    [rows],
  );
  const displayIds = previewIds ?? sourceIds;
  const displayRows = displayIds
    .map((id) => rowById.get(id))
    .filter((row): row is ProductForSale => Boolean(row));

  useEffect(() => {
    if (!draggingId) setPreviewIds(null);
  }, [draggingId]);

  if (rows.length === 0) return null;

  function clearDragState() {
    setDraggingId(null);
    setPreviewIds(null);
  }

  function handleDragStart(event: DragEvent<HTMLButtonElement>, id: string) {
    setDraggingId(id);
    setPreviewIds(sourceIds);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }

  function handleDragOver(
    event: DragEvent<HTMLTableRowElement>,
    targetId: string,
  ) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (!draggingId || draggingId === targetId || !previewIds) return;

    const fromIndex = previewIds.indexOf(draggingId);
    const toIndex = previewIds.indexOf(targetId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    const next = [...previewIds];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, draggingId);
    setPreviewIds(next);
  }

  function handleDrop(event: DragEvent<HTMLTableRowElement>) {
    event.preventDefault();
    const draggedId = draggingId ?? event.dataTransfer.getData("text/plain");
    const order = previewIds ?? sourceIds;
    clearDragState();
    if (!draggedId) return;

    const fromIndex = sourceIds.indexOf(draggedId);
    const toIndex = order.indexOf(draggedId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    const targetId = sourceIds[toIndex];
    if (!targetId || targetId === draggedId) return;
    onReorder(draggedId, targetId, sourceIds);
  }

  return (
    <div className="min-w-[760px] rounded-[12px] border border-[#00000014] bg-white">
      <div className="flex h-10 items-center border-b border-[#00000014] bg-[#FBF9F9] px-4">
        <h3 className="text-[14px] font-semibold tracking-normal text-[#111118]">
          {title}
        </h3>
      </div>
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-10" />
          <col className="w-[104px]" />
          <col className="w-16" />
          <col />
          <col className="w-[180px]" />
          <col className="w-[108px]" />
          <col className="w-[120px]" />
          <col className="w-[132px]" />
        </colgroup>
        <thead>
          <tr className={TABLE_HEADER}>
            <th className={HEAD} />
            <th className={HEAD}>ID</th>
            <th className={HEAD}>Live</th>
            <th className={HEAD}>Merchandising Name</th>
            <th className={HEAD}>Source</th>
            <th className={cn(HEAD, "whitespace-nowrap")}>Sales Price</th>
            <th className={HEAD}>Unit of Sales</th>
            <th className={HEAD} />
          </tr>
        </thead>
        <tbody className="[&>tr:last-child>td]:border-b-0">
          {displayRows.map((row) => {
            const display = resolveProductTableDisplay(row, catalog);
            const isDragging = draggingId === row.id;
            return (
              <tr
                key={row.id}
                onDragOver={(event) => handleDragOver(event, row.id)}
                onDrop={handleDrop}
                className={cn(
                  "transition-[background-color,opacity,box-shadow] duration-150 ease-out",
                  draggingId && !isDragging && "bg-[#F7F7F5]",
                  isDragging &&
                    "bg-[#F3F3F1] opacity-55 shadow-[inset_0_0_0_1px_#0000000A]",
                )}
              >
                <td className={CELL}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => handleDragStart(event, row.id)}
                    onDragEnd={clearDragState}
                    className="cursor-grab active:cursor-grabbing"
                    aria-label={`Reorder ${display.merchandisingName}`}
                  >
                    <DragHandle />
                  </button>
                </td>
                <td className={CELL}>
                  <IdPill>{row.id}</IdPill>
                </td>
                <td className={CELL}>
                  <Switch
                    checked={row.live}
                    label={`${row.live ? "Disable" : "Enable"} live for ${display.merchandisingName}`}
                    onCheckedChange={(live) => onToggleLive(row.id, live)}
                  />
                </td>
                <td className={cn(CELL, BODY, "truncate font-semibold")}>
                  {display.merchandisingName}
                </td>
                <td className={cn(CELL, BODY, "truncate")}>{display.source}</td>
                <td className={cn(CELL, BODY, "whitespace-nowrap font-semibold")}>
                  {formatSalePrice(display.salesPrice)}
                </td>
                <td className={cn(CELL, BODY, "truncate")}>
                  {display.unitOfSales}
                </td>
                <td className={CELL}>
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
                      onClick={() => onRemove(row)}
                      aria-label={`Remove ${display.merchandisingName}`}
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
    isBootstrapping,
  } = useAppCatalog();
  const { notifyApiError, showSuccess } = useApiFeedback();
  const [search, setSearch] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
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

  const filterCriteria = useMemo(
    () => ({
      query: search,
      tab,
      subcategory: subcategoryFilter,
      distributor: distributorFilter,
      source: sourceFilter,
    }),
    [distributorFilter, search, sourceFilter, subcategoryFilter, tab],
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
    const set = new Set<string>();
    for (const product of products) {
      if (product.itemId) set.add(product.itemId);
      const linked = findByEntityRef(catalog, product.itemId);
      if (linked) {
        set.add(linked.id);
        if (linked.recordId) set.add(linked.recordId);
      }
    }
    if (editTarget) {
      set.delete(editTarget.itemId);
      const linked = findByEntityRef(catalog, editTarget.itemId);
      if (linked) {
        set.delete(linked.id);
        if (linked.recordId) set.delete(linked.recordId);
      }
    }
    return set;
  }, [products, editTarget, catalog]);

  function selectTab(nextTab: ProductTab) {
    setTab(nextTab);
    setSubcategoryFilter("");
  }

  function toggleLive(id: string, live: boolean) {
    const target = products.find((row) => row.id === id);
    setProducts((current) =>
      current.map((row) => (row.id === id ? { ...row, live } : row)),
    );
    setViewing((current) =>
      current?.id === id ? { ...current, live } : current,
    );
    if (isApiConfigured() && target) {
      void productsApi.update(apiId(target), { isLive: live }).catch((error) => {
        setProducts((current) =>
          current.map((row) => (row.id === id ? { ...row, live: !live } : row)),
        );
        setViewing((current) =>
          current?.id === id ? { ...current, live: !live } : current,
        );
        notifyApiError(error, "Failed to update live status.");
      });
    }
  }

  function handleReorder(
    category: string,
    subcategory: string,
    draggedId: string,
    targetId: string,
    visibleIds: string[],
  ) {
    setProducts((current) => {
      const previous = current;
      const next = reorderProductsInSubcategory(
        current,
        category,
        subcategory,
        draggedId,
        targetId,
        visibleIds,
        catalog,
      );
      if (isApiConfigured()) {
        const positions = next.map((product, index) => ({
          id: apiId(product),
          position: product.sortOrder ?? index,
        }));
        void productsApi.reorder(positions).catch((error) => {
          setProducts(previous);
          notifyApiError(error, "Failed to reorder products.");
        });
      }
      return next;
    });
  }

  function handleAdd(item: Item) {
    const errors = validateAddProductForSale({
      selectedItemId: item.id,
      catalog,
      existingProducts: products,
      editingProductId: editTarget?.id ?? null,
    });
    if (errors.item) return;

    void (async () => {
      if (editTarget) {
        const updated = relinkProductToItem(editTarget, item);
        if (isApiConfigured()) {
          try {
            const saved = await productsApi.update(
              apiId(editTarget),
              toCreateProductPayload(updated, catalog),
            );
            const mapped = mapApiProductToProductForSale(saved, 0, catalog);
            const merged = {
              ...updated,
              ...mapped,
              id: editTarget.id,
              recordId: mapped.recordId ?? editTarget.recordId,
            };
            setProducts((current) =>
              current.map((row) => (row.id === editTarget.id ? merged : row)),
            );
            setEditTarget(null);
            if (viewing?.id === editTarget.id) setViewing(merged);
            showSuccess("Product updated.");
            return;
          } catch (error) {
            notifyApiError(error, "Failed to update product.");
            return;
          }
        }
        setProducts((current) =>
          current.map((row) => (row.id === editTarget.id ? updated : row)),
        );
        setEditTarget(null);
        if (viewing?.id === editTarget.id) setViewing(updated);
        return;
      }

      const draft = productFromItem(
        item,
        nextProductId(products),
        nextProductSortOrder(products),
      );

      if (isApiConfigured()) {
        try {
          const created = await productsApi.create(
            toCreateProductPayload(draft, catalog),
          );
          const mapped = mapApiProductToProductForSale(created, 0, catalog);
          setProducts((current) => [...current, { ...draft, ...mapped }]);
          showSuccess("Product added.");
          return;
        } catch (error) {
          notifyApiError(error, "Failed to add product.");
          return;
        }
      }

      setProducts((current) => [...current, draft]);
    })();
  }

  function handleRemoveProduct(target: ProductForSale | null = editTarget) {
    if (!target) return;
    const id = target.id;
    const snapshot = target;
    setProducts((current) => current.filter((row) => row.id !== id));
    setViewing((current) => (current?.id === id ? null : current));
    setEditTarget(null);
    if (isApiConfigured()) {
      void productsApi
        .remove(apiId(snapshot))
        .then(() => showSuccess("Product removed."))
        .catch((error) => {
          setProducts((current) => [snapshot, ...current]);
          notifyApiError(error, "Failed to remove product.");
        });
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
      <Header
        title="Products For Sale"
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <SearchField
              value={search}
              onChange={(event) => setSearch(event.target.value)}
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
          <Tabs
            aria-label="Product categories"
            items={PRODUCT_TABS.map((entry) => ({ id: entry, label: entry }))}
            value={tab}
            onChange={(id) => selectTab(id as ProductTab)}
          />
        }
      />

      <div className="relative min-h-0 flex-1 overflow-auto bg-[#FAFAFA] p-4 md:p-7">
        {isBootstrapping ? (
          <AppLoader variant="table" label="Loading products" />
        ) : filtered.length === 0 || grouped.length === 0 ? (
          <EmptyStateBox variant="dashed" className="rounded-[10px] bg-white px-6 py-16 text-[14px]">
            {getProductsForSaleEmptyMessage(products.length, filterCriteria)}
          </EmptyStateBox>
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
                      onRemove={(row) => {
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
          onRemove={() => handleRemoveProduct(editTarget)}
          catalog={catalog}
          existingProducts={products}
          excludedItemIds={excludedItemIds}
          initialItemId={
            editTarget
              ? findByEntityRef(catalog, editTarget.itemId)?.id ??
                editTarget.itemId
              : undefined
          }
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

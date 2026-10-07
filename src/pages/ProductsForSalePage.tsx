import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";

import { AddProductForSaleModal } from "@/components/products/AddProductForSaleModal";
import { Header } from "@/components/layout/AdminHeader";
import { IdPill } from "@/components/ui/Badge";
import { AppLoader } from "@/components/ui/AppLoader";
import { Button } from "@/components/ui/Button";
import { EmptyStateBox } from "@/components/ui/EmptyStateBox";
import { IconButton } from "@/components/ui/IconButton";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Tabs } from "@/components/ui/Tabs";
import { PINNED_HEADER, TABLE_HEADER } from "@/constants/table";
import {
  nextProductId,
  nextProductSortOrder,
  productFromItem,
  relinkProductToItem,
} from "@/constants/productsForSale";
import { useAppCatalog, useCatalogSlice } from "@/context/AppCatalogContext";
import { useApiFeedback } from "@/hooks/useApiFeedback";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLazyWindow } from "@/hooks/useLazyWindow";
import { InfiniteScrollSentinel } from "@/components/ui/InfiniteScrollSentinel";
import {
  isApiConfigured,
  mapApiProductToProductForSale,
  productsApi,
} from "@/lib/api";
import { toCreateProductPayload } from "@/lib/api/payloads";
import { type Item } from "@/types/item";
import type { Source } from "@/types/source";
import {
  type ProductForSale,
} from "@/types/productForSale";
import { categoryNamesFromCatalog } from "@/utils/categories";
import { cn } from "@/utils/cn";
import { findByEntityRef, recordRef } from "@/utils/entityIds";
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
const BODY = "text-[13px] font-medium leading-none text-[#111118]";

/** One track list for the header and every body row. Not a subgrid item — sticky grid items overlap the first row. */
const PRODUCT_COLUMNS =
  "grid grid-cols-[40px_112px_64px_minmax(176px,1fr)_minmax(120px,180px)_96px_minmax(120px,140px)_132px] items-center gap-x-4 px-4";

function DragHandle() {
  return (
    <span
      className="inline-flex h-5 shrink-0 flex-col items-center justify-center gap-[3px] leading-none text-[#E2E2E2]"
      aria-hidden
    >
      <span className="block h-[2px] w-[10px] rounded-full bg-current" />
      <span className="block h-[2px] w-[10px] rounded-full bg-current" />
    </span>
  );
}

type DragLayout = "mobile" | "desktop";

type DragSession = {
  id: string;
  pointerId: number;
  layout: DragLayout;
  width: number;
  offsetY: number;
  heights: Record<string, number>;
};

function moveItem(ids: string[], id: string, toIndex: number) {
  const fromIndex = ids.indexOf(id);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return ids;
  const next = ids.filter((item) => item !== id);
  next.splice(Math.min(toIndex, next.length), 0, id);
  return next;
}

function shiftsFor(
  sourceIds: string[],
  visualIds: string[],
  heights: Record<string, number>,
) {
  const sourceTop = new Map<string, number>();
  let sourceY = 0;
  for (const id of sourceIds) {
    sourceTop.set(id, sourceY);
    sourceY += heights[id] ?? 0;
  }

  const visualTop = new Map<string, number>();
  let visualY = 0;
  for (const id of visualIds) {
    visualTop.set(id, visualY);
    visualY += heights[id] ?? 0;
  }

  const shifts: Record<string, number> = {};
  for (const id of sourceIds) {
    shifts[id] = (visualTop.get(id) ?? 0) - (sourceTop.get(id) ?? 0);
  }
  return shifts;
}

function dropIndexForPointer(
  clientY: number,
  visualIds: string[],
  draggedId: string,
  heights: Record<string, number>,
  listTop: number,
  offsetY: number,
) {
  const draggedHeight = heights[draggedId] ?? 0;
  const probe = clientY - offsetY + draggedHeight / 2;
  const currentIndex = visualIds.indexOf(draggedId);
  let y = listTop;
  let target = Math.max(0, visualIds.length - 1);

  for (let index = 0; index < visualIds.length; index += 1) {
    const height = heights[visualIds[index]] ?? 0;
    if (probe <= y + height / 2) {
      target = index;
      break;
    }
    y += height;
  }

  if (currentIndex < 0 || target === currentIndex) return target;

  let currentTop = listTop;
  for (let index = 0; index < currentIndex; index += 1) {
    currentTop += heights[visualIds[index]] ?? 0;
  }

  // Stay put until the lifted row's center clearly passes the neighboring slot.
  if (target > currentIndex && probe < currentTop + draggedHeight + 8) {
    return currentIndex;
  }
  if (target < currentIndex && probe > currentTop - 8) return currentIndex;
  return target;
}

function findScrollParent(element: HTMLElement | null) {
  let node = element?.parentElement ?? null;
  while (node) {
    const style = getComputedStyle(node);
    const overflow = `${style.overflowY} ${style.overflow}`;
    if (
      /(auto|scroll)/.test(overflow) &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function DragHandleControl({
  label,
  className,
  interactive,
  onPointerDown,
}: {
  label: string;
  className?: string;
  interactive: boolean;
  onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  if (!interactive) {
    return (
      <span className={className} aria-hidden>
        <DragHandle />
      </span>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        className,
        "relative cursor-grab touch-none before:absolute before:-inset-2 active:cursor-grabbing",
      )}
      aria-label={label}
      onPointerDown={onPointerDown}
    >
      <DragHandle />
    </button>
  );
}

function ProductCells({
  layout,
  row,
  catalog,
  onToggleLive,
  onView,
  onRemove,
  interactive,
  onHandlePointerDown,
}: {
  layout: DragLayout;
  row: ProductForSale;
  catalog: Item[];
  onToggleLive: (id: string, live: boolean) => void;
  onView: (row: ProductForSale) => void;
  onRemove: (row: ProductForSale) => void;
  interactive: boolean;
  onHandlePointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  const display = resolveProductTableDisplay(row, catalog);
  const handle = (
    <DragHandleControl
      label={`Reorder ${display.merchandisingName}`}
      interactive={interactive}
      onPointerDown={onHandlePointerDown}
      className={
        layout === "mobile"
          ? "inline-flex h-5 w-8 items-center justify-start p-0 leading-none"
          : "inline-flex h-5 items-center justify-center p-0 leading-none"
      }
    />
  );

  if (layout === "mobile") {
    return (
      <>
        <div className="grid grid-cols-[32px_minmax(0,1fr)_52px] items-center gap-x-3">
          {handle}
          <div className={cn(BODY, "min-w-0 truncate font-semibold")}>
            {display.merchandisingName}
          </div>
          <div className="flex justify-end">
            <Switch
              checked={row.live}
              label={`${row.live ? "Disable" : "Enable"} live for ${display.merchandisingName}`}
              onCheckedChange={(live) => onToggleLive(row.id, live)}
            />
          </div>
        </div>
        <div className="mt-2 pl-[44px]">
          <IdPill>{row.id}</IdPill>
          <div className={cn(BODY, "mt-2 min-w-0 truncate")}>
            {display.source}
          </div>
          <div className={cn(BODY, "mt-1 font-semibold")}>
            {formatSalePrice(display.salesPrice)}
            <span className="ml-2 font-medium text-[#6B6B6B]">
              {display.unitOfSales}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3">
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
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center">{handle}</div>
      <div className="flex items-center">
        <IdPill>{row.id}</IdPill>
      </div>
      <div className="flex items-center">
        <Switch
          checked={row.live}
          label={`${row.live ? "Disable" : "Enable"} live for ${display.merchandisingName}`}
          onCheckedChange={(live) => onToggleLive(row.id, live)}
        />
      </div>
      <div
        className={cn(
          BODY,
          "flex h-5 min-w-0 items-center truncate font-semibold",
        )}
      >
        {display.merchandisingName}
      </div>
      <div className={cn(BODY, "flex h-5 min-w-0 items-center truncate")}>
        {display.source}
      </div>
      <div
        className={cn(
          BODY,
          "flex h-5 items-center font-semibold whitespace-nowrap",
        )}
      >
        {formatSalePrice(display.salesPrice)}
      </div>
      <div className={cn(BODY, "flex h-5 min-w-0 items-center truncate")}>
        {display.unitOfSales}
      </div>
      <div className="flex items-center justify-end gap-3">
        <button type="button" className={EDIT_LINK} onClick={() => onView(row)}>
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
    </>
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
  const [session, setSession] = useState<DragSession | null>(null);
  const [previewIds, setPreviewIds] = useState<string[] | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const listMarkers = useRef(new Map<DragLayout, HTMLDivElement>());
  const ghostRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<DragSession | null>(null);
  const previewRef = useRef<string[] | null>(null);
  const sourceIdsRef = useRef<string[]>([]);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const onReorderRef = useRef(onReorder);
  const finishDragRef = useRef<(commit: boolean) => void>(() => {});
  const placeGhostRef = useRef<() => void>(() => {});
  const syncDropTargetRef = useRef<(clientY: number) => void>(() => {});
  const stopDragListenersRef = useRef<(() => void) | null>(null);

  const sourceIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const rowById = useMemo(
    () => new Map(rows.map((row) => [row.id, row])),
    [rows],
  );
  const shifts = useMemo(
    () =>
      session
        ? shiftsFor(sourceIds, previewIds ?? sourceIds, session.heights)
        : {},
    [previewIds, session, sourceIds],
  );

  sourceIdsRef.current = sourceIds;
  previewRef.current = previewIds ?? sourceIds;
  onReorderRef.current = onReorder;
  sessionRef.current = session;

  placeGhostRef.current = () => {
    const current = sessionRef.current;
    const node = ghostRef.current;
    const pointer = pointerRef.current;
    if (!current || !node || !pointer) return;
    const row = rowRefs.current.get(`${current.layout}:${current.id}`);
    const left = row?.getBoundingClientRect().left ?? 0;
    const top = pointer.y - current.offsetY - 6;
    node.style.width = `${row?.offsetWidth ?? current.width}px`;
    node.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  };

  syncDropTargetRef.current = (clientY: number) => {
    const current = sessionRef.current;
    if (!current) return;
    const scroller = scrollerRef.current;
    if (scroller) {
      const bounds = scroller.getBoundingClientRect();
      const edge = 72;
      const maxStep = 16;
      if (clientY < bounds.top + edge) {
        const intensity = (bounds.top + edge - clientY) / edge;
        scroller.scrollTop -= Math.ceil(maxStep * intensity);
      } else if (clientY > bounds.bottom - edge) {
        const intensity = (clientY - (bounds.bottom - edge)) / edge;
        scroller.scrollTop += Math.ceil(maxStep * intensity);
      }
    }

    const visualIds = previewRef.current ?? sourceIdsRef.current;
    const listTop =
      listMarkers.current.get(current.layout)?.getBoundingClientRect().top ?? 0;
    const index = dropIndexForPointer(
      clientY,
      visualIds,
      current.id,
      current.heights,
      listTop,
      current.offsetY,
    );
    const next = moveItem(visualIds, current.id, index);
    if (next === visualIds) return;
    previewRef.current = next;
    setPreviewIds(next);
  };

  finishDragRef.current = (commit: boolean) => {
    const current = sessionRef.current;
    if (!current) return;
    const order = previewRef.current ?? sourceIdsRef.current;
    const source = sourceIdsRef.current;
    stopDragListenersRef.current?.();
    stopDragListenersRef.current = null;
    sessionRef.current = null;
    pointerRef.current = null;
    setSession(null);
    setPreviewIds(null);
    if (!commit) return;

    const fromIndex = source.indexOf(current.id);
    const toIndex = order.indexOf(current.id);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    const targetId = source[toIndex];
    if (!targetId || targetId === current.id) return;
    onReorderRef.current(current.id, targetId, source);
  };

  useLayoutEffect(() => {
    if (!session) return;
    placeGhostRef.current();
  }, [previewIds, session]);

  useEffect(() => {
    return () => {
      stopDragListenersRef.current?.();
      stopDragListenersRef.current = null;
    };
  }, []);

  function startDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    id: string,
    layout: DragLayout,
  ) {
    if (event.button !== 0) return;
    event.preventDefault();
    const rowEl = rowRefs.current.get(`${layout}:${id}`);
    if (!rowEl) return;

    const rect = rowEl.getBoundingClientRect();
    const heights: Record<string, number> = {};
    for (const row of rows) {
      heights[row.id] =
        rowRefs.current.get(`${layout}:${row.id}`)?.offsetHeight ?? 0;
    }

    const nextSession: DragSession = {
      id,
      pointerId: event.pointerId,
      layout,
      width: rowEl.offsetWidth,
      offsetY: event.clientY - rect.top,
      heights,
    };
    sessionRef.current = nextSession;
    previewRef.current = sourceIds;
    pointerRef.current = { x: event.clientX, y: event.clientY };
    scrollerRef.current = findScrollParent(rowEl);
    event.currentTarget.setPointerCapture(event.pointerId);

    stopDragListenersRef.current?.();
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    function onMove(pointerEvent: PointerEvent) {
      const current = sessionRef.current;
      if (!current || pointerEvent.pointerId !== current.pointerId) return;
      pointerRef.current = { x: pointerEvent.clientX, y: pointerEvent.clientY };
      placeGhostRef.current();
      syncDropTargetRef.current(pointerEvent.clientY);
    }

    function onUp(pointerEvent: PointerEvent) {
      const current = sessionRef.current;
      if (!current || pointerEvent.pointerId !== current.pointerId) return;
      finishDragRef.current(pointerEvent.type !== "pointercancel");
    }

    function onKey(keyEvent: KeyboardEvent) {
      if (keyEvent.key === "Escape") finishDragRef.current(false);
    }

    let frame = 0;
    const tick = () => {
      if (!sessionRef.current || !pointerRef.current) return;
      placeGhostRef.current();
      syncDropTargetRef.current(pointerRef.current.y);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey);
    stopDragListenersRef.current = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };

    setPreviewIds(sourceIds);
    setSession(nextSession);
  }

  function renderRow(row: ProductForSale, index: number, layout: DragLayout) {
    const isDragging = session?.id === row.id && session.layout === layout;
    const active = session?.layout === layout;
    const isLast = index === rows.length - 1;

    return (
      <div
        key={row.id}
        ref={(node) => {
          const key = `${layout}:${row.id}`;
          if (node) rowRefs.current.set(key, node);
          else rowRefs.current.delete(key);
        }}
        className={cn(
          "relative bg-white",
          !isLast && "border-b border-[#00000014]",
          active &&
            "z-[1] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none",
          active && !isDragging && "bg-[#F4F4F1]",
          isDragging && "z-[3]",
        )}
        style={
          active
            ? { transform: `translate3d(0, ${shifts[row.id] ?? 0}px, 0)` }
            : undefined
        }
      >
        {isDragging ? (
          <div className="pointer-events-none absolute inset-x-2 inset-y-1 rounded-[8px] bg-[#DCDCD6] shadow-[inset_0_0_0_1.5px_#C4C4BE]" />
        ) : null}
        <div
          className={cn(
            layout === "desktop" ? cn(PRODUCT_COLUMNS, "py-3") : "px-4 py-3",
            isDragging && "invisible",
          )}
        >
          <ProductCells
            layout={layout}
            row={row}
            catalog={catalog}
            onToggleLive={onToggleLive}
            onView={onView}
            onRemove={onRemove}
            interactive
            onHandlePointerDown={(event) => startDrag(event, row.id, layout)}
          />
        </div>
      </div>
    );
  }

  if (rows.length === 0) return null;

  const draggedRow = session ? rowById.get(session.id) : undefined;

  return (
    <>
      <div className="overflow-hidden rounded-[12px] border border-[#00000014] bg-white md:hidden">
        <div className="flex h-10 items-center border-b border-[#00000014] bg-[#FBF9F9] px-4">
          <h3 className="text-[14px] font-semibold tracking-normal text-[#111118]">
            {title}
          </h3>
        </div>
        <div
          className={cn(
            TABLE_HEADER,
            "grid grid-cols-[32px_minmax(0,1fr)_52px] items-center gap-x-3 px-4 py-2",
          )}
        >
          <span className="whitespace-nowrap">ID</span>
          <span className="min-w-0 truncate whitespace-nowrap">
            Merchandising Name
          </span>
          <span className="text-right whitespace-nowrap">Live</span>
        </div>
        <div
          ref={(node) => {
            if (node) listMarkers.current.set("mobile", node);
            else listMarkers.current.delete("mobile");
          }}
        />
        {rows.map((row, index) => renderRow(row, index, "mobile"))}
      </div>
      <ScrollTable minWidth={1140} className="hidden md:block">
        <div className="flex h-10 items-center border-b border-[#00000014] bg-[#FBF9F9] px-4">
          <h3 className="text-[14px] font-semibold tracking-normal text-[#111118]">
            {title}
          </h3>
        </div>
        <div>
          <div
            className={cn(
              PRODUCT_COLUMNS,
              TABLE_HEADER,
              PINNED_HEADER,
              "min-h-10 py-2 whitespace-nowrap shadow-[inset_0_-1px_0_#00000014]",
            )}
          >
            <span aria-hidden />
            <span>ID</span>
            <span>Live</span>
            <span>Merchandising Name</span>
            <span>Source</span>
            <span>Sales Price</span>
            <span>Unit of Sales</span>
            <span />
          </div>
          <div
            ref={(node) => {
              if (node) listMarkers.current.set("desktop", node);
              else listMarkers.current.delete("desktop");
            }}
          />
          {rows.map((row, index) => renderRow(row, index, "desktop"))}
        </div>
      </ScrollTable>
      {session && draggedRow
        ? createPortal(
            <div
              ref={(node) => {
                ghostRef.current = node;
                if (node) placeGhostRef.current();
              }}
              inert
              aria-hidden
              className={cn(
                "pointer-events-none fixed top-0 left-0 z-30 bg-white shadow-[0_18px_42px_rgba(17,17,24,0.22),0_0_0_1px_rgba(17,17,24,0.08)]",
                session.layout === "desktop"
                  ? cn(PRODUCT_COLUMNS, "rounded-[10px] py-3")
                  : "rounded-[10px] px-4 py-3",
              )}
              style={{ width: session.width }}
            >
              <ProductCells
                layout={session.layout}
                row={draggedRow}
                catalog={catalog}
                onToggleLive={onToggleLive}
                onView={onView}
                onRemove={onRemove}
                interactive={false}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export default function ProductsForSalePage() {
  useDocumentTitle("Products For Sale");

  const {
    products,
    setProducts,
    items: catalog,
    sources,
    categories,
    subcategoriesByCategory,
  } = useAppCatalog();
  const { ready: catalogReady } = useCatalogSlice([
    "products",
    "items",
    "categories",
    "subcategories",
    "sources",
    "distributors",
  ]);
  const { notifyApiError, showSuccess } = useApiFeedback();
  const [search, setSearch] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [distributorFilter, setDistributorFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const categoryNames = useMemo(
    () => categoryNamesFromCatalog(categories),
    [categories],
  );
  const tabs = useMemo(() => ["All", ...categoryNames], [categoryNames]);
  const [tab, setTab] = useState("All");
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
    ).sort((a, b) => String(a ?? "").localeCompare(String(b ?? "")));
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

  const listWindow = useLazyWindow(
    filtered,
    `${search}|${tab}|${subcategoryFilter}|${distributorFilter}|${sourceFilter}`,
  );

  const grouped = useMemo(
    () =>
      groupProductsForSale(
        listWindow.visible,
        catalog,
        subcategoriesByCategory,
        categoryNames,
      ),
    [catalog, categoryNames, listWindow.visible, subcategoriesByCategory],
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

  function selectTab(nextTab: string) {
    setTab(nextTab);
    setSubcategoryFilter("");
  }

  useEffect(() => {
    if (tab !== "All" && categoryNames.length > 0 && !categoryNames.includes(tab)) {
      setTab("All");
    }
  }, [categoryNames, tab]);

  function toggleLive(id: string, live: boolean) {
    const target = products.find((row) => row.id === id);
    setProducts((current) =>
      current.map((row) => (row.id === id ? { ...row, live } : row)),
    );
    setViewing((current) =>
      current?.id === id ? { ...current, live } : current,
    );
    const pathId = target ? recordRef(target) : undefined;
    if (isApiConfigured() && target && !pathId) {
      setProducts((current) =>
        current.map((row) => (row.id === id ? { ...row, live: !live } : row)),
      );
      notifyApiError(
        new Error("This product is not linked to a server record."),
        "Failed to update live status.",
      );
    } else if (isApiConfigured() && target && pathId) {
      void productsApi.update(pathId, { isLive: live }).catch((error) => {
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
        const positions = next.flatMap((product, index) => {
          const id = recordRef(product);
          return id ? [{ id, position: product.sortOrder ?? index }] : [];
        });
        if (!positions.length) return next;
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
            const pathId = recordRef(editTarget);
            if (!pathId) {
              throw new Error(
                "This product is not linked to a server record. Reload the page and try again.",
              );
            }
            const saved = await productsApi.update(
              pathId,
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
      const pathId = recordRef(snapshot);
      if (!pathId) {
        setProducts((current) => [snapshot, ...current]);
        notifyApiError(
          new Error("This product is not linked to a server record."),
          "Failed to remove product.",
        );
        return;
      }
      void productsApi
        .remove(pathId)
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
            items={tabs.map((entry) => ({ id: entry, label: entry }))}
            value={tabs.includes(tab) ? tab : "All"}
            onChange={selectTab}
          />
        }
      />

      <div className="relative min-h-0 flex-1 bg-[#FAFAFA]">
        <div className="h-full overflow-auto px-4 py-5 md:px-7 md:py-5">
        {!catalogReady ? (
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
            <InfiniteScrollSentinel
              hasMore={listWindow.hasMore}
              loadedCount={listWindow.loadedCount}
              onLoadMore={listWindow.loadMore}
            />
          </div>
        )}
        </div>

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

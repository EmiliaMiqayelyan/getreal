import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { INPUT_LEADING_ICON_SIZE } from "@/components/ui/SearchField";
import { useScrollLock } from "@/hooks/useScrollLock";
import type { Item } from "@/types/item";
import type { ProductForSale } from "@/types/productForSale";
import { cn } from "@/utils/cn";
import { getItemDisplayName } from "@/utils/items";
import { validateAddProductForSale } from "@/utils/productForSaleForm";

type AddProductForSaleModalProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (item: Item) => void;
  /** Remove the product being edited from the sale list. Edit mode only. */
  onRemove?: () => void;
  catalog: Item[];
  existingProducts: ProductForSale[];
  /** Item IDs already on the Products For Sale list (excluded from picker). */
  excludedItemIds: Set<string>;
  /** Prefill when editing which catalog item is linked. */
  initialItemId?: string | null;
  editingProductId?: string | null;
  mode?: "add" | "edit";
};
export function AddProductForSaleModal({
  open,
  onClose,
  onAdd,
  onRemove,
  catalog,
  existingProducts,
  excludedItemIds,
  initialItemId = null,
  editingProductId = null,
  mode = "add",
}: AddProductForSaleModalProps) {
  const [selectedId, setSelectedId] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [itemError, setItemError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useScrollLock(open);

  function updateMenuPos() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }

  useEffect(() => {
    if (!open) return;
    setSelectedId(initialItemId ?? "");
    setMenuOpen(false);
    setQuery("");
    setItemError("");
    setConfirmRemove(false);
  }, [open, initialItemId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (menuOpen) setMenuOpen(false);
        else if (!confirmRemove) handleClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, menuOpen, onClose, confirmRemove]);

  useEffect(() => {
    if (!menuOpen) return;
    updateMenuPos();

    function onPointer(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
    }

    function onReposition() {
      updateMenuPos();
    }

    document.addEventListener("mousedown", onPointer);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) {
      window.setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [menuOpen]);

  const options = useMemo(() => {
    return catalog.filter((item) => {
      if (item.id === selectedId) return true;
      return !excludedItemIds.has(item.id);
    });
  }, [catalog, excludedItemIds, selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (item) =>
        getItemDisplayName(item).toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q),
    );
  }, [options, query]);

  const selected = catalog.find((item) => item.id === selectedId) ?? null;
  const editingProduct =
    existingProducts.find((product) => product.id === editingProductId) ??
    null;
  const productName = selected
    ? getItemDisplayName(selected)
    : editingProduct?.merchandisingName.trim() || "";
  const canSubmit = Boolean(selected);
  const isEdit = mode === "edit" || Boolean(editingProductId);

  function handleSubmit() {
    const errors = validateAddProductForSale({
      selectedItemId: selectedId,
      catalog,
      existingProducts,
      editingProductId,
    });
    if (errors.item) {
      setItemError(errors.item);
      return;
    }
    if (!selected) return;
    onAdd(selected);
    onClose();
  }

  function handleRemove() {
    setConfirmRemove(true);
  }

  function confirmRemoveProduct() {
    onRemove?.();
    setConfirmRemove(false);
    handleClose();
  }

  function handleClose() {
    setItemError("");
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overscroll-none bg-black/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !confirmRemove) {
          handleClose();
        }
      }}
    >
      <div
        ref={rootRef}
        className="relative w-full max-w-[520px] overflow-visible overscroll-contain rounded-[12px] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.18)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-pfs-title"
        data-scroll-lock-allow
      >
        <div className="flex items-start justify-between border-b border-[#00000014] px-6 py-5">
          <div>
            <h2
              id="add-pfs-title"
              className="text-[18px] font-semibold text-[#111118]"
            >
              {isEdit ? "Remove Product For Sale" : "Add Product For Sale"}
            </h2>
            {isEdit && editingProductId ? (
              <p className="mt-1 text-[13px] text-[#8A8A8A]">
                Product ID {editingProductId}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={handleClose}
            className="cursor-pointer rounded-md p-1 text-[#8A8A8A] hover:bg-[#F5F5F3] hover:text-[#111118]"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <label className="mb-2 block text-[11px] font-semibold text-[#2E2E2E]">
            Item Merchandise Name
          </label>

          <div className="relative">
            {isEdit ? (
              <div className="flex h-11 w-full items-center rounded-[8px] border border-[#00000014] bg-[#FAFAF8] px-3 text-[14px] text-[#111118]">
                <span className="truncate">{productName || "This product"}</span>
              </div>
            ) : (
            <button
              ref={triggerRef}
              type="button"
              onClick={() => {
                setMenuOpen((v) => {
                  const next = !v;
                  if (next) {
                    window.requestAnimationFrame(updateMenuPos);
                  }
                  return next;
                });
              }}
              className={cn(
                "flex h-11 w-full cursor-pointer items-center justify-between rounded-[8px] border bg-white px-3 text-left text-[14px] transition-colors",
                itemError
                  ? "border-[#D64545] ring-2 ring-[#D64545]/15"
                  : menuOpen
                    ? "border-[#F57850] ring-2 ring-[#F57850]/20"
                    : "border-[#00000014] hover:border-[#00000014]",
              )}
            >
              {selected ? (
                <span className="flex min-w-0 flex-1 items-center gap-2 pr-2">
                  <span className="truncate text-[#111118]">
                    {getItemDisplayName(selected)}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Clear selection"
                    className="inline-flex shrink-0 cursor-pointer rounded p-0.5 text-[#8A8A8A] hover:bg-[#F0F0EE] hover:text-[#111118]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId("");
                      setItemError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedId("");
                        setItemError("");
                      }
                    }}
                  >
                    <X className="size-3.5" />
                  </span>
                </span>
              ) : (
                <span className="text-[#9A9A96]">Select</span>
              )}
              <svg
                className="size-4 shrink-0 text-[#8A8A8A]"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
              >
                <path
                  d="M4 6l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            )}
          </div>
          {itemError ? (
            <p className="mt-2 text-[12px] text-[#D64545]">{itemError}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          {isEdit ? (
            <Button variant="danger" onClick={handleRemove}>
              Remove
            </Button>
          ) : (
            <Button variant="dark" disabled={!canSubmit} onClick={handleSubmit}>
              Add to List
            </Button>
          )}
        </div>
      </div>

      {menuOpen ? (
        <div
          ref={menuRef}
          data-scroll-lock-allow
          className="fixed z-[60] overflow-hidden rounded-[10px] border border-[#00000014] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
          style={{
            top: menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
          }}
        >
          <div className="border-b border-[#00000014] p-2">
            <div className="relative">
              <Search
                size={INPUT_LEADING_ICON_SIZE}
                strokeWidth={2}
                className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-foreground"
              />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="h-9 w-full rounded-lg border border-[#00000014] bg-[#FAFAF8] py-2 pr-3 pl-8 text-[13px] text-[#111118] outline-none placeholder:text-[#9A9A96] focus:border-[#F57850]"
              />
            </div>
          </div>
          <ul className="max-h-[320px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-[13px] text-[#8A8A8A]">
                No items found
              </li>
            ) : (
              filtered.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full cursor-pointer px-3 py-2.5 text-left text-[13px] hover:bg-[#F7F7F5]",
                      item.id === selectedId
                        ? "bg-[#FFF4F0] font-medium text-[#111118]"
                        : "text-[#111118]",
                    )}
                    onClick={() => {
                      setSelectedId(item.id);
                      setItemError("");
                      setMenuOpen(false);
                      setQuery("");
                    }}
                  >
                    {getItemDisplayName(item)}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmRemove}
        title="Remove Product For Sale"
        message={`Remove ${productName || "this product"}?`}
        confirmLabel="Remove"
        confirmVariant="danger"
        onClose={() => setConfirmRemove(false)}
        onConfirm={confirmRemoveProduct}
      />
    </div>
  );
}

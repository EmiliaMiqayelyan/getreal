/** Shared column header typography for admin data tables. */
export const TABLE_HEADER =
  "text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase";

/** Fixed-size ID chip (90×20) for tables and lists. */
export const ID_PILL =
  "inline-flex h-5 w-[90px] shrink-0 items-center justify-start overflow-hidden rounded-[6px] bg-id-pill px-1.5 font-mono text-[11px] font-medium leading-none text-[#6B7180]";

/** Nested/expanded sub-row padding (Figma: 10 / 23 / 10 / 23). */
export const SUB_ROW_PAD = "px-[23px] py-[10px]";

/** Page title — matches AdminHeader h1 */
export const PAGE_TITLE =
  "text-[20px] font-semibold tracking-tight text-foreground";

/** Section title within a page (e.g. Meat / Fruits) */
export const SECTION_TITLE = "text-[16px] font-semibold text-foreground";

/** Modal title */
export const MODAL_TITLE =
  "text-[18px] font-semibold tracking-tight text-foreground";

/** Form field label */
export const FIELD_LABEL =
  "mb-1.5 block text-[11px] font-semibold text-[#2E2E2E]";

/** Modal chrome */
export const MODAL_HEADER =
  "flex items-center justify-between border-b border-border px-6 pt-5 pb-3";
export const MODAL_FOOTER =
  "flex items-center justify-between gap-4 border-t border-border px-6 py-4";
export const MODAL_OVERLAY =
  "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-none p-6 sm:items-center";
export const MODAL_PANEL =
  "relative z-10 w-full overflow-hidden overscroll-contain rounded-[14px] bg-white shadow-2xl";

/** Toolbar search field with leading icon (14×14, matches INPUT_LEADING_ICON_SIZE). */
export const SEARCH_ICON =
  "pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-foreground";
export const SEARCH_INPUT = "w-full pl-8";
/** Shared header/toolbar search width - full on mobile, fixed 220px from sm up. */
export const SEARCH_FIELD_WIDTH =
  "w-full sm:w-[220px] sm:shrink-0 sm:flex-none";

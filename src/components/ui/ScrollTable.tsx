import { cn } from "@/utils/cn";

type ScrollTableProps = {
  children: React.ReactNode;
  minWidth?: number | string;
  className?: string;
  /** Skip the white bordered card. Use for a table nested inside another card. */
  bare?: boolean;
  /**
   * Fill the leftover height of a flex column and scroll inside the card.
   * The parent must be `flex min-h-0 flex-col overflow-hidden` with padding
   * outside this card — the same shell as the distributors list.
   */
  fill?: boolean;
};

/**
 * Shared shell for admin data tables.
 *
 * Matches the distributors list: the white card is the scrollport for both
 * axes, and an inner min-width keeps the header and every row on one track
 * so columns stay aligned while scrolling. Pin the header with
 * `PINNED_HEADER` so it sticks to the top of this card.
 *
 * Do not add a second scroll container around the header or the rows.
 */
export function ScrollTable({
  children,
  minWidth = 1100,
  className,
  bare = false,
  fill = false,
}: ScrollTableProps) {
  const width = typeof minWidth === "number" ? `${minWidth}px` : minWidth;

  return (
    <div
      className={cn(
        "w-full min-w-0 overflow-auto",
        !bare && "rounded-[12px] border border-[#00000014] bg-white",
        fill && "min-h-0 flex-1",
        className,
      )}
    >
      <div className="w-full" style={{ minWidth: width }}>
        {children}
      </div>
    </div>
  );
}

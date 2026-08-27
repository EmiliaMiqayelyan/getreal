import { cn } from "@/utils/cn";

type ScrollTableProps = {
  children: React.ReactNode;
  minWidth?: number | string;
  className?: string;
  /** Outer shell (border/radius). Defaults to white bordered card. */
  bare?: boolean;
};

/** Keeps wide admin grids usable on mobile via horizontal scroll. */
export function ScrollTable({
  children,
  minWidth = 960,
  className,
  bare = false,
}: ScrollTableProps) {
  const width =
    typeof minWidth === "number" ? `${minWidth}px` : minWidth;

  return (
    <div
      className={cn(
        !bare && "overflow-hidden rounded-[12px] border border-[#ECECEA] bg-white",
        className,
      )}
    >
      <div className="overflow-x-auto overscroll-x-contain">
        <div className="w-full" style={{ minWidth: width }}>
          {children}
        </div>
      </div>
    </div>
  );
}

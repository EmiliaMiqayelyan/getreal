import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

export type PaginationProps = {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

/**
 * Server-driven pager. Uses backend `page` / `limit` / `total`.
 * Hidden when everything fits on one page.
 */
export function Pagination({
  page,
  limit,
  total,
  onPageChange,
  className,
}: PaginationProps) {
  const safeLimit = Math.max(1, limit);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(1, page), totalPages);

  if (total <= safeLimit && safePage <= 1) return null;

  const from = total === 0 ? 0 : (safePage - 1) * safeLimit + 1;
  const to = Math.min(safePage * safeLimit, total);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-[#00000014] bg-white px-4 py-3 md:px-7",
        className,
      )}
    >
      <p className="text-[12px] font-medium text-[#6B7180]">
        {from}-{to} of {total}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          aria-label="Previous page"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="!h-8 !px-2.5"
        >
          <ChevronLeft size={14} />
        </Button>

        <span className="min-w-[5.5rem] text-center text-[12px] font-medium text-[#111118]">
          Page {safePage} of {totalPages}
        </span>

        <Button
          variant="outline"
          aria-label="Next page"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="!h-8 !px-2.5"
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}

import { useState } from "react";

import { ChevronDownIcon, ChevronRightIcon } from "@/components/icons";
import { LocationHover } from "@/components/shared/LocationHover";
import { IdPill, Tag } from "@/components/ui/Badge";
import { TABLE_HEADER, SUB_ROW_PAD } from "@/constants/table";
import type { Distributor } from "@/types/distributor";
import { cn } from "@/utils/cn";
import { getDistributorFullAddress } from "@/utils/distributors";
import { formatPricePerUnit } from "@/utils/format";

type DistributorTableProps = {
  distributors: Distributor[];
};

const COLUMNS = [
  "ID",
  "DISTRIBUTOR",
  "CONTACT",
  "PHONE",
  "CATEGORIES",
  "LOCATION",
  "DELIVERY",
  "ITEMS",
  "DOCS",
] as const;

const PRODUCT_COLUMNS = [
  "PRODUCT NAME",
  "SOURCE",
  "PRICE",
  "QTY",
  "UNIT",
] as const;

export function DistributorTable({ distributors }: DistributorTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  function toggleRow(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-xl bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#00000014] bg-surface">
              <th className="w-8 px-4 py-3" aria-hidden />
              {COLUMNS.map((column) => (
                <th
                  key={column}
                  className={cn("px-3 py-3", TABLE_HEADER)}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {distributors.map((distributor) => {
              const expanded = expandedIds.has(distributor.id);

              return (
                <DistributorRow
                  key={distributor.id}
                  distributor={distributor}
                  expanded={expanded}
                  onToggle={() => toggleRow(distributor.id)}
                />
              );
            })}
            {distributors.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length + 1}
                  className="px-4 py-8 text-center text-sm text-muted"
                >
                  No distributors found
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type DistributorRowProps = {
  distributor: Distributor;
  expanded: boolean;
  onToggle: () => void;
};

function DistributorRow({
  distributor,
  expanded,
  onToggle,
}: DistributorRowProps) {
  return (
    <>
      <tr
        className={cn(
          "bg-surface",
          expanded ? "border-b-0" : "border-b border-[#00000014]",
        )}
      >
        <td className="px-4 py-3.5">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={
              expanded
                ? `Collapse ${distributor.name}`
                : `Expand ${distributor.name}`
            }
            className={cn(
              "rounded p-0.5 transition-colors",
              expanded ? "text-badge" : "text-muted hover:text-foreground",
            )}
          >
            {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </button>
        </td>
        <td className="px-3 py-3.5">
          <IdPill>{distributor.id}</IdPill>
        </td>
        <td className="px-3 py-3.5">
          <div className="leading-tight">
            <p className="text-sm font-semibold text-foreground">
              {distributor.name}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {distributor.paymentTerms}
            </p>
          </div>
        </td>
        <td className="px-3 py-3.5 text-sm text-muted-strong">
          {distributor.contact}
        </td>
        <td className="px-3 py-3.5 text-sm text-muted-strong">
          {distributor.phone}
        </td>
        <td className="px-3 py-3.5">
          <div className="flex flex-wrap gap-1.5">
            {distributor.categories.map((category) => (
              <Tag key={category}>{category}</Tag>
            ))}
          </div>
        </td>
        <td className="px-3 py-3.5 text-sm text-muted-strong">
          <LocationHover
            className="text-sm text-muted-strong"
            fullAddress={getDistributorFullAddress(distributor)}
          >
            {distributor.location}
          </LocationHover>
        </td>
        <td className="px-3 py-3.5 text-sm text-muted-strong">
          {distributor.delivery}
        </td>
        <td className="px-3 py-3.5 text-sm text-foreground">
          {distributor.items}
        </td>
        <td className="px-3 py-3.5 text-sm text-muted">
          {distributor.docs ?? "—"}
        </td>
      </tr>

      {expanded ? (
        <tr className="border-b border-[#00000014] last:border-b-0">
          <td colSpan={COLUMNS.length + 1} className="bg-background p-0">
            <div className={cn("border-t border-[#00000014] bg-[#FBF9F9]", SUB_ROW_PAD)}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#00000014]">
                      {PRODUCT_COLUMNS.map((column) => (
                        <th
                          key={column}
                          className={cn("px-3 py-2", TABLE_HEADER)}
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {distributor.products.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b border-[#00000014]/70 last:border-b-0"
                      >
                        <td className="px-3 py-2.5 text-sm font-semibold text-foreground">
                          <div>{product.name}</div>
                          <div className="mt-0.5 text-xs font-normal text-muted">
                            {product.product}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-sm text-muted-strong">
                          {product.source}
                        </td>
                        <td className="px-3 py-2.5 text-sm font-semibold text-foreground">
                          {formatPricePerUnit(product.price, product.unit)}
                        </td>
                        <td className="px-3 py-2.5 text-sm text-muted-strong">
                          {product.qty}
                        </td>
                        <td className="px-3 py-2.5 text-sm text-muted-strong">
                          {product.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

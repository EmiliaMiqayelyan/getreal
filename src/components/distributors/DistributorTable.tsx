import { useState } from "react";

import { ChevronDownIcon, ChevronRightIcon } from "@/components/icons";
import { IdPill, Tag } from "@/components/ui/Badge";
import type { Distributor } from "@/types/distributor";
import { cn } from "@/utils/cn";
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(distributors[0] ? [distributors[0].id] : []),
  );

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
            <tr className="border-b border-[#E4E6EB] bg-surface">
              <th className="w-8 px-4 py-3" aria-hidden />
              {COLUMNS.map((column) => (
                <th
                  key={column}
                  className="px-3 py-3 text-[11px] font-medium tracking-[0.04em] text-muted uppercase"
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
          expanded ? "border-b-0" : "border-b border-[#E4E6EB]",
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
          {distributor.location}
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
        <tr className="border-b border-[#E4E6EB] last:border-b-0">
          <td colSpan={COLUMNS.length + 1} className="bg-[#EEF0F4] p-0">
            <div className="border-t border-[#E4E6EB] px-10 py-3">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E4E6EB]">
                    {PRODUCT_COLUMNS.map((column) => (
                      <th
                        key={column}
                        className="px-3 py-2 text-[11px] font-medium tracking-[0.04em] text-muted uppercase"
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
                      className="border-b border-[#E4E6EB]/70 last:border-b-0"
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
          </td>
        </tr>
      ) : null}
    </>
  );
}

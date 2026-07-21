import { useState } from "react";

import {
  ChevronDownIcon,
  ChevronRightIcon,
  NoteIcon,
} from "@/components/icons";
import { IdPill, Tag } from "@/components/ui/Badge";
import type { Customer } from "@/types/customer";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/format";

type CustomerTableProps = {
  customers: Customer[];
};

const COLUMNS = [
  "ID",
  "CUSTOMER",
  "EMAIL",
  "PHONE",
  "ADDRESS",
  "ORDERS",
  "TOTAL",
  "LAST ORDER",
] as const;

const ORDER_COLUMNS = ["ORDER", "DATE", "ITEMS", "TOTAL", "STATUS"] as const;

export function CustomerTable({ customers }: CustomerTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
        <table className="w-full min-w-[960px] border-collapse text-left">
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
            {customers.map((customer) => {
              const expanded = expandedIds.has(customer.id);

              return (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  expanded={expanded}
                  onToggle={() => toggleRow(customer.id)}
                />
              );
            })}
            {customers.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length + 1}
                  className="px-4 py-8 text-center text-sm text-muted"
                >
                  No customers found
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type CustomerRowProps = {
  customer: Customer;
  expanded: boolean;
  onToggle: () => void;
};

function CustomerRow({ customer, expanded, onToggle }: CustomerRowProps) {
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
              expanded ? `Collapse ${customer.name}` : `Expand ${customer.name}`
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
          <IdPill>{customer.id}</IdPill>
        </td>
        <td className="px-3 py-3.5">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
            {customer.name}
            {customer.hasNote ? <NoteIcon className="text-muted" /> : null}
          </span>
        </td>
        <td className="px-3 py-3.5 text-sm text-muted-strong">
          {customer.email}
        </td>
        <td className="px-3 py-3.5 text-sm text-muted-strong">
          {customer.phone}
        </td>
        <td className="px-3 py-3.5 text-sm text-muted-strong">
          {customer.address}
        </td>
        <td className="px-3 py-3.5 text-sm text-foreground">{customer.orders}</td>
        <td className="px-3 py-3.5 text-sm font-semibold text-foreground">
          {formatCurrency(customer.total)}
        </td>
        <td className="px-3 py-3.5 text-sm text-muted-strong">
          {customer.lastOrder}
        </td>
      </tr>

      {expanded ? (
        <tr className="border-b border-[#E4E6EB] last:border-b-0">
          <td colSpan={COLUMNS.length + 1} className="bg-[#EEF0F4] p-0">
            <div className="border-t border-[#E4E6EB] px-10 py-3">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E4E6EB]">
                    {ORDER_COLUMNS.map((column) => (
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
                  {customer.orderHistory.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-[#E4E6EB]/70 last:border-b-0"
                    >
                      <td className="px-3 py-2.5 text-sm font-semibold text-foreground">
                        {order.id}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-muted-strong">
                        {order.date}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-foreground">
                        {order.items}
                      </td>
                      <td className="px-3 py-2.5 text-sm font-semibold text-foreground">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Tag>{order.status}</Tag>
                      </td>
                    </tr>
                  ))}
                  {customer.orderHistory.length === 0 ? (
                    <tr>
                      <td
                        colSpan={ORDER_COLUMNS.length}
                        className="px-3 py-4 text-sm text-muted"
                      >
                        No order history
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

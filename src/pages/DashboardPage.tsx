import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  Calendar,
  ChevronDown,
  Clock,
  DollarSign,
  Package,
  ShoppingCart,
  Truck,
  TrendingUp,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router";

import { Header } from "@/components/layout/AdminHeader";
import { Select } from "@/components/ui/Select";
import { ROUTES } from "@/constants";
import { ADMIN_CUSTOMERS } from "@/data/admin";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/utils/cn";

type ChartMode = "daily" | "weekly" | "monthly";

const ORDERS_CHART = {
  daily: [
    { name: "Jun 24", value: 12 },
    { name: "Jun 25", value: 28 },
    { name: "Jun 26", value: 18 },
    { name: "Jun 27", value: 32 },
    { name: "Jun 28", value: 22 },
    { name: "Jun 29", value: 30 },
    { name: "Jun 30", value: 16 },
  ],
  weekly: [
    { name: "W1", value: 48 },
    { name: "W2", value: 62 },
    { name: "W3", value: 41 },
    { name: "W4", value: 55 },
  ],
  monthly: [
    { name: "Apr", value: 120 },
    { name: "May", value: 145 },
    { name: "Jun", value: 168 },
    { name: "Jul", value: 152 },
  ],
};

const REVENUE_CHART = {
  daily: [
    { name: "Jun 24", value: 140 },
    { name: "Jun 25", value: 255 },
    { name: "Jun 26", value: 180 },
    { name: "Jun 27", value: 310 },
    { name: "Jun 28", value: 220 },
    { name: "Jun 29", value: 290 },
    { name: "Jun 30", value: 170 },
  ],
  weekly: [
    { name: "W1", value: 920 },
    { name: "W2", value: 1140 },
    { name: "W3", value: 880 },
    { name: "W4", value: 1020 },
  ],
  monthly: [
    { name: "Apr", value: 3200 },
    { name: "May", value: 4100 },
    { name: "Jun", value: 4800 },
    { name: "Jul", value: 5285 },
  ],
};

function ChartToggle({
  value,
  onChange,
}: {
  value: ChartMode;
  onChange: (mode: ChartMode) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-[8px] bg-[#EFEFED] p-0.5">
      {(["Daily", "Weekly", "Monthly"] as const).map((label) => {
        const mode = label.toLowerCase() as ChartMode;
        const active = value === mode;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(mode)}
            className={cn(
              "rounded-[6px] px-3 py-1.5 text-[12px] font-medium transition-colors",
              active
                ? "bg-white text-[#111118] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                : "text-[#8A8A8A] hover:text-[#111118]",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function AreaChartCard({
  title,
  data,
  mode,
  onModeChange,
  yFormatter,
}: {
  title: string;
  data: { name: string; value: number }[];
  mode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
  yFormatter?: (value: number) => string;
}) {
  const gradientId = `grad-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <section className="rounded-[12px] border border-[#ECECEA] bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-[#111118]">{title}</h2>
        <ChartToggle value={mode} onChange={onModeChange} />
      </div>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#28402B" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#28402B" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="4 4"
              vertical={false}
              stroke="#E8E8E6"
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9A9A9A", fontSize: 11 }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={42}
              tick={{ fill: "#9A9A9A", fontSize: 11 }}
              tickFormatter={(value: number) =>
                yFormatter ? yFormatter(value) : String(value)
              }
            />
            <Tooltip
              formatter={(value) =>
                typeof value === "number"
                  ? yFormatter
                    ? yFormatter(value)
                    : value
                  : String(value)
              }
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #ECECEA",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#28402B"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, fill: "#28402B" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  useDocumentTitle("Dashboard Report");

  const navigate = useNavigate();
  const [ordersMode, setOrdersMode] = useState<ChartMode>("daily");
  const [revenueMode, setRevenueMode] = useState<ChartMode>("daily");
  const [statusFilter, setStatusFilter] = useState("all");

  const topCustomers = useMemo(
    () =>
      [...ADMIN_CUSTOMERS]
        .sort((a, b) => b.orderQuantity - a.orderQuantity)
        .slice(0, 5),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <Header
        title="Dashboard Report"
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <button
              type="button"
              className="inline-flex h-[34px] items-center gap-2 rounded-[8px] border border-[#E6E6E3] bg-white px-3 text-[13px] text-[#111118]"
            >
              <Calendar size={14} className="text-[#8A8A8A]" />
              Select Date
              <ChevronDown size={14} className="text-[#8A8A8A]" />
            </button>

            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              aria-label="All Statuses"
              options={[
                { value: "all", label: "All Statuses" },
                { value: "requests", label: "Requests" },
                { value: "packing", label: "Packing & Ready" },
                { value: "on-the-way", label: "On the Way" },
              ]}
            />
          </div>
        }
      />

      <div className="flex-1 overflow-auto px-4 md:px-7 py-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Total Revenue",
              value: "$5,285.30",
              subtitle: "All time revenue",
              icon: DollarSign,
              iconBg: "bg-[#E8F2EA]",
              iconColor: "text-[#28402B]",
            },
            {
              title: "Total Expenses",
              value: "$3,160.50",
              subtitle: "From product orders",
              icon: TrendingUp,
              iconBg: "bg-[#FDECEC]",
              iconColor: "text-[#E25B5B]",
              onClick: () => navigate(ROUTES.productOrders),
            },
            {
              title: "Total Orders",
              value: "41",
              subtitle: "Total customer orders",
              icon: ShoppingCart,
              iconBg: "bg-[#FFF0E8]",
              iconColor: "text-[#F57850]",
              onClick: () => navigate(ROUTES.customerOrders),
            },
            {
              title: "Total Customers",
              value: "6",
              subtitle: "Active customers",
              icon: Users,
              iconBg: "bg-[#EAF1FB]",
              iconColor: "text-[#4B7CC9]",
              onClick: () => navigate(ROUTES.customers),
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.title}
                type="button"
                onClick={card.onClick}
                className="rounded-[12px] border border-[#ECECEA] bg-white p-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-[#8A8A8A]">
                      {card.title}
                    </p>
                    <p className="mt-2 text-[26px] font-semibold tracking-tight text-[#111118]">
                      {card.value}
                    </p>
                    <p className="mt-1 text-[12px] text-[#9A9A9A]">
                      {card.subtitle}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full",
                      card.iconBg,
                      card.iconColor,
                    )}
                  >
                    <Icon size={18} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
          <div className="space-y-4">
            <AreaChartCard
              title="Recent Orders"
              data={ORDERS_CHART[ordersMode]}
              mode={ordersMode}
              onModeChange={setOrdersMode}
            />
            <AreaChartCard
              title="Revenue Overview"
              data={REVENUE_CHART[revenueMode]}
              mode={revenueMode}
              onModeChange={setRevenueMode}
              yFormatter={(value) => `$${value}`}
            />
          </div>

          <div className="space-y-4">
            <section className="rounded-[12px] border border-[#ECECEA] bg-white p-5">
              <h2 className="mb-4 text-[15px] font-semibold text-[#111118]">
                Order Status
              </h2>

              <div className="space-y-1">
                {[
                  {
                    label: "Requests",
                    value: 4,
                    icon: Clock,
                    iconBg: "bg-[#FFF0E8]",
                    iconColor: "text-[#E07A4F]",
                  },
                  {
                    label: "Packing & Ready",
                    value: 28,
                    icon: Package,
                    iconBg: "bg-[#EAF1FB]",
                    iconColor: "text-[#4B7CC9]",
                  },
                  {
                    label: "On the Way",
                    value: 0,
                    icon: Truck,
                    iconBg: "bg-[#F0EBFA]",
                    iconColor: "text-[#7B5EA7]",
                  },
                ].map((row) => {
                  const Icon = row.icon;
                  return (
                    <button
                      key={row.label}
                      type="button"
                      onClick={() => navigate(ROUTES.customerOrders)}
                      className="flex w-full items-center gap-3 rounded-[8px] px-1 py-2.5 text-left transition-colors hover:bg-[#FAFAF8]"
                    >
                      <div
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-[10px]",
                          row.iconBg,
                          row.iconColor,
                        )}
                      >
                        <Icon size={16} strokeWidth={1.75} />
                      </div>
                      <span className="min-w-0 flex-1 text-[13px] font-medium text-[#111118]">
                        {row.label}
                      </span>
                      <span className="shrink-0 text-[14px] font-semibold text-[#111118]">
                        {row.value}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="my-3 border-t border-[#F0F0EE]" />

              <button
                type="button"
                onClick={() => navigate(ROUTES.productOrders)}
                className="flex w-full items-center gap-3 rounded-[8px] px-1 py-2 text-left transition-colors hover:bg-[#FAFAF8]"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#FFF0E8] text-[#E07A4F]">
                  <Package size={16} strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-[#111118]">
                    Pending Orders from Distributors
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#9A9A9A]">
                    Awaiting delivery
                  </div>
                </div>
                <span className="shrink-0 text-[14px] font-semibold text-[#111118]">
                  3
                </span>
              </button>
            </section>

            <section className="rounded-[12px] border border-[#ECECEA] bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-[#111118]">
                  Top Customers
                </h2>
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.customers)}
                  className="inline-flex items-center gap-0.5 text-[13px] font-medium text-[#111118]"
                >
                  View All
                  <ArrowUpRight size={13} />
                </button>
              </div>

              <div className="divide-y divide-[#F0F0EE]">
                {topCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => navigate(ROUTES.customers)}
                    className="flex w-full items-center justify-between py-3 text-left transition-colors first:pt-1 last:pb-0 hover:opacity-80"
                  >
                    <div>
                      <div className="text-[13px] font-medium text-[#111118]">
                        {customer.firstName} {customer.lastName}
                      </div>
                      <div className="mt-0.5 text-[12px] text-[#9A9A9A]">
                        {customer.orderQuantity} orders
                      </div>
                    </div>
                    <ArrowUpRight size={15} className="text-[#B0B0B0]" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

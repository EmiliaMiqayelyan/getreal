import { useEffect, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ROUTES } from "@/constants";
import { ADMIN_CUSTOMERS } from "@/data/admin";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  dashboardApi,
  getQuickBooksAuthUrl,
  isApiConfigured,
} from "@/lib/api";
import { cn } from "@/utils/cn";

type ChartMode = "daily" | "weekly" | "monthly";

/** Temporary seed chart points until Dashboard API owns these series. */
const ORDERS_CHART: Record<ChartMode, { name: string; value: number }[]> = {
  daily: [],
  weekly: [],
  monthly: [],
};

const REVENUE_CHART: Record<ChartMode, { name: string; value: number }[]> = {
  daily: [],
  weekly: [],
  monthly: [],
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
    <section className="rounded-[12px] border border-[#00000014] bg-white p-5">
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
  const [apiStats, setApiStats] = useState<Record<string, unknown> | null>(
    null,
  );
  const [ordersChartApi, setOrdersChartApi] = useState<
    typeof ORDERS_CHART.daily | null
  >(null);
  const [revenueChartApi, setRevenueChartApi] = useState<
    typeof REVENUE_CHART.daily | null
  >(null);

  useEffect(() => {
    if (!isApiConfigured()) return;
    let cancelled = false;

    async function load() {
      try {
        const [stats, ordersChart, revenueChart] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getChart(ordersMode),
          dashboardApi.getChart(revenueMode),
        ]);
        if (cancelled) return;
        setApiStats(stats && typeof stats === "object" ? stats : null);
        if (Array.isArray(ordersChart) && ordersChart.length > 0) {
          setOrdersChartApi(
            ordersChart.map((point, index) => ({
              name:
                String(point.name ?? point.label ?? `P${index + 1}`),
              value: Number(point.value ?? point.total ?? 0),
            })),
          );
        }
        if (Array.isArray(revenueChart) && revenueChart.length > 0) {
          setRevenueChartApi(
            revenueChart.map((point, index) => ({
              name:
                String(point.name ?? point.label ?? `P${index + 1}`),
              value: Number(point.value ?? point.total ?? 0),
            })),
          );
        }
      } catch {
        // Keep seeded dashboard data.
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [ordersMode, revenueMode]);

  const ordersChartData =
    ordersChartApi ?? ORDERS_CHART[ordersMode];
  const revenueChartData =
    revenueChartApi ?? REVENUE_CHART[revenueMode];

  const statCards = useMemo(
    () => [
      {
        title: "Total Revenue",
        value:
          (apiStats?.totalRevenue as string | number | undefined)?.toString() ??
          "$5,285.30",
        subtitle: "All time revenue",
        icon: DollarSign,
        iconBg: "bg-[#E8F2EA]",
        iconColor: "text-[#28402B]",
      },
      {
        title: "Total Expenses",
        value:
          (apiStats?.totalExpenses as string | number | undefined)?.toString() ??
          "$3,160.50",
        subtitle: "From product orders",
        icon: TrendingUp,
        iconBg: "bg-[#FDECEC]",
        iconColor: "text-[#E25B5B]",
        onClick: () => navigate(ROUTES.productOrders),
      },
      {
        title: "Total Orders",
        value:
          (apiStats?.totalOrders as string | number | undefined)?.toString() ??
          "41",
        subtitle: "Total customer orders",
        icon: ShoppingCart,
        iconBg: "bg-[#FFF0E8]",
        iconColor: "text-[#F57850]",
        onClick: () => navigate(ROUTES.customerOrders),
      },
      {
        title: "Total Customers",
        value:
          (apiStats?.totalCustomers as string | number | undefined)?.toString() ??
          "6",
        subtitle: "Active customers",
        icon: Users,
        iconBg: "bg-[#EAF1FB]",
        iconColor: "text-[#4B7CC9]",
        onClick: () => navigate(ROUTES.customers),
      },
    ],
    [apiStats, navigate],
  );

  const topCustomers = useMemo(
    () =>
      [...ADMIN_CUSTOMERS]
        .sort((a, b) => b.orderQuantity - a.orderQuantity)
        .slice(0, 5),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
      <Header
        title="Dashboard Report"
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            {isApiConfigured() ? (
              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = getQuickBooksAuthUrl();
                }}
              >
                QuickBooks
              </Button>
            ) : null}

            <Button variant="outline">
              <Calendar size={14} className="text-muted" />
              Select Date
              <ChevronDown size={14} className="text-muted" />
            </Button>

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

      <div className="flex-1 overflow-auto bg-[#FAFAFA] px-4 py-5 md:px-7">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.title}
                type="button"
                onClick={card.onClick}
                className="rounded-[12px] border border-[#00000014] bg-white p-4 text-left"
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
              data={ordersChartData}
              mode={ordersMode}
              onModeChange={setOrdersMode}
            />
            <AreaChartCard
              title="Revenue Overview"
              data={revenueChartData}
              mode={revenueMode}
              onModeChange={setRevenueMode}
              yFormatter={(value) => `$${value}`}
            />
          </div>

          <div className="space-y-4">
            <section className="rounded-[12px] border border-[#00000014] bg-white p-5">
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

              <div className="my-3 border-t border-[#00000014]" />

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

            <section className="rounded-[12px] border border-[#00000014] bg-white p-5">
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

              <div className="divide-y divide-[#00000014]">
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

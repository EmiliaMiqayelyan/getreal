import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react";

import { UserMenu } from "@/components/layout/UserMenu";
import { Input } from "@/components/ui/Input";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { Select } from "@/components/ui/Select";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/utils/cn";

const ORANGE = "#F57850";
const GREEN = "#28402B";

const LOCATION_OPTIONS = [
  "Freezer 1",
  "Freezer 2",
  "Freezer 3",
  "Fridge 1",
  "Fridge 2",
  "Fridge 3",
  "Dry Shelf 1",
  "Dry Shelf 2",
  "Dry Shelf 3",
] as const;

type InventoryLot = {
  orderId: string;
  distributor: string;
  source: string;
  deliveryDate: string;
  purchased: string;
  qty: number;
  unit: string;
  location: string;
};

type InventoryProduct = {
  id: string;
  name: string;
  lots: InventoryLot[];
};

type InventorySection = {
  title: string;
  sourceLabel: "FARMER" | "SOURCE";
  products: InventoryProduct[];
};

type LocationSplit = {
  qty: number;
  location: string;
};

type StockItem = {
  id: string;
  orderId: string;
  itemName: string;
  qty: number;
  unit: string;
  qtyAfterUnpack: string;
  expDate: string;
  location: string;
  splits: LocationSplit[];
};

type StockSection = {
  title: string;
  items: StockItem[];
};

type ReceivedOrder = {
  id: string;
  supplier: string;
  itemsCount: string;
  receivedAt: string;
  sections: StockSection[];
};

type EditLocationTarget = {
  sectionTitle: string;
  productId: string;
  lotIndex: number;
};

type DistributeTarget = {
  sectionTitle: string;
  itemId: string;
};

const INITIAL_SECTIONS: InventorySection[] = [
  {
    title: "Meat",
    sourceLabel: "FARMER",
    products: [
      {
        id: "angus",
        name: "Angus Chuck Ground Beef",
        lots: [],
      },
      {
        id: "wagyu",
        name: "Wagyu Aged Tenderloin Steak",
        lots: [
          {
            orderId: "OPE-10044",
            distributor: "Rancho Protein LLC",
            source: "Lena Hoffman",
            deliveryDate: "Jul 17, 2026, 07:30",
            purchased: "$18.50/ea",
            qty: 5,
            unit: "8oz ea",
            location: "Freezer 1",
          },
        ],
      },
      {
        id: "ribeye",
        name: "Rib-eye Steak",
        lots: [
          {
            orderId: "OPE-10045",
            distributor: "4PF Co.",
            source: "FreshMarket Co.",
            deliveryDate: "Jul 16, 2026, 08:00",
            purchased: "$90/case",
            qty: 5,
            unit: "16oz ea",
            location: "Freezer 2",
          },
        ],
      },
      {
        id: "nystrip",
        name: "NY Strip Steak",
        lots: [
          {
            orderId: "OPE-10050",
            distributor: "4PF Co.",
            source: "FreshMarket Co.",
            deliveryDate: "Jul 16, 2026, 08:00",
            purchased: "$14.00/ea",
            qty: 3,
            unit: "16oz ea",
            location: "Freezer 2",
          },
        ],
      },
    ],
  },
  {
    title: "Poultry",
    sourceLabel: "FARMER",
    products: [
      {
        id: "whole-chicken",
        name: "Whole Chicken",
        lots: [],
      },
      {
        id: "drumsticks",
        name: "Drumsticks",
        lots: [
          {
            orderId: "OPE-10060",
            distributor: "Greenfield Farms",
            source: "Sofia Reyes",
            deliveryDate: "Jul 19, 2026, 06:00",
            purchased: "$7.50/pack",
            qty: 3,
            unit: "2 per pack",
            location: "Fridge 1",
          },
        ],
      },
      {
        id: "thighs",
        name: "Thighs",
        lots: [
          {
            orderId: "OPE-10061",
            distributor: "Greenfield Farms",
            source: "Sofia Reyes",
            deliveryDate: "Jul 19, 2026, 06:00",
            purchased: "$8.25/lb",
            qty: 2,
            unit: "1lb",
            location: "Fridge 1",
          },
        ],
      },
      {
        id: "breasts",
        name: "Breasts",
        lots: [],
      },
    ],
  },
];

const RECEIVED_ORDERS: ReceivedOrder[] = [
  {
    id: "r-rancho",
    supplier: "Rancho Protein LLC",
    itemsCount: "6 items",
    receivedAt: "Jul 20, 2026 · 12:35 PM",
    sections: [
      {
        title: "Meat",
        items: [
          {
            id: "rancho-1",
            orderId: "ID-002-08",
            itemName: "Angus Chuck Ground Beef",
            qty: 1,
            unit: "Case",
            qtyAfterUnpack: "4",
            expDate: "Jul 28, 2026",
            location: "",
            splits: [],
          },
          {
            id: "rancho-2",
            orderId: "ID-001-20",
            itemName: "Rib-eye Steak",
            qty: 1,
            unit: "Case",
            qtyAfterUnpack: "2",
            expDate: "Jul 28, 2026",
            location: "",
            splits: [],
          },
          {
            id: "rancho-3",
            orderId: "ID-001-21",
            itemName: "NY Strip Steak",
            qty: 1,
            unit: "Case",
            qtyAfterUnpack: "2",
            expDate: "Jul 28, 2026",
            location: "",
            splits: [],
          },
        ],
      },
      {
        title: "Fruits",
        items: [
          {
            id: "rancho-4",
            orderId: "ID-115-01",
            itemName: "Blueberries",
            qty: 2,
            unit: "Box",
            qtyAfterUnpack: "2",
            expDate: "Jul 25, 2026",
            location: "",
            splits: [],
          },
          {
            id: "rancho-5",
            orderId: "ID-116-02",
            itemName: "Strawberries",
            qty: 1,
            unit: "Box",
            qtyAfterUnpack: "1",
            expDate: "Jul 24, 2026",
            location: "",
            splits: [],
          },
          {
            id: "rancho-6",
            orderId: "ID-117-03",
            itemName: "Lemons",
            qty: 1,
            unit: "Pack",
            qtyAfterUnpack: "1",
            expDate: "Jul 30, 2026",
            location: "",
            splits: [],
          },
        ],
      },
    ],
  },
  {
    id: "r-4pf",
    supplier: "4PF Co.",
    itemsCount: "14 items",
    receivedAt: "Jul 20, 2026 · 12:35 PM",
    sections: [
      {
        title: "Meat",
        items: [
          {
            id: "4pf-angus",
            orderId: "ID-002-02",
            itemName: "Angus Chuck Ground Beef",
            qty: 1,
            unit: "Case",
            qtyAfterUnpack: "6",
            expDate: "Jul 28, 2026",
            location: "",
            splits: [],
          },
          {
            id: "4pf-ribeye-1",
            orderId: "ID-001-10",
            itemName: "Rib-eye Steak",
            qty: 1,
            unit: "Case",
            qtyAfterUnpack: "1",
            expDate: "Jul 28, 2026",
            location: "",
            splits: [],
          },
          {
            id: "4pf-ribeye-2",
            orderId: "ID-001-11",
            itemName: "Rib-eye Steak",
            qty: 1,
            unit: "Case",
            qtyAfterUnpack: "1",
            expDate: "Jul 28, 2026",
            location: "",
            splits: [],
          },
          {
            id: "4pf-ribeye-3",
            orderId: "ID-001-12",
            itemName: "Rib-eye Steak",
            qty: 1,
            unit: "Case",
            qtyAfterUnpack: "1",
            expDate: "Jul 28, 2026",
            location: "",
            splits: [],
          },
          {
            id: "4pf-chicken-1",
            orderId: "ID-015-03",
            itemName: "Legion Fields Whole Chicken",
            qty: 1,
            unit: "Case",
            qtyAfterUnpack: "1",
            expDate: "Jul 28, 2026",
            location: "",
            splits: [],
          },
          {
            id: "4pf-chicken-2",
            orderId: "ID-015-04",
            itemName: "Legion Fields Whole Chicken",
            qty: 1,
            unit: "Case",
            qtyAfterUnpack: "1",
            expDate: "Jul 28, 2026",
            location: "",
            splits: [],
          },
        ],
      },
      {
        title: "Fruits",
        items: [
          {
            id: "4pf-blue-1",
            orderId: "ID-115-04",
            itemName: "Blueberries",
            qty: 2,
            unit: "Box",
            qtyAfterUnpack: "2",
            expDate: "Jul 28, 2026",
            location: "",
            splits: [],
          },
        ],
      },
    ],
  },
];

const PRODUCT_MATCH: Record<string, string> = {
  "Angus Chuck Ground Beef": "angus",
  "Wagyu Aged Tenderloin Steak": "wagyu",
  "Rib-eye Steak": "ribeye",
  "NY Strip Steak": "nystrip",
  "Whole Chicken": "whole-chicken",
  "Legion Fields Whole Chicken": "whole-chicken",
  Drumsticks: "drumsticks",
  Thighs: "thighs",
  Breasts: "breasts",
};

const GRID =
  "grid grid-cols-[28px_100px_1.15fr_1.1fr_1.25fr_100px_80px_70px_120px] items-center gap-2";

const STOCK_GRID =
  "grid grid-cols-[110px_1.4fr_48px_70px_120px_110px_1fr_120px] items-center gap-2";

function stockTotal(product: InventoryProduct) {
  return product.lots.reduce((sum, lot) => sum + lot.qty, 0);
}

function parseUnpackQty(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function defaultSplits(total: number): LocationSplit[] {
  if (total <= 0) {
    return [
      { qty: 0, location: "Freezer 1" },
      { qty: 0, location: "Freezer 2" },
    ];
  }
  const first = Math.max(1, Math.ceil(total * (2 / 3)));
  const second = Math.max(0, total - first);
  return [
    { qty: first, location: "Freezer 1" },
    { qty: second, location: "Freezer 2" },
  ];
}

function QtyStepper({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
}) {
  return (
    <div className="flex h-9 w-[108px] items-center overflow-hidden rounded-[8px] border border-[#E6E6E3] bg-white">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-full w-8 items-center justify-center text-[#8A8A8A] hover:bg-[#F5F5F3]"
      >
        <Minus size={14} />
      </button>
      <span className="flex-1 text-center text-[14px] font-semibold text-[#2E2E2E]">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(value + 1)}
        className="flex h-full w-8 items-center justify-center text-[#8A8A8A] hover:bg-[#F5F5F3]"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function LocationSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Select
      value={value}
      onChange={onChange}
      className={cn("w-full", className)}
      aria-label="Location"
      options={[
        { value: "", label: "Select location" },
        ...LOCATION_OPTIONS.map((location) => ({
          value: location,
          label: location,
        })),
      ]}
    />
  );
}

function SplitModal({
  open,
  title,
  subtitle,
  confirmLabel,
  splits,
  onChangeSplits,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  confirmLabel: string;
  splits: LocationSplit[];
  onChangeSplits: (next: LocationSplit[]) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  function updateRow(index: number, patch: Partial<LocationSplit>) {
    onChangeSplits(
      splits.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close dialog overlay"
        className="absolute inset-0 bg-[#333333]/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-[12px] bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between px-6 pt-5 pb-2">
          <div>
            <h2 className="text-[18px] font-semibold text-[#2E2E2E]">{title}</h2>
            <p className="mt-1 text-[13px] text-[#8A8A8A]">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-[#8A8A8A] hover:bg-[#F5F5F3]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 px-6 py-4">
          {splits.map((row, index) => (
            <div key={index} className="flex items-center gap-3">
              <QtyStepper
                value={row.qty}
                onChange={(qty) => updateRow(index, { qty })}
              />
              <LocationSelect
                value={row.location}
                onChange={(location) => updateRow(index, { location })}
                className="flex-1"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#F0F0EE] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="text-[14px] font-medium text-[#8A8A8A]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[8px] px-5 py-2.5 text-[14px] font-semibold text-white"
            style={{ background: GREEN }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function StockItemsView({
  order,
  onClose,
  onComplete,
}: {
  order: ReceivedOrder;
  onClose: () => void;
  onComplete: (order: ReceivedOrder) => void;
}) {
  const [draft, setDraft] = useState(order);
  const [distributeTarget, setDistributeTarget] =
    useState<DistributeTarget | null>(null);
  const [distributeSplits, setDistributeSplits] = useState<LocationSplit[]>([]);

  const activeItem =
    distributeTarget == null
      ? null
      : (draft.sections
          .find((section) => section.title === distributeTarget.sectionTitle)
          ?.items.find((item) => item.id === distributeTarget.itemId) ?? null);

  function updateItem(
    sectionTitle: string,
    itemId: string,
    patch: Partial<StockItem>,
  ) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.title !== sectionTitle
          ? section
          : {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId ? { ...item, ...patch } : item,
              ),
            },
      ),
    }));
  }

  function openDistribute(sectionTitle: string, item: StockItem) {
    const unpack = parseUnpackQty(item.qtyAfterUnpack);
    const existing =
      item.splits.length > 0
        ? item.splits
        : item.location
          ? [
              {
                qty: unpack || item.qty,
                location: item.location,
              },
              { qty: 0, location: "Freezer 2" },
            ]
          : defaultSplits(unpack || item.qty || 6);

    setDistributeTarget({ sectionTitle, itemId: item.id });
    setDistributeSplits(existing);
  }

  function confirmDistribute() {
    if (!distributeTarget || !activeItem) return;

    const valid = distributeSplits.filter(
      (row) => row.qty > 0 && row.location.trim(),
    );
    if (!valid.length) return;

    const primary = valid[0];
    updateItem(distributeTarget.sectionTitle, distributeTarget.itemId, {
      location: primary.location,
      splits: valid,
    });
    setDistributeTarget(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F5F5F3]">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white px-4 md:px-7 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#2E2E2E]">
            Stock Items
          </h1>
          <UserMenu showAvatar className="items-center" />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 md:px-7 py-5">
        <h2 className="mb-4 text-[20px] font-semibold text-[#2E2E2E]">Protein</h2>
        <div className="space-y-5">
          {draft.sections.map((section) => (
            <div key={section.title}>
              <div className="mb-2 flex items-end justify-between gap-4 px-1">
                <h3 className="text-[15px] font-semibold text-[#2E2E2E]">
                  {section.title}
                </h3>
                <div className="hidden items-center gap-16 pr-4 text-[10px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase sm:flex">
                  <span>In Stock</span>
                  <span>Date Receiving By</span>
                </div>
              </div>

              <ScrollTable minWidth={980} className="rounded-[10px]">
                <div
                  className={cn(
                    STOCK_GRID,
                    "border-b border-[#F0F0EE] bg-[#FAFAF8] px-4 py-2 text-[10px] font-semibold tracking-[0.04em] text-[#8A8A8A] uppercase",
                  )}
                >
                  <span>Order ID</span>
                  <span>Item Name</span>
                  <span>Qty</span>
                  <span>Unit</span>
                  <span>Qty After Unpack</span>
                  <span>Exp. Date</span>
                  <span>Enter Location</span>
                  <span />
                </div>

                {section.items.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      STOCK_GRID,
                      "border-b border-[#F3F3F1] px-4 py-3 text-[13px] text-[#2E2E2E] last:border-b-0",
                    )}
                  >
                    <span className="w-fit rounded-[6px] bg-[#F3F3F1] px-1.5 py-0.5 font-mono text-[11px] text-[#6B6B6B]">
                      {item.orderId}
                    </span>
                    <span className="font-medium">{item.itemName}</span>
                    <span className="font-semibold">{item.qty}</span>
                    <span className="font-semibold">{item.unit}</span>
                    <Input
                      value={item.qtyAfterUnpack}
                      onChange={(event) =>
                        updateItem(section.title, item.id, {
                          qtyAfterUnpack: event.target.value,
                        })
                      }
                      className="h-8 rounded-[8px] border-[#E6E6E3] px-2 text-[12px]"
                    />
                    <span>{item.expDate}</span>
                    <div className="group flex items-center gap-1.5">
                      <LocationSelect
                        value={item.location}
                        onChange={(location) =>
                          updateItem(section.title, item.id, {
                            location,
                            splits:
                              location && parseUnpackQty(item.qtyAfterUnpack)
                                ? [
                                    {
                                      qty: parseUnpackQty(item.qtyAfterUnpack),
                                      location,
                                    },
                                  ]
                                : item.splits,
                          })
                        }
                        className="min-w-0 flex-1"
                      />
                      <button
                        type="button"
                        aria-label="Distribute item"
                        onClick={() => openDistribute(section.title, item)}
                        className="shrink-0 rounded-md p-1.5 text-[#8A8A8A] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[#F5F5F3] hover:text-[#2E2E2E]"
                      >
                        <ArrowUpDown size={15} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="justify-self-end text-[13px] font-medium text-[#3B82F6]"
                    >
                      (
                      {item.qtyAfterUnpack ||
                        item.splits.reduce((sum, row) => sum + row.qty, 0) ||
                        item.qty}
                      ) Print Label
                    </button>
                  </div>
                ))}
              </ScrollTable>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-5 border-t border-[#ECECEA] bg-white px-4 md:px-7 py-4">
        <button
          type="button"
          onClick={onClose}
          className="text-[14px] font-medium text-[#8A8A8A]"
        >
          Cancel & Close
        </button>
        <button
          type="button"
          onClick={() => onComplete(draft)}
          className="rounded-[8px] px-6 py-2.5 text-[14px] font-semibold text-white"
          style={{ background: ORANGE }}
        >
          Complete Storage
        </button>
      </div>

      <SplitModal
        open={distributeTarget != null && activeItem != null}
        title="Distribute Item"
        subtitle={
          activeItem
            ? `${activeItem.itemName} (${parseUnpackQty(activeItem.qtyAfterUnpack) || activeItem.qty})`
            : ""
        }
        confirmLabel="Distribute"
        splits={distributeSplits}
        onChangeSplits={setDistributeSplits}
        onClose={() => setDistributeTarget(null)}
        onConfirm={confirmDistribute}
      />
    </div>
  );
}

export default function InventoryPage() {
  useDocumentTitle("Inventory");

  const [query, setQuery] = useState("");
  const [itemFilter, setItemFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [distributorFilter, setDistributorFilter] = useState("");
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  const [orders, setOrders] = useState(RECEIVED_ORDERS);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(["angus"]),
  );
  const [storingId, setStoringId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [editTarget, setEditTarget] = useState<EditLocationTarget | null>(null);
  const [editSplits, setEditSplits] = useState<LocationSplit[]>([]);

  const activeOrder = orders.find((order) => order.id === storingId) ?? null;

  const editProduct =
    editTarget == null
      ? null
      : (sections
          .find((section) => section.title === editTarget.sectionTitle)
          ?.products.find((product) => product.id === editTarget.productId) ??
        null);

  const editLot =
    editProduct && editTarget
      ? (editProduct.lots[editTarget.lotIndex] ?? null)
      : null;

  const itemOptions = useMemo(
    () =>
      Array.from(
        new Set(
          sections.flatMap((section) =>
            section.products.map((product) => product.name),
          ),
        ),
      ).sort(),
    [sections],
  );

  const unitOptions = useMemo(
    () =>
      Array.from(
        new Set(
          sections.flatMap((section) =>
            section.products.flatMap((product) =>
              product.lots.map((lot) => lot.unit),
            ),
          ),
        ),
      ).sort(),
    [sections],
  );

  const distributorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          sections.flatMap((section) =>
            section.products.flatMap((product) =>
              product.lots.map((lot) => lot.distributor),
            ),
          ),
        ),
      ).sort(),
    [sections],
  );

  const filteredSections = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return sections
      .map((section) => ({
        ...section,
        products: section.products.filter((product) => {
          const matchesQuery =
            !normalized ||
            product.name.toLowerCase().includes(normalized) ||
            product.lots.some(
              (lot) =>
                lot.orderId.toLowerCase().includes(normalized) ||
                lot.distributor.toLowerCase().includes(normalized) ||
                lot.source.toLowerCase().includes(normalized),
            );

          const matchesItem = !itemFilter || product.name === itemFilter;
          const matchesCategory =
            !categoryFilter || section.title === categoryFilter;
          const matchesUnit =
            !unitFilter || product.lots.some((lot) => lot.unit === unitFilter);
          const matchesDistributor =
            !distributorFilter ||
            product.lots.some((lot) => lot.distributor === distributorFilter);

          return (
            matchesQuery &&
            matchesItem &&
            matchesCategory &&
            matchesUnit &&
            matchesDistributor
          );
        }),
      }))
      .filter(
        (section) =>
          section.products.length > 0 &&
          (!categoryFilter || section.title === categoryFilter),
      );
  }, [
    categoryFilter,
    distributorFilter,
    itemFilter,
    query,
    sections,
    unitFilter,
  ]);

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openEditLocation(
    sectionTitle: string,
    product: InventoryProduct,
    lotIndex: number,
  ) {
    const lot = product.lots[lotIndex];
    if (!lot) return;
    setEditTarget({ sectionTitle, productId: product.id, lotIndex });
    setEditSplits(defaultSplits(lot.qty || 6));
  }

  function confirmEditLocation() {
    if (!editTarget || !editLot || !editProduct) return;

    const valid = editSplits.filter(
      (row) => row.qty > 0 && row.location.trim(),
    );
    if (!valid.length) return;

    const replacement: InventoryLot[] = valid.map((row) => ({
      ...editLot,
      qty: row.qty,
      location: row.location,
    }));

    setSections((current) =>
      current.map((section) =>
        section.title !== editTarget.sectionTitle
          ? section
          : {
              ...section,
              products: section.products.map((product) => {
                if (product.id !== editTarget.productId) return product;
                const nextLots = [...product.lots];
                nextLots.splice(editTarget.lotIndex, 1, ...replacement);
                return { ...product, lots: nextLots };
              }),
            },
      ),
    );
    setEditTarget(null);
  }

  function completeStorage(order: ReceivedOrder) {
    const deliveryDate = "Jul 20, 2026, 12:35";
    const purchased = "$125/case";

    setOrders((current) => current.filter((item) => item.id !== order.id));

    setSections((current) => {
      const next = current.map((section) => ({
        ...section,
        products: section.products.map((product) => ({
          ...product,
          lots: [...product.lots],
        })),
      }));

      for (const section of order.sections) {
        for (const item of section.items) {
          const productId = PRODUCT_MATCH[item.itemName];
          if (!productId) continue;

          const unpack = parseUnpackQty(item.qtyAfterUnpack) || item.qty;
          const placements =
            item.splits.filter((row) => row.qty > 0 && row.location).length > 0
              ? item.splits.filter((row) => row.qty > 0 && row.location)
              : item.location
                ? [{ qty: unpack, location: item.location }]
                : [{ qty: unpack, location: "Freezer 1" }];

          for (const inventorySection of next) {
            const product = inventorySection.products.find(
              (entry) => entry.id === productId,
            );
            if (!product) continue;

            for (const placement of placements) {
              product.lots.push({
                orderId: item.orderId,
                distributor: order.supplier,
                source:
                  inventorySection.title === "Poultry"
                    ? "Legion Fields"
                    : "FreshAlley Meat Co",
                deliveryDate,
                purchased,
                qty: placement.qty,
                unit: item.unit === "Case" ? "1lb" : item.unit,
                location: placement.location,
              });
            }
          }
        }
      }

      return next;
    });

    setExpanded((current) => new Set(current).add("angus"));
    setStoringId(null);
    setShowToast(true);
    window.setTimeout(() => setShowToast(false), 2500);
  }

  if (activeOrder) {
    return (
      <StockItemsView
        order={activeOrder}
        onClose={() => setStoringId(null)}
        onComplete={completeStorage}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F5F5F3]">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white px-4 md:px-7 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#2E2E2E]">
            Inventory
          </h1>
          <UserMenu showAvatar className="items-center" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-[220px]">
            <Search
              size={13}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#A9A9A9]"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="h-[34px] rounded-[8px] border-[#E6E6E3] bg-white pl-8 text-[13px]"
            />
          </div>

          <Select
            value={itemFilter}
            onChange={setItemFilter}
            aria-label="All Items"
            options={[
              { value: "", label: "All Items" },
              ...itemOptions.map((name) => ({ value: name, label: name })),
            ]}
          />
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            aria-label="All Categories"
            options={[
              { value: "", label: "All Categories" },
              { value: "Meat", label: "Meat" },
              { value: "Poultry", label: "Poultry" },
            ]}
          />
          <Select
            value={unitFilter}
            onChange={setUnitFilter}
            aria-label="All Units"
            options={[
              { value: "", label: "All Units" },
              ...unitOptions.map((unit) => ({ value: unit, label: unit })),
            ]}
          />
          <Select
            value={distributorFilter}
            onChange={setDistributorFilter}
            aria-label="All Distributors"
            options={[
              { value: "", label: "All Distributors" },
              ...distributorOptions.map((distributor) => ({
                value: distributor,
                label: distributor,
              })),
            ]}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 md:px-7 py-5">
        {orders.length ? (
          <div className="mb-5 space-y-2">
            {orders.map((order) => (
              <div key={order.id} className="overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setStoringId(order.id)}
                  className="grid w-full min-w-[640px] grid-cols-[140px_1.6fr_0.8fr_1.2fr_40px] items-center rounded-[10px] px-4 py-4 text-left text-white"
                  style={{ background: GREEN }}
                >
                  <span className="inline-flex w-fit items-center rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-medium">
                    Order Received
                  </span>
                  <span className="border-l border-white/20 pl-5 text-[14px] font-semibold">
                    {order.supplier}
                  </span>
                  <span className="text-[13px] font-semibold">
                    {order.itemsCount}
                  </span>
                  <span className="text-[13px] font-semibold">
                    {order.receivedAt}
                  </span>
                  <ChevronRight
                    size={16}
                    className="justify-self-end text-white/80"
                  />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <section>
          <h2 className="mb-4 text-[20px] font-semibold text-[#2E2E2E]">
            Protein
          </h2>

          <div className="space-y-5">
            {filteredSections.map((section) => (
              <div key={section.title}>
                <div className="mb-2 flex items-end justify-between gap-4 px-1">
                  <h3 className="text-[15px] font-semibold text-[#2E2E2E]">
                    {section.title}
                  </h3>
                  <div className="hidden items-center gap-16 pr-[108px] text-[10px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase sm:flex">
                    <span>In Stock</span>
                    <span>Date Receiving By</span>
                  </div>
                </div>

                <ScrollTable minWidth={980} className="rounded-[10px]">
                  <div
                    className={cn(
                      GRID,
                      "border-b border-[#F0F0EE] bg-[#FAFAF8] px-3 py-2 text-[10px] font-semibold tracking-[0.04em] text-[#8A8A8A] uppercase",
                    )}
                  >
                    <div />
                    <div>Order ID</div>
                    <div>Distributor</div>
                    <div>{section.sourceLabel}</div>
                    <div>Delivery Date</div>
                    <div>Purchased</div>
                    <div>Qty Portion</div>
                    <div>Unit</div>
                    <div>Location</div>
                  </div>

                  {section.products.map((product, index) => {
                    const open = expanded.has(product.id);
                    const total = stockTotal(product);
                    const isLast = index === section.products.length - 1;

                    return (
                      <div
                        key={product.id}
                        className={cn(
                          !isLast || open ? "border-b border-[#F3F3F1]" : "",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggleExpanded(product.id)}
                          className={cn(
                            GRID,
                            "w-full bg-[#F7F1EC] px-3 py-3 text-left",
                          )}
                        >
                          <span className="flex justify-center text-[#F57850]">
                            <ChevronDown
                              size={14}
                              className={cn(
                                "transition-transform",
                                open ? "rotate-0" : "-rotate-90",
                              )}
                            />
                          </span>
                          <div className="col-span-5 text-[13px] font-semibold text-[#2E2E2E]">
                            {product.name}
                          </div>
                          <div className="text-[13px] font-semibold text-[#2E2E2E]">
                            {total}
                          </div>
                          <div />
                          <div />
                        </button>

                        {open ? (
                          <div className="overflow-x-auto">
                            <div className="min-w-[980px]">
                              {product.lots.length ? (
                                product.lots.map((lot, lotIndex) => (
                                  <div
                                    key={`${product.id}-${lot.orderId}-${lot.location}-${lotIndex}`}
                                    className={cn(
                                      GRID,
                                      "group bg-white px-3 py-3 text-[12px] text-[#2E2E2E]",
                                      lotIndex < product.lots.length - 1
                                        ? "border-b border-[#F3F3F1]"
                                        : "",
                                    )}
                                  >
                                    <div />
                                    <span className="w-fit rounded-[6px] bg-[#F3F3F1] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#6B6B6B]">
                                      {lot.orderId}
                                    </span>
                                    <div>{lot.distributor}</div>
                                    <div>{lot.source}</div>
                                    <div>{lot.deliveryDate}</div>
                                    <div>{lot.purchased}</div>
                                    <div className="font-semibold">{lot.qty}</div>
                                    <div>{lot.unit}</div>
                                    <div className="flex items-center gap-1">
                                      <span className="min-w-0 truncate">
                                        {lot.location}
                                      </span>
                                      <button
                                        type="button"
                                        aria-label="Edit location"
                                        onClick={() =>
                                          openEditLocation(
                                            section.title,
                                            product,
                                            lotIndex,
                                          )
                                        }
                                        className="shrink-0 rounded-md p-1 text-[#8A8A8A] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[#F5F5F3] hover:text-[#2E2E2E]"
                                      >
                                        <ArrowUpDown size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div
                                  className={cn(
                                    GRID,
                                    "bg-white px-3 py-3 text-[12px] text-[#8A8A8A]",
                                  )}
                                >
                                  <div />
                                  <span className="w-fit rounded-[6px] bg-[#F3F3F1] px-2 py-0.5 text-center text-[11px]">
                                    -
                                  </span>
                                  <div className="col-span-7">Inventory Empty</div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </ScrollTable>
              </div>
            ))}
          </div>
        </section>

        {!filteredSections.length ? (
          <div className="rounded-[10px] border border-[#ECECEA] bg-white px-6 py-12 text-center text-[14px] text-[#8A8A8A]">
            No inventory matches your filters.
          </div>
        ) : null}
      </div>

      <SplitModal
        open={editTarget != null && editLot != null && editProduct != null}
        title="Edit Location"
        subtitle={
          editProduct
            ? `${editProduct.name} (${editLot?.qty ?? stockTotal(editProduct)})`
            : ""
        }
        confirmLabel="Edit"
        splits={editSplits}
        onChangeSplits={setEditSplits}
        onClose={() => setEditTarget(null)}
        onConfirm={confirmEditLocation}
      />

      {showToast ? (
        <div className="pointer-events-none fixed right-6 bottom-6 flex items-center gap-2 rounded-[10px] bg-[#12B72A] px-6 py-4 text-[14px] font-medium text-white shadow-lg">
          <span className="inline-flex size-4 items-center justify-center rounded-full bg-white text-[#12B72A]">
            <Check size={11} strokeWidth={3} />
          </span>
          Items Stored Successfully
        </div>
      ) : null}
    </div>
  );
}

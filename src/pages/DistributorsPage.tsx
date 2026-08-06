import { useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  CloudUpload,
  Copy,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { UserMenu } from "@/components/layout/UserMenu";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DISTRIBUTORS } from "@/constants/distributors";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { Distributor } from "@/types/distributor";
import { cn } from "@/utils/cn";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const PAYMENT_TERMS = ["NET-15", "NET-30", "NET-45"] as const;
const CATEGORIES = [
  "Fruits",
  "Vegetables",
  "Protein",
  "Dairy",
  "Herbs",
  "Seafood",
] as const;
const PRODUCTS = [
  "Apples",
  "Carrots",
  "Tomatoes",
  "Basil",
  "Kale",
  "Chicken Breast",
  "Whole Milk",
  "Salmon Fillet",
] as const;
const UNITS = ["Box", "Pound", "Case", "Bunch", "Gallon", "Piece"] as const;

const ORANGE = "#F57850";

type ContactDraft = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  title: string;
  primary: boolean;
};

type ProductDraft = {
  id: string;
  source: string;
  customName: string;
  category: string;
  product: string;
  price: string;
  unit: string;
  qty: string;
};

type DocDraft = {
  id: string;
  name: string;
  size: string;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function currency(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function emptyContact(primary = false): ContactDraft {
  return {
    id: uid(),
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    title: "",
    primary,
  };
}

function emptyProduct(): ProductDraft {
  return {
    id: uid(),
    source: "",
    customName: "",
    category: "",
    product: "",
    price: "",
    unit: "Box",
    qty: "",
  };
}

const GRID =
  "grid grid-cols-[28px_64px_1.15fr_1fr_1fr_1.2fr_1fr_1.1fr_56px_56px] items-center gap-2";

function AddDistributorModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (distributor: Distributor) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [dayTimes, setDayTimes] = useState<Record<string, string>>({});
  const [payment, setPayment] = useState<string>("NET-30");
  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [docs, setDocs] = useState<DocDraft[]>([]);
  const [products, setProducts] = useState<ProductDraft[]>([emptyProduct()]);
  const [notes, setNotes] = useState("");

  if (!open) return null;

  function toggleDay(day: string) {
    setDays((current) => {
      if (current.includes(day)) {
        setDayTimes((times) => {
          const next = { ...times };
          delete next[day];
          return next;
        });
        return current.filter((item) => item !== day);
      }
      setDayTimes((times) => ({ ...times, [day]: times[day] ?? "08:00" }));
      return [...current, day];
    });
  }

  function resetAndClose() {
    setName("");
    setAddress("");
    setDays([]);
    setDayTimes({});
    setPayment("NET-30");
    setContacts([]);
    setDocs([]);
    setProducts([emptyProduct()]);
    setNotes("");
    onClose();
  }

  function handleSave() {
    if (!name.trim()) return;
    const primary =
      contacts.find((contact) => contact.primary) ?? contacts[0] ?? null;
    const mappedProducts = products
      .filter((product) => product.product || product.customName)
      .map((product, index) => ({
        id: `NP${index + 1}`,
        name: product.customName || product.product,
        product: product.product || product.customName,
        source: product.source || "—",
        price: Number(product.price) || 0,
        qty: Number(product.qty) || 0,
        unit: product.unit || "Box",
        category: product.category || "Fruits",
      }));

    onSave({
      id: `S${String(Math.floor(Math.random() * 900) + 100)}`,
      name: name.trim(),
      paymentTerms: payment,
      contact: primary
        ? `${primary.firstName} ${primary.lastName}`.trim() || "—"
        : "—",
      phone: primary?.phone || "—",
      categories: Array.from(
        new Set(mappedProducts.map((product) => product.category)),
      ),
      location: address.trim() || "—",
      delivery:
        days.length > 0
          ? `${days.join(", ")} ${dayTimes[days[0]] ?? ""}`.trim()
          : "—",
      items: mappedProducts.length,
      docs: docs.length ? `${docs.length}` : null,
      products: mappedProducts,
    });
    resetAndClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6">
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 bg-[#333333]/55"
        onClick={resetAndClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 my-4 flex max-h-[calc(100dvh-3rem)] w-full max-w-[720px] flex-col overflow-hidden rounded-[14px] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#F0F0EE] px-6 py-4">
          <h2 className="text-[20px] font-semibold tracking-tight text-[#2E2E2E]">
            Add Distributor
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={resetAndClose}
            className="rounded-md p-1 text-[#8A8A8A] hover:bg-[#F5F5F3]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-auto px-6 py-5">
          <section>
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
              Company Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-[#2E2E2E]">
                  Distributor Name
                </label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Distributor Name"
                  className="h-[40px] rounded-[8px] border-[#E6E6E3] text-[13px]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-[#2E2E2E]">
                  Full Address
                </label>
                <Input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Full Address"
                  className="h-[40px] rounded-[8px] border-[#E6E6E3] text-[13px]"
                />
              </div>
              <div>
                <label className="mb-2 block text-[12px] font-medium text-[#2E2E2E]">
                  Delivery Days & Times
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => {
                    const active = days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={cn(
                          "h-[32px] min-w-[48px] rounded-full border px-3 text-[12px] font-medium",
                          active
                            ? "border-[#2E2E2E] bg-[#2E2E2E] text-white"
                            : "border-[#E6E6E3] bg-white text-[#2E2E2E]",
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                {days.length ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {days.map((day) => (
                      <div key={day} className="flex items-center gap-2">
                        <span className="w-10 text-[12px] font-medium text-[#2E2E2E]">
                          {day}
                        </span>
                        <Input
                          type="time"
                          value={dayTimes[day] ?? "08:00"}
                          onChange={(event) =>
                            setDayTimes((current) => ({
                              ...current,
                              [day]: event.target.value,
                            }))
                          }
                          className="h-[34px] rounded-[8px] border-[#E6E6E3] text-[13px]"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
              Payment Terms
            </h3>
            <div className="flex flex-wrap gap-5">
              {PAYMENT_TERMS.map((term) => (
                <label
                  key={term}
                  className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-[#2E2E2E]"
                >
                  <span
                    className={cn(
                      "flex size-[16px] items-center justify-center rounded-full border",
                      payment === term
                        ? "border-[#F57850]"
                        : "border-[#C9C9C6]",
                    )}
                  >
                    {payment === term ? (
                      <span className="size-[8px] rounded-full bg-[#F57850]" />
                    ) : null}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPayment(term)}
                    className="text-left"
                  >
                    {term}
                  </button>
                </label>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
                Distributor Information
              </h3>
              <button
                type="button"
                aria-label="Add contact"
                onClick={() =>
                  setContacts((current) => [
                    ...current,
                    emptyContact(current.length === 0),
                  ])
                }
                className="flex size-7 items-center justify-center rounded-full text-white"
                style={{ background: ORANGE }}
              >
                <Plus size={14} />
              </button>
            </div>

            {contacts.length === 0 ? (
              <div className="rounded-[10px] border border-dashed border-[#D9D9D6] bg-[#FAFAF8] px-4 py-8 text-center text-[13px] text-[#8A8A8A]">
                No contacts yet. Click + to add a supplier contact.
              </div>
            ) : (
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={cn(
                      "rounded-[10px] border p-4",
                      contact.primary
                        ? "border-[#F57850]"
                        : "border-[#E6E6E3]",
                    )}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setContacts((current) =>
                            current.map((entry) => ({
                              ...entry,
                              primary: entry.id === contact.id,
                            })),
                          )
                        }
                        className="inline-flex items-center gap-2 text-[12px] font-medium text-[#2E2E2E]"
                      >
                        <span
                          className={cn(
                            "flex size-[16px] items-center justify-center rounded-full border",
                            contact.primary
                              ? "border-[#F57850]"
                              : "border-[#C9C9C6]",
                          )}
                        >
                          {contact.primary ? (
                            <span className="size-[8px] rounded-full bg-[#F57850]" />
                          ) : null}
                        </span>
                        {contact.primary ? "Primary contact" : "Set as primary"}
                      </button>
                      <button
                        type="button"
                        aria-label="Remove contact"
                        onClick={() =>
                          setContacts((current) =>
                            current.filter((entry) => entry.id !== contact.id),
                          )
                        }
                        className="text-[#B0B0B0] hover:text-[#E25B5B]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          ["firstName", "First Name"],
                          ["lastName", "Last Name"],
                          ["phone", "Phone number"],
                          ["email", "Email"],
                          ["title", "Title"],
                        ] as const
                      ).map(([key, label]) => (
                        <div
                          key={key}
                          className={key === "title" ? "sm:col-span-2" : ""}
                        >
                          <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                            {label}
                          </label>
                          <Input
                            value={contact[key]}
                            onChange={(event) =>
                              setContacts((current) =>
                                current.map((entry) =>
                                  entry.id === contact.id
                                    ? { ...entry, [key]: event.target.value }
                                    : entry,
                                ),
                              )
                            }
                            className="h-[36px] rounded-[8px] border-[#E6E6E3] text-[13px]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
                Documents
              </h3>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-[32px] items-center gap-1.5 rounded-[8px] bg-[#242424] px-3 text-[12px] font-medium text-white"
              >
                <CloudUpload size={14} />
                Upload File
              </button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setDocs((current) => [
                    ...current,
                    {
                      id: uid(),
                      name: file.name,
                      size: `${(file.size / 1024).toFixed(1)}KB`,
                    },
                  ]);
                  event.target.value = "";
                }}
              />
            </div>
            {docs.length === 0 ? (
              <div className="rounded-[10px] border border-dashed border-[#D9D9D6] bg-[#FAFAF8] px-4 py-8 text-center text-[13px] text-[#8A8A8A]">
                No documents uploaded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-[8px] border border-[#E6E6E3] px-3 py-2.5"
                  >
                    <div className="text-[13px] text-[#2E2E2E]">
                      {doc.name}{" "}
                      <span className="text-[#8A8A8A]">({doc.size})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Copy file name"
                        onClick={() => navigator.clipboard?.writeText(doc.name)}
                        className="text-[#8A8A8A]"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label="Remove document"
                        onClick={() =>
                          setDocs((current) =>
                            current.filter((entry) => entry.id !== doc.id),
                          )
                        }
                        className="text-[#B0B0B0] hover:text-[#E25B5B]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
                Products & Pricing
              </h3>
              <button
                type="button"
                aria-label="Add product"
                onClick={() =>
                  setProducts((current) => [...current, emptyProduct()])
                }
                className="flex size-7 items-center justify-center rounded-full text-white"
                style={{ background: ORANGE }}
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {products.map((product) => {
                const net =
                  (Number(product.price) || 0) * (Number(product.qty) || 0);
                return (
                  <div
                    key={product.id}
                    className="rounded-[10px] border border-[#E6E6E3] bg-[#FAFAF8] p-4"
                  >
                    <div className="mb-3 flex justify-end">
                      <button
                        type="button"
                        aria-label="Remove product"
                        onClick={() =>
                          setProducts((current) =>
                            current.length === 1
                              ? [emptyProduct()]
                              : current.filter(
                                  (entry) => entry.id !== product.id,
                                ),
                          )
                        }
                        className="text-[#B0B0B0] hover:text-[#E25B5B]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                          Source name
                        </label>
                        <Input
                          value={product.source}
                          onChange={(event) =>
                            setProducts((current) =>
                              current.map((entry) =>
                                entry.id === product.id
                                  ? { ...entry, source: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          placeholder="e.g. FreshMarket Co"
                          className="h-[36px] rounded-[8px] border-[#E6E6E3] bg-white text-[13px]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                          Custom product name
                        </label>
                        <Input
                          value={product.customName}
                          onChange={(event) =>
                            setProducts((current) =>
                              current.map((entry) =>
                                entry.id === product.id
                                  ? {
                                      ...entry,
                                      customName: event.target.value,
                                    }
                                  : entry,
                              ),
                            )
                          }
                          placeholder="Custom product name"
                          className="h-[36px] rounded-[8px] border-[#E6E6E3] bg-white text-[13px]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                          Category
                        </label>
                        <Select
                          value={product.category}
                          onChange={(value) =>
                            setProducts((current) =>
                              current.map((entry) =>
                                entry.id === product.id
                                  ? { ...entry, category: value }
                                  : entry,
                              ),
                            )
                          }
                          className="w-full"
                          aria-label="Category"
                          options={[
                            { value: "", label: "Select" },
                            ...CATEGORIES.map((category) => ({
                              value: category,
                              label: category,
                            })),
                          ]}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                          Product
                        </label>
                        <Select
                          value={product.product}
                          onChange={(value) =>
                            setProducts((current) =>
                              current.map((entry) =>
                                entry.id === product.id
                                  ? { ...entry, product: value }
                                  : entry,
                              ),
                            )
                          }
                          className="w-full"
                          aria-label="Product"
                          options={[
                            { value: "", label: "Select" },
                            ...PRODUCTS.map((item) => ({
                              value: item,
                              label: item,
                            })),
                          ]}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                          Price per Unit
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-[#8A8A8A]">
                            $
                          </span>
                          <Input
                            value={product.price}
                            onChange={(event) =>
                              setProducts((current) =>
                                current.map((entry) =>
                                  entry.id === product.id
                                    ? { ...entry, price: event.target.value }
                                    : entry,
                                ),
                              )
                            }
                            className="h-[36px] rounded-[8px] border-[#E6E6E3] bg-white pl-7 text-[13px]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                          Item Unit
                        </label>
                        <Select
                          value={product.unit}
                          onChange={(value) =>
                            setProducts((current) =>
                              current.map((entry) =>
                                entry.id === product.id
                                  ? { ...entry, unit: value }
                                  : entry,
                              ),
                            )
                          }
                          className="w-full"
                          aria-label="Item Unit"
                          options={UNITS.map((unit) => ({
                            value: unit,
                            label: unit,
                          }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                          QTY Per Unit
                        </label>
                        <Input
                          value={product.qty}
                          onChange={(event) =>
                            setProducts((current) =>
                              current.map((entry) =>
                                entry.id === product.id
                                  ? { ...entry, qty: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          className="h-[36px] rounded-[8px] border-[#E6E6E3] bg-white text-[13px]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[#8A8A8A]">
                          Net Item Cost
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-[#8A8A8A]">
                            $
                          </span>
                          <Input
                            readOnly
                            value={net.toFixed(2)}
                            className="h-[36px] rounded-[8px] border-[#E6E6E3] bg-[#F3F3F1] pl-7 text-[13px] text-[#6B6B6B]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
              Notes
            </h3>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Write your notes here..."
              rows={4}
              className="w-full resize-none rounded-[8px] border border-[#E6E6E3] px-3 py-2.5 text-[13px] text-[#2E2E2E] outline-none placeholder:text-[#A9A9A9]"
            />
          </section>
        </div>

        <div className="flex items-center justify-end gap-4 border-t border-[#F0F0EE] px-6 py-4">
          <button
            type="button"
            onClick={resetAndClose}
            className="text-[13px] font-medium text-[#8A8A8A]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-[36px] rounded-[8px] bg-[#242424] px-5 text-[13px] font-medium text-white"
          >
            Save Supplier
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DistributorsPage() {
  useDocumentTitle("Distributors");

  const [rows, setRows] = useState<Distributor[]>(DISTRIBUTORS);
  const [query, setQuery] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>("S001");
  const [modalOpen, setModalOpen] = useState(false);

  const productOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.flatMap((row) => row.products.map((item) => item.product))),
      ).sort(),
    [rows],
  );

  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(rows.flatMap((row) => row.categories))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !normalized ||
        row.id.toLowerCase().includes(normalized) ||
        row.name.toLowerCase().includes(normalized) ||
        row.contact.toLowerCase().includes(normalized);

      const matchesProduct =
        !productFilter ||
        row.products.some((product) => product.product === productFilter);

      const matchesCategory =
        !categoryFilter || row.categories.includes(categoryFilter);

      return matchesQuery && matchesProduct && matchesCategory;
    });
  }, [categoryFilter, productFilter, query, rows]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F5F5F3]">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white px-7 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#2E2E2E]">
            Distributors
          </h1>
          <UserMenu showAvatar className="items-center" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative w-[220px]">
            <Search
              size={13}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#A9A9A9]"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ID, supplier name"
              className="h-[34px] rounded-[8px] border-[#E6E6E3] bg-white pl-8 text-[13px]"
            />
          </div>

          <Select
            value={productFilter}
            onChange={setProductFilter}
            aria-label="All Products"
            options={[
              { value: "", label: "All Products" },
              ...productOptions.map((product) => ({
                value: product,
                label: product,
              })),
            ]}
          />

          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            aria-label="All Categories"
            options={[
              { value: "", label: "All Categories" },
              ...categoryOptions.map((category) => ({
                value: category,
                label: category,
              })),
            ]}
          />

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="ml-auto inline-flex h-[34px] items-center gap-1.5 rounded-[8px] px-3.5 text-[13px] font-medium text-white"
            style={{ background: ORANGE }}
          >
            <Plus size={14} />
            Add Distributor
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-7 py-5">
        <div className="overflow-hidden rounded-[12px] border border-[#ECECEA] bg-white">
          <div
            className={cn(
              GRID,
              "border-b border-[#ECECEA] bg-[#FAFAF8] px-4 py-2.5 text-[11px] font-semibold tracking-[0.04em] text-[#8A8A8A] uppercase",
            )}
          >
            <div />
            <div>ID</div>
            <div>Distributor</div>
            <div>Contact</div>
            <div>Phone</div>
            <div>Categories</div>
            <div>Location</div>
            <div>Delivery</div>
            <div>Items</div>
            <div>Docs</div>
          </div>

          {filtered.map((row, index) => {
            const open = expandedId === row.id;
            const isLast = index === filtered.length - 1;

            return (
              <div
                key={row.id}
                className={cn(!isLast || open ? "border-b border-[#F0F0EE]" : "")}
              >
                <div className={cn(GRID, "px-4 py-3.5")}>
                  <button
                    type="button"
                    aria-label={open ? "Collapse" : "Expand"}
                    onClick={() =>
                      setExpandedId((current) =>
                        current === row.id ? null : row.id,
                      )
                    }
                    className="flex justify-center"
                  >
                    <ChevronRight
                      size={14}
                      className={cn(
                        "text-[#B0B0B0] transition-transform",
                        open && "rotate-90 text-[#F57850]",
                      )}
                    />
                  </button>

                  <span className="w-fit rounded-[6px] bg-[#F3F3F1] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#6B6B6B]">
                    {row.id}
                  </span>

                  <div>
                    <div className="text-[13px] font-semibold text-[#2E2E2E]">
                      {row.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#8A8A8A]">
                      {row.paymentTerms}
                    </div>
                  </div>

                  <div className="text-[13px] text-[#2E2E2E]">{row.contact}</div>
                  <div className="text-[13px] text-[#2E2E2E]">{row.phone}</div>
                  <div className="flex flex-wrap gap-1">
                    {row.categories.map((category) => (
                      <span
                        key={category}
                        className="rounded-[6px] bg-[#F3F3F1] px-1.5 py-0.5 text-[11px] font-medium text-[#2E2E2E]"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                  <div className="text-[13px] text-[#2E2E2E]">{row.location}</div>
                  <div className="text-[13px] text-[#2E2E2E]">{row.delivery}</div>
                  <div className="text-[13px] text-[#2E2E2E]">{row.items}</div>
                  <div className="text-[13px] text-[#8A8A8A]">
                    {row.docs ?? "—"}
                  </div>
                </div>

                {open ? (
                  <div className="border-t border-[#F0F0EE] bg-[#FAFAF8] px-6 py-4">
                    <div className="overflow-hidden rounded-[10px] border border-[#ECECEA] bg-white">
                      <div className="grid grid-cols-[1.6fr_1.2fr_90px_70px_90px] gap-3 border-b border-[#ECECEA] bg-[#FAFAF8] px-4 py-2 text-[10px] font-semibold tracking-[0.04em] text-[#8A8A8A] uppercase">
                        <div>Product Name</div>
                        <div>Source</div>
                        <div>Price</div>
                        <div>Qty</div>
                        <div>Unit</div>
                      </div>
                      {row.products.map((product) => (
                        <div
                          key={product.id}
                          className="grid grid-cols-[1.6fr_1.2fr_90px_70px_90px] items-center gap-3 border-b border-[#F3F3F1] px-4 py-3 text-[13px] text-[#2E2E2E] last:border-b-0"
                        >
                          <div>
                            <div className="font-semibold">{product.name}</div>
                            <div className="mt-0.5 text-[11px] text-[#8A8A8A]">
                              {product.product}
                            </div>
                          </div>
                          <div>{product.source}</div>
                          <div className="font-semibold">
                            {currency(product.price)}
                          </div>
                          <div>{product.qty}</div>
                          <div>{product.unit}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <AddDistributorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={(distributor) => {
          setRows((current) => [distributor, ...current]);
          setExpandedId(distributor.id);
        }}
      />
    </div>
  );
}

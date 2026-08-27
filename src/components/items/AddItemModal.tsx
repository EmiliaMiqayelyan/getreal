import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CloudUpload, Image as ImageIcon, X } from "lucide-react";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DISTRIBUTORS } from "@/constants/distributors";
import { SOURCES } from "@/constants/sources";
import { useScrollLock } from "@/hooks/useScrollLock";
import {
  BUYING_UNITS,
  ITEM_CATEGORIES,
  ITEM_SUBCATEGORIES,
  SINGLE_ITEM_UNITS,
  type Item,
  type ItemPhoto,
} from "@/types/item";

const DESC_MAX = 320;
const PHOTO_MAX = 3;

type AddItemModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (item: Item) => void;
  item?: Item | null;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatMoney(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return value.toFixed(2).replace(/\.00$/, "");
}

function parseMoney(value: string) {
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function AddItemModal({
  open,
  onClose,
  onSave,
  item = null,
}: AddItemModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(item);
  useScrollLock(open);

  const [distributor, setDistributor] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [name, setName] = useState("");
  const [preorderInfo, setPreorderInfo] = useState("");
  const [merchandisingName, setMerchandisingName] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<ItemPhoto[]>([]);
  const [buyingUnit, setBuyingUnit] = useState("");
  const [buyingPrice, setBuyingPrice] = useState("0");
  const [contents, setContents] = useState("0");
  const [singleItemUnit, setSingleItemUnit] = useState("");
  const [sellingPrice, setSellingPrice] = useState("0");

  const distributorOptions = useMemo(
    () => DISTRIBUTORS.map((entry) => entry.name),
    [],
  );

  const sourceOptions = useMemo(() => {
    const names = new Set(SOURCES.map((entry) => entry.name));
    names.add("FreshMarket Co");
    names.add("MeatFactory Co");
    names.add("NanasFruits");
    if (item?.source) names.add(item.source);
    return Array.from(names).sort();
  }, [item]);

  const subcategoryOptions = category
    ? (ITEM_SUBCATEGORIES[category] ?? [])
    : [];

  const buying = parseMoney(buyingPrice);
  const qty = Number(contents) || 0;
  const costPerUnit = qty > 0 ? buying / qty : 0;
  const suggested = costPerUnit > 0 ? costPerUnit / 0.6 : 0;
  const sell = parseMoney(sellingPrice);
  const finalMargin =
    sell > 0 ? ((sell - costPerUnit) / sell) * 100 : 0;

  useEffect(() => {
    if (!open) return;

    if (item) {
      setDistributor(item.distributor);
      setSource(item.source);
      setCategory(item.category);
      setSubcategory(item.subcategory);
      setName(item.name);
      setPreorderInfo(item.preorderInfo);
      setMerchandisingName(item.merchandisingName);
      setDescription(item.description);
      setPhotos(item.photos.map((photo) => ({ ...photo })));
      setBuyingUnit(item.buyingUnit);
      setBuyingPrice(String(item.buyingPrice));
      setContents(String(item.contents));
      setSingleItemUnit(item.singleItemUnit);
      setSellingPrice(String(item.sellingPrice));
      return;
    }

    setDistributor("");
    setSource("");
    setCategory("");
    setSubcategory("");
    setName("");
    setPreorderInfo("");
    setMerchandisingName("");
    setDescription("");
    setPhotos([]);
    setBuyingUnit("");
    setBuyingPrice("0");
    setContents("0");
    setSingleItemUnit("");
    setSellingPrice("0");
  }, [item, open]);

  if (!open) return null;

  function handleSave() {
    if (!name.trim()) return;

    onSave({
      id: item?.id ?? "IT-TEMP",
      name: name.trim(),
      merchandisingName: merchandisingName.trim() || name.trim(),
      description: description.trim(),
      preorderInfo: preorderInfo.trim(),
      category,
      subcategory,
      distributor,
      source,
      buyingUnit,
      buyingPrice: buying,
      contents: qty,
      singleItemUnit,
      sellingPrice: sell,
      photos,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-none p-6">
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 bg-[#333333]/55"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        data-scroll-lock-allow
        className="relative z-10 my-4 flex max-h-[calc(100dvh-3rem)] w-full max-w-[680px] flex-col overflow-hidden overscroll-contain rounded-[14px] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-[20px] font-semibold tracking-tight text-[#111118]">
            {isEdit ? "Edit Item" : "Add Item"}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1 text-[#8A8A8A] hover:bg-[#F5F5F3]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-auto px-6 py-2 pb-5">
          <section>
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
              Basic Info
            </h3>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Distributor">
                  <Select
                    value={distributor}
                    onChange={setDistributor}
                    className="w-full"
                    aria-label="Distributor"
                    placeholder="Select"
                    options={[
                      { value: "", label: "Select" },
                      ...distributorOptions.map((entry) => ({
                        value: entry,
                        label: entry,
                      })),
                    ]}
                  />
                </Field>
                <Field label="Source">
                  <Select
                    value={source}
                    onChange={setSource}
                    className="w-full"
                    aria-label="Source"
                    placeholder="Select"
                    options={[
                      { value: "", label: "Select" },
                      ...sourceOptions.map((entry) => ({
                        value: entry,
                        label: entry,
                      })),
                    ]}
                  />
                </Field>
                <Field label="Category">
                  <Select
                    value={category}
                    onChange={(value) => {
                      setCategory(value);
                      setSubcategory("");
                    }}
                    className="w-full"
                    aria-label="Category"
                    placeholder="Select"
                    options={[
                      { value: "", label: "Select" },
                      ...ITEM_CATEGORIES.map((entry) => ({
                        value: entry,
                        label: entry,
                      })),
                    ]}
                  />
                </Field>
                <Field label="Subcategory">
                  <Select
                    value={subcategory}
                    onChange={setSubcategory}
                    className="w-full"
                    aria-label="Subcategory"
                    placeholder="Select"
                    options={[
                      { value: "", label: "Select" },
                      ...subcategoryOptions.map((entry) => ({
                        value: entry,
                        label: entry,
                      })),
                    ]}
                  />
                </Field>
              </div>
              <Field label="Item Name">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-[40px] rounded-[8px] border-[#E6E6E3] text-[13px]"
                />
              </Field>
              <Field label="Item Pre-order Information">
                <textarea
                  value={preorderInfo}
                  onChange={(event) => setPreorderInfo(event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-[8px] border border-[#E6E6E3] px-3 py-2.5 text-[13px] text-[#111118] outline-none"
                />
              </Field>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
              Merchandising
            </h3>
            <div className="space-y-3">
              <Field label="Merchandising name">
                <Input
                  value={merchandisingName}
                  onChange={(event) => setMerchandisingName(event.target.value)}
                  placeholder="e.g. Beef Ribeye Steak"
                  className="h-[40px] rounded-[8px] border-[#E6E6E3] text-[13px]"
                />
              </Field>
              <Field label="Item Description">
                <div className="relative">
                  <textarea
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value.slice(0, DESC_MAX))
                    }
                    rows={4}
                    className="w-full resize-none rounded-[8px] border border-[#E6E6E3] px-3 py-2.5 pb-7 text-[13px] text-[#111118] outline-none"
                  />
                  <span className="pointer-events-none absolute right-3 bottom-2.5 text-[11px] text-[#8A8A8A]">
                    {description.length}/{DESC_MAX}
                  </span>
                </div>
              </Field>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-[12px] font-medium text-[#111118]">
                    Upload Item Photos{" "}
                    <span className="text-[#8A8A8A]">
                      {photos.length}/{PHOTO_MAX}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={photos.length >= PHOTO_MAX}
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex h-[32px] items-center gap-1.5 rounded-[8px] bg-[#242424] px-3 text-[12px] font-medium text-white disabled:opacity-40"
                  >
                    <CloudUpload size={14} />
                    Upload Photo
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file || photos.length >= PHOTO_MAX) return;
                      setPhotos((current) => [
                        ...current,
                        {
                          id: uid(),
                          url: URL.createObjectURL(file),
                          name: file.name,
                        },
                      ]);
                      event.target.value = "";
                    }}
                  />
                </div>

                {photos.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex h-[120px] w-full items-center justify-center rounded-[10px] border border-dashed border-[#D9D9D6] bg-[#FAFAF8] text-[#C0C0BC] transition-colors hover:border-[#C8C8C6]"
                  >
                    <ImageIcon size={28} />
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {photos.map((photo) => (
                      <div key={photo.id} className="w-[110px]">
                        <div className="overflow-hidden rounded-[8px] border border-[#E6E6E3]">
                          <img
                            src={photo.url}
                            alt=""
                            className="aspect-square w-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setPhotos((current) =>
                              current.filter((entry) => entry.id !== photo.id),
                            )
                          }
                          className="mt-1.5 text-[12px] font-medium text-[#3B7DC4] hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
              Pricing
            </h3>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Buying Unit">
                  <Select
                    value={buyingUnit}
                    onChange={setBuyingUnit}
                    className="w-full"
                    aria-label="Buying Unit"
                    placeholder="Select"
                    options={[
                      { value: "", label: "Select" },
                      ...BUYING_UNITS.map((entry) => ({
                        value: entry,
                        label: entry,
                      })),
                    ]}
                  />
                </Field>
                <Field label="Buying Price">
                  <MoneyInput value={buyingPrice} onChange={setBuyingPrice} />
                </Field>
                <Field label="Contents">
                  <Input
                    value={contents}
                    onChange={(event) => setContents(event.target.value)}
                    className="h-[40px] rounded-[8px] border-[#E6E6E3] text-[13px]"
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Single Item Unit">
                  <Select
                    value={singleItemUnit}
                    onChange={setSingleItemUnit}
                    className="w-full"
                    aria-label="Single Item Unit"
                    placeholder="Select"
                    options={[
                      { value: "", label: "Select" },
                      ...SINGLE_ITEM_UNITS.map((entry) => ({
                        value: entry,
                        label: entry,
                      })),
                    ]}
                  />
                </Field>
                <Field label="Cost per Unit">
                  <MoneyInput value={formatMoney(costPerUnit)} readOnly />
                </Field>
                <Field label="40% Margin Sug Price">
                  <MoneyInput value={formatMoney(suggested)} readOnly />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Selling Price">
                  <MoneyInput value={sellingPrice} onChange={setSellingPrice} />
                </Field>
                <Field label="Final Margin">
                  <Input
                    readOnly
                    value={finalMargin ? `${finalMargin.toFixed(2)}%` : "0%"}
                    className="h-[40px] rounded-[8px] border-[#E6E6E3] bg-[#F3F3F1] text-[13px] text-[#6B6B6B]"
                  />
                </Field>
              </div>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-4 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] font-medium text-[#8A8A8A]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-[36px] rounded-[8px] bg-[#242424] px-5 text-[13px] font-medium text-white"
          >
            {isEdit ? "Save Item" : "Create Item"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-[#111118]">
        {label}
      </label>
      {children}
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  readOnly = false,
}: {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-[#8A8A8A]">
        $
      </span>
      <Input
        readOnly={readOnly}
        value={value}
        onChange={
          onChange ? (event) => onChange(event.target.value) : undefined
        }
        className={
          readOnly
            ? "h-[40px] rounded-[8px] border-[#E6E6E3] bg-[#F3F3F1] pl-7 text-[13px] text-[#6B6B6B]"
            : "h-[40px] rounded-[8px] border-[#E6E6E3] pl-7 text-[13px]"
        }
      />
    </div>
  );
}

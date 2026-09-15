import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CloudUpload, Image as ImageIcon, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAppCatalog } from "@/context/AppCatalogContext";
import { useScrollLock } from "@/hooks/useScrollLock";
import {
  BUYING_UNITS,
  ITEM_CATEGORIES,
  ITEM_SUBCATEGORIES,
  SINGLE_ITEM_UNITS,
  type Item,
  type ItemPhoto,
} from "@/types/item";
import { resolveDistributorId } from "@/utils/distributorSync";
import {
  resolveSourceId,
  sourceNamesForDistributor,
} from "@/utils/sources";
import { cn } from "@/utils/cn";
import {
  firstItemFormErrorField,
  hasItemFormErrors,
  ITEM_DESCRIPTION_MAX,
  ITEM_PHOTO_MAX,
  validateItemForm,
  type ItemFormErrors,
} from "@/utils/itemForm";
import {
  calcCostPerUnit,
  calcFinalMarginPercent,
  calcSuggestedPrice,
  formatCalculatedMoney,
  formatFinalMarginPercent,
  formatMoneyInput,
  parseContentsInput,
  parseMoneyInput,
} from "@/utils/itemPricing";

const FIELD_LABEL = "text-[12px] font-medium text-[#000000]";
const INVALID_BORDER = "border-[#E25B5B] focus:border-[#E25B5B]";
/** Read-only calculated fields — solid gray, no border (matches design). */
const READONLY_FIELD =
  "h-[33.75px] rounded-[9.38px] border border-transparent bg-[#F3F3F1] text-[13px] text-[#6B6B6B]";

type AddItemModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (item: Item) => void;
  /** Remove the item being edited from the list. Edit mode only. */
  onRemove?: () => void;
  item?: Item | null;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[11px] text-[#E25B5B]">{message}</p>;
}

export function AddItemModal({
  open,
  onClose,
  onSave,
  onRemove,
  item = null,
}: AddItemModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(item);
  useScrollLock(open);
  const { distributors, sources: catalogSources } = useAppCatalog();

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
  const [buyingPrice, setBuyingPrice] = useState("");
  const [contents, setContents] = useState("");
  const [singleItemUnit, setSingleItemUnit] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [errors, setErrors] = useState<ItemFormErrors>({});

  const distributorOptions = useMemo(
    () => distributors.map((entry) => entry.name).sort(),
    [distributors],
  );

  const sourceOptions = useMemo(() => {
    if (!distributor) return [];
    return sourceNamesForDistributor(catalogSources, distributor);
  }, [catalogSources, distributor]);

  const subcategoryOptions = category
    ? (ITEM_SUBCATEGORIES[category] ?? [])
    : [];

  function handleDistributorChange(value: string) {
    setDistributor(value);
    if (errors.distributor) {
      setErrors((current) => ({ ...current, distributor: undefined }));
    }
    if (
      source &&
      !sourceNamesForDistributor(catalogSources, value).includes(source)
    ) {
      setSource("");
      if (errors.source) {
        setErrors((current) => ({ ...current, source: undefined }));
      }
    }
  }

  const buying = parseMoneyInput(buyingPrice);
  const qty = parseContentsInput(contents);
  const costPerUnit = calcCostPerUnit(buying, qty);
  const suggested = calcSuggestedPrice(costPerUnit);
  const sell = parseMoneyInput(sellingPrice);
  const finalMargin = calcFinalMarginPercent(sell, costPerUnit);

  useEffect(() => {
    if (!open) return;

    setErrors({});

    if (item) {
      setDistributor(item.distributor);
      setSource(item.source);
      setCategory(item.category);
      setSubcategory(
        (ITEM_SUBCATEGORIES[item.category] ?? []).includes(item.subcategory)
          ? item.subcategory
          : "",
      );
      setName(item.name);
      setPreorderInfo(item.preorderInfo);
      setMerchandisingName(item.merchandisingName);
      setDescription(item.description);
      setPhotos(item.photos.map((photo) => ({ ...photo })));
      setBuyingUnit(item.buyingUnit);
      setBuyingPrice(formatMoneyInput(item.buyingPrice));
      setContents(item.contents > 0 ? String(item.contents) : "");
      setSingleItemUnit(item.singleItemUnit);
      setSellingPrice(formatMoneyInput(item.sellingPrice));
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
    setBuyingPrice("");
    setContents("");
    setSingleItemUnit("");
    setSellingPrice("");
  }, [item, open]);

  if (!open) return null;

  function handleClose() {
    setErrors({});
    onClose();
  }

  function handleRemove() {
    onRemove?.();
    handleClose();
  }

  function handleSave() {
    const nextErrors = validateItemForm({
      name,
      merchandisingName,
      distributor,
      source,
      category,
      subcategory,
      description,
      photosCount: photos.length,
      buyingUnit,
      buyingPrice,
      contents,
      singleItemUnit,
      sellingPrice,
      distributorOptions,
      sourceOptions,
    });

    if (hasItemFormErrors(nextErrors)) {
      setErrors(nextErrors);
      const firstField = firstItemFormErrorField(nextErrors);
      if (firstField) {
        requestAnimationFrame(() => {
          document
            .querySelector(`[data-field="${firstField}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
      return;
    }

    setErrors({});

    onSave({
      id: item?.id ?? "IT-TEMP",
      name: name.trim(),
      merchandisingName: merchandisingName.trim(),
      description: description.trim(),
      preorderInfo: preorderInfo.trim(),
      category,
      subcategory,
      distributor,
      distributorId: resolveDistributorId(distributor, distributors),
      source,
      sourceId: resolveSourceId(source, catalogSources) ?? item?.sourceId,
      buyingUnit,
      buyingPrice: buying,
      contents: qty,
      singleItemUnit,
      sellingPrice: sell,
      photos,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-none p-6">
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 bg-[#333333]/55"
        onClick={handleClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        data-scroll-lock-allow
        className="relative z-10 my-4 flex max-h-[calc(100dvh-3rem)] w-full max-w-[680px] flex-col overflow-hidden overscroll-contain rounded-[14px] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#ECECEA] px-6 pt-5 pb-3">
          <h2 className="text-[20px] font-semibold tracking-tight text-[#111118]">
            {isEdit ? "Edit Item" : "Add Item"}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={handleClose}
            className="cursor-pointer rounded-md p-1 text-[#8A8A8A] hover:bg-[#F5F5F3]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-auto px-6 pt-4 pb-5">
          <section>
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
              Basic Info
            </h3>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div data-field="distributor">
                  <Field label="Distributor">
                    <Select
                      value={distributor}
                      onChange={handleDistributorChange}
                      className="w-full"
                      aria-label="Distributor"
                      placeholder="Select"
                      buttonClassName={cn(errors.distributor && INVALID_BORDER)}
                      options={[
                        { value: "", label: "Select" },
                        ...distributorOptions.map((entry) => ({
                          value: entry,
                          label: entry,
                        })),
                      ]}
                    />
                  </Field>
                  <FieldError message={errors.distributor} />
                </div>
                <div data-field="source">
                  <Field label="Source">
                    <Select
                      value={source}
                      onChange={(value) => {
                        setSource(value);
                        if (errors.source) {
                          setErrors((current) => ({
                            ...current,
                            source: undefined,
                          }));
                        }
                      }}
                      disabled={!distributor}
                      className="w-full"
                      aria-label="Source"
                      placeholder={
                        distributor ? "Select" : "Select distributor first"
                      }
                      buttonClassName={cn(errors.source && INVALID_BORDER)}
                      options={[
                        { value: "", label: "Select" },
                        ...sourceOptions.map((entry) => ({
                          value: entry,
                          label: entry,
                        })),
                      ]}
                    />
                  </Field>
                  <FieldError message={errors.source} />
                </div>
                <div data-field="category">
                  <Field label="Category">
                    <Select
                      value={category}
                      onChange={(value) => {
                        setCategory(value);
                        setSubcategory("");
                        setErrors((current) => ({
                          ...current,
                          category: undefined,
                          subcategory: undefined,
                        }));
                      }}
                      className="w-full"
                      aria-label="Category"
                      placeholder="Select"
                      buttonClassName={cn(errors.category && INVALID_BORDER)}
                      options={[
                        { value: "", label: "Select" },
                        ...ITEM_CATEGORIES.map((entry) => ({
                          value: entry,
                          label: entry,
                        })),
                      ]}
                    />
                  </Field>
                  <FieldError message={errors.category} />
                </div>
                <div data-field="subcategory">
                  <Field label="Subcategory">
                    <Select
                      value={subcategory}
                      onChange={(value) => {
                        setSubcategory(value);
                        if (errors.subcategory) {
                          setErrors((current) => ({
                            ...current,
                            subcategory: undefined,
                          }));
                        }
                      }}
                      disabled={!category || subcategoryOptions.length === 0}
                      className="w-full"
                      aria-label="Subcategory"
                      placeholder="Select"
                      buttonClassName={cn(errors.subcategory && INVALID_BORDER)}
                      options={[
                        { value: "", label: "Select" },
                        ...subcategoryOptions.map((entry) => ({
                          value: entry,
                          label: entry,
                        })),
                      ]}
                    />
                  </Field>
                  <FieldError message={errors.subcategory} />
                </div>
              </div>
              <div data-field="name">
                <Field label="Item Name">
                  <Input
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      if (errors.name) {
                        setErrors((current) => ({ ...current, name: undefined }));
                      }
                    }}
                    className={cn(
                      "w-full",
                      errors.name && INVALID_BORDER,
                    )}
                  />
                </Field>
                <FieldError message={errors.name} />
              </div>
              <Field label="Item Pre-order Information">
                <textarea
                  value={preorderInfo}
                  onChange={(event) => setPreorderInfo(event.target.value)}
                  rows={3}
                  className="min-h-[80px] w-full resize-y rounded-[8px] border border-[#E6E6E3] px-3 py-2.5 text-[13px] leading-relaxed text-[#111118] outline-none"
                />
              </Field>
            </div>
          </section>

          <section className="border-t border-[#ECECEA] pt-5">
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
              Merchandising
            </h3>
            <div className="space-y-3">
              <div data-field="merchandisingName">
                <Field label="Merchandising Name">
                  <Input
                    value={merchandisingName}
                    onChange={(event) => {
                      setMerchandisingName(event.target.value);
                      if (errors.merchandisingName) {
                        setErrors((current) => ({
                          ...current,
                          merchandisingName: undefined,
                        }));
                      }
                    }}
                    placeholder="e.g. Wagyu Aged Tenderloin Steak"
                    className={cn(
                      "w-full",
                      errors.merchandisingName && INVALID_BORDER,
                    )}
                  />
                </Field>
                <FieldError message={errors.merchandisingName} />
              </div>
              <div data-field="description">
                <Field label="Item Description">
                  <textarea
                    value={description}
                    maxLength={ITEM_DESCRIPTION_MAX}
                    onChange={(event) => {
                      setDescription(
                        event.target.value.slice(0, ITEM_DESCRIPTION_MAX),
                      );
                      if (errors.description) {
                        setErrors((current) => ({
                          ...current,
                          description: undefined,
                        }));
                      }
                    }}
                    rows={4}
                    className={cn(
                      "min-h-[100px] w-full resize-y rounded-[8px] border border-[#E6E6E3] px-3 py-2.5 text-[13px] leading-relaxed text-[#111118] outline-none",
                      errors.description && INVALID_BORDER,
                    )}
                  />
                  <p className="mt-1 text-right text-[11px] font-medium text-[#8A8A8A]">
                    {description.length}/{ITEM_DESCRIPTION_MAX}
                  </p>
                </Field>
                <FieldError message={errors.description} />
              </div>

              <div data-field="photos">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-[11px] font-semibold tracking-[0.06em] text-[#000000] uppercase">
                    Upload Item Photos
                  </h4>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-medium text-[#000000]">
                      {photos.length}/{ITEM_PHOTO_MAX}
                    </span>
                    <Button
                      variant="dark"
                      size="sm"
                      disabled={photos.length >= ITEM_PHOTO_MAX}
                      onClick={() => fileRef.current?.click()}
                    >
                      <CloudUpload size={14} />
                      Upload Photo
                    </Button>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file || photos.length >= ITEM_PHOTO_MAX) return;
                      setPhotos((current) => [
                        ...current,
                        {
                          id: uid(),
                          url: URL.createObjectURL(file),
                          name: file.name,
                        },
                      ]);
                      if (errors.photos) {
                        setErrors((current) => ({
                          ...current,
                          photos: undefined,
                        }));
                      }
                      event.target.value = "";
                    }}
                  />
                </div>

                {photos.length === 0 ? (
                  <button
                    type="button"
                    disabled={photos.length >= ITEM_PHOTO_MAX}
                    onClick={() => fileRef.current?.click()}
                    className="flex h-[100px] w-[160px] cursor-pointer items-center justify-center rounded-[10px] border border-dashed border-[#D9D9D6] bg-[#FAFAF8] text-[#C0C0BC] transition-colors hover:border-[#C8C8C6] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ImageIcon size={28} />
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {photos.map((photo) => (
                      <div key={photo.id} className="w-[160px]">
                        <div className="h-[100px] overflow-hidden rounded-[8px] border border-[#E6E6E3]">
                          <img
                            src={photo.url}
                            alt={photo.name}
                            className="size-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setPhotos((current) =>
                              current.filter((entry) => entry.id !== photo.id),
                            )
                          }
                          className="mt-1.5 cursor-pointer text-[12px] font-medium text-[#3B7DC4] hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <FieldError message={errors.photos} />
              </div>
            </div>
          </section>

          <section className="border-t border-[#ECECEA] pt-5">
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
              Pricing
            </h3>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div data-field="buyingUnit">
                  <Field label="Buying Unit">
                    <Select
                      value={buyingUnit}
                      onChange={(value) => {
                        setBuyingUnit(value);
                        if (errors.buyingUnit) {
                          setErrors((current) => ({
                            ...current,
                            buyingUnit: undefined,
                          }));
                        }
                      }}
                      className="w-full"
                      aria-label="Buying Unit"
                      placeholder="Select"
                      buttonClassName={cn(errors.buyingUnit && INVALID_BORDER)}
                      options={[
                        { value: "", label: "Select" },
                        ...BUYING_UNITS.map((entry) => ({
                          value: entry,
                          label: entry,
                        })),
                      ]}
                    />
                  </Field>
                  <FieldError message={errors.buyingUnit} />
                </div>
                <div data-field="buyingPrice">
                  <Field label="Buying Price">
                    <MoneyInput
                      value={buyingPrice}
                      placeholder="0.00"
                      onChange={(value) => {
                        setBuyingPrice(sanitizeMoneyTyping(value));
                        if (errors.buyingPrice) {
                          setErrors((current) => ({
                            ...current,
                            buyingPrice: undefined,
                          }));
                        }
                      }}
                      invalid={Boolean(errors.buyingPrice)}
                    />
                  </Field>
                  <FieldError message={errors.buyingPrice} />
                </div>
                <div data-field="contents">
                  <Field label="Contents">
                    <Input
                      value={contents}
                      inputMode="numeric"
                      placeholder="0"
                      onChange={(event) => {
                        setContents(event.target.value.replace(/\D/g, ""));
                        if (errors.contents) {
                          setErrors((current) => ({
                            ...current,
                            contents: undefined,
                          }));
                        }
                      }}
                      className={cn(
                        "w-full",
                        errors.contents && INVALID_BORDER,
                      )}
                    />
                  </Field>
                  <FieldError message={errors.contents} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div data-field="singleItemUnit">
                  <Field label="Single Item Unit">
                    <Select
                      value={singleItemUnit}
                      onChange={(value) => {
                        setSingleItemUnit(value);
                        if (errors.singleItemUnit) {
                          setErrors((current) => ({
                            ...current,
                            singleItemUnit: undefined,
                          }));
                        }
                      }}
                      className="w-full"
                      aria-label="Single Item Unit"
                      placeholder="Select"
                      buttonClassName={cn(
                        errors.singleItemUnit && INVALID_BORDER,
                      )}
                      options={[
                        { value: "", label: "Select" },
                        ...SINGLE_ITEM_UNITS.map((entry) => ({
                          value: entry,
                          label: entry,
                        })),
                      ]}
                    />
                  </Field>
                  <FieldError message={errors.singleItemUnit} />
                </div>
                <Field label="Cost per Unit">
                  <CalculatedMoney value={formatCalculatedMoney(costPerUnit)} />
                </Field>
                <Field label="40% Margin Suggested Price">
                  <CalculatedMoney value={formatCalculatedMoney(suggested)} />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div data-field="sellingPrice">
                  <Field label="Selling Price">
                    <MoneyInput
                      value={sellingPrice}
                      placeholder="0.00"
                      onChange={(value) => {
                        setSellingPrice(sanitizeMoneyTyping(value));
                        if (errors.sellingPrice) {
                          setErrors((current) => ({
                            ...current,
                            sellingPrice: undefined,
                          }));
                        }
                      }}
                      invalid={Boolean(errors.sellingPrice)}
                    />
                  </Field>
                  <FieldError message={errors.sellingPrice} />
                </div>
                <Field label="Final Margin">
                  <CalculatedValue
                    value={formatFinalMarginPercent(finalMargin)}
                  />
                </Field>
              </div>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[#ECECEA] px-6 py-4">
          {isEdit ? (
            <button
              type="button"
              onClick={handleRemove}
              className="cursor-pointer text-[13px] font-medium text-[#111118] underline"
            >
              Remove Item
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="dark" onClick={handleSave}>
              {isEdit ? "Save Item" : "Create Item"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className={cn(FIELD_LABEL, "mb-1.5 block")}>{label}</label>
      {children}
    </div>
  );
}

/** Keep a single decimal point while typing monetary values. */
function sanitizeMoneyTyping(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return (
    cleaned.slice(0, firstDot + 1) +
    cleaned.slice(firstDot + 1).replace(/\./g, "")
  );
}

/** Gray calculated money — display only, never editable. */
function CalculatedMoney({ value }: { value: string }) {
  return (
    <div
      className={cn(READONLY_FIELD, "relative flex items-center pl-7")}
      aria-readonly="true"
    >
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-[#8A8A8A]">
        $
      </span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/** Gray calculated text (e.g. Final Margin %) — display only. */
function CalculatedValue({ value }: { value: string }) {
  return (
    <div
      className={cn(READONLY_FIELD, "flex items-center px-3.5")}
      aria-readonly="true"
    >
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  placeholder,
  invalid = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-[#8A8A8A]">
        $
      </span>
      <Input
        value={value}
        placeholder={placeholder}
        inputMode="decimal"
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "w-full pl-7",
          invalid && INVALID_BORDER,
        )}
      />
    </div>
  );
}

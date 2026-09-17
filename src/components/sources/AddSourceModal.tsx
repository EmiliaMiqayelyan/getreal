import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAppCatalog } from "@/context/AppCatalogContext";
import { useScrollLock } from "@/hooks/useScrollLock";
import type { Source } from "@/types/source";
import { cn } from "@/utils/cn";
import { resolveDistributorId } from "@/utils/distributorSync";
import { locationFromAddress } from "@/utils/format";
import {
  firstSourceFormErrorField,
  hasSourceFormErrors,
  SOURCE_NO_DISTRIBUTOR,
  validateSourceForm,
  type SourceFormErrors,
} from "@/utils/sourceForm";
import { getSourceDistributorSelection } from "@/utils/sources";

const FIELD_LABEL = "text-[11px] font-semibold text-[#2E2E2E]";
const INVALID_BORDER = "border-[#E25B5B] focus:border-[#E25B5B]";

type AddSourceModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (source: Source) => void;
  /** Remove the source being edited from the list. Edit mode only. */
  onRemove?: () => void;
  source?: Source | null;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[11px] text-[#E25B5B]">{message}</p>;
}

export function AddSourceModal({
  open,
  onClose,
  onSave,
  onRemove,
  source = null,
}: AddSourceModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(source);
  useScrollLock(open);
  const { distributors } = useAppCatalog();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [distributor, setDistributor] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string | undefined>();
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<SourceFormErrors>({});

  const distributorOptions = useMemo(
    () => distributors.map((entry) => entry.name).sort(),
    [distributors],
  );

  useEffect(() => {
    if (!open) return;

    setErrors({});

    if (source) {
      setName(source.name);
      setAddress(source.fullAddress || source.location);
      const selection = getSourceDistributorSelection(source);
      setDistributor(selection || SOURCE_NO_DISTRIBUTOR);
      setLogoUrl(source.logoUrl);
      setLogoName(source.logoName);
      setDescription(source.description);
      return;
    }

    setName("");
    setAddress("");
    setDistributor("");
    setLogoUrl(null);
    setLogoName(undefined);
    setDescription("");
  }, [open, source]);

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
    const nextErrors = validateSourceForm({
      name,
      address,
      distributor,
      distributorOptions,
    });

    if (hasSourceFormErrors(nextErrors)) {
      setErrors(nextErrors);
      const firstField = firstSourceFormErrorField(nextErrors);
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

    const hasExternalDistributor = distributor !== SOURCE_NO_DISTRIBUTOR;

    onSave({
      id: source?.id ?? "SOR-TEMP",
      name: name.trim(),
      fullAddress: address.trim(),
      location: locationFromAddress(address) || source?.location || "—",
      distributor: hasExternalDistributor ? distributor : "",
      distributorId: hasExternalDistributor
        ? resolveDistributorId(distributor, distributors)
        : undefined,
      description: description.trim(),
      logoUrl,
      logoName: logoUrl ? logoName : undefined,
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
        className="relative z-10 my-4 flex max-h-[calc(100dvh-3rem)] w-full max-w-[560px] flex-col overflow-hidden overscroll-contain rounded-[14px] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#ECECEA] px-[30px] py-[18.75px]">
          <h2 className="text-[22px] font-semibold tracking-tight text-[#111118]">
            {isEdit ? "Edit Source" : "Add Source"}
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

        <div className="flex-1 space-y-0 overflow-auto px-[30px] pt-6 pb-5">
          <section>
            <div className="space-y-5">
              <div data-field="name">
                <label className={FIELD_LABEL}>Source Name</label>
                <Input
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (errors.name) {
                      setErrors((current) => ({ ...current, name: undefined }));
                    }
                  }}
                  className={cn(
                    "mt-1.5 w-full",
                    errors.name && INVALID_BORDER,
                  )}
                />
                <FieldError message={errors.name} />
              </div>

              <div data-field="address">
                <label className={FIELD_LABEL}>Full Address</label>
                <Input
                  value={address}
                  onChange={(event) => {
                    setAddress(event.target.value);
                    if (errors.address) {
                      setErrors((current) => ({
                        ...current,
                        address: undefined,
                      }));
                    }
                  }}
                  className={cn(
                    "mt-1.5 w-full",
                    errors.address && INVALID_BORDER,
                  )}
                />
                <FieldError message={errors.address} />
              </div>

              <div data-field="distributor">
                <label className={FIELD_LABEL}>Distributor</label>
                <Select
                  value={distributor}
                  onChange={(value) => {
                    setDistributor(value);
                    if (errors.distributor) {
                      setErrors((current) => ({
                        ...current,
                        distributor: undefined,
                      }));
                    }
                  }}
                  className="mt-1.5 w-full"
                  aria-label="Distributor"
                  placeholder="Select"
                  buttonClassName={cn(errors.distributor && INVALID_BORDER)}
                  options={[
                    { value: SOURCE_NO_DISTRIBUTOR, label: "No Distributor" },
                    ...distributorOptions.map((item) => ({
                      value: item,
                      label: item,
                    })),
                  ]}
                />
                <FieldError message={errors.distributor} />
              </div>
            </div>
          </section>

          <section className="mt-8 border-t border-[#00000014] pt-8">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                Image Place
              </h3>
              <Button
                variant="dark"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={14} strokeWidth={1.75} />
                Upload
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const url = URL.createObjectURL(file);
                  setLogoUrl(url);
                  setLogoName(file.name);
                  event.target.value = "";
                }}
              />
            </div>

            {logoUrl ? (
              <div>
                <div className="flex items-center justify-center rounded-[10px] border border-dashed border-[#D9D9D6] bg-[#FAFAF8] px-4 py-6">
                  <img
                    src={logoUrl}
                    alt={logoName || "Source image"}
                    className="max-h-[120px] max-w-full object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLogoUrl(null);
                    setLogoName(undefined);
                  }}
                  className="mt-2 cursor-pointer text-[13px] font-medium text-[#3B7DC4] hover:underline"
                >
                  Delete
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full cursor-pointer items-center justify-center rounded-[10px] border border-dashed border-[#D9D9D6] bg-[#FAFAF8] px-4 py-10 text-[13px] text-[#8A8A8A] transition-colors hover:border-[#C8C8C6]"
              >
                Upload Image
              </button>
            )}
          </section>

          <section className="mt-8 border-t border-[#00000014] pt-8">
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
              Description
            </h3>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Write your notes here..."
              rows={5}
              className="min-h-[120px] max-h-[320px] w-full resize-y overflow-y-auto rounded-[8px] border border-[#E6E6E3] px-3 py-2.5 text-[13px] leading-relaxed text-[#111118] outline-none placeholder:text-[#A9A9A9]"
            />
          </section>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[#ECECEA] px-[30px] py-4">
          {isEdit ? (
            <button
              type="button"
              onClick={handleRemove}
              className="cursor-pointer text-[13px] font-medium text-[#111118] underline"
            >
              Remove Source
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="dark" onClick={handleSave}>
              Save Source
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

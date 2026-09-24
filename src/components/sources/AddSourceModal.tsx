import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  FormField,
  INVALID_FIELD_BORDER,
} from "@/components/ui/FormField";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAppCatalog } from "@/context/AppCatalogContext";
import { useScrollLock } from "@/hooks/useScrollLock";
import { isApiConfigured, isUploadableImage, uploadImage } from "@/lib/api";
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

type AddSourceModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (source: Source) => void;
  /** Remove the source being edited from the list. Edit mode only. */
  onRemove?: () => void;
  source?: Source | null;
};

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
  const [imageError, setImageError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [saving, setSaving] = useState(false);
  const logoFileRef = useRef<File | null>(null);

  const distributorOptions = useMemo(
    () => distributors.map((entry) => entry.name).sort(),
    [distributors],
  );

  useEffect(() => {
    if (!open) return;

    setErrors({});
    setImageError("");
    setConfirmRemove(false);
    setSaving(false);
    logoFileRef.current = null;

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

  function clearLogo() {
    logoFileRef.current = null;
    setLogoName(undefined);
    setLogoUrl(null);
  }

  function rejectImage(message: string) {
    clearLogo();
    setImageError(message);
  }

  function handleClose() {
    setErrors({});
    onClose();
  }

  function handleRemove() {
    setConfirmRemove(true);
  }

  function confirmRemoveSource() {
    onRemove?.();
    handleClose();
  }

  async function handleSave() {
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

    let nextLogoUrl = logoUrl;
    const pendingFile = logoFileRef.current;
    if (pendingFile) {
      if (!isUploadableImage(pendingFile)) {
        rejectImage("Upload a JPEG, PNG, or WebP image.");
        return;
      }
      if (isApiConfigured()) {
        setSaving(true);
        try {
          nextLogoUrl = await uploadImage(pendingFile);
        } catch {
          rejectImage("This image could not be uploaded and was removed.");
          return;
        } finally {
          setSaving(false);
        }
      }
    } else if (nextLogoUrl?.startsWith("blob:")) {
      rejectImage("This image could not be uploaded and was removed.");
      return;
    }

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
      logoUrl: nextLogoUrl,
      logoName: nextLogoUrl ? logoName : undefined,
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
        <div className="flex items-center justify-between border-b border-[#00000014] px-[30px] py-[18.75px]">
          <h2 className="text-[22px] font-semibold tracking-tight text-[#111118]">
            {isEdit ? "Edit Source" : "Create Source"}
          </h2>
          <IconButton aria-label="Close" onClick={handleClose}>
            <X size={18} />
          </IconButton>
        </div>

        <div className="flex-1 space-y-0 overflow-auto px-[30px] pt-6 pb-5">
          <section>
            <div className="space-y-5">
              <FormField label="Source Name" error={errors.name}>
                <div data-field="name">
                  <Input
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      if (errors.name) {
                        setErrors((current) => ({
                          ...current,
                          name: undefined,
                        }));
                      }
                    }}
                    className={cn(
                      "w-full",
                      errors.name && INVALID_FIELD_BORDER,
                    )}
                  />
                </div>
              </FormField>

              <FormField label="Full Address" error={errors.address}>
                <div data-field="address">
                  <Input
                    value={address}
                    placeholder="Street, city, state ZIP"
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
                      "w-full",
                      errors.address && INVALID_FIELD_BORDER,
                    )}
                  />
                </div>
              </FormField>

              <FormField label="Distributor" error={errors.distributor}>
                <div data-field="distributor">
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
                    className="w-full"
                    aria-label="Distributor"
                    placeholder="Select"
                    buttonClassName={cn(
                      errors.distributor && INVALID_FIELD_BORDER,
                    )}
                    options={[
                      { value: SOURCE_NO_DISTRIBUTOR, label: "No Distributor" },
                      ...distributorOptions.map((item) => ({
                        value: item,
                        label: item,
                      })),
                    ]}
                  />
                </div>
              </FormField>
            </div>
          </section>

          <section className="mt-8 border-t border-[#00000014] pt-8">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold tracking-[0.06em] text-[#6B7180] uppercase">
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
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  if (!isUploadableImage(file)) {
                    rejectImage("Upload a JPEG, PNG, or WebP image.");
                    return;
                  }
                  setImageError("");
                  logoFileRef.current = file;
                  setLogoUrl(URL.createObjectURL(file));
                  setLogoName(file.name);
                }}
              />
            </div>

            {logoUrl ? (
              <div>
                <div className="flex items-center justify-center rounded-[10px] border border-dashed border-[#00000014] bg-[#FAFAF8] px-4 py-6">
                  <img
                    src={logoUrl}
                    alt={logoName || "Source image"}
                    className="max-h-[120px] max-w-full object-contain"
                    onError={() =>
                      rejectImage("This image could not be loaded and was removed.")
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearLogo();
                    setImageError("");
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
                className="flex w-full cursor-pointer items-center justify-center rounded-[10px] border border-dashed border-[#00000014] bg-[#FAFAF8] px-4 py-10 text-[13px] text-[#8A8A8A] transition-colors hover:border-[#00000014]"
              >
                Upload Image
              </button>
            )}
            {imageError ? (
              <p className="mt-2 text-[12px] text-[#E25B5B]">{imageError}</p>
            ) : null}
          </section>

          <section className="mt-8 border-t border-[#00000014] pt-8">
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#6B7180] uppercase">
              Description
            </h3>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Write your notes here..."
              rows={5}
              className="min-h-[120px] max-h-[320px] w-full resize-y overflow-y-auto rounded-[8px] border border-[#00000014] px-3 py-2.5 text-[13px] leading-relaxed text-[#111118] outline-none placeholder:text-[#A9A9A9]"
            />
          </section>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[#00000014] px-[30px] py-4">
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
            <Button variant="dark" disabled={saving} onClick={() => void handleSave()}>
              {saving ? "Saving..." : isEdit ? "Save Source" : "Create Source"}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title="Delete source"
        message={`Delete ${name.trim() || "this source"}?`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onClose={() => setConfirmRemove(false)}
        onConfirm={confirmRemoveSource}
      />
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { CloudUpload, X } from "lucide-react";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DISTRIBUTORS } from "@/constants/distributors";
import { useScrollLock } from "@/hooks/useScrollLock";
import type { Source } from "@/types/source";
import { locationFromAddress } from "@/utils/format";

type AddSourceModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (source: Source) => void;
  source?: Source | null;
};

export function AddSourceModal({
  open,
  onClose,
  onSave,
  source = null,
}: AddSourceModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(source);
  useScrollLock(open);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [distributor, setDistributor] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string | undefined>();
  const [description, setDescription] = useState("");

  const distributorOptions = useMemo(() => {
    const names = new Set(DISTRIBUTORS.map((item) => item.name));
    names.add("Ranch Protein LLC");
    if (source?.distributor) names.add(source.distributor);
    return Array.from(names).sort();
  }, [source]);

  useEffect(() => {
    if (!open) return;

    if (source) {
      setName(source.name);
      setAddress(source.fullAddress || source.location);
      setDistributor(source.distributor);
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
    onClose();
  }

  function handleSave() {
    if (!name.trim()) return;

    onSave({
      id: source?.id ?? "SOR-TEMP",
      name: name.trim(),
      fullAddress: address.trim(),
      location: locationFromAddress(address) || source?.location || "—",
      distributor: distributor || "—",
      description: description.trim(),
      logoUrl,
      logoName,
    });
    handleClose();
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
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-[20px] font-semibold tracking-tight text-[#111118]">
            {isEdit ? "Edit Source" : "Add Source"}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={handleClose}
            className="rounded-md p-1 text-[#8A8A8A] hover:bg-[#F5F5F3]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-auto px-6 py-2 pb-5">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#111118]">
              Source Name
            </label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-[40px] rounded-[8px] border-[#E6E6E3] text-[13px]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#111118]">
              Full Address
            </label>
            <Input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className="h-[40px] rounded-[8px] border-[#E6E6E3] text-[13px]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#111118]">
              Distributor
            </label>
            <Select
              value={distributor}
              onChange={setDistributor}
              className="w-full"
              aria-label="Distributor"
              placeholder="Select"
              options={[
                { value: "", label: "Select" },
                ...distributorOptions.map((item) => ({
                  value: item,
                  label: item,
                })),
              ]}
            />
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
                Logo Place
              </h3>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-[32px] items-center gap-1.5 rounded-[8px] bg-[#242424] px-3 text-[12px] font-medium text-white"
              >
                <CloudUpload size={14} />
                Upload
              </button>
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
                    alt={logoName || "Source logo"}
                    className="max-h-[120px] max-w-full object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLogoUrl(null);
                    setLogoName(undefined);
                  }}
                  className="mt-2 text-[13px] font-medium text-[#3B7DC4] hover:underline"
                >
                  Delete
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center rounded-[10px] border border-dashed border-[#D9D9D6] bg-[#FAFAF8] px-4 py-10 text-[13px] text-[#8A8A8A] transition-colors hover:border-[#C8C8C6]"
              >
                Upload Logo
              </button>
            )}
          </section>

          <section>
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
              Description
            </h3>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Write your notes here..."
              rows={5}
              className="w-full resize-none rounded-[8px] border border-[#E6E6E3] px-3 py-2.5 text-[13px] text-[#111118] outline-none placeholder:text-[#A9A9A9]"
            />
          </section>
        </div>

        <div className="flex items-center justify-end gap-4 px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="text-[13px] font-medium text-[#8A8A8A]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-[36px] rounded-[8px] bg-[#242424] px-5 text-[13px] font-medium text-white"
          >
            Save Distributor
          </button>
        </div>
      </div>
    </div>
  );
}

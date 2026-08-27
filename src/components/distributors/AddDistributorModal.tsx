import { useEffect, useRef, useState } from "react";
import { CloudUpload, Download, FileText, Plus, Trash2, X } from "lucide-react";

import { Input } from "@/components/ui/Input";
import { useScrollLock } from "@/hooks/useScrollLock";
import type { Distributor, DistributorContact } from "@/types/distributor";
import { cn } from "@/utils/cn";
import {
  formatDeliveryLabel,
  locationFromAddress,
  WEEK_DAYS,
} from "@/utils/format";

const PAYMENT_TERMS = ["NET-15", "NET-30", "NET-35"] as const;
const ORANGE = "#F57850";

type ContactDraft = DistributorContact;

type DocDraft = {
  id: string;
  name: string;
  size: string;
};

type AddDistributorModalProps = {
  open: boolean;
  onClose: () => void;
  onSave?: (distributor: Distributor) => void;
  distributor?: Distributor | null;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function AddDistributorModal({
  open,
  onClose,
  onSave,
  distributor = null,
}: AddDistributorModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(distributor);
  useScrollLock(open);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [dayTimes, setDayTimes] = useState<Record<string, string>>({});
  const [payment, setPayment] = useState("");
  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [docs, setDocs] = useState<DocDraft[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;

    if (distributor) {
      setName(distributor.name);
      setAddress(distributor.fullAddress || distributor.location);
      const slots = distributor.deliveryDays ?? [];
      setDays(slots.map((slot) => slot.day));
      setDayTimes(
        Object.fromEntries(slots.map((slot) => [slot.day, slot.time])),
      );
      setPayment(distributor.paymentTerms);
      setContacts(
        distributor.contacts.length
          ? distributor.contacts.map((contact) => ({ ...contact }))
          : [],
      );
      setDocs(
        distributor.documents.map((doc) => ({
          id: doc.id,
          name: doc.name,
          size: doc.size,
        })),
      );
      setNotes(distributor.notes);
      return;
    }

    setName("");
    setAddress("");
    setDays([]);
    setDayTimes({});
    setPayment("");
    setContacts([]);
    setDocs([]);
    setNotes("");
  }, [distributor, open]);

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

  function handleClose() {
    onClose();
  }

  function handleSave() {
    if (!name.trim()) return;

    const primary =
      contacts.find((contact) => contact.primary) ?? contacts[0] ?? null;
    const deliveryDays = WEEK_DAYS.filter((day) => days.includes(day)).map(
      (day) => ({
        day,
        time: dayTimes[day] ?? "08:00",
      }),
    );
    const delivery = formatDeliveryLabel(deliveryDays);
    const contactName = primary
      ? `${primary.firstName} ${primary.lastName}`.trim() || "—"
      : "—";

    onSave?.({
      id: distributor?.id ?? `DIS-${String(Date.now()).slice(-5)}`,
      name: name.trim(),
      paymentTerms: payment,
      contact: contactName,
      phone: primary?.phone || "—",
      location: locationFromAddress(address),
      fullAddress: address.trim(),
      delivery: [delivery.days, delivery.time].filter(Boolean).join(" "),
      deliveryDays,
      documents: docs,
      notes,
      contacts,
      categories: distributor?.categories ?? [],
      items: distributor?.items ?? 0,
      docs: docs.length ? String(docs.length) : null,
      products: distributor?.products ?? [],
    });
    handleClose();
  }

  const orderedDays = WEEK_DAYS.filter((day) => days.includes(day));
  const titleLabel = isEdit ? "Role" : "Job Title";
  const contactsTitle =
    contacts.length === 0 ? "Contact Information" : "Distributor Information";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden overscroll-none p-6">
      <button
        type="button"
        aria-label="Close overlay"
        className="fixed inset-0 bg-[#333333]/55"
        onClick={handleClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 my-4 flex max-h-[calc(100dvh-3rem)] w-full max-w-[640px] flex-col overflow-hidden overscroll-contain rounded-[14px] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-[20px] font-semibold tracking-tight text-[#111118]">
            {isEdit ? "Edit Distributor" : "Add Distributor"}
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

        <div
          data-scroll-lock-allow
          className="flex-1 space-y-6 overflow-auto overscroll-contain px-6 py-2 pb-5"
        >
          <section>
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
              Company Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-[#111118]">
                  Distributor Name
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
                <label className="mb-2 block text-[12px] font-medium text-[#111118]">
                  Delivery Days & Times
                </label>
                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map((day) => {
                    const active = days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={cn(
                          "h-[32px] min-w-[48px] rounded-[8px] border px-3 text-[12px] font-medium",
                          active
                            ? "border-[#111118] bg-[#111118] text-white"
                            : "border-[#E6E6E3] bg-white text-[#6B6B6B]",
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                {orderedDays.length ? (
                  <div className="mt-3 flex flex-col gap-2">
                    {orderedDays.map((day) => (
                      <div
                        key={day}
                        className="flex w-full items-center gap-3"
                      >
                        <span className="w-8 shrink-0 text-[12px] font-medium text-[#111118]">
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
                          className="h-[34px] !w-[110px] shrink-0 rounded-[8px] border-[#E6E6E3] px-2.5 text-[13px] [&::-webkit-calendar-picker-indicator]:hidden"
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
              {PAYMENT_TERMS.map((term) => {
                const selected = payment === term;
                return (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setPayment(term)}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-2 text-[13px] font-medium",
                      selected ? "text-[#F57850]" : "text-[#6B6B6B]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-[16px] items-center justify-center rounded-full border",
                        selected
                          ? "border-[#F57850] bg-[#F57850]"
                          : "border-[#C9C9C6] bg-transparent",
                      )}
                    >
                      {selected ? (
                        <span className="size-[6px] rounded-full bg-white" />
                      ) : null}
                    </span>
                    {term}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
                {contactsTitle}
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
                        className="inline-flex items-center gap-2 text-[12px] font-medium text-[#111118]"
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
                          setContacts((current) => {
                            const next = current.filter(
                              (entry) => entry.id !== contact.id,
                            );
                            if (
                              next.length &&
                              !next.some((entry) => entry.primary)
                            ) {
                              next[0] = { ...next[0], primary: true };
                            }
                            return next;
                          })
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
                          ["phone", "Phone"],
                          ["email", "Email"],
                          ["title", titleLabel],
                        ] as const
                      ).map(([key, label]) => (
                        <div
                          key={key}
                          className={key === "title" ? "sm:col-span-2" : ""}
                        >
                          <Input
                            value={contact[key]}
                            placeholder={label}
                            onChange={(event) =>
                              setContacts((current) =>
                                current.map((entry) =>
                                  entry.id === contact.id
                                    ? { ...entry, [key]: event.target.value }
                                    : entry,
                                ),
                              )
                            }
                            className="h-[36px] rounded-[8px] border-[#E6E6E3] text-[13px] placeholder:text-[#A9A9A9]"
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
                      size: formatFileSize(file.size),
                    },
                  ]);
                  event.target.value = "";
                }}
              />
            </div>
            {docs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#D9D9D6] bg-[#FAFAF8] px-4 py-8 text-center text-[13px] text-[#8A8A8A]">
                <FileText size={22} className="text-[#C0C0BC]" />
                <span>No documents uploaded yet</span>
              </div>
            ) : (
              <div className="space-y-2">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-[8px] border border-[#E6E6E3] px-3 py-2.5"
                  >
                    <FileText size={18} className="shrink-0 text-[#8A8A8A]" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] text-[#111118]">
                        {doc.name}
                      </div>
                      <div className="text-[11px] text-[#8A8A8A]">{doc.size}</div>
                    </div>
                    <button
                      type="button"
                      aria-label="Download file"
                      onClick={() => {
                        const blob = new Blob([""], {
                          type: "application/octet-stream",
                        });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = doc.name;
                        link.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="text-[#8A8A8A] hover:text-[#111118]"
                    >
                      <Download size={14} />
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
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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

import { useEffect, useRef, useState } from "react";
import { Download, FileText, Plus, Trash2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useScrollLock } from "@/hooks/useScrollLock";
import type { Distributor, DistributorContact } from "@/types/distributor";
import { cn } from "@/utils/cn";
import {
  firstDistributorFormErrorField,
  hasDistributorFormErrors,
  validateDistributorForm,
  type DistributorFormErrors,
} from "@/utils/distributorForm";
import {
  formatDeliveryLabel,
  locationFromAddress,
  WEEK_DAYS,
} from "@/utils/format";

const PAYMENT_TERMS = ["NET-15", "NET-30", "NET-35"] as const;
const INVALID_BORDER = "border-[#E25B5B] focus:border-[#E25B5B]";
const FIELD_LABEL = "text-[11px] font-semibold text-[#2E2E2E]";

function AccentRadio({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex size-[16px] items-center justify-center rounded-full border bg-white",
        checked ? "border-badge" : "border-[#00000014]",
      )}
    >
      {checked ? <span className="size-[8px] rounded-full bg-badge" /> : null}
    </span>
  );
}

type ContactDraft = DistributorContact;

type DocDraft = {
  id: string;
  name: string;
  size: string;
  url?: string;
};

type AddDistributorModalProps = {
  open: boolean;
  onClose: () => void;
  onSave?: (distributor: Distributor) => void;
  /** Remove the distributor being edited from the list. Edit mode only. */
  onRemove?: () => void;
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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[11px] text-[#E25B5B]">{message}</p>;
}

export function AddDistributorModal({
  open,
  onClose,
  onSave,
  onRemove,
  distributor = null,
}: AddDistributorModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadedFilesRef = useRef<Map<string, File>>(new Map());
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
  const [errors, setErrors] = useState<DistributorFormErrors>({});

  useEffect(() => {
    if (!open) {
      uploadedFilesRef.current.clear();
      return;
    }

    setErrors({});

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
          url: doc.url,
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
    uploadedFilesRef.current.clear();
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

  function handleRemove() {
    onRemove?.();
    handleClose();
  }

  function handleSave() {
    const nextErrors = validateDistributorForm({
      name,
      address,
      days,
      dayTimes,
      payment,
      contacts,
    });

    if (hasDistributorFormErrors(nextErrors)) {
      setErrors(nextErrors);
      const firstField = firstDistributorFormErrorField(nextErrors);
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
      id: distributor?.id ?? "",
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

  const CONTACT_FIELDS = [
    ["firstName", "First Name"],
    ["lastName", "Last Name"],
    ["phone", "Phone Number"],
    ["email", "Email Address"],
    ["title", "Position / Role"],
  ] as const;

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
        <div className="flex items-center justify-between border-b border-[#00000014] px-[30px] py-[18.75px]">
          <h2 className="text-[22px] font-semibold tracking-tight text-[#111118]">
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
          className="flex-1 space-y-0 overflow-auto overscroll-contain px-[30px] pt-6 pb-5"
        >
          <section>
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#6B7180] uppercase">
              Company Information
            </h3>
            <div className="space-y-3">
              <div data-field="name">
                <label className={cn(FIELD_LABEL, "mb-1.5 block")}>
                  Distributor Name
                </label>
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
                <FieldError message={errors.name} />
              </div>
              <div data-field="address">
                <label className={cn(FIELD_LABEL, "mb-1.5 block")}>
                  Full Address
                </label>
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
                    "w-full",
                    errors.address && INVALID_BORDER,
                  )}
                />
                <FieldError message={errors.address} />
              </div>
              <div data-field="delivery-days">
                <label className={cn(FIELD_LABEL, "mb-2 block")}>
                  Delivery Days & Times
                </label>
                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map((day) => {
                    const active = days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          toggleDay(day);
                          if (errors.deliveryDays) {
                            setErrors((current) => ({
                              ...current,
                              deliveryDays: undefined,
                            }));
                          }
                        }}
                        className={cn(
                          "h-[32px] min-w-[48px] rounded-[8px] border px-3 text-[12px] font-medium",
                          active
                            ? "border-[#111118] bg-[#111118] text-white"
                            : "border-[#00000014] bg-white text-[#6B6B6B]",
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <FieldError message={errors.deliveryDays} />
                {orderedDays.length ? (
                  <div className="mt-3 flex flex-col gap-2">
                    {orderedDays.map((day) => (
                      <div
                        key={day}
                        data-field={`delivery-time-${day}`}
                        className="flex w-full items-center gap-3"
                      >
                        <span className={cn(FIELD_LABEL, "w-8 shrink-0")}>
                          {day}
                        </span>
                        <div>
                          <Input
                            type="time"
                            value={dayTimes[day] ?? "08:00"}
                            onChange={(event) => {
                              setDayTimes((current) => ({
                                ...current,
                                [day]: event.target.value,
                              }));
                              if (errors.deliveryTimeByDay?.[day]) {
                                setErrors((current) => {
                                  const next = {
                                    ...current.deliveryTimeByDay,
                                  };
                                  delete next[day];
                                  return {
                                    ...current,
                                    deliveryTimeByDay:
                                      Object.keys(next).length ? next : undefined,
                                  };
                                });
                              }
                            }}
                            className={cn(
                              "h-[33.75px] !w-[110px] shrink-0 px-2.5 [&::-webkit-calendar-picker-indicator]:hidden",
                              errors.deliveryTimeByDay?.[day] && INVALID_BORDER,
                            )}
                          />
                          <FieldError
                            message={errors.deliveryTimeByDay?.[day]}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section data-field="payment" className="mt-8 border-t border-[#00000014] pt-8">
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#6B7180] uppercase">
              Payment Terms
            </h3>
            <div
              role="radiogroup"
              aria-label="Payment Terms"
              className="flex flex-wrap gap-5"
            >
              {PAYMENT_TERMS.map((term) => {
                const selected = payment === term;
                return (
                  <button
                    key={term}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setPayment(term);
                      if (errors.payment) {
                        setErrors((current) => ({
                          ...current,
                          payment: undefined,
                        }));
                      }
                    }}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-2 text-[13px] font-medium",
                      selected ? "text-badge" : "text-[#6B6B6B]",
                    )}
                  >
                    <AccentRadio checked={selected} />
                    {term}
                  </button>
                );
              })}
            </div>
            <FieldError message={errors.payment} />
          </section>

          <section data-field="contacts" className="mt-8 border-t border-[#00000014] pt-8">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold tracking-[0.06em] text-[#6B7180] uppercase">
                Contact Information
              </h3>
              <button
                type="button"
                aria-label="Add contact"
                onClick={() => {
                  setContacts((current) => [
                    ...current,
                    emptyContact(current.length === 0),
                  ]);
                  if (errors.contacts) {
                    setErrors((current) => ({
                      ...current,
                      contacts: undefined,
                    }));
                  }
                }}
                className="flex size-7 items-center justify-center rounded-full bg-badge text-white"
              >
                <Plus size={14} />
              </button>
            </div>

            {contacts.length === 0 ? (
              <div
                className={cn(
                  "rounded-[10px] border border-dashed bg-[#FAFAF8] px-4 py-8 text-center text-[13px] text-[#8A8A8A]",
                  errors.contacts
                    ? "border-[#E25B5B]"
                    : "border-[#00000014]",
                )}
              >
                No contacts yet. Click + to add a supplier contact.
              </div>
            ) : (
              <div className="space-y-3">
                {contacts.map((contact) => {
                  const contactErrors = errors.contactById?.[contact.id];

                  return (
                  <div
                    key={contact.id}
                    className={cn(
                      "rounded-[10px] border p-4",
                      contact.primary ? "border-badge" : "border-[#00000014]",
                      contactErrors && "border-[#E25B5B]",
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
                        className={cn(
                          "inline-flex items-center gap-2 text-[12px] font-medium",
                          contact.primary ? "text-badge" : "text-[#111118]",
                        )}
                      >
                        <AccentRadio checked={contact.primary} />
                        {contact.primary ? "Primary contact" : "Set as primary"}
                      </button>
                      <button
                        type="button"
                        aria-label="Delete contact"
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
                      {CONTACT_FIELDS.map(([key, label]) => (
                        <div
                          key={key}
                          data-field={`contact-${contact.id}-${key}`}
                          className={key === "title" ? "sm:col-span-2" : ""}
                        >
                          <label className={cn(FIELD_LABEL, "mb-1.5 block")}>
                            {label}
                          </label>
                          <Input
                            value={contact[key]}
                            type={key === "email" ? "email" : "text"}
                            onChange={(event) => {
                              const value = event.target.value;
                              setContacts((current) =>
                                current.map((entry) =>
                                  entry.id === contact.id
                                    ? { ...entry, [key]: value }
                                    : entry,
                                ),
                              );
                              if (contactErrors?.[key]) {
                                setErrors((current) => {
                                  const nextContact = {
                                    ...current.contactById?.[contact.id],
                                  };
                                  delete nextContact[key];
                                  const nextById = {
                                    ...current.contactById,
                                  };
                                  if (Object.keys(nextContact).length) {
                                    nextById[contact.id] = nextContact;
                                  } else {
                                    delete nextById[contact.id];
                                  }
                                  return {
                                    ...current,
                                    contactById:
                                      Object.keys(nextById).length
                                        ? nextById
                                        : undefined,
                                  };
                                });
                              }
                            }}
                            className={cn(
                              "w-full",
                              contactErrors?.[key] && INVALID_BORDER,
                            )}
                          />
                          <FieldError message={contactErrors?.[key]} />
                        </div>
                      ))}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
            <FieldError message={errors.contacts} />
          </section>

          <section className="mt-8 border-t border-[#00000014] pt-8">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold tracking-[0.06em] text-[#6B7180] uppercase">
                Documents
              </h3>
              <Button
                variant="dark"
                size="sm"
                aria-label="Upload File"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={14} strokeWidth={1.75} />
                Upload File
              </Button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const id = uid();
                  uploadedFilesRef.current.set(id, file);
                  setDocs((current) => [
                    ...current,
                    {
                      id,
                      name: file.name,
                      size: formatFileSize(file.size),
                      url: URL.createObjectURL(file),
                    },
                  ]);
                  event.target.value = "";
                }}
              />
            </div>
            {docs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#00000014] bg-[#FAFAF8] px-4 py-8 text-center text-[13px] text-[#8A8A8A]">
                <FileText size={22} className="text-[#C0C0BC]" />
                <span>No documents uploaded yet</span>
              </div>
            ) : (
              <div className="space-y-2">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-[8px] border border-[#00000014] px-3 py-2.5"
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
                        const stored = uploadedFilesRef.current.get(doc.id);
                        if (doc.url && !stored) {
                          const link = document.createElement("a");
                          link.href = doc.url;
                          link.download = doc.name;
                          link.target = "_blank";
                          link.rel = "noopener noreferrer";
                          link.click();
                          return;
                        }
                        const blob = stored ?? new Blob([""], {
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
                      onClick={() => {
                        uploadedFilesRef.current.delete(doc.id);
                        if (doc.url?.startsWith("blob:")) {
                          URL.revokeObjectURL(doc.url);
                        }
                        setDocs((current) =>
                          current.filter((entry) => entry.id !== doc.id),
                        );
                      }}
                      className="text-[#B0B0B0] hover:text-[#E25B5B]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8 border-t border-[#00000014] pt-8">
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#6B7180] uppercase">
              Notes
            </h3>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Write your notes here..."
              rows={4}
              className="w-full resize-none rounded-[8px] border border-[#00000014] px-3 py-2.5 text-[13px] text-[#111118] outline-none placeholder:text-[#A9A9A9]"
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
              Remove Distributor
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="dark" onClick={handleSave}>
              Save Distributor
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

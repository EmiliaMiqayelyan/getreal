"use client";

import { useId, useRef, useState, type FormEvent } from "react";

import { FileIcon, PlusIcon, UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Radio } from "@/components/ui/Checkbox";
import { DayPicker, type WeekDay } from "@/components/ui/DayPicker";
import { EmptyStateBox } from "@/components/ui/EmptyStateBox";
import { Input } from "@/components/ui/Input";
import { Label, SectionTitle } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

const PAYMENT_TERMS = ["NET-15", "NET-30", "NET-35"] as const;
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
const UNITS = ["lb", "oz", "kg", "bunch", "gal", "case"] as const;

type ContactDraft = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

type ProductDraft = {
  id: string;
  source: string;
  category: string;
  product: string;
  price: string;
  unit: string;
};

type DocumentDraft = {
  id: string;
  name: string;
};

type AddDistributorModalProps = {
  open: boolean;
  onClose: () => void;
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AddDistributorModal({
  open,
  onClose,
}: AddDistributorModalProps) {
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryDays, setDeliveryDays] = useState<WeekDay[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<string>("NET-30");
  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [documents, setDocuments] = useState<DocumentDraft[]>([]);
  const [notes, setNotes] = useState("");
  const [products, setProducts] = useState<ProductDraft[]>([]);

  const [sourceName, setSourceName] = useState("");
  const [category, setCategory] = useState("");
  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");

  function resetForm() {
    setName("");
    setAddress("");
    setDeliveryDays([]);
    setPaymentTerms("NET-30");
    setContacts([]);
    setDocuments([]);
    setNotes("");
    setProducts([]);
    setSourceName("");
    setCategory("");
    setProduct("");
    setPrice("");
    setUnit("");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function addContact() {
    setContacts((current) => [
      ...current,
      { id: createId(), name: "", phone: "", email: "" },
    ]);
  }

  function updateContact(
    id: string,
    field: keyof Omit<ContactDraft, "id">,
    value: string,
  ) {
    setContacts((current) =>
      current.map((contact) =>
        contact.id === id ? { ...contact, [field]: value } : contact,
      ),
    );
  }

  function addProductRow() {
    if (!sourceName && !category && !product && !price) return;

    setProducts((current) => [
      ...current,
      {
        id: createId(),
        source: sourceName,
        category,
        product,
        price,
        unit,
      },
    ]);
    setSourceName("");
    setCategory("");
    setProduct("");
    setPrice("");
    setUnit("");
  }

  function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    const next = Array.from(files).map((file) => ({
      id: createId(),
      name: file.name,
    }));
    setDocuments((current) => [...current, ...next]);
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    handleClose();
  }

  return (
    <Modal
      open={open}
      title="Add Distributor"
      onClose={handleClose}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="dark" type="submit" form={formId}>
            Save Supplier
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSave} className="space-y-6">
        <section>
          <SectionTitle>Company Information</SectionTitle>
          <div className="space-y-3">
            <div>
              <Label htmlFor={`${formId}-name`}>Distributor Name</Label>
              <Input
                id={`${formId}-name`}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={`${formId}-address`}>Full Address</Label>
              <Input
                id={`${formId}-address`}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
            </div>
            <div>
              <Label>Delivery Days & Times</Label>
              <DayPicker value={deliveryDays} onChange={setDeliveryDays} />
            </div>
          </div>
        </section>

        <section className="border-border/70 border-t pt-5">
          <SectionTitle>Payment Terms</SectionTitle>
          <div className="flex flex-wrap gap-5">
            {PAYMENT_TERMS.map((term) => (
              <Radio
                key={term}
                id={`${formId}-${term}`}
                name={`${formId}-payment`}
                label={term}
                value={term}
                checked={paymentTerms === term}
                onChange={() => setPaymentTerms(term)}
              />
            ))}
          </div>
        </section>

        <section className="border-border/70 border-t pt-5">
          <SectionTitle
            action={
              <button
                type="button"
                onClick={addContact}
                aria-label="Add contact"
                className="bg-foreground inline-flex size-6 items-center justify-center rounded-full text-white transition-opacity hover:opacity-90"
              >
                <PlusIcon className="size-3.5" />
              </button>
            }
          >
            Distributor Information
          </SectionTitle>

          {contacts.length === 0 ? (
            <EmptyStateBox>
              No contacts yet. Click + to add a supplier contact.
            </EmptyStateBox>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact, index) => (
                <div
                  key={contact.id}
                  className="border-border/80 grid gap-3 rounded-xl border p-3 sm:grid-cols-3"
                >
                  <Input
                    value={contact.name}
                    onChange={(event) =>
                      updateContact(contact.id, "name", event.target.value)
                    }
                    placeholder={`Contact ${index + 1} name`}
                    aria-label={`Contact ${index + 1} name`}
                  />
                  <Input
                    value={contact.phone}
                    onChange={(event) =>
                      updateContact(contact.id, "phone", event.target.value)
                    }
                    placeholder="Phone"
                    aria-label={`Contact ${index + 1} phone`}
                  />
                  <Input
                    value={contact.email}
                    onChange={(event) =>
                      updateContact(contact.id, "email", event.target.value)
                    }
                    placeholder="Email"
                    aria-label={`Contact ${index + 1} email`}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="border-border/70 border-t pt-5">
          <SectionTitle
            action={
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(event) => {
                    handleUpload(event.target.files);
                    event.target.value = "";
                  }}
                />
                <Button
                  variant="dark"
                  className="h-8 gap-1.5 px-3 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadIcon className="size-3.5" />
                  Upload File
                </Button>
              </>
            }
          >
            Documents
          </SectionTitle>

          {documents.length === 0 ? (
            <EmptyStateBox className="flex-col gap-2">
              <FileIcon className="text-muted" />
              <span>No documents uploaded yet</span>
            </EmptyStateBox>
          ) : (
            <ul className="border-border/80 space-y-2 rounded-xl border p-3">
              {documents.map((document) => (
                <li
                  key={document.id}
                  className="text-foreground flex items-center gap-2 text-sm"
                >
                  <FileIcon className="text-muted" />
                  {document.name}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border-border/70 border-t pt-5">
          <SectionTitle>Products & Pricing</SectionTitle>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[120px] flex-1">
              <Input
                value={sourceName}
                onChange={(event) => setSourceName(event.target.value)}
                placeholder="Source name"
                aria-label="Source name"
              />
            </div>
            <Select
              value={category}
              onChange={setCategory}
              className="w-[140px]"
              aria-label="Select category"
              placeholder="Select Category"
              options={[
                { value: "", label: "Select Category", disabled: true },
                ...CATEGORIES.map((item) => ({
                  value: item,
                  label: item,
                })),
              ]}
            />
            <Select
              value={product}
              onChange={setProduct}
              className="w-[120px]"
              aria-label="Select product"
              placeholder="Product"
              options={[
                { value: "", label: "Product", disabled: true },
                ...PRODUCTS.map((item) => ({
                  value: item,
                  label: item,
                })),
              ]}
            />
            <div className="relative w-[72px]">
              <span className="text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                $
              </span>
              <Input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="pl-6"
                inputMode="decimal"
                aria-label="Price"
              />
            </div>
            <Select
              value={unit}
              onChange={setUnit}
              className="w-[84px]"
              aria-label="Unit"
              placeholder="Unit"
              options={[
                { value: "", label: "Unit", disabled: true },
                ...UNITS.map((item) => ({
                  value: item,
                  label: item,
                })),
              ]}
            />
            <Button
              variant="icon"
              className="size-10 shrink-0"
              onClick={addProductRow}
              aria-label="Add product"
            >
              <PlusIcon className="size-4" />
            </Button>
          </div>

          {products.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {products.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-[#f7f8fa] px-3 py-2 text-sm"
                >
                  <span className="text-foreground font-semibold">
                    {item.product || "Untitled"}
                  </span>
                  <span className="text-muted">{item.source}</span>
                  <span className="text-foreground font-semibold">
                    {item.price ? `$${item.price}` : "—"}
                    {item.unit ? ` / ${item.unit}` : ""}
                  </span>
                  {item.category ? (
                    <span className="text-muted">{item.category}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="border-border/70 border-t pt-5">
          <SectionTitle>Notes</SectionTitle>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Write your notes here..."
            aria-label="Notes"
          />
        </section>
      </form>
    </Modal>
  );
}

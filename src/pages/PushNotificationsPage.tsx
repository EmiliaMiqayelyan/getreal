import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";

import { Header } from "@/components/layout/AdminHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { SEARCH_ICON, SEARCH_INPUT, TABLE_HEADER } from "@/constants/table";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/utils/cn";

const LINK_BLUE = "#3B82F6";

type PushNotification = {
  id: string;
  trigger: string;
  scheduledFor: string;
  subject: string;
  body: string;
};

const TRIGGER_OPTIONS = [
  "Order Confirmation",
  "Delivery Alert",
  "Order Locked",
  "Cooler Ready",
  "Payment Reminder",
];

const SCHEDULE_OPTIONS = [
  "After Order Confirmed",
  "1 day before order lock",
  "3 hrs after order arrived",
  "On delivery day morning",
  "When cooler is ready",
];

/** Temporary seed - one notification sample until Push API is wired. */
const INITIAL: PushNotification[] = [
  {
    id: "PN-001",
    trigger: "Order Confirmation",
    scheduledFor: "After Order Confirmed",
    subject: "Your Rachel's Habit Box is Scheduled!",
    body: "Your order for [Date] is confirmed. We'll deliver to [Address] during [Time Window].",
  },
];

type Draft = {
  id?: string;
  trigger: string;
  scheduledFor: string;
  subject: string;
  body: string;
};

function emptyDraft(): Draft {
  return {
    trigger: "",
    scheduledFor: "",
    subject: "",
    body: "",
  };
}

function nextId(items: PushNotification[]) {
  const max = items.reduce((acc, item) => {
    const n = Number(item.id.replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return `PN-${String(max + 1).padStart(3, "0")}`;
}

export default function PushNotificationsPage() {
  useDocumentTitle("Push Notifications");

  const [items, setItems] = useState(INITIAL);
  const [query, setQuery] = useState("");
  const [triggerFilter, setTriggerFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  useScrollLock(modalOpen);

  const triggers = useMemo(
    () => Array.from(new Set(items.map((item) => item.trigger))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery =
        !q ||
        item.id.toLowerCase().includes(q) ||
        item.trigger.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q);
      const matchesTrigger = !triggerFilter || item.trigger === triggerFilter;
      return matchesQuery && matchesTrigger;
    });
  }, [items, query, triggerFilter]);

  function openCreate() {
    setDraft(emptyDraft());
    setModalOpen(true);
  }

  function openEdit(item: PushNotification) {
    setDraft({
      id: item.id,
      trigger: item.trigger,
      scheduledFor: item.scheduledFor,
      subject: item.subject,
      body: item.body,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setDraft(emptyDraft());
  }

  function removeNotification() {
    if (!draft.id) return;
    setItems((current) => current.filter((item) => item.id !== draft.id));
    closeModal();
  }

  function save() {
    if (!draft.trigger || !draft.scheduledFor || !draft.subject.trim()) return;

    if (draft.id) {
      setItems((current) =>
        current.map((item) =>
          item.id === draft.id
            ? {
                ...item,
                trigger: draft.trigger,
                scheduledFor: draft.scheduledFor,
                subject: draft.subject.trim(),
                body: draft.body.trim(),
              }
            : item,
        ),
      );
    } else {
      setItems((current) => [
        {
          id: nextId(current),
          trigger: draft.trigger,
          scheduledFor: draft.scheduledFor,
          subject: draft.subject.trim(),
          body: draft.body.trim(),
        },
        ...current,
      ]);
    }
    closeModal();
  }

  const canSave =
    Boolean(draft.trigger) &&
    Boolean(draft.scheduledFor) &&
    Boolean(draft.subject.trim());

  const th = cn("px-0 py-3 text-left", TABLE_HEADER);
  const td = "px-0 py-[18px] align-middle text-[13px] leading-5 text-[#111118]";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <Header
        title="Push Notifications"
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <div className="relative w-full sm:w-[220px]">
              <Search size={14} className={SEARCH_ICON} />
              <Input
                inputSize="md"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search ID, name"
                className={SEARCH_INPUT}
              />
            </div>

            <Select
              value={triggerFilter}
              onChange={setTriggerFilter}
              aria-label="All Triggers"
              className="w-[160px]"
              options={[
                { value: "", label: "All Triggers" },
                ...triggers.map((trigger) => ({
                  value: trigger,
                  label: trigger,
                })),
              ]}
            />

            <Button
              variant="primary"
              onClick={openCreate}
              className="ml-auto"
            >
              <Plus size={14} />
              Add Push Notification
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto px-4 py-5 md:px-7">
        <ScrollTable minWidth={1100} className="rounded-[10px]">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col style={{ width: "84px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "168px" }} />
              <col style={{ width: "200px" }} />
              <col style={{ width: "280px" }} />
              <col />
              <col style={{ width: "64px" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-[#ECECEA] bg-[#FAFAF8]">
                <th className={cn(th, "pl-5 pr-3")}>ID</th>
                <th className={cn(th, "pr-3")}>Data Trigger</th>
                <th className={cn(th, "pr-3")}>Scheduled For</th>
                <th className={cn(th, "pr-3")}>Header / Subject Line</th>
                <th className={cn(th, "pr-4")}>Content Body</th>
                <th aria-hidden className="p-0" />
                <th className={cn(th, "pr-5")} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[#ECECEA] last:border-b-0"
                >
                  <td className={cn(td, "pl-5 pr-3")}>
                    <span className="inline-flex rounded-[6px] bg-id-pill px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#6B6B6B]">
                      {item.id}
                    </span>
                  </td>
                  <td className={cn(td, "pr-3 font-semibold")}>{item.trigger}</td>
                  <td className={cn(td, "pr-3")}>{item.scheduledFor}</td>
                  <td className={cn(td, "pr-3")}>
                    <span className="block truncate">{item.subject}</span>
                  </td>
                  <td className={cn(td, "pr-4")}>
                    <span className="block w-[280px] max-w-[280px] text-[13px] leading-5 text-[#111118]">
                      {item.body}
                    </span>
                  </td>
                  <td aria-hidden className="p-0" />
                  <td className={cn(td, "pr-5 text-right")}>
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="whitespace-nowrap text-[13px] font-medium"
                      style={{ color: LINK_BLUE }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-[13px] text-[#8A8A8A]"
                  >
                    No push notifications found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </ScrollTable>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-none p-6 sm:items-center">
          <button
            type="button"
            aria-label="Close dialog overlay"
            className="absolute inset-0 bg-[#333333]/55"
            onClick={closeModal}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pn-modal-title"
            className="relative z-10 flex w-full max-w-[480px] flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.18)]"
          >
            <div className="flex items-center justify-between border-b border-[#ECECEA] px-6 pt-5 pb-3">
              <h2
                id="pn-modal-title"
                className="text-[18px] font-semibold tracking-tight text-[#111118]"
              >
                {draft.id ? "Edit Push Notification" : "Create Push Notification"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="rounded-md p-1 text-[#8A8A8A] transition-colors hover:bg-[#F5F5F3] hover:text-[#111118]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-6 pt-5 pb-5">
              <div>
                <Label className="mb-1.5 text-[11px] font-semibold text-[#2E2E2E]">
                  Data Trigger
                </Label>
                <Select
                  value={draft.trigger}
                  onChange={(value) =>
                    setDraft((current) => ({ ...current, trigger: value }))
                  }
                  placeholder="Select"
                  aria-label="Data Trigger"
                  options={[
                    { value: "", label: "Select", disabled: true },
                    ...TRIGGER_OPTIONS.map((option) => ({
                      value: option,
                      label: option,
                    })),
                  ]}
                  size="md"
                />
              </div>

              <div>
                <Label className="mb-1.5 text-[11px] font-semibold text-[#2E2E2E]">
                  Scheduled for
                </Label>
                <Select
                  value={draft.scheduledFor}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      scheduledFor: value,
                    }))
                  }
                  placeholder="Select time and case"
                  aria-label="Scheduled for"
                  options={[
                    {
                      value: "",
                      label: "Select time and case",
                      disabled: true,
                    },
                    ...SCHEDULE_OPTIONS.map((option) => ({
                      value: option,
                      label: option,
                    })),
                  ]}
                  size="md"
                />
              </div>

              <div>
                <Label className="mb-1.5 text-[11px] font-semibold text-[#2E2E2E]">
                  Header / Subject Line
                </Label>
                <Input
                  value={draft.subject}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      subject: event.target.value,
                    }))
                  }
                  className="w-full"
                />
              </div>

              <div>
                <Label className="mb-1.5 text-[11px] font-semibold text-[#2E2E2E]">
                  Content Body
                </Label>
                <Textarea
                  value={draft.body}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      body: event.target.value,
                    }))
                  }
                  rows={4}
                  className="min-h-[110px] rounded-[8px] border-[#E6E6E3] text-[13px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-[#ECECEA] px-6 py-4">
              {draft.id ? (
                <Button variant="dangerGhost" onClick={removeNotification}>
                  Remove Notification
                </Button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={closeModal}>
                  Cancel
                </Button>
                <Button variant="dark" disabled={!canSave} onClick={save}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

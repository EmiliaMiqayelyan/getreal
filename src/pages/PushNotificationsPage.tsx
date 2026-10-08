import { useCallback, useEffect, useMemo, useState } from "react";

import { InfiniteScrollSentinel } from "@/components/ui/InfiniteScrollSentinel";
import { Plus } from "lucide-react";

import { Header } from "@/components/layout/AdminHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { IdPill } from "@/components/ui/Badge";
import { AppLoader } from "@/components/ui/AppLoader";
import { Modal } from "@/components/ui/Modal";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { PINNED_HEADER, TABLE_HEADER } from "@/constants/table";
import { useApiFeedback } from "@/hooks/useApiFeedback";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLazyWindow } from "@/hooks/useLazyWindow";
import {
  isApiConfigured,
  mapApiNotificationRule,
  notificationRulesApi,
} from "@/lib/api";
import type { NotificationRulePayload } from "@/lib/api/notifications";
import type { PushNotification } from "@/types/notification";
import { cn } from "@/utils/cn";
import { recordRef } from "@/utils/entityIds";

const LINK_BLUE = "#3B82F6";

const NOTIFICATION_COLUMNS =
  "grid grid-cols-[260px_minmax(0,1.1fr)_minmax(0,0.75fr)_minmax(0,1fr)_minmax(0,1.4fr)_48px] items-center gap-x-4";

const METHOD_OPTIONS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const UNIT_OPTIONS = [
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
];

type Draft = {
  id?: string;
  recordId?: string;
  action: string;
  httpMethod: string;
  scheduleDelay: string;
  scheduleUnit: string;
  subject: string;
  body: string;
};

function emptyDraft(): Draft {
  return {
    action: "",
    httpMethod: "",
    scheduleDelay: "0",
    scheduleUnit: "minutes",
    subject: "",
    body: "",
  };
}

function triggerLabel(httpMethod: string, action: string): string {
  return [httpMethod, action].filter(Boolean).join(" ");
}

function formatSchedule(delay: number, unit: string): string {
  const label = unit.trim() || "minutes";
  return `${delay} ${label}`;
}

function withCurrent(
  options: { value: string; label: string }[],
  current: string,
) {
  if (!current || options.some((option) => option.value === current)) {
    return options;
  }
  return [{ value: current, label: current }, ...options];
}

/** The server matches rules on `${baseUrl}${route.path}` with no trailing slash. */
function normalizeAction(action: string): string {
  const trimmed = action.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function toPayload(draft: Draft): NotificationRulePayload | null {
  const scheduleDelay = Number(draft.scheduleDelay);
  if (!Number.isInteger(scheduleDelay) || scheduleDelay < 0) return null;
  return {
    action: normalizeAction(draft.action),
    httpMethod: draft.httpMethod,
    title: draft.subject.trim(),
    subtext: draft.body.trim(),
    scheduleDelay,
    scheduleUnit: draft.scheduleUnit,
  };
}

export default function PushNotificationsPage() {
  useDocumentTitle("Push Notifications");

  const apiConfigured = isApiConfigured();
  const { notifyApiError, showSuccess } = useApiFeedback();
  const [items, setItems] = useState<PushNotification[]>([]);
  const [loading, setLoading] = useState(apiConfigured);
  const [pending, setPending] = useState<null | "save" | "remove">(null);
  const [query, setQuery] = useState("");
  const [triggerFilter, setTriggerFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const loadRules = useCallback(() => {
    if (!apiConfigured) {
      setItems([]);
      setLoading(false);
      return () => undefined;
    }

    let cancelled = false;
    setLoading(true);
    void notificationRulesApi
      .list({ fresh: true })
      .then((rules) => {
        if (cancelled) return;
        setItems(rules.map(mapApiNotificationRule));
      })
      .catch((error) => {
        if (cancelled) return;
        notifyApiError(error, "Failed to load notifications.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiConfigured, notifyApiError]);

  useEffect(() => loadRules(), [loadRules]);

  const triggers = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => triggerLabel(item.httpMethod, item.action))),
      )
        .filter(Boolean)
        .sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery =
        !q ||
        item.id.toLowerCase().includes(q) ||
        triggerLabel(item.httpMethod, item.action).toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q);
      const matchesTrigger =
        !triggerFilter ||
        triggerLabel(item.httpMethod, item.action) === triggerFilter;
      return matchesQuery && matchesTrigger;
    });
  }, [items, query, triggerFilter]);

  const listWindow = useLazyWindow(filtered, `${query}|${triggerFilter}`);

  function openCreate() {
    setDraft(emptyDraft());
    setModalOpen(true);
  }

  function openEdit(item: PushNotification) {
    setDraft({
      id: item.id,
      recordId: item.recordId,
      action: item.action,
      httpMethod: item.httpMethod,
      scheduleDelay: String(item.scheduleDelay),
      scheduleUnit: item.scheduleUnit,
      subject: item.title,
      body: item.body,
    });
    setModalOpen(true);
    const pathId = recordRef(item);
    if (!isApiConfigured() || !pathId) return;
    void notificationRulesApi
      .getById(pathId)
      .then((remote) => {
        const mapped = mapApiNotificationRule(remote, 0);
        setDraft((current) =>
          current.recordId === item.recordId
            ? {
                ...current,
                action: mapped.action,
                httpMethod: mapped.httpMethod,
                scheduleDelay: String(mapped.scheduleDelay),
                scheduleUnit: mapped.scheduleUnit,
                subject: mapped.title,
                body: mapped.body,
              }
            : current,
        );
      })
      .catch((error) => {
        notifyApiError(error, "Failed to load notification details.");
      });
  }

  function closeModal() {
    if (pending) return;
    setModalOpen(false);
    setDraft(emptyDraft());
  }

  const payload = toPayload(draft);
  const canSave = Boolean(
    payload &&
      payload.action &&
      payload.httpMethod &&
      payload.title &&
      payload.subtext &&
      payload.scheduleUnit,
  );

  async function refreshRules() {
    const rules = await notificationRulesApi.list({ fresh: true });
    setItems(rules.map(mapApiNotificationRule));
  }

  async function removeNotification() {
    if (!draft.id || pending) return;
    setPending("remove");
    try {
      const pathId = recordRef({
        id: draft.id,
        recordId: draft.recordId,
      });
      if (!pathId) {
        throw new Error(
          "This notification is not linked to a server record.",
        );
      }
      await notificationRulesApi.remove(pathId);
      showSuccess("Notification removed.");
      setModalOpen(false);
      setDraft(emptyDraft());
      try {
        await refreshRules();
      } catch (error) {
        notifyApiError(error, "Failed to refresh notifications.");
      }
    } catch (error) {
      notifyApiError(error, "Failed to delete notification.");
    } finally {
      setPending(null);
    }
  }

  async function save() {
    if (!payload || !canSave || pending) return;
    setPending("save");
    try {
      if (draft.id) {
        const pathId = recordRef({
          id: draft.id ?? "",
          recordId: draft.recordId,
        });
        if (!pathId) {
          throw new Error(
            "This notification is not linked to a server record.",
          );
        }
        await notificationRulesApi.update(pathId, payload);
        showSuccess("Notification updated.");
      } else {
        await notificationRulesApi.create(payload);
        showSuccess("Notification created.");
      }
      setModalOpen(false);
      setDraft(emptyDraft());
      try {
        await refreshRules();
      } catch (error) {
        notifyApiError(error, "Failed to refresh notifications.");
      }
    } catch (error) {
      notifyApiError(
        error,
        draft.id
          ? "Failed to update notification."
          : "Failed to create notification.",
      );
    } finally {
      setPending(null);
    }
  }

  const unitOptions = withCurrent(UNIT_OPTIONS, draft.scheduleUnit);
  const methodOptions = withCurrent(
    METHOD_OPTIONS.map((method) => ({ value: method, label: method })),
    draft.httpMethod,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
      <Header
        title="Push Notifications"
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <SearchField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
            />

            <Select
              value={triggerFilter}
              onChange={setTriggerFilter}
              aria-label="All Triggers"
              className="w-[220px]"
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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA] px-4 py-5 md:px-7 md:py-5">
        {loading ? (
          <AppLoader variant="table" label="Loading notifications" />
        ) : (
          <ScrollTable fill minWidth={1280}>
            <div
              className={cn(
                NOTIFICATION_COLUMNS,
                TABLE_HEADER,
                PINNED_HEADER,
                "h-10 border-b border-[#00000014] px-4",
              )}
            >
              <div>ID</div>
              <div>Data Trigger</div>
              <div>Scheduled For</div>
              <div>Header / Subject Line</div>
              <div>Content Body</div>
              <div aria-hidden />
            </div>
            {listWindow.visible.map((item, index) => {
              const isLast = index === listWindow.visible.length - 1;
              return (
                <div
                  key={item.recordId ?? item.id}
                  className={cn(
                    NOTIFICATION_COLUMNS,
                    "px-4 py-3.5",
                    !isLast && "border-b border-[#00000014]",
                  )}
                >
                  <div className="min-w-0 overflow-hidden">
                    <IdPill>{item.id}</IdPill>
                  </div>
                  <div className="min-w-0 truncate text-[13px] font-semibold text-[#111118]">
                    {triggerLabel(item.httpMethod, item.action)}
                  </div>
                  <div className="min-w-0 truncate text-[13px] text-[#111118]">
                    {formatSchedule(item.scheduleDelay, item.scheduleUnit)}
                  </div>
                  <div className="min-w-0 truncate text-[13px] text-[#111118]">
                    {item.title}
                  </div>
                  <div className="min-w-0 truncate text-[13px] leading-5 text-[#111118]">
                    {item.body}
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="justify-self-end text-[13px] font-medium whitespace-nowrap"
                    style={{ color: LINK_BLUE }}
                  >
                    Edit
                  </button>
                </div>
              );
            })}
            {!filtered.length ? (
              <div className="px-4 py-12 text-center text-[13px] text-[#8A8A8A]">
                No push notifications found
              </div>
            ) : null}
            <InfiniteScrollSentinel
              hasMore={listWindow.hasMore}
              loadedCount={listWindow.loadedCount}
              onLoadMore={listWindow.loadMore}
            />
          </ScrollTable>
        )}
      </div>

      <Modal
        open={modalOpen}
        title={
          draft.id ? "Edit Push Notification" : "Create Push Notification"
        }
        onClose={closeModal}
        size="md"
        footer={
          <div className="flex w-full items-center justify-between gap-4">
            {draft.id ? (
              <Button
                variant="dangerGhost"
                onClick={() => void removeNotification()}
                disabled={pending !== null}
              >
                {pending === "remove" ? "Removing..." : "Remove Notification"}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={closeModal}
                disabled={pending !== null}
              >
                Cancel
              </Button>
              <Button
                variant="dark"
                disabled={!canSave || pending !== null}
                onClick={() => void save()}
              >
                {pending === "save" ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3">
            <div>
              <Label required>Trigger Method</Label>
              <Select
                value={draft.httpMethod}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    httpMethod: value,
                  }))
                }
                placeholder="Select"
                aria-label="Trigger Method"
                options={[
                  { value: "", label: "Select", disabled: true },
                  ...methodOptions,
                ]}
                size="md"
              />
            </div>
            <div>
              <Label required>Data Trigger</Label>
              <Input
                value={draft.action}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    action: event.target.value,
                  }))
                }
                placeholder="/api/v1/orders/:id/ready"
                aria-label="Data Trigger"
                className="w-full"
              />
            </div>
          </div>

          <div>
            <Label required>Scheduled for</Label>
            <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
              <Input
                type="number"
                min={0}
                step={1}
                value={draft.scheduleDelay}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    scheduleDelay: event.target.value,
                  }))
                }
                aria-label="Schedule delay"
                className="w-full"
              />
              <Select
                value={draft.scheduleUnit}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    scheduleUnit: value,
                  }))
                }
                aria-label="Schedule unit"
                options={unitOptions}
                size="md"
              />
            </div>
          </div>

          <div>
            <Label required>Header / Subject Line</Label>
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
            <Label required>Content Body</Label>
            <Textarea
              value={draft.body}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  body: event.target.value,
                }))
              }
              rows={4}
              className="min-h-[110px] rounded-[8px] border-[#00000014] text-[13px]"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

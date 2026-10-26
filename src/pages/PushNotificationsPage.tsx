import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { InfiniteScrollSentinel } from "@/components/ui/InfiniteScrollSentinel";
import { Box, ChevronDown, Plus } from "lucide-react";

import { Header } from "@/components/layout/AdminHeader";
import { Button, ButtonSpinner } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IdPill } from "@/components/ui/Badge";
import { AppLoader } from "@/components/ui/AppLoader";
import { Modal } from "@/components/ui/Modal";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { SearchField } from "@/components/ui/SearchField";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { PINNED_HEADER, TABLE_HEADER } from "@/constants/table";
import { useApiFeedback } from "@/hooks/useApiFeedback";
import { useFloatingMenu } from "@/hooks/useFloatingMenu";
import { useRolesUsers } from "@/context/RolesUsersContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLazyWindow } from "@/hooks/useLazyWindow";
import {
  isApiConfigured,
  mapApiNotificationRule,
  notificationRulesApi,
} from "@/lib/api";
import type {
  ApiNotificationIcon,
  ApiNotificationTrigger,
  NotificationRulePayload,
  NotificationScheduleUnit,
} from "@/lib/api/notifications";
import type { ApiNotificationRule } from "@/lib/api/types";
import type { PushNotification } from "@/types/notification";
import { cn } from "@/utils/cn";
import { recordRef } from "@/utils/entityIds";
import { floatingMenuStyle } from "@/utils/floatingMenu";

const LINK_BLUE = "#3B82F6";

const NOTIFICATION_COLUMNS =
  "grid grid-cols-[132px_minmax(160px,0.95fr)_120px_minmax(180px,1.15fr)_minmax(240px,1.7fr)_48px] items-center gap-x-4";

const PERIOD_UNIT: Record<string, string> = {
  second: "sec",
  seconds: "sec",
  minute: "min",
  minutes: "min",
  hour: "hr",
  hours: "hr",
  day: "day",
  days: "day",
  week: "wk",
  weeks: "wk",
};

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

const FIELD_LABEL = "mb-2 block text-[13px] font-medium text-[#111118]";
const FIELD_HINT = "mt-1 text-right text-[12px] text-[#8A8A8A]";

type DraftPeriod = "" | "before" | "after";

type Draft = {
  id?: string;
  recordId?: string;
  triggerKey: string;
  period: DraftPeriod;
  days: string;
  hours: string;
  minutes: string;
  header: string;
  description: string;
  iconUrl: string;
  action: string;
  httpMethod: string;
};

function emptyDraft(): Draft {
  return {
    triggerKey: "",
    period: "",
    days: "",
    hours: "",
    minutes: "",
    header: "",
    description: "",
    iconUrl: "",
    action: "",
    httpMethod: "",
  };
}

function dataTriggerLabel(item: PushNotification): string {
  const named = item.trigger.trim();
  if (named) return named;
  return [item.httpMethod, item.action].filter(Boolean).join(" ");
}

function formatDuration(delay: number, unit: string): string {
  if (unit === "minutes" && delay >= MINUTES_PER_HOUR) {
    const days = Math.floor(delay / MINUTES_PER_DAY);
    const hours = Math.floor((delay % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
    const minutes = delay % MINUTES_PER_HOUR;
    return [
      days ? `${days}day` : "",
      hours ? `${hours}hr` : "",
      minutes ? `${minutes}min` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }
  const normalized = unit.trim().toLowerCase();
  const abbr = PERIOD_UNIT[normalized] ?? (normalized || "min");
  return `${delay}${abbr}`;
}

/** "Before 1min". Immediate rules (no delay) leave the period blank. */
function formatPeriod(timing: string, delay: number, unit: string): string {
  if (!Number.isFinite(delay) || delay <= 0) return "";
  const when =
    timing === "before" ? "Before" : timing === "after" ? "After" : "";
  const body = formatDuration(delay, unit);
  return when ? `${when} ${body}` : body;
}

function positiveInt(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return 0;
  return parsed;
}

function toTotalMinutes(delay: number, unit: string): number {
  const amount = Number.isFinite(delay) && delay > 0 ? Math.floor(delay) : 0;
  switch (unit) {
    case "weeks":
      return amount * 7 * MINUTES_PER_DAY;
    case "days":
      return amount * MINUTES_PER_DAY;
    case "hours":
      return amount * MINUTES_PER_HOUR;
    case "seconds":
      return Math.round(amount / 60);
    default:
      return amount;
  }
}

function splitSchedule(delay: number, unit: string) {
  const total = toTotalMinutes(delay, unit);
  if (!total) return { days: "", hours: "", minutes: "" };
  const days = Math.floor(total / MINUTES_PER_DAY);
  const hours = Math.floor((total % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
  const minutes = total % MINUTES_PER_HOUR;
  return {
    days: days ? String(days) : "",
    hours: hours ? String(hours) : "",
    minutes: minutes ? String(minutes) : "",
  };
}

function scheduleFromParts(
  days: string,
  hours: string,
  minutes: string,
): { scheduleDelay: number; scheduleUnit: NotificationScheduleUnit } {
  const dayCount = positiveInt(days);
  const hourCount = positiveInt(hours);
  const minuteCount = positiveInt(minutes);
  if (dayCount && !hourCount && !minuteCount) {
    return { scheduleDelay: dayCount, scheduleUnit: "days" };
  }
  if (hourCount && !dayCount && !minuteCount) {
    return { scheduleDelay: hourCount, scheduleUnit: "hours" };
  }
  if (!dayCount && !hourCount) {
    return { scheduleDelay: minuteCount, scheduleUnit: "minutes" };
  }
  return {
    scheduleDelay:
      dayCount * MINUTES_PER_DAY +
      hourCount * MINUTES_PER_HOUR +
      minuteCount,
    scheduleUnit: "minutes",
  };
}

function selectedPeriod(timing: string, delay: number): DraftPeriod {
  if (timing === "before") return "before";
  if (timing === "after" && delay > 0) return "after";
  return "";
}

function matchTrigger(
  triggers: ApiNotificationTrigger[],
  value: string,
): ApiNotificationTrigger | undefined {
  const needle = value.trim().toLowerCase();
  if (!needle) return undefined;
  return triggers.find(
    (trigger) =>
      trigger.key.toLowerCase() === needle ||
      trigger.name.toLowerCase() === needle,
  );
}

function draftFromNotification(
  item: PushNotification,
  triggers: ApiNotificationTrigger[],
): Draft {
  const parts = splitSchedule(item.scheduleDelay, item.scheduleUnit);
  const match = matchTrigger(triggers, item.trigger);
  return {
    id: item.id,
    recordId: item.recordId,
    triggerKey: match?.key || item.trigger,
    period: selectedPeriod(item.timing, item.scheduleDelay),
    days: parts.days,
    hours: parts.hours,
    minutes: parts.minutes,
    header: item.title,
    description: item.body,
    iconUrl: item.iconUrl,
    action: item.action,
    httpMethod: item.httpMethod,
  };
}

/** The icons endpoint owns the real address. Send that URL, never a file name. */
function resolveIconUrl(
  value: string,
  icons: ApiNotificationIcon[],
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const byUrl = icons.find((icon) => icon.url === trimmed);
  if (byUrl) return byUrl.url;
  const bare = decodeURIComponent(trimmed.split("/").pop() ?? trimmed).replace(
    /\.svg$/i,
    "",
  );
  const byId = icons.find((icon) => icon.id === trimmed || icon.id === bare);
  if (byId) return byId.url;
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function toPayload(
  draft: Draft,
  triggers: ApiNotificationTrigger[],
  icons: ApiNotificationIcon[],
): NotificationRulePayload | null {
  const title = draft.header.trim();
  const subtext = draft.description.trim();
  const match = matchTrigger(triggers, draft.triggerKey);
  const trigger = match?.name || draft.triggerKey.trim();
  if (!trigger || !title || !subtext) return null;
  const schedule = scheduleFromParts(draft.days, draft.hours, draft.minutes);
  const timing = draft.period === "before" ? "before" : "after";
  return {
    title,
    subtext,
    trigger,
    timing,
    scheduleDelay: schedule.scheduleDelay,
    scheduleUnit: schedule.scheduleUnit,
    iconUrl: resolveIconUrl(draft.iconUrl, icons),
    ...(!match && draft.action
      ? { action: draft.action, httpMethod: draft.httpMethod || "POST" }
      : {}),
  };
}

function countOptions(max: number, current: string): SelectOption[] {
  const values = Array.from({ length: max }, (_, index) => String(index + 1));
  if (current && !values.includes(current) && positiveInt(current) > 0) {
    values.push(current);
    values.sort((left, right) => Number(left) - Number(right));
  }
  return [
    { value: "", label: "Select" },
    ...values.map((value) => ({ value, label: value })),
  ];
}

function IconPicker({
  icons,
  value,
  onChange,
}: {
  icons: ApiNotificationIcon[];
  value: string;
  onChange: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const menuBox = useFloatingMenu(open, buttonRef, listRef, {
    minWidth: 260,
    maxHeight: 320,
  });
  const selected = icons.find((icon) => icon.url === value);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        listRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Select Icon"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-3"
      >
        <span
          className={cn(
            "flex size-11 items-center justify-center overflow-hidden",
            !selected && "rounded-full bg-[#E7F2FC]",
          )}
        >
          {selected ? (
            <img src={selected.url} alt="" className="size-11 object-contain" />
          ) : (
            <Box size={18} className="text-[#3B82F6]" strokeWidth={1.75} />
          )}
        </span>
        <span className="text-[14px] text-[#111118]">
          {selected?.name ?? "Select Icon"}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "text-[#111118] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open
        ? createPortal(
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label="Select Icon"
              data-scroll-lock-allow
              className="fixed z-[80] overflow-y-auto overscroll-contain rounded-[8px] border border-[#00000014] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
              style={floatingMenuStyle(menuBox)}
            >
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={!value}
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="flex h-9 w-full items-center px-3 text-left text-[13px] text-[#111118] hover:bg-[#F5F5F3]"
                >
                  Select Icon
                </button>
              </li>
              {icons.map((icon) => {
                const isSelected = icon.url === value;
                return (
                  <li key={icon.id || icon.url}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(icon.url);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex h-11 w-full items-center gap-2 px-3 text-left text-[13px]",
                        isSelected
                          ? "bg-[#28402B] text-white"
                          : "text-[#111118] hover:bg-[#F5F5F3]",
                      )}
                    >
                      <img
                        src={icon.url}
                        alt=""
                        className="size-8 shrink-0 object-contain"
                      />
                      <span className="truncate">{icon.name}</span>
                    </button>
                  </li>
                );
              })}
              {!icons.length ? (
                <li className="px-3 py-2 text-[13px] text-[#8A8A8A]">
                  No icons available
                </li>
              ) : null}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}

export default function PushNotificationsPage() {
  useDocumentTitle("Push Notifications");
  const { sessionPermissions } = useRolesUsers();
  const canCreateNotification = sessionPermissions.notificationsCreate;
  const canEditNotification = sessionPermissions.notificationsEdit;
  const canDeleteNotification = sessionPermissions.notificationsDelete;

  const apiConfigured = isApiConfigured();
  const { notifyApiError, showSuccess } = useApiFeedback();
  const [items, setItems] = useState<PushNotification[]>([]);
  const [triggerCatalog, setTriggerCatalog] = useState<ApiNotificationTrigger[]>(
    [],
  );
  const [iconCatalog, setIconCatalog] = useState<ApiNotificationIcon[]>([]);
  const [loading, setLoading] = useState(apiConfigured);
  const rulesLoadRef = useRef(0);
  const editRequestRef = useRef(0);
  const [pending, setPending] = useState<null | "save" | "remove">(null);
  const [query, setQuery] = useState("");
  const [triggerFilter, setTriggerFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const triggerCatalogRef = useRef(triggerCatalog);
  triggerCatalogRef.current = triggerCatalog;

  const loadRules = useCallback(() => {
    if (!apiConfigured) {
      setItems([]);
      setLoading(false);
      return () => undefined;
    }

    const loadId = ++rulesLoadRef.current;
    let cancelled = false;
    setLoading(true);
    void notificationRulesApi
      .list({ fresh: true })
      .then((rules) => {
        if (cancelled || loadId !== rulesLoadRef.current) return;
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

  useEffect(() => {
    if (!apiConfigured) return;
    let cancelled = false;
    void Promise.all([
      notificationRulesApi.triggers(),
      notificationRulesApi.icons(),
    ])
      .then(([triggers, icons]) => {
        if (cancelled) return;
        setTriggerCatalog(triggers);
        setIconCatalog(icons);
      })
      .catch((error) => {
        if (cancelled) return;
        notifyApiError(error, "Failed to load notification options.");
      });
    return () => {
      cancelled = true;
    };
  }, [apiConfigured, notifyApiError]);

  useEffect(() => {
    if (!modalOpen || !triggerCatalog.length) return;
    setDraft((current) => {
      const match = matchTrigger(triggerCatalog, current.triggerKey);
      if (!match || match.key === current.triggerKey) return current;
      return { ...current, triggerKey: match.key };
    });
  }, [modalOpen, triggerCatalog]);

  const triggers = useMemo(
    () =>
      Array.from(new Set(items.map((item) => dataTriggerLabel(item))))
        .filter(Boolean)
        .sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const trigger = dataTriggerLabel(item);
      const matchesQuery =
        !q ||
        item.id.toLowerCase().includes(q) ||
        trigger.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q);
      const matchesTrigger = !triggerFilter || trigger === triggerFilter;
      return matchesQuery && matchesTrigger;
    });
  }, [items, query, triggerFilter]);

  const listWindow = useLazyWindow(filtered, `${query}|${triggerFilter}`);

  function openCreate() {
    setDraft(emptyDraft());
    setModalOpen(true);
  }

  function openEdit(item: PushNotification) {
    const requestId = ++editRequestRef.current;
    setDraft(draftFromNotification(item, triggerCatalog));
    setModalOpen(true);
    const pathId = recordRef(item);
    if (!isApiConfigured() || !pathId) return;
    void notificationRulesApi
      .getById(pathId)
      .then((remote) => {
        if (requestId !== editRequestRef.current) return;
        const mapped = mapApiNotificationRule(remote, 0);
        setDraft((current) =>
          current.recordId === item.recordId
            ? draftFromNotification(
                { ...mapped, id: item.id, recordId: item.recordId },
                triggerCatalogRef.current,
              )
            : current,
        );
      })
      .catch((error) => {
        if (requestId !== editRequestRef.current) return;
        notifyApiError(error, "Failed to load notification details.");
      });
  }

  function closeModal() {
    if (pending) return;
    setModalOpen(false);
    setDraft(emptyDraft());
  }

  const payload = useMemo(
    () => toPayload(draft, triggerCatalog, iconCatalog),
    [draft, triggerCatalog, iconCatalog],
  );
  const canSave = Boolean(payload);

  function storeSavedRule(
    saved: ApiNotificationRule,
    match?: { id?: string; recordId?: string },
  ) {
    const mapped = mapApiNotificationRule(saved, 0);
    setItems((current) => {
      const index = current.findIndex(
        (item) =>
          (match?.recordId && item.recordId === match.recordId) ||
          (match?.id && item.id === match.id) ||
          (mapped.recordId && item.recordId === mapped.recordId),
      );
      if (index === -1) return [mapped, ...current];
      const previous = current[index];
      const next = current.slice();
      next[index] = {
        ...mapped,
        id: previous.id || mapped.id,
        recordId: previous.recordId ?? mapped.recordId,
      };
      return next;
    });
  }

  async function refreshRules() {
    const loadId = ++rulesLoadRef.current;
    const rules = await notificationRulesApi.list({ fresh: true });
    if (loadId !== rulesLoadRef.current) return;
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
    editRequestRef.current += 1;
    if (!payload || !canSave || pending) return;
    setPending("save");
    try {
      let saved;
      if (draft.id) {
        const pathId = recordRef({
          id: draft.id,
          recordId: draft.recordId,
        });
        if (!pathId) {
          throw new Error(
            "This notification is not linked to a server record.",
          );
        }
        saved = await notificationRulesApi.update(pathId, payload);
      } else {
        saved = await notificationRulesApi.create(payload);
      }
      storeSavedRule(saved, { id: draft.id, recordId: draft.recordId });
      showSuccess(draft.id ? "Notification updated." : "Notification created.");
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

  function applyTrigger(triggerKey: string) {
    const trigger = matchTrigger(triggerCatalog, triggerKey);
    const icon = trigger
      ? iconCatalog.find((item) => item.id === trigger.defaultIconId)
      : undefined;
    const allowed = trigger?.allowedTimings ?? ["before", "after"];
    setDraft((current) => ({
      ...current,
      triggerKey,
      header: trigger?.defaultTitle || current.header,
      description: trigger?.defaultBody || current.description,
      iconUrl: icon?.url || current.iconUrl,
      action: trigger?.action || current.action,
      httpMethod: trigger?.httpMethod || current.httpMethod,
      period:
        current.period && allowed.includes(current.period)
          ? current.period
          : "",
    }));
  }

  const selectedTrigger = matchTrigger(triggerCatalog, draft.triggerKey);
  const allowedTimings = selectedTrigger?.allowedTimings ?? ["before", "after"];
  const periodOptions: SelectOption[] = [
    { value: "", label: "Select" },
    ...(allowedTimings.includes("before")
      ? [{ value: "before", label: "Before" }]
      : []),
    ...(allowedTimings.includes("after")
      ? [{ value: "after", label: "After" }]
      : []),
  ];
  const triggerOptions: SelectOption[] = [
    { value: "", label: "Select", disabled: true },
    ...triggerCatalog.map((trigger) => ({
      value: trigger.key,
      label: trigger.name,
    })),
    ...(draft.triggerKey &&
    !triggerCatalog.some((trigger) => trigger.key === draft.triggerKey)
      ? [{ value: draft.triggerKey, label: draft.triggerKey }]
      : []),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
      <Header
        title="Push Notifications"
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <SearchField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ID, name"
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

            {canCreateNotification ? (
              <Button
                variant="primary"
                onClick={openCreate}
                className="ml-auto"
              >
                <Plus size={14} />
                Add Push Notification
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA] px-4 py-5 md:px-7 md:py-5">
        {loading ? (
          <AppLoader variant="table" label="Loading notifications" />
        ) : (
          <ScrollTable fill minWidth={1100}>
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
              <div>Period</div>
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
                  <div className="min-w-0 truncate text-[13px] text-[#111118]">
                    {dataTriggerLabel(item)}
                  </div>
                  <div className="min-w-0 truncate text-[13px] text-[#111118]">
                    {formatPeriod(
                      item.timing,
                      item.scheduleDelay,
                      item.scheduleUnit,
                    )}
                  </div>
                  <div className="min-w-0 truncate text-[13px] text-[#111118]">
                    {item.title}
                  </div>
                  <div className="min-w-0 text-[13px] leading-5 text-[#111118]">
                    {item.body}
                  </div>
                  {canEditNotification || canDeleteNotification ? (
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="justify-self-end text-[13px] font-medium whitespace-nowrap"
                      style={{ color: LINK_BLUE }}
                    >
                      Edit
                    </button>
                  ) : (
                    <span />
                  )}
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
        title={draft.id ? "Edit Notification" : "Create Notification"}
        onClose={closeModal}
        size="md"
        footer={
          <div className="flex w-full items-center justify-between gap-4">
            {draft.id && canDeleteNotification ? (
              <button
                type="button"
                onClick={() => void removeNotification()}
                disabled={pending !== null}
                aria-busy={pending === "remove"}
                className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-medium text-[#111118] underline disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending === "remove" ? <ButtonSpinner /> : null}
                Remove Notification
              </button>
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
                disabled={
                  !canSave ||
                  pending === "remove" ||
                  (draft.id ? !canEditNotification : !canCreateNotification)
                }
                loading={pending === "save"}
                onClick={() => void save()}
              >
                Save
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <div>
            <p className={FIELD_LABEL}>Select Action (Trigger)</p>
            <Select
              value={draft.triggerKey}
              onChange={applyTrigger}
              placeholder="Select"
              aria-label="Select Action (Trigger)"
              options={triggerOptions}
              size="md"
            />
          </div>

          <div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className={FIELD_LABEL}>Period</label>
                <Select
                  value={draft.period}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      period: value === "before" || value === "after" ? value : "",
                    }))
                  }
                  placeholder="Select"
                  aria-label="Period"
                  options={periodOptions}
                  size="md"
                />
              </div>
              <div>
                <label className={FIELD_LABEL}>Day</label>
                <Select
                  value={draft.days}
                  onChange={(value) =>
                    setDraft((current) => ({ ...current, days: value }))
                  }
                  placeholder="Select"
                  aria-label="Day"
                  options={countOptions(30, draft.days)}
                  size="md"
                />
              </div>
              <div>
                <label className={FIELD_LABEL}>Hours</label>
                <Select
                  value={draft.hours}
                  onChange={(value) =>
                    setDraft((current) => ({ ...current, hours: value }))
                  }
                  placeholder="Select"
                  aria-label="Hours"
                  options={countOptions(23, draft.hours)}
                  size="md"
                />
              </div>
              <div>
                <label className={FIELD_LABEL}>Min</label>
                <Select
                  value={draft.minutes}
                  onChange={(value) =>
                    setDraft((current) => ({ ...current, minutes: value }))
                  }
                  placeholder="Select"
                  aria-label="Min"
                  options={countOptions(59, draft.minutes)}
                  size="md"
                />
              </div>
            </div>
            <p className="mt-3 text-[13px] leading-5 text-[#6B7180]">
              If time period not selected then notification will be when action
              happens.
            </p>
          </div>

          <div>
            <label className={FIELD_LABEL} htmlFor="notification-header">
              Header
            </label>
            <Input
              id="notification-header"
              value={draft.header}
              maxLength={255}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  header: event.target.value,
                }))
              }
              aria-label="Header"
              className="w-full"
            />
            <p className={FIELD_HINT}>25-40 letters</p>
          </div>

          <div>
            <label className={FIELD_LABEL} htmlFor="notification-description">
              Description
            </label>
            <Textarea
              id="notification-description"
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={3}
              aria-label="Description"
              className="min-h-[88px] rounded-[9.38px] border-[#00000014] text-[13px]"
            />
            <p className={FIELD_HINT}>80-120 characters</p>
          </div>

          <IconPicker
            icons={iconCatalog}
            value={draft.iconUrl}
            onChange={(iconUrl) =>
              setDraft((current) => ({ ...current, iconUrl }))
            }
          />
        </div>
      </Modal>
    </div>
  );
}

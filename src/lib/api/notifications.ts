import { apiRequest } from "./client";
import { catalogListCacheOptions } from "./requestDedupe";
import type { ApiNotificationRule } from "./types";
import { normalizeNamedList, pickNamedEntity } from "./normalize";

export type NotificationScheduleUnit =
  | "seconds"
  | "minutes"
  | "hours"
  | "days"
  | "weeks";

export type NotificationRulePayload = {
  title: string;
  subtext: string;
  trigger: string;
  timing: "before" | "after";
  scheduleDelay: number;
  scheduleUnit: NotificationScheduleUnit;
  iconUrl?: string | null;
  action?: string;
  httpMethod?: string;
};

export type UpdateNotificationRulePayload = Partial<NotificationRulePayload>;

export type ApiNotificationTrigger = {
  key: string;
  name: string;
  category: string;
  action: string;
  httpMethod: string;
  targetStatus: string;
  defaultTitle: string;
  defaultBody: string;
  defaultIconId: string;
  allowedTimings: Array<"before" | "after">;
  description: string;
};

export type ApiNotificationIcon = {
  id: string;
  name: string;
  url: string;
  description: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function text(record: Record<string, unknown>, key: string): string {
  const snake = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  const value = record[key] ?? record[snake];
  return typeof value === "string" ? value.trim() : "";
}

function mapTrigger(raw: unknown): ApiNotificationTrigger | null {
  const record = asRecord(raw);
  if (!record) return null;
  const key = text(record, "key");
  const name = text(record, "name");
  if (!key && !name) return null;
  const timings = record.allowedTimings ?? record.allowed_timings;
  const allowed = Array.isArray(timings)
    ? timings.filter(
        (item): item is "before" | "after" =>
          item === "before" || item === "after",
      )
    : [];
  return {
    key: key || name,
    name: name || key,
    category: text(record, "category"),
    action: text(record, "action"),
    httpMethod: text(record, "httpMethod").toUpperCase(),
    targetStatus: text(record, "targetStatus"),
    defaultTitle: text(record, "defaultTitle"),
    defaultBody: text(record, "defaultBody"),
    defaultIconId: text(record, "defaultIconId"),
    allowedTimings: allowed.length ? allowed : ["before", "after"],
    description: text(record, "description"),
  };
}

function mapIcon(raw: unknown): ApiNotificationIcon | null {
  const record = asRecord(raw);
  if (!record) return null;
  const url = text(record, "url");
  if (!url) return null;
  const id = text(record, "id");
  const name = text(record, "name");
  return {
    id: id || url,
    name: name || "Icon",
    url,
    description: text(record, "description"),
  };
}

function pickRule(payload: unknown): ApiNotificationRule {
  return (
    pickNamedEntity<ApiNotificationRule>(payload, "notificationRule") ??
    pickNamedEntity<ApiNotificationRule>(payload, "rule") ??
    (payload as ApiNotificationRule)
  );
}

export const notificationRulesApi = {
  list(options?: { fresh?: boolean }) {
    return apiRequest<unknown>(
      "/notification-rules",
      catalogListCacheOptions(options?.fresh),
    ).then((payload) =>
      normalizeNamedList<ApiNotificationRule>(payload, [
        "notificationRules",
        "rules",
        "items",
        "data",
        "results",
      ]),
    );
  },

  triggers() {
    return apiRequest<unknown>("/notification-rules/triggers").then((payload) =>
      normalizeNamedList<unknown>(payload, [
        "triggers",
        "items",
        "data",
        "results",
      ])
        .map(mapTrigger)
        .filter((item): item is ApiNotificationTrigger => item !== null),
    );
  },

  icons() {
    return apiRequest<unknown>("/notification-rules/icons").then((payload) =>
      normalizeNamedList<unknown>(payload, [
        "icons",
        "items",
        "data",
        "results",
      ])
        .map(mapIcon)
        .filter((item): item is ApiNotificationIcon => item !== null),
    );
  },

  getById(id: string) {
    return apiRequest<unknown>(`/notification-rules/${id}`, {
      cache: "no-store",
      cacheTtlMs: 0,
      dedupe: false,
    }).then(pickRule);
  },

  create(body: NotificationRulePayload) {
    return apiRequest<unknown>("/notification-rules", {
      method: "POST",
      body: JSON.stringify(body),
    }).then(pickRule);
  },

  update(id: string, body: UpdateNotificationRulePayload) {
    return apiRequest<unknown>(`/notification-rules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then(pickRule);
  },

  remove(id: string) {
    return apiRequest<void>(`/notification-rules/${id}`, { method: "DELETE" });
  },
};

import { apiRequest } from "./client";
import { CATALOG_LIST_CACHE_MS } from "./requestDedupe";
import type { ApiNotificationRule } from "./types";
import { normalizeNamedList, pickNamedEntity } from "./normalize";

export type NotificationRulePayload = {
  action: string;
  httpMethod: string;
  title: string;
  subtext: string;
  scheduleDelay: number;
  scheduleUnit: string;
};

export type UpdateNotificationRulePayload = Partial<NotificationRulePayload>;

function pickRule(payload: unknown): ApiNotificationRule {
  return (
    pickNamedEntity<ApiNotificationRule>(payload, "notificationRule") ??
    pickNamedEntity<ApiNotificationRule>(payload, "rule") ??
    (payload as ApiNotificationRule)
  );
}

export const notificationRulesApi = {
  list(options?: { fresh?: boolean }) {
    return apiRequest<unknown>("/notification-rules", {
      cacheTtlMs: options?.fresh ? 0 : CATALOG_LIST_CACHE_MS,
      dedupe: options?.fresh ? false : undefined,
    }).then((payload) =>
      normalizeNamedList<ApiNotificationRule>(payload, [
        "notificationRules",
        "rules",
        "items",
        "data",
        "results",
      ]),
    );
  },

  getById(id: string) {
    return apiRequest<unknown>(`/notification-rules/${id}`).then(pickRule);
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

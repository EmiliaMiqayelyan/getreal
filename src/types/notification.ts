/** When the rule fires relative to the triggering event. */
export type NotificationTiming = "before" | "after" | "";

/** Preference category used for customer push opt-in. */
export type NotificationCategory =
  | "orderUpdates"
  | "deliveryReminders"
  | "subscriptionAlerts"
  | "promotions"
  | "system";

/** Admin notification rule shown on the Push Notifications page. */
export type PushNotification = {
  id: string;
  recordId?: string;
  /** Named trigger from the API, e.g. "Order Confirmation". */
  trigger: string;
  /** Endpoint that fires this rule. */
  action: string;
  httpMethod: string;
  title: string;
  body: string;
  timing: NotificationTiming;
  scheduleDelay: number;
  scheduleUnit: string;
  iconUrl: string;
  /** True when this is a non-repeating date/time broadcast. */
  isOneTime: boolean;
  /** True when this is a weekly weekday + time broadcast. */
  isWeekly: boolean;
  /** 0–6 Sunday–Saturday for weekly schedules. */
  weekday: number | null;
  /** ISO datetime from the linked scheduled notification (Eastern schedule). */
  scheduledFor: string | null;
  /** Whether the one-time broadcast has already been sent. */
  isSent: boolean;
  category: NotificationCategory | "";
};

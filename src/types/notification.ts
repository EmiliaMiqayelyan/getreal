/** When the rule fires relative to the triggering event. */
export type NotificationTiming = "before" | "after" | "";

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
};

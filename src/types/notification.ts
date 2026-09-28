/** Admin notification rule shown on the Push Notifications page. */
export type PushNotification = {
  id: string;
  recordId?: string;
  /** Endpoint that fires this rule. Shown as the data trigger. */
  action: string;
  httpMethod: string;
  title: string;
  body: string;
  scheduleDelay: number;
  scheduleUnit: string;
};

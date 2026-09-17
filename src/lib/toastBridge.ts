/**
 * Imperative toast bridge for non-React modules (e.g. orderSync).
 * ToastProvider registers the handler on mount.
 */

type ToastTone = "success" | "error" | "info";
type ToastHandler = (message: string, tone?: ToastTone) => void;

let handler: ToastHandler | null = null;

export function registerToastHandler(next: ToastHandler | null) {
  handler = next;
}

export function toastFromApi(
  message: string,
  tone: ToastTone = "info",
): void {
  handler?.(message, tone);
}

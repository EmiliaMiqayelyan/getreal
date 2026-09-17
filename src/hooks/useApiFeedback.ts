import { useCallback } from "react";

import { ROUTES } from "@/constants";
import { useToast } from "@/context/ToastContext";
import { formatApiError, isUnauthorizedError } from "@/lib/api/errors";

/**
 * Shared helper for page/mutation error handling.
 * Shows a toast and redirects to login on 401.
 */
export function useApiFeedback() {
  const toast = useToast();

  const notifyApiError = useCallback(
    (
      error: unknown,
      fallback = "Something went wrong. Please try again.",
    ): string => {
      const message = formatApiError(error, fallback);

      if (isUnauthorizedError(error)) {
        toast.showError(message);
        if (!window.location.pathname.startsWith(ROUTES.login)) {
          window.location.assign(ROUTES.login);
        }
        return message;
      }

      toast.showError(message);
      return message;
    },
    [toast],
  );

  return {
    showToast: toast.showToast,
    showError: toast.showError,
    showSuccess: toast.showSuccess,
    notifyApiError,
    formatApiError,
  };
}

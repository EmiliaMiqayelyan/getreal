import { useEffect } from "react";

import { APP_NAME } from "@/constants";

/**
 * Sets `document.title` as `"Page | GetReal Food"` (or default brand title).
 */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME;
  }, [title]);
}

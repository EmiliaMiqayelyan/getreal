import type { ExportFormat } from "@/types/export";

import { apiDownload } from "./client";

export type ExportQueryValue = string | number | boolean | null | undefined;

/** GET a list endpoint with `?export=csv` and download the file. */
export async function downloadListExport(
  path: string,
  params: Record<string, ExportQueryValue>,
  format: ExportFormat,
  fallbackFilename: string,
): Promise<void> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  search.set("export", format);

  const qs = search.toString();
  const filename = fallbackFilename.includes(".")
    ? fallbackFilename
    : `${fallbackFilename}.${format}`;

  await apiDownload(`${path}?${qs}`, { filename });
}

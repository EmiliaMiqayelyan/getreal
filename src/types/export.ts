export type ExportFormat = "csv" | "xlsx";

export type ExportScope = "filtered" | "all";

export type ExportRequest = {
  format: ExportFormat;
  scope: ExportScope;
  /** Rows matching current filters (when known). */
  recordCount?: number;
  /** Human-readable entity, e.g. "customers". */
  entityLabel: string;
};

export type ExportHandler = (request: ExportRequest) => void | Promise<void>;

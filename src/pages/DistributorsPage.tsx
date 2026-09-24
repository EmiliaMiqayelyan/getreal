import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { AddDistributorModal } from "@/components/distributors/AddDistributorModal";
import { DistributorFilters } from "@/components/distributors/DistributorFilters";
import { Header } from "@/components/layout/AdminHeader";
import { LocationHover } from "@/components/shared/LocationHover";
import { AppLoader } from "@/components/ui/AppLoader";
import { IdPill } from "@/components/ui/Badge";
import { TABLE_HEADER } from "@/constants/table";
import { useAppCatalog, nextDistributorId } from "@/context/AppCatalogContext";
import { useApiFeedback } from "@/hooks/useApiFeedback";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  distributorsApi,
  isApiConfigured,
  mapApiDistributorToDistributor,
} from "@/lib/api";
import {
  toCreateDistributorPayload,
  resolveDistributorDocuments,
} from "@/lib/api/payloads";
import type { Distributor } from "@/types/distributor";
import type { ExportRequest } from "@/types/export";
import { cn } from "@/utils/cn";
import { apiId } from "@/utils/entityIds";
import {
  downloadDistributorsCsv,
  filterDistributors,
  getDistributorFullAddress,
  getDistributorLocation,
  getPrimaryContactName,
  getPrimaryContactPhone,
  uniqueDistributorLocations,
} from "@/utils/distributors";
import { formatDeliveryLabel } from "@/utils/format";

const EDIT_LINK =
  "cursor-pointer text-[13px] font-semibold text-[#2165D4] hover:underline";
const NOTES_LINK =
  "cursor-pointer border-0 bg-transparent p-0 text-left text-[13px] font-medium italic underline leading-[18px] text-[#111118] hover:opacity-80";
const FILES_TRIGGER =
  "inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left text-[13px] font-medium leading-[18px] text-[#111118] hover:opacity-80";
const BODY = "text-[13px] leading-[18px] font-medium text-[#111118]";
const SECONDARY = "text-[12px] leading-[16px] font-medium text-[#6B718099]";

const GRID =
  "grid grid-cols-[90px_minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1.15fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_92px_56px_48px] items-center gap-x-4";

function FilesChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="8"
      height="5"
      viewBox="0 0 8 5"
      fill="none"
      aria-hidden
      className={cn(
        "block shrink-0 transition-transform",
        open && "rotate-180",
      )}
    >
      <path
        d="M0.585 1.17L4 4.17L7.415 1.17"
        stroke="#111118"
        strokeWidth="1.17"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Open a distributor document in a new tab.
 * Real uploads use their blob/object URL; mock metadata-only docs get a blob HTML
 * preview (data: URLs are blocked by Chromium for target=_blank navigations).
 */
function openDistributorDocument(doc: Distributor["documents"][number]) {
  if (doc.url) {
    window.open(doc.url, "_blank", "noopener,noreferrer");
    return;
  }

  const title = escapeHtml(doc.name);
  const sizeLine = doc.size
    ? `<p style="color:#6B7180;margin:0 0 1rem">${escapeHtml(doc.size)}</p>`
    : "";
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #f7f7f5; color: #111118; }
    main { max-width: 40rem; margin: 0 auto; padding: 2.5rem 1.5rem; }
    h1 { font-size: 1.25rem; margin: 0 0 0.5rem; word-break: break-word; }
  </style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    ${sizeLine}
    <p>Preview placeholder — no file bytes are stored for this demo document.</p>
  </main>
</body>
</html>`;

  const blobUrl = URL.createObjectURL(
    new Blob([html], { type: "text/html;charset=utf-8" }),
  );
  const opened = window.open(blobUrl, "_blank", "noopener,noreferrer");
  if (!opened) {
    const link = document.createElement("a");
    link.href = blobUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

function FilesMenu({ documents }: { documents: Distributor["documents"] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative justify-self-start">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPos({ top: rect.bottom + 8, left: rect.left });
          setOpen((current) => !current);
        }}
        className={FILES_TRIGGER}
      >
        <FilesChevron open={open} />
        Files
      </button>
      {open ? (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 flex min-w-[240px] flex-col gap-2"
          style={{ top: pos.top, left: pos.left }}
        >
          {documents.length ? (
            documents.map((doc) => (
              <button
                key={doc.id}
                type="button"
                role="menuitem"
                className="cursor-pointer rounded-[10px] border border-[#00000014] bg-white px-3.5 py-2.5 text-left shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:bg-[#FAFAF8]"
                onClick={() => {
                  openDistributorDocument(doc);
                  setOpen(false);
                }}
              >
                <div className="text-[12px] font-medium text-[#111118]">
                  {doc.name}
                </div>
                {doc.size ? (
                  <div className="mt-0.5 text-[11px] text-[#8A8A8A]">
                    {doc.size}
                  </div>
                ) : null}
              </button>
            ))
          ) : (
            <div className="rounded-[10px] border border-[#00000014] bg-white px-3.5 py-2.5 text-[12px] text-[#8A8A8A] shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
              No files
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

const NOTES_PANEL_WIDTH = 360;

function NotesHover({ notes }: { notes: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    maxHeight: 520,
    above: false,
  });
  const btnRef = useRef<HTMLButtonElement>(null);
  const hideTimer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  function show() {
    window.clearTimeout(hideTimer.current);
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const margin = 16;
      const left = Math.min(
        Math.max(margin, rect.left),
        window.innerWidth - NOTES_PANEL_WIDTH - margin,
      );
      const belowTop = rect.bottom + 8;
      const spaceBelow = window.innerHeight - belowTop - margin;
      const spaceAbove = rect.top - margin - 8;
      const above = spaceBelow < 160 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, Math.min(520, above ? spaceAbove : spaceBelow));
      setPos({
        top: belowTop,
        bottom: window.innerHeight - rect.top + 8,
        left,
        maxHeight,
        above,
      });
    }
    setOpen(true);
  }

  function hide() {
    hideTimer.current = window.setTimeout(() => setOpen(false), 140);
  }

  if (!notes.trim()) {
    return <span className="text-[13px] text-[#8A8A8A]">—</span>;
  }

  return (
    <div
      className="relative justify-self-start"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        ref={btnRef}
        type="button"
        className={NOTES_LINK}
        aria-haspopup="true"
        aria-expanded={open}
      >
        View
      </button>
      {open
        ? createPortal(
            <div
              role="tooltip"
              className="fixed z-50 w-[360px] overflow-y-auto rounded-[10px] border border-[#00000014] bg-white px-4 py-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
              style={{
                left: pos.left,
                maxHeight: pos.maxHeight,
                ...(pos.above ? { bottom: pos.bottom } : { top: pos.top }),
              }}
              onMouseEnter={show}
              onMouseLeave={hide}
            >
              <div className="mb-2 shrink-0 text-[10px] font-semibold tracking-[0.06em] text-[#8A8A8A] uppercase">
                Notes
              </div>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-[#111118]">
                {notes}
              </p>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default function DistributorsPage() {
  useDocumentTitle("Distributors");

  const {
    distributors: rows,
    saveDistributor,
    removeDistributor,
    setItems,
    setSources,
    isBootstrapping,
  } = useAppCatalog();
  const { notifyApiError, showSuccess } = useApiFeedback();
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [weekdayFilter, setWeekdayFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Distributor | null>(null);

  const locationOptions = useMemo(
    () => uniqueDistributorLocations(rows),
    [rows],
  );

  const filtered = useMemo(
    () =>
      filterDistributors(rows, {
        query,
        location: locationFilter,
        weekday: weekdayFilter,
      }),
    [locationFilter, query, rows, weekdayFilter],
  );

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(distributor: Distributor) {
    setEditing(distributor);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleRemoveDistributor() {
    if (!editing) return;
    const snapshot = editing;
    const recordId = apiId(snapshot);
    removeDistributor(snapshot.id);
    if (!isApiConfigured()) return;

    void distributorsApi
      .remove(recordId)
      .then(() => {
        const stillLinked = (ref?: string, name?: string) =>
          ref === recordId ||
          ref === snapshot.id ||
          (name ? name === snapshot.name : false);
        setItems((items) =>
          items.map((item) =>
            stillLinked(item.distributorId, item.distributor)
              ? { ...item, distributor: "", distributorId: undefined }
              : item,
          ),
        );
        setSources((sources) =>
          sources.map((source) =>
            stillLinked(source.distributorId, source.distributor)
              ? { ...source, distributor: "", distributorId: undefined }
              : source,
          ),
        );
      })
      .catch((error) => {
        saveDistributor(snapshot, "create");
        notifyApiError(error, "Failed to delete distributor.");
      });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
      <Header
        title="Distributors"
        toolbar={
          <DistributorFilters
            query={query}
            location={locationFilter}
            weekday={weekdayFilter}
            locationOptions={locationOptions}
            recordCount={filtered.length}
            onQueryChange={setQuery}
            onLocationChange={setLocationFilter}
            onWeekdayChange={setWeekdayFilter}
            onAdd={openCreate}
            onExport={async (request: ExportRequest) => {
              const source = request.scope === "all" ? rows : filtered;
              downloadDistributorsCsv(source);
            }}
          />
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA] p-4 md:p-7">
        {isBootstrapping ? (
          <AppLoader variant="table" label="Loading distributors" />
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-2 overflow-auto md:hidden">
              {filtered.length === 0 ? (
                <div className="rounded-[12px] border border-[#00000014] bg-white px-4 py-10 text-center text-[13px] text-[#8A8A8A]">
                  No distributors found
                </div>
              ) : null}
              {filtered.map((row) => (
                <div
                  key={row.id}
                  className="rounded-[12px] border border-[#00000014] bg-white p-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <IdPill>{row.id}</IdPill>
                      <div className="mt-2 truncate text-[13px] leading-[18px] font-medium text-[#111118]">
                        {row.name}
                      </div>
                      <div className={SECONDARY}>{row.paymentTerms || "—"}</div>
                      <LocationHover
                        className="mt-1 text-[12px] text-[#111118]"
                        fullAddress={getDistributorFullAddress(row)}
                      >
                        {getDistributorLocation(row)}
                      </LocationHover>
                      <div className="mt-0.5 text-[12px] text-[#111118]">
                        {getPrimaryContactName(row)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className={EDIT_LINK}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden min-h-0 w-full flex-1 overflow-auto rounded-[12px] border border-[#00000014] bg-white md:block">
              <div className="w-full min-w-[1100px]">
                <div
                  className={cn(
                    GRID,
                    TABLE_HEADER,
                    "sticky top-0 z-20 h-10 border-b border-[#00000014] bg-white px-4",
                  )}
                >
                  <div>Distr. ID</div>
                  <div>Name</div>
                  <div>Location</div>
                  <div>Contact Info</div>
                  <div>Phone</div>
                  <div>Delivery Info</div>
                  <div>Documents</div>
                  <div>Notes</div>
                  <div aria-hidden />
                </div>

                {filtered.length === 0 ? (
                  <div className="px-4 py-10 text-center text-[13px] text-[#8A8A8A]">
                    No distributors found
                  </div>
                ) : null}

                {filtered.map((row, index) => {
                  const delivery = formatDeliveryLabel(row.deliveryDays);
                  const isLast = index === filtered.length - 1;

                  return (
                    <div
                      key={row.id}
                      className={cn(
                        GRID,
                        "h-[100px] px-4",
                        !isLast && "border-b border-[#00000014]",
                      )}
                    >
                      <IdPill>{row.id}</IdPill>

                      <div className="min-w-0">
                        <div className={cn(BODY, "truncate")}>{row.name}</div>
                        <div className={cn("mt-1", SECONDARY)}>
                          {row.paymentTerms || "—"}
                        </div>
                      </div>

                      <LocationHover
                        className={BODY}
                        fullAddress={getDistributorFullAddress(row)}
                      >
                        {getDistributorLocation(row)}
                      </LocationHover>
                      <div className={cn(BODY, "min-w-0 truncate")}>
                        {getPrimaryContactName(row)}
                      </div>
                      <div className={cn(BODY, "whitespace-nowrap")}>
                        {getPrimaryContactPhone(row)}
                      </div>
                      <div className="min-w-0">
                        <div className={cn(BODY, "truncate")}>
                          {delivery.days}
                        </div>
                        {delivery.time ? (
                          <div className={cn("mt-1", SECONDARY)}>
                            {delivery.time}
                          </div>
                        ) : null}
                      </div>
                      <FilesMenu documents={row.documents} />
                      <NotesHover notes={row.notes} />
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className={cn(EDIT_LINK, "justify-self-end")}
                        aria-label={`Edit ${row.name}`}
                      >
                        Edit
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <AddDistributorModal
        open={modalOpen}
        distributor={editing}
        onClose={closeModal}
        onRemove={handleRemoveDistributor}
        onSave={(distributor) => {
          void (async () => {
            if (isApiConfigured()) {
              try {
                const documents = await resolveDistributorDocuments(
                  distributor.documents ?? [],
                );
                const withDocs = {
                  ...distributor,
                  documents,
                  docs: documents.length ? String(documents.length) : null,
                };
                const payload = toCreateDistributorPayload(withDocs);
                if (editing) {
                  const updated = await distributorsApi.update(
                    apiId(editing),
                    payload,
                  );
                  const mapped = mapApiDistributorToDistributor(updated, 0);
                  saveDistributor(
                    {
                      ...withDocs,
                      ...mapped,
                      id: editing.id,
                      recordId: mapped.recordId ?? editing.recordId,
                      categories: withDocs.categories,
                      products: withDocs.products,
                    },
                    "update",
                    editing,
                  );
                } else {
                  const created = await distributorsApi.create(payload);
                  const mapped = mapApiDistributorToDistributor(created, 0);
                  saveDistributor(
                    {
                      ...withDocs,
                      ...mapped,
                      categories: withDocs.categories,
                      products: withDocs.products,
                    },
                    "create",
                  );
                }
                showSuccess(
                  editing ? "Distributor updated." : "Distributor created.",
                );
                closeModal();
                return;
              } catch (error) {
                notifyApiError(error, "Failed to save distributor.");
                return;
              }
            }

            if (editing) {
              saveDistributor(
                { ...distributor, id: editing.id },
                "update",
                editing,
              );
            } else {
              const id = nextDistributorId(rows);
              saveDistributor({ ...distributor, id }, "create");
            }
            closeModal();
          })();
        }}
      />
    </div>
  );
}

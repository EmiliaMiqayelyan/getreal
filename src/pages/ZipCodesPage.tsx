import { useCallback, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Header } from "@/components/layout/AdminHeader";
import { AppLoader } from "@/components/ui/AppLoader";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormField } from "@/components/ui/FormField";
import { InfiniteScrollSentinel } from "@/components/ui/InfiniteScrollSentinel";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { SearchField } from "@/components/ui/SearchField";
import { Textarea } from "@/components/ui/Textarea";
import { PINNED_HEADER, TABLE_HEADER } from "@/constants/table";
import { useRolesUsers } from "@/context/RolesUsersContext";
import {
  useAbortableEffect,
  useApiFeedback,
  useDebouncedValue,
  useDocumentTitle,
  useLazyWindow,
} from "@/hooks";
import { getSessionPermissionNames } from "@/lib/auth";
import { isApiConfigured, zipCodesApi, type ApiZipCode } from "@/lib/api";
import { cn } from "@/utils/cn";
import { grantsAnyApiPermission } from "@/utils/rolePermissions";

/** Matches POST/DELETE /zip-codes admin guard on the API. */
const ZIP_CODE_MANAGE_PERMISSIONS = [
  "manage:zip_codes",
  "manage:orders",
  "manage:users",
];

const GRID =
  "grid grid-cols-[minmax(120px,0.8fr)_minmax(140px,1.2fr)_minmax(100px,0.7fr)_48px] items-center gap-x-4";

const BODY = "min-w-0 truncate text-[13px] leading-[18px] font-medium text-[#111118]";
const LINK_BLUE = "#3B82F6";

function parseZipCodesInput(raw: string): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const part of raw.split(/[\n,;]+/)) {
    const code = part.trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
  }
  return codes;
}

function displayCity(row: ApiZipCode) {
  return row.city?.trim() || "—";
}

function displayState(row: ApiZipCode) {
  return row.state?.trim() || "—";
}

export default function ZipCodesPage() {
  useDocumentTitle("Zip code");
  const { sessionPermissions } = useRolesUsers();
  const canManageZipCodes =
    sessionPermissions.zipCodesCreate ||
    sessionPermissions.zipCodesDelete ||
    grantsAnyApiPermission(
      getSessionPermissionNames(),
      ZIP_CODE_MANAGE_PERMISSIONS,
    );
  const canCreate = canManageZipCodes;
  const canDelete = canManageZipCodes;

  const apiConfigured = isApiConfigured();
  const { notifyApiError, showSuccess } = useApiFeedback();

  const [rows, setRows] = useState<ApiZipCode[]>([]);
  const [loading, setLoading] = useState(apiConfigured);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zipInput, setZipInput] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [formError, setFormError] = useState<string | undefined>();

  const [pendingDelete, setPendingDelete] = useState<ApiZipCode | null>(null);

  const loadRows = useCallback(
    async (signal: AbortSignal) => {
      if (!apiConfigured) {
        setRows([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const items = await zipCodesApi.list({
          search: debouncedQuery || undefined,
          signal,
        });
        if (signal.aborted) return;
        setRows(items);
      } catch (error) {
        if (signal.aborted) return;
        notifyApiError(error, "Failed to load zip codes.");
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [apiConfigured, debouncedQuery, notifyApiError],
  );

  useAbortableEffect((signal) => {
    void loadRows(signal);
  }, [loadRows]);

  const listWindow = useLazyWindow(rows, debouncedQuery);

  function openCreate() {
    setZipInput("");
    setCity("");
    setState("");
    setFormError(undefined);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setFormError(undefined);
  }

  async function saveZipCodes() {
    const codes = parseZipCodesInput(zipInput);
    if (!codes.length) {
      setFormError("Enter at least one zip code.");
      return;
    }
    if (!apiConfigured) {
      setFormError("API is not configured.");
      return;
    }

    setSaving(true);
    setFormError(undefined);
    try {
      const cityValue = city.trim() || null;
      const stateValue = state.trim() || null;
      const payload =
        codes.length === 1
          ? {
              zipCode: codes[0],
              city: cityValue,
              state: stateValue,
            }
          : {
              zipCodes: codes,
              city: cityValue,
              state: stateValue,
            };

      await zipCodesApi.create(payload);
      showSuccess(
        codes.length === 1
          ? "Zip code added."
          : `${codes.length} zip codes added.`,
      );
      setModalOpen(false);
      setZipInput("");
      setCity("");
      setState("");
      const items = await zipCodesApi.list({
        search: debouncedQuery || undefined,
      });
      setRows(items);
    } catch (error) {
      notifyApiError(error, "Failed to add zip code.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    const key = target.id || target.zipCode;
    if (!key) throw new Error("This zip code is not linked to a server record.");

    await zipCodesApi.remove(key);
    showSuccess("Zip code deleted.");
    setRows((current) =>
      current.filter(
        (row) =>
          row.id !== target.id &&
          row.zipCode.toLowerCase() !== target.zipCode.toLowerCase(),
      ),
    );
  }

  const parsedPreview = useMemo(
    () => parseZipCodesInput(zipInput),
    [zipInput],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
      <Header
        title="Zip code"
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <SearchField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search zip, city, state"
            />
            {canCreate ? (
              <Button
                variant="primary"
                onClick={openCreate}
                className="ml-auto"
              >
                <Plus size={14} />
                Add Zip Code
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA] px-4 py-5 md:px-7 md:py-5">
        {loading ? (
          <AppLoader variant="table" label="Loading zip codes" />
        ) : (
          <ScrollTable fill minWidth={560}>
            <div
              className={cn(
                GRID,
                TABLE_HEADER,
                PINNED_HEADER,
                "h-10 border-b border-[#00000014] px-4",
              )}
            >
              <div>Zip code</div>
              <div>City</div>
              <div>State</div>
              <div aria-hidden />
            </div>

            {listWindow.visible.map((row, index) => {
              const isLast = index === listWindow.visible.length - 1;
              return (
                <div
                  key={row.id || row.zipCode}
                  className={cn(
                    GRID,
                    "px-4 py-3.5",
                    !isLast && "border-b border-[#00000014]",
                  )}
                >
                  <div className={BODY}>{row.zipCode}</div>
                  <div className={BODY}>{displayCity(row)}</div>
                  <div className={BODY}>{displayState(row)}</div>
                  {canDelete ? (
                    <button
                      type="button"
                      aria-label={`Delete zip code ${row.zipCode}`}
                      onClick={() => setPendingDelete(row)}
                      className="justify-self-end text-[13px] font-medium"
                      style={{ color: LINK_BLUE }}
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              );
            })}

            {!rows.length ? (
              <div className="px-4 py-12 text-center text-[13px] text-[#8A8A8A]">
                No zip codes found
              </div>
            ) : null}

            <InfiniteScrollSentinel
              hasMore={listWindow.hasMore}
              loadedCount={listWindow.loadedCount}
              onLoadMore={listWindow.loadMore}
            />
          </ScrollTable>
        )}
      </div>

      <Modal
        open={modalOpen}
        title="Add Zip Code"
        onClose={closeModal}
        size="md"
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button variant="ghost" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="dark"
              loading={saving}
              disabled={!parsedPreview.length}
              onClick={() => void saveZipCodes()}
            >
              {parsedPreview.length > 1
                ? `Add ${parsedPreview.length} Zip Codes`
                : "Add Zip Code"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField
            label="Zip code"
            htmlFor="zip-codes-input"
            required
            error={formError}
            helper="Enter one zip code, or multiple separated by commas or new lines."
          >
            <Textarea
              id="zip-codes-input"
              value={zipInput}
              onChange={(event) => {
                setZipInput(event.target.value);
                if (formError) setFormError(undefined);
              }}
              rows={4}
              placeholder={"90210\n10001\n94107"}
              aria-invalid={Boolean(formError)}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="City" htmlFor="zip-city">
              <Input
                id="zip-city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Optional"
              />
            </FormField>
            <FormField label="State" htmlFor="zip-state">
              <Input
                id="zip-state"
                value={state}
                onChange={(event) => setState(event.target.value)}
                placeholder="Optional"
              />
            </FormField>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete zip code"
        message={
          pendingDelete
            ? `Remove delivery zip code ${pendingDelete.zipCode}? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

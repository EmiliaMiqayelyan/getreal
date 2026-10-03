import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useScrollLock } from "@/hooks/useScrollLock";
import type { ManagedRole, RolePermissions } from "@/types/admin";
import {
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_PERMISSION_GROUPS,
} from "@/utils/rolePermissions";
import { cn } from "@/utils/cn";

const SELECTED_BG = "#E7EFE8";

type RoleManagementModalProps = {
  open: boolean;
  roles: ManagedRole[];
  onClose: () => void;
  onSave: (role: ManagedRole) => Promise<ManagedRole>;
  onDelete: (role: ManagedRole) => Promise<void>;
  onLoadRole?: (role: ManagedRole) => Promise<Partial<ManagedRole> | null>;
};

function emptyPermissions(): RolePermissions {
  return { ...DEFAULT_ROLE_PERMISSIONS };
}

export function RoleManagementModal({
  open,
  roles,
  onClose,
  onSave,
  onDelete,
  onLoadRole,
}: RoleManagementModalProps) {
  const [draftRoles, setDraftRoles] = useState<ManagedRole[]>(roles);
  const [selectedId, setSelectedId] = useState<string | null>(
    roles[0]?.id ?? null,
  );
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const loadedRoleIds = useRef(new Set<string>());
  const openedRef = useRef(false);
  useScrollLock(open);

  useEffect(() => {
    if (!open) {
      openedRef.current = false;
      loadedRoleIds.current.clear();
      setBusy(null);
      return;
    }
    if (openedRef.current) return;
    openedRef.current = true;
    setDraftRoles(roles);
    setSelectedId(roles[0]?.id ?? null);
  }, [open, roles]);

  const selectedRecordId = draftRoles.find(
    (role) => role.id === selectedId,
  )?.recordId;

  useEffect(() => {
    if (!open || !onLoadRole || !selectedId || !selectedRecordId) return;
    if (loadedRoleIds.current.has(selectedRecordId)) return;
    const role = draftRoles.find((entry) => entry.id === selectedId);
    if (!role) return;
    let cancelled = false;
    void onLoadRole(role).then((next) => {
      if (cancelled || !next) return;
      loadedRoleIds.current.add(selectedRecordId);
      setDraftRoles((current) =>
        current.map((entry) =>
          entry.id === role.id ? { ...entry, ...next, id: entry.id } : entry,
        ),
      );
    });
    return () => {
      cancelled = true;
    };
    // Load once per selected role. draftRoles is read when the selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onLoadRole, open, selectedId, selectedRecordId]);

  const selected = useMemo(
    () => draftRoles.find((role) => role.id === selectedId) ?? null,
    [draftRoles, selectedId],
  );

  if (!open) return null;

  function createRole() {
    const id = `role-${Date.now()}`;
    const next: ManagedRole = {
      id,
      name: "New Role Name",
      permissions: emptyPermissions(),
    };
    setDraftRoles((current) => [...current, next]);
    setSelectedId(id);
  }

  function patchSelected(patch: Partial<ManagedRole>) {
    if (!selectedId) return;
    setDraftRoles((current) =>
      current.map((role) =>
        role.id === selectedId ? { ...role, ...patch } : role,
      ),
    );
  }

  function togglePermission(key: keyof RolePermissions) {
    if (!selected) return;
    patchSelected({
      permissions: {
        ...selected.permissions,
        [key]: !selected.permissions[key],
      },
    });
  }

  async function handleSave() {
    if (!selected || busy) return;
    const cleaned: ManagedRole = {
      ...selected,
      name: selected.name.trim() || "New Role Name",
    };
    setBusy("save");
    try {
      const saved = await onSave(cleaned);
      setDraftRoles((current) =>
        current.map((role) =>
          role.id === selected.id ? { ...role, ...saved } : role,
        ),
      );
      setSelectedId(saved.id);
    } catch {
      // The page reports the API error.
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!selected || busy) return;
    const removedId = selected.id;
    setBusy("delete");
    try {
      await onDelete(selected);
      const remaining = draftRoles.filter((role) => role.id !== removedId);
      setDraftRoles(remaining);
      setSelectedId(remaining[0]?.id ?? null);
    } catch {
      // The page reports the API error.
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-none p-6 sm:items-center">
      <button
        type="button"
        aria-label="Close dialog overlay"
        className="absolute inset-0 bg-[#333333]/55"
        onClick={() => {
          if (busy) return;
          onClose();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-mgmt-title"
        data-scroll-lock-allow
        className="relative z-10 flex h-[min(720px,92vh)] w-full max-w-[860px] flex-col overflow-hidden rounded-[14px] bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#00000014] px-5 py-4">
          <h2
            id="role-mgmt-title"
            className="text-[18px] font-semibold tracking-tight text-[#111118]"
          >
            Role Management
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              if (busy) return;
              onClose();
            }}
            className="rounded-md p-1 text-[#8A8A8A] hover:bg-[#F5F5F3]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <aside className="flex w-full shrink-0 flex-col border-b border-[#00000014] bg-white p-3 sm:w-[200px] sm:border-r sm:border-b-0">
            <Button
              variant="outline"
              size="lg"
              onClick={createRole}
              disabled={busy !== null}
              className="w-full"
            >
              <Plus size={14} />
              Create Role
            </Button>

            <div className="mt-3 flex gap-1 overflow-x-auto sm:block sm:min-h-0 sm:flex-1 sm:space-y-1 sm:overflow-y-auto">
              {draftRoles.map((role) => {
                const active = role.id === selectedId;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedId(role.id)}
                    className={cn(
                      "shrink-0 rounded-[8px] px-3 py-2.5 text-left text-[13px] font-medium whitespace-nowrap transition-colors sm:w-full sm:whitespace-normal",
                      active
                        ? "text-[#111118]"
                        : "text-[#111118] hover:bg-[#F5F5F3]",
                    )}
                    style={active ? { background: SELECTED_BG } : undefined}
                  >
                    {role.name || "New Role Name"}
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {selected ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                  <label className="mb-1.5 block text-[11px] font-semibold text-[#2E2E2E]">
                    Role Name
                  </label>
                  <Input
                    value={selected.name}
                    onChange={(event) =>
                      patchSelected({ name: event.target.value })
                    }
                    className="w-full"
                  />

                  <h3 className="mt-6 mb-3 text-[11px] font-semibold tracking-[0.08em] text-[#2E2E2E] uppercase">
                    Role Permissions
                  </h3>
                  <div className="space-y-5">
                    {ROLE_PERMISSION_GROUPS.map((group) => {
                      const accessChecked = Boolean(
                        selected.permissions[group.accessKey],
                      );
                      return (
                        <div key={group.label}>
                          <p className="mb-2 text-[12px] font-semibold text-[#111118]">
                            {group.label}
                          </p>
                          <div className="space-y-2">
                            <PermissionRow
                              checked={accessChecked}
                              label={group.accessLabel}
                              onToggle={() => togglePermission(group.accessKey)}
                            />
                            <div className="space-y-2 border-l border-[#00000014] pl-4">
                              {group.actions.map((action) => (
                                <PermissionRow
                                  key={action.key}
                                  checked={Boolean(
                                    selected.permissions[action.key],
                                  )}
                                  label={action.label}
                                  onToggle={() => togglePermission(action.key)}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[#00000014] px-5 py-4">
                  <Button
                    variant="dangerGhost"
                    onClick={handleDelete}
                    disabled={busy !== null}
                  >
                    {busy === "delete" ? "Deleting..." : "Delete Role"}
                  </Button>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      onClick={onClose}
                      disabled={busy !== null}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="dark"
                      onClick={handleSave}
                      disabled={busy !== null}
                      className="shrink-0 whitespace-nowrap"
                    >
                      {busy === "save" ? "Saving..." : "Save Role"}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-6 text-[13px] text-[#8A8A8A]">
                Create a role to configure permissions.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PermissionRow({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-[#111118]">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={onToggle}
        className={cn(
          "flex size-[16px] shrink-0 items-center justify-center rounded-[3px] border transition-colors",
          checked
            ? "border-[#111118] bg-[#111118] text-white"
            : "border-[#00000014] bg-white",
        )}
      >
        {checked ? <Check size={11} strokeWidth={3} /> : null}
      </button>
      <span>{label}</span>
    </label>
  );
}

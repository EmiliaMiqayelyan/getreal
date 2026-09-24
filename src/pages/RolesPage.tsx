import { useMemo, useState } from "react";
import { Check, ChevronRight, Copy, Plus, X } from "lucide-react";

import { Header } from "@/components/layout/AdminHeader";
import { RoleManagementModal } from "@/components/roles/RoleManagementModal";
import { AppLoader } from "@/components/ui/AppLoader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IdPill } from "@/components/ui/Badge";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { SUB_ROW_PAD } from "@/constants/table";
import { useAppCatalog } from "@/context/AppCatalogContext";
import { useRolesUsers } from "@/context/RolesUsersContext";
import { useApiFeedback } from "@/hooks/useApiFeedback";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useScrollLock } from "@/hooks/useScrollLock";
import {
  isApiConfigured,
  mapRoleUserTypeToApiRole,
  rolesApi,
  usersApi,
} from "@/lib/api";
import type { RolePermissions, RoleUser } from "@/types/admin";
import { cn } from "@/utils/cn";
import {
  ROLE_PERMISSION_GROUPS,
  permissionsForRoleType,
} from "@/utils/rolePermissions";
import {
  type UserFormErrors,
  validateUserForm,
} from "@/utils/rolesUsers";

const FALLBACK_ROLE_OPTIONS = [
  "Superadmin",
  "Manager",
  "Warehouse Worker",
  "Driver",
] as const;

type DraftState = {
  id?: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  type: string;
};

function emptyDraft(): DraftState {
  return {
    name: "",
    email: "",
    password: "",
    phone: "",
    type: "Manager",
  };
}

function toDraft(user: RoleUser): DraftState {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    password: "",
    phone: user.phone,
    type: user.type,
  };
}

function PermissionCheckbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-[#111118]">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={onChange}
        className={cn(
          "mt-0.5 flex size-[16px] shrink-0 items-center justify-center rounded-[3px] border transition-colors",
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

export default function RolesPage() {
  useDocumentTitle("Roles");

  const { users, setUsers, applyPermissions, removeUser, managedRoles, setManagedRoles, sessionPermissions } =
    useRolesUsers();
  const { isBootstrapping } = useAppCatalog();
  const { notifyApiError, showSuccess } = useApiFeedback();
  const [draftPermissions, setDraftPermissions] = useState<
    Record<string, RolePermissions>
  >({});
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [formErrors, setFormErrors] = useState<UserFormErrors>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [roleMgmtOpen, setRoleMgmtOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  useScrollLock(modalOpen);

  const roleOptions = useMemo(() => {
    const fromTemplates = managedRoles.map((role) => role.name);
    const fromUsers = users.map((user) => user.type);
    return Array.from(
      new Set([...FALLBACK_ROLE_OPTIONS, ...fromTemplates, ...fromUsers]),
    );
  }, [managedRoles, users]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery =
        !normalized ||
        user.id.toLowerCase().includes(normalized) ||
        user.name.toLowerCase().includes(normalized) ||
        user.email.toLowerCase().includes(normalized) ||
        user.phone.includes(normalized);

      const matchesRole = !roleFilter || user.type === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [query, roleFilter, users]);

  function permissionsFor(user: RoleUser) {
    return draftPermissions[user.id] ?? user.permissions;
  }

  function toggleExpand(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  function patchPermission(
    user: RoleUser,
    key: keyof RolePermissions,
    value: boolean,
  ) {
    setDraftPermissions((current) => ({
      ...current,
      [user.id]: {
        ...(current[user.id] ?? user.permissions),
        [key]: value,
      },
    }));
  }

  function applyChanges(user: RoleUser) {
    const next = draftPermissions[user.id] ?? user.permissions;
    applyPermissions(user.id, next);
    setDraftPermissions((current) => {
      const { [user.id]: _, ...rest } = current;
      return rest;
    });
    setToast("Permissions updated");
    window.setTimeout(() => setToast(null), 2000);
  }

  function openCreateModal() {
    setDraft(emptyDraft());
    setFormErrors({});
    setModalOpen(true);
  }

  function openEditModal(user: RoleUser) {
    setDraft(toDraft(user));
    setFormErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setCopied(false);
    setFormErrors({});
  }

  async function saveUser() {
    const errors = validateUserForm({
      name: draft.name,
      email: draft.email,
      password: draft.password,
      phone: draft.phone,
      type: draft.type,
      isEdit: Boolean(draft.id),
    });
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    if (draft.id) {
      setUsers((current) =>
        current.map((user) =>
          user.id === draft.id
            ? {
                ...user,
                name: draft.name.trim(),
                email: draft.email.trim(),
                phone: draft.phone.trim(),
                type: draft.type,
                password: draft.password ? draft.password : user.password,
              }
            : user,
        ),
      );

      if (isApiConfigured()) {
        void usersApi
          .update(draft.id, {
            name: draft.name.trim(),
            email: draft.email.trim(),
            role: mapRoleUserTypeToApiRole(draft.type),
            ...(draft.password ? { password: draft.password } : {}),
          })
          .catch((error) => {
            notifyApiError(error, "Failed to update user on server.");
          });
      }
    } else {
      let createdId: string | undefined;
      if (isApiConfigured()) {
        try {
          const created = await usersApi.create({
            email: draft.email.trim(),
            password: draft.password,
            name: draft.name.trim(),
            role: mapRoleUserTypeToApiRole(draft.type),
          });
          createdId = created.id;
        } catch (error) {
          notifyApiError(error, "Failed to create user on server.");
        }
      }

      setUsers((current) => {
        const max = current.reduce((acc, user) => {
          const n = Number(user.id.replace(/\D/g, ""));
          return Number.isFinite(n) ? Math.max(acc, n) : acc;
        }, 0);
        return [
          ...current,
          {
            id: createdId ?? `U${String(max + 1).padStart(3, "0")}`,
            name: draft.name.trim(),
            email: draft.email.trim(),
            phone: draft.phone.trim(),
            type: draft.type,
            password: draft.password,
            permissions:
              managedRoles.find((role) => role.name === draft.type)
                ?.permissions ?? permissionsForRoleType(draft.type),
          },
        ];
      });
    }

    closeModal();
    setToast(draft.id ? "User updated" : "User created");
    window.setTimeout(() => setToast(null), 2000);
  }

  function deleteUser() {
    if (!draft.id) return;
    if (isApiConfigured()) {
      void usersApi
        .update(draft.id, { isBlocked: true })
        .catch((error) => {
          notifyApiError(error, "Failed to delete user on server.");
        });
    }
    // Soft-delete access: remove from active users; audit history elsewhere stays
    removeUser(draft.id);
    if (expandedId === draft.id) setExpandedId(null);
    closeModal();
    setToast("User deleted");
    window.setTimeout(() => setToast(null), 2000);
  }

  async function copyPassword() {
    if (!draft.password) return;
    try {
      await navigator.clipboard.writeText(draft.password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FAFAFA]">
      <Header
        title="Roles"
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <SearchField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
            />

            <Select
              value={roleFilter}
              onChange={setRoleFilter}
              aria-label="All Roles"
              options={[
                { value: "", label: "All Roles" },
                ...roleOptions.map((role) => ({ value: role, label: role })),
              ]}
            />

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {sessionPermissions.rolesAddUser ? (
                <Button variant="primary" onClick={openCreateModal}>
                  <Plus size={14} />
                  Add User
                </Button>
              ) : null}
              {sessionPermissions.rolesAccessManagement ? (
                <Button variant="dark" onClick={() => setRoleMgmtOpen(true)}>
                  Role Management
                </Button>
              ) : null}
            </div>
          </div>
        }
      />

      <div className="flex-1 overflow-auto bg-[#FAFAFA] p-4 md:p-7">
        {isBootstrapping ? (
          <AppLoader variant="table" label="Loading users" />
        ) : (
        <ScrollTable
          minWidth={820}
          className="rounded-[12px] border border-[#00000014] bg-white"
        >
          <div
            className={cn(
              "grid grid-cols-[24px_90px_minmax(120px,1fr)_minmax(160px,1.2fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_56px] items-center gap-x-3 border-b border-[#00000014] text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase",
              SUB_ROW_PAD,
            )}
          >
            <div />
            <div>ID</div>
            <div>Name</div>
            <div>Email</div>
            <div>Phone</div>
            <div>Role Name</div>
            <div className="text-right" />
          </div>

          {filteredUsers.map((user, index) => {
            const open = expandedId === user.id;
            const permissions = permissionsFor(user);
            const isLast = index === filteredUsers.length - 1;

            return (
              <div
                key={user.id}
                className={cn(!isLast || open ? "border-b border-[#00000014]" : "")}
              >
                <div
                  className={cn(
                    "grid grid-cols-[24px_90px_minmax(120px,1fr)_minmax(160px,1.2fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_56px] items-center gap-x-3",
                    SUB_ROW_PAD,
                  )}
                >
                  <button
                    type="button"
                    aria-label={open ? "Collapse row" : "Expand row"}
                    onClick={() => toggleExpand(user.id)}
                    className="flex justify-center"
                  >
                    <ChevronRight
                      size={14}
                      className={cn(
                        "text-[#B0B0B0] transition-transform",
                        open && "rotate-90 text-[#F57850]",
                      )}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleExpand(user.id)}
                    className="justify-self-start"
                  >
                    <IdPill>{user.id}</IdPill>
                  </button>

                  <div className="truncate text-[13px] font-semibold text-[#111118]">
                    {user.name}
                  </div>

                  <div className="truncate text-[13px] text-[#111118]">
                    {user.email}
                  </div>
                  <div className="text-[13px] text-[#111118]">{user.phone}</div>
                  <div>
                    <span className="inline-flex rounded-[6px] bg-id-pill px-2 py-1 text-[12px] font-medium text-[#111118]">
                      {user.type}
                    </span>
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => openEditModal(user)}
                      className="text-[13px] font-medium text-[#2165D4]"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {open ? (
                  <div className={cn("border-t border-[#00000014] bg-[#FBF9F9]", SUB_ROW_PAD)}>
                    <div className="overflow-x-auto">
                      <div className="grid min-w-[640px] gap-8 md:grid-cols-2 xl:grid-cols-3">
                        {ROLE_PERMISSION_GROUPS.map((group) => (
                          <div key={group.label}>
                            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
                              {group.label}
                            </h3>
                            <div className="space-y-2.5">
                              <PermissionCheckbox
                                checked={permissions[group.accessKey]}
                                label={group.accessLabel}
                                onChange={() =>
                                  patchPermission(
                                    user,
                                    group.accessKey,
                                    !permissions[group.accessKey],
                                  )
                                }
                              />
                              <div className="space-y-2.5 border-l border-[#00000014] pl-3">
                                {group.actions.map((action) => (
                                  <PermissionCheckbox
                                    key={action.key}
                                    checked={permissions[action.key]}
                                    label={action.label}
                                    onChange={() =>
                                      patchPermission(
                                        user,
                                        action.key,
                                        !permissions[action.key],
                                      )
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end">
                      <Button
                        variant="dark"
                        onClick={() => applyChanges(user)}
                      >
                        Apply Changes
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </ScrollTable>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-none p-6 sm:items-center">
          <button
            type="button"
            aria-label="Close dialog overlay"
            className="absolute inset-0 bg-[#333333]/55"
            onClick={closeModal}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="roles-modal-title"
            data-scroll-lock-allow
            className="relative z-10 w-full max-w-[460px] overflow-hidden overscroll-contain rounded-[14px] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#00000014] px-6 pt-5 pb-3">
              <h2
                id="roles-modal-title"
                className="text-[20px] font-semibold tracking-tight text-[#111118]"
              >
                {draft.id ? "Edit User" : "Add User"}
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={closeModal}
                className="rounded-md p-1 text-[#8A8A8A] hover:bg-[#F5F5F3]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-6 pt-5 pb-5">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-[#2E2E2E]">
                  Name
                </label>
                <Input
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Jane Doe"
                  className="w-full"
                />
                {formErrors.name ? (
                  <p className="mt-1 text-[12px] text-[#E25B5B]">{formErrors.name}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-[#2E2E2E]">
                  Email
                </label>
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="e.g. jane@example.com"
                  className="w-full"
                />
                {formErrors.email ? (
                  <p className="mt-1 text-[12px] text-[#E25B5B]">{formErrors.email}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-[#2E2E2E]">
                  {draft.id ? "Set a New Password" : "Set Password"}
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={draft.password}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder={
                      draft.id
                        ? "Leave blank to keep current password"
                        : "Enter password"
                    }
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    aria-label="Copy password"
                    onClick={copyPassword}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-[#8A8A8A] hover:bg-[#F5F5F3]"
                  >
                    {copied ? (
                      <Check size={14} className="text-[#28402B]" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
                {formErrors.password ? (
                  <p className="mt-1 text-[12px] text-[#E25B5B]">
                    {formErrors.password}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-[#2E2E2E]">
                  Phone
                </label>
                <Input
                  value={draft.phone}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="e.g. (555) 123-4567"
                  className="w-full"
                />
                {formErrors.phone ? (
                  <p className="mt-1 text-[12px] text-[#E25B5B]">{formErrors.phone}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-[#2E2E2E]">
                  Role Name
                </label>
                <Select
                  value={draft.type}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      type: value as RoleUser["type"],
                    }))
                  }
                  className="w-full"
                  size="md"
                  aria-label="Role Name"
                  options={roleOptions.map((role) => ({
                    value: role,
                    label: role,
                  }))}
                />
                {formErrors.type ? (
                  <p className="mt-1 text-[12px] text-[#E25B5B]">{formErrors.type}</p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#00000014] px-6 py-4">
              {draft.id ? (
                <Button variant="dangerGhost" onClick={deleteUser}>
                  Delete User
                </Button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={closeModal}>
                  Cancel
                </Button>
                <Button variant="dark" onClick={saveUser}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <RoleManagementModal
        open={roleMgmtOpen}
        roles={managedRoles}
        onClose={() => setRoleMgmtOpen(false)}
        onSave={(next) => {
          setManagedRoles(next);
          if (isApiConfigured()) {
            for (const role of next) {
              const isLocal = role.id.startsWith("role-");
              if (isLocal) {
                void rolesApi
                  .create({
                    name: role.name,
                    permissions: [],
                  })
                  .catch((error) => {
                    notifyApiError(error, `Failed to create role "${role.name}".`);
                  });
              } else {
                void rolesApi
                  .update(role.id, { name: role.name })
                  .catch((error) => {
                    notifyApiError(error, `Failed to update role "${role.name}".`);
                  });
              }
            }
          }
          showSuccess("Roles saved");
          setToast("Roles saved");
          window.setTimeout(() => setToast(null), 2000);
        }}
      />

      {toast ? (
        <div className="fixed right-6 bottom-6 z-50 rounded-[10px] bg-[#242424] px-4 py-2.5 text-[13px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

import { useMemo, useState } from "react";
import { Check, ChevronRight, Copy, Plus, Search, X } from "lucide-react";

import { Header } from "@/components/layout/AdminHeader";
import { RoleManagementModal } from "@/components/roles/RoleManagementModal";
import { Input } from "@/components/ui/Input";
import { ScrollTable } from "@/components/ui/ScrollTable";
import { Select } from "@/components/ui/Select";
import { useRolesUsers } from "@/context/RolesUsersContext";
import {
  ADMIN_ROLE_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from "@/data/admin";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useScrollLock } from "@/hooks/useScrollLock";
import type { RolePermissions, RoleUser } from "@/types/admin";
import { cn } from "@/utils/cn";
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

const PERMISSION_GROUPS: {
  label: string;
  keys: (keyof RolePermissions)[];
  labels: string[];
}[] = [
  {
    label: "Sidebar Pages",
    keys: [
      "sidebarDashboard",
      "sidebarDistributors",
      "sidebarProductsForSale",
      "sidebarProductOrders",
      "sidebarCustomers",
      "sidebarCustomerOrders",
      "sidebarInventory",
      "sidebarRoles",
    ],
    labels: [
      "Dashboard",
      "Distributors",
      "Products For Sale",
      "Distributor Orders",
      "Customers",
      "Customer Orders",
      "Inventory",
      "Roles",
    ],
  },
  {
    label: "Products For Sale",
    keys: [
      "productsCreate",
      "productsEdit",
      "productsDelete",
      "productsToggleLive",
    ],
    labels: [
      "Create Item",
      "Edit Item",
      "Delete Item",
      "Toggle Live / App Visibility",
    ],
  },
  {
    label: "Customers",
    keys: ["customersCreate", "customersEdit", "customersDelete"],
    labels: ["Create Customer", "Edit Customer", "Delete Customer"],
  },
  {
    label: "Orders",
    keys: ["ordersCreate", "ordersEdit", "ordersDelete", "ordersMarkDelivered"],
    labels: [
      "Create Order",
      "Edit Order",
      "Delete Order",
      "Mark as Delivered",
    ],
  },
];

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
            : "border-[#C9C9C6] bg-white",
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

  const { users, setUsers, applyPermissions, removeUser, managedRoles, setManagedRoles } =
    useRolesUsers();
  const [draftPermissions, setDraftPermissions] = useState<
    Record<string, RolePermissions>
  >({});
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>("U002");
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

  function saveUser() {
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
                // §11: empty password keeps existing
                password: draft.password
                  ? draft.password
                  : user.password,
              }
            : user,
        ),
      );
    } else {
      setUsers((current) => {
        const max = current.reduce((acc, user) => {
          const n = Number(user.id.replace(/\D/g, ""));
          return Number.isFinite(n) ? Math.max(acc, n) : acc;
        }, 0);
        return [
          ...current,
          {
            id: `U${String(max + 1).padStart(3, "0")}`,
            name: draft.name.trim(),
            email: draft.email.trim(),
            phone: draft.phone.trim(),
            type: draft.type,
            password: draft.password,
            permissions:
              draft.type === "Superadmin"
                ? ADMIN_ROLE_PERMISSIONS
                : managedRoles.find((role) => role.name === draft.type)
                    ?.permissions ?? DEFAULT_ROLE_PERMISSIONS,
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <Header
        title="Roles"
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
            <div className="relative w-full sm:w-[220px]">
              <Search
                size={13}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#A9A9A9]"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search ID, name"
                className="h-[34px] rounded-[8px] border-[#E6E6E3] bg-white pl-8 text-[13px]"
              />
            </div>

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
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex h-[34px] items-center gap-1.5 rounded-[8px] bg-[#F57850] px-3.5 text-[13px] font-medium text-white"
              >
                <Plus size={14} />
                Add User
              </button>
              <button
                type="button"
                onClick={() => setRoleMgmtOpen(true)}
                className="inline-flex h-[34px] items-center rounded-[8px] bg-[#2E2E2E] px-3.5 text-[13px] font-medium text-white"
              >
                Role Management
              </button>
            </div>
          </div>
        }
      />

      <div className="flex-1 overflow-auto px-4 py-5 md:px-7">
        <ScrollTable
          minWidth={820}
          className="rounded-[12px] border border-[#ECECEA] bg-white"
        >
          <div className="grid grid-cols-[24px_64px_minmax(120px,1fr)_minmax(160px,1.2fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_56px] items-center gap-x-3 border-b border-[#ECECEA] px-4 py-2.5 text-[11px] font-medium tracking-[0.06em] text-[#6B7180] uppercase">
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
                className={cn(!isLast || open ? "border-b border-[#F0F0EE]" : "")}
              >
                <div className="grid grid-cols-[24px_64px_minmax(120px,1fr)_minmax(160px,1.2fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_56px] items-center gap-x-3 px-4 py-3.5">
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
                    className="w-fit rounded-[6px] bg-id-pill px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#6B6B6B]"
                  >
                    {user.id}
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
                  <div className="border-t border-[#F0F0EE] bg-[#FAFAF8] px-4 py-5 md:px-6">
                    <div className="overflow-x-auto">
                      <div className="grid min-w-[520px] gap-8 md:grid-cols-2 xl:grid-cols-4">
                        {PERMISSION_GROUPS.map((group) => (
                          <div key={group.label}>
                            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#111118] uppercase">
                              {group.label}
                            </h3>
                            <div className="space-y-2.5">
                              {group.keys.map((key, permissionIndex) => (
                                <PermissionCheckbox
                                  key={key}
                                  checked={permissions[key]}
                                  label={group.labels[permissionIndex]}
                                  onChange={() =>
                                    patchPermission(
                                      user,
                                      key,
                                      !permissions[key],
                                    )
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => applyChanges(user)}
                        className="h-[34px] rounded-[8px] bg-[#2E2E2E] px-4 text-[13px] font-medium text-white"
                      >
                        Apply Changes
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </ScrollTable>
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
            <div className="flex items-center justify-between border-b border-[#ECECEA] px-6 pt-5 pb-3">
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
                <label className="mb-1.5 block text-[13px] font-medium text-[#111118]">
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
                  className="h-[40px] rounded-[8px] border-[#E6E6E3] text-[13px]"
                />
                {formErrors.name ? (
                  <p className="mt-1 text-[12px] text-[#E25B5B]">{formErrors.name}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#111118]">
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
                  className="h-[40px] rounded-[8px] border-[#E6E6E3] text-[13px]"
                />
                {formErrors.email ? (
                  <p className="mt-1 text-[12px] text-[#E25B5B]">{formErrors.email}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#111118]">
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
                    className="h-[40px] rounded-[8px] border-[#E6E6E3] pr-10 text-[13px]"
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
                <label className="mb-1.5 block text-[13px] font-medium text-[#111118]">
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
                  className="h-[40px] rounded-[8px] border-[#E6E6E3] text-[13px]"
                />
                {formErrors.phone ? (
                  <p className="mt-1 text-[12px] text-[#E25B5B]">{formErrors.phone}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#111118]">
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

            <div className="flex items-center justify-between border-t border-[#ECECEA] px-6 py-4">
              {draft.id ? (
                <button
                  type="button"
                  onClick={deleteUser}
                  className="text-[13px] font-medium text-[#E25B5B]"
                >
                  Delete User
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-[13px] font-medium text-[#8A8A8A]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveUser}
                  className="h-[36px] rounded-[8px] bg-[#242424] px-5 text-[13px] font-medium text-white"
                >
                  Save
                </button>
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

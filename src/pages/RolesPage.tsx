import { useMemo, useState } from "react";
import { Check, ChevronRight, Copy, Plus, Search, X } from "lucide-react";

import { UserMenu } from "@/components/layout/UserMenu";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  ADMIN_ROLE_PERMISSIONS,
  ADMIN_USERS,
  DEFAULT_ROLE_PERMISSIONS,
} from "@/data/admin";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { RolePermissions, RoleUser } from "@/types/admin";
import { cn } from "@/utils/cn";

const ROLE_OPTIONS: RoleUser["type"][] = [
  "Superadmin",
  "Manager",
  "Warehouse Worker",
  "Driver",
];

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
  type: RoleUser["type"];
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
    <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-[#2E2E2E]">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={onChange}
        className={cn(
          "mt-0.5 flex size-[16px] shrink-0 items-center justify-center rounded-[3px] border transition-colors",
          checked
            ? "border-[#2E2E2E] bg-[#2E2E2E] text-white"
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

  const [users, setUsers] = useState<RoleUser[]>(ADMIN_USERS);
  const [draftPermissions, setDraftPermissions] = useState<
    Record<string, RolePermissions>
  >({});
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>("U002");
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const roleOptions = useMemo(
    () => Array.from(new Set(users.map((user) => user.type))).sort(),
    [users],
  );

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
    setUsers((current) =>
      current.map((entry) =>
        entry.id === user.id ? { ...entry, permissions: next } : entry,
      ),
    );
    setDraftPermissions((current) => {
      const { [user.id]: _, ...rest } = current;
      return rest;
    });
    setToast("Permissions updated");
    window.setTimeout(() => setToast(null), 2000);
  }

  function openCreateModal() {
    setDraft(emptyDraft());
    setModalOpen(true);
  }

  function openEditModal(user: RoleUser) {
    setDraft(toDraft(user));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setCopied(false);
  }

  function saveUser() {
    if (!draft.name.trim() || !draft.email.trim()) return;

    setUsers((current) => {
      if (draft.id) {
        return current.map((user) =>
          user.id === draft.id
            ? {
                ...user,
                name: draft.name.trim(),
                email: draft.email.trim(),
                phone: draft.phone.trim(),
                type: draft.type,
              }
            : user,
        );
      }

      return [
        ...current,
        {
          id: `U${String(current.length + 1).padStart(3, "0")}`,
          name: draft.name.trim(),
          email: draft.email.trim(),
          phone: draft.phone.trim(),
          type: draft.type,
          permissions:
            draft.type === "Superadmin"
              ? ADMIN_ROLE_PERMISSIONS
              : DEFAULT_ROLE_PERMISSIONS,
        },
      ];
    });

    closeModal();
    setToast(draft.id ? "User updated" : "User created");
    window.setTimeout(() => setToast(null), 2000);
  }

  function deleteUser() {
    if (!draft.id) return;
    setUsers((current) => current.filter((user) => user.id !== draft.id));
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F5F5F3]">
      <div className="shrink-0 border-b border-[#ECECEA] bg-white px-7 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#2E2E2E]">
            Roles
          </h1>
          <UserMenu showAvatar className="items-center" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative w-[220px]">
            <Search
              size={13}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#A9A9A9]"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ID, supplier name"
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

          <button
            type="button"
            onClick={openCreateModal}
            className="ml-auto inline-flex h-[34px] items-center gap-1.5 rounded-[8px] bg-[#242424] px-3.5 text-[13px] font-medium text-white"
          >
            <Plus size={14} />
            Add User
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-7 py-5">
        <div className="overflow-hidden rounded-[12px] border border-[#ECECEA] bg-white">
          <div className="grid grid-cols-[28px_72px_1.2fr_1.5fr_1.1fr_1.1fr] items-center gap-2 border-b border-[#ECECEA] px-4 py-2.5 text-[11px] font-semibold tracking-[0.04em] text-[#2E2E2E] uppercase">
            <div />
            <div>ID</div>
            <div>Name</div>
            <div>Email</div>
            <div>Phone</div>
            <div>Role Name</div>
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
                <div className="grid grid-cols-[28px_72px_1.2fr_1.5fr_1.1fr_1.1fr] items-center gap-2 px-4 py-3.5">
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
                    className="w-fit rounded-[6px] bg-[#F3F3F1] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#6B6B6B]"
                  >
                    {user.id}
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(user)}
                    className="text-left text-[13px] font-semibold text-[#2E2E2E] hover:underline"
                  >
                    {user.name}
                  </button>

                  <div className="truncate text-[13px] text-[#2E2E2E]">
                    {user.email}
                  </div>
                  <div className="text-[13px] text-[#2E2E2E]">{user.phone}</div>
                  <div>
                    <span className="inline-flex rounded-[6px] bg-[#F3F3F1] px-2 py-1 text-[12px] font-medium text-[#2E2E2E]">
                      {user.type}
                    </span>
                  </div>
                </div>

                {open ? (
                  <div className="border-t border-[#F0F0EE] bg-[#FAFAF8] px-6 py-5">
                    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
                      {PERMISSION_GROUPS.map((group) => (
                        <div key={group.label}>
                          <h3 className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#2E2E2E] uppercase">
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

                    <div className="mt-5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => applyChanges(user)}
                        className="h-[34px] rounded-[8px] bg-[#242424] px-4 text-[13px] font-medium text-white"
                      >
                        Apply Changes
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6 sm:items-center">
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
            className="relative z-10 w-full max-w-[460px] overflow-hidden rounded-[14px] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h2
                id="roles-modal-title"
                className="text-[20px] font-semibold tracking-tight text-[#2E2E2E]"
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

            <div className="space-y-4 px-6 pb-5">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#2E2E2E]">
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
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#2E2E2E]">
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
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#2E2E2E]">
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
                    placeholder="Enter password"
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
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#2E2E2E]">
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
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#2E2E2E]">
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
                  options={ROLE_OPTIONS.map((role) => ({
                    value: role,
                    label: role,
                  }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-6 pt-1 pb-5">
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

      {toast ? (
        <div className="fixed right-6 bottom-6 z-50 rounded-[10px] bg-[#242424] px-4 py-2.5 text-[13px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

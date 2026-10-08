import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ADMIN_ROLE_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "@/data/admin";
import { getRole } from "@/lib/auth";
import type { ManagedRole, RolePermissions, RoleUser } from "@/types/admin";
import { hasPageAccess } from "@/utils/rolePermissions";
import {
  loadManagedRoles,
  loadRoleUsers,
  saveManagedRoles,
  saveRoleUsers,
} from "@/utils/rolesUsers";

type RolesUsersContextValue = {
  users: RoleUser[];
  setUsers: React.Dispatch<React.SetStateAction<RoleUser[]>>;
  upsertUser: (user: RoleUser) => void;
  removeUser: (id: string) => void;
  applyPermissions: (id: string, permissions: RolePermissions) => void;
  managedRoles: ManagedRole[];
  setManagedRoles: React.Dispatch<React.SetStateAction<ManagedRole[]>>;
  /** Permissions for the signed-in session (UI + route enforcement). */
  sessionPermissions: RolePermissions;
};

const RolesUsersContext = createContext<RolesUsersContextValue | null>(null);

export function RolesUsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsersState] = useState<RoleUser[]>(() => loadRoleUsers());
  const [managedRoles, setManagedRolesState] = useState<ManagedRole[]>(() =>
    loadManagedRoles(),
  );

  const setUsers: React.Dispatch<React.SetStateAction<RoleUser[]>> =
    useCallback((action) => {
      setUsersState((current) => {
        const next = typeof action === "function" ? action(current) : action;
        saveRoleUsers(next);
        return next;
      });
    }, []);

  const setManagedRoles: React.Dispatch<React.SetStateAction<ManagedRole[]>> =
    useCallback((action) => {
      setManagedRolesState((current) => {
        const next = typeof action === "function" ? action(current) : action;
        saveManagedRoles(next);
        return next;
      });
    }, []);

  const upsertUser = useCallback(
    (user: RoleUser) => {
      setUsers((current) => {
        const exists = current.some((entry) => entry.id === user.id);
        if (exists) {
          return current.map((entry) => (entry.id === user.id ? user : entry));
        }
        return [...current, user];
      });
    },
    [setUsers],
  );

  const removeUser = useCallback(
    (id: string) => {
      setUsers((current) => current.filter((entry) => entry.id !== id));
    },
    [setUsers],
  );

  const applyPermissions = useCallback(
    (id: string, permissions: RolePermissions) => {
      setUsers((current) =>
        current.map((entry) =>
          entry.id === id ? { ...entry, permissions } : entry,
        ),
      );
    },
    [setUsers],
  );

  const sessionPermissions = useMemo(() => {
    const role = getRole();
    // Prefer a user that follows the role, so one user's override does not
    // change the session for everyone with that role.
    const byRole = (matches: (type: string) => boolean) =>
      users.find(
        (user) =>
          !user.hasCustomPermissions && matches(user.type.toLowerCase()),
      ) ?? users.find((user) => matches(user.type.toLowerCase()));
    if (role === "warehouse") {
      const warehouse =
        byRole((type) => type.includes("warehouse")) ??
        users.find((user) => user.id === "U003");
      const permissions = warehouse?.permissions ?? DEFAULT_ROLE_PERMISSIONS;
      return hasPageAccess(permissions)
        ? permissions
        : DEFAULT_ROLE_PERMISSIONS;
    }
    const superadmin =
      byRole((type) => type.includes("super") || type === "admin") ??
      users.find((user) => user.id === "U001");
    const permissions = superadmin?.permissions ?? ADMIN_ROLE_PERMISSIONS;
    return hasPageAccess(permissions) ? permissions : ADMIN_ROLE_PERMISSIONS;
  }, [users]);

  const value = useMemo(
    () => ({
      users,
      setUsers,
      upsertUser,
      removeUser,
      applyPermissions,
      managedRoles,
      setManagedRoles,
      sessionPermissions,
    }),
    [
      applyPermissions,
      managedRoles,
      removeUser,
      sessionPermissions,
      setManagedRoles,
      setUsers,
      upsertUser,
      users,
    ],
  );

  return (
    <RolesUsersContext.Provider value={value}>
      {children}
    </RolesUsersContext.Provider>
  );
}

export function useRolesUsers() {
  const context = useContext(RolesUsersContext);
  if (!context) {
    throw new Error("useRolesUsers must be used within RolesUsersProvider");
  }
  return context;
}

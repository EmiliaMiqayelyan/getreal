import {
  mapApiRolesToRoleUsers,
  mapApiUserToRoleUser,
  rolesApi,
  uniqueManagedRoles,
  usersApi,
  type ApiRole,
  type ApiUser,
} from "@/lib/api";
import type { ManagedRole, RoleUser } from "@/types/admin";
import { isUuid } from "@/utils/entityIds";
import { loadManagedRoles } from "@/utils/rolesUsers";

const ROLE_PAGE_LIMIT = 100;
const MAX_ROLE_PAGES = 5;

function hasAssignedUser(member: ApiRole["user"]): boolean {
  if (!member) return false;
  return Boolean(
    member.email?.trim() ||
    member.name?.trim() ||
    member.userCode?.trim() ||
    (member.id && isUuid(member.id)) ||
    (member.userId && isUuid(member.userId)),
  );
}

/** Flatten role rows that embed one user or a users array. */
function assignmentRoles(roles: ApiRole[]): ApiRole[] {
  const rows: ApiRole[] = [];
  for (const role of roles) {
    if (hasAssignedUser(role.user) && !role.user?.isBlocked) rows.push(role);
    for (const member of role.users ?? []) {
      if (!hasAssignedUser(member) || member.isBlocked) continue;
      rows.push({ ...role, user: member });
    }
  }
  return rows;
}

function isCustomer(user: ApiUser): boolean {
  return (user.role ?? "").trim().toLowerCase() === "customer";
}

function isBlocked(user: ApiUser): boolean {
  const status = (user.status ?? "").trim().toLowerCase();
  return user.isBlocked === true || status === "blocked";
}

function mergeRoleUsers(entries: RoleUser[]): RoleUser[] {
  const byKey = new Map<string, RoleUser>();
  for (const entry of entries) {
    const key = entry.recordId || entry.email.trim().toLowerCase() || entry.id;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, entry);
      continue;
    }
    const name =
      entry.name && entry.name !== "User" ? entry.name : existing.name;
    byKey.set(key, {
      ...existing,
      ...entry,
      name,
      email: entry.email || existing.email,
      phone: entry.phone || existing.phone,
      recordId: entry.recordId || existing.recordId,
      roleId: entry.roleId || existing.roleId,
      roleCode: entry.roleCode || existing.roleCode,
      id: existing.id.startsWith("role-user-") ? entry.id : existing.id,
    });
  }
  return Array.from(byKey.values());
}

function matchManagedRole(
  user: RoleUser,
  roles: ManagedRole[],
): ManagedRole | undefined {
  return roles.find((role) => {
    const pathId = serverRoleId(role);
    if (user.roleId) {
      if (
        role.recordId === user.roleId ||
        role.id === user.roleId ||
        pathId === user.roleId
      ) {
        return true;
      }
    }
    if (isUnassignedRoleRow(user) && user.id.startsWith("unassigned-role-")) {
      const rowRoleId = user.id.slice("unassigned-role-".length);
      if (
        rowRoleId &&
        (pathId === rowRoleId ||
          role.id === rowRoleId ||
          role.recordId === rowRoleId)
      ) {
        return true;
      }
    }
    return role.name.trim().toLowerCase() === user.type.trim().toLowerCase();
  });
}

function withRolePermissions(user: RoleUser, roles: ManagedRole[]): RoleUser {
  const match = matchManagedRole(user, roles);
  if (!match) return user;
  return {
    ...user,
    type: match.name,
    roleId: match.recordId ?? user.roleId,
    roleCode: user.roleCode || match.roleCode,
    permissions: match.permissions,
  };
}

export function isUnassignedRoleRow(user: RoleUser): boolean {
  return user.id.startsWith("unassigned-role-");
}

function placeholderUserForRole(role: ManagedRole): RoleUser {
  const pathId = serverRoleId(role);
  return {
    id: pathId ? `unassigned-role-${pathId}` : `unassigned-role-${role.id}`,
    roleId: role.recordId,
    roleCode: role.roleCode,
    name: "—",
    email: "",
    phone: "",
    type: role.name,
    password: "",
    permissions: role.permissions,
  };
}

function withPlaceholdersForUnassignedRoles(
  users: RoleUser[],
  roles: ManagedRole[],
): RoleUser[] {
  const next = [...users];
  for (const role of roles) {
    const hasUser = next.some(
      (user) => !isUnassignedRoleRow(user) && matchManagedRole(user, [role]),
    );
    if (!hasUser) {
      next.push(placeholderUserForRole(role));
    }
  }
  return next;
}

async function loadRoleRows(): Promise<ApiRole[]> {
  const collected: ApiRole[] = [];
  let page = 1;

  while (page <= MAX_ROLE_PAGES) {
    const result = await rolesApi.list({
      page,
      limit: ROLE_PAGE_LIMIT,
      fresh: page === 1,
    });
    collected.push(...result.items);
    if (
      result.items.length === 0 ||
      result.items.length < result.limit ||
      collected.length >= result.total
    ) {
      break;
    }
    page += 1;
  }

  return collected;
}

/** Prefer stored checkbox state; API permission strings are coarser than the UI. */
function mergeManagedRolesWithStored(fromApi: ManagedRole[]): ManagedRole[] {
  const stored = loadManagedRoles();
  if (!stored.length) return fromApi;

  return fromApi.map((role) => {
    const pathId = serverRoleId(role);
    const cached = stored.find(
      (entry) =>
        (pathId && serverRoleId(entry) === pathId) ||
        entry.id === role.id ||
        (role.recordId && entry.recordId === role.recordId),
    );
    if (!cached) return role;
    return {
      ...role,
      permissions: cached.permissions,
      apiPermissions: cached.apiPermissions ?? role.apiPermissions,
    };
  });
}

/** Roles plus assigned staff. One roles list, and a single users list only if roles include no people. */
export async function loadRolesDirectory(): Promise<{
  users: RoleUser[];
  roles: ManagedRole[];
}> {
  const roleRows = await loadRoleRows();
  const roles = mergeManagedRolesWithStored(uniqueManagedRoles(roleRows));

  const assignmentUsers = mapApiRolesToRoleUsers(
    assignmentRoles(roleRows),
  ).filter((user) => user.type.trim().toLowerCase() !== "customer");

  let listed: RoleUser[] = [];
  if (assignmentUsers.length === 0) {
    const usersPage = await usersApi.list({ page: 1, limit: ROLE_PAGE_LIMIT });
    listed = usersPage.items
      .filter((user) => !isCustomer(user) && !isBlocked(user))
      .map((user, index) => mapApiUserToRoleUser(user, index));
  }

  const merged = mergeRoleUsers([...assignmentUsers, ...listed]).map((user) =>
    withRolePermissions(user, roles),
  );

  return {
    roles,
    users: withPlaceholdersForUnassignedRoles(merged, roles),
  };
}

export function serverRoleId(role: {
  id: string;
  recordId?: string;
}): string | undefined {
  if (role.recordId && isUuid(role.recordId)) return role.recordId;
  if (isUuid(role.id)) return role.id;
  return undefined;
}

export function isUnsavedRole(role: {
  id: string;
  recordId?: string;
}): boolean {
  return role.id.startsWith("role-") && !role.recordId;
}

export function findManagedRoleForUser(
  user: RoleUser,
  roles: ManagedRole[],
): ManagedRole | undefined {
  return matchManagedRole(user, roles);
}

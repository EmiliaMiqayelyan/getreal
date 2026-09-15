import { useEffect } from "react";

import { useAppCatalog } from "@/context/AppCatalogContext";
import { useRolesUsers } from "@/context/RolesUsersContext";
import {
  isApiConfigured,
  mapApiProductToItem,
  mapApiRoleToManagedRole,
  mapApiUserToRoleUser,
  normalizeProductsList,
  normalizeRolesList,
  normalizeUsersList,
  productsApi,
  rolesApi,
  usersApi,
} from "@/lib/api";

/**
 * Loads remote catalog, users, and roles when VITE_API_URL is set.
 * Falls back silently to seeded mock data on failure.
 */
export function ApiBootstrap() {
  const { setItems } = useAppCatalog();
  const { setUsers, setManagedRoles } = useRolesUsers();

  useEffect(() => {
    if (!isApiConfigured()) return;

    let cancelled = false;

    async function load() {
      try {
        const [productsPayload, usersPayload, rolesPayload] = await Promise.all([
          productsApi.list(),
          usersApi.list({ page: 1, limit: 100 }),
          rolesApi.list(),
        ]);

        if (cancelled) return;

        const products = normalizeProductsList(productsPayload);
        if (products.length > 0) {
          const mapped = products.map(mapApiProductToItem);
          setItems((current) => {
            const byId = new Map(current.map((item) => [item.id, item]));
            for (const item of mapped) {
              if (!byId.has(item.id)) byId.set(item.id, item);
            }
            return Array.from(byId.values());
          });
        }

        const apiUsers = normalizeUsersList(usersPayload);
        if (apiUsers.length > 0) {
          setUsers(apiUsers.map(mapApiUserToRoleUser));
        }

        const apiRoles = normalizeRolesList(rolesPayload);
        if (apiRoles.length > 0) {
          setManagedRoles(apiRoles.map(mapApiRoleToManagedRole));
        }
      } catch {
        // Keep mock seeds when API is unavailable or returns errors.
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [setItems, setManagedRoles, setUsers]);

  return null;
}

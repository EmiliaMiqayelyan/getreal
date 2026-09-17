import { useEffect } from "react";

import { useAppCatalog } from "@/context/AppCatalogContext";
import { useRolesUsers } from "@/context/RolesUsersContext";
import {
  categoriesApi,
  distributorsApi,
  isApiConfigured,
  itemsApi,
  mapApiDistributorToDistributor,
  mapApiItemToItem,
  mapApiProductToProductForSale,
  mapApiRoleToManagedRole,
  mapApiSourceToSource,
  mapApiUserToRoleUser,
  normalizeRolesList,
  normalizeUsersList,
  productsApi,
  rolesApi,
  sourcesApi,
  usersApi,
} from "@/lib/api";

function mergeById<T extends { id: string }>(seed: T[], api: T[]): T[] {
  const byId = new Map(seed.map((entry) => [entry.id, entry]));
  for (const entry of api) {
    byId.set(entry.id, entry);
  }
  return Array.from(byId.values());
}

/**
 * Loads remote catalog, users, and roles when VITE_API_URL is set.
 * Merges API rows with temporary mock seeds (API wins on same id).
 * Falls back silently to seeded mock data on failure.
 */
export function ApiBootstrap() {
  const { setDistributors, setItems, setProducts, setSources } = useAppCatalog();
  const { setUsers, setManagedRoles } = useRolesUsers();

  useEffect(() => {
    if (!isApiConfigured()) return;

    let cancelled = false;

    async function load() {
      try {
        const [
          distributorsPayload,
          sourcesPayload,
          itemsPayload,
          productsPayload,
          categoriesPayload,
          usersPayload,
          rolesPayload,
        ] = await Promise.all([
          distributorsApi.list().catch(() => []),
          sourcesApi.list().catch(() => []),
          itemsApi.list().catch(() => []),
          productsApi.list().catch(() => []),
          categoriesApi.list().catch(() => []),
          usersApi.list({ page: 1, limit: 100 }).catch(() => []),
          rolesApi.list().catch(() => []),
        ]);

        if (cancelled) return;

        const apiDistributors = distributorsPayload.map(
          mapApiDistributorToDistributor,
        );
        if (apiDistributors.length > 0) {
          setDistributors((current) => mergeById(current, apiDistributors));
        }

        const distributorsById = new Map(
          apiDistributors.map((entry) => [entry.id, entry.name] as const),
        );

        const apiSources = sourcesPayload.map((source, index) =>
          mapApiSourceToSource(source, index, distributorsById),
        );
        if (apiSources.length > 0) {
          setSources((current) => mergeById(current, apiSources));
        }

        const categoriesById = new Map(
          categoriesPayload
            .filter((category) => category.id && category.name)
            .map((category) => [category.id as string, category.name as string]),
        );

        const apiItems = itemsPayload.map((item, index) =>
          mapApiItemToItem(item, index, {
            categoriesById,
            distributorsById,
          }),
        );

        if (apiItems.length > 0) {
          setItems((current) => mergeById(current, apiItems));
        }

        const products = productsPayload.map((product, index) =>
          mapApiProductToProductForSale(product, index, apiItems),
        );
        if (products.length > 0) {
          setProducts((current) => mergeById(current, products));
        }

        const apiUsers = normalizeUsersList(usersPayload);
        if (apiUsers.length > 0) {
          setUsers((current) =>
            mergeById(current, apiUsers.map(mapApiUserToRoleUser)),
          );
        }

        const apiRoles = normalizeRolesList(rolesPayload);
        if (apiRoles.length > 0) {
          setManagedRoles((current) =>
            mergeById(current, apiRoles.map(mapApiRoleToManagedRole)),
          );
        }
      } catch {
        // Keep mock seeds when API is unavailable or returns errors.
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
    // Run once on mount when API is configured.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

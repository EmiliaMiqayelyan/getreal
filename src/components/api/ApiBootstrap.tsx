import { useEffect } from "react";

import { useAppCatalog } from "@/context/AppCatalogContext";
import { useRolesUsers } from "@/context/RolesUsersContext";
import { useToast } from "@/context/ToastContext";
import {
  categoriesApi,
  distributorsApi,
  formatApiError,
  isApiConfigured,
  itemsApi,
  mapApiDistributorToDistributor,
  mapApiItemToItem,
  mapApiProductToProductForSale,
  mapApiRoleToManagedRole,
  mapApiSourceToSource,
  mapApiSubcategoryToCatalog,
  mapApiUserToRoleUser,
  normalizeRolesList,
  productsApi,
  rolesApi,
  sourcesApi,
  subcategoriesApi,
  usersApi,
} from "@/lib/api";

function mergeById<T extends { id: string }>(seed: T[], api: T[]): T[] {
  const byId = new Map(seed.map((entry) => [entry.id, entry]));
  for (const entry of api) {
    byId.set(entry.id, entry);
  }
  return Array.from(byId.values());
}

type LoadResult<T> = { ok: true; data: T } | { ok: false; error: unknown };

async function loadOne<T>(promise: Promise<T>): Promise<LoadResult<T>> {
  try {
    return { ok: true, data: await promise };
  } catch (error) {
    return { ok: false, error };
  }
}

/**
 * Loads remote catalog, users, and roles when VITE_API_URL is set.
 * Replaces local catalog state with API rows when present.
 * Surfaces load failures via toast.
 */
export function ApiBootstrap() {
  const {
    setDistributors,
    setItems,
    setProducts,
    setSources,
    setCategories,
    setSubcategoryRecords,
    setBootstrapping,
  } = useAppCatalog();
  const { setUsers, setManagedRoles } = useRolesUsers();
  const { showError } = useToast();

  useEffect(() => {
    if (!isApiConfigured()) {
      setBootstrapping(false);
      return;
    }

    let cancelled = false;
    setBootstrapping(true);

    async function load() {
      try {
        const [
          distributorsResult,
          sourcesResult,
          itemsResult,
          productsResult,
          categoriesResult,
          subcategoriesResult,
          usersResult,
          rolesResult,
        ] = await Promise.all([
          loadOne(distributorsApi.list()),
          loadOne(sourcesApi.list()),
          loadOne(itemsApi.list()),
          loadOne(productsApi.list()),
          loadOne(categoriesApi.list()),
          loadOne(subcategoriesApi.list()),
          loadOne(usersApi.list({ page: 1, limit: 100 })),
          loadOne(rolesApi.list()),
        ]);

        if (cancelled) return;

        const failures: string[] = [];
        const noteFailure = (label: string, result: LoadResult<unknown>) => {
          if (result.ok) return;
          failures.push(`${label}: ${formatApiError(result.error)}`);
        };

        noteFailure("Distributors", distributorsResult);
        noteFailure("Sources", sourcesResult);
        noteFailure("Items", itemsResult);
        noteFailure("Products", productsResult);
        noteFailure("Categories", categoriesResult);
        noteFailure("Subcategories", subcategoriesResult);
        noteFailure("Users", usersResult);
        noteFailure("Roles", rolesResult);

        const distributorsPayload = distributorsResult.ok
          ? distributorsResult.data
          : [];
        const sourcesPayload = sourcesResult.ok ? sourcesResult.data : [];
        const itemsPayload = itemsResult.ok ? itemsResult.data : [];
        const productsPayload = productsResult.ok ? productsResult.data : [];
        const categoriesPayload = categoriesResult.ok
          ? categoriesResult.data
          : [];
        const subcategoriesPayload = subcategoriesResult.ok
          ? subcategoriesResult.data
          : [];
        const usersPayload = usersResult.ok ? usersResult.data : null;
        const rolesPayload = rolesResult.ok ? rolesResult.data : [];

        const apiDistributors = distributorsPayload.map(
          mapApiDistributorToDistributor,
        );
        if (apiDistributors.length > 0) {
          setDistributors((current) => mergeById(current, apiDistributors));
        }

        const distributorsById = new Map<string, string>();
        for (const entry of apiDistributors) {
          distributorsById.set(entry.id, entry.name);
          if (entry.recordId) distributorsById.set(entry.recordId, entry.name);
        }

        const apiSources = sourcesPayload.map((source, index) =>
          mapApiSourceToSource(source, index, distributorsById),
        );
        if (apiSources.length > 0) {
          setSources((current) => mergeById(current, apiSources));
        }

        if (categoriesPayload.length > 0) {
          setCategories(categoriesPayload);
        }

        const categoriesById = new Map(
          categoriesPayload
            .filter((category) => category.id && category.name)
            .map((category) => [category.id as string, category.name as string]),
        );

        const catalogSubcategories = subcategoriesPayload
          .map((entry) => mapApiSubcategoryToCatalog(entry, categoriesById))
          .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
        setSubcategoryRecords(catalogSubcategories);

        const subcategoriesById = new Map(
          catalogSubcategories
            .filter((entry) => entry.id)
            .map((entry) => [entry.id as string, entry.name] as const),
        );

        const apiItems = itemsPayload.map((item, index) =>
          mapApiItemToItem(item, index, {
            categoriesById,
            distributorsById,
            subcategoriesById,
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

        const apiUsers = usersPayload?.items ?? [];
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

        if (failures.length > 0) {
          const preview = failures.slice(0, 2).join(" | ");
          showError(
            failures.length > 2
              ? `Some data failed to load (${failures.length}). ${preview}`
              : `Some data failed to load. ${preview}`,
          );
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
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

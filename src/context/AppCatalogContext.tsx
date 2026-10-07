import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { DISTRIBUTORS } from "@/constants/distributors";
import { ITEMS } from "@/constants/items";
import { PRODUCTS_FOR_SALE } from "@/constants/productsForSale";
import { SOURCES } from "@/constants/sources";
import { formatApiError, isApiConfigured, subcategoriesApi } from "@/lib/api";
import {
  loadCatalogSlices,
  type CatalogLookup,
  type CatalogSlice,
} from "@/lib/catalog/loadCatalogSlices";
import { useToast } from "@/context/ToastContext";
import { findCategoryIdByName } from "@/lib/api/mappers";
import type { ApiCategory, CatalogSubcategory } from "@/lib/api/types";
import type { Distributor } from "@/types/distributor";
import type { Item } from "@/types/item";
import type { ProductForSale } from "@/types/productForSale";
import type { Source } from "@/types/source";
import {
  attachDistributorIds,
  syncCatalogItemsForSources,
  syncCatalogProductsForItems,
  syncCatalogProductsForSources,
  syncDistributorReferences,
  syncDistributorsForSources,
  withResolvedDistributor,
} from "@/utils/distributorSync";
import { nextDistributorId } from "@/utils/distributors";
import { apiId, findByEntityRef, isUuid } from "@/utils/entityIds";
import {
  attachSourceIds,
  getSourceLocation,
  normalizeSourceDistributor,
  resolveSourceId,
} from "@/utils/sources";
import {
  addSubcategoryToMap,
  catalogRecordsFromMap,
  findCatalogSubcategory,
  loadSubcategories,
  mapFromCatalogRecords,
  removeSubcategoryFromMap,
  renameSubcategoryInMap,
  saveSubcategories,
  type SubcategoryMap,
} from "@/utils/subcategories";

type SaveDistributorMode = "create" | "update";

type AppCatalogContextValue = {
  distributors: Distributor[];
  items: Item[];
  sources: Source[];
  products: ProductForSale[];
  categories: ApiCategory[];
  subcategoryRecords: CatalogSubcategory[];
  subcategoriesByCategory: SubcategoryMap;
  /** Slices already loaded from the API during this session. */
  loadedSlices: CatalogSlice[];
  /**
   * Load these catalog resources.
   * `fresh` requests them again even when this session already has them.
   */
  ensureCatalog: (
    slices: readonly CatalogSlice[],
    options?: { fresh?: boolean },
  ) => Promise<void>;
  setDistributors: (
    updater: Distributor[] | ((current: Distributor[]) => Distributor[]),
  ) => void;
  setItems: (updater: Item[] | ((current: Item[]) => Item[])) => void;
  setSources: (updater: Source[] | ((current: Source[]) => Source[])) => void;
  setProducts: (
    updater: ProductForSale[] | ((current: ProductForSale[]) => ProductForSale[]),
  ) => void;
  setCategories: (
    updater: ApiCategory[] | ((current: ApiCategory[]) => ApiCategory[]),
  ) => void;
  setSubcategoryRecords: (
    updater:
      | CatalogSubcategory[]
      | ((current: CatalogSubcategory[]) => CatalogSubcategory[]),
  ) => void;
  saveDistributor: (
    distributor: Distributor,
    mode: SaveDistributorMode,
    previous?: Distributor | null,
  ) => void;
  removeDistributor: (id: string) => void;
  getDistributorById: (id: string) => Distributor | undefined;
  addSubcategory: (category: string, name: string) => Promise<string | null>;
  renameSubcategory: (
    category: string,
    previous: string,
    nextName: string,
  ) => Promise<string | null>;
  removeSubcategory: (category: string, name: string) => Promise<string | null>;
};

const AppCatalogContext = createContext<AppCatalogContextValue | null>(null);

function bootstrapCatalog() {
  const distributors = [...DISTRIBUTORS];
  const sources = attachDistributorIds(SOURCES, distributors);
  const items = attachSourceIds(attachDistributorIds(ITEMS, distributors), sources);
  const products = attachSourceIds(
    attachDistributorIds(PRODUCTS_FOR_SALE, distributors),
    sources,
  );
  return { distributors, items, sources, products };
}

function applySubcategoryRename(
  items: Item[],
  products: ProductForSale[],
  category: string,
  previous: string,
  nextName: string,
  nextId?: string,
) {
  return {
    items: items.map((item) =>
      item.category === category && item.subcategory === previous
        ? {
            ...item,
            subcategory: nextName,
            subcategoryId: nextId ?? item.subcategoryId,
          }
        : item,
    ),
    products: products.map((product) =>
      product.category === category && product.subcategory === previous
        ? { ...product, subcategory: nextName }
        : product,
    ),
  };
}

function applySubcategoryRemoval(
  items: Item[],
  products: ProductForSale[],
  category: string,
  name: string,
) {
  return {
    items: items.map((item) =>
      item.category === category && item.subcategory === name
        ? { ...item, subcategory: "", subcategoryId: undefined }
        : item,
    ),
    products: products.map((product) =>
      product.category === category && product.subcategory === name
        ? { ...product, subcategory: "" }
        : product,
    ),
  };
}

export function AppCatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState(bootstrapCatalog);
  const [categories, setCategoriesState] = useState<ApiCategory[]>([]);
  const [subcategoryRecords, setSubcategoryRecordsState] = useState<
    CatalogSubcategory[]
  >(() => catalogRecordsFromMap(loadSubcategories()));
  const [loadedSlices, setLoadedSlices] = useState<CatalogSlice[]>([]);
  const loadedRef = useRef<Set<CatalogSlice>>(new Set());
  const inflightRef = useRef<Map<CatalogSlice, Promise<void>>>(new Map());
  const { showError } = useToast();

  const subcategoriesByCategory = useMemo(
    () => mapFromCatalogRecords(subcategoryRecords),
    [subcategoryRecords],
  );

  const setDistributors = useCallback(
    (
      updater:
        | Distributor[]
        | ((current: Distributor[]) => Distributor[]),
    ) => {
      setCatalog((current) => {
        const distributors =
          typeof updater === "function"
            ? updater(current.distributors)
            : updater;
        return { ...current, distributors };
      });
    },
    [],
  );

  const saveDistributor = useCallback(
    (
      distributor: Distributor,
      mode: SaveDistributorMode,
      previous: Distributor | null = null,
    ) => {
      setCatalog((current) => {
        const distributors =
          mode === "create"
            ? [distributor, ...current.distributors]
            : current.distributors.map((entry) =>
                entry.id === distributor.id ? distributor : entry,
              );

        const synced = syncDistributorReferences(
          distributor,
          mode === "update" ? previous : null,
          current,
        );

        return {
          distributors,
          items: synced.items,
          sources: synced.sources,
          products: synced.products,
        };
      });
    },
    [],
  );

  const removeDistributor = useCallback((id: string) => {
    setCatalog((current) => ({
      ...current,
      distributors: current.distributors.filter((entry) => entry.id !== id),
    }));
  }, []);

  const setItems = useCallback(
    (updater: Item[] | ((current: Item[]) => Item[])) => {
      setCatalog((current) => {
        const nextItems =
          typeof updater === "function" ? updater(current.items) : updater;
        const items = nextItems.map((item) => {
          const resolved = withResolvedDistributor(item, current.distributors);
          const sourceId =
            resolved.sourceId ?? resolveSourceId(resolved.source, current.sources);
          const source = sourceId
            ? findByEntityRef(current.sources, sourceId)
            : current.sources.find((entry) => entry.name === resolved.source);

          return {
            ...resolved,
            sourceId: source ? apiId(source) : sourceId,
            source: source?.name ?? resolved.source,
          };
        });
        const products = syncCatalogProductsForItems(items, current.products);
        return { ...current, items, products };
      });
    },
    [],
  );

  const setSources = useCallback(
    (updater: Source[] | ((current: Source[]) => Source[])) => {
      setCatalog((current) => {
        const nextSources =
          typeof updater === "function" ? updater(current.sources) : updater;
        const sources = nextSources.map((source) => {
          const resolved = normalizeSourceDistributor(
            withResolvedDistributor(source, current.distributors),
          );
          return {
            ...resolved,
            location: getSourceLocation(resolved),
          };
        });
        const items = syncCatalogItemsForSources(
          sources,
          current.items,
          current.sources,
        );
        const products = syncCatalogProductsForSources(
          sources,
          current.products,
          items,
          current.sources,
        );
        const distributors = syncDistributorsForSources(
          sources,
          current.distributors,
          current.sources,
        );

        return {
          ...current,
          distributors,
          sources,
          items,
          products,
        };
      });
    },
    [],
  );

  const setProducts = useCallback(
    (
      updater:
        | ProductForSale[]
        | ((current: ProductForSale[]) => ProductForSale[]),
    ) => {
      setCatalog((current) => {
        const nextProducts =
          typeof updater === "function"
            ? updater(current.products)
            : updater;
        return {
          ...current,
          products: nextProducts.map((product) =>
            withResolvedDistributor(product, current.distributors),
          ),
        };
      });
    },
    [],
  );

  const setCategories = useCallback(
    (
      updater: ApiCategory[] | ((current: ApiCategory[]) => ApiCategory[]),
    ) => {
      setCategoriesState((current) =>
        typeof updater === "function" ? updater(current) : updater,
      );
    },
    [],
  );

  const setSubcategoryRecords = useCallback(
    (
      updater:
        | CatalogSubcategory[]
        | ((current: CatalogSubcategory[]) => CatalogSubcategory[]),
    ) => {
      setSubcategoryRecordsState((current) => {
        const next =
          typeof updater === "function" ? updater(current) : updater;
        if (!isApiConfigured()) {
          saveSubcategories(mapFromCatalogRecords(next));
        }
        return next;
      });
    },
    [],
  );

  const getDistributorById = useCallback(
    (id: string) => catalog.distributors.find((entry) => entry.id === id),
    [catalog.distributors],
  );

  const addSubcategory = useCallback(
    async (category: string, name: string) => {
      const trimmed = name.trim();
      const localResult = addSubcategoryToMap(
        mapFromCatalogRecords(subcategoryRecords),
        category,
        trimmed,
      );
      if (!localResult.ok) return localResult.error;

      if (isApiConfigured()) {
        const categoryId = findCategoryIdByName(categories, category);
        if (!categoryId) {
          return "Category is not available on the server yet.";
        }
        try {
          const created = await subcategoriesApi.create({
            name: trimmed,
            categoryId,
          });
          setSubcategoryRecords((current) => [
            ...current,
            {
              id: created.subcategoryCode?.trim() || created.id,
              recordId: isUuid(created.id) ? created.id : undefined,
              name: created.name?.trim() || trimmed,
              category,
              categoryId:
                created.categoryId && isUuid(created.categoryId)
                  ? created.categoryId
                  : categoryId,
            },
          ]);
          return null;
        } catch (error) {
          return formatApiError(error, "Failed to create subcategory.");
        }
      }

      setSubcategoryRecords(catalogRecordsFromMap(localResult.map));
      return null;
    },
    [categories, subcategoryRecords, setSubcategoryRecords],
  );

  const renameSubcategory = useCallback(
    async (category: string, previous: string, nextName: string) => {
      const trimmed = nextName.trim();
      const localResult = renameSubcategoryInMap(
        mapFromCatalogRecords(subcategoryRecords),
        category,
        previous,
        trimmed,
      );
      if (!localResult.ok) return localResult.error;

      const existing = findCatalogSubcategory(
        subcategoryRecords,
        category,
        previous,
      );

      if (isApiConfigured()) {
        const pathId =
          existing?.recordId && isUuid(existing.recordId)
            ? existing.recordId
            : existing?.id && isUuid(existing.id)
              ? existing.id
              : undefined;
        if (!pathId) {
          return "Subcategory is not available on the server yet.";
        }
        try {
          const updated = await subcategoriesApi.update(pathId, {
            name: trimmed,
          });
          const resolvedName = updated.name?.trim() || trimmed;
          setSubcategoryRecords((current) =>
            current.map((entry) =>
              entry.category === category && entry.name === previous
                ? {
                    ...entry,
                    id: updated.id ?? entry.id,
                    name: resolvedName,
                    categoryId: updated.categoryId ?? entry.categoryId,
                  }
                : entry,
            ),
          );
          setCatalog((current) => ({
            ...current,
            ...applySubcategoryRename(
              current.items,
              current.products,
              category,
              previous,
              resolvedName,
              updated.id ?? pathId,
            ),
          }));
          return null;
        } catch (error) {
          return formatApiError(error, "Failed to update subcategory.");
        }
      }

      setSubcategoryRecords(catalogRecordsFromMap(localResult.map));
      setCatalog((current) => ({
        ...current,
        ...applySubcategoryRename(
          current.items,
          current.products,
          category,
          previous,
          trimmed,
        ),
      }));
      return null;
    },
    [subcategoryRecords, setSubcategoryRecords],
  );

  const removeSubcategory = useCallback(
    async (category: string, name: string) => {
      const localResult = removeSubcategoryFromMap(
        mapFromCatalogRecords(subcategoryRecords),
        category,
        name,
      );
      if (!localResult.ok) return localResult.error;

      const existing = findCatalogSubcategory(
        subcategoryRecords,
        category,
        name,
      );

      if (isApiConfigured()) {
        const pathId =
          existing?.recordId && isUuid(existing.recordId)
            ? existing.recordId
            : existing?.id && isUuid(existing.id)
              ? existing.id
              : undefined;
        if (!pathId) {
          return "Subcategory is not available on the server yet.";
        }
        try {
          await subcategoriesApi.remove(pathId);
          setSubcategoryRecords((current) =>
            current.filter(
              (entry) =>
                !(entry.category === category && entry.name === name),
            ),
          );
          setCatalog((current) => ({
            ...current,
            ...applySubcategoryRemoval(
              current.items,
              current.products,
              category,
              name,
            ),
          }));
          return null;
        } catch (error) {
          return formatApiError(error, "Failed to delete subcategory.");
        }
      }

      setSubcategoryRecords(catalogRecordsFromMap(localResult.map));
      setCatalog((current) => ({
        ...current,
        ...applySubcategoryRemoval(
          current.items,
          current.products,
          category,
          name,
        ),
      }));
      return null;
    },
    [subcategoryRecords, setSubcategoryRecords],
  );

  const lookupRef = useRef<CatalogLookup>({
    distributors: catalog.distributors,
    sources: catalog.sources,
    items: catalog.items,
    categories,
    subcategoryRecords,
    products: catalog.products,
  });
  lookupRef.current = {
    distributors: catalog.distributors,
    sources: catalog.sources,
    items: catalog.items,
    categories,
    subcategoryRecords,
    products: catalog.products,
  };

  const ensureCatalog = useCallback(
    async (
      slices: readonly CatalogSlice[],
      options?: { fresh?: boolean },
    ) => {
      if (!isApiConfigured() || slices.length === 0) return;

      const fresh = options?.fresh ?? false;
      const needed = fresh
        ? [...slices]
        : slices.filter((slice) => !loadedRef.current.has(slice));
      if (needed.length === 0) return;

      const waiting = needed.filter((slice) => inflightRef.current.has(slice));
      const toStart = needed.filter((slice) => !inflightRef.current.has(slice));

      if (toStart.length === 0) {
        await Promise.all(
          waiting.map((slice) => inflightRef.current.get(slice)!),
        );
        return;
      }

      let finish = () => {};
      const done = new Promise<void>((resolve) => {
        finish = resolve;
      });
      for (const slice of toStart) inflightRef.current.set(slice, done);

      try {
        if (waiting.length > 0) {
          await Promise.all(
            waiting.map((slice) => inflightRef.current.get(slice)!),
          );
        }
        const result = await loadCatalogSlices(toStart, lookupRef.current, {
          fresh,
        });
        // Replace the slice with the server list so removals show up on return.
        if (result.distributors) setDistributors(result.distributors);
        if (result.sources) setSources(result.sources);
        if (result.categories) setCategories(result.categories);
        if (result.subcategories) setSubcategoryRecords(result.subcategories);
        if (result.items) setItems(result.items);
        if (result.products) setProducts(result.products);
        if (result.failures.length > 0) {
          const preview = result.failures.slice(0, 2).join(" | ");
          showError(
            result.failures.length > 2
              ? `Some data failed to load (${result.failures.length}). ${preview}`
              : `Some data failed to load. ${preview}`,
          );
        }
      } finally {
        for (const slice of toStart) loadedRef.current.add(slice);
        setLoadedSlices((current) => {
          const next = [...loadedRef.current];
          if (
            current.length === next.length &&
            next.every((slice) => current.includes(slice))
          ) {
            return current;
          }
          return next;
        });
        for (const slice of toStart) {
          if (inflightRef.current.get(slice) === done) {
            inflightRef.current.delete(slice);
          }
        }
        finish();
      }
    },
    [setCategories, setDistributors, setItems, setProducts, setSources, setSubcategoryRecords, showError],
  );

  const value = useMemo(
    () => ({
      distributors: catalog.distributors,
      items: catalog.items,
      sources: catalog.sources,
      products: catalog.products,
      categories,
      subcategoryRecords,
      subcategoriesByCategory,
      loadedSlices,
      ensureCatalog,
      setDistributors,
      setItems,
      setSources,
      setProducts,
      setCategories,
      setSubcategoryRecords,
      saveDistributor,
      removeDistributor,
      getDistributorById,
      addSubcategory,
      renameSubcategory,
      removeSubcategory,
    }),
    [
      addSubcategory,
      catalog,
      categories,
      ensureCatalog,
      getDistributorById,
      loadedSlices,
      removeDistributor,
      removeSubcategory,
      renameSubcategory,
      saveDistributor,
      setCategories,
      setDistributors,
      setItems,
      setProducts,
      setSources,
      setSubcategoryRecords,
      subcategoryRecords,
      subcategoriesByCategory,
    ],
  );

  return (
    <AppCatalogContext.Provider value={value}>
      {children}
    </AppCatalogContext.Provider>
  );
}

export function useAppCatalog() {
  const context = useContext(AppCatalogContext);
  if (!context) {
    throw new Error("useAppCatalog must be used within AppCatalogProvider");
  }
  return context;
}

/** Fetch the catalog slices this screen renders. Each visit asks the server again. */
export function useCatalogSlice(slices: readonly CatalogSlice[]) {
  const { ensureCatalog, loadedSlices } = useAppCatalog();
  const key = slices.join("|");

  useEffect(() => {
    if (!isApiConfigured() || slices.length === 0) return;
    void ensureCatalog(key.split("|") as CatalogSlice[], { fresh: true });
  }, [ensureCatalog, key, slices.length]);

  const ready =
    !isApiConfigured() ||
    slices.length === 0 ||
    slices.every((slice) => loadedSlices.includes(slice));

  return { ready };
}

export { nextDistributorId };

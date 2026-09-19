import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { DISTRIBUTORS } from "@/constants/distributors";
import { ITEMS } from "@/constants/items";
import { PRODUCTS_FOR_SALE } from "@/constants/productsForSale";
import { SOURCES } from "@/constants/sources";
import { formatApiError, isApiConfigured, subcategoriesApi } from "@/lib/api";
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
            ? current.sources.find((entry) => entry.id === sourceId)
            : current.sources.find((entry) => entry.name === resolved.source);

          return {
            ...resolved,
            sourceId: source?.id ?? sourceId,
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
              id: created.id,
              name: created.name?.trim() || trimmed,
              category,
              categoryId: created.categoryId ?? categoryId,
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
        if (!existing?.id) {
          return "Subcategory is not available on the server yet.";
        }
        try {
          const updated = await subcategoriesApi.update(existing.id, {
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
              updated.id ?? existing.id,
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
        if (!existing?.id) {
          return "Subcategory is not available on the server yet.";
        }
        try {
          await subcategoriesApi.remove(existing.id);
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

  const value = useMemo(
    () => ({
      distributors: catalog.distributors,
      items: catalog.items,
      sources: catalog.sources,
      products: catalog.products,
      categories,
      subcategoryRecords,
      subcategoriesByCategory,
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
      getDistributorById,
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

export { nextDistributorId };

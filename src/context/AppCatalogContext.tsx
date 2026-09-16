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
  loadSubcategories,
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
  subcategoriesByCategory: SubcategoryMap;
  setItems: (updater: Item[] | ((current: Item[]) => Item[])) => void;
  setSources: (updater: Source[] | ((current: Source[]) => Source[])) => void;
  setProducts: (
    updater: ProductForSale[] | ((current: ProductForSale[]) => ProductForSale[]),
  ) => void;
  saveDistributor: (
    distributor: Distributor,
    mode: SaveDistributorMode,
    previous?: Distributor | null,
  ) => void;
  removeDistributor: (id: string) => void;
  getDistributorById: (id: string) => Distributor | undefined;
  addSubcategory: (category: string, name: string) => string | null;
  renameSubcategory: (
    category: string,
    previous: string,
    nextName: string,
  ) => string | null;
  removeSubcategory: (category: string, name: string) => string | null;
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
) {
  return {
    items: items.map((item) =>
      item.category === category && item.subcategory === previous
        ? { ...item, subcategory: nextName }
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
        ? { ...item, subcategory: "" }
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
  const [subcategoriesByCategory, setSubcategoriesByCategory] = useState(
    loadSubcategories,
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

  const getDistributorById = useCallback(
    (id: string) => catalog.distributors.find((entry) => entry.id === id),
    [catalog.distributors],
  );

  const addSubcategory = useCallback((category: string, name: string) => {
    const result = addSubcategoryToMap(
      subcategoriesByCategory,
      category,
      name,
    );
    if (!result.ok) return result.error;
    saveSubcategories(result.map);
    setSubcategoriesByCategory(result.map);
    return null;
  }, [subcategoriesByCategory]);

  const renameSubcategory = useCallback(
    (category: string, previous: string, nextName: string) => {
      const result = renameSubcategoryInMap(
        subcategoriesByCategory,
        category,
        previous,
        nextName,
      );
      if (!result.ok) return result.error;

      const trimmed = nextName.trim();
      saveSubcategories(result.map);
      setSubcategoriesByCategory(result.map);
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
    [subcategoriesByCategory],
  );

  const removeSubcategory = useCallback(
    (category: string, name: string) => {
      const result = removeSubcategoryFromMap(
        subcategoriesByCategory,
        category,
        name,
      );
      if (!result.ok) return result.error;

      saveSubcategories(result.map);
      setSubcategoriesByCategory(result.map);
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
    [subcategoriesByCategory],
  );

  const value = useMemo(
    () => ({
      distributors: catalog.distributors,
      items: catalog.items,
      sources: catalog.sources,
      products: catalog.products,
      subcategoriesByCategory,
      setItems,
      setSources,
      setProducts,
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
      getDistributorById,
      removeDistributor,
      removeSubcategory,
      renameSubcategory,
      saveDistributor,
      setItems,
      setProducts,
      setSources,
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

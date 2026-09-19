import {
  ITEM_CATEGORIES,
  ITEM_SUBCATEGORIES,
  type Item,
  type ItemPhoto,
} from "@/types/item";
import type { ProductForSale, ProductTab } from "@/types/productForSale";
import { getItemDisplayName } from "@/utils/items";
import type { SubcategoryMap } from "@/utils/subcategories";

export type ProductTableDisplay = {
  merchandisingName: string;
  source: string;
  salesPrice: number;
  unitOfSales: string;
};

export type ProductDetailsDisplay = {
  id: string;
  merchandisingName: string;
  source: string;
  salesPrice: number;
  unitOfSales: string;
  photos: ItemPhoto[];
  description: string;
};

export function formatProductSalePrice(value: number) {
  if (Number.isInteger(value)) return `$${value}`;
  return `$${value.toFixed(2)}`;
}

export function resolveProductTableDisplay(
  product: ProductForSale,
  items: Item[],
): ProductTableDisplay {
  const item = items.find((entry) => entry.id === product.itemId);
  if (!item) {
    return {
      merchandisingName: product.merchandisingName,
      source: product.source || "—",
      salesPrice: product.salesPrice,
      unitOfSales: product.unitOfSales || "—",
    };
  }

  return {
    merchandisingName: getItemDisplayName(item),
    source: item.source || "—",
    salesPrice: item.sellingPrice,
    unitOfSales: item.singleItemUnit || "—",
  };
}

export function resolveProductDetails(
  product: ProductForSale,
  items: Item[],
): ProductDetailsDisplay {
  const item = items.find((entry) => entry.id === product.itemId);
  if (!item) {
    return {
      id: product.id,
      merchandisingName: product.merchandisingName,
      source: product.source || "—",
      salesPrice: product.salesPrice,
      unitOfSales: product.unitOfSales || "—",
      photos: product.photos,
      description: product.description,
    };
  }

  return {
    id: product.id,
    merchandisingName: getItemDisplayName(item),
    source: item.source || "—",
    salesPrice: item.sellingPrice,
    unitOfSales: item.singleItemUnit || "—",
    photos: item.photos,
    description: item.description,
  };
}
export type ProductFilterCriteria = {
  query: string;
  tab: ProductTab;
  subcategory: string;
  distributor: string;
  source: string;
};

export type ProductGroup = {
  category: string;
  subcategories: {
    subcategory: string;
    rows: ProductForSale[];
  }[];
};

export type ProductInheritedFields = {
  category: string;
  subcategory: string;
  distributor: string;
  source: string;
  merchandisingName: string;
  itemName: string;
};

export function resolveProductInheritedFields(
  product: ProductForSale,
  items: Item[],
): ProductInheritedFields {
  const item = items.find((entry) => entry.id === product.itemId);
  if (!item) {
    return {
      category: product.category || "Other",
      subcategory: product.subcategory || "",
      distributor: product.distributor,
      source: product.source,
      merchandisingName: product.merchandisingName,
      itemName: "",
    };
  }

  return {
    category: item.category || "Other",
    subcategory: item.subcategory || "",
    distributor: item.distributor,
    source: item.source,
    merchandisingName: getItemDisplayName(item),
    itemName: item.name,
  };
}

export function hasActiveProductFilters(criteria: ProductFilterCriteria) {
  return Boolean(
    criteria.query.trim() ||
      criteria.subcategory ||
      criteria.distributor ||
      criteria.source ||
      criteria.tab !== "All",
  );
}

export function getProductsForSaleEmptyMessage(
  totalProducts: number,
  criteria: ProductFilterCriteria,
) {
  if (totalProducts === 0) {
    return "No products for sale have been added yet.";
  }
  if (hasActiveProductFilters(criteria)) {
    return "No products for sale match your search or filters.";
  }
  return "No products for sale match your filters.";
}

export function filterProductsForSale(
  products: ProductForSale[],
  criteria: ProductFilterCriteria,
  items: Item[],
) {
  const query = criteria.query.trim().toLowerCase();

  return products.filter((row) => {
    const inherited = resolveProductInheritedFields(row, items);

    const matchesTab =
      criteria.tab === "All" || inherited.category === criteria.tab;
    const matchesSubcategory =
      !criteria.subcategory || inherited.subcategory === criteria.subcategory;
    const matchesDistributor =
      !criteria.distributor || inherited.distributor === criteria.distributor;
    const matchesSource =
      !criteria.source || inherited.source === criteria.source;

    if (
      !matchesTab ||
      !matchesSubcategory ||
      !matchesDistributor ||
      !matchesSource
    ) {
      return false;
    }

    if (!query) return true;

    const itemName = inherited.itemName.toLowerCase();
    return (
      inherited.merchandisingName.toLowerCase().includes(query) ||
      itemName.includes(query)
    );
  });
}

function sortSubcategories(
  category: string,
  subcategories: string[],
  orderMap?: SubcategoryMap,
) {
  const order = orderMap?.[category] ?? ITEM_SUBCATEGORIES[category] ?? [];

  return [...subcategories].sort((a, b) => {
    if (!a && b) return 1;
    if (a && !b) return -1;

    const left = order.indexOf(a);
    const right = order.indexOf(b);

    if (left === -1 && right === -1) return a.localeCompare(b);
    if (left === -1) return 1;
    if (right === -1) return -1;
    return left - right;
  });
}

export function groupProductsForSale(
  products: ProductForSale[],
  items: Item[] = [],
  subcategoryOrder?: SubcategoryMap,
): ProductGroup[] {
  const byCategory = new Map<string, Map<string, ProductForSale[]>>();

  for (const row of products) {
    const inherited = resolveProductInheritedFields(row, items);
    const category = inherited.category;
    const subcategory = inherited.subcategory;
    const subcategories = byCategory.get(category) ?? new Map<string, ProductForSale[]>();
    const rows = subcategories.get(subcategory) ?? [];
    rows.push(row);
    subcategories.set(subcategory, rows);
    byCategory.set(category, subcategories);
  }

  const categoryOrder = [...ITEM_CATEGORIES, "Other"];
  const categories = Array.from(byCategory.keys()).sort((left, right) => {
    const leftIndex = categoryOrder.indexOf(left);
    const rightIndex = categoryOrder.indexOf(right);
    if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right);
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });

  return categories
    .map((category) => {
      const subcategories = byCategory.get(category)!;
      return {
        category,
        subcategories: sortSubcategories(
          category,
          Array.from(subcategories.keys()),
          subcategoryOrder,
        )
          .map((subcategory) => ({
            subcategory,
            rows: (subcategories.get(subcategory) ?? []).sort(
              (left, right) => left.sortOrder - right.sortOrder,
            ),
          }))
          .filter((entry) => entry.rows.length > 0),
      };
    })
    .filter((entry) => entry.subcategories.length > 0);
}

export function reorderProductsInSubcategory(
  products: ProductForSale[],
  category: string,
  subcategory: string,
  draggedId: string,
  targetId: string,
  visibleIds: string[],
  items: Item[] = [],
) {
  if (draggedId === targetId) return products;

  const ids = [...visibleIds];
  const fromIndex = ids.indexOf(draggedId);
  const toIndex = ids.indexOf(targetId);
  if (fromIndex < 0 || toIndex < 0) return products;

  ids.splice(fromIndex, 1);
  ids.splice(toIndex, 0, draggedId);

  const inSubcategory = products.filter((product) => {
    const inherited = resolveProductInheritedFields(product, items);
    return inherited.category === category && inherited.subcategory === subcategory;
  });
  const base = inSubcategory.length
    ? Math.min(...inSubcategory.map((product) => product.sortOrder))
    : 0;
  const orderMap = new Map(ids.map((id, index) => [id, base + index]));

  return products.map((product) =>
    orderMap.has(product.id)
      ? { ...product, sortOrder: orderMap.get(product.id)! }
      : product,
  );
}

export function uniqueProductFieldValues(
  products: ProductForSale[],
  field: "category" | "distributor" | "source",
  items: Item[] = [],
) {
  const values = products.map((row) => {
    const inherited = resolveProductInheritedFields(row, items);
    if (field === "category") return inherited.category;
    if (field === "distributor") return inherited.distributor;
    return inherited.source;
  });
  return Array.from(new Set(values.filter(Boolean))).sort();
}

export function formatSubcategoryTitle(subcategory: string) {
  return subcategory.trim() || "Other";
}

export function isProductTab(value: string): value is ProductTab {
  return value === "All" || (ITEM_CATEGORIES as readonly string[]).includes(value);
}

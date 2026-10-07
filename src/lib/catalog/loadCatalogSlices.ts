import {
  categoriesApi,
  distributorsApi,
  formatApiError,
  itemsApi,
  mapApiDistributorToDistributor,
  mapApiItemToItem,
  mapApiProductToProductForSale,
  mapApiSourceToSource,
  mapApiSubcategoryToCatalog,
  productsApi,
  readApiLabel,
  sourcesApi,
  subcategoriesApi,
} from "@/lib/api";
import type { ApiCategory, CatalogSubcategory } from "@/lib/api/types";
import type { Distributor } from "@/types/distributor";
import type { Item } from "@/types/item";
import type { ProductForSale } from "@/types/productForSale";
import type { Source } from "@/types/source";

export type CatalogSlice =
  | "distributors"
  | "sources"
  | "items"
  | "products"
  | "categories"
  | "subcategories";

export type CatalogLookup = {
  distributors: Distributor[];
  sources: Source[];
  items: Item[];
  categories: ApiCategory[];
  subcategoryRecords: CatalogSubcategory[];
  products: ProductForSale[];
};

export type CatalogLoadResult = {
  loaded: CatalogSlice[];
  failures: string[];
  distributors?: Distributor[];
  sources?: Source[];
  items?: Item[];
  products?: ProductForSale[];
  categories?: ApiCategory[];
  subcategories?: CatalogSubcategory[];
};

type LoadResult<T> = { ok: true; data: T } | { ok: false; error: unknown };

async function loadOne<T>(promise: Promise<T>): Promise<LoadResult<T>> {
  try {
    return { ok: true, data: await promise };
  } catch (error) {
    return { ok: false, error };
  }
}

function nameMap(rows: Array<{ id: string; name: string; recordId?: string }>) {
  const map = new Map<string, string>();
  for (const entry of rows) {
    map.set(entry.id, entry.name);
    if (entry.recordId) map.set(entry.recordId, entry.name);
  }
  return map;
}

/**
 * Fetches only the catalog slices a screen asked for.
 * Lookup maps fall back to data already in memory when a dependency was loaded earlier.
 * `fresh` skips the short list cache so a page visit always reaches the server.
 */
export async function loadCatalogSlices(
  slices: CatalogSlice[],
  current: CatalogLookup,
  options?: { fresh?: boolean },
): Promise<CatalogLoadResult> {
  const want = new Set(slices);
  const fresh = options?.fresh ?? false;
  const [
    distributorsResult,
    sourcesResult,
    itemsResult,
    productsResult,
    categoriesResult,
    subcategoriesResult,
  ] = await Promise.all([
    want.has("distributors") ? loadOne(distributorsApi.list({ fresh })) : null,
    want.has("sources") ? loadOne(sourcesApi.list({ fresh })) : null,
    want.has("items") ? loadOne(itemsApi.list({ fresh })) : null,
    want.has("products") ? loadOne(productsApi.list({ fresh })) : null,
    want.has("categories") ? loadOne(categoriesApi.list({ fresh })) : null,
    want.has("subcategories") ? loadOne(subcategoriesApi.list({ fresh })) : null,
  ]);

  const failures: string[] = [];
  const note = (label: string, result: LoadResult<unknown> | null) => {
    if (!result || result.ok) return;
    failures.push(`${label}: ${formatApiError(result.error)}`);
  };
  note("Distributors", distributorsResult);
  note("Sources", sourcesResult);
  note("Items", itemsResult);
  note("Products", productsResult);
  note("Categories", categoriesResult);
  note("Subcategories", subcategoriesResult);

  const loaded: CatalogSlice[] = [];
  if (distributorsResult?.ok) loaded.push("distributors");
  if (sourcesResult?.ok) loaded.push("sources");
  if (itemsResult?.ok) loaded.push("items");
  if (productsResult?.ok) loaded.push("products");
  if (categoriesResult?.ok) loaded.push("categories");
  if (subcategoriesResult?.ok) loaded.push("subcategories");

  const apiDistributors = distributorsResult?.ok
    ? distributorsResult.data.map(mapApiDistributorToDistributor)
    : current.distributors;

  const categories = categoriesResult?.ok
    ? categoriesResult.data
    : current.categories;
  const categoriesById = new Map<string, string>();
  for (const category of categories) {
    const name = readApiLabel(category.name);
    if (category.id == null || category.id === "" || !name) continue;
    categoriesById.set(String(category.id), name);
  }

  const subcategories = subcategoriesResult?.ok
    ? subcategoriesResult.data
        .map((entry) => mapApiSubcategoryToCatalog(entry, categoriesById))
        .filter((entry): entry is CatalogSubcategory => Boolean(entry))
    : current.subcategoryRecords;
  const subcategoriesById = new Map<string, string>();
  for (const entry of subcategories) {
    const name = readApiLabel(entry.name);
    if (!name) continue;
    if (entry.recordId) subcategoriesById.set(String(entry.recordId), name);
    if (entry.id) subcategoriesById.set(String(entry.id), name);
  }

  const apiSources = sourcesResult?.ok
    ? sourcesResult.data.map((source, index) =>
        mapApiSourceToSource(source, index, nameMap(apiDistributors)),
      )
    : current.sources;

  const productsPayload = productsResult?.ok ? productsResult.data : [];
  const sellingPriceByItemId = new Map<string, number>();
  if (productsResult?.ok) {
    for (const product of productsPayload) {
      if (!product.itemId) continue;
      sellingPriceByItemId.set(
        product.itemId,
        (product.sellingPrice ?? product.price ?? 0) / 100,
      );
    }
  } else {
    for (const product of current.products) {
      if (!product.itemId) continue;
      sellingPriceByItemId.set(product.itemId, product.salesPrice);
    }
  }

  const apiItems = itemsResult?.ok
    ? itemsResult.data.map((item, index) =>
        mapApiItemToItem(item, index, {
          categoriesById,
          distributorsById: nameMap(apiDistributors),
          sourcesById: nameMap(apiSources),
          subcategoriesById,
          sellingPriceDollars: item.id
            ? sellingPriceByItemId.get(item.id)
            : undefined,
        }),
      )
    : [];

  const itemCatalog = itemsResult?.ok ? apiItems : current.items;
  const products = productsResult?.ok
    ? productsPayload.map((product, index) =>
        mapApiProductToProductForSale(product, index, itemCatalog),
      )
    : [];

  return {
    loaded,
    failures,
    distributors: distributorsResult?.ok ? apiDistributors : undefined,
    sources: sourcesResult?.ok ? apiSources : undefined,
    items: itemsResult?.ok ? apiItems : undefined,
    products: productsResult?.ok ? products : undefined,
    categories: categoriesResult?.ok ? categoriesResult.data : undefined,
    subcategories: subcategoriesResult?.ok ? subcategories : undefined,
  };
}

import type { Distributor } from "@/types/distributor";
import type { Item } from "@/types/item";
import type { ProductForSale } from "@/types/productForSale";
import type { Source } from "@/types/source";
import { apiId, findByEntityRef, matchesEntityRef } from "@/utils/entityIds";
import { getSourceEffectiveDistributor, findSourceForRecord } from "@/utils/sources";

type DistributorLinked = {
  distributor: string;
  distributorId?: string;
};

function sourceRenameMap(sources: Source[], previousSources: Source[]) {
  const previousById = new Map(previousSources.map((source) => [source.id, source]));
  const renames = new Map<string, string>();

  for (const source of sources) {
    const previous = previousById.get(source.id);
    if (previous && previous.name !== source.name) {
      renames.set(previous.name, source.name);
    }
  }

  return renames;
}

export function resolveDistributorId(
  distributorName: string,
  distributors: Distributor[],
) {
  const normalized = distributorName.trim();
  if (!normalized) return undefined;
  const match = distributors.find((entry) => entry.name === normalized);
  return match ? apiId(match) : undefined;
}

export function attachDistributorIds<T extends DistributorLinked>(
  records: T[],
  distributors: Distributor[],
): T[] {
  return records.map((record) => ({
    ...record,
    distributorId:
      record.distributorId ??
      resolveDistributorId(record.distributor, distributors),
  }));
}

function matchesDistributor(
  record: DistributorLinked,
  distributor: Distributor,
  previousName?: string,
) {
  return (
    matchesEntityRef(distributor, record.distributorId) ||
    (previousName ? record.distributor === previousName : false)
  );
}

/** Keep denormalized distributor names in sync; historical entity IDs stay unchanged. */
export function syncDistributorReferences(
  distributor: Distributor,
  previous: Distributor | null,
  catalog: {
    items: Item[];
    sources: Source[];
    products: ProductForSale[];
  },
) {
  const previousName = previous?.name;
  const linkedDistributorId = apiId(distributor);
  const linkedItemIds = new Set(
    catalog.items
      .filter((item) => matchesDistributor(item, distributor, previousName))
      .map((item) => item.id),
  );

  const items = catalog.items.map((item) =>
    matchesDistributor(item, distributor, previousName)
      ? {
          ...item,
          distributorId: linkedDistributorId,
          distributor: distributor.name,
        }
      : item,
  );

  const sources = catalog.sources.map((source) =>
    matchesDistributor(source, distributor, previousName)
      ? {
          ...source,
          distributorId: linkedDistributorId,
          distributor: distributor.name,
        }
      : source,
  );

  const products = catalog.products.map((product) => {
    if (product.itemId && linkedItemIds.has(product.itemId)) {
      return {
        ...product,
        distributorId: linkedDistributorId,
        distributor: distributor.name,
      };
    }
    if (matchesDistributor(product, distributor, previousName)) {
      return {
        ...product,
        distributorId: linkedDistributorId,
        distributor: distributor.name,
      };
    }
    return product;
  });

  return { items, sources, products };
}

export function withResolvedDistributor<T extends DistributorLinked>(
  record: T,
  distributors: Distributor[],
): T {
  const distributorId =
    record.distributorId ??
    resolveDistributorId(record.distributor, distributors);
  if (!distributorId) return record;

  const distributor = findByEntityRef(distributors, distributorId);
  return {
    ...record,
    distributorId: distributor ? apiId(distributor) : distributorId,
    distributor: distributor?.name ?? record.distributor,
  };
}

export function syncCatalogItemsForSources(
  sources: Source[],
  items: Item[],
  previousSources: Source[],
): Item[] {
  return items.map((item) => {
    const source = findSourceForRecord(item, sources, previousSources);
    if (!source) return item;

    const effective = getSourceEffectiveDistributor(source);
    return {
      ...item,
      source: source.name,
      sourceId: source.id,
      distributor: effective.name,
      distributorId: effective.id,
    };
  });
}

export function syncDistributorsForSources(
  sources: Source[],
  distributors: Distributor[],
  previousSources: Source[],
): Distributor[] {
  const renames = sourceRenameMap(sources, previousSources);
  if (renames.size === 0) return distributors;

  return distributors.map((distributor) => ({
    ...distributor,
    products: distributor.products.map((product) => {
      const renamed = renames.get(product.source);
      return renamed ? { ...product, source: renamed } : product;
    }),
  }));
}

export function syncCatalogProductsForSources(
  sources: Source[],
  products: ProductForSale[],
  items: Item[],
  previousSources: Source[],
): ProductForSale[] {
  return products.map((product) => {
    const linkedItem = findByEntityRef(items, product.itemId);
    if (linkedItem) {
      return syncProductWithItem(product, linkedItem);
    }

    const source = findSourceForRecord(product, sources, previousSources);
    if (!source) return product;

    const effective = getSourceEffectiveDistributor(source);
    return {
      ...product,
      source: source.name,
      sourceId: apiId(source),
      distributor: effective.name,
      distributorId: effective.id,
    };
  });
}

/** Keep linked Products For Sale in sync when catalog Items change. */
export function syncProductWithItem(
  product: ProductForSale,
  item: Item,
): ProductForSale {
  return {
    ...product,
    itemId: item.id,
    merchandisingName: item.merchandisingName,
    category: item.category,
    subcategory: item.subcategory,
    source: item.source,
    sourceId: item.sourceId,
    distributor: item.distributor,
    distributorId: item.distributorId,
    salesPrice: item.sellingPrice,
    unitOfSales: item.singleItemUnit,
    photos: item.photos.map((photo) => ({ ...photo })),
    description: item.description,
  };
}

export function syncCatalogProductsForItems(
  items: Item[],
  products: ProductForSale[],
): ProductForSale[] {
  return products.map((product) => {
    if (!product.itemId) return product;
    const item = findByEntityRef(items, product.itemId);
    if (!item) return product;
    return syncProductWithItem(product, item);
  });
}

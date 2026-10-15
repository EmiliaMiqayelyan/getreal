import { ITEM_CATEGORIES, ITEM_SUBCATEGORIES } from "@/types/item";
import type { CatalogSubcategory } from "@/lib/api/types";
import { isUuid } from "@/utils/entityIds";

const STORAGE_KEY = "getreal.item.subcategories";

export type SubcategoryMap = Record<string, string[]>;

export type SubcategoryMutationResult =
  { ok: true; map: SubcategoryMap } | { ok: false; error: string };

function cloneDefaultMap(): SubcategoryMap {
  const next: SubcategoryMap = {};
  for (const category of ITEM_CATEGORIES) {
    next[category] = [...(ITEM_SUBCATEGORIES[category] ?? [])];
  }
  return next;
}

function normalizeMap(raw: unknown): SubcategoryMap | null {
  if (!raw || typeof raw !== "object") return null;

  const next = cloneDefaultMap();
  for (const category of ITEM_CATEGORIES) {
    const value = (raw as Record<string, unknown>)[category];
    if (!Array.isArray(value)) continue;
    const cleaned = value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean);
    next[category] = Array.from(new Set(cleaned));
  }
  return next;
}

export function loadSubcategories(): SubcategoryMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaultMap();
    const parsed = normalizeMap(JSON.parse(raw));
    return parsed ?? cloneDefaultMap();
  } catch {
    return cloneDefaultMap();
  }
}

export function saveSubcategories(map: SubcategoryMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode
  }
}

export function subcategoriesForCategory(
  map: SubcategoryMap,
  category: string,
): string[] {
  if (!category) return [];
  return map[category] ?? [];
}

export function catalogRecordsFromMap(
  map: SubcategoryMap,
): CatalogSubcategory[] {
  const records: CatalogSubcategory[] = [];
  for (const [category, names] of Object.entries(map)) {
    for (const name of names) {
      records.push({ name, category });
    }
  }
  return records;
}

function comparePosition(left?: number, right?: number) {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return left - right;
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

export function mapFromCatalogRecords(
  records: CatalogSubcategory[],
): SubcategoryMap {
  const grouped = new Map<string, CatalogSubcategory[]>();
  for (const record of records) {
    const category = record.category.trim();
    const name = record.name.trim();
    if (!category || !name) continue;
    const bucket = grouped.get(category) ?? [];
    if (
      !bucket.some((entry) => normalizeName(entry.name) === normalizeName(name))
    ) {
      bucket.push(record);
    }
    grouped.set(category, bucket);
  }

  const next: SubcategoryMap = {};
  for (const [category, bucket] of grouped) {
    next[category] = [...bucket]
      .sort((left, right) => comparePosition(left.position, right.position))
      .map((entry) => entry.name.trim());
  }
  return next;
}

/**
 * Move the visible subcategory names inside one category.
 * Subcategories that are not on screen keep their slots.
 * Positions are rewritten 1-based across the whole category.
 */
export function applyVisibleSubcategoryOrder(
  records: CatalogSubcategory[],
  category: string,
  visibleOrder: string[],
): CatalogSubcategory[] {
  const categoryKey = category.trim().toLowerCase();
  const categoryIndexes: number[] = [];
  records.forEach((record, index) => {
    if (record.category.trim().toLowerCase() === categoryKey) {
      categoryIndexes.push(index);
    }
  });
  if (categoryIndexes.length === 0 || visibleOrder.length === 0) return records;

  const categoryRecords = categoryIndexes.map((index) => records[index]);
  const byName = new Map(
    categoryRecords.map((record) => [normalizeName(record.name), record]),
  );
  const visibleSet = new Set(
    visibleOrder.map(normalizeName).filter((name) => byName.has(name)),
  );
  if (visibleSet.size === 0) return records;

  const currentVisible = categoryRecords
    .map((record) => record.name)
    .filter((name) => visibleSet.has(normalizeName(name)));
  const nextVisible = visibleOrder.filter((name) =>
    visibleSet.has(normalizeName(name)),
  );
  const same =
    currentVisible.length === nextVisible.length &&
    currentVisible.every(
      (name, index) =>
        normalizeName(name) === normalizeName(nextVisible[index] ?? ""),
    );
  if (same) return records;

  const queue = [...nextVisible];
  const nextNames = categoryRecords.map((record) => {
    if (!visibleSet.has(normalizeName(record.name))) return record.name;
    return queue.shift() ?? record.name;
  });

  const nextRecords = nextNames.map((name, index) => {
    const record = byName.get(normalizeName(name)) ?? categoryRecords[index];
    return { ...record, position: index + 1 };
  });

  const next = records.slice();
  categoryIndexes.forEach((index, offset) => {
    next[index] = nextRecords[offset];
  });
  return next;
}

export function subcategoryReorderPayload(
  records: CatalogSubcategory[],
  category: string,
): Array<{ id: string; position: number }> {
  const categoryKey = category.trim().toLowerCase();
  const items: Array<{ id: string; position: number }> = [];
  for (const record of records) {
    if (record.category.trim().toLowerCase() !== categoryKey) continue;
    if (typeof record.position !== "number") continue;
    const id =
      record.recordId && isUuid(record.recordId)
        ? record.recordId
        : record.id && isUuid(record.id)
          ? record.id
          : undefined;
    if (!id) continue;
    items.push({ id, position: record.position });
  }
  return items;
}

export function findCatalogSubcategory(
  records: CatalogSubcategory[],
  category: string,
  name: string,
): CatalogSubcategory | undefined {
  const categoryKey = category.trim().toLowerCase();
  const nameKey = name.trim().toLowerCase();
  return records.find(
    (entry) =>
      entry.category.trim().toLowerCase() === categoryKey &&
      entry.name.trim().toLowerCase() === nameKey,
  );
}

export function addSubcategoryToMap(
  map: SubcategoryMap,
  category: string,
  name: string,
): SubcategoryMutationResult {
  const trimmed = name.trim();
  if (!category) return { ok: false, error: "Select a category first." };
  if (!trimmed) return { ok: false, error: "Subcategory name is required." };
  if (trimmed.length < 2) {
    return {
      ok: false,
      error: "Subcategory name must be at least 2 characters.",
    };
  }

  const current = map[category] ?? [];
  if (current.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, error: "That subcategory already exists." };
  }

  return {
    ok: true,
    map: {
      ...map,
      [category]: [...current, trimmed],
    },
  };
}

export function renameSubcategoryInMap(
  map: SubcategoryMap,
  category: string,
  previous: string,
  nextName: string,
): SubcategoryMutationResult {
  const trimmed = nextName.trim();
  if (!category) return { ok: false, error: "Select a category first." };
  if (!trimmed) return { ok: false, error: "Subcategory name is required." };
  if (trimmed.length < 2) {
    return {
      ok: false,
      error: "Subcategory name must be at least 2 characters.",
    };
  }

  const current = map[category] ?? [];
  if (!current.includes(previous)) {
    return { ok: false, error: "Subcategory not found." };
  }

  if (
    current.some(
      (entry) =>
        entry !== previous && entry.toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    return { ok: false, error: "That subcategory already exists." };
  }

  return {
    ok: true,
    map: {
      ...map,
      [category]: current.map((entry) =>
        entry === previous ? trimmed : entry,
      ),
    },
  };
}

export function removeSubcategoryFromMap(
  map: SubcategoryMap,
  category: string,
  name: string,
): SubcategoryMutationResult {
  if (!category) return { ok: false, error: "Select a category first." };
  const current = map[category] ?? [];
  if (!current.includes(name)) {
    return { ok: false, error: "Subcategory not found." };
  }

  return {
    ok: true,
    map: {
      ...map,
      [category]: current.filter((entry) => entry !== name),
    },
  };
}

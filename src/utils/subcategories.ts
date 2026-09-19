import {
  ITEM_CATEGORIES,
  ITEM_SUBCATEGORIES,
} from "@/types/item";
import type { CatalogSubcategory } from "@/lib/api/types";

const STORAGE_KEY = "getreal.item.subcategories";

export type SubcategoryMap = Record<string, string[]>;

export type SubcategoryMutationResult =
  | { ok: true; map: SubcategoryMap }
  | { ok: false; error: string };

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

export function catalogRecordsFromMap(map: SubcategoryMap): CatalogSubcategory[] {
  const records: CatalogSubcategory[] = [];
  for (const [category, names] of Object.entries(map)) {
    for (const name of names) {
      records.push({ name, category });
    }
  }
  return records;
}

export function mapFromCatalogRecords(
  records: CatalogSubcategory[],
): SubcategoryMap {
  const next: SubcategoryMap = {};
  for (const record of records) {
    const category = record.category.trim();
    const name = record.name.trim();
    if (!category || !name) continue;
    const current = next[category] ?? [];
    if (!current.some((entry) => entry.toLowerCase() === name.toLowerCase())) {
      next[category] = [...current, name];
    }
  }
  return next;
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
    return { ok: false, error: "Subcategory name must be at least 2 characters." };
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
    return { ok: false, error: "Subcategory name must be at least 2 characters." };
  }

  const current = map[category] ?? [];
  if (!current.includes(previous)) {
    return { ok: false, error: "Subcategory not found." };
  }

  if (
    current.some(
      (entry) =>
        entry !== previous &&
        entry.toLowerCase() === trimmed.toLowerCase(),
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

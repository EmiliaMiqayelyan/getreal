import { isApiConfigured } from "@/lib/api/client";
import type { ApiCategory } from "@/lib/api/types";
import { ITEM_CATEGORIES } from "@/types/item";

function comparePosition(left?: number, right?: number) {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return left - right;
}

/** Category names for tabs and selects. API names win; the local list is only for offline mode. */
export function categoryNamesFromCatalog(
  categories: Array<Pick<ApiCategory, "name" | "position">>,
): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const ordered = [...categories].sort((left, right) =>
    comparePosition(left.position, right.position),
  );
  for (const category of ordered) {
    const name = category.name?.trim() ?? "";
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  if (names.length > 0) return names;
  if (isApiConfigured()) return [];
  return [...ITEM_CATEGORIES];
}

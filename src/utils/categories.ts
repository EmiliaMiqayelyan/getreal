import { isApiConfigured } from "@/lib/api/client";
import type { ApiCategory } from "@/lib/api/types";
import { ITEM_CATEGORIES } from "@/types/item";

/** Category names for tabs and selects. API names win; the local list is only for offline mode. */
export function categoryNamesFromCatalog(
  categories: Array<Pick<ApiCategory, "name">>,
): string[] {
  const names = Array.from(
    new Set(
      categories
        .map((category) => category.name?.trim() ?? "")
        .filter(Boolean),
    ),
  );
  if (names.length > 0) return names;
  if (isApiConfigured()) return [];
  return [...ITEM_CATEGORIES];
}

import type { PaginatedResult } from "./types";

/** Load every page of a list so an export is not limited to the scrolled window. */
export async function collectPaginated<T>(
  load: (page: number, limit: number) => Promise<PaginatedResult<T>>,
  limit = 100,
): Promise<T[]> {
  const collected: T[] = [];
  let page = 1;

  while (page < 200) {
    const result = await load(page, limit);
    collected.push(...result.items);
    if (result.items.length === 0 || collected.length >= result.total) break;
    page += 1;
  }

  return collected;
}

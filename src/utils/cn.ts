/**
 * Class-name helper for conditional Tailwind classes.
 * Expand or replace with `clsx` / `tailwind-merge` if class merging becomes complex.
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

import { useLayoutEffect, useState } from "react";

import {
  floatingMenusEqual,
  placeFloatingMenu,
  type FloatingMenuBox,
  type FloatingMenuOptions,
} from "@/utils/floatingMenu";

type UseFloatingMenuOptions = Omit<FloatingMenuOptions, "contentHeight">;

export function useFloatingMenu(
  open: boolean,
  anchorRef: { readonly current: HTMLElement | null },
  menuRef: { readonly current: HTMLElement | null },
  options: UseFloatingMenuOptions = {},
) {
  const { width, minWidth, gap, maxHeight } = options;
  const [box, setBox] = useState<FloatingMenuBox>({
    top: 0,
    left: 0,
    width: width ?? minWidth ?? 0,
    maxHeight: maxHeight ?? 240,
  });

  useLayoutEffect(() => {
    if (!open) return;

    function place() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const next = placeFloatingMenu(anchor.getBoundingClientRect(), {
        width,
        minWidth,
        gap,
        maxHeight,
        contentHeight: menuRef.current?.scrollHeight,
      });
      setBox((current) => (floatingMenusEqual(current, next) ? current : next));
    }

    place();
    const frame = requestAnimationFrame(place);

    function onScroll(event: Event) {
      const target = event.target;
      if (
        target instanceof Node &&
        (target === menuRef.current || menuRef.current?.contains(target))
      ) {
        return;
      }
      place();
    }

    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, anchorRef, menuRef, width, minWidth, gap, maxHeight]);

  return box;
}

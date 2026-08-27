import { useLayoutEffect } from "react";

let lockCount = 0;
let previousHtmlOverflow = "";
let previousHtmlOverscroll = "";
let previousBodyOverflow = "";
let previousBodyOverscroll = "";
let previousBodyPaddingRight = "";

type FrozenScrollable = {
  el: HTMLElement;
  overflow: string;
  overflowX: string;
  overflowY: string;
};

let frozenScrollables: FrozenScrollable[] = [];

function canScroll(element: HTMLElement, deltaY: number) {
  const { scrollTop, scrollHeight, clientHeight } = element;
  if (scrollHeight <= clientHeight + 1) return false;
  if (deltaY < 0) return scrollTop > 0;
  return scrollTop + clientHeight < scrollHeight - 1;
}

function nearestScrollable(start: Element | null, boundary: Element) {
  let current: Element | null = start;
  while (current && boundary.contains(current)) {
    if (current instanceof HTMLElement) {
      const { overflowY } = getComputedStyle(current);
      if (
        (overflowY === "auto" ||
          overflowY === "scroll" ||
          overflowY === "overlay") &&
        current.scrollHeight > current.clientHeight + 1
      ) {
        return current;
      }
    }
    if (current === boundary) break;
    current = current.parentElement;
  }
  return null;
}

function isScrollableOverflow(value: string) {
  return value === "auto" || value === "scroll" || value === "overlay";
}

/**
 * Body overflow:hidden is not enough — AdminShell pages scroll inside nested
 * overflow-auto panes. Freeze those while the lock is active, skipping anything
 * marked with data-scroll-lock-allow (modal dialog / its scrollable body).
 */
function freezeBackgroundScrollables() {
  frozenScrollables = [];
  const nodes = document.body.querySelectorAll<HTMLElement>("*");

  for (const el of nodes) {
    if (el.closest("[data-scroll-lock-allow]")) continue;

    const style = getComputedStyle(el);
    const canY =
      isScrollableOverflow(style.overflowY) &&
      el.scrollHeight > el.clientHeight + 1;
    const canX =
      isScrollableOverflow(style.overflowX) &&
      el.scrollWidth > el.clientWidth + 1;

    if (!canX && !canY) continue;

    frozenScrollables.push({
      el,
      overflow: el.style.overflow,
      overflowX: el.style.overflowX,
      overflowY: el.style.overflowY,
    });
    el.style.setProperty("overflow", "hidden");
  }
}

function unfreezeBackgroundScrollables() {
  for (const item of frozenScrollables) {
    item.el.style.overflow = item.overflow;
    item.el.style.overflowX = item.overflowX;
    item.el.style.overflowY = item.overflowY;
  }
  frozenScrollables = [];
}

function onWheel(event: WheelEvent) {
  const target = event.target;
  if (!(target instanceof Element)) {
    event.preventDefault();
    return;
  }

  const allowRoot = target.closest("[data-scroll-lock-allow]");
  if (!allowRoot) {
    event.preventDefault();
    return;
  }

  const scrollable = nearestScrollable(target, allowRoot);
  if (!scrollable || !canScroll(scrollable, event.deltaY)) {
    event.preventDefault();
  }
}

function onTouchMove(event: TouchEvent) {
  const target = event.target;
  if (!(target instanceof Element)) {
    event.preventDefault();
    return;
  }

  const allowRoot = target.closest("[data-scroll-lock-allow]");
  if (!allowRoot) {
    event.preventDefault();
    return;
  }

  // Allow native touch scrolling inside the modal; block chaining when the
  // touch isn't over a nested scrollable region.
  if (!nearestScrollable(target, allowRoot)) {
    event.preventDefault();
  }
}

/**
 * Locks background page scroll while a modal/overlay is open.
 * Mark the modal panel (or its scrollable body) with `data-scroll-lock-allow`
 * so that area can still scroll.
 */
export function useScrollLock(locked: boolean) {
  useLayoutEffect(() => {
    if (!locked) return;

    const html = document.documentElement;
    const { body } = document;

    if (lockCount === 0) {
      previousHtmlOverflow = html.style.overflow;
      previousHtmlOverscroll = html.style.overscrollBehavior;
      previousBodyOverflow = body.style.overflow;
      previousBodyOverscroll = body.style.overscrollBehavior;
      previousBodyPaddingRight = body.style.paddingRight;

      const scrollbarWidth = window.innerWidth - html.clientWidth;
      html.style.overflow = "hidden";
      html.style.overscrollBehavior = "none";
      body.style.overflow = "hidden";
      body.style.overscrollBehavior = "none";
      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }

      freezeBackgroundScrollables();

      document.addEventListener("wheel", onWheel, {
        passive: false,
        capture: true,
      });
      document.addEventListener("touchmove", onTouchMove, {
        passive: false,
        capture: true,
      });
    }

    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.removeEventListener("wheel", onWheel, true);
        document.removeEventListener("touchmove", onTouchMove, true);
        unfreezeBackgroundScrollables();
        html.style.overflow = previousHtmlOverflow;
        html.style.overscrollBehavior = previousHtmlOverscroll;
        body.style.overflow = previousBodyOverflow;
        body.style.overscrollBehavior = previousBodyOverscroll;
        body.style.paddingRight = previousBodyPaddingRight;
      }
    };
  }, [locked]);
}

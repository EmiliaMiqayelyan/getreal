export type FloatingMenuBox = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
};

export type FloatingMenuOptions = {
  /** Explicit panel width. Defaults to the anchor width. */
  width?: number;
  minWidth?: number;
  gap?: number;
  /** Preferred cap before the viewport clamps it. */
  maxHeight?: number;
  /** Full content height, used to open upward when the list does not fit below. */
  contentHeight?: number;
};

const PAD = 12;
const MIN_PANEL = 36;

export function placeFloatingMenu(
  anchor: DOMRect,
  options: FloatingMenuOptions = {},
): FloatingMenuBox {
  const gap = options.gap ?? 6;
  const preferredMax = options.maxHeight ?? 240;

  let width = options.width ?? anchor.width;
  if (options.minWidth != null) width = Math.max(width, options.minWidth);
  const viewportWidth = Math.max(160, window.innerWidth - PAD * 2);
  width = Math.min(Math.max(width, 0), viewportWidth);

  let left = anchor.left;
  if (left + width > window.innerWidth - PAD) {
    left = anchor.right - width;
  }
  left = Math.min(
    Math.max(PAD, left),
    Math.max(PAD, window.innerWidth - PAD - width),
  );

  const spaceBelow = Math.max(0, window.innerHeight - anchor.bottom - gap - PAD);
  const spaceAbove = Math.max(0, anchor.top - gap - PAD);
  const needed =
    options.contentHeight && options.contentHeight > 0
      ? Math.min(options.contentHeight, preferredMax)
      : Math.min(preferredMax, 120);

  const openAbove = spaceBelow < needed && spaceAbove > spaceBelow;
  const available = openAbove ? spaceAbove : spaceBelow;
  const maxHeight = Math.min(
    preferredMax,
    Math.max(MIN_PANEL, available),
  );

  if (openAbove) {
    return {
      bottom: window.innerHeight - anchor.top + gap,
      left,
      width,
      maxHeight,
    };
  }

  return {
    top: anchor.bottom + gap,
    left,
    width,
    maxHeight,
  };
}

export function floatingMenusEqual(a: FloatingMenuBox, b: FloatingMenuBox) {
  return (
    a.top === b.top &&
    a.bottom === b.bottom &&
    a.left === b.left &&
    a.width === b.width &&
    a.maxHeight === b.maxHeight
  );
}

export function floatingMenuStyle(box: FloatingMenuBox): {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
} {
  return {
    left: box.left,
    width: box.width,
    maxHeight: box.maxHeight,
    ...(box.bottom != null ? { bottom: box.bottom } : { top: box.top ?? 0 }),
  };
}

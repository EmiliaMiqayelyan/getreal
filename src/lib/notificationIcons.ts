const iconModules = import.meta.glob("../assets/notification-icons/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export type NotificationIcon = {
  /** Value sent as iconUrl. File name without the extension, e.g. icon_cooler. */
  id: string;
  label: string;
  src: string;
};

function iconId(filename: string): string {
  return filename.replace(/\.svg$/i, "");
}

function labelFromFilename(filename: string): string {
  const stem = iconId(filename).replace(/^(icon|info)_/i, "");
  return stem.replace(/(^|\s)\S/g, (chunk) => chunk.toUpperCase());
}

export const NOTIFICATION_ICONS: NotificationIcon[] = Object.entries(iconModules)
  .map(([path, src]) => {
    const filename = path.split("/").pop() ?? path;
    return {
      id: iconId(filename),
      label: labelFromFilename(filename),
      src,
    };
  })
  .sort((left, right) => left.label.localeCompare(right.label));

export function findNotificationIcon(
  value: string,
): NotificationIcon | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const file = decodeURIComponent(trimmed.split("/").pop() ?? trimmed);
  const id = iconId(file);
  return NOTIFICATION_ICONS.find(
    (icon) => icon.id === trimmed || icon.id === id || icon.id === iconId(trimmed),
  );
}

/** Map a trigger's default icon id onto a local icon name. */
export function iconFilenameForDefaultId(defaultId: string): string {
  const id = defaultId.trim().toLowerCase();
  if (!id) return "";
  const match = NOTIFICATION_ICONS.find((icon) => {
    const name = icon.id.toLowerCase();
    return name === id || name === `icon_${id}` || name === `info_${id}`;
  });
  return match?.id ?? "";
}

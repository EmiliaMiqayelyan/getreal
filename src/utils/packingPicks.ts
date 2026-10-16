import type { ApiItemPick, ApiOrderItem } from "@/lib/api/types";
import type {
  PackingLine,
  PackingPick,
  PackingSourceOption,
} from "@/types/packing";

/** Saved picks, or the whole ordered quantity from the one selected lot. */
export function lineAllocation(item: {
  qty: number;
  picks?: PackingPick[];
  selected?: { inventoryRecordId?: string };
}): PackingPick[] {
  const explicit = (item.picks ?? []).filter(
    (pick) => pick.inventoryRecordId.trim() && pick.quantity > 0,
  );
  if (explicit.length) return explicit;
  const id = item.selected?.inventoryRecordId?.trim();
  if (!id || item.qty <= 0) return [];
  return [{ inventoryRecordId: id, quantity: item.qty }];
}

export function pickTotal(picks: readonly PackingPick[]) {
  return picks.reduce((sum, pick) => sum + pick.quantity, 0);
}

export function samePicks(left: readonly PackingPick[], right: readonly PackingPick[]) {
  if (left.length !== right.length) return false;
  const sortById = (picks: readonly PackingPick[]) =>
    [...picks].sort((a, b) =>
      a.inventoryRecordId.localeCompare(b.inventoryRecordId),
    );
  const a = sortById(left);
  const b = sortById(right);
  return a.every(
    (pick, index) =>
      pick.inventoryRecordId === b[index]?.inventoryRecordId &&
      pick.quantity === b[index]?.quantity,
  );
}

/** Picks already stored on the order. A packed single-fridge line uses `inventoryRecordId`. */
export function picksFromOrderItem(line: ApiOrderItem): PackingPick[] {
  const fromPicks = (line.picks ?? [])
    .filter(
      (pick): pick is ApiItemPick =>
        Boolean(pick.inventoryRecordId?.trim()) && (pick.quantity ?? 0) > 0,
    )
    .map((pick) => ({
      inventoryRecordId: pick.inventoryRecordId.trim(),
      quantity: pick.quantity,
    }));
  if (fromPicks.length) return fromPicks;
  const id = line.inventoryRecordId?.trim();
  if (line.packed && id && (line.quantity ?? 0) > 0) {
    return [{ inventoryRecordId: id, quantity: line.quantity ?? 0 }];
  }
  return [];
}

function pickedOptions(item: PackingLine): PackingSourceOption[] {
  return lineAllocation(item).flatMap((pick) => {
    const option = item.options.find(
      (entry) => entry.inventoryRecordId === pick.inventoryRecordId,
    );
    return option ? [option] : [];
  });
}

export type PackingLineSummary = {
  source: string;
  expDate: string;
  itemId: string;
  location: string;
  locationPlace: string;
};

export function packingLineSummary(item: PackingLine): PackingLineSummary {
  const allocation = lineAllocation(item);
  const options = pickedOptions(item);
  if (!options.length) {
    return {
      source: "",
      expDate: "",
      itemId: "",
      location: "",
      locationPlace: "",
    };
  }

  const first = options[0]!;
  const sameSource = options.every(
    (option) =>
      option.distributor === first.distributor && option.source === first.source,
  );
  const source =
    options.length === 1 || sameSource
      ? `${first.distributor} / ${first.source}`
      : "Multiple sources";

  const dated = [...options].sort((a, b) => {
    const aTime = a.expirationIso
      ? new Date(a.expirationIso).getTime()
      : Number.POSITIVE_INFINITY;
    const bTime = b.expirationIso
      ? new Date(b.expirationIso).getTime()
      : Number.POSITIVE_INFINITY;
    return aTime - bTime;
  });

  const itemIds = [
    ...new Set(options.map((option) => option.itemId.trim()).filter(Boolean)),
  ];

  const location =
    allocation.length <= 1
      ? first.location
      : allocation
          .map((pick) => {
            const option = item.options.find(
              (entry) => entry.inventoryRecordId === pick.inventoryRecordId,
            );
            return `${option?.location || "Fridge"} (${pick.quantity})`;
          })
          .join(", ");

  const locationPlace =
    allocation.length <= 1
      ? first.address || first.location
      : options
          .map((option) => option.address || option.location)
          .filter(Boolean)
          .join(", ");

  return {
    source,
    expDate: dated[0]?.expDate || "",
    itemId: itemIds.length === 1 ? itemIds[0]! : "",
    location,
    locationPlace,
  };
}

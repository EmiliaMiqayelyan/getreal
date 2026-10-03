import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { createInitialPackingHandoff } from "@/data/packerManager";
import type { PackingHandoffUpdate } from "@/types/packing";

const HANDOFF_STORAGE_KEY = "getreal.packingHandoff.v2";

type AssignPackerInput = {
  packerId: string;
  packerName: string;
};

type PackingHandoffContextValue = {
  packingByCode: Record<string, PackingHandoffUpdate>;
  upsertPacking: (update: PackingHandoffUpdate) => void;
  assignPacker: (orderCode: string, packer: AssignPackerInput) => void;
  markPackingStarted: (orderCode: string, packingStartedAt: string) => void;
  markLoaded: (orderCode: string, loadedAt: string) => void;
  getPacking: (orderCode: string) => PackingHandoffUpdate | undefined;
};

const PackingHandoffContext = createContext<PackingHandoffContextValue | null>(
  null,
);

function isHandoffUpdate(value: unknown): value is PackingHandoffUpdate {
  if (!value || typeof value !== "object") return false;
  const row = value as PackingHandoffUpdate;
  return (
    typeof row.orderCode === "string" &&
    typeof row.packerName === "string" &&
    Array.isArray(row.coolerIds)
  );
}

/** Recorded assignments and timestamps. A refresh restores them; it does not mint new ones. */
function readStoredHandoff(): Record<string, PackingHandoffUpdate> | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const next: Record<string, PackingHandoffUpdate> = {};
    for (const [code, value] of Object.entries(parsed)) {
      if (!isHandoffUpdate(value) || value.orderCode !== code) continue;
      next[code] = value;
    }
    return Object.keys(next).length ? next : null;
  } catch {
    return null;
  }
}

export function PackingHandoffProvider({ children }: { children: ReactNode }) {
  const [packingByCode, setPackingByCode] = useState<
    Record<string, PackingHandoffUpdate>
  >(() => readStoredHandoff() ?? createInitialPackingHandoff());

  useEffect(() => {
    try {
      sessionStorage.setItem(HANDOFF_STORAGE_KEY, JSON.stringify(packingByCode));
    } catch {
      // Session storage can be unavailable. The in-memory record still works.
    }
  }, [packingByCode]);

  const upsertPacking = useCallback((update: PackingHandoffUpdate) => {
    setPackingByCode((current) => {
      const previous = current[update.orderCode];
      const coolerReadyAt = update.coolerReadyAt ?? update.packedAt ?? previous?.coolerReadyAt;
      const packedAt = update.packedAt ?? coolerReadyAt ?? previous?.packedAt;
      return {
        ...current,
        [update.orderCode]: {
          ...previous,
          ...update,
          coolerReadyAt,
          packedAt,
          coolerIds: update.coolerIds ?? previous?.coolerIds ?? [],
          items: update.items ?? previous?.items,
          // Never clear timestamps once set (§12)
          packingStartedAt:
            update.packingStartedAt ?? previous?.packingStartedAt,
          loadedAt: update.loadedAt ?? previous?.loadedAt,
          packerId: update.packerId ?? previous?.packerId,
          packerName: update.packerName || previous?.packerName || "",
        },
      };
    });
  }, []);

  const assignPacker = useCallback(
    (orderCode: string, packer: AssignPackerInput) => {
      setPackingByCode((current) => {
        const previous = current[orderCode];
        return {
          ...current,
          [orderCode]: {
            ...previous,
            orderCode,
            coolerIds: previous?.coolerIds ?? [],
            packerId: packer.packerId,
            packerName: packer.packerName,
            // Assignment must not invent Packing Started (§7)
          },
        };
      });
    },
    [],
  );

  const markPackingStarted = useCallback(
    (orderCode: string, packingStartedAt: string) => {
      setPackingByCode((current) => {
        const previous = current[orderCode];
        if (previous?.packingStartedAt) {
          return current;
        }
        return {
          ...current,
          [orderCode]: {
            ...previous,
            orderCode,
            coolerIds: previous?.coolerIds ?? [],
            packerName: previous?.packerName ?? "",
            packingStartedAt,
          },
        };
      });
    },
    [],
  );

  const markLoaded = useCallback((orderCode: string, loadedAt: string) => {
    setPackingByCode((current) => {
      const previous = current[orderCode];
      if (previous?.loadedAt) {
        return current;
      }
      return {
        ...current,
        [orderCode]: {
          ...previous,
          orderCode,
          coolerIds: previous?.coolerIds ?? [],
          packerName: previous?.packerName ?? "",
          loadedAt,
        },
      };
    });
  }, []);

  const getPacking = useCallback(
    (orderCode: string) => packingByCode[orderCode],
    [packingByCode],
  );

  const value = useMemo(
    () => ({
      packingByCode,
      upsertPacking,
      assignPacker,
      markPackingStarted,
      markLoaded,
      getPacking,
    }),
    [
      assignPacker,
      getPacking,
      markLoaded,
      markPackingStarted,
      packingByCode,
      upsertPacking,
    ],
  );

  return (
    <PackingHandoffContext.Provider value={value}>
      {children}
    </PackingHandoffContext.Provider>
  );
}

export function usePackingHandoff() {
  const context = useContext(PackingHandoffContext);
  if (!context) {
    throw new Error(
      "usePackingHandoff must be used within PackingHandoffProvider",
    );
  }
  return context;
}

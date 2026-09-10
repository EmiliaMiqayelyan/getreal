import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { PackingHandoffUpdate } from "@/types/packing";

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

/** Seed demo progress so list timestamps survive refresh within the session. */
const SEED: Record<string, PackingHandoffUpdate> = {
  "ORD-U003-01": {
    orderCode: "ORD-U003-01",
    packerId: "p1",
    packerName: "Vahan N",
    packingStartedAt: "7/29/26, 8:45am",
    coolerReadyAt: "8/29/26, 9:15am",
    packedAt: "8/29/26, 9:15am",
    loadedAt: "9/29/26, 9:50am",
    coolerIds: ["BL-0012", "FR-1423"],
  },
  "ORD-U003-02": {
    orderCode: "ORD-U003-02",
    packerId: "p1",
    packerName: "Vahan N",
    packingStartedAt: "7/29/26, 8:45am",
    coolerReadyAt: "8/29/26, 9:15am",
    packedAt: "8/29/26, 9:15am",
    loadedAt: "9/29/26, 9:50am",
    coolerIds: ["BL-0012"],
  },
};

export function PackingHandoffProvider({ children }: { children: ReactNode }) {
  const [packingByCode, setPackingByCode] =
    useState<Record<string, PackingHandoffUpdate>>(SEED);

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
            packerName: previous?.packerName ?? "Packer Name 1",
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
          packerName: previous?.packerName ?? "Packer Name 1",
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

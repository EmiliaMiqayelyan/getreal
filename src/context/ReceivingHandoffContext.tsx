import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { ReceivingHandoffOrder } from "@/types/receiving";

type ReceivingHandoffContextValue = {
  /** Accepted-item handoffs waiting for Inventory storage. */
  pendingHandoffs: ReceivingHandoffOrder[];
  /** Delivery IDs that have completed receiving (Orders → Received). */
  receivedDeliveryIds: Set<string>;
  pushHandoff: (order: ReceivingHandoffOrder) => void;
  markDeliveryReceived: (deliveryId: string) => void;
  removeHandoff: (deliveryId: string) => void;
};

const ReceivingHandoffContext =
  createContext<ReceivingHandoffContextValue | null>(null);

export function ReceivingHandoffProvider({ children }: { children: ReactNode }) {
  const [pendingHandoffs, setPendingHandoffs] = useState<ReceivingHandoffOrder[]>(
    [],
  );
  const [receivedDeliveryIds, setReceivedDeliveryIds] = useState<Set<string>>(
    () => new Set(["DP-1038"]),
  );

  const pushHandoff = useCallback((order: ReceivingHandoffOrder) => {
    setPendingHandoffs((current) => {
      const without = current.filter(
        (entry) => entry.deliveryId !== order.deliveryId,
      );
      return [order, ...without];
    });
    setReceivedDeliveryIds((current) => {
      const next = new Set(current);
      next.add(order.deliveryId);
      return next;
    });
  }, []);

  const markDeliveryReceived = useCallback((deliveryId: string) => {
    setReceivedDeliveryIds((current) => {
      const next = new Set(current);
      next.add(deliveryId);
      return next;
    });
  }, []);

  const removeHandoff = useCallback((deliveryId: string) => {
    setPendingHandoffs((current) =>
      current.filter((entry) => entry.deliveryId !== deliveryId),
    );
  }, []);

  const value = useMemo(
    () => ({
      pendingHandoffs,
      receivedDeliveryIds,
      pushHandoff,
      markDeliveryReceived,
      removeHandoff,
    }),
    [
      markDeliveryReceived,
      pendingHandoffs,
      pushHandoff,
      receivedDeliveryIds,
      removeHandoff,
    ],
  );

  return (
    <ReceivingHandoffContext.Provider value={value}>
      {children}
    </ReceivingHandoffContext.Provider>
  );
}

export function useReceivingHandoff() {
  const context = useContext(ReceivingHandoffContext);
  if (!context) {
    throw new Error(
      "useReceivingHandoff must be used within ReceivingHandoffProvider",
    );
  }
  return context;
}

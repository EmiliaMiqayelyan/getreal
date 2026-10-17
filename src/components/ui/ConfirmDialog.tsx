import { useState } from "react";

import { Button, type ButtonVariant } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
};

/** Shared confirmation dialog built on Modal. */
export function ConfirmDialog({
  open,
  title,
  message,
  onClose,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "dark",
}: ConfirmDialogProps) {
  const [confirming, setConfirming] = useState(false);

  function requestClose() {
    if (confirming) return;
    onClose();
  }

  async function handleConfirm() {
    if (confirming) return;
    setConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // The caller reports the error. Keep the dialog open so the action can be retried.
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={requestClose}
      size="sm"
      zIndexClass="z-[70]"
      footer={
        <>
          <Button variant="ghost" onClick={requestClose} disabled={confirming}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            className="ml-3"
            loading={confirming}
            onClick={() => void handleConfirm()}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[14px] text-foreground">{message}</p>
    </Modal>
  );
}

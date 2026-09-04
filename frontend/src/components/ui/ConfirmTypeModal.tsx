"use client";

import { useState } from "react";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Input";

export function ConfirmTypeModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmWord,
  confirmLabel = "Xóa",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmWord: string;
  confirmLabel?: string;
}) {
  const [value, setValue] = useState("");
  const matches = value.trim() === confirmWord;

  return (
    <Modal
      open={open}
      onClose={() => {
        setValue("");
        onClose();
      }}
    >
      <ModalHeader title={title} subtitle={description} />
      <InputField
        label={`Gõ "${confirmWord}" để xác nhận`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={confirmWord}
      />
      <ModalFooter>
        <Button
          variant="secondary"
          onClick={() => {
            setValue("");
            onClose();
          }}
        >
          Hủy
        </Button>
        <Button
          variant="destructive"
          disabled={!matches}
          onClick={() => {
            onConfirm();
            setValue("");
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

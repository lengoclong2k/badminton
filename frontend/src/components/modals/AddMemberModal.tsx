"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { InputField } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { apiPost } from "@/lib/api/client";

export function AddMemberButton() {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [sex, setSex] = useState<"nam" | "nu">("nam");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  async function handleSubmit() {
    if (!fullName.trim()) {
      showToast("Nhập họ và tên");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/members", { fullName: fullName.trim(), sex, phone: phone.trim() || undefined });
      setOpen(false);
      setFullName("");
      setPhone("");
      showToast("Đã thêm thành viên mới");
      router.refresh();
    } catch {
      showToast("Thêm thành viên thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Thêm thành viên</Button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalHeader title="Thêm thành viên" subtitle="Quỹ tháng sẽ tự tính theo giới tính" />
        <div className="flex flex-col gap-4">
          <InputField
            label="Họ và tên"
            placeholder="VD: Nguyễn Văn A"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-sec">Giới tính</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as "nam" | "nu")}
                className="h-11 rounded-control border border-ctrl bg-soft px-3.5 text-sm text-ink outline-none focus:border-mint focus:ring-2 focus:ring-mint-100"
              >
                <option value="nam">Nam</option>
                <option value="nu">Nữ</option>
              </select>
            </div>
            <InputField
              label="Số điện thoại"
              placeholder="090x xxx xxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Đang thêm…" : "Thêm thành viên"}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

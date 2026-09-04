"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { InputField } from "@/components/ui/Input";
import { ConfirmTypeModal } from "@/components/ui/ConfirmTypeModal";
import { useToast } from "@/components/ui/Toast";
import { apiPatch, apiDelete } from "@/lib/api/client";

export function EditMemberButton({
  slug,
  name,
  sex,
  phone,
}: {
  slug: string;
  name: string;
  sex: "nam" | "nu";
  phone?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(name);
  const [sexValue, setSexValue] = useState<"nam" | "nu">(sex);
  const [phoneValue, setPhoneValue] = useState(phone ?? "");
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await apiPatch(`/members/${slug}`, {
        fullName: fullName.trim(),
        sex: sexValue,
        phone: phoneValue.trim() || undefined,
      });
      setOpen(false);
      showToast("Đã lưu thông tin thành viên");
      router.refresh();
    } catch {
      showToast("Lưu thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Sửa thông tin
      </Button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalHeader title="Sửa thông tin thành viên" />
        <div className="flex flex-col gap-4">
          <InputField label="Họ và tên" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-sec">Giới tính</label>
              <select
                value={sexValue}
                onChange={(e) => setSexValue(e.target.value as "nam" | "nu")}
                className="h-11 rounded-control border border-ctrl bg-soft px-3.5 text-sm text-ink outline-none focus:border-mint focus:ring-2 focus:ring-mint-100"
              >
                <option value="nam">Nam</option>
                <option value="nu">Nữ</option>
              </select>
            </div>
            <InputField label="Số điện thoại" value={phoneValue} onChange={(e) => setPhoneValue(e.target.value)} />
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

export function DeleteMemberButton({ slug, name }: { slug: string; name: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  async function handleConfirm() {
    try {
      await apiDelete(`/members/${slug}`);
      showToast(`Đã cho ${name} ngừng hoạt động`);
      router.push("/admin/members");
      router.refresh();
    } catch {
      showToast("Xóa thất bại, thử lại sau");
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Xóa khỏi CLB
      </Button>
      <ConfirmTypeModal
        open={open}
        onClose={() => setOpen(false)}
        title="Xóa thành viên"
        description={`Xóa "${name}" sẽ cho người này ngừng hoạt động trong CLB. Không thể hoàn tác.`}
        confirmWord={name}
        confirmLabel="Xóa thành viên"
        onConfirm={handleConfirm}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { InputField } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { apiPatch } from "@/lib/api/client";

export function ProfileEditForm({ fullName, phone }: { fullName: string; phone: string | null }) {
  const [name, setName] = useState(fullName);
  const [phoneValue, setPhoneValue] = useState(phone ?? "");
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  async function handleSave() {
    setSubmitting(true);
    try {
      await apiPatch("/members/me", { fullName: name.trim(), phone: phoneValue.trim() || undefined });
      showToast("Đã lưu hồ sơ");
      router.refresh();
    } catch {
      showToast("Lưu thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>Sửa hồ sơ</CardTitle>
      <InputField label="Họ và tên" value={name} onChange={(e) => setName(e.target.value)} />
      <InputField label="Số điện thoại" value={phoneValue} onChange={(e) => setPhoneValue(e.target.value)} />
      <Button className="self-start" onClick={handleSave} disabled={submitting}>
        {submitting ? "Đang lưu…" : "Lưu hồ sơ"}
      </Button>
    </Card>
  );
}

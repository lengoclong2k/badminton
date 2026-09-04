"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { InputField } from "@/components/ui/Input";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { useToast } from "@/components/ui/Toast";
import { apiPatch } from "@/lib/api/client";

type ClubSettings = {
  clubName: string;
  monthlyFeeMale: number;
  monthlyFeeFemale: number;
  guestFeeMale: number;
  guestFeeFemale: number;
  /** Tỷ lệ gợi ý cho nữ so với nam, dạng thập phân (0.7 = 70%). Chỉ để tính nhanh, không ép buộc. */
  femaleRatio: number;
  /** Tiền sân mặc định, điền sẵn khi sinh buổi cố định — chỉ áp dụng cho buổi cố định. */
  defaultCourtCost: number;
};

export function ClubNameForm({ initial }: { initial: string }) {
  const [clubName, setClubName] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  async function handleSave() {
    setSubmitting(true);
    try {
      await apiPatch("/settings", { clubName: clubName.trim() });
      showToast("Đã lưu tên CLB");
      router.refresh();
    } catch {
      showToast("Lưu thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>Thông tin CLB</CardTitle>
      <InputField label="Tên CLB" value={clubName} onChange={(e) => setClubName(e.target.value)} />
      <Button className="self-start" onClick={handleSave} disabled={submitting}>
        {submitting ? "Đang lưu…" : "Lưu tên CLB"}
      </Button>
    </Card>
  );
}

/** Làm tròn tới hàng nghìn cho đẹp số tiền (vd 280350 -> 280000). */
function roundToThousand(n: number) {
  return Math.round(n / 1000) * 1000;
}

export function FeeSettingsForm({ initial }: { initial: ClubSettings }) {
  const [monthlyFeeMale, setMonthlyFeeMale] = useState(initial.monthlyFeeMale);
  const [monthlyFeeFemale, setMonthlyFeeFemale] = useState(initial.monthlyFeeFemale);
  const [guestFeeMale, setGuestFeeMale] = useState(initial.guestFeeMale);
  const [guestFeeFemale, setGuestFeeFemale] = useState(initial.guestFeeFemale);
  // Lưu % dưới dạng số nguyên (70 = 70%) cho dễ nhập, chuyển sang thập phân lúc lưu.
  const [femaleRatioPct, setFemaleRatioPct] = useState(Math.round(initial.femaleRatio * 100));
  const [defaultCourtCost, setDefaultCourtCost] = useState(initial.defaultCourtCost);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  /** Chỉ áp dụng khi bấm nút — không tự động ghi đè số nữ đang có, để admin có thể
   *  luôn nhập tay một số tiền bất kỳ không theo tỷ lệ nếu muốn. */
  function applyRatio() {
    const ratio = Math.min(100, Math.max(1, femaleRatioPct)) / 100;
    setMonthlyFeeFemale(roundToThousand(monthlyFeeMale * ratio));
    setGuestFeeFemale(roundToThousand(guestFeeMale * ratio));
    showToast(`Đã tính lại quỹ nữ theo ${Math.round(ratio * 100)}% mức nam`);
  }

  async function handleSave() {
    setSubmitting(true);
    try {
      await apiPatch("/settings", {
        monthlyFeeMale,
        monthlyFeeFemale,
        guestFeeMale,
        guestFeeFemale,
        femaleRatio: Math.min(100, Math.max(1, femaleRatioPct)) / 100,
        defaultCourtCost,
      });
      showToast("Đã lưu mức quỹ");
      router.refresh();
    } catch {
      showToast("Lưu thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>Mức quỹ tháng &amp; phí khách</CardTitle>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CurrencyInput label="Quỹ tháng · Nam" value={monthlyFeeMale} onValueChange={setMonthlyFeeMale} />
        <CurrencyInput label="Quỹ tháng · Nữ" value={monthlyFeeFemale} onValueChange={setMonthlyFeeFemale} />
        <CurrencyInput label="Phí khách · Nam" value={guestFeeMale} onValueChange={setGuestFeeMale} />
        <CurrencyInput label="Phí khách · Nữ" value={guestFeeFemale} onValueChange={setGuestFeeFemale} />
      </div>

      <div className="flex items-end gap-3 rounded-control border border-ctrl bg-soft/50 p-3">
        <div className="w-28">
          <InputField
            label="Tỷ lệ nữ / nam"
            type="number"
            min={1}
            max={100}
            value={femaleRatioPct}
            onChange={(e) => setFemaleRatioPct(Number(e.target.value))}
          />
        </div>
        <span className="pb-2.5 text-sm text-mut">%</span>
        <Button variant="secondary" className="mb-0" onClick={applyRatio} type="button">
          Tính lại quỹ nữ theo tỷ lệ
        </Button>
      </div>
      <p className="text-xs text-mut">
        Tỷ lệ chỉ để tính nhanh — bấm nút để điền vào 2 ô Nữ ở trên. Sau đó vẫn có thể sửa tay 2 ô này
        thành bất kỳ số tiền nào, không bắt buộc theo đúng %.
      </p>

      <div className="border-t border-line pt-3">
        <CurrencyInput
          label="Tiền sân mặc định (buổi cố định)"
          value={defaultCourtCost}
          onValueChange={setDefaultCourtCost}
        />
        <p className="mt-1.5 text-xs text-mut">
          Tự động điền vào buổi cố định khi sinh lịch, admin vẫn sửa được lúc chốt buổi nếu giá thực tế khác.
          Buổi phát sinh (vãng lai) không áp dụng số này — vẫn nhập tay như trước.
        </p>
      </div>

      <Button className="self-start" onClick={handleSave} disabled={submitting}>
        {submitting ? "Đang lưu…" : "Lưu mức quỹ"}
      </Button>
    </Card>
  );
}

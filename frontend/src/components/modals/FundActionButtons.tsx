"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { InputField } from "@/components/ui/Input";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { SexChip } from "@/components/ui/Chip";
import { ConfirmTypeModal } from "@/components/ui/ConfirmTypeModal";
import { useToast } from "@/components/ui/Toast";
import { apiGet, apiPost, apiDelete } from "@/lib/api/client";

type UnpaidRow = {
  memberFeeId: string;
  fullName: string;
  sex: "nam" | "nu";
  amount: number;
};

type ActiveMember = { id: string; fullName: string; sex: "nam" | "nu" };
type ClubFeeSettings = { monthlyFeeMale: number; monthlyFeeFemale: number };

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} ₫`;

/** Mở MỘT ĐỢT thu quỹ mới bất cứ lúc nào admin muốn — không cố định theo
 *  tháng, không giới hạn số lần. Mỗi lần bấm sinh khoản "chưa đóng" mới cho
 *  mọi thành viên đang hoạt động, theo mức phí đang cấu hình ở Cài đặt.
 *  Nợ các đợt CỘNG DỒN (không tự xóa nợ đợt trước), nên KHÔNG idempotent
 *  như trước nữa — modal xác nhận liệt kê rõ số tiền + danh sách thành
 *  viên sẽ bị tính trước khi tạo, tránh bấm nhầm 2 lần. */
export function OpenFeePeriodButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<ClubFeeSettings | null>(null);
  const [members, setMembers] = useState<ActiveMember[]>([]);
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      apiGet<ClubFeeSettings>("/settings"),
      apiGet<{ items: ActiveMember[] }>("/members?status=active&limit=100"),
    ])
      .then(([s, m]) => {
        setSettings(s);
        setMembers(m.items);
      })
      .catch(() => showToast("Không tải được thông tin để xác nhận"))
      .finally(() => setLoading(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const male = members.filter((m) => m.sex === "nam");
  const female = members.filter((m) => m.sex === "nu");
  const total = settings ? male.length * settings.monthlyFeeMale + female.length * settings.monthlyFeeFemale : 0;

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await apiPost("/fees/periods", {});
      setOpen(false);
      showToast("Đã mở đợt thu quỹ mới");
      router.refresh();
    } catch {
      showToast("Mở đợt quỹ thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Mở đợt thu quỹ mới
      </Button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalHeader
          title="Mở đợt thu quỹ mới"
          subtitle={
            loading
              ? "Đang tải…"
              : `Sẽ tạo khoản chưa đóng cho ${members.length} thành viên đang hoạt động · tổng cộng ${money(total)}`
          }
        />
        <div className="flex flex-col gap-3">
          {!loading && settings && (
            <div className="flex flex-col gap-1.5 rounded-control border border-border bg-soft px-3.5 py-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-sec">Nam · {male.length} người</span>
                <span className="font-mono text-ink">{money(settings.monthlyFeeMale)}/người</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sec">Nữ · {female.length} người</span>
                <span className="font-mono text-ink">{money(settings.monthlyFeeFemale)}/người</span>
              </div>
            </div>
          )}
          {!loading && (
            <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-control border border-border px-3.5 py-2">
                  <SexChip sex={m.sex} />
                  <span className="flex-1 text-sm font-medium text-ink">{m.fullName}</span>
                  <span className="font-mono text-xs text-sec">
                    {money(m.sex === "nam" ? settings?.monthlyFeeMale ?? 0 : settings?.monthlyFeeFemale ?? 0)}
                  </span>
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-sm text-mut">Không có thành viên nào đang hoạt động.</p>
              )}
            </div>
          )}
          <p className="text-xs text-mut">
            Nợ đợt trước (nếu còn) vẫn giữ nguyên, cộng dồn — không bị xóa.
          </p>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || loading || members.length === 0}>
            {submitting ? "Đang mở…" : `Xác nhận mở đợt · ${money(total)}`}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

export function CollectFeeButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unpaid, setUnpaid] = useState<UnpaidRow[]>([]);
  const [everOpened, setEverOpened] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([apiGet<UnpaidRow[]>("/fees/unpaid"), apiGet<unknown[]>("/fees/periods")])
      .then(([rows, periods]) => {
        setUnpaid(rows);
        setSelected(new Set(rows.map((r) => r.memberFeeId)));
        setEverOpened(periods.length > 0);
      })
      .catch(() => showToast("Không tải được danh sách chưa đóng quỹ"))
      .finally(() => setLoading(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = unpaid.filter((u) => selected.has(u.memberFeeId)).reduce((s, u) => s + u.amount, 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleConfirm() {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      await apiPost("/fees/pay", { feeIds: Array.from(selected) });
      setOpen(false);
      showToast(`Đã ghi nhận thu quỹ ${money(total)}`);
      router.refresh();
    } catch {
      showToast("Thu quỹ thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Thu quỹ
      </Button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalHeader
          title="Thu quỹ"
          subtitle={loading ? "Đang tải…" : `${unpaid.length} khoản chưa đóng · ${money(total)}`}
        />
        <div className="flex flex-col gap-3">
          {unpaid.map((u) => (
            <label
              key={u.memberFeeId}
              className="flex items-center gap-3 rounded-control border border-border px-3.5 py-2.5"
            >
              <input
                type="checkbox"
                checked={selected.has(u.memberFeeId)}
                onChange={() => toggle(u.memberFeeId)}
                className="h-4 w-4 accent-mint"
              />
              <SexChip sex={u.sex} />
              <span className="flex-1 text-sm font-medium text-ink">{u.fullName}</span>
              <span className="font-mono text-sm text-ink">{money(u.amount)}</span>
            </label>
          ))}
          {!loading && unpaid.length === 0 && (
            <p className="text-sm text-mut">
              {everOpened
                ? "Mọi người đã đóng đủ, không còn khoản nào treo."
                : "Chưa mở đợt thu quỹ nào — bấm \"Mở đợt thu quỹ mới\" trước khi thu."}
            </p>
          )}
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || selected.size === 0}>
            {submitting ? "Đang xử lý…" : `Xác nhận đã thu ${money(total)}`}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

export function AddExpenseButton() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  async function handleSubmit() {
    if (!description.trim() || amount <= 0) {
      showToast("Nhập nội dung và số tiền hợp lệ");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/fund/expenses", { description: description.trim(), amount });
      setOpen(false);
      setDescription("");
      setAmount(0);
      showToast(`Đã thêm khoản chi ${amount.toLocaleString("vi-VN")} ₫`);
      router.refresh();
    } catch {
      showToast("Thêm khoản chi thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Thêm khoản chi
      </Button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalHeader title="Thêm khoản chi" subtitle="Trừ thẳng vào quỹ CLB" />
        <div className="flex flex-col gap-4">
          <InputField
            label="Nội dung"
            placeholder="VD: Mua cầu dự trữ"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <CurrencyInput label="Số tiền" onValueChange={setAmount} />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Đang thêm…" : "Thêm khoản chi"}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

export function DeleteEntryButton({ label, id }: { label: string; id: string }) {
  const [open, setOpen] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  async function handleConfirm() {
    try {
      await apiDelete(`/fund/entries/${id}`);
      showToast("Đã xóa khoản quỹ và tính lại số dư");
      router.refresh();
    } catch {
      showToast("Xóa thất bại, thử lại sau");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-danger-text hover:underline"
      >
        Xóa
      </button>
      <ConfirmTypeModal
        open={open}
        onClose={() => setOpen(false)}
        title="Xóa khoản quỹ"
        description={`Xóa mục "${label}" khỏi sổ quỹ. Số dư sẽ được tính lại. Không thể hoàn tác.`}
        confirmWord="XÓA"
        confirmLabel="Xóa khoản này"
        onConfirm={handleConfirm}
      />
    </>
  );
}

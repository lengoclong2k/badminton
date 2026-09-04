"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DropdownMenu, DropdownItem } from "@/components/ui/DropdownMenu";
import { ConfirmTypeModal } from "@/components/ui/ConfirmTypeModal";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { apiDelete, apiGet, apiPost } from "@/lib/api/client";

type Sex = "nam" | "nu";

type MemberFeeHistoryRow = {
  id: string;
  amount: number;
  status: "paid" | "unpaid" | "waived";
  period: { openedAt: string };
};

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} ₫`;
const todayStr = () => new Date().toISOString().slice(0, 10);
const formatOpened = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

export function MemberRowMenu({
  id,
  name,
  sex,
  hasUnpaid,
}: {
  id: string;
  name: string;
  sex: Sex;
  hasUnpaid: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [unpayOpen, setUnpayOpen] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  async function handleDelete() {
    try {
      await apiDelete(`/members/${id}`);
      showToast(`Đã cho ${name} ngừng hoạt động`);
      router.refresh();
    } catch {
      showToast("Xóa thất bại, thử lại sau");
    }
  }

  return (
    <div onClick={(e) => e.preventDefault()}>
      <DropdownMenu trigger={<span className="text-lg leading-none text-mut">⋯</span>}>
        <DropdownItem onClick={() => router.push(`/admin/members/${id}`)}>Xem chi tiết</DropdownItem>
        {hasUnpaid ? (
          <DropdownItem onClick={() => setPayOpen(true)}>Ghi quỹ đã đóng</DropdownItem>
        ) : (
          <DropdownItem onClick={() => setUnpayOpen(true)}>Hoàn tác đã đóng</DropdownItem>
        )}
        <DropdownItem danger onClick={() => setConfirmOpen(true)}>
          Xóa khỏi CLB
        </DropdownItem>
      </DropdownMenu>

      <PayFeeModal open={payOpen} onClose={() => setPayOpen(false)} slug={id} name={name} />
      <UnpayFeeModal open={unpayOpen} onClose={() => setUnpayOpen(false)} slug={id} name={name} />

      <ConfirmTypeModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Xóa thành viên"
        description={`Xóa "${name}" sẽ cho người này ngừng hoạt động trong CLB. Không thể hoàn tác.`}
        confirmWord={name}
        confirmLabel="Xóa thành viên"
        onConfirm={handleDelete}
      />
    </div>
  );
}

/**
 * Ghi nhận thành viên đã đóng — liệt kê TẤT CẢ khoản quỹ còn "chưa đóng"
 * của người này (có thể nhiều đợt cộng dồn), admin chọn khoản nào đã thu
 * rồi xác nhận cùng lúc. Nếu chưa có khoản nào (chưa từng có đợt quỹ liên
 * quan tới người này) thì báo admin dùng nút "Mở đợt thu quỹ mới" trước.
 */
function PayFeeModal({
  open,
  onClose,
  slug,
  name,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  name: string;
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<MemberFeeHistoryRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paidOn, setPaidOn] = useState(todayStr());
  const [method, setMethod] = useState("Tiền mặt");
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiGet<MemberFeeHistoryRow[]>(`/members/${slug}/fees`)
      .then((history) => {
        const unpaid = history.filter((f) => f.status === "unpaid");
        setRows(unpaid);
        setSelected(new Set(unpaid.map((f) => f.id)));
      })
      .catch(() => showToast("Không tải được khoản quỹ của thành viên này"))
      .finally(() => setLoading(false));
  }, [open, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = rows.filter((r) => selected.has(r.id)).reduce((s, r) => s + r.amount, 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      await apiPost("/fees/pay", { feeIds: Array.from(selected), paidOn, method: method.trim() || undefined });
      onClose();
      showToast(`Đã ghi nhận ${name} đóng quỹ ${money(total)}`);
      router.refresh();
    } catch {
      showToast("Ghi quỹ thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader
        title="Ghi quỹ đã đóng"
        subtitle={loading ? "Đang tải…" : `${name} · ${rows.length} khoản chưa đóng`}
      />
      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <label key={r.id} className="flex items-center gap-3 rounded-control border border-border px-3.5 py-2.5">
            <input
              type="checkbox"
              checked={selected.has(r.id)}
              onChange={() => toggle(r.id)}
              className="h-4 w-4 accent-mint"
            />
            <span className="flex-1 text-sm font-medium text-ink">Đợt {formatOpened(r.period.openedAt)}</span>
            <span className="font-mono text-sm text-ink">{money(r.amount)}</span>
          </label>
        ))}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-mut">
            Không có khoản quỹ nào cần thu — dùng nút &quot;Mở đợt thu quỹ mới&quot; ở trang Thành viên trước.
          </p>
        )}
        {rows.length > 0 && (
          <>
            <InputField label="Ngày đóng" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-sec">Hình thức</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="h-11 rounded-control border border-ctrl bg-soft px-3.5 text-sm text-ink outline-none focus:border-mint focus:ring-2 focus:ring-mint-100"
              >
                <option value="Tiền mặt">Tiền mặt</option>
                <option value="Chuyển khoản">Chuyển khoản</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
          </>
        )}
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || selected.size === 0}>
          {submitting ? "Đang ghi…" : `Xác nhận đã thu ${money(total)}`}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * Hoàn tác thu quỹ — liệt kê các khoản "đã đóng" của thành viên để admin
 * chọn lại khoản đã ghi nhầm, đánh dấu lại thành "chưa đóng" và gỡ dòng
 * sổ quỹ tương ứng.
 */
function UnpayFeeModal({
  open,
  onClose,
  slug,
  name,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  name: string;
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<MemberFeeHistoryRow[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiGet<MemberFeeHistoryRow[]>(`/members/${slug}/fees`)
      .then((history) => setRows(history.filter((f) => f.status === "paid")))
      .catch(() => showToast("Không tải được khoản quỹ của thành viên này"))
      .finally(() => setLoading(false));
  }, [open, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUnpay(feeId: string) {
    setPendingId(feeId);
    try {
      await apiPost(`/fees/${feeId}/unpay`);
      setRows((prev) => prev.filter((r) => r.id !== feeId));
      showToast(`Đã hoàn tác 1 khoản thu quỹ của ${name}`);
      router.refresh();
    } catch {
      showToast("Hoàn tác thất bại, thử lại sau");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader
        title="Hoàn tác thu quỹ"
        subtitle={loading ? "Đang tải…" : `${name} · chọn khoản cần đánh dấu lại là chưa đóng`}
      />
      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-control border border-border px-3.5 py-2.5">
            <span className="flex-1 text-sm font-medium text-ink">Đợt {formatOpened(r.period.openedAt)}</span>
            <span className="font-mono text-sm text-ink">{money(r.amount)}</span>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleUnpay(r.id)}
              disabled={pendingId === r.id}
            >
              {pendingId === r.id ? "Đang xử lý…" : "Hoàn tác"}
            </Button>
          </div>
        ))}
        {!loading && rows.length === 0 && <p className="text-sm text-mut">Chưa có khoản nào đã đóng để hoàn tác.</p>}
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      </ModalFooter>
    </Modal>
  );
}

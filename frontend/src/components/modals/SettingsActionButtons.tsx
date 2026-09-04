"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { InputField } from "@/components/ui/Input";
import { ConfirmTypeModal } from "@/components/ui/ConfirmTypeModal";
import { useToast } from "@/components/ui/Toast";
import { apiPatch, apiPost, apiDelete } from "@/lib/api/client";

type FixedSchedule = { id: string; weekday: number; startTime: string; endTime: string; court: string | null };

const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

type Draft = { weekday: number; startTime: string; endTime: string; court: string };

const EMPTY_DRAFT: Draft = { weekday: 2, startTime: "19:00", endTime: "21:00", court: "" };

function toDraft(s: FixedSchedule): Draft {
  return {
    weekday: s.weekday,
    startTime: s.startTime.slice(0, 5),
    endTime: s.endTime.slice(0, 5),
    court: s.court ?? "",
  };
}

/** Danh sách lịch cố định — mỗi ngày trong tuần có thể có khung giờ/sân riêng,
 *  thêm/sửa/xóa từng khung độc lập chứ không ép chung một giờ cho cả tuần. */
export function FixedSchedulesCard({ schedules }: { schedules: FixedSchedule[] }) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  function openEdit(s: FixedSchedule) {
    setDraft(toDraft(s));
    setEditingId(s.id);
  }

  function openCreate() {
    setDraft(EMPTY_DRAFT);
    setEditingId("new");
  }

  async function handleSubmit() {
    if (draft.startTime >= draft.endTime) {
      showToast("Giờ kết thúc phải sau giờ bắt đầu");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        weekday: draft.weekday,
        startTime: draft.startTime,
        endTime: draft.endTime,
        court: draft.court.trim() || undefined,
      };
      if (editingId === "new") {
        await apiPost("/schedules", body);
        showToast("Đã thêm lịch cố định");
      } else if (editingId) {
        await apiPatch(`/schedules/${editingId}`, body);
        showToast("Đã cập nhật lịch cố định");
      }
      setEditingId(null);
      router.refresh();
    } catch {
      showToast("Lưu thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    setSubmitting(true);
    try {
      await apiDelete(`/schedules/${deletingId}`);
      showToast("Đã xóa lịch cố định");
      setDeletingId(null);
      router.refresh();
    } catch {
      showToast("Xóa thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {schedules.length === 0 && (
        <p className="text-sm text-sec">Chưa có lịch cố định nào.</p>
      )}

      {schedules.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between gap-3 rounded-control border border-ctrl bg-soft/50 px-4 py-3"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-ink">{WEEKDAYS[s.weekday]}</span>
            <span className="text-xs text-sec">
              {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)} · {s.court ?? "Chưa chọn sân"}
            </span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => openEdit(s)}>
              Sửa
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setDeletingId(s.id)}>
              Xóa
            </Button>
          </div>
        </div>
      ))}

      <Button variant="secondary" className="self-start" onClick={openCreate}>
        + Thêm lịch cố định
      </Button>

      <Modal open={editingId !== null} onClose={() => setEditingId(null)}>
        <ModalHeader
          title={editingId === "new" ? "Thêm lịch cố định" : "Sửa lịch cố định"}
          subtitle="Mỗi ngày trong tuần có thể có khung giờ và sân riêng"
        />
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="weekday" className="text-xs font-medium text-sec">
              Ngày trong tuần
            </label>
            <select
              id="weekday"
              value={draft.weekday}
              onChange={(e) => setDraft({ ...draft, weekday: Number(e.target.value) })}
              className="h-11 w-full rounded-control border border-ctrl bg-soft px-3.5 text-sm text-ink outline-none focus:border-mint focus:ring-2 focus:ring-mint-100"
            >
              {WEEKDAYS.map((label, idx) => (
                <option key={idx} value={idx}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Giờ bắt đầu"
              type="time"
              value={draft.startTime}
              onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
            />
            <InputField
              label="Giờ kết thúc"
              type="time"
              value={draft.endTime}
              onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
            />
          </div>
          <InputField
            label="Sân"
            value={draft.court}
            onChange={(e) => setDraft({ ...draft, court: e.target.value })}
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setEditingId(null)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Đang lưu…" : "Lưu lịch cố định"}
          </Button>
        </ModalFooter>
      </Modal>

      <ConfirmTypeModal
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title="Xóa lịch cố định"
        description="Các buổi đã sinh từ lịch này trước đó sẽ không bị ảnh hưởng — chỉ ngừng tự sinh buổi mới theo khung này."
        confirmWord="XOA"
        confirmLabel="Xóa lịch cố định"
        onConfirm={handleDelete}
      />
    </div>
  );
}

export function DeleteClubButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button variant="destructive" className="self-start" onClick={() => setOpen(true)}>
        Xóa CLB
      </Button>
      <ConfirmTypeModal
        open={open}
        onClose={() => setOpen(false)}
        title="Xóa CLB"
        description="Toàn bộ lịch sử buổi, quỹ và thành viên sẽ bị xóa vĩnh viễn. Không thể hoàn tác. (Backend hiện chưa có API xóa CLB — cần bổ sung nếu muốn dùng chức năng này thật.)"
        confirmWord="XOA CLB"
        confirmLabel="Xóa CLB vĩnh viễn"
        onConfirm={() => router.push("/")}
      />
    </>
  );
}

type MemberRow = { id: string; fullName: string; role: "admin" | "member"; status: string };

const ROLE_LABEL: Record<MemberRow["role"], string> = { admin: "Chủ nhiệm", member: "Thành viên" };

/** Danh sách thành viên + đổi vai trò (chủ nhiệm / thành viên) cho từng người.
 *  Tự khóa dòng của chính người đang đăng nhập để tránh tự hạ quyền của mình
 *  rồi mất quyền vào lại Cài đặt. */
export function MemberRolesCard({
  members,
  currentMemberId,
}: {
  members: MemberRow[];
  currentMemberId: string;
}) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const router = useRouter();

  async function handleRoleChange(member: MemberRow, role: MemberRow["role"]) {
    if (role === member.role) return;
    setSavingId(member.id);
    try {
      await apiPatch(`/members/${member.id}`, { role });
      showToast(`Đã đổi ${member.fullName} thành ${ROLE_LABEL[role]}`);
      router.refresh();
    } catch {
      showToast("Đổi quyền thất bại, thử lại sau");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {members.map((m) => {
        const isSelf = m.id === currentMemberId;
        return (
          <div
            key={m.id}
            className="flex items-center justify-between gap-3 rounded-control border border-ctrl bg-soft/50 px-4 py-2.5"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-ink">
                {m.fullName}
                {isSelf && <span className="ml-1.5 text-xs font-normal text-mut">(bạn)</span>}
              </span>
              {m.status !== "active" && (
                <span className="text-xs text-mut">Ngừng hoạt động</span>
              )}
            </div>
            <select
              value={m.role}
              disabled={isSelf || savingId === m.id}
              onChange={(e) => handleRoleChange(m, e.target.value as MemberRow["role"])}
              className="h-9 rounded-control border border-ctrl bg-surface px-3 text-sm text-ink outline-none focus:border-mint focus:ring-2 focus:ring-mint-100 disabled:opacity-50"
            >
              <option value="admin">Chủ nhiệm</option>
              <option value="member">Thành viên</option>
            </select>
          </div>
        );
      })}
      {members.length === 0 && <p className="text-sm text-sec">Chưa có thành viên nào.</p>}
      <p className="text-xs text-mut">
        Không tự đổi quyền của chính mình được — nhờ một chủ nhiệm khác đổi giúp nếu cần.
      </p>
    </div>
  );
}

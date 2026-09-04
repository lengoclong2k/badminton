"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { InputField } from "@/components/ui/Input";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { SexChip } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";
import { apiPost } from "@/lib/api/client";

type Sex = "nam" | "nu";
type ClubMember = { id: string; fullName: string; sex: Sex };
type DraftGuest = { name: string; sex: Sex; fee: number };

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} ₫`;

export function CreateSessionButton({
  members = [],
  defaultGuestFeeMale = 0,
  defaultGuestFeeFemale = 0,
}: {
  members?: ClubMember[];
  defaultGuestFeeMale?: number;
  defaultGuestFeeFemale?: number;
}) {
  const [open, setOpen] = useState(false);
  const [playDate, setPlayDate] = useState("");
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("21:00");
  const [court, setCourt] = useState("");
  // Mặc định chọn sẵn toàn bộ thành viên trong đội — admin bỏ chọn ai không đi.
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    () => new Set(members.map((m) => m.id)),
  );
  const [guestName, setGuestName] = useState("");
  const [guestSex, setGuestSex] = useState<Sex>("nam");
  const [guestFee, setGuestFee] = useState(defaultGuestFeeMale);
  const [draftGuests, setDraftGuests] = useState<DraftGuest[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  function toggleMember(id: string) {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectGuestSex(sex: Sex) {
    setGuestSex(sex);
    setGuestFee(sex === "nam" ? defaultGuestFeeMale : defaultGuestFeeFemale);
  }

  function addDraftGuest() {
    if (!guestName.trim()) return;
    setDraftGuests((prev) => [...prev, { name: guestName.trim(), sex: guestSex, fee: guestFee }]);
    setGuestName("");
    setGuestFee(defaultGuestFeeMale);
    setGuestSex("nam");
  }

  function removeDraftGuest(index: number) {
    setDraftGuests((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!playDate || !startTime || !endTime) {
      showToast("Nhập đầy đủ ngày và khung giờ");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/sessions", {
        playDate,
        startTime,
        endTime,
        court: court.trim() || undefined,
        sessionType: "extra",
        openForRsvp: true,
        memberIds: selectedMemberIds.size > 0 ? [...selectedMemberIds] : undefined,
        guests:
          draftGuests.length > 0
            ? draftGuests.map((g) => ({ guestName: g.name, guestSex: g.sex, guestFee: g.fee }))
            : undefined,
      });
      setOpen(false);
      setDraftGuests([]);
      showToast("Đã tạo buổi mới và mở đăng ký");
      router.refresh();
    } catch {
      showToast("Tạo buổi thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Tạo buổi</Button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalHeader title="Tạo buổi đánh" subtitle="Buổi phát sinh — không ảnh hưởng quỹ tháng" />
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField label="Ngày" type="date" value={playDate} onChange={(e) => setPlayDate(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Bắt đầu" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <InputField label="Kết thúc" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <InputField
            label="Sân"
            placeholder="VD: Sân Cầu Lông Thành Công"
            value={court}
            onChange={(e) => setCourt(e.target.value)}
          />

          {members.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-ink">
                Người tham gia ({selectedMemberIds.size}/{members.length})
              </p>
              <p className="text-xs text-mut">
                Mặc định chọn cả đội — bỏ chọn ai không đi buổi này. Gửi link đăng ký thì tên đã chọn sẽ hiện sẵn để điểm danh.
              </p>
              <div className="flex max-h-[180px] flex-wrap gap-2 overflow-y-auto rounded-control bg-soft p-3">
                {members.map((m) => {
                  const checked = selectedMemberIds.has(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMember(m.id)}
                      className={`flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm font-medium ${
                        checked
                          ? "border-mint bg-mint-50 text-mint-deep"
                          : "border-border bg-white text-ink hover:bg-mint-50"
                      }`}
                    >
                      <SexChip sex={m.sex} />
                      {m.fullName}
                      {checked ? " ✓" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-line pt-3.5">
            <p className="text-sm font-medium text-ink">Khách tham gia hôm đó (tùy chọn, không giới hạn số lượng)</p>
            <div className="flex flex-col gap-2">
              <InputField
                label="Tên khách"
                placeholder="VD: Anh Tuấn"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-3 pb-2.5">
                  <label className="flex items-center gap-1 text-sm text-ink">
                    <input
                      type="radio"
                      checked={guestSex === "nam"}
                      onChange={() => selectGuestSex("nam")}
                      className="accent-mint"
                    />
                    Nam
                  </label>
                  <label className="flex items-center gap-1 text-sm text-ink">
                    <input
                      type="radio"
                      checked={guestSex === "nu"}
                      onChange={() => selectGuestSex("nu")}
                      className="accent-mint"
                    />
                    Nữ
                  </label>
                </div>
                <div className="flex-1">
                  <CurrencyInput label="Số tiền cần đóng" value={guestFee} onValueChange={setGuestFee} />
                </div>
                <Button type="button" variant="secondary" onClick={addDraftGuest}>
                  + Thêm
                </Button>
              </div>
            </div>
            {draftGuests.length > 0 && (
              <div className="flex flex-col gap-2">
                {draftGuests.map((g, i) => (
                  <div
                    key={`${g.name}-${i}`}
                    className="flex items-center gap-2 rounded-control border border-border bg-soft px-3 py-2 text-sm text-ink"
                  >
                    <SexChip sex={g.sex} />
                    <span className="flex-1 font-medium">{g.name}</span>
                    <span className="font-mono text-mint-deep">{money(g.fee)}</span>
                    <button
                      type="button"
                      onClick={() => removeDraftGuest(i)}
                      className="text-mut hover:text-danger-ink"
                      aria-label={`Bỏ khách ${g.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Đang tạo…" : "Tạo buổi & lấy link đăng ký"}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

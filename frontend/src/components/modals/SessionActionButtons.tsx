"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { InputField } from "@/components/ui/Input";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { SexChip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { apiGet, apiPatch, apiPost } from "@/lib/api/client";

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} ₫`;

type Sex = "nam" | "nu";
type ClubMember = { id: string; fullName: string; sex: Sex };
type DraftGuest = { name: string; sex: Sex; fee: number };

/** Trạng thái khách đã nộp tiền hay chưa (badge, KHÔNG bấm được — cùng kiểu
 *  dáng viên thuốc với badge điểm danh của thành viên) tách riêng khỏi nút
 *  hành động để đổi trạng thái. "Thu từ khách" khi chốt buổi CHỈ tính những
 *  khách đã được đánh dấu ở đây — chưa đánh dấu thì vẫn tính là 0đ dù đã ghi
 *  tên khách vào buổi. */
export function GuestPaidBadge({
  attendeeId,
  guestFee,
  guestPaid,
  canEdit,
}: {
  attendeeId: string;
  guestFee: number;
  guestPaid: boolean;
  canEdit: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  async function toggle() {
    if (!canEdit || submitting) return;
    setSubmitting(true);
    try {
      await apiPatch(`/sessions/attendees/${attendeeId}/payment`, { guestPaid: !guestPaid });
      router.refresh();
    } catch {
      showToast("Cập nhật thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-w-[280px] items-center justify-end gap-3">
      <Badge tone={guestPaid ? "success" : "danger"}>
        {guestPaid ? `Đã nộp ${money(guestFee)}` : `Chưa nộp ${money(guestFee)}`}
      </Badge>
      {canEdit && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={toggle}
          disabled={submitting}
          className="shrink-0"
        >
          {submitting ? "Đang lưu…" : guestPaid ? "Bỏ đánh dấu" : "Đánh dấu đã nộp"}
        </Button>
      )}
    </div>
  );
}

type RsvpMemberStatus = "pending" | "registered" | "cancelled";

/** Điểm danh RSVP của 1 thành viên. Từ giờ RSVP CHÍNH LÀ điểm danh: thành
 *  viên tự bấm "Có đi"/"Không đi" qua link công khai và bị khóa sau khi chọn
 *  (không tự đổi lại được nữa). Control này là lối admin ghi đè khi cần —
 *  member đổi ý nhờ admin sửa, hoặc admin điểm danh thay người không tự bấm
 *  link. Không còn khái niệm "có mặt/vắng" thực tế trên sân nữa. */
export function MemberRsvpControl({
  attendeeId,
  status,
  canEdit,
}: {
  attendeeId: string;
  status: RsvpMemberStatus;
  canEdit: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  async function mark(value: "registered" | "cancelled") {
    if (!canEdit || submitting || status === value) return;
    setSubmitting(true);
    try {
      await apiPatch(`/sessions/attendees/${attendeeId}/rsvp`, { rsvpStatus: value });
      router.refresh();
    } catch {
      showToast("Điểm danh thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  const label = status === "registered" ? "Có đi" : status === "cancelled" ? "Không đi" : "Chưa điểm danh";
  const tone = status === "registered" ? "success" : status === "cancelled" ? "danger" : "info";

  // Không sửa được (viewer thường, hoặc buổi đã chốt): chỉ hiện nhãn trạng thái.
  if (!canEdit) {
    return (
      <div className="flex min-w-[280px] items-center justify-end">
        <Badge tone={tone}>{label}</Badge>
      </div>
    );
  }

  // Sửa được: 2 nút Có đi/Không đi đã đủ để thể hiện trạng thái hiện tại
  // (nút tương ứng được tô đậm) — bỏ Badge để khỏi lặp lại cùng 1 nhãn 2 lần.
  // Khi còn "Chưa điểm danh" thì hiện thêm nhãn đó vì chưa nút nào được tô.
  return (
    <div className="flex min-w-[280px] items-center justify-end gap-2">
      {status === "pending" && <Badge tone={tone}>{label}</Badge>}
      <Button
        type="button"
        size="sm"
        variant={status === "registered" ? "primary" : "secondary"}
        onClick={() => mark("registered")}
        disabled={submitting}
        className="shrink-0"
      >
        Có đi
      </Button>
      <Button
        type="button"
        size="sm"
        variant={status === "cancelled" ? "destructive" : "secondary"}
        onClick={() => mark("cancelled")}
        disabled={submitting}
        className="shrink-0"
      >
        Không đi
      </Button>
    </div>
  );
}

/** Điểm danh nhanh hàng loạt — đánh dấu "Có đi" cho mọi thành viên còn
 *  "chưa điểm danh". Dùng khi buổi đủ người như dự kiến, đỡ phải bấm từng
 *  người. Ai không đi thì admin vẫn sửa tay lại "Không đi" sau. */
export function BulkMarkGoingButton({
  slug,
  pendingAttendeeIds,
}: {
  slug: string;
  pendingAttendeeIds: string[];
}) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  if (pendingAttendeeIds.length === 0) return null;

  async function handleClick() {
    setSubmitting(true);
    try {
      await apiPatch(`/sessions/${slug}/rsvp-status`, {
        items: pendingAttendeeIds.map((attendeeId) => ({ attendeeId, rsvpStatus: "registered" })),
      });
      showToast(`Đã điểm danh có đi ${pendingAttendeeIds.length} người`);
      router.refresh();
    } catch {
      showToast("Điểm danh hàng loạt thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={handleClick} disabled={submitting}>
      {submitting ? "Đang lưu…" : `Điểm danh có đi tất cả (${pendingAttendeeIds.length})`}
    </Button>
  );
}

/** Thêm thành viên/khách vào buổi đang mở — dùng khi gần đến ngày mới biết
 *  thêm người đi, để tên mới cũng hiện trên link RSVP đã gửi. Không giới hạn
 *  số người thêm; admin ghi số tiền khách cần đóng ngay lúc thêm. */
export function AddParticipantsButton({
  slug,
  members,
  attendingMemberIds,
  defaultGuestFeeMale = 0,
  defaultGuestFeeFemale = 0,
}: {
  slug: string;
  members: ClubMember[];
  attendingMemberIds: string[];
  defaultGuestFeeMale?: number;
  defaultGuestFeeFemale?: number;
}) {
  const [open, setOpen] = useState(false);
  const attendingSet = new Set(attendingMemberIds);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [guestName, setGuestName] = useState("");
  const [guestSex, setGuestSex] = useState<Sex>("nam");
  const [guestFee, setGuestFee] = useState(defaultGuestFeeMale);
  const [draftGuests, setDraftGuests] = useState<DraftGuest[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const addableMembers = members.filter((m) => !attendingSet.has(m.id));

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

  function resetAndClose() {
    setSelectedMemberIds(new Set());
    setDraftGuests([]);
    setOpen(false);
  }

  async function handleSubmit() {
    if (selectedMemberIds.size === 0 && draftGuests.length === 0) {
      showToast("Chọn ít nhất một người để thêm");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost(`/sessions/${slug}/participants`, {
        memberIds: selectedMemberIds.size > 0 ? [...selectedMemberIds] : undefined,
        guests:
          draftGuests.length > 0
            ? draftGuests.map((g) => ({ guestName: g.name, guestSex: g.sex, guestFee: g.fee }))
            : undefined,
      });
      resetAndClose();
      showToast("Đã thêm người tham gia");
      router.refresh();
    } catch {
      showToast("Thêm người thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + Thêm người
      </Button>
      <Modal open={open} onClose={resetAndClose}>
        <ModalHeader
          title="Thêm người tham gia"
          subtitle="Người mới thêm sẽ hiện luôn trên link đăng ký đã gửi"
        />
        <div className="flex flex-col gap-4">
          {addableMembers.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-ink">Thành viên chưa có trong buổi</p>
              <div className="flex max-h-[180px] flex-wrap gap-2 overflow-y-auto rounded-control bg-soft p-3">
                {addableMembers.map((m) => {
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
          ) : (
            <p className="text-sm text-mut">Tất cả thành viên đã có trong buổi này.</p>
          )}

          <div className="flex flex-col gap-2 border-t border-line pt-3.5">
            <p className="text-sm font-medium text-ink">Thêm khách (không giới hạn số lượng)</p>
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
          <Button variant="secondary" onClick={resetAndClose}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Đang thêm…" : "Thêm vào buổi"}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

/** Sửa ngày/giờ/sân của một buổi — admin và thành viên đều dùng được
 *  (backend cho phép cả hai role PATCH /sessions/:id). */
export function EditSessionButton({
  slug,
  playDate,
  startTime,
  endTime,
  court,
}: {
  slug: string;
  playDate: string;
  startTime: string;
  endTime: string;
  court: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(playDate.slice(0, 10));
  const [start, setStart] = useState(startTime.slice(0, 5));
  const [end, setEnd] = useState(endTime.slice(0, 5));
  const [courtValue, setCourtValue] = useState(court ?? "");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  async function handleSubmit() {
    if (start >= end) {
      showToast("Giờ kết thúc phải sau giờ bắt đầu");
      return;
    }
    setSubmitting(true);
    try {
      await apiPatch(`/sessions/${slug}`, {
        playDate: date,
        startTime: start,
        endTime: end,
        court: courtValue.trim() || undefined,
      });
      setOpen(false);
      showToast("Đã cập nhật buổi đánh");
      router.refresh();
    } catch {
      showToast("Cập nhật thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Sửa buổi
      </Button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalHeader title="Sửa buổi đánh" />
        <div className="flex flex-col gap-4">
          <InputField label="Ngày" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Bắt đầu" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            <InputField label="Kết thúc" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <InputField label="Sân" value={courtValue} onChange={(e) => setCourtValue(e.target.value)} />
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

/**
 * Lấy link đăng ký/điểm danh công khai (/rsvp/{slug}) để gửi cho thành viên
 * qua Zalo, Messenger... Link chỉ còn tác dụng khi buổi còn ở trạng thái
 * "open" — hàm SQL rsvp_set_member_status/rsvp_add_guest đã tự chặn khi buổi đã
 * chốt hoặc đã hủy, nên khi đó vô hiệu hóa luôn nút sao chép ở đây để khỏi
 * gửi nhầm link chết.
 */
export function RsvpLinkButton({ slug, disabled }: { slug: string; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function handleOpen() {
    setOpen(true);
    if (url || disabled || loading) return;
    setLoading(true);
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : undefined;
      const query = baseUrl ? `?baseUrl=${encodeURIComponent(baseUrl)}` : "";
      const result = await apiGet<{ slug: string; url: string }>(`/sessions/${slug}/rsvp-link${query}`);
      setUrl(result.url);
    } catch {
      showToast("Không lấy được link, thử lại sau");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!url || disabled) return;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Đã sao chép link");
    } catch {
      showToast("Sao chép thất bại, bạn tự bôi đen để copy nhé");
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={handleOpen}>
        Lấy link điểm danh
      </Button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalHeader
          title="Link điểm danh / đăng ký"
          subtitle={
            disabled
              ? "Buổi đã chốt hoặc đã hủy — link đăng ký đã hết hạn, không thể chia sẻ thêm."
              : "Gửi link này cho mọi người để họ tự đăng ký hoặc bỏ đăng ký."
          }
        />
        {disabled ? (
          <div className="rounded-control border border-border bg-soft px-3.5 py-2.5 text-sm text-mut">
            Link đã hết hạn
          </div>
        ) : (
          <input
            readOnly
            value={loading ? "Đang tải…" : url ?? ""}
            onFocus={(e) => e.target.select()}
            className="h-11 w-full rounded-control border border-ctrl bg-soft px-3.5 text-sm text-ink outline-none focus:border-mint focus:ring-2 focus:ring-mint-100"
          />
        )}
        <ModalFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Đóng
          </Button>
          <Button onClick={handleCopy} disabled={disabled || !url}>
            Sao chép
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

/** Badge trạng thái buổi để admin biết buổi nào đã mở đăng ký, đã chốt hay đã hủy —
 *  dùng chung cho cả màn Lịch đánh (danh sách) và màn chi tiết buổi. */
export function SessionStatusBadge({ status }: { status: string }) {
  const meta: Record<string, { label: string; tone: "info" | "success" | "danger" | "warn" }> = {
    draft: { label: "Nháp · chưa mở đăng ký", tone: "info" },
    open: { label: "Đang mở đăng ký", tone: "success" },
    closed: { label: "Đã chốt", tone: "warn" },
    cancelled: { label: "Đã hủy", tone: "danger" },
  };
  const m = meta[status] ?? { label: status, tone: "info" as const };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

/** Chuyển buổi cố định từ "nháp" sang "mở đăng ký" — chỉ hiện khi status = draft.
 *  Buổi vãng lai không cần nút này vì luôn tạo thẳng ở trạng thái open. */
export function OpenSessionButton({ slug }: { slug: string }) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  async function handleOpen() {
    setSubmitting(true);
    try {
      await apiPost(`/sessions/${slug}/open`, {});
      showToast("Đã mở đăng ký buổi này");
      router.refresh();
    } catch {
      showToast("Mở đăng ký thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button type="button" onClick={handleOpen} disabled={submitting}>
      {submitting ? "Đang mở…" : "Mở đăng ký"}
    </Button>
  );
}

export function CancelSessionButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  async function handleCancel() {
    setSubmitting(true);
    try {
      await apiPost(`/sessions/${slug}/cancel`, {});
      setOpen(false);
      showToast("Đã hủy buổi");
      router.push("/admin/schedule");
      router.refresh();
    } catch {
      showToast("Hủy buổi thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Hủy buổi
      </Button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalHeader
          title="Hủy buổi này?"
          subtitle="Toàn bộ đăng ký sẽ bị hủy, thành viên nhận được thông báo. Buổi cố định không mất lượt quỹ."
        />
        <ModalFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Đóng
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={submitting}>
            {submitting ? "Đang hủy…" : "Hủy buổi"}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

export function CloseSessionButton({
  slug,
  totalCost,
  guestIncome,
}: {
  slug: string;
  totalCost: number;
  guestIncome: number;
}) {
  const [open, setOpen] = useState(false);
  const [courtCost, setCourtCost] = useState(totalCost);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const result = await apiPost<{ balance_after: number }>(`/sessions/${slug}/close`, {
        courtCost,
      });
      setOpen(false);
      showToast(`Đã chốt buổi · Quỹ còn ${money(result.balance_after)}`);
      router.push("/admin/fund");
      router.refresh();
    } catch {
      showToast("Chốt buổi thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Chốt buổi</Button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalHeader title="Chốt buổi" subtitle="Nhập tiền sân thực tế trước khi xác nhận" />
        <div className="flex flex-col gap-3 rounded-control bg-soft p-4">
          <CurrencyInput label="Tiền sân" defaultValue={courtCost} onValueChange={setCourtCost} />
          <div className="flex justify-between text-sm">
            <span className="text-sec">Thu từ khách</span>
            <span className="font-mono text-mint-deep">+{money(guestIncome)}</span>
          </div>
          <p className="text-xs text-mut">
            Tiền cầu và các chi phí khác vui lòng ghi ở màn Quỹ CLB (Ghi chi khoản khác).
          </p>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Đóng
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Đang chốt…" : "Xác nhận chốt buổi"}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

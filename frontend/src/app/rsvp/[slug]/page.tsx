"use client";

import { useEffect, useState, use as usePromise } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { SexChip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Input";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api/v1";

type RsvpMemberStatus = "pending" | "registered" | "cancelled";

type RsvpMember = {
  id: string;
  full_name: string;
  sex: "nam" | "nu";
  status: RsvpMemberStatus;
};

type RsvpSession = {
  club_name: string;
  slug: string;
  play_date: string;
  start_time: string;
  end_time: string;
  court: string | null;
  status: string;
  is_open: boolean;
  guest_slots_enabled: boolean;
  guest_slots_max: number;
  guest_slots_left: number;
  guest_fee_male: number;
  guest_fee_female: number;
  members: RsvpMember[];
};

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} ₫`;

/** Backend trả lỗi dạng {statusCode, message, ...} (xem AllExceptionsFilter) —
 *  message chính là câu RAISE tiếng Việt từ hàm SQL, ví dụ "Buổi này chưa mở
 *  hoặc đã đóng đăng ký". Bóc ra để hiện đúng lý do thay vì câu chung chung. */
async function rsvpFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/rsvp${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let message = body || res.statusText;
    try {
      const parsed = JSON.parse(body) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      // body không phải JSON — giữ nguyên text/statusText
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export default function RsvpPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = usePromise(params);
  const [session, setSession] = useState<RsvpSession | null>(null);
  // Lỗi khi TẢI buổi (buổi không tồn tại) — chặn cả trang vì không có gì để
  // hiện. Tách riêng khỏi lỗi thao tác (bấm tên/thêm khách) bên dưới: một lượt
  // bấm thất bại không được phép xóa mất toàn bộ danh sách đã tải thành công.
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestSex, setGuestSex] = useState<"nam" | "nu">("nam");
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  const [guestMessage, setGuestMessage] = useState("");

  function load() {
    rsvpFetch<RsvpSession>(`/${slug}`)
      .then((data) => {
        setSession(data);
        setLoadError("");
      })
      .catch(() => setLoadError("Không tìm thấy buổi đánh này."));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function respond(memberId: string, going: boolean) {
    setBusyId(memberId);
    setActionError("");
    try {
      await rsvpFetch(`/${slug}/respond`, { method: "POST", body: JSON.stringify({ memberId, going }) });
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Điểm danh thất bại, thử lại sau.");
    } finally {
      setBusyId(null);
    }
  }

  async function addGuest() {
    if (!guestName.trim()) return;
    setGuestSubmitting(true);
    setGuestMessage("");
    try {
      await rsvpFetch(`/${slug}/guests`, {
        method: "POST",
        body: JSON.stringify({ guestName: guestName.trim(), guestSex }),
      });
      setGuestName("");
      setGuestMessage("Đã đăng ký slot khách thành công.");
      load();
    } catch (err) {
      setGuestMessage(err instanceof Error ? err.message : "Đăng ký khách thất bại — có thể đã hết slot.");
    } finally {
      setGuestSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center px-5 py-8">
        <p className="text-sm text-danger-ink">{loadError}</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center px-5 py-8">
        <p className="text-sm text-mut">Đang tải…</p>
      </div>
    );
  }

  const playDate = new Date(session.play_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col gap-5 px-5 py-8">
      <div>
        <h1 className="text-xl font-bold text-ink">Đăng ký buổi đánh</h1>
        <p className="text-sm text-sec">
          {session.club_name} · {playDate} · {session.start_time.slice(0, 5)}–{session.end_time.slice(0, 5)} ·{" "}
          {session.court ?? "Chưa chọn sân"} · Không cần đăng nhập
        </p>
        {!session.is_open && <p className="text-sm text-danger-ink">Buổi này hiện chưa mở hoặc đã đóng đăng ký.</p>}
      </div>

      <Card className="flex flex-col gap-3">
        <CardTitle>Điểm danh: bạn có đi buổi này không?</CardTitle>
        <p className="text-xs text-mut">
          Thành viên: 0 ₫ · Quỹ đã tính theo tháng · Chỉ chọn được 1 lần, chọn nhầm nhờ admin sửa giúp
        </p>
        <div className="flex flex-col gap-2">
          {session.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-control border border-border bg-soft px-3.5 py-2.5"
            >
              <span className="text-sm font-medium text-ink">{m.full_name}</span>
              {m.status === "pending" ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!session.is_open || busyId === m.id}
                    onClick={() => respond(m.id, true)}
                    className="rounded-pill border border-mint bg-mint-50 px-3 py-1.5 text-xs font-semibold text-mint-deep disabled:opacity-60"
                  >
                    Có đi
                  </button>
                  <button
                    type="button"
                    disabled={!session.is_open || busyId === m.id}
                    onClick={() => respond(m.id, false)}
                    className="rounded-pill border border-danger bg-danger-50 px-3 py-1.5 text-xs font-semibold text-danger-ink disabled:opacity-60"
                  >
                    Không đi
                  </button>
                </div>
              ) : (
                <span
                  className={`rounded-pill px-3 py-1.5 text-xs font-semibold ${
                    m.status === "registered" ? "bg-mint-100 text-mint-deep" : "bg-danger-50 text-danger-ink"
                  }`}
                >
                  {m.status === "registered" ? "✓ Có đi" : "✗ Không đi"}
                </span>
              )}
            </div>
          ))}
        </div>
        {actionError && <p className="text-xs text-danger-ink">{actionError}</p>}
      </Card>

      {session.guest_slots_enabled && (
        <Card className="flex flex-col gap-3">
          <CardTitle>Slot khách · còn {session.guest_slots_left}</CardTitle>
          <div className="flex items-center gap-2">
            <SexChip sex="nam" /> <span className="text-sm text-sec">{money(session.guest_fee_male)}/buổi</span>
          </div>
          <div className="flex items-center gap-2">
            <SexChip sex="nu" /> <span className="text-sm text-sec">{money(session.guest_fee_female)}/buổi</span>
          </div>
          {session.is_open && session.guest_slots_left > 0 && (
            <div className="flex flex-col gap-3 border-t border-line pt-3">
              <InputField
                label="Tên khách"
                placeholder="VD: Anh Tuấn"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm text-ink">
                  <input
                    type="radio"
                    checked={guestSex === "nam"}
                    onChange={() => setGuestSex("nam")}
                    className="accent-mint"
                  />
                  Nam
                </label>
                <label className="flex items-center gap-1.5 text-sm text-ink">
                  <input
                    type="radio"
                    checked={guestSex === "nu"}
                    onChange={() => setGuestSex("nu")}
                    className="accent-mint"
                  />
                  Nữ
                </label>
              </div>
              <Button onClick={addGuest} disabled={guestSubmitting}>
                {guestSubmitting ? "Đang đăng ký…" : "Đăng ký slot khách"}
              </Button>
              {guestMessage && <p className="text-xs text-mut">{guestMessage}</p>}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

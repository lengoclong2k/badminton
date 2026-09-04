import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/api/server";

type MyAttendance = {
  id: string;
  rsvpStatus: "pending" | "registered" | "cancelled";
  session: {
    playDate: string;
    startTime: string;
    endTime: string;
    court: string | null;
    sessionType: "fixed" | "extra";
    status: string;
  };
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  return `${WEEKDAYS[d.getDay()]} ${d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`;
}

export default async function MySchedulePage() {
  const rows = await apiFetch<MyAttendance[]>("/sessions/me");
  const todayStr = new Date().toISOString().slice(0, 10);

  const upcoming = rows.filter((r) => r.session.playDate.slice(0, 10) >= todayStr && r.rsvpStatus === "registered");
  const past = rows.filter((r) => r.session.playDate.slice(0, 10) < todayStr);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-ink">Lịch của tôi</h1>

      <div>
        <p className="mb-2 text-xs font-semibold text-sec uppercase">Sắp tới</p>
        {upcoming.map((r) => (
          <Card key={r.id} className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-ink">
              {formatDate(r.session.playDate)} · {r.session.startTime.slice(0, 5)}–{r.session.endTime.slice(0, 5)}
            </p>
            <p className="text-xs text-sec">
              {r.session.court ?? "Chưa chọn sân"} · {r.session.sessionType === "fixed" ? "Buổi cố định" : "Buổi phát sinh"}
            </p>
            <Badge tone="success">Đã đăng ký</Badge>
          </Card>
        ))}
        {upcoming.length === 0 && <p className="text-sm text-mut">Bạn chưa đăng ký buổi sắp tới nào.</p>}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-sec uppercase">Lịch sử</p>
        <div className="flex flex-col gap-2">
          {past.map((r) => (
            <Card key={r.id} className="flex items-center justify-between py-3">
              <p className="text-sm font-medium text-ink">
                {r.session.playDate.slice(8, 10)}/{r.session.playDate.slice(5, 7)} ·{" "}
                {r.session.startTime.slice(0, 5)}–{r.session.endTime.slice(0, 5)}
              </p>
              <Badge tone={r.rsvpStatus === "registered" ? "success" : r.rsvpStatus === "cancelled" ? "danger" : "info"}>
                {r.rsvpStatus === "registered" ? "Có đi" : r.rsvpStatus === "cancelled" ? "Không đi" : "Chưa điểm danh"}
              </Badge>
            </Card>
          ))}
          {past.length === 0 && <p className="text-sm text-mut">Chưa có lịch sử tham gia.</p>}
        </div>
      </div>
    </div>
  );
}

import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ClickableRow, StaticRow } from "@/components/ui/ListRow";
import { Pagination, parsePage } from "@/components/ui/Pagination";
import { CreateSessionButton } from "@/components/modals/CreateSessionModal";
import { GenerateSessionsButton } from "@/components/modals/ScheduleActionButtons";
import { apiFetch } from "@/lib/api/server";

const LIMIT = 20;

type ClubMember = { id: string; fullName: string; sex: "nam" | "nu" };
type PaginatedMembers = { items: ClubMember[]; total: number };

type Me = { isAdmin: boolean; defaultGuestFeeMale: number; defaultGuestFeeFemale: number };

type FixedSchedule = {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  court: string | null;
  isActive: boolean;
};

type SessionSummary = {
  id: string;
  slug: string;
  playDate: string;
  startTime: string;
  endTime: string;
  sessionType: "fixed" | "extra";
  status: string;
  maleCount: number;
  femaleCount: number;
  guestCount: number;
  guestSlotsEnabled: boolean;
  guestSlotsLeft: number;
  fundDelta: number;
};

type PaginatedSessions = { items: SessionSummary[]; total: number; page: number; limit: number };

const money = (n: number) => `${Math.abs(Math.round(n)).toLocaleString("vi-VN")} ₫`;

const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${WEEKDAYS[d.getDay()]} ${d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`;
}

function TypeBadge({ sessionType }: { sessionType: "fixed" | "extra" }) {
  return (
    <Badge tone={sessionType === "fixed" ? "info" : "warn"}>
      {sessionType === "fixed" ? "Cố định" : "Phát sinh"}
    </Badge>
  );
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const [fixedSchedules, upcoming, membersRes, me, closedRes] = await Promise.all([
    apiFetch<FixedSchedule[]>("/schedules"),
    apiFetch<SessionSummary[]>("/sessions/upcoming"),
    apiFetch<PaginatedMembers>("/members?status=active&limit=100"),
    apiFetch<Me>("/auth/me"),
    apiFetch<PaginatedSessions>(`/sessions?status=closed&limit=${LIMIT}&page=${page}`),
  ]);
  const members = membersRes.items ?? [];
  const closedSessions = closedRes.items ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Lịch đánh</h1>
          <p className="text-sm text-sec">Buổi cố định hàng tuần + buổi phát sinh</p>
        </div>
        <CreateSessionButton
          members={members}
          defaultGuestFeeMale={me.defaultGuestFeeMale}
          defaultGuestFeeFemale={me.defaultGuestFeeFemale}
        />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Lịch mẫu hàng tuần</CardTitle>
            <CardSubtitle>
              Lịch lặp lại tự động sinh buổi mới cho 5 tuần tới (job chạy mỗi ngày lúc 00:10). Đây không phải một
              buổi cụ thể nên không có trang chi tiết để bấm vào — muốn sửa giờ/sân thì vào Cài đặt.
            </CardSubtitle>
          </div>
          {me.isAdmin && <GenerateSessionsButton />}
        </div>
        <Card className="flex flex-col gap-2 p-3">
          {fixedSchedules.map((f) => (
            <StaticRow key={f.id} hint="Không có trang chi tiết">
              <div className="flex items-center gap-2.5">
                <Badge tone="info">Cố định</Badge>
                <p className="text-sm font-medium text-ink">
                  {WEEKDAYS[f.weekday]} · {f.startTime.slice(0, 5)}–{f.endTime.slice(0, 5)} ·{" "}
                  {f.court ?? "Chưa chọn sân"}
                </p>
              </div>
            </StaticRow>
          ))}
          {fixedSchedules.length === 0 && (
            <p className="px-4 py-3 text-sm text-mut">Chưa có lịch cố định nào.</p>
          )}
        </Card>
        <p className="text-xs text-mut">
          Không trừ tiền theo buổi — thành viên đóng quỹ THEO THÁNG. Ai không đi thì mất lượt, không hoàn.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <CardTitle className="text-lg">Buổi sắp tới ({upcoming.length})</CardTitle>
          <CardSubtitle>Bấm vào một buổi để xem danh sách đăng ký, thêm người, sửa hoặc chốt sổ.</CardSubtitle>
        </div>
        <Card className="flex flex-col gap-2 p-3">
          {upcoming.map((s) => (
            <ClickableRow key={s.id} href={`/admin/sessions/${s.slug}`}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <TypeBadge sessionType={s.sessionType} />
                  <p className="text-sm font-medium text-ink">
                    {formatDate(s.playDate)} · {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}
                  </p>
                </div>
                <p className="text-xs text-mut">
                  {s.maleCount} nam · {s.femaleCount} nữ · {s.guestCount} khách đăng ký
                  {s.guestSlotsEnabled && s.guestSlotsLeft > 0
                    ? ` · còn ${s.guestSlotsLeft} slot khách tự đăng ký`
                    : ""}
                </p>
              </div>
            </ClickableRow>
          ))}
          {upcoming.length === 0 && <p className="px-4 py-3 text-sm text-mut">Chưa có buổi nào sắp tới.</p>}
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <CardTitle className="text-lg">Buổi đã kết thúc ({closedRes.total})</CardTitle>
          <CardSubtitle>Đã chốt sổ — bấm vào để xem lại chi tiết thu chi.</CardSubtitle>
        </div>
        <Card className="flex flex-col gap-2 p-3">
          {closedSessions.map((s) => (
            <ClickableRow key={s.id} href={`/admin/sessions/${s.slug}`}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <TypeBadge sessionType={s.sessionType} />
                  <p className="text-sm font-medium text-ink">
                    {formatDate(s.playDate)} · {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}
                  </p>
                </div>
                <p className="text-xs text-mut">
                  {s.maleCount} nam · {s.femaleCount} nữ · {s.guestCount} khách ·{" "}
                  <span className={s.fundDelta >= 0 ? "text-mint-deep" : "text-danger-ink"}>
                    Quỹ {s.fundDelta >= 0 ? "+" : "−"}
                    {money(s.fundDelta)}
                  </span>
                </p>
              </div>
            </ClickableRow>
          ))}
          {closedSessions.length === 0 && (
            <p className="px-4 py-3 text-sm text-mut">Chưa có buổi nào chốt sổ.</p>
          )}
          <Pagination
            page={closedRes.page ?? page}
            limit={closedRes.limit ?? LIMIT}
            total={closedRes.total}
            basePath="/admin/schedule"
          />
        </Card>
      </section>
    </div>
  );
}

import { Card, CardTitle, StatCard } from "@/components/ui/Card";
import { SexChip } from "@/components/ui/Chip";
import { apiFetch } from "@/lib/api/server";

type FundBalance = { balance: number; totalIn: number; totalOut: number; lastEntryDate: string | null };
type FeeOverview = {
  paidCount: number;
  unpaidCount: number;
  collectedAmount: number;
  outstandingAmount: number;
  lastOpenedAt: string | null;
} | null;
type MemberCounts = { total: number; male: number; female: number };
type SessionSummary = {
  id: string;
  slug: string;
  playDate: string;
  startTime: string;
  endTime: string;
  court: string | null;
  maleCount: number;
  femaleCount: number;
} | null;
type ActivityLog = {
  id: string;
  occurredAt: string;
  description: string;
};

type DashboardOverview = {
  balance: FundBalance;
  feeOverview: FeeOverview;
  memberCounts: MemberCounts;
  todaySession: SessionSummary;
  upcoming: SessionSummary[];
  activities: ActivityLog[];
};

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} ₫`;

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export default async function AdminDashboardPage() {
  const data = await apiFetch<DashboardOverview>("/dashboard");
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Tổng quan</h1>
        <p className="text-sm text-sec capitalize">{today} · CLB Cầu Lông của Long</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <StatCard
          label="Quỹ CLB hiện có"
          value={money(data.balance.balance)}
          sub={data.balance.lastEntryDate ? `Cập nhật ${formatDateTime(data.balance.lastEntryDate)}` : "Chưa có giao dịch"}
          accent
        />
        <StatCard
          label="Thành viên"
          value={`${data.memberCounts.total} người`}
          sub={`${data.memberCounts.male} nam · ${data.memberCounts.female} nữ`}
        />
        <StatCard
          label="Chưa đóng quỹ"
          value={`${data.feeOverview?.unpaidCount ?? 0} khoản`}
          sub={
            data.feeOverview?.lastOpenedAt
              ? `${money(data.feeOverview?.outstandingAmount ?? 0)} còn thiếu`
              : "Chưa mở đợt thu quỹ nào"
          }
        />
      </div>

      <Card className="flex flex-col gap-2.5">
        {data.todaySession ? (
          <>
            <CardTitle>
              Buổi tối nay · {formatDateTime(data.todaySession.playDate)}, {data.todaySession.startTime}–
              {data.todaySession.endTime}
            </CardTitle>
            <p className="text-sm text-sec">{data.todaySession.court ?? "Chưa chọn sân"}</p>
            <div className="flex items-center gap-2.5 text-sm text-sec">
              <SexChip sex="nam" /> {data.todaySession.maleCount} đăng ký
              <SexChip sex="nu" /> {data.todaySession.femaleCount} đăng ký
            </div>
          </>
        ) : (
          <>
            <CardTitle>Không có buổi nào tối nay</CardTitle>
            <p className="text-sm text-sec">Xem lịch để tạo buổi mới.</p>
          </>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle>Hoạt động gần đây</CardTitle>
        {data.activities.length === 0 && <p className="text-sm text-mut">Chưa có hoạt động nào.</p>}
        {data.activities.slice(0, 5).map((a) => (
          <div key={a.id} className="flex flex-col gap-0.5">
            <p className="text-sm font-medium text-ink">{formatDateTime(a.occurredAt)}</p>
            <p className="text-xs text-mut">{a.description}</p>
          </div>
        ))}
      </Card>
    </div>
  );
}

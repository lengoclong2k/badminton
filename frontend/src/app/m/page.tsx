import { Card, CardTitle, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/api/server";

type Me = { authUserId: string; email: string; member: { id: string; fullName: string } | null; isAdmin: boolean };

type SessionSummary = {
  id: string;
  playDate: string;
  startTime: string;
  endTime: string;
  court: string | null;
} | null;

type LeaderboardRow = {
  feeAmount: number;
  sessionsAttended: number;
  costPerSession: number | null;
  periodMonth: string;
} | null;

type MemberFee = { status: "paid" | "unpaid" | "waived"; period: { openedAt: string } };

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} ₫`;

export default async function MemberHomePage() {
  const me = await apiFetch<Me>("/auth/me");
  const [today, myRanking, myFees] = await Promise.all([
    apiFetch<SessionSummary>("/sessions/today"),
    apiFetch<LeaderboardRow>("/leaderboard/me"),
    apiFetch<MemberFee[]>("/fees/me"),
  ]);

  const currentMonthFee = myFees[0];
  const todayStr = new Date().toISOString().slice(0, 10);
  const isTodaySession = today && today.playDate.slice(0, 10) === todayStr;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-ink">Chào {me.member?.fullName ?? me.email}</h1>
        <p className="text-sm text-sec">CLB Cầu Lông HDA</p>
      </div>
      {isTodaySession && today ? (
        <Card className="flex flex-col gap-2">
          <CardTitle>
            Buổi tối nay · {today.startTime.slice(0, 5)}–{today.endTime.slice(0, 5)}
          </CardTitle>
          <p className="text-sm text-sec">{today.court ?? "Chưa chọn sân"}</p>
          {currentMonthFee && (
            <Badge tone={currentMonthFee.status === "paid" ? "success" : "danger"}>
              {currentMonthFee.status === "paid" ? "Đã đóng quỹ đợt" : "Chưa đóng quỹ đợt"}{" "}
              {new Date(currentMonthFee.period.openedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
            </Badge>
          )}
        </Card>
      ) : (
        <Card className="flex flex-col gap-2">
          <CardTitle>Không có buổi nào tối nay</CardTitle>
        </Card>
      )}
      {myRanking && (
        <StatCard
          label="Giá thực mỗi buổi"
          value={myRanking.costPerSession != null ? money(myRanking.costPerSession) : "—"}
          sub={`${money(myRanking.feeAmount)} ÷ ${myRanking.sessionsAttended} buổi trong tháng`}
          accent
        />
      )}
    </div>
  );
}

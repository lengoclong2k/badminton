import { Card, CardTitle } from "@/components/ui/Card";
import { SexChip } from "@/components/ui/Chip";
import { apiFetch } from "@/lib/api/server";

type LeaderboardRow = {
  periodMonth: string;
  memberId: string;
  fullName: string;
  sex: "nam" | "nu";
  feeAmount: number;
  sessionsAttended: number;
  costPerSession: number | null;
  rank: number;
};

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} ₫`;

export default async function LeaderboardPage() {
  const ranking = await apiFetch<LeaderboardRow[]>("/leaderboard");
  const month = ranking[0]?.periodMonth?.slice(5, 7) ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Bảng xếp hạng</h1>
        <p className="text-sm text-sec">
          Xếp theo giá thực mỗi buổi = quỹ tháng ÷ số buổi đã đi (thấp hơn = đi đều hơn)
        </p>
      </div>

      <Card className="flex flex-col gap-4">
        <CardTitle>Xếp hạng {month && `T${month}`}</CardTitle>
        {ranking.map((r) => (
          <div key={r.memberId} className="flex items-center gap-3.5 border-b border-line pb-3 last:border-0 last:pb-0">
            <span className="font-mono text-base text-mut w-6">{r.rank}</span>
            <SexChip sex={r.sex} />
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">{r.fullName}</p>
              <p className="text-xs text-mut">
                {money(r.feeAmount)} ÷ {r.sessionsAttended} buổi trong tháng
              </p>
            </div>
            <span className="font-mono text-sm text-mint-deep">
              {r.costPerSession != null ? `${money(r.costPerSession)}/buổi` : "—"}
            </span>
          </div>
        ))}
        {ranking.length === 0 && <p className="text-sm text-mut">Chưa có dữ liệu xếp hạng tháng này.</p>}
      </Card>
    </div>
  );
}

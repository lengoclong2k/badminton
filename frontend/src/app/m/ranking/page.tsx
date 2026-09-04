import { Card } from "@/components/ui/Card";
import { SexChip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { apiFetch } from "@/lib/api/server";

type LeaderboardRow = {
  memberId: string;
  fullName: string;
  sex: "nam" | "nu";
  costPerSession: number | null;
  rank: number;
};

type Me = { member: { id: string } | null };

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} ₫`;

export default async function MemberRankingPage() {
  const [ranking, me] = await Promise.all([
    apiFetch<LeaderboardRow[]>("/leaderboard"),
    apiFetch<Me>("/auth/me"),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-ink">Ai lời nhất tháng</h1>
        <p className="text-sm text-sec">Giá thực mỗi buổi càng thấp càng &quot;lời&quot;</p>
      </div>
      <Card className="flex flex-col gap-3">
        {ranking.map((r) => {
          const isMe = r.memberId === me.member?.id;
          return (
            <div
              key={r.memberId}
              className={cn("flex items-center gap-3 rounded-control px-2 py-2", isMe && "bg-mint-50")}
            >
              <span className="w-5 font-mono text-sm text-mut">{r.rank}</span>
              <SexChip sex={r.sex} />
              <p className="flex-1 text-sm font-medium text-ink">
                {r.fullName} {isMe && <span className="text-mint-deep">(bạn)</span>}
              </p>
              <span className="font-mono text-sm text-mint-deep">
                {r.costPerSession != null ? `${money(r.costPerSession)}/buổi` : "—"}
              </span>
            </div>
          );
        })}
        {ranking.length === 0 && <p className="text-sm text-mut">Chưa có dữ liệu xếp hạng tháng này.</p>}
      </Card>
    </div>
  );
}

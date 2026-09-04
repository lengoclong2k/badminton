import { Card, CardTitle, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/api/server";

type MemberFee = {
  id: string;
  amount: number;
  status: "paid" | "unpaid" | "waived";
  period: { openedAt: string };
};

type LeaderboardRow = {
  feeAmount: number;
  sessionsAttended: number;
  costPerSession: number | null;
} | null;

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} ₫`;

export default async function MyFundPage() {
  const [fees, myRanking] = await Promise.all([
    apiFetch<MemberFee[]>("/fees/me"),
    apiFetch<LeaderboardRow>("/leaderboard/me"),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-ink">Quỹ của tôi</h1>

      {myRanking && (
        <StatCard
          label="Giá thực mỗi buổi"
          value={myRanking.costPerSession != null ? money(myRanking.costPerSession) : "—"}
          sub={`${money(myRanking.feeAmount)} ÷ ${myRanking.sessionsAttended} buổi trong tháng`}
          accent
        />
      )}

      <Card className="flex flex-col gap-3">
        <CardTitle>Đợt đóng quỹ</CardTitle>
        {fees.slice(0, 6).map((f) => (
          <div key={f.id} className="flex items-center justify-between border-b border-line pb-2.5 last:border-0 last:pb-0">
            <p className="font-mono text-sm text-ink">
              {new Date(f.period.openedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
            </p>
            <Badge tone={f.status === "paid" ? "success" : f.status === "waived" ? "info" : "danger"}>
              {f.status === "paid" ? "Đã đóng" : f.status === "waived" ? "Miễn" : "Chưa đóng"} · {money(f.amount)}
            </Badge>
          </div>
        ))}
        {fees.length === 0 && <p className="text-sm text-mut">Chưa có đợt quỹ nào.</p>}
      </Card>

      <Card className="flex flex-col gap-2">
        <CardTitle>Lưu ý</CardTitle>
        <p className="text-sm text-sec">
          Quỹ tính theo tháng, không theo từng buổi. Nếu bạn nghỉ một buổi cố định thì mất
          lượt buổi đó, không được hoàn hay bù sang buổi khác.
        </p>
      </Card>
    </div>
  );
}

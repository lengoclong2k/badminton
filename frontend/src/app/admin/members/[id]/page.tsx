import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SexChip } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Avatar";
import { EditMemberButton, DeleteMemberButton } from "@/components/modals/MemberActionButtons";
import { apiFetch } from "@/lib/api/server";

type Member = {
  id: string;
  slug: string;
  fullName: string;
  sex: "nam" | "nu";
  phone: string | null;
  status: string;
};

type MemberFee = {
  id: string;
  periodId: string;
  amount: number;
  status: "paid" | "unpaid" | "waived";
  paidAt: string | null;
  period: { openedAt: string };
};

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} ₫`;

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [member, fees] = await Promise.all([
    apiFetch<Member>(`/members/${id}`),
    apiFetch<MemberFee[]>(`/members/${id}/fees`),
  ]);

  const latestPaid = fees.find((f) => f.status === "paid");
  const formatOpened = (iso: string) =>
    new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar name={member.fullName} size={56} />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold text-ink">{member.fullName}</h1>
          <div className="flex items-center gap-2">
            <SexChip sex={member.sex} />
            {latestPaid && (
              <Badge tone="success">
                Đã đóng quỹ đợt {formatOpened(latestPaid.period.openedAt)}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Card className="flex flex-col gap-3">
        <CardTitle>Quỹ theo đợt</CardTitle>
        <div className="flex flex-wrap gap-6">
          {fees.slice(0, 6).map((f) => (
            <div key={f.id} className="flex flex-col gap-1.5">
              <p className="font-mono text-sm text-ink">{formatOpened(f.period.openedAt)}</p>
              <Badge tone={f.status === "paid" ? "success" : f.status === "waived" ? "info" : "danger"}>
                {f.status === "paid" ? "Đã đóng" : f.status === "waived" ? "Miễn" : "Chưa đóng"} · {money(f.amount)}
              </Badge>
            </div>
          ))}
          {fees.length === 0 && <p className="text-sm text-mut">Chưa có đợt quỹ nào.</p>}
        </div>
      </Card>

      <div className="flex gap-3">
        <EditMemberButton slug={member.slug} name={member.fullName} sex={member.sex} phone={member.phone} />
        <DeleteMemberButton slug={member.slug} name={member.fullName} />
      </div>
    </div>
  );
}

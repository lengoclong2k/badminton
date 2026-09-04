import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SexChip } from "@/components/ui/Chip";
import { ClickableRow } from "@/components/ui/ListRow";
import { Pagination, parsePage } from "@/components/ui/Pagination";
import { AddMemberButton } from "@/components/modals/AddMemberModal";
import { OpenFeePeriodButton } from "@/components/modals/FundActionButtons";
import { MemberRowMenu } from "@/components/modals/MemberRowMenu";
import { apiFetch } from "@/lib/api/server";

const LIMIT = 20;

type Sex = "nam" | "nu";

type Member = {
  id: string;
  slug: string;
  fullName: string;
  sex: Sex;
  status: string;
};

type PaginatedMembers = { items: Member[]; total: number; page: number; limit: number };

type FeeStatusRow = {
  memberId: string;
  slug: string;
  fullName: string;
  sex: Sex;
  unpaidCount: number;
  unpaidAmount: number;
  lastOpenedAt: string | null;
};

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} ₫`;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const [membersRes, feeStatus] = await Promise.all([
    apiFetch<PaginatedMembers>(`/members?limit=${LIMIT}&page=${page}`),
    apiFetch<FeeStatusRow[]>("/members/fee-status"),
  ]);

  const members = membersRes.items ?? [];
  // Đếm nam/nữ theo TOÀN CLB (fee-status trả về đủ, không bị cắt theo trang),
  // không dùng "members" ở trên vì đó chỉ là 1 trang.
  const male = feeStatus.filter((f) => f.sex === "nam").length;
  const female = feeStatus.filter((f) => f.sex === "nu").length;
  const feeBySlug = new Map(feeStatus.map((f) => [f.slug, f]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Thành viên</h1>
          <p className="text-sm text-sec">
            {membersRes.total} người · {male} nam · {female} nữ
          </p>
        </div>
        <div className="flex gap-2">
          <OpenFeePeriodButton />
          <AddMemberButton />
        </div>
      </div>

      <Card className="flex flex-col gap-2 p-3">
        <CardTitle className="px-1 pt-1">Danh sách thành viên · Tình trạng quỹ</CardTitle>
        {members.map((m) => {
          const fee = feeBySlug.get(m.slug);
          const everOpened = !!fee?.lastOpenedAt;
          const unpaidCount = fee?.unpaidCount ?? 0;
          const hasUnpaid = unpaidCount > 0;
          const statusLabel = !everOpened
            ? "Chưa mở đợt quỹ nào"
            : hasUnpaid
              ? `Chưa đóng · ${money(fee?.unpaidAmount ?? 0)}${unpaidCount > 1 ? ` (${unpaidCount} đợt)` : ""}`
              : "Đã đóng đủ";

          return (
            <ClickableRow
              key={m.id}
              href={`/admin/members/${m.slug}`}
              trailing={<MemberRowMenu id={m.slug} name={m.fullName} sex={m.sex} hasUnpaid={hasUnpaid} />}
            >
              <div className="flex items-center gap-3">
                <SexChip sex={m.sex} />
                <p className="flex-1 text-sm font-medium text-ink">{m.fullName}</p>
                <Badge tone={!everOpened ? "info" : hasUnpaid ? "danger" : "success"}>{statusLabel}</Badge>
              </div>
            </ClickableRow>
          );
        })}
        {members.length === 0 && <p className="px-4 py-3 text-sm text-mut">Chưa có thành viên nào.</p>}
        <Pagination
          page={membersRes.page ?? page}
          limit={membersRes.limit ?? LIMIT}
          total={membersRes.total}
          basePath="/admin/members"
        />
      </Card>
    </div>
  );
}

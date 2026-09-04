import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SexChip } from "@/components/ui/Chip";
import { ClickableRow } from "@/components/ui/ListRow";
import { Pagination, parsePage } from "@/components/ui/Pagination";
import { AddMemberButton } from "@/components/modals/AddMemberModal";
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
  periodMonth: string | null;
  memberFeeId: string | null;
  amount: number | null;
  feeStatus: "paid" | "unpaid" | "waived" | null;
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Thành viên</h1>
          <p className="text-sm text-sec">
            {membersRes.total} người · {male} nam · {female} nữ
          </p>
        </div>
        <AddMemberButton />
      </div>

      <Card className="flex flex-col gap-2 p-3">
        <CardTitle className="px-1 pt-1">Danh sách thành viên · Quỹ tháng này</CardTitle>
        {members.map((m) => {
          const fee = feeBySlug.get(m.slug);
          const hasPeriod = !!fee?.periodMonth;
          const paid = fee?.feeStatus === "paid";
          const statusLabel = hasPeriod
            ? `${paid ? "Đã đóng" : "Chưa đóng"} · ${money(fee?.amount ?? 0)}`
            : "Chưa mở kỳ quỹ tháng này";

          return (
            <ClickableRow
              key={m.id}
              href={`/admin/members/${m.slug}`}
              trailing={
                <MemberRowMenu
                  id={m.slug}
                  name={m.fullName}
                  sex={m.sex}
                  paid={paid}
                  memberFeeId={fee?.memberFeeId ?? null}
                  amount={fee?.amount ?? null}
                  periodMonth={fee?.periodMonth ?? null}
                />
              }
            >
              <div className="flex items-center gap-3">
                <SexChip sex={m.sex} />
                <p className="flex-1 text-sm font-medium text-ink">{m.fullName}</p>
                <Badge tone={!hasPeriod ? "info" : paid ? "success" : "danger"}>{statusLabel}</Badge>
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

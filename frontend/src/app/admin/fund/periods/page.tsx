import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StaticRow } from "@/components/ui/ListRow";
import { DeleteFeePeriodButton } from "@/components/modals/FundActionButtons";
import { apiFetch } from "@/lib/api/server";

type Me = { isAdmin: boolean };

type OpenPeriod = {
  id: string;
  openedAt: string;
  feeMale: number;
  feeFemale: number;
  dueDate: string | null;
  memberCount: number;
  paidCount: number;
  totalAmount: number;
  paidAmount: number;
  canDelete: boolean;
};

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} ₫`;

function formatOpenedAt(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function formatDate(ymd: string) {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

/** Quản lý các đợt thu quỹ đang mở. Admin xóa được đợt CHƯA AI ĐÓNG
 *  (VD mở nhầm); đợt đã có người đóng thì phải hoàn tác thu quỹ trước. */
export default async function FeePeriodsPage() {
  const [periods, me] = await Promise.all([
    apiFetch<OpenPeriod[]>("/fees/periods/open"),
    apiFetch<Me>("/auth/me"),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link href="/admin/fund" className="text-sm font-medium text-sec hover:underline">
          ← Quỹ CLB
        </Link>
        <h1 className="text-2xl font-bold text-ink">Đợt thu quỹ đang mở ({periods.length})</h1>
        <p className="text-sm text-sec">
          Chỉ xóa được đợt chưa có ai đóng. Đợt đã có người đóng cần hoàn tác thu quỹ trước khi xóa.
        </p>
      </div>

      <Card className="flex flex-col gap-2 p-3">
        {periods.map((p) => {
          const label = `đợt mở lúc ${formatOpenedAt(p.openedAt)}`;
          return (
            <StaticRow
              key={p.id}
              trailing={
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="font-mono text-sm text-ink">
                      {money(p.paidAmount)} / {money(p.totalAmount)}
                    </p>
                    <p className="text-xs text-mut">
                      {p.paidCount}/{p.memberCount} người đã đóng
                    </p>
                  </div>
                  {me.isAdmin &&
                    (p.canDelete ? (
                      <DeleteFeePeriodButton id={p.id} label={label} />
                    ) : (
                      <span
                        className="text-xs text-mut"
                        title="Đợt đã có người đóng — hoàn tác thu quỹ trước khi xóa"
                      >
                        Không thể xóa
                      </span>
                    ))}
                </div>
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-ink">Mở lúc {formatOpenedAt(p.openedAt)}</p>
                {p.paidCount === 0 ? (
                  <Badge tone="warn">Chưa ai đóng</Badge>
                ) : p.paidCount === p.memberCount ? (
                  <Badge tone="success">Đã đóng đủ</Badge>
                ) : (
                  <Badge tone="info">Đang thu</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-sec">
                Nam {money(p.feeMale)} · Nữ {money(p.feeFemale)}
                {p.dueDate ? ` · Hạn ${formatDate(p.dueDate)}` : ""}
              </p>
            </StaticRow>
          );
        })}
        {periods.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-mut">Không có đợt thu quỹ nào đang mở.</p>
        )}
      </Card>
    </div>
  );
}

import { Card, CardTitle, StatCard } from "@/components/ui/Card";
import { StaticRow } from "@/components/ui/ListRow";
import { Pagination, parsePage } from "@/components/ui/Pagination";
import { CollectFeeButton, AddExpenseButton, DeleteEntryButton } from "@/components/modals/FundActionButtons";
import { apiFetch } from "@/lib/api/server";

const LIMIT = 20;

type Me = { isAdmin: boolean };

type FundBalance = { balance: number; totalIn: number; totalOut: number; lastEntryDate: string | null };

type FundEntry = {
  id: string;
  entryDate: string;
  entryType: string;
  amount: number;
  description: string;
};

type PaginatedEntries = { items: FundEntry[]; total: number; page: number; limit: number };

const money = (n: number) => `${Math.abs(Math.round(n)).toLocaleString("vi-VN")} ₫`;

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export default async function FundPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const [balance, ledger, me] = await Promise.all([
    apiFetch<FundBalance>("/fund/balance"),
    apiFetch<PaginatedEntries>(`/fund/ledger?limit=${LIMIT}&page=${page}`),
    apiFetch<Me>("/auth/me"),
  ]);

  const entries = ledger.items ?? [];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-ink">Quỹ CLB</h1>

      <div className="flex flex-wrap gap-4">
        <StatCard
          label="Số dư hiện tại"
          value={money(balance.balance)}
          sub={balance.lastEntryDate ? `Cập nhật ${formatDate(balance.lastEntryDate)}` : "Chưa có giao dịch"}
          accent
        />
        <StatCard label="Tổng thu" value={money(balance.totalIn)} sub="Từ trước tới nay" />
        <StatCard label="Tổng chi" value={money(balance.totalOut)} sub="Từ trước tới nay" />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg">Sổ quỹ ({ledger.total})</CardTitle>
          {me.isAdmin && (
            <div className="flex flex-wrap gap-2">
              <CollectFeeButton />
              <AddExpenseButton />
            </div>
          )}
        </div>
        <Card className="flex flex-col gap-2 p-3">
          {entries.map((e) => (
            <StaticRow
              key={e.id}
              trailing={
                <div className="flex items-center gap-3">
                  <p className={`font-mono text-sm ${e.amount >= 0 ? "text-mint-deep" : "text-danger-ink"}`}>
                    {e.amount >= 0 ? "+" : "−"}
                    {money(e.amount)}
                  </p>
                  {me.isAdmin && <DeleteEntryButton label={e.description} id={e.id} />}
                </div>
              }
            >
              <p className="text-sm font-medium text-ink">
                {formatDate(e.entryDate)} · {e.description}
              </p>
            </StaticRow>
          ))}
          {entries.length === 0 && <p className="px-4 py-3 text-sm text-mut">Chưa có giao dịch nào.</p>}
          <Pagination
            page={ledger.page ?? page}
            limit={ledger.limit ?? LIMIT}
            total={ledger.total}
            basePath="/admin/fund"
          />
        </Card>
      </section>
    </div>
  );
}

import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Thanh phân trang dùng chung cho mọi danh sách có phân trang (quỹ, thành
 * viên, buổi đã kết thúc...). Backend trả PaginatedResult { items, total,
 * page, limit } — truyền thẳng page/limit/total vào đây.
 *
 * basePath: đường dẫn trang hiện tại (không kèm query string).
 * searchParams: các query param khác cần giữ lại khi đổi trang (VD filter),
 * không cần truyền "page" — component tự set.
 */
export function Pagination({
  page,
  limit,
  total,
  basePath,
  searchParams = {},
}: {
  page: number;
  limit: number;
  total: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  // Không có dữ liệu thì ẩn hẳn — không có gì để phân trang cả.
  if (total === 0) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "page") params.set(key, value);
    }
    params.set("page", String(p));
    return `${basePath}?${params.toString()}`;
  }

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // Vừa đủ 1 trang (VD 2 thành viên, limit 20): vẫn hiện dòng đếm số lượng để
  // admin biết chắc đây LÀ danh sách có phân trang (chỉ là chưa cần bấm gì cả),
  // chỉ ẩn nút Trước/Sau vì bấm cũng vô nghĩa.
  if (totalPages <= 1) {
    return (
      <p className="border-t border-line px-1 pt-3 text-xs text-mut">
        Hiển thị {from}–{to} / {total} — chỉ có 1 trang
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-1 pt-3">
      <p className="text-xs text-mut">
        {from}–{to} / {total}
      </p>
      <div className="flex items-center gap-2">
        <PageLink href={hrefFor(page - 1)} disabled={page <= 1}>
          ← Trước
        </PageLink>
        <span className="text-xs font-medium text-sec">
          Trang {page}/{totalPages}
        </span>
        <PageLink href={hrefFor(page + 1)} disabled={page >= totalPages}>
          Sau →
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const base = "rounded-control border px-3 py-1.5 text-xs font-medium";
  if (disabled) {
    return <span className={cn(base, "border-border text-faint cursor-default")}>{children}</span>;
  }
  return (
    <Link href={href} className={cn(base, "border-border text-ink hover:border-mint hover:bg-mint-50")}>
      {children}
    </Link>
  );
}

/** Đọc số trang từ searchParams (Next.js async searchParams), mặc định trang 1. */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = raw ? parseInt(raw, 10) : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

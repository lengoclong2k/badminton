import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Hàng có thể bấm vào để xem chi tiết — dùng thống nhất cho mọi danh sách
 * trong hệ thống (buổi đánh, thành viên...). Có viền, nền trắng, khi hover
 * đổi màu viền + có mũi tên "›" để admin biết chắc đây là bấm được.
 */
export function ClickableRow({
  href,
  children,
  trailing,
  className,
}: {
  href: string;
  children: React.ReactNode;
  /** Nội dung phụ đặt trước mũi tên, VD nút menu "⋯" — tự chặn navigate khi bấm. */
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-control border border-border bg-surface px-4 py-4 transition-colors hover:border-mint hover:bg-mint-50",
        className
      )}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {trailing}
      <span className="shrink-0 text-lg text-mut transition-colors group-hover:text-mint-deep" aria-hidden>
        ›
      </span>
    </Link>
  );
}

/**
 * Hàng CHỈ để xem, không bấm được — dùng cho những mục không có trang chi
 * tiết (VD: lịch mẫu hàng tuần). Cố tình để nền phẳng, không viền, không
 * mũi tên, con trỏ mặc định — để không bị nhầm là bấm được như ClickableRow.
 */
export function StaticRow({
  children,
  hint,
  trailing,
  className,
}: {
  children: React.ReactNode;
  hint?: string;
  /** Nội dung phụ bên phải, VD số tiền + nút "Xóa" của sổ quỹ. */
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-control bg-soft px-4 py-4 cursor-default",
        className
      )}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {trailing}
      {hint && <span className="shrink-0 text-xs text-faint">{hint}</span>}
    </div>
  );
}

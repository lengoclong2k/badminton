import { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Sex = "nam" | "nu";

export function SexChip({ sex, className }: { sex: Sex; className?: string }) {
  const isNam = sex === "nam";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-3 py-1 text-xs font-medium",
        isNam ? "bg-nam text-nam-text" : "bg-nu text-nu-text",
        className
      )}
    >
      {isNam ? "Nam" : "Nữ"}
    </span>
  );
}

/**
 * Hiển thị "danh tính" 1 người trong 1 dòng list — giới tính là chữ nhỏ đính
 * kèm phía TRÊN, tên đầy đủ nằm MỘT DÒNG riêng bên dưới (co lại bằng "..."
 * nếu quá dài thay vì tự xuống dòng làm vỡ layout). Dùng chung cho mọi danh
 * sách thành viên/khách trong app (Thành viên, Bảng xếp hạng, Điểm danh…) để
 * đồng bộ cách trình bày — đừng tự dựng lại SexChip + tên rời rạc ở chỗ mới,
 * dùng component này.
 *
 * - `topExtra`: nội dung phụ đặt cùng dòng với giới tính (VD: badge "Đã/Chưa
 *   điểm danh").
 * - `nameSuffix`: nội dung ngắn đặt ngay sau tên, không bị cắt bởi "..." của
 *   tên (VD: nhãn "(bạn)").
 * - `subtitle`: dòng phụ nằm dưới tên (VD: "120.000đ ÷ 4 buổi").
 */
export function MemberIdentity({
  name,
  sex,
  topExtra,
  nameSuffix,
  subtitle,
  className,
}: {
  name: string;
  sex: Sex;
  topExtra?: ReactNode;
  nameSuffix?: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}) {
  const isNam = sex === "nam";
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <div className="flex items-center gap-2">
        <span className={cn("text-xs font-semibold", isNam ? "text-nam-text" : "text-nu-text")}>
          {isNam ? "Nam" : "Nữ"}
        </span>
        {topExtra}
      </div>
      <div className="flex min-w-0 items-center gap-1">
        <p className="truncate text-sm font-medium text-ink" title={name}>
          {name}
        </p>
        {nameSuffix}
      </div>
      {subtitle}
    </div>
  );
}

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

import { cn } from "@/lib/cn";

export type BadgeTone = "success" | "warn" | "danger" | "info";

const toneClasses: Record<BadgeTone, string> = {
  success: "bg-mint-100 text-mint-deep",
  warn: "bg-warn-50 text-warn-text",
  danger: "bg-danger-50 text-danger-text",
  info: "bg-info-50 text-info-text",
};

export function Badge({
  tone = "info",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

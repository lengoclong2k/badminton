import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-surface p-5",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold text-ink", className)} {...props} />;
}

export function CardSubtitle({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-sec", className)} {...props} />;
}

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex-1 min-w-[220px] rounded-card p-4",
        accent ? "bg-mint-100" : "border border-border bg-surface"
      )}
    >
      <p className={cn("text-xs font-medium", accent ? "text-mint-deep" : "text-sec")}>
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-2xl font-medium",
          accent ? "text-mint-ink" : "text-ink"
        )}
      >
        {value}
      </p>
      {sub && (
        <p className={cn("mt-1 text-xs", accent ? "text-mint-deep" : "text-mut")}>{sub}</p>
      )}
    </div>
  );
}

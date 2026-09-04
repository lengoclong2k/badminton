import { cn } from "@/lib/cn";

const PALETTE = [
  "#7fb8c9",
  "#c9a7d6",
  "#e0b989",
  "#8fc9a0",
  "#e79ba0",
  "#a3aee0",
];

function hashName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1]?.[0] ?? "";
  const first = parts.length > 1 ? parts[0][0] : "";
  return (first + last).toUpperCase() || "?";
}

export function Avatar({
  name,
  size = 40,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const bg = PALETTE[hashName(name) % PALETTE.length];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0",
        className
      )}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.35 }}
    >
      {initials(name)}
    </span>
  );
}

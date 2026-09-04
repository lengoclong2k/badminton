import Link from "next/link";
import { Home, CalendarDays, Wallet, Trophy, CircleUser } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { label: "Trang chủ", href: "/m", icon: Home },
  { label: "Lịch của tôi", href: "/m/schedule", icon: CalendarDays },
  { label: "Quỹ của tôi", href: "/m/fund", icon: Wallet },
  { label: "Ai lời nhất", href: "/m/ranking", icon: Trophy },
  { label: "Hồ sơ", href: "/m/profile", icon: CircleUser },
];

export function MemberTabBar({ activeHref }: { activeHref: string }) {
  return (
    <nav className="sticky bottom-0 flex border-t border-border bg-surface">
      {TABS.map(({ label, href, icon: Icon }) => {
        const active = href === activeHref;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium",
              active ? "text-mint-deep font-semibold" : "text-mut"
            )}
          >
            <Icon size={20} strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

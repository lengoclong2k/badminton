import { LogoutButton } from "@/components/ui/LogoutButton";
import { cn } from "@/lib/cn";
import {
  CalendarDays,
  LayoutDashboard,
  Settings,
  Trophy,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

export interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

export function NavItem({
  label,
  href,
  icon: Icon,
  active,
}: NavLink & { active?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-control px-3.5 py-2.5 text-sm transition-colors",
        active
          ? "bg-mint-100 text-mint-deep font-semibold"
          : "text-sec font-medium hover:bg-soft",
      )}
    >
      <Icon
        size={18}
        strokeWidth={2}
        className={active ? "text-mint-deep" : "text-mut"}
      />
      {label}
    </Link>
  );
}

export const ADMIN_NAV: NavLink[] = [
  { label: "Tổng quan", href: "/admin", icon: LayoutDashboard },
  { label: "Lịch đánh", href: "/admin/schedule", icon: CalendarDays },
  { label: "Thành viên", href: "/admin/members", icon: Users },
  { label: "Quỹ CLB", href: "/admin/fund", icon: Wallet },
  { label: "Bảng xếp hạng", href: "/admin/leaderboard", icon: Trophy },
  { label: "Cài đặt", href: "/admin/settings", icon: Settings },
];

export function Sidebar({
  links = ADMIN_NAV,
  activeHref,
}: {
  links?: NavLink[];
  activeHref: string;
}) {
  return (
    <aside className="w-[220px] shrink-0 border-r border-sage-border bg-sage px-4 py-6">
      <p className="px-1 pb-4 text-base font-bold text-ink">
        CLB Cầu Lông Long
      </p>
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <NavItem
            key={link.href}
            {...link}
            active={link.href === activeHref}
          />
        ))}
        <div className="mt-2 border-t border-sage-border pt-2">
          <LogoutButton />
        </div>
      </nav>
    </aside>
  );
}

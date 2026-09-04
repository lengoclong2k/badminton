"use client";

import { LogoutButton } from "@/components/ui/LogoutButton";
import { cn } from "@/lib/cn";
import {
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  Settings,
  Trophy,
  Users,
  Wallet,
  X,
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
  collapsed,
  onClick,
}: NavLink & { active?: boolean; collapsed?: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-control px-3.5 py-2.5 text-sm transition-colors",
        collapsed && "lg:justify-center lg:px-2.5",
        active
          ? "bg-mint-100 text-mint-deep font-semibold"
          : "text-sec font-medium hover:bg-soft",
      )}
    >
      <Icon
        size={18}
        strokeWidth={2}
        className={cn("shrink-0", active ? "text-mint-deep" : "text-mut")}
      />
      <span className={cn(collapsed && "lg:hidden")}>{label}</span>
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

/**
 * Sidebar dùng chung cho khu Admin. Trên mobile (< lg): drawer trượt ra từ
 * trái, có backdrop, đóng lại khi bấm ra ngoài hoặc chọn 1 mục. Trên desktop
 * (>= lg): nằm cố định bên trái, có thể thu gọn thành dải icon (collapsed)
 * để nhường chỗ cho nội dung — trạng thái này do AdminShell quản lý.
 */
export function Sidebar({
  links = ADMIN_NAV,
  activeHref,
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}: {
  links?: NavLink[];
  activeHref: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  return (
    <>
      {/* Backdrop mờ phía sau drawer khi mở trên mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#16342a]/35 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[240px] shrink-0 flex-col overflow-y-auto border-r border-sage-border bg-sage px-4 py-6 transition-transform duration-200 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:w-[76px] lg:px-2" : "lg:w-[220px] lg:px-4",
        )}
      >
        <div className="mb-4 flex items-center justify-between px-1">
          <p className={cn("truncate text-base font-bold text-ink", collapsed && "lg:hidden")}>
            CLB Cầu Lông Long
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden rounded-control p-1.5 text-mut hover:bg-soft hover:text-ink lg:flex"
                aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
                title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
              >
                {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
              </button>
            )}
            <button
              onClick={onCloseMobile}
              className="rounded-control p-1.5 text-mut hover:bg-soft lg:hidden"
              aria-label="Đóng menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {links.map((link) => (
            <NavItem
              key={link.href}
              {...link}
              active={link.href === activeHref}
              collapsed={collapsed}
              onClick={onCloseMobile}
            />
          ))}
        </nav>
        <div className="mt-2 border-t border-sage-border pt-2">
          <LogoutButton collapsed={collapsed} />
        </div>
      </aside>
    </>
  );
}

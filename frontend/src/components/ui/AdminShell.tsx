"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { ADMIN_NAV, Sidebar } from "@/components/ui/Sidebar";

const COLLAPSE_KEY = "admin-sidebar-collapsed";

/** Bọc phần khung (sidebar + nội dung) của khu Admin. Ẩn mục "Cài đặt" khỏi
 *  menu với member thường — proxy.ts đã chặn route đó ở tầng server rồi,
 *  đây chỉ là ẩn đi cho gọn UI.
 *
 *  Sidebar đóng/mở được: trên mobile là drawer trượt ra (mặc định đóng),
 *  trên desktop có thể thu gọn thành dải icon để nhường chỗ cho nội dung —
 *  trạng thái thu gọn được nhớ lại giữa các lần vào lại. */
export function AdminShell({
  isAdmin,
  children,
}: {
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const links = isAdmin ? ADMIN_NAV : ADMIN_NAV.filter((l) => l.href !== "/admin/settings");

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Đóng drawer mobile mỗi khi chuyển trang.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Khôi phục trạng thái thu gọn sidebar đã lưu từ lần trước.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // Không có localStorage (VD chế độ ẩn danh) thì bỏ qua, dùng mặc định.
    }
  }, []);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        links={links}
        activeHref={pathname}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-control p-1.5 text-mut hover:bg-soft"
            aria-label="Mở menu"
          >
            <Menu size={22} />
          </button>
          <p className="text-sm font-bold text-ink">CLB Cầu Lông HDA</p>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:max-w-[1200px] lg:px-10 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

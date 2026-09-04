"use client";

import { usePathname } from "next/navigation";
import { ADMIN_NAV, Sidebar } from "@/components/ui/Sidebar";

/** Bọc phần khung (sidebar + nội dung) của khu Admin. Ẩn mục "Cài đặt" khỏi
 *  menu với member thường — proxy.ts đã chặn route đó ở tầng server rồi,
 *  đây chỉ là ẩn đi cho gọn UI. */
export function AdminShell({
  isAdmin,
  children,
}: {
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const links = isAdmin ? ADMIN_NAV : ADMIN_NAV.filter((l) => l.href !== "/admin/settings");

  return (
    <div className="flex min-h-screen">
      <Sidebar links={links} activeHref={pathname} />
      <main className="flex-1 px-10 py-8 max-w-[1200px]">{children}</main>
    </div>
  );
}

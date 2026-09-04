"use client";
import { usePathname } from "next/navigation";
import { MemberTabBar } from "@/components/ui/MemberTabBar";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-bg">
      <main className="flex-1 px-5 py-6">{children}</main>
      <MemberTabBar activeHref={pathname} />
    </div>
  );
}

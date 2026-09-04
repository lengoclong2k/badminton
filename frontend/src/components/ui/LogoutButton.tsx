"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

export function LogoutButton({ collapsed }: { collapsed?: boolean }) {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      title={collapsed ? "Đăng xuất" : undefined}
      className={cn(
        "mt-2 flex items-center gap-2.5 rounded-control px-3.5 py-2.5 text-sm font-medium text-sec hover:bg-soft",
        collapsed && "lg:justify-center lg:px-2.5",
      )}
    >
      <LogOut size={18} strokeWidth={2} className="shrink-0 text-mut" />
      <span className={cn(collapsed && "lg:hidden")}>Đăng xuất</span>
    </button>
  );
}

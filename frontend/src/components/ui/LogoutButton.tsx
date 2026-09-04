"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="mt-2 flex items-center gap-2.5 rounded-control px-3.5 py-2.5 text-sm font-medium text-sec hover:bg-soft"
    >
      <LogOut size={18} strokeWidth={2} className="text-mut" />
      Đăng xuất
    </button>
  );
}

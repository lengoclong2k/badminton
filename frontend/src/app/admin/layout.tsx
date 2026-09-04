import { apiFetch } from "@/lib/api/server";
import { AdminShell } from "@/components/ui/AdminShell";

type Me = { isAdmin: boolean };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await apiFetch<Me>("/auth/me");
  return <AdminShell isAdmin={me.isAdmin}>{children}</AdminShell>;
}

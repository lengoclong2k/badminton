import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Cổng vào duy nhất của app (Next.js 16 đổi tên "middleware" thành "proxy",
 * hàm export bắt buộc phải tên là `proxy`):
 *  - Chưa đăng nhập + vào route cần auth  -> /login?from=<đường_dẫn_cũ>
 *  - Đã đăng nhập + vào "/" hoặc "/login" -> tự chuyển vào đúng dashboard theo role
 *  - Member thường xem được toàn bộ /admin/* (chỉ xem, trừ tạo/sửa lịch đánh),
 *    riêng /admin/settings luôn chỉ dành cho chủ nhiệm -> đẩy về /m
 *  - /rsvp/* luôn công khai, không cần đăng nhập (không nằm trong matcher)
 */
export async function proxy(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isPublicPath = pathname === "/login";

  // Chưa đăng nhập: chặn mọi route cần auth, giữ lại nơi định đến để quay lại sau khi login.
  if (!user) {
    if (isPublicPath) return response;
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Đã đăng nhập: tra role để biết dashboard mặc định là /admin hay /m.
  const { data: member } = await supabase
    .from("members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  const isAdmin = member?.role === "admin";
  const homePath = isAdmin ? "/admin" : "/m";

  // Vào "/" hoặc quay lại "/login" khi đã có phiên -> đẩy thẳng vào dashboard.
  if (pathname === "/" || pathname === "/login") {
    return NextResponse.redirect(new URL(homePath, request.url));
  }

  // Chỉ /admin/settings là dành riêng cho chủ nhiệm; các màn admin khác
  // (lịch đánh, thành viên, quỹ, xếp hạng) member thường vẫn xem được.
  if (pathname.startsWith("/admin/settings") && !isAdmin) {
    return NextResponse.redirect(new URL("/m", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/", "/login", "/admin/:path*", "/m/:path*"],
};

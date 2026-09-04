import { ToastProvider } from "@/components/ui/Toast";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CLB Cầu Lông HDA",
  description: "Quản lý lịch đánh, điểm danh và quỹ CLB cầu lông Long",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // suppressHydrationWarning trên <html>: một số extension trình duyệt (vd Trancy)
  // tự chèn thuộc tính vào <html> trước khi React hydrate, gây cảnh báo
  // "hydration mismatch" giả — không liên quan gì tới code trong dự án.
  return (
    <html lang="vi" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

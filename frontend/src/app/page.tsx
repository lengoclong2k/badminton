import Link from "next/link";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-ink">CLB Cầu Lông HDA</h1>
        <p className="text-sm text-sec">Base frontend — Next.js + Tailwind, chọn khu vực để xem</p>
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-3">
        <Card className="flex flex-col items-start gap-3">
          <CardTitle>Admin</CardTitle>
          <CardSubtitle>Tổng quan, lịch, quỹ, thành viên</CardSubtitle>
          <Link href="/admin">
            <Button size="sm">Mở khu Admin</Button>
          </Link>
        </Card>
        <Card className="flex flex-col items-start gap-3">
          <CardTitle>Member</CardTitle>
          <CardSubtitle>Trang chủ, lịch, quỹ, xếp hạng</CardSubtitle>
          <Link href="/m">
            <Button size="sm" variant="secondary">Mở khu Member</Button>
          </Link>
        </Card>
        <Card className="flex flex-col items-start gap-3">
          <CardTitle>RSVP công khai</CardTitle>
          <CardSubtitle>Không cần đăng nhập</CardSubtitle>
          <Link href="/rsvp/2026-08-27-toi">
            <Button size="sm" variant="secondary">Mở trang đăng ký</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}

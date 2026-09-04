"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { apiPost } from "@/lib/api/client";

/** Số tuần lịch được sinh sẵn mỗi lần bấm — khớp với job chạy hằng ngày. */
const WEEKS_AHEAD = 5;

const toDateString = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Sinh ngay các buổi cố định từ lịch mẫu, không phải chờ job chạy lúc 00:10.
 * Buổi đã có được bỏ qua (unique theo ngày + giờ bắt đầu) nên bấm bao nhiêu
 * lần cũng an toàn, không tạo trùng.
 */
export function GenerateSessionsButton() {
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  async function handleClick() {
    setSubmitting(true);
    try {
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + WEEKS_AHEAD * 7);

      const res = await apiPost<{ created: number }>("/schedules/generate-sessions", {
        from: toDateString(from),
        to: toDateString(to),
      });

      showToast(
        res.created > 0
          ? `Đã sinh ${res.created} buổi mới cho ${WEEKS_AHEAD} tuần tới`
          : "Lịch đã đủ rồi — không có buổi nào cần sinh thêm",
      );
      router.refresh();
    } catch {
      showToast("Sinh lịch thất bại, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button variant="secondary" onClick={handleClick} disabled={submitting}>
      {submitting ? "Đang sinh lịch..." : "Sinh lịch ngay"}
    </Button>
  );
}

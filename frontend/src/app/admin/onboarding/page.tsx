import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { InputField } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

const STEPS = ["Thông tin CLB", "Lịch cố định", "Mức quỹ", "Mời thành viên"];

export default function OnboardingPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Tạo CLB lần đầu</h1>
        <p className="text-sm text-sec">Bước 1/4 · Thông tin CLB</p>
      </div>

      <div className="flex gap-2">
        {STEPS.map((step, i) => (
          <div
            key={step}
            className={cn(
              "flex-1 rounded-full h-1.5",
              i === 0 ? "bg-mint" : "bg-line",
            )}
          />
        ))}
      </div>

      <Card className="flex flex-col gap-4">
        <CardTitle>{STEPS[0]}</CardTitle>
        <InputField label="Tên CLB" placeholder="VD: CLB Cầu Lông Long" />
        <InputField
          label="Sân thường đánh"
          placeholder="VD: Sân Cầu Lông Thành Công"
        />
        <div className="flex justify-end gap-3">
          <Button variant="secondary">Bỏ qua</Button>
          <Button>Tiếp tục</Button>
        </div>
      </Card>
    </div>
  );
}

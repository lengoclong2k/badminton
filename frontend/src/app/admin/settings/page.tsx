import { Card, CardTitle } from "@/components/ui/Card";
import { FixedSchedulesCard, DeleteClubButton, MemberRolesCard } from "@/components/modals/SettingsActionButtons";
import { ClubNameForm, FeeSettingsForm } from "@/components/modals/SettingsForm";
import { apiFetch } from "@/lib/api/server";

type ClubSettings = {
  clubName: string;
  defaultCourt: string | null;
  monthlyFeeMale: number;
  monthlyFeeFemale: number;
  guestFeeMale: number;
  guestFeeFemale: number;
  femaleRatio: number;
  defaultCourtCost: number;
};

type FixedSchedule = { id: string; weekday: number; startTime: string; endTime: string; court: string | null };
type MemberRow = { id: string; fullName: string; role: "admin" | "member"; status: string };
type PaginatedMembers = { items: MemberRow[]; total: number };
type Me = { member: { id: string } | null };

export default async function SettingsPage() {
  const [settings, schedules, membersRes, me] = await Promise.all([
    apiFetch<ClubSettings>("/settings"),
    apiFetch<FixedSchedule[]>("/schedules"),
    apiFetch<PaginatedMembers>("/members?limit=100"),
    apiFetch<Me>("/auth/me"),
  ]);
  const members = membersRes.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-ink">Cài đặt</h1>

      <ClubNameForm initial={settings.clubName} />

      <FeeSettingsForm
        initial={{
          clubName: settings.clubName,
          monthlyFeeMale: settings.monthlyFeeMale,
          monthlyFeeFemale: settings.monthlyFeeFemale,
          guestFeeMale: settings.guestFeeMale,
          guestFeeFemale: settings.guestFeeFemale,
          femaleRatio: settings.femaleRatio,
          defaultCourtCost: settings.defaultCourtCost,
        }}
      />

      <Card className="flex flex-col gap-3">
        <CardTitle>Lịch cố định hàng tuần</CardTitle>
        <FixedSchedulesCard schedules={schedules} />
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle>Phân quyền</CardTitle>
          <p className="text-sm text-sec">
            Chủ nhiệm: toàn quyền, kể cả sửa giới tính/quỹ/xóa thành viên và Cài đặt.
          </p>
          <p className="text-sm text-sec">
            Thành viên khác: xem mọi màn Admin (trừ Cài đặt), tự đăng ký buổi, tạo và sửa lịch đánh.
          </p>
        </div>
        <MemberRolesCard members={members} currentMemberId={me.member?.id ?? ""} />
      </Card>

      <Card className="flex flex-col gap-3 border-danger">
        <CardTitle className="text-danger-ink">Vùng nguy hiểm</CardTitle>
        <p className="text-sm text-sec">
          Xóa CLB sẽ xóa toàn bộ lịch sử buổi, quỹ và thành viên. Không thể hoàn tác.
        </p>
        <DeleteClubButton />
      </Card>
    </div>
  );
}

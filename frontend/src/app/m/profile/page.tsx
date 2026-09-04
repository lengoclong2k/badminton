import { Avatar } from "@/components/ui/Avatar";
import { SexChip } from "@/components/ui/Chip";
import { Card, CardTitle } from "@/components/ui/Card";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { ProfileEditForm } from "@/components/modals/ProfileEditForm";
import { apiFetch } from "@/lib/api/server";

type Me = {
  email: string;
  member: {
    id: string;
    fullName: string;
    sex: "nam" | "nu";
    phone: string | null;
    joinedAt: string;
  } | null;
};

export default async function MemberProfilePage() {
  const me = await apiFetch<Me>("/auth/me");
  const member = me.member;

  if (!member) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-bold text-ink">Hồ sơ</h1>
        <p className="text-sm text-sec">
          Tài khoản {me.email} chưa được gắn với một thành viên nào trong CLB. Liên hệ chủ nhiệm để được thêm vào.
        </p>
        <LogoutButton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar name={member.fullName} size={56} />
        <div>
          <h1 className="text-xl font-bold text-ink">{member.fullName}</h1>
          <SexChip sex={member.sex} />
        </div>
      </div>

      <Card className="flex flex-col gap-2">
        <CardTitle>Thông tin</CardTitle>
        <p className="text-sm text-sec">Số điện thoại: {member.phone ?? "Chưa cập nhật"}</p>
        <p className="text-sm text-sec">
          Tham gia CLB từ: {new Date(member.joinedAt).toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" })}
        </p>
        <p className="text-xs text-mut">
          Giới tính quyết định mức quỹ hằng tháng — chỉ chủ nhiệm mới sửa được mục này.
        </p>
      </Card>

      <ProfileEditForm fullName={member.fullName} phone={member.phone} />

      <LogoutButton />
    </div>
  );
}

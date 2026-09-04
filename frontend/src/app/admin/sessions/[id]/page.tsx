import { Card, CardTitle } from "@/components/ui/Card";
import { SexChip } from "@/components/ui/Chip";
import {
  AddParticipantsButton, BulkMarkGoingButton, CancelSessionButton, CloseSessionButton, EditSessionButton,
  GuestPaidBadge, MemberRsvpControl, OpenSessionButton, RsvpLinkButton, SessionStatusBadge,
} from "@/components/modals/SessionActionButtons";
import { apiFetch } from "@/lib/api/server";

type Me = { isAdmin: boolean; defaultGuestFeeMale: number; defaultGuestFeeFemale: number };
type ClubMember = { id: string; fullName: string; sex: "nam" | "nu" };
type PaginatedMembers = { items: ClubMember[]; total: number };

type SessionSummary = {
  id: string;
  slug: string;
  playDate: string;
  startTime: string;
  endTime: string;
  court: string | null;
  sessionType: "fixed" | "extra";
  status: string;
  totalCost: number;
  memberCount: number;
  guestCount: number;
  guestIncome: number;
  fundDelta: number;
};

type Attendee = {
  id: string;
  memberId: string | null;
  guestName: string | null;
  guestSex: "nam" | "nu" | null;
  isGuest: boolean;
  rsvpStatus: "pending" | "registered" | "cancelled";
  guestFee: number;
  guestPaid: boolean;
  member: { fullName: string; sex: "nam" | "nu" } | null;
};

const money = (n: number) => `${Math.abs(Math.round(n)).toLocaleString("vi-VN")} ₫`;

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, attendees, me, membersRes] = await Promise.all([
    apiFetch<SessionSummary>(`/sessions/${id}`),
    apiFetch<Attendee[]>(`/sessions/${id}/attendees`),
    apiFetch<Me>("/auth/me"),
    apiFetch<PaginatedMembers>("/members?status=active&limit=100"),
  ]);

  const isClosed = session.status === "closed";
  const isDraft = session.status === "draft";
  const rsvpLinkDisabled = session.status === "closed" || session.status === "cancelled";
  const attendingMemberIds = attendees.filter((a) => !a.isGuest && a.memberId).map((a) => a.memberId as string);
  const pendingAttendeeIds = attendees.filter((a) => !a.isGuest && a.rsvpStatus === "pending").map((a) => a.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-ink">
              Điểm danh · {new Date(session.playDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
            </h1>
            <SessionStatusBadge status={session.status} />
          </div>
          <p className="text-sm text-sec">
            {session.startTime.slice(0, 5)}–{session.endTime.slice(0, 5)} · {session.court ?? "Chưa chọn sân"} ·{" "}
            {session.sessionType === "fixed" ? "Buổi cố định" : "Buổi phát sinh"}
          </p>
        </div>
        <div className="flex gap-3">
          {isDraft && <OpenSessionButton slug={session.slug} />}
          <RsvpLinkButton slug={session.slug} disabled={rsvpLinkDisabled} />
          {!isClosed && (
            <EditSessionButton
              slug={session.slug}
              playDate={session.playDate}
              startTime={session.startTime}
              endTime={session.endTime}
              court={session.court}
            />
          )}
        </div>
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>
            Danh sách đăng ký ({session.memberCount} thành viên + {session.guestCount} khách)
          </CardTitle>
          {!isClosed && (
            <div className="flex items-center gap-2">
              {me.isAdmin && <BulkMarkGoingButton slug={session.slug} pendingAttendeeIds={pendingAttendeeIds} />}
              <AddParticipantsButton
                slug={session.slug}
                members={membersRes.items ?? []}
                attendingMemberIds={attendingMemberIds}
                defaultGuestFeeMale={me.defaultGuestFeeMale}
                defaultGuestFeeFemale={me.defaultGuestFeeFemale}
              />
            </div>
          )}
        </div>
        {attendees.map((a) => {
          const name = a.isGuest ? `Khách: ${a.guestName}` : a.member?.fullName ?? "—";
          const sex = a.isGuest ? a.guestSex ?? "nam" : a.member?.sex ?? "nam";
          return (
            <div key={a.id} className="flex items-center gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
              <SexChip sex={sex} />
              <p className="flex-1 text-sm font-medium text-ink">{name}</p>
              {a.isGuest ? (
                <GuestPaidBadge
                  attendeeId={a.id}
                  guestFee={a.guestFee}
                  guestPaid={a.guestPaid}
                  canEdit={me.isAdmin && !isClosed}
                />
              ) : (
                <MemberRsvpControl
                  attendeeId={a.id}
                  status={a.rsvpStatus}
                  canEdit={me.isAdmin && !isClosed}
                />
              )}
            </div>
          );
        })}
        {attendees.length === 0 && <p className="text-sm text-mut">Chưa có ai đăng ký buổi này.</p>}
      </Card>

      <Card className="flex flex-col gap-4">
        <CardTitle>Kết toán buổi {isClosed ? "(đã chốt)" : "(chốt buổi)"}</CardTitle>
        <div className="flex gap-8">
          <div>
            <p className="text-xs text-sec">Tiền sân</p>
            <p className="font-mono text-lg text-danger-ink">−{money(session.totalCost)}</p>
          </div>
          <div>
            <p className="text-xs text-sec">Thu từ khách</p>
            <p className="font-mono text-lg text-mint-deep">+{money(session.guestIncome)}</p>
          </div>
          <div>
            <p className="text-xs text-sec">Quỹ thay đổi</p>
            <p className={`font-mono text-lg ${session.fundDelta >= 0 ? "text-mint-deep" : "text-danger-ink"}`}>
              {session.fundDelta >= 0 ? "+" : "−"}
              {money(session.fundDelta)}
            </p>
          </div>
        </div>
        {!isClosed && me.isAdmin && (
          <div className="flex gap-3">
            <CancelSessionButton slug={session.slug} />
            <CloseSessionButton slug={session.slug} totalCost={session.totalCost} guestIncome={session.guestIncome} />
          </div>
        )}
      </Card>
    </div>
  );
}

import { Card, CardTitle } from "@/components/ui/Card";
import { MemberIdentity } from "@/components/ui/Chip";
import {
  AddParticipantsButton, BulkMarkGoingButton, CancelSessionButton, CloseSessionButton, EditSessionButton,
  GuestPaidBadge, MemberRsvpControl, OpenSessionButton, RsvpLinkButton, RsvpStatusBadge, SessionStatusBadge,
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold text-ink sm:text-2xl">
              Điểm danh · {new Date(session.playDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
            </h1>
            <SessionStatusBadge status={session.status} />
          </div>
          <p className="text-sm text-sec">
            {session.startTime.slice(0, 5)}–{session.endTime.slice(0, 5)} · {session.court ?? "Chưa chọn sân"} ·{" "}
            {session.sessionType === "fixed" ? "Buổi cố định" : "Buổi phát sinh"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>
            Danh sách đăng ký ({session.memberCount} thành viên + {session.guestCount} khách)
          </CardTitle>
          {!isClosed && (
            <div className="flex flex-wrap items-center gap-2">
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
            <div
              key={a.id}
              className="flex flex-col gap-2 border-b border-line pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <MemberIdentity
                name={name}
                sex={sex}
                topExtra={!a.isGuest && <RsvpStatusBadge status={a.rsvpStatus} />}
                className="min-w-0 flex-1"
              />
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
        <div className="flex flex-wrap gap-4 sm:gap-8">
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
          <div className="flex flex-wrap gap-3">
            <CancelSessionButton slug={session.slug} />
            <CloseSessionButton slug={session.slug} totalCost={session.totalCost} guestIncome={session.guestIncome} />
          </div>
        )}
      </Card>
    </div>
  );
}

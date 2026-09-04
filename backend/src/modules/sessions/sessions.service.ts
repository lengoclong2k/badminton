import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Not, Repository } from 'typeorm';
import {
  AttendanceStatus, RsvpStatus, SessionStatus, SessionType,
} from 'src/common/enums';
import { PaginatedResult } from 'src/common/dto/pagination.dto';
import { isUuid } from 'src/common/utils/uuid.util';
import { toDateString } from 'src/common/utils/date.util';
import { PlaySession, SessionAttendee } from 'src/database/entities';
import { SessionSummaryView } from 'src/database/views';
import { DbFunctionsService, CloseSessionResult } from 'src/database/db-functions.service';
import { SettingsService } from 'src/modules/settings/settings.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { QuerySessionsDto } from './dto/query-sessions.dto';
import { CloseSessionDto } from './dto/close-session.dto';
import { AddGuestDto, BulkAttendanceDto, BulkRsvpStatusDto } from './dto/attendance.dto';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(PlaySession) private readonly sessions: Repository<PlaySession>,
    @InjectRepository(SessionAttendee) private readonly attendees: Repository<SessionAttendee>,
    @InjectRepository(SessionSummaryView) private readonly summaries: Repository<SessionSummaryView>,
    private readonly settings: SettingsService,
    private readonly dbFunctions: DbFunctionsService,
  ) {}

  // ---- Truy vấn ------------------------------------------------------------

  async findAll(query: QuerySessionsDto): Promise<PaginatedResult<SessionSummaryView>> {
    const qb = this.summaries
      .createQueryBuilder('s')
      .orderBy('s.playDate', 'DESC')
      .addOrderBy('s.startTime', 'DESC');

    if (query.status) qb.andWhere('s.status = :status', { status: query.status });
    if (query.sessionType) qb.andWhere('s.sessionType = :type', { type: query.sessionType });
    if (query.from) qb.andWhere('s.playDate >= :from', { from: query.from });
    if (query.to) qb.andWhere('s.playDate <= :to', { to: query.to });

    const [items, total] = await qb.skip(query.skip).take(query.limit).getManyAndCount();
    return new PaginatedResult(items, total, query);
  }

  /**
   * Các buổi sắp tới cho màn Lịch đánh. Bỏ buổi đã hủy — "hủy buổi" chỉ đổi
   * status trong DB (giữ lại lịch sử) chứ không xóa dòng, nên phải lọc ở đây.
   */
  upcoming(limit = 10): Promise<SessionSummaryView[]> {
    return this.summaries.find({
      where: { playDate: MoreThanOrEqual(toDateString()), status: Not(SessionStatus.CANCELLED) },
      order: { playDate: 'ASC', startTime: 'ASC' },
      take: limit,
    });
  }

  /** Buổi gần nhất trong ngày hôm nay, dùng cho card "Buổi tối nay". Bỏ buổi đã hủy. */
  async today(): Promise<SessionSummaryView | null> {
    const found = await this.summaries.findOne({
      where: { playDate: toDateString(), status: Not(SessionStatus.CANCELLED) },
      order: { startTime: 'ASC' },
    });
    return found ?? null;
  }

  /** Nhận cả uuid lẫn slug để khớp URL của frontend. */
  async findOne(idOrSlug: string): Promise<PlaySession> {
    const session = await this.sessions.findOne({
      where: isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
    });
    if (!session) throw new NotFoundException('Không tìm thấy buổi đánh');
    return session;
  }

  async summary(idOrSlug: string): Promise<SessionSummaryView> {
    const session = await this.findOne(idOrSlug);
    return this.summaries.findOneOrFail({ where: { id: session.id } });
  }

  /** Danh sách đăng ký + điểm danh của một buổi. */
  async listAttendees(idOrSlug: string): Promise<SessionAttendee[]> {
    const session = await this.findOne(idOrSlug);
    return this.attendees.find({
      where: { sessionId: session.id },
      relations: { member: true },
      order: { isGuest: 'ASC', registeredAt: 'ASC' },
    });
  }

  // ---- Tạo / sửa -----------------------------------------------------------

  async create(dto: CreateSessionDto, createdById?: string, authUserId?: string): Promise<PlaySession> {
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu');
    }

    const config = await this.settings.get();
    const duplicate = await this.sessions.findOne({
      where: { playDate: dto.playDate, startTime: dto.startTime },
    });
    if (duplicate) {
      throw new ConflictException('Đã có buổi đánh vào đúng ngày và khung giờ này');
    }

    const explicitGuests = dto.guests ?? [];

    const session = this.sessions.create({
      playDate: dto.playDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      court: dto.court ?? config.defaultCourt,
      sessionType: dto.sessionType ?? SessionType.EXTRA,
      status: dto.openForRsvp === false ? SessionStatus.DRAFT : SessionStatus.OPEN,
      // "Slot khách" tự đăng ký công khai (qua link RSVP) là tính năng riêng,
      // tách khỏi việc admin/thành viên tự ghi tên khách vào buổi ở dưới —
      // không giới hạn số khách được ghi trực tiếp.
      guestSlotsEnabled: dto.guestSlotsEnabled ?? false,
      guestSlotsMax: dto.guestSlotsEnabled ? (dto.guestSlotsMax ?? 0) : 0,
      // Chụp lại mức phí khách để lịch sử không đổi khi sửa cấu hình CLB
      guestFeeMale: dto.guestFeeMale ?? config.guestFeeMale,
      guestFeeFemale: dto.guestFeeFemale ?? config.guestFeeFemale,
      note: dto.note ?? null,
      createdById: createdById ?? null,
      slug: '', // trigger trong DB tự sinh: 2026-09-03-toi
    });

    const saved = await this.sessions.save(session);

    // Đăng ký sẵn thành viên + khách được chọn lúc tạo buổi (chỉ khi buổi mở
    // đăng ký ngay — buổi nháp thì để trống, đăng ký lúc mở sau).
    if (dto.openForRsvp !== false) {
      const memberIds = [...new Set(dto.memberIds ?? [])];
      for (const memberId of memberIds) {
        await this.toggleMember(saved.id, memberId);
      }
      for (const guest of explicitGuests) {
        await this.addGuest(saved.id, {
          guestName: guest.guestName,
          guestSex: guest.guestSex,
          guestFee: guest.guestFee,
        });
      }
    }

    // Đọc lại để lấy slug, total_cost và số liệu đăng ký do DB sinh ra
    const result = await this.sessions.findOneOrFail({ where: { id: saved.id } });

    if (authUserId) {
      await this.dbFunctions.logActivity(
        authUserId,
        'session.create',
        `Tạo buổi ${result.playDate} ${result.startTime}–${result.endTime}`,
        'session',
        result.id,
      );
    }

    return result;
  }

  /**
   * Thêm thành viên/khách vào một buổi đang mở — dùng khi gần đến ngày mới biết
   * thêm người đi. Chỉ thêm vào danh sách (roster) ở trạng thái "Chưa điểm
   * danh" (pending) — KHÔNG tự coi là "Có đi", để họ tự điểm danh qua link
   * RSVP hoặc admin đổi tay sau, đúng thiết kế "RSVP = điểm danh".
   */
  async addParticipants(
    idOrSlug: string,
    memberIds: string[] = [],
    guests: { guestName: string; guestSex: 'nam' | 'nu'; guestFee?: number }[] = [],
  ): Promise<SessionAttendee[]> {
    const session = await this.assertOpen(idOrSlug);
    const results: SessionAttendee[] = [];

    // Chỉ THÊM VÀO DANH SÁCH (roster) — không tự coi là "đã điểm danh".
    // Mặc định "Chưa điểm danh" (pending) như buổi cố định, để họ tự bấm
    // link RSVP hoặc admin đổi tay sau. Nếu đã có dòng rồi (kể cả đã điểm
    // danh) thì giữ nguyên, không ghi đè trạng thái đã chọn của người ta.
    for (const memberId of [...new Set(memberIds)]) {
      const existing = await this.attendees.findOne({ where: { sessionId: session.id, memberId } });
      if (!existing) {
        results.push(
          await this.attendees.save(
            this.attendees.create({ sessionId: session.id, memberId, rsvpStatus: RsvpStatus.PENDING }),
          ),
        );
      } else {
        results.push(existing);
      }
    }

    for (const guest of guests) {
      results.push(
        await this.addGuest(session.id, {
          guestName: guest.guestName,
          guestSex: guest.guestSex as any,
          guestFee: guest.guestFee,
        }),
      );
    }

    return results;
  }

  async update(idOrSlug: string, dto: UpdateSessionDto, authUserId?: string): Promise<PlaySession> {
    const session = await this.findOne(idOrSlug);
    if (session.status === SessionStatus.CLOSED) {
      throw new ConflictException('Buổi đã chốt, cần mở lại trước khi sửa');
    }
    Object.assign(session, dto);
    if (session.startTime >= session.endTime) {
      throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu');
    }
    const saved = await this.sessions.save(session);

    if (authUserId) {
      await this.dbFunctions.logActivity(
        authUserId,
        'session.update',
        `Sửa buổi ${saved.playDate} ${saved.startTime}–${saved.endTime}`,
        'session',
        saved.id,
      );
    }

    return saved;
  }

  /** Mở đăng ký cho buổi đang ở trạng thái nháp. */
  async openRsvp(idOrSlug: string, authUserId?: string): Promise<PlaySession> {
    const session = await this.findOne(idOrSlug);
    if (session.status !== SessionStatus.DRAFT) {
      throw new ConflictException('Chỉ buổi đang ở trạng thái nháp mới cần mở đăng ký');
    }
    session.status = SessionStatus.OPEN;
    const saved = await this.sessions.save(session);

    if (authUserId) {
      await this.dbFunctions.logActivity(
        authUserId,
        'session.open_rsvp',
        `Mở đăng ký buổi ${saved.playDate} ${saved.startTime}–${saved.endTime}`,
        'session',
        saved.id,
      );
    }

    return saved;
  }

  /** Link RSVP công khai để gửi cho thành viên. */
  async rsvpLink(idOrSlug: string, baseUrl: string): Promise<{ slug: string; url: string }> {
    const session = await this.findOne(idOrSlug);
    return { slug: session.slug, url: `${baseUrl.replace(/\/$/, '')}/rsvp/${session.slug}` };
  }

  // ---- Chốt / hủy buổi (đi qua hàm SQL để đảm bảo nguyên tử) ---------------

  async close(authUserId: string, idOrSlug: string, dto: CloseSessionDto): Promise<CloseSessionResult> {
    const session = await this.findOne(idOrSlug);
    return this.dbFunctions.closeSession(
      authUserId,
      session.id,
      { courtCost: dto.courtCost, shuttleCost: dto.shuttleCost, otherCost: dto.otherCost },
      dto.pendingAs ?? AttendanceStatus.PRESENT,
    );
  }

  async reopen(authUserId: string, idOrSlug: string): Promise<PlaySession> {
    const session = await this.findOne(idOrSlug);
    await this.dbFunctions.reopenSession(authUserId, session.id);
    return this.findOne(session.id);
  }

  async cancel(authUserId: string, idOrSlug: string, reason?: string): Promise<PlaySession> {
    const session = await this.findOne(idOrSlug);
    await this.dbFunctions.cancelSession(authUserId, session.id, reason);
    return this.findOne(session.id);
  }

  // ---- Đăng ký & điểm danh -------------------------------------------------

  /** Thành viên tự đăng ký hoặc bỏ đăng ký buổi đang mở. */
  async toggleMember(idOrSlug: string, memberId: string): Promise<SessionAttendee> {
    const session = await this.assertOpen(idOrSlug);

    const existing = await this.attendees.findOne({ where: { sessionId: session.id, memberId } });
    if (!existing) {
      return this.attendees.save(
        this.attendees.create({ sessionId: session.id, memberId, rsvpStatus: RsvpStatus.REGISTERED }),
      );
    }

    existing.rsvpStatus =
      existing.rsvpStatus === RsvpStatus.REGISTERED ? RsvpStatus.CANCELLED : RsvpStatus.REGISTERED;
    return this.attendees.save(existing);
  }

  /**
   * Thêm khách vào buổi — không giới hạn số lượng. Số tiền khách đóng do admin
   * ghi trực tiếp lúc thêm (dto.guestFee); bỏ trống thì lấy theo giới tính
   * trong cấu hình buổi (chỉ dùng làm gợi ý mặc định trên UI).
   */
  async addGuest(idOrSlug: string, dto: AddGuestDto): Promise<SessionAttendee> {
    const session = await this.assertOpen(idOrSlug);

    return this.attendees.save(
      this.attendees.create({
        sessionId: session.id,
        guestName: dto.guestName.trim(),
        guestSex: dto.guestSex,
        guestFee: dto.guestFee ?? (dto.guestSex === 'nam' ? session.guestFeeMale : session.guestFeeFemale),
        invitedById: dto.invitedBy ?? null,
      }),
    );
  }

  async markAttendance(attendeeId: string, attendance: AttendanceStatus): Promise<SessionAttendee> {
    const attendee = await this.attendees.findOne({ where: { id: attendeeId } });
    if (!attendee) throw new NotFoundException('Không tìm thấy người trong buổi này');
    attendee.attendance = attendance;
    attendee.checkedAt = new Date();
    return this.attendees.save(attendee);
  }

  /** Điểm danh hàng loạt — dùng khi admin chốt danh sách một lượt. */
  async markAttendanceBulk(idOrSlug: string, dto: BulkAttendanceDto): Promise<{ updated: number }> {
    const session = await this.findOne(idOrSlug);
    let updated = 0;

    await this.attendees.manager.transaction(async (manager) => {
      for (const item of dto.items) {
        const result = await manager.update(
          SessionAttendee,
          { id: item.attendeeId, sessionId: session.id },
          { attendance: item.attendance, checkedAt: new Date() },
        );
        updated += result.affected ?? 0;
      }
    });

    return { updated };
  }

  async setGuestPaid(attendeeId: string, guestPaid: boolean): Promise<SessionAttendee> {
    const attendee = await this.attendees.findOne({ where: { id: attendeeId } });
    if (!attendee) throw new NotFoundException('Không tìm thấy khách trong buổi này');
    if (!attendee.isGuest) throw new BadRequestException('Chỉ áp dụng cho khách');
    attendee.guestPaid = guestPaid;
    return this.attendees.save(attendee);
  }

  /**
   * Admin đổi điểm danh RSVP (Có đi/Không đi) của 1 người — bỏ qua khóa
   * "đã chọn 1 lần" của link công khai. Dùng khi thành viên đổi ý và nhờ
   * admin sửa hộ, hoặc admin điểm danh thay cho người không tự bấm link.
   */
  async setAttendeeRsvpStatus(attendeeId: string, rsvpStatus: RsvpStatus): Promise<SessionAttendee> {
    const attendee = await this.attendees.findOne({ where: { id: attendeeId } });
    if (!attendee) throw new NotFoundException('Không tìm thấy người trong buổi này');
    if (attendee.isGuest) throw new BadRequestException('Chỉ áp dụng cho thành viên, không áp dụng cho khách');
    attendee.rsvpStatus = rsvpStatus;
    attendee.registeredAt = new Date();
    return this.attendees.save(attendee);
  }

  /** Điểm danh RSVP hàng loạt — dùng khi admin muốn đánh dấu nhanh nhiều người cùng lúc. */
  async setAttendeeRsvpStatusBulk(idOrSlug: string, dto: BulkRsvpStatusDto): Promise<{ updated: number }> {
    const session = await this.findOne(idOrSlug);
    let updated = 0;

    await this.attendees.manager.transaction(async (manager) => {
      for (const item of dto.items) {
        const result = await manager.update(
          SessionAttendee,
          { id: item.attendeeId, sessionId: session.id },
          { rsvpStatus: item.rsvpStatus, registeredAt: new Date() },
        );
        updated += result.affected ?? 0;
      }
    });

    return { updated };
  }

  async removeAttendee(attendeeId: string): Promise<void> {
    await this.attendees.delete({ id: attendeeId });
  }

  /** Lịch của một thành viên: sắp tới + đã đi. */
  async mySchedule(memberId: string, from?: string, to?: string): Promise<SessionAttendee[]> {
    const qb = this.attendees
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.session', 's')
      .where('a.memberId = :memberId', { memberId })
      .orderBy('s.playDate', 'DESC');

    if (from) qb.andWhere('s.playDate >= :from', { from });
    if (to) qb.andWhere('s.playDate <= :to', { to });

    return qb.getMany();
  }

  private async assertOpen(idOrSlug: string): Promise<PlaySession> {
    const session = await this.findOne(idOrSlug);
    if (session.status !== SessionStatus.OPEN) {
      throw new ConflictException('Buổi này chưa mở hoặc đã đóng đăng ký');
    }
    if (session.rsvpClosesAt && session.rsvpClosesAt <= new Date()) {
      throw new ConflictException('Đã hết hạn đăng ký buổi này');
    }
    return session;
  }
}

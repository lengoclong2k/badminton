import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany,
  PrimaryGeneratedColumn, Unique, UpdateDateColumn,
} from 'typeorm';
import { SessionStatus, SessionType } from 'src/common/enums';
import { numericTransformer } from 'src/common/transformers/numeric.transformer';
import { FixedSchedule } from './fixed-schedule.entity';
import { Member } from './member.entity';
import { SessionAttendee } from './session-attendee.entity';

/**
 * Một buổi đánh. Đặt tên class là PlaySession để tránh nhầm với Session
 * (phiên đăng nhập) trong các thư viện khác.
 */
@Entity('sessions')
@Unique('sessions_unique_slot', ['playDate', 'startTime'])
export class PlaySession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Dùng cho link RSVP công khai: /rsvp/2026-08-27-toi. Trigger DB tự sinh. */
  @Column({ type: 'text', unique: true })
  slug: string;

  @Index()
  @Column({ name: 'play_date', type: 'date' })
  playDate: string;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({ type: 'text', nullable: true })
  court: string | null;

  @Column({ name: 'session_type', type: 'enum', enum: SessionType, enumName: 'session_type', default: SessionType.FIXED })
  sessionType: SessionType;

  @Index()
  @Column({ type: 'enum', enum: SessionStatus, enumName: 'session_status', default: SessionStatus.DRAFT })
  status: SessionStatus;

  @Column({ name: 'fixed_schedule_id', type: 'uuid', nullable: true })
  fixedScheduleId: string | null;

  @ManyToOne(() => FixedSchedule, (fs) => fs.sessions, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'fixed_schedule_id' })
  fixedSchedule: FixedSchedule | null;

  @Column({ name: 'guest_slots_enabled', type: 'boolean', default: false })
  guestSlotsEnabled: boolean;

  @Column({ name: 'guest_slots_max', type: 'smallint', default: 0 })
  guestSlotsMax: number;

  /** Chụp lại mức phí khách lúc tạo buổi để lịch sử không đổi khi sửa cấu hình. */
  @Column({ name: 'guest_fee_male', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  guestFeeMale: number;

  @Column({ name: 'guest_fee_female', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  guestFeeFemale: number;

  @Column({ name: 'court_cost', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  courtCost: number;

  @Column({ name: 'shuttle_cost', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  shuttleCost: number;

  @Column({ name: 'other_cost', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  otherCost: number;

  /** Cột GENERATED trong DB — chỉ đọc. */
  @Column({ name: 'total_cost', type: 'numeric', precision: 12, scale: 2, insert: false, update: false, transformer: numericTransformer })
  totalCost: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'rsvp_opens_at', type: 'timestamptz', nullable: true })
  rsvpOpensAt: Date | null;

  @Column({ name: 'rsvp_closes_at', type: 'timestamptz', nullable: true })
  rsvpClosesAt: Date | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => Member, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: Member | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => SessionAttendee, (a) => a.session)
  attendees: SessionAttendee[];
}

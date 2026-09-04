import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { AttendanceStatus, RsvpStatus, Sex } from 'src/common/enums';
import { numericTransformer } from 'src/common/transformers/numeric.transformer';
import { Member } from './member.entity';
import { PlaySession } from './session.entity';

/**
 * Một dòng = một người trong một buổi.
 * member_id NULL nghĩa là khách (khi đó guest_name/guest_sex bắt buộc).
 */
@Entity('session_attendees')
@Index(['sessionId', 'memberId'], { unique: true, where: 'member_id IS NOT NULL' })
export class SessionAttendee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => PlaySession, (s) => s.attendees, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: PlaySession;

  @Index()
  @Column({ name: 'member_id', type: 'uuid', nullable: true })
  memberId: string | null;

  @ManyToOne(() => Member, (m) => m.attendances, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'member_id' })
  member: Member | null;

  @Column({ name: 'guest_name', type: 'text', nullable: true })
  guestName: string | null;

  @Column({ name: 'guest_sex', type: 'enum', enum: Sex, enumName: 'sex', nullable: true })
  guestSex: Sex | null;

  @Column({ name: 'invited_by', type: 'uuid', nullable: true })
  invitedById: string | null;

  /** Cột GENERATED trong DB — chỉ đọc. */
  @Column({ name: 'is_guest', type: 'boolean', insert: false, update: false })
  isGuest: boolean;

  @Column({ name: 'rsvp_status', type: 'enum', enum: RsvpStatus, enumName: 'rsvp_status', default: RsvpStatus.REGISTERED })
  rsvpStatus: RsvpStatus;

  @Column({ type: 'enum', enum: AttendanceStatus, enumName: 'attendance_status', default: AttendanceStatus.PENDING })
  attendance: AttendanceStatus;

  @Column({ name: 'guest_fee', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  guestFee: number;

  @Column({ name: 'guest_paid', type: 'boolean', default: false })
  guestPaid: boolean;

  @CreateDateColumn({ name: 'registered_at', type: 'timestamptz' })
  registeredAt: Date;

  @Column({ name: 'checked_at', type: 'timestamptz', nullable: true })
  checkedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;
}

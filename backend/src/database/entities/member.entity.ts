import {
  Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { MemberRole, MemberStatus, Sex } from 'src/common/enums';
import { SessionAttendee } from './session-attendee.entity';
import { MemberFee } from './member-fee.entity';

@Entity('members')
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Trỏ tới auth.users của Supabase. Null nếu thành viên chưa có tài khoản. */
  @Column({ name: 'user_id', type: 'uuid', nullable: true, unique: true })
  userId: string | null;

  @Column({ name: 'full_name', type: 'text' })
  fullName: string;

  /** Sinh tự động từ full_name bằng trigger trong DB. */
  @Column({ type: 'text', unique: true })
  slug: string;

  @Index()
  @Column({ type: 'enum', enum: Sex, enumName: 'sex' })
  sex: Sex;

  @Column({ type: 'text', nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  email: string | null;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string | null;

  @Index()
  @Column({ type: 'enum', enum: MemberRole, enumName: 'member_role', default: MemberRole.MEMBER })
  role: MemberRole;

  @Index()
  @Column({ type: 'enum', enum: MemberStatus, enumName: 'member_status', default: MemberStatus.ACTIVE })
  status: MemberStatus;

  @Column({ name: 'joined_at', type: 'date' })
  joinedAt: string;

  @Column({ name: 'left_at', type: 'date', nullable: true })
  leftAt: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => SessionAttendee, (a) => a.member)
  attendances: SessionAttendee[];

  @OneToMany(() => MemberFee, (f) => f.member)
  fees: MemberFee[];
}

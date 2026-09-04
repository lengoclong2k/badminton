import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { FundEntryType } from 'src/common/enums';
import { numericTransformer } from 'src/common/transformers/numeric.transformer';
import { Member } from './member.entity';
import { MemberFee } from './member-fee.entity';
import { PlaySession } from './session.entity';

/**
 * Sổ quỹ CLB — nguồn sự thật duy nhất về số dư.
 * amount dương = thu, âm = chi. Xóa mềm bằng deletedAt để số dư tự tính lại.
 */
@Entity('fund_entries')
export class FundEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'entry_date', type: 'date' })
  entryDate: string;

  @Column({ name: 'entry_type', type: 'enum', enum: FundEntryType, enumName: 'fund_entry_type' })
  entryType: FundEntryType;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  amount: number;

  @Column({ type: 'text' })
  description: string;

  @Index()
  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId: string | null;

  @ManyToOne(() => PlaySession, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'session_id' })
  session: PlaySession | null;

  @Column({ name: 'member_fee_id', type: 'uuid', nullable: true })
  memberFeeId: string | null;

  @ManyToOne(() => MemberFee, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'member_fee_id' })
  memberFee: MemberFee | null;

  @Column({ name: 'member_id', type: 'uuid', nullable: true })
  memberId: string | null;

  @ManyToOne(() => Member, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'member_id' })
  member: Member | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedById: string | null;
}

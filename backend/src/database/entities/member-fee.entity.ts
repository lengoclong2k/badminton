import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
  Unique, UpdateDateColumn,
} from 'typeorm';
import { FeeStatus } from 'src/common/enums';
import { numericTransformer } from 'src/common/transformers/numeric.transformer';
import { FeePeriod } from './fee-period.entity';
import { Member } from './member.entity';

/** Khoản quỹ tháng của từng thành viên. */
@Entity('member_fees')
@Unique('member_fees_unique', ['periodId', 'memberId'])
export class MemberFee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'period_id', type: 'uuid' })
  periodId: string;

  @ManyToOne(() => FeePeriod, (p) => p.memberFees, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'period_id' })
  period: FeePeriod;

  @Index()
  @Column({ name: 'member_id', type: 'uuid' })
  memberId: string;

  @ManyToOne(() => Member, (m) => m.fees, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  amount: number;

  @Index()
  @Column({ type: 'enum', enum: FeeStatus, enumName: 'fee_status', default: FeeStatus.UNPAID })
  status: FeeStatus;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'paid_method', type: 'text', nullable: true })
  paidMethod: string | null;

  @Column({ name: 'collected_by', type: 'uuid', nullable: true })
  collectedById: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

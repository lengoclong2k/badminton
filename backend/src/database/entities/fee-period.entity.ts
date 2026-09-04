import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PeriodStatus } from 'src/common/enums';
import { numericTransformer } from 'src/common/transformers/numeric.transformer';
import { MemberFee } from './member-fee.entity';

/** Một đợt thu quỹ do admin tự mở (bất kỳ lúc nào, không giới hạn theo tháng).
 *  period_month chỉ để nhóm theo tháng dương lịch cho bảng xếp hạng — không
 *  còn là khóa duy nhất, không đảm bảo là ngày 1 của tháng nữa. */
@Entity('fee_periods')
export class FeePeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'period_month', type: 'date' })
  periodMonth: string;

  /** Thời điểm admin thực sự bấm mở đợt — dùng để sắp xếp/định danh đợt. */
  @Column({ name: 'opened_at', type: 'timestamptz' })
  openedAt: Date;

  /** Chụp lại mức quỹ của tháng đó — sửa cấu hình sau này không làm sai lịch sử. */
  @Column({ name: 'fee_male', type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  feeMale: number;

  @Column({ name: 'fee_female', type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  feeFemale: number;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'enum', enum: PeriodStatus, enumName: 'period_status', default: PeriodStatus.OPEN })
  status: PeriodStatus;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => MemberFee, (f) => f.period)
  memberFees: MemberFee[];
}

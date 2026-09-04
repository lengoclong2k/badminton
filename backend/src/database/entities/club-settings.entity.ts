import { Column, Entity, PrimaryColumn, UpdateDateColumn, CreateDateColumn } from 'typeorm';
import { numericTransformer } from 'src/common/transformers/numeric.transformer';

/** Bảng một dòng (id = 1) chứa cấu hình CLB. */
@Entity('club_settings')
export class ClubSettings {
  @PrimaryColumn({ type: 'smallint', default: 1 })
  id: number;

  @Column({ name: 'club_name', type: 'text', default: 'CLB Cầu Lông' })
  clubName: string;

  @Column({ name: 'default_court', type: 'text', nullable: true })
  defaultCourt: string | null;

  @Column({ name: 'monthly_fee_male', type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  monthlyFeeMale: number;

  @Column({ name: 'monthly_fee_female', type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  monthlyFeeFemale: number;

  @Column({ name: 'guest_fee_male', type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  guestFeeMale: number;

  @Column({ name: 'guest_fee_female', type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  guestFeeFemale: number;

  @Column({ name: 'default_court_cost', type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  defaultCourtCost: number;

  @Column({ name: 'female_ratio', type: 'numeric', precision: 5, scale: 4, transformer: numericTransformer })
  femaleRatio: number;

  @Column({ name: 'fee_due_day', type: 'smallint', default: 5 })
  feeDueDay: number;

  @Column({ type: 'text', default: 'Asia/Ho_Chi_Minh' })
  timezone: string;

  @Column({ name: 'onboarding_done', type: 'boolean', default: false })
  onboardingDone: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

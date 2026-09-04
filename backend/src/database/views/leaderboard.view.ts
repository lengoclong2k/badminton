import { ViewColumn, ViewEntity } from 'typeorm';
import { Sex } from 'src/common/enums';
import { numericTransformer } from 'src/common/transformers/numeric.transformer';

/**
 * View v_leaderboard — xếp hạng theo "giá thực mỗi buổi"
 * (tổng quỹ đã đóng trong tháng ÷ số buổi đã đi). Thấp hơn = đi đều hơn.
 */
@ViewEntity({ name: 'v_leaderboard', synchronize: false, expression: '' })
export class LeaderboardView {
  @ViewColumn({ name: 'period_month' }) periodMonth: string;
  @ViewColumn({ name: 'member_id' }) memberId: string;
  @ViewColumn({ name: 'member_slug' }) memberSlug: string;
  @ViewColumn({ name: 'full_name' }) fullName: string;
  @ViewColumn() sex: Sex;
  @ViewColumn({ name: 'fee_amount', transformer: numericTransformer }) feeAmount: number;
  @ViewColumn({ name: 'sessions_registered', transformer: numericTransformer }) sessionsRegistered: number;
  @ViewColumn({ name: 'sessions_attended', transformer: numericTransformer }) sessionsAttended: number;
  @ViewColumn({ name: 'sessions_missed', transformer: numericTransformer }) sessionsMissed: number;
  @ViewColumn({ name: 'cost_per_session', transformer: numericTransformer }) costPerSession: number | null;
  @ViewColumn({ name: 'rank', transformer: numericTransformer }) rank: number;
}

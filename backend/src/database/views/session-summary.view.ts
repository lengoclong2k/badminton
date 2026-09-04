import { ViewColumn, ViewEntity } from 'typeorm';
import { SessionStatus, SessionType } from 'src/common/enums';
import { numericTransformer } from 'src/common/transformers/numeric.transformer';

/** View v_session_summary — thống kê từng buổi. Chỉ đọc. */
@ViewEntity({ name: 'v_session_summary', synchronize: false, expression: '' })
export class SessionSummaryView {
  @ViewColumn() id: string;
  @ViewColumn() slug: string;
  @ViewColumn({ name: 'play_date' }) playDate: string;
  @ViewColumn({ name: 'start_time' }) startTime: string;
  @ViewColumn({ name: 'end_time' }) endTime: string;
  @ViewColumn() court: string | null;
  @ViewColumn({ name: 'session_type' }) sessionType: SessionType;
  @ViewColumn() status: SessionStatus;
  @ViewColumn({ name: 'guest_slots_enabled' }) guestSlotsEnabled: boolean;
  @ViewColumn({ name: 'guest_slots_max' }) guestSlotsMax: number;
  @ViewColumn({ name: 'total_cost', transformer: numericTransformer }) totalCost: number;
  @ViewColumn({ name: 'member_count', transformer: numericTransformer }) memberCount: number;
  @ViewColumn({ name: 'male_count', transformer: numericTransformer }) maleCount: number;
  @ViewColumn({ name: 'female_count', transformer: numericTransformer }) femaleCount: number;
  @ViewColumn({ name: 'guest_count', transformer: numericTransformer }) guestCount: number;
  @ViewColumn({ name: 'guest_male_count', transformer: numericTransformer }) guestMaleCount: number;
  @ViewColumn({ name: 'guest_female_count', transformer: numericTransformer }) guestFemaleCount: number;
  @ViewColumn({ name: 'present_count', transformer: numericTransformer }) presentCount: number;
  @ViewColumn({ name: 'absent_count', transformer: numericTransformer }) absentCount: number;
  @ViewColumn({ name: 'guest_income', transformer: numericTransformer }) guestIncome: number;
  @ViewColumn({ name: 'guest_slots_left', transformer: numericTransformer }) guestSlotsLeft: number;
  @ViewColumn({ name: 'fund_delta', transformer: numericTransformer }) fundDelta: number;
}

import { ViewColumn, ViewEntity } from 'typeorm';
import { MemberStatus, Sex } from 'src/common/enums';
import { numericTransformer } from 'src/common/transformers/numeric.transformer';

/**
 * View v_member_current_fee — tổng nợ quỹ CỘNG DỒN của mỗi thành viên tính
 * tới hiện tại (mỗi đợt thu quỹ độc lập, nợ nhiều đợt cùng lúc thì cộng
 * dồn lại — không còn khái niệm "quỹ tháng này" duy nhất nữa).
 */
@ViewEntity({ name: 'v_member_current_fee', synchronize: false, expression: '' })
export class MemberCurrentFeeView {
  @ViewColumn({ name: 'member_id' }) memberId: string;
  @ViewColumn() slug: string;
  @ViewColumn({ name: 'full_name' }) fullName: string;
  @ViewColumn() sex: Sex;
  @ViewColumn() status: MemberStatus;
  /** Số đợt quỹ chưa đóng (0 = không nợ gì). */
  @ViewColumn({ name: 'unpaid_count', transformer: numericTransformer }) unpaidCount: number;
  /** Tổng tiền còn thiếu, cộng dồn mọi đợt chưa đóng. */
  @ViewColumn({ name: 'unpaid_amount', transformer: numericTransformer }) unpaidAmount: number;
  /** Lần gần nhất có đợt quỹ nào đó được mở liên quan tới thành viên này — null nghĩa là chưa từng có đợt nào. */
  @ViewColumn({ name: 'last_opened_at' }) lastOpenedAt: Date | null;
}

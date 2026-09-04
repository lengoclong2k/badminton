import { ViewColumn, ViewEntity } from 'typeorm';
import { numericTransformer } from 'src/common/transformers/numeric.transformer';

/**
 * View v_fee_overview — tổng quan quỹ CLB, không còn khoanh theo tháng:
 * tổng số đợt đã đóng/chưa đóng và số tiền tương ứng, tính trên toàn bộ
 * các đợt thu quỹ admin đã từng mở.
 */
@ViewEntity({ name: 'v_fee_overview', synchronize: false, expression: '' })
export class FeeOverviewView {
  @ViewColumn({ name: 'paid_count', transformer: numericTransformer }) paidCount: number;
  @ViewColumn({ name: 'unpaid_count', transformer: numericTransformer }) unpaidCount: number;
  @ViewColumn({ name: 'collected_amount', transformer: numericTransformer }) collectedAmount: number;
  @ViewColumn({ name: 'outstanding_amount', transformer: numericTransformer }) outstandingAmount: number;
  @ViewColumn({ name: 'last_opened_at' }) lastOpenedAt: Date | null;
}

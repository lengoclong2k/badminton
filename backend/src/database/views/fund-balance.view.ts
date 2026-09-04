import { ViewColumn, ViewEntity } from 'typeorm';
import { numericTransformer } from 'src/common/transformers/numeric.transformer';

/** View v_fund_balance — số dư quỹ hiện tại. Chỉ đọc. */
@ViewEntity({ name: 'v_fund_balance', synchronize: false, expression: '' })
export class FundBalanceView {
  @ViewColumn({ name: 'balance', transformer: numericTransformer })
  balance: number;

  @ViewColumn({ name: 'total_in', transformer: numericTransformer })
  totalIn: number;

  @ViewColumn({ name: 'total_out', transformer: numericTransformer })
  totalOut: number;

  @ViewColumn({ name: 'last_entry_date' })
  lastEntryDate: string | null;
}

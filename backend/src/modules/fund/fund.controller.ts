import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemberRole } from 'src/common/enums';
import { CurrentMember, Roles } from 'src/common/decorators';
import { AuthenticatedUser } from 'src/modules/auth/auth.types';
import { FundService } from './fund.service';
import { CreateExpenseDto, CreateIncomeDto, QueryLedgerDto } from './dto/fund.dto';

@ApiTags('fund')
@ApiBearerAuth()
@Controller('fund')
export class FundController {
  constructor(private readonly service: FundService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Số dư quỹ CLB hiện tại' })
  balance() {
    return this.service.getBalance();
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Sổ quỹ (đã bỏ các dòng bị xóa)' })
  ledger(@Query() query: QueryLedgerDto) {
    return this.service.listLedger(query);
  }

  @Post('expenses')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Thêm khoản chi ngoài buổi đánh' })
  addExpense(@CurrentMember() user: AuthenticatedUser, @Body() dto: CreateExpenseDto) {
    return this.service.addExpense(dto, user.member!.id, user.authUserId);
  }

  @Post('incomes')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Thêm khoản thu khác' })
  addIncome(@CurrentMember() user: AuthenticatedUser, @Body() dto: CreateIncomeDto) {
    return this.service.addIncome(dto, user.member!.id, user.authUserId);
  }

  @Delete('entries/:id')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Xóa mềm một khoản quỹ, số dư được tính lại' })
  remove(@CurrentMember() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.softDelete(id, user.member!.id, user.authUserId);
  }

  @Post('entries/:id/restore')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Khôi phục khoản quỹ đã xóa' })
  restore(@CurrentMember() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.restore(id, user.authUserId);
  }
}

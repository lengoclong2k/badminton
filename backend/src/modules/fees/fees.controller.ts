import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MemberRole } from 'src/common/enums';
import { CurrentMember, Roles } from 'src/common/decorators';
import { AuthenticatedUser } from 'src/modules/auth/auth.types';
import { FeesService } from './fees.service';
import { PayFeesDto, QueryFeesDto } from './dto/fees.dto';

@ApiTags('fees')
@ApiBearerAuth()
@Controller('fees')
export class FeesController {
  constructor(private readonly service: FeesService) {}

  @Get('periods')
  @ApiOperation({ summary: 'Danh sách các đợt thu quỹ đã từng mở' })
  periods() {
    return this.service.listPeriods();
  }

  @Get('overview')
  @ApiOperation({ summary: 'Tổng quan quỹ: đã đóng / chưa đóng / còn thiếu (cộng dồn mọi đợt)' })
  overview() {
    return this.service.feeOverview();
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách khoản quỹ (lọc theo tháng/trạng thái nếu cần)' })
  list(@Query() query: QueryFeesDto) {
    return this.service.listFees(query);
  }

  @Get('unpaid')
  @ApiOperation({ summary: 'Những khoản quỹ còn chưa đóng, cộng dồn mọi đợt' })
  unpaid() {
    return this.service.listUnpaid();
  }

  @Get('me')
  @ApiOperation({ summary: 'Các kỳ quỹ của chính tôi' })
  mine(@CurrentMember() user: AuthenticatedUser) {
    return this.service.listByMember(user.member!.id);
  }

  @Post('periods')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Mở một đợt thu quỹ mới — sinh khoản "chưa đóng" cho mọi thành viên đang hoạt động' })
  openPeriod(@CurrentMember() user: AuthenticatedUser) {
    return this.service.openPeriod(user.authUserId);
  }

  @Post('pay')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Xác nhận đã thu quỹ và ghi sổ' })
  pay(@CurrentMember() user: AuthenticatedUser, @Body() dto: PayFeesDto) {
    return this.service.pay(user.authUserId, dto.feeIds, dto.paidOn, dto.method);
  }

  @Post(':feeId/unpay')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Hoàn tác một lần thu quỹ' })
  unpay(@CurrentMember() user: AuthenticatedUser, @Param('feeId') feeId: string) {
    return this.service.unpay(user.authUserId, feeId);
  }
}

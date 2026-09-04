import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentMember } from 'src/common/decorators';
import { AuthenticatedUser } from 'src/modules/auth/auth.types';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('leaderboard')
@ApiBearerAuth()
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly service: LeaderboardService) {}

  @Get()
  @ApiQuery({ name: 'month', required: false, example: '2026-08-01' })
  @ApiOperation({ summary: 'Bảng xếp hạng theo giá thực mỗi buổi' })
  byMonth(@Query('month') month?: string) {
    return this.service.byMonth(month);
  }

  @Get('me')
  @ApiQuery({ name: 'month', required: false })
  @ApiOperation({ summary: 'Vị trí của tôi trong tháng' })
  me(@CurrentMember() user: AuthenticatedUser, @Query('month') month?: string) {
    return this.service.forMember(user.member!.id, month);
  }
}

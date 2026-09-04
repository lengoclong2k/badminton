import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemberRole } from 'src/common/enums';
import { Roles } from 'src/common/decorators';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Toàn bộ số liệu cho trang Tổng quan của admin' })
  overview() {
    return this.service.overviewForAdmin();
  }

  @Get('activities')
  @ApiOperation({ summary: 'Hoạt động gần đây' })
  activities() {
    return this.service.recentActivities();
  }
}

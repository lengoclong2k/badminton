import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  // Toàn bộ dữ liệu gộp ở đây đều lấy từ các endpoint GET vốn đã mở cho mọi
  // thành viên (fund/balance, fees/overview, sessions/today, sessions/upcoming,
  // dashboard/activities) — không có gì nhạy cảm hơn, nên không giới hạn
  // ADMIN-only ở đây để thành viên vẫn xem được trang Tổng quan (chỉ xem).
  @Get()
  @ApiOperation({ summary: 'Toàn bộ số liệu cho trang Tổng quan' })
  overview() {
    return this.service.overviewForAdmin();
  }

  @Get('activities')
  @ApiOperation({ summary: 'Hoạt động gần đây' })
  activities() {
    return this.service.recentActivities();
  }
}

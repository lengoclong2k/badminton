import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemberRole } from 'src/common/enums';
import { CurrentMember, Roles } from 'src/common/decorators';
import { AuthenticatedUser } from 'src/modules/auth/auth.types';
import { SchedulesService } from './schedules.service';
import { CreateFixedScheduleDto, UpdateFixedScheduleDto } from './dto/fixed-schedule.dto';
import { GenerateSessionsDto } from './dto/generate-sessions.dto';

@ApiTags('schedules')
@ApiBearerAuth()
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly service: SchedulesService) {}

  @Get()
  @ApiOperation({ summary: 'Lịch cố định hàng tuần' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Thêm khung lịch cố định' })
  create(@CurrentMember() user: AuthenticatedUser, @Body() dto: CreateFixedScheduleDto) {
    return this.service.create(dto, user.authUserId);
  }

  @Patch(':id')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Sửa khung lịch cố định' })
  update(
    @CurrentMember() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateFixedScheduleDto,
  ) {
    return this.service.update(id, dto, user.authUserId);
  }

  @Delete(':id')
  @Roles(MemberRole.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: 'Xóa khung lịch cố định' })
  remove(@CurrentMember() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(id, user.authUserId);
  }

  @Post('generate-sessions')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Sinh các buổi cố định trong khoảng ngày' })
  generate(@CurrentMember() user: AuthenticatedUser, @Body() dto: GenerateSessionsDto) {
    return this.service
      .generateSessions(user.authUserId, dto.from, dto.to)
      .then((created) => ({ created }));
  }
}

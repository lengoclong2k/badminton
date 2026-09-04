import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MemberRole } from 'src/common/enums';
import { CurrentMember, Roles } from 'src/common/decorators';
import { AuthenticatedUser } from 'src/modules/auth/auth.types';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Cấu hình CLB: tên, sân mặc định, mức quỹ, phí khách (chỉ chủ nhiệm)' })
  get() {
    return this.service.get();
  }

  @Patch()
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Cập nhật cấu hình CLB (chỉ chủ nhiệm)' })
  update(@CurrentMember() user: AuthenticatedUser, @Body() dto: UpdateSettingsDto) {
    return this.service.update(dto, user.authUserId);
  }
}

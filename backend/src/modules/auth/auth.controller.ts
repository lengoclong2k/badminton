import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentMember } from 'src/common/decorators';
import { SettingsService } from 'src/modules/settings/settings.service';
import { AuthenticatedUser } from './auth.types';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly settings: SettingsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Thông tin tài khoản đang đăng nhập + bản ghi thành viên' })
  @ApiOkResponse({ description: 'member = null nghĩa là tài khoản chưa được gắn vào CLB' })
  async me(@CurrentMember() user: AuthenticatedUser) {
    // Chỉ lấy 2 số phí khách mặc định (không phải toàn bộ Settings) để màn
    // thêm khách gợi ý sẵn số tiền — member không có quyền GET /settings.
    const config = await this.settings.get();
    return {
      authUserId: user.authUserId,
      email: user.email,
      member: user.member,
      isAdmin: user.member?.role === 'admin',
      defaultGuestFeeMale: config.guestFeeMale,
      defaultGuestFeeFemale: config.guestFeeFemale,
    };
  }
}

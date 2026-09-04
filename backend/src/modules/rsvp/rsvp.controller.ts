import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators';
import { DbFunctionsService } from 'src/database/db-functions.service';
import { RsvpGuestDto, RsvpRespondDto } from './dto/rsvp.dto';

/**
 * Trang đăng ký công khai — KHÔNG cần đăng nhập.
 *
 * Ba endpoint này chỉ ủy quyền cho các hàm rsvp_* trong Postgres. Các hàm đó là
 * security definer nên kiểm soát chính xác dữ liệu lộ ra ngoài: người có link
 * chỉ thấy tên thành viên và tình trạng đăng ký, không thấy quỹ hay số điện thoại.
 */
@ApiTags('rsvp (công khai)')
@Public()
@Controller('rsvp')
export class RsvpController {
  constructor(private readonly dbFunctions: DbFunctionsService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Thông tin buổi + danh sách tên để bấm đăng ký' })
  getSession(@Param('slug') slug: string) {
    return this.dbFunctions.rsvpGetSession(slug);
  }

  @Post(':slug/respond')
  @ApiOperation({ summary: 'Bấm vào tên để điểm danh Có đi/Không đi — chỉ chọn được 1 lần' })
  respond(@Param('slug') slug: string, @Body() dto: RsvpRespondDto) {
    return this.dbFunctions.rsvpSetMemberStatus(slug, dto.memberId, dto.going);
  }

  @Post(':slug/guests')
  @ApiOperation({ summary: 'Đăng ký một slot khách' })
  addGuest(@Param('slug') slug: string, @Body() dto: RsvpGuestDto) {
    return this.dbFunctions.rsvpAddGuest(slug, dto.guestName, dto.guestSex, dto.invitedBy);
  }
}

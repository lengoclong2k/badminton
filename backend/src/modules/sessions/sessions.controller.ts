import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MemberRole } from 'src/common/enums';
import { CurrentMember, Roles } from 'src/common/decorators';
import { AuthenticatedUser } from 'src/modules/auth/auth.types';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { QuerySessionsDto } from './dto/query-sessions.dto';
import { CloseSessionDto } from './dto/close-session.dto';
import {
  AddAttendeeDto, AddGuestDto, AddParticipantsDto, BulkAttendanceDto, BulkRsvpStatusDto, MarkAttendanceDto,
  SetRsvpStatusDto, UpdateGuestPaymentDto,
} from './dto/attendance.dto';

@ApiTags('sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
  constructor(private readonly service: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách buổi đánh kèm số liệu đăng ký' })
  findAll(@Query() query: QuerySessionsDto) {
    return this.service.findAll(query);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Các buổi sắp tới' })
  upcoming() {
    return this.service.upcoming();
  }

  @Get('today')
  @ApiOperation({ summary: 'Buổi của hôm nay (nếu có)' })
  today() {
    return this.service.today();
  }

  @Get('me')
  @ApiOperation({ summary: 'Lịch của tôi: đã đăng ký và đã đi' })
  mySchedule(
    @CurrentMember() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.mySchedule(user.member!.id, from, to);
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Chi tiết một buổi kèm thống kê' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.service.summary(idOrSlug);
  }

  @Get(':idOrSlug/attendees')
  @ApiOperation({ summary: 'Danh sách đăng ký + điểm danh của buổi' })
  attendees(@Param('idOrSlug') idOrSlug: string) {
    return this.service.listAttendees(idOrSlug);
  }

  @Get(':idOrSlug/rsvp-link')
  @Roles(MemberRole.ADMIN)
  @ApiQuery({ name: 'baseUrl', required: false, example: 'https://clb3t.vercel.app' })
  @ApiOperation({ summary: 'Lấy link đăng ký công khai để gửi cho thành viên' })
  rsvpLink(@Param('idOrSlug') idOrSlug: string, @Query('baseUrl') baseUrl?: string) {
    return this.service.rsvpLink(idOrSlug, baseUrl ?? 'http://localhost:3000');
  }

  @Post()
  @Roles(MemberRole.ADMIN, MemberRole.MEMBER)
  @ApiOperation({ summary: 'Tạo buổi đánh (admin và thành viên đều tạo được)' })
  create(@CurrentMember() user: AuthenticatedUser, @Body() dto: CreateSessionDto) {
    return this.service.create(dto, user.member!.id, user.authUserId);
  }

  @Patch(':idOrSlug')
  @Roles(MemberRole.ADMIN, MemberRole.MEMBER)
  @ApiOperation({ summary: 'Sửa thông tin buổi (admin và thành viên đều sửa được)' })
  update(
    @CurrentMember() user: AuthenticatedUser,
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.service.update(idOrSlug, dto, user.authUserId);
  }

  @Post(':idOrSlug/open')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Mở đăng ký cho buổi đang nháp' })
  open(@CurrentMember() user: AuthenticatedUser, @Param('idOrSlug') idOrSlug: string) {
    return this.service.openRsvp(idOrSlug, user.authUserId);
  }

  @Post(':idOrSlug/close')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Chốt buổi: ghi chi phí và tiền khách vào sổ quỹ' })
  close(
    @CurrentMember() user: AuthenticatedUser,
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: CloseSessionDto,
  ) {
    return this.service.close(user.authUserId, idOrSlug, dto);
  }

  @Post(':idOrSlug/reopen')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Mở lại buổi đã chốt và gỡ các dòng sổ quỹ của buổi đó' })
  reopen(@CurrentMember() user: AuthenticatedUser, @Param('idOrSlug') idOrSlug: string) {
    return this.service.reopen(user.authUserId, idOrSlug);
  }

  @Post(':idOrSlug/cancel')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Hủy buổi và hủy toàn bộ đăng ký' })
  cancel(
    @CurrentMember() user: AuthenticatedUser,
    @Param('idOrSlug') idOrSlug: string,
    @Body('reason') reason?: string,
  ) {
    return this.service.cancel(user.authUserId, idOrSlug, reason);
  }

  // ---- Đăng ký & điểm danh -------------------------------------------------

  @Post(':idOrSlug/rsvp')
  @ApiOperation({ summary: 'Tự đăng ký / bỏ đăng ký buổi này' })
  rsvpSelf(@CurrentMember() user: AuthenticatedUser, @Param('idOrSlug') idOrSlug: string) {
    return this.service.toggleMember(idOrSlug, user.member!.id);
  }

  @Post(':idOrSlug/attendees')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Thêm một thành viên vào buổi' })
  addAttendee(@Param('idOrSlug') idOrSlug: string, @Body() dto: AddAttendeeDto) {
    return this.service.toggleMember(idOrSlug, dto.memberId);
  }

  @Post(':idOrSlug/guests')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Thêm khách vào buổi (phí lấy theo giới tính)' })
  addGuest(@Param('idOrSlug') idOrSlug: string, @Body() dto: AddGuestDto) {
    return this.service.addGuest(idOrSlug, dto);
  }

  @Post(':idOrSlug/participants')
  @Roles(MemberRole.ADMIN, MemberRole.MEMBER)
  @ApiOperation({
    summary: 'Thêm nhiều thành viên/khách vào buổi đang mở cùng lúc (gần ngày mới biết thêm người đi)',
  })
  addParticipants(@Param('idOrSlug') idOrSlug: string, @Body() dto: AddParticipantsDto) {
    return this.service.addParticipants(idOrSlug, dto.memberIds, dto.guests);
  }

  @Patch(':idOrSlug/attendance')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Điểm danh hàng loạt' })
  bulkAttendance(@Param('idOrSlug') idOrSlug: string, @Body() dto: BulkAttendanceDto) {
    return this.service.markAttendanceBulk(idOrSlug, dto);
  }

  @Patch('attendees/:attendeeId/attendance')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Điểm danh một người' })
  markAttendance(@Param('attendeeId') attendeeId: string, @Body() dto: MarkAttendanceDto) {
    return this.service.markAttendance(attendeeId, dto.attendance);
  }

  @Patch(':idOrSlug/rsvp-status')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Đổi Có đi/Không đi hàng loạt (admin, bỏ qua khóa của link công khai)' })
  bulkRsvpStatus(@Param('idOrSlug') idOrSlug: string, @Body() dto: BulkRsvpStatusDto) {
    return this.service.setAttendeeRsvpStatusBulk(idOrSlug, dto);
  }

  @Patch('attendees/:attendeeId/rsvp')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Đổi Có đi/Không đi của một người (admin, bỏ qua khóa của link công khai)' })
  setRsvpStatus(@Param('attendeeId') attendeeId: string, @Body() dto: SetRsvpStatusDto) {
    return this.service.setAttendeeRsvpStatus(attendeeId, dto.rsvpStatus);
  }

  @Patch('attendees/:attendeeId/payment')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Đánh dấu khách đã nộp tiền' })
  setGuestPaid(@Param('attendeeId') attendeeId: string, @Body() dto: UpdateGuestPaymentDto) {
    return this.service.setGuestPaid(attendeeId, dto.guestPaid);
  }

  @Delete('attendees/:attendeeId')
  @Roles(MemberRole.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: 'Gỡ một người khỏi buổi' })
  removeAttendee(@Param('attendeeId') attendeeId: string) {
    return this.service.removeAttendee(attendeeId);
  }
}

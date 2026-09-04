import {
  Body, Controller, Delete, Get, Param, ParseBoolPipe, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MemberRole } from 'src/common/enums';
import { CurrentMember, Roles } from 'src/common/decorators';
import { AuthenticatedUser } from 'src/modules/auth/auth.types';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { QueryMembersDto } from './dto/query-members.dto';

@ApiTags('members')
@ApiBearerAuth()
@Controller('members')
export class MembersController {
  constructor(private readonly service: MembersService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thành viên (có lọc và phân trang)' })
  findAll(@Query() query: QueryMembersDto) {
    return this.service.findAll(query);
  }

  @Get('fee-status')
  @ApiOperation({ summary: 'Tình trạng quỹ tháng hiện tại của tất cả thành viên' })
  feeStatus() {
    return this.service.currentFeeStatus();
  }

  @Patch('me')
  @ApiOperation({ summary: 'Tự cập nhật hồ sơ của mình' })
  updateMe(@CurrentMember() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.service.updateOwnProfile(user.member!.id, dto, user.authUserId);
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Chi tiết một thành viên (nhận uuid hoặc slug)' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.service.findOne(idOrSlug);
  }

  @Get(':idOrSlug/fees')
  @ApiOperation({ summary: 'Lịch sử quỹ theo từng kỳ của một thành viên' })
  fees(@Param('idOrSlug') idOrSlug: string) {
    return this.service.feeHistory(idOrSlug);
  }

  @Post()
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Thêm thành viên (chỉ chủ nhiệm)' })
  create(@CurrentMember() user: AuthenticatedUser, @Body() dto: CreateMemberDto) {
    return this.service.create(dto, user.authUserId);
  }

  @Patch(':idOrSlug')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Sửa thông tin thành viên (chỉ chủ nhiệm)' })
  update(
    @CurrentMember() user: AuthenticatedUser,
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.service.update(idOrSlug, dto, user.authUserId);
  }

  @Delete(':idOrSlug')
  @Roles(MemberRole.ADMIN)
  @ApiQuery({ name: 'hard', required: false, description: 'true = xóa hẳn kèm toàn bộ lịch sử' })
  @ApiOperation({ summary: 'Cho thành viên ngừng hoạt động, hoặc xóa hẳn khi hard=true' })
  remove(
    @CurrentMember() user: AuthenticatedUser,
    @Param('idOrSlug') idOrSlug: string,
    @Query('hard', new ParseBoolPipe({ optional: true })) hard?: boolean,
  ) {
    return this.service.remove(idOrSlug, hard ?? false, user.authUserId);
  }
}

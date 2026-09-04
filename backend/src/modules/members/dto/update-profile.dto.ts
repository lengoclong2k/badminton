import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';

/** Thành viên tự sửa hồ sơ — không đụng tới giới tính, vai trò, trạng thái. */
export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional() @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUrl()
  avatarUrl?: string;
}

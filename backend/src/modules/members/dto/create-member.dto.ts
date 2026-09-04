import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { MemberRole, Sex } from 'src/common/enums';

export class CreateMemberDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString() @MinLength(2)
  fullName: string;

  @ApiProperty({ enum: Sex, description: 'Quyết định mức quỹ tháng' })
  @IsEnum(Sex)
  sex: Sex;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional() @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Dùng để tự gắn tài khoản khi thành viên đăng ký' })
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: MemberRole, default: MemberRole.MEMBER })
  @IsOptional() @IsEnum(MemberRole)
  role?: MemberRole;

  @ApiPropertyOptional({ example: '2026-01-15' })
  @IsOptional() @IsDateString()
  joinedAt?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  note?: string;
}

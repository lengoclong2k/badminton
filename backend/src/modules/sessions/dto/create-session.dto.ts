import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID,
  Matches, Min, MinLength, ValidateNested,
} from 'class-validator';
import { Sex, SessionType } from 'src/common/enums';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class CreateSessionGuestDto {
  @ApiProperty({ example: 'Anh Tuấn' })
  @IsString() @MinLength(2)
  guestName: string;

  @ApiProperty({ enum: Sex })
  @IsEnum(Sex)
  guestSex: Sex;

  @ApiPropertyOptional({ description: 'Số tiền khách cần đóng — bỏ trống sẽ lấy theo giới tính trong cấu hình CLB' })
  @IsOptional() @IsNumber() @Min(0)
  guestFee?: number;
}

export class CreateSessionDto {
  @ApiProperty({ example: '2026-09-03' })
  @IsDateString()
  playDate: string;

  @ApiProperty({ example: '19:00' })
  @Matches(TIME_RE, { message: 'startTime phải có dạng HH:mm' })
  startTime: string;

  @ApiProperty({ example: '21:00' })
  @Matches(TIME_RE, { message: 'endTime phải có dạng HH:mm' })
  endTime: string;

  @ApiPropertyOptional({ description: 'Bỏ trống sẽ lấy sân mặc định trong cấu hình CLB' })
  @IsOptional() @IsString()
  court?: string;

  @ApiPropertyOptional({ enum: SessionType, default: SessionType.EXTRA })
  @IsOptional() @IsEnum(SessionType)
  sessionType?: SessionType;

  @ApiPropertyOptional({ default: false, description: 'Mở slot khách khi thiếu người' })
  @IsOptional() @IsBoolean()
  guestSlotsEnabled?: boolean;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional() @IsInt() @Min(0)
  guestSlotsMax?: number;

  @ApiPropertyOptional({ description: 'Bỏ trống sẽ lấy theo cấu hình CLB' })
  @IsOptional() @IsNumber() @Min(0)
  guestFeeMale?: number;

  @ApiPropertyOptional({ description: 'Bỏ trống sẽ lấy theo cấu hình CLB' })
  @IsOptional() @IsNumber() @Min(0)
  guestFeeFemale?: number;

  @ApiPropertyOptional({ description: 'Mở đăng ký ngay sau khi tạo', default: true })
  @IsOptional() @IsBoolean()
  openForRsvp?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  note?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Danh sách id thành viên tham gia ngay khi tạo buổi (tự động đăng ký hộ)',
  })
  @IsOptional() @IsArray() @IsUUID('4', { each: true })
  memberIds?: string[];

  @ApiPropertyOptional({
    type: [CreateSessionGuestDto],
    description: 'Danh sách khách tham gia ngay khi tạo buổi (tự động mở slot khách nếu cần)',
  })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateSessionGuestDto)
  guests?: CreateSessionGuestDto[];
}

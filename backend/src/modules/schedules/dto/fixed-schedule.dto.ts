import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class CreateFixedScheduleDto {
  @ApiProperty({ example: 2, description: '0 = Chủ Nhật … 6 = Thứ Bảy' })
  @IsInt() @Min(0) @Max(6)
  weekday: number;

  @ApiProperty({ example: '19:00' })
  @Matches(TIME_RE, { message: 'startTime phải có dạng HH:mm' })
  startTime: string;

  @ApiProperty({ example: '21:00' })
  @Matches(TIME_RE, { message: 'endTime phải có dạng HH:mm' })
  endTime: string;

  @ApiPropertyOptional({ example: 'Sân Cầu Lông Thành Công' })
  @IsOptional() @IsString()
  court?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class UpdateFixedScheduleDto extends PartialType(CreateFixedScheduleDto) {}

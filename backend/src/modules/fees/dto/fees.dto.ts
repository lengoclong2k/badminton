import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { FeeStatus } from 'src/common/enums';

export class PayFeesDto {
  @ApiPropertyOptional({ type: [String], description: 'Danh sách member_fee_id cần đánh dấu đã thu' })
  @IsArray() @ArrayNotEmpty() @IsUUID('4', { each: true })
  feeIds: string[];

  @ApiPropertyOptional({ example: '2026-09-05' })
  @IsOptional() @IsDateString()
  paidOn?: string;

  @ApiPropertyOptional({ example: 'chuyển khoản' })
  @IsOptional() @IsString()
  method?: string;
}

export class QueryFeesDto {
  @ApiPropertyOptional({ example: '2026-08-01', description: 'Bỏ trống = tất cả mọi đợt' })
  @IsOptional() @IsDateString()
  month?: string;

  @ApiPropertyOptional({ enum: FeeStatus })
  @IsOptional() @IsEnum(FeeStatus)
  status?: FeeStatus;
}

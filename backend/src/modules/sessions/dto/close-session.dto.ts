import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { AttendanceStatus } from 'src/common/enums';

export class CloseSessionDto {
  @ApiPropertyOptional({ example: 420000, description: 'Tiền sân' })
  @IsOptional() @IsNumber() @Min(0)
  courtCost?: number;

  @ApiPropertyOptional({ example: 140000, description: 'Tiền cầu' })
  @IsOptional() @IsNumber() @Min(0)
  shuttleCost?: number;

  @ApiPropertyOptional({ example: 0, description: 'Chi phí khác của buổi' })
  @IsOptional() @IsNumber() @Min(0)
  otherCost?: number;

  @ApiPropertyOptional({
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
    description: 'Người đã đăng ký nhưng chưa điểm danh sẽ được đánh dấu thế nào',
  })
  @IsOptional() @IsEnum(AttendanceStatus)
  pendingAs?: AttendanceStatus;
}

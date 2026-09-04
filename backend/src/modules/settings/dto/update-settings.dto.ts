import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 'CLB Cầu Lông HDA' })
  @IsOptional() @IsString()
  clubName?: string;

  @ApiPropertyOptional({ example: 'Sân Cầu Lông Thành Công' })
  @IsOptional() @IsString()
  defaultCourt?: string;

  @ApiPropertyOptional({ example: 400000, description: 'Quỹ tháng · nam' })
  @IsOptional() @IsNumber() @Min(0)
  monthlyFeeMale?: number;

  @ApiPropertyOptional({ example: 280000, description: 'Quỹ tháng · nữ' })
  @IsOptional() @IsNumber() @Min(0)
  monthlyFeeFemale?: number;

  @ApiPropertyOptional({ example: 70000, description: 'Phí khách · nam' })
  @IsOptional() @IsNumber() @Min(0)
  guestFeeMale?: number;

  @ApiPropertyOptional({ example: 49000, description: 'Phí khách · nữ' })
  @IsOptional() @IsNumber() @Min(0)
  guestFeeFemale?: number;

  @ApiPropertyOptional({
    example: 420000,
    description: 'Tiền sân mặc định cho buổi cố định — điền sẵn khi sinh buổi, admin vẫn sửa được lúc chốt buổi',
  })
  @IsOptional() @IsNumber() @Min(0)
  defaultCourtCost?: number;

  @ApiPropertyOptional({ example: 0.7, description: 'Tỷ lệ gợi ý cho nữ' })
  @IsOptional() @IsNumber() @Min(0.01) @Max(1)
  femaleRatio?: number;

  @ApiPropertyOptional({ example: 5, description: 'Hạn đóng quỹ trong tháng' })
  @IsOptional() @IsInt() @Min(1) @Max(28)
  feeDueDay?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  onboardingDone?: boolean;
}

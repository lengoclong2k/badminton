import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';
import { FundEntryType } from 'src/common/enums';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class CreateExpenseDto {
  @ApiProperty({ example: 'Mua cầu dự trữ' })
  @IsString() @MinLength(2)
  description: string;

  @ApiProperty({ example: 320000, description: 'Số tiền dương, hệ thống tự ghi thành khoản chi' })
  @IsNumber() @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsOptional() @IsDateString()
  entryDate?: string;
}

export class CreateIncomeDto {
  @ApiProperty({ example: 'Tài trợ giải nội bộ' })
  @IsString() @MinLength(2)
  description: string;

  @ApiProperty({ example: 500000 })
  @IsNumber() @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsOptional() @IsDateString()
  entryDate?: string;
}

export class QueryLedgerDto extends PaginationDto {
  @ApiPropertyOptional({ enum: FundEntryType })
  @IsOptional() @IsEnum(FundEntryType)
  entryType?: FundEntryType;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional() @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsOptional() @IsDateString()
  to?: string;
}

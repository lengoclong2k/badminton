import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { SessionStatus, SessionType } from 'src/common/enums';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QuerySessionsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: SessionStatus })
  @IsOptional() @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional({ enum: SessionType })
  @IsOptional() @IsEnum(SessionType)
  sessionType?: SessionType;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional() @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsOptional() @IsDateString()
  to?: string;
}

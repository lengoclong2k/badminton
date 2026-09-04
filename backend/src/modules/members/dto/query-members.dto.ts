import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MemberStatus, Sex } from 'src/common/enums';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QueryMembersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: MemberStatus })
  @IsOptional() @IsEnum(MemberStatus)
  status?: MemberStatus;

  @ApiPropertyOptional({ enum: Sex })
  @IsOptional() @IsEnum(Sex)
  sex?: Sex;

  @ApiPropertyOptional({ description: 'Tìm theo tên hoặc số điện thoại' })
  @IsOptional() @IsString()
  search?: string;
}

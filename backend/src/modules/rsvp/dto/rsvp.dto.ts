import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { Sex } from 'src/common/enums';

export class RsvpRespondDto {
  @ApiProperty({ description: 'Id thành viên được bấm trên trang đăng ký' })
  @IsUUID()
  memberId: string;

  @ApiProperty({ description: 'true = Có đi, false = Không đi. Chỉ chọn được 1 lần, sau đó bị khóa.' })
  @IsBoolean()
  going: boolean;
}

export class RsvpGuestDto {
  @ApiProperty({ example: 'Khách: Anh Tuấn' })
  @IsString() @MinLength(2)
  guestName: string;

  @ApiProperty({ enum: Sex })
  @IsEnum(Sex)
  guestSex: Sex;

  @ApiPropertyOptional({ description: 'Thành viên dẫn khách' })
  @IsOptional() @IsUUID()
  invitedBy?: string;
}

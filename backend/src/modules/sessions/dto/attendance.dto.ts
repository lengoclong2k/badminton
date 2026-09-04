import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength, ValidateNested,
} from 'class-validator';
import { AttendanceStatus, RsvpStatus, Sex } from 'src/common/enums';

export class AddAttendeeDto {
  @ApiProperty({ description: 'Id thành viên cần thêm vào buổi' })
  @IsUUID()
  memberId: string;
}

export class AddGuestDto {
  @ApiProperty({ example: 'Khách: Anh Tuấn' })
  @IsString() @MinLength(2)
  guestName: string;

  @ApiProperty({ enum: Sex })
  @IsEnum(Sex)
  guestSex: Sex;

  @ApiPropertyOptional({ description: 'Số tiền khách cần đóng — bỏ trống sẽ lấy theo giới tính trong cấu hình CLB' })
  @IsOptional() @IsNumber() @Min(0)
  guestFee?: number;

  @ApiPropertyOptional({ description: 'Thành viên dẫn khách' })
  @IsOptional() @IsUUID()
  invitedBy?: string;
}

export class MarkAttendanceDto {
  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  attendance: AttendanceStatus;
}

export class BulkAttendanceItemDto {
  @ApiProperty() @IsUUID() attendeeId: string;
  @ApiProperty({ enum: AttendanceStatus }) @IsEnum(AttendanceStatus) attendance: AttendanceStatus;
}

export class BulkAttendanceDto {
  @ApiProperty({ type: [BulkAttendanceItemDto] })
  @IsArray()
  items: BulkAttendanceItemDto[];
}

/** Admin đổi điểm danh RSVP của 1 người — bỏ qua khóa "đã chọn 1 lần" của
 *  link công khai, dùng khi thành viên đổi ý và nhờ admin sửa hộ. Chỉ nhận
 *  registered/cancelled — không cho đặt lại về "pending" qua đây. */
export class SetRsvpStatusDto {
  @ApiProperty({ enum: [RsvpStatus.REGISTERED, RsvpStatus.CANCELLED] })
  @IsEnum(RsvpStatus)
  rsvpStatus: RsvpStatus.REGISTERED | RsvpStatus.CANCELLED;
}

export class BulkRsvpStatusItemDto {
  @ApiProperty() @IsUUID() attendeeId: string;
  @ApiProperty({ enum: [RsvpStatus.REGISTERED, RsvpStatus.CANCELLED] })
  @IsEnum(RsvpStatus)
  rsvpStatus: RsvpStatus.REGISTERED | RsvpStatus.CANCELLED;
}

export class BulkRsvpStatusDto {
  @ApiProperty({ type: [BulkRsvpStatusItemDto] })
  @IsArray()
  items: BulkRsvpStatusItemDto[];
}

export class UpdateGuestPaymentDto {
  @ApiProperty({ description: 'Khách đã nộp tiền hay chưa' })
  @IsBoolean()
  guestPaid: boolean;
}

export class ParticipantGuestDto {
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

export class AddParticipantsDto {
  @ApiPropertyOptional({ type: [String], description: 'Id các thành viên cần thêm vào buổi' })
  @IsOptional() @IsArray() @IsUUID('4', { each: true })
  memberIds?: string[];

  @ApiPropertyOptional({ type: [ParticipantGuestDto], description: 'Khách mới cần thêm vào buổi' })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ParticipantGuestDto)
  guests?: ParticipantGuestDto[];
}

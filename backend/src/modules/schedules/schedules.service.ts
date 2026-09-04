import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FixedSchedule } from 'src/database/entities';
import { DbFunctionsService } from 'src/database/db-functions.service';
import { CreateFixedScheduleDto, UpdateFixedScheduleDto } from './dto/fixed-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(FixedSchedule) private readonly repo: Repository<FixedSchedule>,
    private readonly dbFunctions: DbFunctionsService,
  ) {}

  findAll(): Promise<FixedSchedule[]> {
    return this.repo.find({ order: { weekday: 'ASC', startTime: 'ASC' } });
  }

  async findOne(id: string): Promise<FixedSchedule> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('Không tìm thấy khung lịch cố định');
    return found;
  }

  async create(dto: CreateFixedScheduleDto, authUserId?: string): Promise<FixedSchedule> {
    this.assertTimeOrder(dto.startTime, dto.endTime);
    const saved = await this.repo.save(this.repo.create(dto));

    if (authUserId) {
      await this.dbFunctions.logActivity(
        authUserId,
        'schedule.create',
        `Thêm khung lịch cố định (${saved.startTime}–${saved.endTime})`,
        'fixed_schedule',
        saved.id,
      );
    }

    return saved;
  }

  async update(id: string, dto: UpdateFixedScheduleDto, authUserId?: string): Promise<FixedSchedule> {
    const schedule = await this.findOne(id);
    const start = dto.startTime ?? schedule.startTime;
    const end = dto.endTime ?? schedule.endTime;
    this.assertTimeOrder(start, end);
    Object.assign(schedule, dto);
    const saved = await this.repo.save(schedule);

    if (authUserId) {
      await this.dbFunctions.logActivity(
        authUserId,
        'schedule.update',
        `Sửa khung lịch cố định (${saved.startTime}–${saved.endTime})`,
        'fixed_schedule',
        saved.id,
      );

      // Đổi giờ/sân/ngày/bật-tắt chỉ có ý nghĩa nếu áp dụng ngay cho các buổi
      // tương lai chưa ai đăng ký — không đợi tới lượt cron đêm sau. Best-effort:
      // lỗi ở bước này không được làm hỏng việc lưu cấu hình lịch.
      try {
        await this.dbFunctions.resyncFixedScheduleSessions(authUserId, saved.id);
      } catch {
        // đã log ở tầng gọi API nếu cần theo dõi — không chặn luồng sửa lịch
      }
    }

    return saved;
  }

  async remove(id: string, authUserId?: string): Promise<void> {
    const schedule = await this.findOne(id);

    if (authUserId) {
      try {
        await this.dbFunctions.clearStaleFixedDrafts(authUserId, schedule.id);
      } catch {
        // không chặn việc xóa khung lịch nếu bước dọn buổi thất bại
      }
    }

    await this.repo.delete({ id: schedule.id });

    if (authUserId) {
      await this.dbFunctions.logActivity(
        authUserId,
        'schedule.delete',
        `Xóa khung lịch cố định (${schedule.startTime}–${schedule.endTime})`,
        'fixed_schedule',
        schedule.id,
      );
    }
  }

  /**
   * Sinh các buổi cố định trong khoảng ngày. Buổi đã tồn tại được bỏ qua
   * (unique theo play_date + start_time) nên gọi lại nhiều lần vẫn an toàn.
   */
  generateSessions(authUserId: string, from: string, to: string): Promise<number> {
    if (new Date(from) > new Date(to)) {
      throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc');
    }
    return this.dbFunctions.generateFixedSessions(authUserId, from, to);
  }

  private assertTimeOrder(start: string, end: string): void {
    if (start >= end) throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu');
  }
}

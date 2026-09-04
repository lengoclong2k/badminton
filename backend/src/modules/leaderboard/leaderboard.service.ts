import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstDayOfMonth } from 'src/common/utils/date.util';
import { LeaderboardView } from 'src/database/views';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(LeaderboardView) private readonly repo: Repository<LeaderboardView>,
  ) {}

  /**
   * Xếp hạng theo "giá thực mỗi buổi" = quỹ tháng ÷ số buổi đã đi.
   * Thấp hơn nghĩa là đi đều hơn, tức là "lời" hơn.
   */
  byMonth(month?: string): Promise<LeaderboardView[]> {
    return this.repo.find({
      where: { periodMonth: firstDayOfMonth(month) },
      order: { rank: 'ASC', fullName: 'ASC' },
    });
  }

  async forMember(memberId: string, month?: string): Promise<LeaderboardView | null> {
    const found = await this.repo.findOne({
      where: { periodMonth: firstDayOfMonth(month), memberId },
    });
    return found ?? null;
  }
}

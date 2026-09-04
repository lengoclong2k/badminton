import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberStatus, Sex } from 'src/common/enums';
import { ActivityLog, Member } from 'src/database/entities';
import { FeeOverviewView, FundBalanceView } from 'src/database/views';
import { SessionsService } from 'src/modules/sessions/sessions.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Member) private readonly members: Repository<Member>,
    @InjectRepository(ActivityLog) private readonly activities: Repository<ActivityLog>,
    @InjectRepository(FundBalanceView) private readonly balance: Repository<FundBalanceView>,
    @InjectRepository(FeeOverviewView) private readonly overview: Repository<FeeOverviewView>,
    private readonly sessions: SessionsService,
  ) {}

  /** Gom đủ số liệu cho trang Tổng quan trong một lần gọi. */
  async overviewForAdmin() {
    const [balance, feeOverview, memberCounts, todaySession, upcoming, activities] =
      await Promise.all([
        this.balance.findOneOrFail({ where: {} }),
        this.overview.findOne({ where: {} }),
        this.memberCounts(),
        this.sessions.today(),
        this.sessions.upcoming(5),
        this.recentActivities(),
      ]);

    return { balance, feeOverview, memberCounts, todaySession, upcoming, activities };
  }

  async memberCounts(): Promise<{ total: number; male: number; female: number }> {
    const rows = await this.members
      .createQueryBuilder('m')
      .select('m.sex', 'sex')
      .addSelect('count(*)::int', 'count')
      .where('m.status = :status', { status: MemberStatus.ACTIVE })
      .groupBy('m.sex')
      .getRawMany<{ sex: Sex; count: number }>();

    const male = rows.find((r) => r.sex === Sex.NAM)?.count ?? 0;
    const female = rows.find((r) => r.sex === Sex.NU)?.count ?? 0;
    return { total: male + female, male, female };
  }

  recentActivities(limit = 10): Promise<ActivityLog[]> {
    return this.activities.find({ order: { occurredAt: 'DESC' }, take: limit });
  }
}

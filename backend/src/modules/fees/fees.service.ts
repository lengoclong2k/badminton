import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeeStatus } from 'src/common/enums';
import { firstDayOfMonth } from 'src/common/utils/date.util';
import { FeePeriod, MemberFee } from 'src/database/entities';
import { FeeOverviewView } from 'src/database/views';
import { DbFunctionsService } from 'src/database/db-functions.service';
import { QueryFeesDto } from './dto/fees.dto';

@Injectable()
export class FeesService {
  constructor(
    @InjectRepository(FeePeriod) private readonly periods: Repository<FeePeriod>,
    @InjectRepository(MemberFee) private readonly fees: Repository<MemberFee>,
    @InjectRepository(FeeOverviewView) private readonly overview: Repository<FeeOverviewView>,
    private readonly dbFunctions: DbFunctionsService,
  ) {}

  /** Mọi đợt thu quỹ đã từng mở, mới nhất trước. */
  listPeriods(): Promise<FeePeriod[]> {
    return this.periods.find({ order: { openedAt: 'DESC' } });
  }

  /** Các đợt đang mở kèm thống kê — cho màn "Quản lý đợt quỹ".
   *  canDelete = chưa ai đóng trong đợt (paidCount = 0). */
  async listOpenPeriodsWithStats(): Promise<
    {
      id: string;
      openedAt: Date;
      feeMale: number;
      feeFemale: number;
      dueDate: string | null;
      memberCount: number;
      paidCount: number;
      totalAmount: number;
      paidAmount: number;
      canDelete: boolean;
    }[]
  > {
    const rows: {
      id: string;
      opened_at: Date;
      fee_male: string;
      fee_female: string;
      due_date: string | null;
      member_count: string;
      paid_count: string;
      total_amount: string;
      paid_amount: string;
    }[] = await this.periods.query(
      `select p.id, p.opened_at, p.fee_male, p.fee_female, p.due_date::text as due_date,
              count(f.id)                                              as member_count,
              count(f.id) filter (where f.status = 'paid')             as paid_count,
              coalesce(sum(f.amount), 0)                               as total_amount,
              coalesce(sum(f.amount) filter (where f.status = 'paid'), 0) as paid_amount
         from public.fee_periods p
         left join public.member_fees f on f.period_id = p.id
        where p.status = 'open'
        group by p.id
        order by p.opened_at desc`,
    );
    return rows.map((r) => {
      const paidCount = Number(r.paid_count);
      return {
        id: r.id,
        openedAt: r.opened_at,
        feeMale: Number(r.fee_male),
        feeFemale: Number(r.fee_female),
        dueDate: r.due_date,
        memberCount: Number(r.member_count),
        paidCount,
        totalAmount: Number(r.total_amount),
        paidAmount: Number(r.paid_amount),
        canDelete: paidCount === 0,
      };
    });
  }

  /** Xóa đợt thu quỹ chưa ai đóng. */
  deletePeriod(authUserId: string, periodId: string): Promise<void> {
    return this.dbFunctions.deleteFeePeriod(authUserId, periodId);
  }

  /** Tổng quan quỹ: đã đóng / chưa đóng / còn thiếu — cộng dồn mọi đợt, không khoanh theo tháng. */
  async feeOverview(): Promise<FeeOverviewView | null> {
    return this.overview.findOne({ where: {} });
  }

  /** Danh sách khoản quỹ, lọc theo tháng (nếu truyền) và/hoặc trạng thái. */
  async listFees(query: QueryFeesDto): Promise<MemberFee[]> {
    const qb = this.fees
      .createQueryBuilder('f')
      .innerJoinAndSelect('f.member', 'm')
      .innerJoin('f.period', 'p')
      .orderBy('m.fullName', 'ASC');

    if (query.month) qb.andWhere('p.periodMonth = :month', { month: firstDayOfMonth(query.month) });
    if (query.status) qb.andWhere('f.status = :status', { status: query.status });
    return qb.getMany();
  }

  /** Những khoản chưa đóng — dùng cho modal "Thu quỹ". Cộng dồn mọi đợt, không khoanh theo tháng. */
  async listUnpaid(): Promise<{ memberFeeId: string; fullName: string; sex: string; amount: number }[]> {
    const rows = await this.listFees({ status: FeeStatus.UNPAID });
    return rows.map((r) => ({
      memberFeeId: r.id,
      fullName: r.member.fullName,
      sex: r.member.sex,
      amount: r.amount,
    }));
  }

  /** Lịch sử quỹ của một thành viên qua các đợt, mới nhất trước. */
  listByMember(memberId: string): Promise<MemberFee[]> {
    return this.fees.find({
      where: { memberId },
      relations: { period: true },
      order: { period: { openedAt: 'DESC' } },
    });
  }

  /** Mở một đợt thu quỹ mới và sinh khoản quỹ "chưa đóng" cho mọi thành viên đang hoạt động. */
  async openPeriod(authUserId: string): Promise<FeePeriod> {
    const periodId = await this.dbFunctions.openFeePeriod(authUserId);
    return this.periods.findOneOrFail({ where: { id: periodId } });
  }

  /** Đánh dấu đã thu và ghi sổ quỹ — một transaction trong DB. */
  async pay(
    authUserId: string,
    feeIds: string[],
    paidOn?: string,
    method?: string,
  ): Promise<{ total: number; count: number }> {
    const total = await this.dbFunctions.payMemberFees(authUserId, feeIds, paidOn, method);
    return { total, count: feeIds.length };
  }

  /** Hoàn tác thu quỹ: gỡ dòng sổ quỹ tương ứng và trả về chưa đóng. */
  async unpay(authUserId: string, feeId: string): Promise<MemberFee> {
    await this.dbFunctions.unpayMemberFee(authUserId, feeId);
    return this.fees.findOneOrFail({ where: { id: feeId } });
  }
}

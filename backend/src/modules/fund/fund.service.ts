import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { FundEntryType } from 'src/common/enums';
import { PaginatedResult } from 'src/common/dto/pagination.dto';
import { toDateString } from 'src/common/utils/date.util';
import { FundEntry } from 'src/database/entities';
import { FundBalanceView } from 'src/database/views';
import { DbFunctionsService } from 'src/database/db-functions.service';
import { CreateExpenseDto, CreateIncomeDto, QueryLedgerDto } from './dto/fund.dto';

@Injectable()
export class FundService {
  constructor(
    @InjectRepository(FundEntry) private readonly entries: Repository<FundEntry>,
    @InjectRepository(FundBalanceView) private readonly balance: Repository<FundBalanceView>,
    private readonly dbFunctions: DbFunctionsService,
  ) {}

  /** Số dư = tổng các dòng chưa bị xóa mềm (tính trong view). */
  getBalance(): Promise<FundBalanceView> {
    return this.balance.findOneOrFail({ where: {} });
  }

  async listLedger(query: QueryLedgerDto): Promise<PaginatedResult<FundEntry>> {
    const qb = this.entries
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.member', 'm')
      .leftJoinAndSelect('f.session', 's')
      .where('f.deletedAt is null')
      .orderBy('f.entryDate', 'DESC')
      .addOrderBy('f.createdAt', 'DESC');

    if (query.entryType) qb.andWhere('f.entryType = :type', { type: query.entryType });
    if (query.from) qb.andWhere('f.entryDate >= :from', { from: query.from });
    if (query.to) qb.andWhere('f.entryDate <= :to', { to: query.to });

    const [items, total] = await qb.skip(query.skip).take(query.limit).getManyAndCount();
    return new PaginatedResult(items, total, query);
  }

  /** Khoản chi ngoài buổi đánh, ví dụ mua cầu dự trữ. */
  async addExpense(dto: CreateExpenseDto, createdById: string, authUserId?: string): Promise<FundEntry> {
    const entry = await this.entries.save(
      this.entries.create({
        entryDate: dto.entryDate ?? toDateString(),
        entryType: FundEntryType.OTHER_EXPENSE,
        amount: -Math.abs(dto.amount),
        description: dto.description,
        createdById,
      }),
    );

    if (authUserId) {
      await this.dbFunctions.logActivity(
        authUserId,
        'fund.expense.add',
        `Thêm khoản chi: ${dto.description} (${Math.abs(dto.amount).toLocaleString('vi-VN')}đ)`,
        'fund_entry',
        entry.id,
      );
    }

    return entry;
  }

  async addIncome(dto: CreateIncomeDto, createdById: string, authUserId?: string): Promise<FundEntry> {
    const entry = await this.entries.save(
      this.entries.create({
        entryDate: dto.entryDate ?? toDateString(),
        entryType: FundEntryType.OTHER_INCOME,
        amount: Math.abs(dto.amount),
        description: dto.description,
        createdById,
      }),
    );

    if (authUserId) {
      await this.dbFunctions.logActivity(
        authUserId,
        'fund.income.add',
        `Thêm khoản thu: ${dto.description} (${Math.abs(dto.amount).toLocaleString('vi-VN')}đ)`,
        'fund_entry',
        entry.id,
      );
    }

    return entry;
  }

  /**
   * Xóa mềm để số dư tự tính lại mà vẫn giữ được dấu vết.
   * Không dùng xóa cứng: sổ quỹ là chứng từ, mất dòng là mất đối chiếu.
   */
  async softDelete(id: string, deletedById: string, authUserId?: string): Promise<FundEntry> {
    const entry = await this.entries.findOne({ where: { id, deletedAt: IsNull() } });
    if (!entry) throw new NotFoundException('Không tìm thấy khoản quỹ');
    entry.deletedAt = new Date();
    entry.deletedById = deletedById;
    const saved = await this.entries.save(entry);

    if (authUserId) {
      await this.dbFunctions.logActivity(
        authUserId,
        'fund.entry.delete',
        `Xóa khoản quỹ: ${saved.description ?? ''}`.trim(),
        'fund_entry',
        saved.id,
      );
    }

    return saved;
  }

  async restore(id: string, authUserId?: string): Promise<FundEntry> {
    const entry = await this.entries.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('Không tìm thấy khoản quỹ');
    entry.deletedAt = null;
    entry.deletedById = null;
    const saved = await this.entries.save(entry);

    if (authUserId) {
      await this.dbFunctions.logActivity(
        authUserId,
        'fund.entry.restore',
        `Khôi phục khoản quỹ: ${saved.description ?? ''}`.trim(),
        'fund_entry',
        saved.id,
      );
    }

    return saved;
  }
}

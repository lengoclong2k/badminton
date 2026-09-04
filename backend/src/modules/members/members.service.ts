import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUuid } from 'src/common/utils/uuid.util';
import { MemberStatus } from 'src/common/enums';
import { PaginatedResult } from 'src/common/dto/pagination.dto';
import { Member, MemberFee } from 'src/database/entities';
import { MemberCurrentFeeView } from 'src/database/views';
import { DbFunctionsService } from 'src/database/db-functions.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { QueryMembersDto } from './dto/query-members.dto';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Member) private readonly members: Repository<Member>,
    @InjectRepository(MemberFee) private readonly fees: Repository<MemberFee>,
    @InjectRepository(MemberCurrentFeeView)
    private readonly currentFees: Repository<MemberCurrentFeeView>,
    private readonly dbFunctions: DbFunctionsService,
  ) {}

  async findAll(query: QueryMembersDto): Promise<PaginatedResult<Member>> {
    const qb = this.members.createQueryBuilder('m').orderBy('m.fullName', 'ASC');

    if (query.status) qb.andWhere('m.status = :status', { status: query.status });
    if (query.sex) qb.andWhere('m.sex = :sex', { sex: query.sex });
    if (query.search) {
      qb.andWhere('(m.fullName ilike :q or m.phone ilike :q)', { q: `%${query.search}%` });
    }

    const [items, total] = await qb.skip(query.skip).take(query.limit).getManyAndCount();
    return new PaginatedResult(items, total, query);
  }

  /** Nhận cả uuid lẫn slug để khớp URL /admin/members/[id] của frontend. */
  async findOne(idOrSlug: string): Promise<Member> {
    const where = isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug };
    const member = await this.members.findOne({ where });
    if (!member) throw new NotFoundException('Không tìm thấy thành viên');
    return member;
  }

  /** Tổng nợ quỹ cộng dồn của mỗi thành viên — dùng cho danh sách thành viên. */
  currentFeeStatus(): Promise<MemberCurrentFeeView[]> {
    return this.currentFees.find();
  }

  /** Lịch sử quỹ theo từng đợt của một thành viên, mới nhất trước. */
  async feeHistory(idOrSlug: string): Promise<MemberFee[]> {
    const member = await this.findOne(idOrSlug);
    return this.fees.find({
      where: { memberId: member.id },
      relations: { period: true },
      order: { period: { openedAt: 'DESC' } },
    });
  }

  async create(dto: CreateMemberDto, authUserId?: string): Promise<Member> {
    const member = this.members.create({
      ...dto,
      joinedAt: dto.joinedAt ?? new Date().toISOString().slice(0, 10),
      slug: '', // trigger trong DB sẽ sinh slug từ full_name
    });
    const saved = await this.members.save(member);
    // Đọc lại để lấy slug do trigger sinh ra
    const result = await this.members.findOneOrFail({ where: { id: saved.id } });

    if (authUserId) {
      await this.dbFunctions.logActivity(
        authUserId,
        'member.create',
        `Thêm thành viên ${result.fullName}`,
        'member',
        result.id,
      );
    }

    return result;
  }

  async update(idOrSlug: string, dto: UpdateMemberDto, authUserId?: string): Promise<Member> {
    const member = await this.findOne(idOrSlug);
    Object.assign(member, dto);
    const saved = await this.members.save(member);

    if (authUserId) {
      await this.dbFunctions.logActivity(
        authUserId,
        'member.update',
        `Sửa thông tin thành viên ${saved.fullName}`,
        'member',
        saved.id,
      );
    }

    return saved;
  }

  /** Thành viên tự sửa hồ sơ của chính mình. */
  async updateOwnProfile(memberId: string, dto: UpdateProfileDto, authUserId?: string): Promise<Member> {
    const member = await this.members.findOneOrFail({ where: { id: memberId } });
    Object.assign(member, dto);
    const saved = await this.members.save(member);

    if (authUserId) {
      await this.dbFunctions.logActivity(
        authUserId,
        'member.update_profile',
        `${saved.fullName} tự cập nhật hồ sơ`,
        'member',
        saved.id,
      );
    }

    return saved;
  }

  /**
   * Mặc định chỉ ngừng hoạt động (giữ lịch sử buổi và quỹ).
   * hard = true mới xóa hẳn, kéo theo toàn bộ lịch sử của người đó.
   */
  async remove(idOrSlug: string, hard = false, authUserId?: string): Promise<{ deleted: boolean }> {
    const member = await this.findOne(idOrSlug);

    if (hard) {
      await this.members.delete({ id: member.id });
      if (authUserId) {
        await this.dbFunctions.logActivity(
          authUserId,
          'member.delete',
          `Xóa hẳn thành viên ${member.fullName}`,
          'member',
          member.id,
        );
      }
      return { deleted: true };
    }

    if (member.status === MemberStatus.INACTIVE) {
      throw new BadRequestException('Thành viên này đã ngừng hoạt động');
    }
    member.status = MemberStatus.INACTIVE;
    member.leftAt = new Date().toISOString().slice(0, 10);
    await this.members.save(member);

    if (authUserId) {
      await this.dbFunctions.logActivity(
        authUserId,
        'member.deactivate',
        `Cho thành viên ${member.fullName} ngừng hoạt động`,
        'member',
        member.id,
      );
    }

    return { deleted: false };
  }
}

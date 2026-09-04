import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AttendanceStatus, Sex } from 'src/common/enums';

export interface CloseSessionResult {
  session_id: string;
  total_cost: number;
  guest_income: number;
  fund_delta: number;
  balance_after: number;
}

/**
 * Cầu nối tới các hàm nghiệp vụ viết bằng SQL trong supabase/migrations.
 *
 * Vì sao không viết lại logic này bằng TypeORM: các thao tác đụng tới tiền
 * (chốt buổi, thu quỹ) phải nguyên tử và phải cho ra cùng kết quả dù được gọi
 * từ backend hay gọi thẳng từ frontend qua supabase-js. Giữ một bản duy nhất
 * trong DB là cách chắc chắn nhất để không lệch.
 *
 * runAsUser() set claim JWT vào transaction để RLS và require_admin() bên trong
 * hàm hoạt động đúng như khi frontend gọi trực tiếp.
 */
@Injectable()
export class DbFunctionsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Chạy callback trong một transaction mang danh tính của người dùng.
   * Backend kết nối bằng vai trò sở hữu DB (bỏ qua RLS), nên khi cần các hàm
   * SQL kiểm tra quyền thì phải khai báo lại danh tính ở đây.
   */
  async runAsUser<T>(authUserId: string | null, fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query("select set_config('request.jwt.claim.sub', $1, true)", [authUserId ?? '']);
      await manager.query(
        "select set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, true)",
        [authUserId ?? ''],
      );
      return fn(manager);
    });
  }

  private async callAs<T>(authUserId: string | null, sql: string, params: unknown[]): Promise<T> {
    return this.runAsUser(authUserId, async (manager) => {
      const rows = await manager.query(sql, params);
      return rows[0]?.result as T;
    });
  }

  // ---- Hàm cần quyền admin -------------------------------------------------

  closeSession(
    authUserId: string,
    sessionId: string,
    costs: { courtCost?: number; shuttleCost?: number; otherCost?: number },
    pendingAs: AttendanceStatus = AttendanceStatus.PRESENT,
  ): Promise<CloseSessionResult> {
    return this.callAs<CloseSessionResult>(
      authUserId,
      'select public.close_session($1, $2, $3, $4, $5) as result',
      [
        sessionId,
        costs.courtCost ?? null,
        costs.shuttleCost ?? null,
        costs.otherCost ?? null,
        pendingAs,
      ],
    );
  }

  async reopenSession(authUserId: string, sessionId: string): Promise<void> {
    await this.runAsUser(authUserId, (m) => m.query('select public.reopen_session($1)', [sessionId]));
  }

  async cancelSession(authUserId: string, sessionId: string, reason?: string): Promise<void> {
    await this.runAsUser(authUserId, (m) =>
      m.query('select public.cancel_session($1, $2)', [sessionId, reason ?? null]),
    );
  }

  async openFeePeriod(authUserId: string): Promise<string> {
    return this.runAsUser(authUserId, async (m) => {
      const rows = await m.query('select public.open_fee_period() as result');
      return rows[0].result as string;
    });
  }

  async payMemberFees(
    authUserId: string,
    feeIds: string[],
    paidOn?: string,
    method?: string,
  ): Promise<number> {
    return this.runAsUser(authUserId, async (m) => {
      const rows = await m.query('select public.pay_member_fees($1::uuid[], $2::date, $3) as result', [
        feeIds,
        paidOn ?? null,
        method ?? null,
      ]);
      return Number(rows[0].result ?? 0);
    });
  }

  async unpayMemberFee(authUserId: string, feeId: string): Promise<void> {
    await this.runAsUser(authUserId, (m) => m.query('select public.unpay_member_fee($1)', [feeId]));
  }

  async generateFixedSessions(authUserId: string, from: string, to: string): Promise<number> {
    return this.runAsUser(authUserId, async (m) => {
      const rows = await m.query(
        'select public.generate_fixed_sessions($1::date, $2::date) as result',
        [from, to],
      );
      return Number(rows[0].result ?? 0);
    });
  }

  /**
   * Dọn buổi cố định còn "draft", ở tương lai, chưa ai đăng ký — dùng khi
   * xóa 1 khung lịch cố định để buổi sinh sai theo cấu hình cũ không còn
   * nằm lay lắt trên lịch.
   */
  async clearStaleFixedDrafts(authUserId: string, fixedScheduleId: string): Promise<number> {
    return this.runAsUser(authUserId, async (m) => {
      const rows = await m.query('select public.clear_stale_fixed_drafts($1) as result', [fixedScheduleId]);
      return Number(rows[0].result ?? 0);
    });
  }

  /**
   * Gọi sau khi SỬA 1 khung lịch cố định: dọn buổi draft sai cấu hình cũ rồi
   * sinh lại ngay theo cấu hình mới — để đổi giờ/sân có hiệu lực ngay, không
   * phải đợi lượt cron (pg_cron, chạy mỗi đêm) tiếp theo.
   */
  async resyncFixedScheduleSessions(authUserId: string, fixedScheduleId: string): Promise<number> {
    return this.runAsUser(authUserId, async (m) => {
      const rows = await m.query('select public.resync_fixed_schedule_sessions($1) as result', [
        fixedScheduleId,
      ]);
      return Number(rows[0].result ?? 0);
    });
  }

  /**
   * Ghi log hoạt động cho các thao tác CRUD thuần NestJS (không đi qua hàm SQL
   * nghiệp vụ ở trên). Vẫn cần runAsUser() để current_member_id() bên trong
   * log_activity() phân giải đúng actor_id từ auth.uid().
   */
  async logActivity(
    authUserId: string,
    action: string,
    description: string,
    entityType?: string | null,
    entityId?: string | null,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    await this.runAsUser(authUserId, (m) =>
      m.query('select public.log_activity($1, $2, $3, $4, $5::jsonb)', [
        action,
        description,
        entityType ?? null,
        entityId ?? null,
        JSON.stringify(meta ?? {}),
      ]),
    );
  }

  // ---- Hàm công khai cho trang RSVP ---------------------------------------

  async rsvpGetSession(slug: string): Promise<Record<string, unknown>> {
    const rows = await this.dataSource.query('select public.rsvp_get_session($1) as result', [slug]);
    return rows[0].result;
  }

  async rsvpSetMemberStatus(slug: string, memberId: string, going: boolean): Promise<Record<string, unknown>> {
    const rows = await this.dataSource.query(
      'select public.rsvp_set_member_status($1, $2, $3) as result',
      [slug, memberId, going],
    );
    return rows[0].result;
  }

  async rsvpAddGuest(
    slug: string,
    guestName: string,
    guestSex: Sex,
    invitedBy?: string,
  ): Promise<Record<string, unknown>> {
    const rows = await this.dataSource.query(
      'select public.rsvp_add_guest($1, $2, $3::public.sex, $4) as result',
      [slug, guestName, guestSex, invitedBy ?? null],
    );
    return rows[0].result;
  }
}

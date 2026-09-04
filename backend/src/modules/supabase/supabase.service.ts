import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import * as WebSocket from 'ws';
import { SupabaseConfig } from 'src/config/configuration';

/**
 * Bọc supabase-js cho phía server.
 *
 * - adminClient dùng service_role key: bỏ qua RLS, gọi được Auth Admin API
 *   (mời thành viên, đổi email, xóa tài khoản) và Storage. Tuyệt đối không
 *   để key này lọt ra frontend.
 * - anonClient dùng anon key, hữu ích khi cần thao tác đúng như một client.
 */
@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private _admin: SupabaseClient;
  private _anon: SupabaseClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const cfg = this.config.getOrThrow<SupabaseConfig>('supabase');
    const options = {
      auth: { persistSession: false, autoRefreshToken: false },
      // Node < 22 chưa có WebSocket built-in, mà supabase-js luôn khởi tạo
      // Realtime client dù backend không dùng tính năng realtime. Không cấp
      // transport thì createClient() ném lỗi ngay lúc boot.
      realtime: { transport: WebSocket as unknown as never },
    };
    this._admin = createClient(cfg.url, cfg.serviceRoleKey, options);
    this._anon = createClient(cfg.url, cfg.anonKey, options);
    this.logger.log(`Đã kết nối Supabase: ${cfg.url}`);
  }

  get admin(): SupabaseClient {
    return this._admin;
  }

  get anon(): SupabaseClient {
    return this._anon;
  }

  /** Tạo tài khoản và gửi email mời cho thành viên mới. */
  async inviteUserByEmail(email: string, redirectTo?: string): Promise<User> {
    const { data, error } = await this.admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    });
    if (error) throw error;
    return data.user;
  }

  async deleteUser(userId: string): Promise<void> {
    const { error } = await this.admin.auth.admin.deleteUser(userId);
    if (error) throw error;
  }

  /** Kiểm tra access token bằng Auth API (dùng khi không verify offline). */
  async getUserFromToken(accessToken: string): Promise<User | null> {
    const { data, error } = await this.admin.auth.getUser(accessToken);
    if (error) return null;
    return data.user;
  }
}

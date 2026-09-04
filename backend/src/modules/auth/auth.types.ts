import { Member } from 'src/database/entities';

/** Payload JWT do Supabase Auth phát hành (phần dùng tới). */
export interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  role?: string;
  aud?: string;
  exp?: number;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

/** Gắn vào request sau khi qua SupabaseAuthGuard. */
export interface AuthenticatedUser {
  /** auth.users.id của Supabase */
  authUserId: string;
  email?: string;
  /** Bản ghi members tương ứng — null nếu tài khoản chưa được gắn vào CLB */
  member: Member | null;
}

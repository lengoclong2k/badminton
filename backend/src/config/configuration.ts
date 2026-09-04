export interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigins: string[];
}

export interface DatabaseConfig {
  url: string;
  ssl: boolean;
  logging: boolean;
  /**
   * Số kết nối tối đa của pool phía app.
   * Serverless (Vercel) phải để 1: mỗi instance là một tiến trình riêng, nhân
   * lên nhanh và sẽ làm cạn connection của Supabase nếu mỗi instance giữ 10.
   */
  poolMax: number;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  /** Chỉ dùng cho project còn ký HS256 bằng Legacy JWT Secret. */
  jwtSecret?: string;
}

export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3333', 10),
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  } satisfies AppConfig,
  database: {
    url: process.env.DATABASE_URL as string,
    ssl: process.env.DATABASE_SSL === 'true',
    logging: process.env.DATABASE_LOGGING === 'true',
    poolMax: parseInt(process.env.DATABASE_POOL_MAX ?? '10', 10),
  } satisfies DatabaseConfig,
  supabase: {
    url: process.env.SUPABASE_URL as string,
    anonKey: process.env.SUPABASE_ANON_KEY as string,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    jwtSecret: process.env.SUPABASE_JWT_SECRET || undefined,
  } satisfies SupabaseConfig,
});

import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import * as entities from './entities';
import * as views from './views';

loadEnv({ path: '.env.local' });
loadEnv();

/**
 * DataSource dùng cho TypeORM CLI (kiểm tra lệch schema, chạy query thủ công).
 *
 * Lưu ý: schema do các file SQL trong supabase/migrations quản lý, KHÔNG phải
 * TypeORM — vì chúng còn chứa RLS, view, function và trigger mà TypeORM không
 * sinh được. Vì vậy synchronize luôn = false.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [...Object.values(entities), ...Object.values(views)],
  synchronize: false,
  migrationsRun: false,
});

export default AppDataSource;

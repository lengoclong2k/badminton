import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as entities from './entities';
import * as views from './views';
import { DatabaseConfig } from 'src/config/configuration';
import { DbFunctionsService } from './db-functions.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = config.getOrThrow<DatabaseConfig>('database');
        return {
          type: 'postgres' as const,
          url: db.url,
          ssl: db.ssl ? { rejectUnauthorized: false } : false,
          entities: [...Object.values(entities), ...Object.values(views)],
          // Schema do supabase/migrations quản lý — xem chú thích trong data-source.ts
          synchronize: false,
          logging: db.logging,
          namingStrategy: undefined,
          // Chạy qua Supabase Transaction Pooler (port 6543): pool nhỏ, nhả
          // kết nối nhanh, và bật keepAlive để không bị rớt giữa hai request.
          extra: {
            max: db.poolMax,
            keepAlive: true,
            connectionTimeoutMillis: 10_000,
            idleTimeoutMillis: 10_000,
          },
        };
      },
    }),
  ],
  providers: [DbFunctionsService],
  exports: [DbFunctionsService],
})
export class DatabaseModule {}

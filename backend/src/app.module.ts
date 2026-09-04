import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AuthModule } from './modules/auth/auth.module';
import { SupabaseAuthGuard } from './modules/auth/guards/supabase-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { SupabaseModule } from './modules/supabase/supabase.module';
import { SettingsModule } from './modules/settings/settings.module';
import { MembersModule } from './modules/members/members.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { FeesModule } from './modules/fees/fees.module';
import { FundModule } from './modules/fund/fund.module';
import { RsvpModule } from './modules/rsvp/rsvp.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    SupabaseModule,
    AuthModule,
    HealthModule,
    SettingsModule,
    MembersModule,
    SchedulesModule,
    SessionsModule,
    FeesModule,
    FundModule,
    RsvpModule,
    LeaderboardModule,
    DashboardModule,
  ],
  providers: [
    // Mặc định MỌI route đều phải đăng nhập; mở ra bằng @Public().
    { provide: APP_GUARD, useClass: SupabaseAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}

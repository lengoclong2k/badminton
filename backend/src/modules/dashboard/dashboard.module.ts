import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog, Member } from 'src/database/entities';
import { FundBalanceView, FeeOverviewView } from 'src/database/views';
import { SessionsModule } from 'src/modules/sessions/sessions.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Member, ActivityLog, FundBalanceView, FeeOverviewView]),
    SessionsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeePeriod, MemberFee } from 'src/database/entities';
import { FeeOverviewView } from 'src/database/views';
import { FeesController } from './fees.controller';
import { FeesService } from './fees.service';

@Module({
  imports: [TypeOrmModule.forFeature([FeePeriod, MemberFee, FeeOverviewView])],
  controllers: [FeesController],
  providers: [FeesService],
  exports: [FeesService],
})
export class FeesModule {}

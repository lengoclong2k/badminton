import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FundEntry } from 'src/database/entities';
import { FundBalanceView } from 'src/database/views';
import { FundController } from './fund.controller';
import { FundService } from './fund.service';

@Module({
  imports: [TypeOrmModule.forFeature([FundEntry, FundBalanceView])],
  controllers: [FundController],
  providers: [FundService],
  exports: [FundService],
})
export class FundModule {}

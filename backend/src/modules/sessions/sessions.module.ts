import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaySession, SessionAttendee } from 'src/database/entities';
import { SessionSummaryView } from 'src/database/views';
import { SettingsModule } from 'src/modules/settings/settings.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlaySession, SessionAttendee, SessionSummaryView]),
    SettingsModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}

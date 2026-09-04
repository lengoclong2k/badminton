import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClubSettings } from 'src/database/entities';
import { DbFunctionsService } from 'src/database/db-functions.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

export const CLUB_SETTINGS_ID = 1;

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(ClubSettings) private readonly repo: Repository<ClubSettings>,
    private readonly dbFunctions: DbFunctionsService,
  ) {}

  /** Bảng chỉ có một dòng nên luôn đọc theo id = 1. */
  async get(): Promise<ClubSettings> {
    return this.repo.findOneOrFail({ where: { id: CLUB_SETTINGS_ID } });
  }

  async update(dto: UpdateSettingsDto, authUserId?: string): Promise<ClubSettings> {
    await this.repo.update({ id: CLUB_SETTINGS_ID }, dto);
    const result = await this.get();

    if (authUserId) {
      await this.dbFunctions.logActivity(
        authUserId,
        'settings.update',
        'Cập nhật cài đặt CLB',
        'club_settings',
      );
    }

    return result;
  }
}

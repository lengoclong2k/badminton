import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SessionStatus, SessionType } from 'src/common/enums';
import { PlaySession, SessionAttendee } from 'src/database/entities';
import { SessionSummaryView } from 'src/database/views';
import { DbFunctionsService } from 'src/database/db-functions.service';
import { SettingsService } from 'src/modules/settings/settings.service';
import { SessionsService } from './sessions.service';

/**
 * Test mẫu cho quy tắc quan trọng nhất của module: buổi trùng khung giờ
 * và mức phí khách phải được chụp lại từ cấu hình CLB lúc tạo buổi.
 */
describe('SessionsService', () => {
  let service: SessionsService;
  const sessionsRepo = { findOne: jest.fn(), save: jest.fn(), create: jest.fn((v) => v), findOneOrFail: jest.fn() };
  const settings = {
    get: jest.fn().mockResolvedValue({
      defaultCourt: 'Sân Thành Công',
      guestFeeMale: 70000,
      guestFeeFemale: 49000,
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: getRepositoryToken(PlaySession), useValue: sessionsRepo },
        { provide: getRepositoryToken(SessionAttendee), useValue: {} },
        { provide: getRepositoryToken(SessionSummaryView), useValue: {} },
        { provide: SettingsService, useValue: settings },
        { provide: DbFunctionsService, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(SessionsService);
  });

  const dto = {
    playDate: '2026-09-03',
    startTime: '19:00',
    endTime: '21:00',
    sessionType: SessionType.FIXED,
  };

  it('từ chối khi đã có buổi cùng ngày và cùng giờ bắt đầu', async () => {
    sessionsRepo.findOne.mockResolvedValue({ id: 'đã-có' });
    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('chụp lại phí khách và sân mặc định từ cấu hình CLB', async () => {
    sessionsRepo.findOne.mockResolvedValue(null);
    sessionsRepo.save.mockImplementation(async (s: PlaySession) => ({ ...s, id: 'moi' }));
    sessionsRepo.findOneOrFail.mockImplementation(async () => ({ id: 'moi', slug: '2026-09-03-toi' }));

    await service.create(dto);

    const saved = sessionsRepo.save.mock.calls[0][0];
    expect(saved.guestFeeMale).toBe(70000);
    expect(saved.guestFeeFemale).toBe(49000);
    expect(saved.court).toBe('Sân Thành Công');
    expect(saved.status).toBe(SessionStatus.OPEN);
  });
});

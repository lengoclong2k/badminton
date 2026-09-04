import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createNestApp } from './create-app';
import { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await createNestApp();
  const { port, nodeEnv } = app.get(ConfigService).getOrThrow<AppConfig>('app');

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`API chạy tại http://localhost:${port}/api/v1`);
  if (nodeEnv !== 'production') logger.log(`Swagger: http://localhost:${port}/docs`);
}

void bootstrap();

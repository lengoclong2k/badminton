import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

/**
 * Dựng app Nest với đầy đủ middleware nhưng KHÔNG listen.
 *
 * Tách riêng để hai môi trường dùng chung một cấu hình:
 *  - main.ts        → server long-running (local, VPS)
 *  - serverless.ts  → Vercel Function
 */
export async function createNestApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const { corsOrigins, nodeEnv } = config.getOrThrow<AppConfig>('app');

  app.use(helmet());
  app.enableCors({ origin: corsOrigins, credentials: true });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalInterceptors(new LoggingInterceptor());

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CLB Cầu Lông API')
      .setDescription('Quản lý quỹ, lịch đánh và điểm danh cho câu lạc bộ cầu lông')
      .setVersion('1.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token lấy từ Supabase Auth ở phía frontend',
      })
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  }

  return app;
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { join } from 'node:path';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Sécurité de base. `crossOriginResourcePolicy: cross-origin` autorise le
  // front (port 3100) à charger les avatars uploadés depuis le back (4100).
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());

  // Body parser limit — les images (avatars 2 MB, covers d'article 5 MB) sont
  // envoyées en data URL base64, ce qui ajoute ~33% de padding. On garde une
  // marge confortable pour éviter les faux positifs. Défaut Express = 100 KB.
  app.use(json({ limit: '8mb' }));
  app.use(urlencoded({ extended: true, limit: '8mb' }));

  // Avatars uploadés (et autres uploads futurs) servis en statique sous /uploads
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // CORS — autorise le frontend Next.js avec cookies
  const frontendUrl =
    config.get<string>('FRONTEND_URL') ?? 'http://localhost:3100';
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  // Validation globale des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Préfixe global pour toutes les routes API
  app.setGlobalPrefix('api', { exclude: ['health'] });

  // Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Sou'Sou API")
    .setDescription("API REST de Sou'Sou — gestion financière gamifiée")
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('PORT') ?? 4100;
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`🐷 Sou'Sou API running on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();

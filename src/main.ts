import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  const logger = app.get(Logger);

  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.enableCors();

  setupSwagger(app);

  const configService = app.get(ConfigService);
  const port = configService.get('port');

  logger.log(`App started listening in port ${port}`);
  // eslint-disable-next-line max-len
  logger.log(`*** console.log ***> LOG_LEVEL: ${configService.get('loggingLevel')} ENV: ${configService.get('environment')}`);

  const config = new DocumentBuilder()
    .setTitle('Perigee bot service')
    .setDescription('The Perigee bot service API for multiple uses')
    .setVersion('1.0')
    .addTag('Perigee')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(port);
}
bootstrap();

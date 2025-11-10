import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { configValues } from './config/config';
import { validate } from './config/validation';
import { LoggerModule } from 'nestjs-pino';
import { NotionService } from './infrastructure/notion/notion.service';
import { SlackController } from './application/slack/slack.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configValues],
      validate,
      isGlobal: true,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          ...(configService.get('environment') !== 'production' && {
            transport: {
              target: 'pino-pretty',
              options: {
                singleLine: true,
              },
            },
          }),
          serializers: {
            req(req) {
              // Remove if headers needs to be checked
              req.headers = 'hidden';
              return req;
            },
            res(res) {
              res.headers = 'hidden';
              return res;
            },
          },
          formatters: {
            level: (label: string) => {
              return { level: label };
            },
          },
          level: configService.get('loggingLevel'),
        },
      }),
    }),
  ],
  controllers: [SlackController],
  providers: [
    NotionService,
  ],
})
export class AppModule {}

import { IsOptional, IsPort, IsString } from 'class-validator';
import * as process from 'process';

export class EnvVariables {
  @IsPort()
  @IsOptional()
  PORT = '4000';

  @IsString()
  @IsOptional()
  NODE_ENV = 'development';

  @IsString()
  @IsOptional()
  LOGGING_LEVEL = 'info';

  @IsString()
  npm_package_name: string;

  @IsString()
  npm_package_version: string;

  @IsString()
  @IsOptional()
  npm_package_description: '';

  @IsString()
  NOTION_INTEGRATION_TOKEN: string;

  @IsString()
  NOTION_API_VERSION: string;

  @IsString()
  NOTION_DB_ID: string;

  @IsString()
  @IsOptional()
  SLACK_BOT_TOKEN: string;

  @IsString()
  @IsOptional()
  SLACK_APP_TOKEN: string;

  @IsString()
  @IsOptional()
  BOT_USER_ID_PERIGEE: string;
}

export class ConfigValues {
  public readonly port: number;
  public readonly environment: string;
  public readonly loggingLevel: string;
  public readonly service: {
    name: string;
    version: string;
    description: string;
  };
  
  public readonly notion?: {
    integrationToken: string;
    dbId: string;
    apiVersion: string;
  };
  
  public readonly slack?: {
    enable: boolean;
    bot?: {
      botUserId: string;
      token: string;
      appToken: string;
      slackSigningSecret: string;
      useThread: boolean;
    };
  };
}

export const configValues = (): ConfigValues => ({
  service: {
    name: process.env.npm_package_name,
    version: process.env.npm_package_version,
    description: process.env.npm_package_description,
  },
  
  port: Number(process.env.PORT),
  environment: process.env.NODE_ENV,
  loggingLevel: process.env.LOGGING_LEVEL,

  notion: {
    integrationToken: process.env.NOTION_INTEGRATION_TOKEN,
    apiVersion: process.env.NOTION_API_VERSION,
    dbId: process.env.NOTION_DB_ID,
  },
  
  slack: {
    enable: true,
    bot: {
      token: process.env.SLACK_PERIGEE_BOT_TOKEN,
      appToken: process.env.SLACK_PERIGEE_APP_TOKEN,
      // verificationToken: process.env.VERIFICATION_TOKEN_CLERKBOT,
      botUserId: process.env.BOT_USER_ID_CLERKBOT,
      useThread: true,
      slackSigningSecret: process.env.SLACK_PERIGEE_SIGNING_SECRET,
    },
  },
});

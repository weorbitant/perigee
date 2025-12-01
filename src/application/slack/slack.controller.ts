import { v4 as uuid } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { Controller, Logger, OnModuleInit } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { App } from '@slack/bolt';
import { NotionService } from 'src/infrastructure/notion/notion.service';
import { ExtractedMessageData } from 'src/domain/models/message-data';
import { extractMessageData } from 'src/domain/services/slack-message-processor';

@Controller({
  path: 'slack',
  version: '1',
})
@ApiTags('slack')
export class SlackController implements OnModuleInit {
  private readonly logger = new Logger(SlackController.name);
  private boltApp: App;

  constructor(
    private readonly configService: ConfigService,
    private readonly notionService: NotionService
  ) {
    const {
      enable,
      bot: { botUserId, token, appToken, useThread, slackSigningSecret },
    } = this.configService.get('slack');

    if (!enable) {
      this.logger.log('Slack bot disable by configuration');
      return;
    }

    this.boltApp = new App({
      socketMode: true,
      appToken,
      token,
      signingSecret: slackSigningSecret,
    });

    this.boltApp.event('app_mention', async ({ event, say, client }) => {
      try {
        this.logger.debug('app_mention', JSON.stringify(event));
        if (!event.thread_ts) {
          // Bot was mentioned in the main conversation (not in a thread)
          await say({
            text: '⚠️ Please mention me from within a thread, not from the main conversation!',
            thread_ts: event.ts, // Reply in a thread to keep the channel clean
          });
          return;
        }

        const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
        const command = text.split(' ')[0]?.toLowerCase() || '';
        if (command !== 'add' && command !== '') {
          const botName = this.configService.get('slack.bot.name');
          await say({
            text: `❓ Usage: @${botName} or @${botName} add`,
            thread_ts: event.thread_ts,
          });
          return;
        }

        // await say({
        //   text: '🔄 Fetching parent message...',
        //   thread_ts: event.thread_ts,
        // });

        // Get the parent message
        const mainMessage = await this.getParentMessage(
          client,
          event.channel,
          event.thread_ts
        );

        // Prepare data to send to service
        const extractedMessageData: ExtractedMessageData = extractMessageData(
          mainMessage,
          this.configService.get('slack.workspaceDomain'),
          event.channel
        );
        const dataToSend = {
          parentMessage: extractedMessageData,
          requested_by: event.user,
          requested_at: new Date().toISOString(),
          command: command || 'default',
        };

        this.logger.log('📤 Sending to service:', dataToSend);
        const created = await this.notionService.createURLEntry(dataToSend.parentMessage);

        const { error } = created.object === 'error' ? this.handleNotionError(created): { error: undefined }
        if (error) {
          this.logger.error('Error creating URL entry:', error);
          await say({
            text: `❌ Sorry, something went wrong: ${error}`,
            thread_ts: event.thread_ts,
          });
        }
        // Confirm success
        await say({
          // text: `✅ Parent message sent to service!\n\n*Parent message:*\n> ${mainMessage.text}`,
          text: `✅ Saved link "${extractedMessageData.linkTitle}" to Notion!`,
          thread_ts: event.thread_ts,
        });
      } catch (error) {
        this.logger.error('Error processing app_mention:', error);
        await say({
          text: `❌ Sorry, something went wrong: ${(error as Error).message}`,
          thread_ts: event.thread_ts || event.ts,
        }).catch(console.error);
      }
    });
  }

  /**
  * Get the parent message from a thread
  */
  private async getParentMessage(client: any, channel: string, threadTs: string): Promise<any> {
    try {
      // conversations.replies returns all messages in a thread
      // The first message in the array is always the parent message
      const result = await client.conversations.replies({
        channel: channel,
        ts: threadTs,
        limit: 1, // We only need the parent message
        inclusive: true,
      });
  
      if (result.messages && result.messages.length > 0) {
        return result.messages[0];
      }
  
      throw new Error('No parent message found');
    } catch (error) {
      console.error('Error fetching parent message:', error);
      throw error;
    }
 }

 private handleNotionError(data: any): any {
  return data.code === 'validation_error'
    ? { error: data.message }
    : data.status >= 200 && data.status < 300
      ? { data }
      : { error: `HTTP ${data.status}`}
 }

  async onModuleInit() {
    // Start the Slack Bolt app
    const { enable } = this.configService.get('slack');
    enable &&
      (async () => {
        await this.boltApp.start();
        this.logger.log('⚡️ Perigee Bot - Bolt app  is running!');
      })();
    !enable && this.logger.log('Skip starting Slack app');
  }
}

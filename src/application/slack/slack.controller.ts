import { v4 as uuid } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { Controller, Logger, OnModuleInit } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { App } from '@slack/bolt';
import { NotionService } from 'src/infrastructure/notion/notion.service';


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
        // Check if the mention is in a thread
        this.logger.debug('app_mention', JSON.stringify(event));
        if (!event.thread_ts) {
          // Bot was mentioned in the main conversation (not in a thread)
          await say({
            text: '⚠️ Please mention me from within a thread, not from the main conversation!',
            thread_ts: event.ts, // Reply in a thread to keep the channel clean
          });
          return;
        }

        // Parse the command (if any)
        // Extract text after the bot mention
        const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
        const command = text.split(' ')[0]?.toLowerCase() || '';

        // Optional: you can add command validation here
        // For simplicity, we'll accept any mention (with or without "add")
        // If you want to enforce "add", uncomment the following:
        /*
        if (command !== 'add' && command !== '') {
          await say({
            text: '❓ Usage: `@bot` or `@bot add`',
            thread_ts: event.thread_ts,
          });
          return;
        }
        */

        // Acknowledge receipt
        await say({
          text: '🔄 Fetching parent message...',
          thread_ts: event.thread_ts,
        });

        // Get the parent message
        const mainMessage = await this.getParentMessage(
          client,
          event.channel,
          event.thread_ts
        );

        // Prepare data to send to service
        const dataToSend = {
          parentMessage: {
            text: mainMessage?.text,
            ts: mainMessage.ts,
            user: mainMessage?.user,
            channel: event.channel,
            thread_ts: event.thread_ts,
            permalink: `https://slack.com/archives/${event.channel}/p${mainMessage.ts.replace('.', '')}`,
          },
          requested_by: event.user,
          requested_at: new Date().toISOString(),
          command: command || 'default',
        };

        this.logger.log('📤 Sending to service:', dataToSend);
        const created = await this.notionService.createURL(dataToSend.parentMessage.text, uuid());
        // Send to external service
        // await sendToService(dataToSend);

        // Confirm success
        await say({
          // text: `✅ Parent message sent to service!\n\n*Parent message:*\n> ${mainMessage.text}`,
          text: `✅ Saved! ${JSON.stringify(created)}`,
          thread_ts: event.thread_ts,
        });
      } catch (error) {
        this.logger.error('Error processing app_mention:', error);

        // Send error message
        await say({
          text: `❌ Sorry, something went wrong: ${(error as Error).message}`,
          thread_ts: event.thread_ts || event.ts,
        }).catch(console.error);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this.boltApp.event('message', async ({ message, say, client, context, body }) => {
      const { channel, channel_type: channelType /* user */ } = message;
      const user = context.userId;

      try {
        this.logger.debug('direct message', JSON.stringify(message), JSON.stringify(context));
        if (channelType !== 'im') return;
        if (message.channel_type !== 'im') return;
        // const userRequestMessage = message.text?.trim();
        const userRequestMessage = 'how long until next team building?';

        //  
      } catch (error) {
        this.logger.error('Error creating slack private response', { error, channel: message.channel, user });
        const errorMessage = error ? `:cry: : ${error}` : '';
        const text = `Please, <@${user}>, I think an error occurred ${errorMessage}`;
        // eslint-disable-next-line
        await client.chat.postMessage({
          channel,
          text: `I'm sorry, I don't know the answer to that or something went South: ${text}`,
        });
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

  async onModuleInit() {
    // Start the Slack Bolt app
    const { enable } = this.configService.get('slack');
    enable &&
      (async () => {
        await this.boltApp.start();
        this.logger.log('⚡️ Mr Clerk Bot - Bolt app  is running!');
      })();
    !enable && this.logger.log('Skip starting Slack app');
  }
}

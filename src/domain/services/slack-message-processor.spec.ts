import { extractMessageData } from './slack-message-processor';

const createSlackMessage = (overrides: Partial<any> = {}) => ({
  user: 'U012AB3CD',
  type: 'message',
  ts: '1512085950.000216',
  text: 'Hello world',
  channel: 'C123ABC456',
  team: 'T061EG9R6',
  ...overrides,
});

const actualSlackMessage = {
  "user": "U09R0LJRDMM",
  "type": "message",
  "ts": "1764342743.964639",
  "client_msg_id": "7dcf4b4b-b4aa-46c0-b998-033edcd5fc05",
  "text": "beautiful link <http://xano.com|xano.com>",
  "team": "T09RCLL1HM3",
  "thread_ts": "1764342743.964639",
  "reply_count": 2,
  "reply_users_count": 2,
  "latest_reply": "1764342772.419699",
  "reply_users": [
    "U09R0LJRDMM",
    "U09RFFT1R6J"
  ],
  "is_locked": false,
  "subscribed": false,
  "blocks": [
    {
      "type": "rich_text",
      "block_id": "3y89c",
      "elements": [
        {
          "type": "rich_text_section",
          "elements": [
            {
              "type": "text",
              "text": "beautiful link "
            },
            {
              "type": "link",
              "url": "http://xano.com",
              "text": "xano.com"
            }
          ]
        }
      ]
    }
  ]
};

describe('extractMessageData', () => {
  describe('basic field extraction', () => {
    it('extracts timestamp from message', () => {
      const message = createSlackMessage({ ts: '1512085950.000216' });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.timestamp).toBe('1512085950.000216');
    });

    it('extracts user from message', () => {
      const message = createSlackMessage({ user: 'U061F7AUR' });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.user).toBe('U061F7AUR');
    });

    it('extracts plain text content', () => {
      const message = createSlackMessage({ 
        text: 'This is a simple message' 
      });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.messageContent).toBe('This is a simple message');
    });
  });

  describe('link extraction', () => {
    it('extracts auto-formatted URL without title', () => {
      const message = createSlackMessage({
        text: 'Check this out <http://example.com/>',
      });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.url).toBe('http://example.com/');
      expect(result.linkTitle).toBeNull();
    });

    it('extracts URL with custom title', () => {
      const message = createSlackMessage({
        text: 'Read more at <http://www.example.com|This message is a link>',
      });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.url).toBe('http://www.example.com');
      expect(result.linkTitle).toBe('This message is a link');
    });

    it('extracts HTTPS URL with title', () => {
      const message = createSlackMessage({
        text: 'New article: <https://blog.example.com/post|Great Article>',
      });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.url).toBe('https://blog.example.com/post');
      expect(result.linkTitle).toBe('Great Article');
    });

    it('extracts first URL when multiple links exist', () => {
      const message = createSlackMessage({
        text: 'Check <https://first.com|First> and <https://second.com|Second>',
      });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.url).toBe('https://first.com');
      expect(result.linkTitle).toBe('First');
    });

    it('returns null when no links present', () => {
      const message = createSlackMessage({
        text: 'Just plain text without any links',
      });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.url).toBeNull();
      expect(result.linkTitle).toBeNull();
    });

    it('extracts mailto links', () => {
      const message = createSlackMessage({
        text: 'Contact us: <mailto:hello@example.com|Email Support>',
      });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.url).toBe('mailto:hello@example.com');
      expect(result.linkTitle).toBe('Email Support');
    });

    it('handles URL retrieved from API with formatted link', () => {
      const message = createSlackMessage({
        text: 'This message contains a URL <http://example.com|www.example.com>',
      });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.url).toBe('http://example.com');
      expect(result.linkTitle).toBe('www.example.com');
    });
  });

  describe('message content formatting', () => {
    it('strips link formatting from content', () => {
      const message = createSlackMessage({
        text: 'Visit <https://example.com|our website> for info',
      });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.messageContent).toBe('Visit our website for info');
    });

    it('strips user mentions from content', () => {
      const message = createSlackMessage({
        text: 'Hey <@U012AB3CD|john>, thanks for the report',
      });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.messageContent).toBe('Hey @john, thanks for the report');
    });

    it('strips channel links from content', () => {
      const message = createSlackMessage({
        text: 'Posted in <#C123ABC456|general>',
      });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.messageContent).toBe('Posted in #general');
    });

    it('strips user group mentions from content', () => {
      const message = createSlackMessage({
        text: 'Attention <!subteam^SAZ94GDB8|@engineering>',
      });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.messageContent).toBe('Attention @engineering');
    });

    it('strips special mentions from content', () => {
      const message = createSlackMessage({
        text: 'Alert: <!here> and <!channel> and <!everyone>',
      });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.messageContent).toBe('Alert: here and channel and everyone');
    });

    it('unescapes HTML entities', () => {
      const message = createSlackMessage({
        text: 'Use &lt;tag&gt; &amp; symbols',
      });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.messageContent).toBe('Use <tag> & symbols');
    });

    it('handles complex mixed formatting', () => {
      const message = createSlackMessage({
        text: 'Hey <@U123|alice>, check <https://example.com|this link> in <#C456|dev-team> &amp; notify <!here>',
      });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.messageContent).toBe('Hey @alice, check this link in #dev-team & notify here');
    });
  });

  describe('permalink generation', () => {
    it('builds permalink with workspace domain', () => {
      const message = createSlackMessage({
        ts: '1512085950.000216',
        channel: 'C123ABC456',
      });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.permalink).toBe(
        'https://t061eg9r6.slack.com/archives/C123ABC456/p1512085950000216'
      );
    });

    it('builds permalink with team_id when workspace not provided', () => {
      const message = createSlackMessage({
        ts: '1512085950.000216',
        channel: 'C123ABC456',
        team: 'TWORKSPACE',
      });
      const result = extractMessageData(message);

      expect(result.permalink).toBe(
        'https://tworkspace.slack.com/archives/C123ABC456/p1512085950000216'
      );
    });

    it('returns empty permalink when channel is missing', () => {
      const message = createSlackMessage({
        channel: undefined,
      });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.permalink).toBe('');
    });

    it('returns empty permalink when workspace and team missing', () => {
      const message = createSlackMessage({
        team: undefined,
      });
      const result = extractMessageData(message);

      expect(result.permalink).toBe('');
    });

    it('handles timestamps with different precision', () => {
      const message = createSlackMessage({
        ts: '1476909142.000007',
        channel: 'C123ABC456',
      });
      const result = extractMessageData(message, 'myworkspace');

      expect(result.permalink).toBe(
        'https://myworkspace.slack.com/archives/C123ABC456/p1476909142000007'
      );
    });
  });

  describe('real-world message examples', () => {
    it('handles message from Events API payload', () => {
      const message = createSlackMessage({
        type: 'message',
        user: 'U2147483697',
        text: 'Hello hello can you hear me?',
        ts: '1355517523.000005',
        channel: 'D024BE91L',
        event_ts: '1355517523.000005',
        channel_type: 'im',
      });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.timestamp).toBe('1355517523.000005');
      expect(result.user).toBe('U2147483697');
      expect(result.messageContent).toBe('Hello hello can you hear me?');
      expect(result.url).toBeNull();
    });

    it('handles message with link from conversations.history', () => {
      const message = createSlackMessage({
        text: 'I find you punny and would like to smell your nose letter',
        ts: '1512085950.000216',
        type: 'message',
        user: 'U012AB3CDE',
      });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.timestamp).toBe('1512085950.000216');
      expect(result.user).toBe('U012AB3CDE');
    });

    it('handles message with formatted link and mentions', () => {
      const message = createSlackMessage({
        text: '<@U061F7AUR> shared <https://docs.slack.dev/|Slack Docs> in <#C0PNCHHK2|engineering>',
        ts: '1525215129.000001',
        user: 'U061F7AUR',
        channel: 'C0PNCHHK2',
      });
      const result = extractMessageData(message, 't061eg9r6');

      expect(result.url).toBe('https://docs.slack.dev/');
      expect(result.linkTitle).toBe('Slack Docs');
      expect(result.messageContent).toBe('@U061F7AUR shared Slack Docs in #engineering');
    });
  });
});
import { WebClient } from '@slack/web-api';
import type { ExtractedMessageData, ParsedLink } from '../models/message-data';
import type { SlackMessage } from '../models/incoming-message';


export const getUsernameFromId = async (client: WebClient, userId) => {
  const result = await client.users.info({ user: userId });
  
  const displayName = result.user?.profile?.display_name_normalized 
    || result.user?.profile?.display_name
    || result.user?.real_name
    || result.user?.name;
  
  return displayName 
    ? `@${displayName}`
    : Promise.reject(new Error(`User ${userId} not found or has no display name`));
};


const extractLinks = (text: string): ParsedLink[] => {
  const linkPattern = /<((?:https?:\/\/|mailto:)[^|>]+)(?:\|([^>]+))?>/g;
  const links: ParsedLink[] = [];
  let match;

  while ((match = linkPattern.exec(text)) !== null) {
    links.push({
      url: match[1],
      title: match[2] || null,
    });
  }

  return links;
};

const stripFormatting = (text: string): string => {
  return text
    .replace(/<((?:https?:\/\/|mailto:)[^|>]+)(?:\|([^>]+))?>/g, (_, url, title) => title || url)
    .replace(/<#([^|>]+)(?:\|([^>]+))?>/g, (_, id, name) => name ? `#${name}` : `#${id}`)
    .replace(/<@([^|>]+)(?:\|([^>]+))?>/g, (_, id, name) => name ? `@${name}` : `@${id}`)
    .replace(/<!subteam\^([^|>]+)(?:\|([^>]+))?>/g, (_, id, name) => name || `@${id}`)
    .replace(/<!(?:here|channel|everyone)>/g, (match) => match.slice(2, -1))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
};

const buildPermalink = (teamId: string, channelId: string, ts: string): string => {
  const domain = teamId.toLowerCase();
  const tsWithoutDot = ts.replace('.', '');
  return `https://${domain}.slack.com/archives/${channelId}/p${tsWithoutDot}`;
};

export const extractMessageData = (client: WebClient) => async (
  message: SlackMessage,
  workspaceDomain?: string,
  channelId?: string,
): Promise<ExtractedMessageData> => {
  const links = extractLinks(message.text);
  const firstLink = links[0] || null;
  
  const channel = channelId || message.channel;
  const permalink = workspaceDomain && channel
    ? buildPermalink(workspaceDomain, channel, message.ts)
    : message.team && channel
      ? buildPermalink(message.team, channel, message.ts)
      : '';

  return {
    timestamp: message.ts,
    url: firstLink?.url || null,
    linkTitle: firstLink?.title || firstLink?.url || null,
    user: await getUsernameFromId(client, message.user),
    messageContent: stripFormatting(message.text),
    permalink,
  };
};

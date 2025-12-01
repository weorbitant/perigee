export interface ExtractedMessageData {
  timestamp: string;
  url: string | null;
  linkTitle: string | null;
  user: string;
  messageContent: string;
  permalink: string;
}

export interface ParsedLink {
  url: string;
  title: string | null;
}

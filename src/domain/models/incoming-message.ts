export interface SlackMessage {
  ts: string;
  user: string;
  text: string;
  channel?: string;
  team?: string;
  [key: string]: any;
}

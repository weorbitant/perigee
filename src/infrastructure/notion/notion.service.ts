import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExtractedMessageData } from 'src/domain/models/message-data';

@Injectable()
export class NotionService {
  private readonly logger = new Logger(NotionService.name);
  private notionApiVersion: string;
  private notionDbId: string;
  private notionIntegrationToken: string;
  // private markdownSplitter = new MarkdownTextSplitter();
  // private recursiveSplitter = new RecursiveCharacterTextSplitter({
  //   chunkSize: 50,
  //   chunkOverlap: 5,
  // });

  isAvailable: boolean;
  private readonly headers;
  private dataSourceId: string;

  constructor(private readonly configService: ConfigService) {
    this.notionIntegrationToken = this.configService.get<string>('notion.integrationToken');
    this.notionApiVersion = this.configService.get<string>('notion.apiVersion');
    this.notionDbId = this.configService.get<string>('notion.dbId');
    this.isAvailable = !!this.notionIntegrationToken || !!this.notionApiVersion || !!this.notionDbId;
    this.headers = {
      'Authorization': `Bearer ${this.notionIntegrationToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': this.notionApiVersion
    };
  }

  //#region transformers & splitters
  private async getDataSourceId(databaseId?: string): Promise<string> {
    databaseId = databaseId || this.notionDbId;
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: 'GET',
      headers: this.headers
    });
    
    const data = await response.json();
    // For single-source databases, there will be one data source
    this.dataSourceId = data.data_sources[0].id;
    return this.dataSourceId;
  }

  async createURLEntry(messageData: ExtractedMessageData, dataSourceId?: string): Promise<any> {
    dataSourceId = dataSourceId || this.dataSourceId || await this.getDataSourceId()
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        parent: {
          data_source_id: dataSourceId  // CHANGED: was database_id
        },
        properties: {
          // Name: {
          //   title: [{ text: { content: nameValue } }]
          // },
          Timestamp: {
            date: {
              start: new Date(Number(messageData.timestamp) * 1000).toISOString()
            }
          },
          URL: {
            url: messageData.url
          },
          LinkTitle: {
            title: [{ text: { content: messageData.linkTitle } }]
          },
          User: {
            rich_text: [{ text: { content: messageData.user } }]
          },
          MessageContent: {
            rich_text: [{ text: { content: messageData.messageContent } }]
          },
          Permalink: {
            rich_text: [{ text: { content: messageData.permalink } }]

          }
        }
      })
    });
  
    return await response.json();
  }

  async getAllURLs(dataSourceId?: string) {
    dataSourceId = dataSourceId || this.dataSourceId || await this.getDataSourceId()
    const response = await fetch(
      `https://api.notion.com/v1/data_sources/${dataSourceId}/query`,  // CHANGED PATH
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({})
      }
    );
  
    const data = await response.json();
    return data.results;
  }
}

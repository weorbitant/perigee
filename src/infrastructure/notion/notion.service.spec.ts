import { Test, TestingModule } from '@nestjs/testing';
import { Document } from 'langchain/document';
import { NotionService } from './notion.service';
import { ConfigService } from '@nestjs/config';

const mockDocs = [
  new Document({
    pageContent: 'Document 1\n\nContent 1',
    metadata: { notionId: 'pageId1', loc: { lines: { from: 1, to: 20 } } },
  }),
];
const mockSplitted = [
  new Document({
    pageContent: 'Document 1',
    metadata: { notionId: 'pageId1', loc: { lines: { from: 1, to: 12 } } },
  }),
  new Document({
    pageContent: 'Content 1',
    metadata: { notionId: 'pageId1', loc: { lines: { from: 12, to: 20 } } },
  }),
];

const mockLoad = jest.fn().mockResolvedValue(mockDocs);
const mockSplit = jest.fn().mockResolvedValue(mockSplitted);
jest.mock('@langchain/community/document_loaders/web/notionapi', () => {
  return {
    NotionAPILoader: jest.fn().mockImplementation(() => {
      return {
        load: mockLoad,
      };
    }),
  };
});
jest.mock('langchain/text_splitter', () => {
  return {
    RecursiveCharacterTextSplitter: jest.fn().mockImplementation(() => {
      return {
        splitDocuments: mockSplit,
      };
    }),
    MarkdownTextSplitter: jest.fn().mockImplementation(() => {
      return {
        splitDocuments: mockSplit,
      };
    }),
  };
});

describe('NotionService', () => {
  let service: NotionService;

  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'notion.transform') return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotionService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<NotionService>(NotionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

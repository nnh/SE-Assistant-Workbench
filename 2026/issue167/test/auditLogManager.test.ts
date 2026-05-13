/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  fetchAndSaveAuditLogsRaw_,
  writeLogsToSheet_,
} from '../src/driveAuditManager';

// 各種モックの定義
const mockAdminReports = {
  Activities: {
    list: jest.fn(),
  },
};

const mockDriveApp = {
  createFile: jest.fn(),
  searchFiles: jest.fn(),
  MimeType: { PLAIN_TEXT: 'text/plain' },
};

const mockSpreadsheetApp = {
  getActiveSpreadsheet: jest.fn(),
};

const mockUtilities = {
  formatDate: jest.fn((date, tz, format) => {
    if (format === 'yyyyMMdd') return '20260513';
    return '2026/05/13 00:00:00';
  }),
};

const mockPropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: jest.fn().mockReturnValue('nagoya.hosp.go.jp,nnh.go.jp'),
  }),
};

describe('DriveAuditManager Tests', () => {
  let mockAuditSheet: any;
  let mockRequestSheet: any;

  beforeEach(() => {
    jest.clearAllMocks();

    const mimeTypeMock = {
      PLAIN_TEXT: 'text/plain',
      GOOGLE_SHEETS: 'application/vnd.google-apps.spreadsheet',
    };

    (global as any).MimeType = mimeTypeMock;
    (global as any).AdminReports = mockAdminReports;
    (global as any).DriveApp = {
      ...mockDriveApp,
      MimeType: mimeTypeMock,
    };
    (global as any).SpreadsheetApp = mockSpreadsheetApp;
    (global as any).Utilities = mockUtilities;
    (global as any).PropertiesService = mockPropertiesService;

    // シートのモック作成関数
    const createMockSheet = (name: string) => ({
      getName: jest.fn().mockReturnValue(name),
      appendRow: jest.fn(),
      getRange: jest.fn().mockReturnValue({
        setValues: jest.fn(),
        setFontWeight: jest.fn().mockReturnThis(),
        setBackground: jest.fn().mockReturnThis(),
        setFontColor: jest.fn().mockReturnThis(),
        setFontStyle: jest.fn().mockReturnThis(),
      }),
      getLastRow: jest.fn().mockReturnValue(1),
      setFrozenRows: jest.fn(),
    });

    mockAuditSheet = createMockSheet('監査ログ');
    mockRequestSheet = createMockSheet('アクセス権リクエスト');

    // SpreadsheetAppのモック
    const mockSs = {
      // getSheetByName と insertSheet の両方で、名前に応じたモックシートを返す
      getSheetByName: jest.fn((name: string) => {
        if (name === '監査ログ') return mockAuditSheet;
        if (name === 'アクセス権リクエスト') return mockRequestSheet;
        return null;
      }),
      insertSheet: jest.fn((name: string) => {
        if (name === '監査ログ') return mockAuditSheet;
        if (name === 'アクセス権リクエスト') return mockRequestSheet;
        return mockAuditSheet; // デフォルト
      }),
    };
    mockSpreadsheetApp.getActiveSpreadsheet.mockReturnValue(mockSs);
  });

  describe('fetchAndSaveAuditLogsRaw_', () => {
    it('nextPageTokenがある場合に複数回APIを呼び出し、ファイルを保存すること', () => {
      mockAdminReports.Activities.list
        .mockReturnValueOnce({
          items: [
            {
              id: { time: '2026-05-13T00:00:00Z' },
              actor: { email: 'a@ex.com' },
              events: [{ name: 'download', parameters: [] }],
            },
          ],
          nextPageToken: 'next_token',
        })
        .mockReturnValueOnce({
          items: [
            {
              id: { time: '2026-05-13T00:01:00Z' },
              actor: { email: 'b@ex.com' },
              events: [{ name: 'download', parameters: [] }],
            },
          ],
          nextPageToken: null,
        });

      fetchAndSaveAuditLogsRaw_();

      expect(mockAdminReports.Activities.list).toHaveBeenCalledTimes(2);
      expect(mockDriveApp.createFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('writeLogsToSheet_', () => {
    it('データが0件の場合、各シートに「レコードなし」のメッセージを出力すること', () => {
      // ファイルはあるが中身が空、あるいは除外対象のみのケース
      const mockFileIterator = {
        hasNext: jest.fn().mockReturnValueOnce(true).mockReturnValue(false),
        next: jest.fn().mockReturnValue({
          getBlob: () => ({ getDataAsString: () => JSON.stringify([]) }),
        }),
      };
      mockDriveApp.searchFiles.mockReturnValue(mockFileIterator);

      writeLogsToSheet_();

      // どちらのシートにも appendRow でメッセージが書かれたか確認
      const expectedMessage =
        '対象期間内に該当するレコードはありませんでした。';
      expect(mockAuditSheet.appendRow).toHaveBeenCalledWith(
        expect.arrayContaining([expectedMessage])
      );
      expect(mockRequestSheet.appendRow).toHaveBeenCalledWith(
        expect.arrayContaining([expectedMessage])
      );
    });

    it('request_accessイベントが専用のシートに振り分けられること', () => {
      const mockActivities = [
        {
          id: { time: '2026-05-13T00:00:00Z' },
          actor: { email: 'external@gmail.com' },
          events: [
            {
              name: 'request_access',
              parameters: [
                { name: 'doc_title', value: '重要書類' },
                { name: 'primary_event', value: true },
              ],
            },
          ],
        },
      ];

      const mockFileIterator = {
        hasNext: jest.fn().mockReturnValueOnce(true).mockReturnValue(false),
        next: jest.fn().mockReturnValue({
          getBlob: () => ({
            getDataAsString: () => JSON.stringify(mockActivities),
          }),
        }),
      };
      mockDriveApp.searchFiles.mockReturnValue(mockFileIterator);

      writeLogsToSheet_();

      // リクエストシートにはデータが書き込まれ、監査ログシートにはメッセージが書かれる
      expect(mockRequestSheet.getRange().setValues).toHaveBeenCalled();
      expect(mockAuditSheet.appendRow).toHaveBeenCalledWith(
        expect.arrayContaining([
          '対象期間内に該当するレコードはありませんでした。',
        ])
      );
    });
  });
});

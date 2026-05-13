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
  MimeType: { PLAIN_TEXT: 'text/plain' }, // DriveApp配下のMimeType
};

const mockSpreadsheetApp = {
  getActiveSpreadsheet: jest.fn(),
};

const mockUtilities = {
  formatDate: jest.fn((date, tz, format) => '20260513'), // yyyyMMdd形式を返す
};

const mockPropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: jest.fn().mockReturnValue('nagoya.hosp.go.jp,nnh.go.jp'),
  }),
};

describe('DriveAuditManager Tests', () => {
  // beforeEach の中身を以下のように徹底的に固めます
  beforeEach(() => {
    jest.clearAllMocks();

    // 1. MimeTypeオブジェクトを定義
    const mimeTypeMock = {
      PLAIN_TEXT: 'text/plain',
      GOOGLE_SHEETS: 'application/vnd.google-apps.spreadsheet',
    };

    // 2. グローバル(Node.jsのglobal)に注入
    (global as any).MimeType = mimeTypeMock;

    // 3. 各種GASサービスのモックを注入
    (global as any).AdminReports = mockAdminReports;
    (global as any).DriveApp = {
      ...mockDriveApp,
      MimeType: mimeTypeMock, // 万が一 DriveApp.MimeType で呼ばれてもいいように
    };
    (global as any).SpreadsheetApp = mockSpreadsheetApp;
    (global as any).Utilities = mockUtilities;
    (global as any).PropertiesService = mockPropertiesService;
  });

  describe('fetchAndSaveAuditLogsRaw_', () => {
    it('nextPageTokenがある場合に複数回APIを呼び出し、ファイルを保存すること', () => {
      // 1回目のレスポンス
      mockAdminReports.Activities.list.mockReturnValueOnce({
        items: [
          {
            id: { time: '2026-05-13T00:00:00Z' },
            actor: { email: 'a@ex.com' },
            events: [{ name: 'download', parameters: [] }],
          },
        ],
        nextPageToken: 'next_token',
      });
      // 2回目のレスポンス
      mockAdminReports.Activities.list.mockReturnValueOnce({
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
    it('除外ドメインのダウンロードイベントがスキップされること', () => {
      const mockFileContent = JSON.stringify([
        {
          id: { time: '2026-05-13T00:00:00Z' },
          actor: { email: 'user@nagoya.hosp.go.jp' },
          events: [{ name: 'download', parameters: [] }],
        },
      ]);

      const mockFile = {
        getBlob: () => ({ getDataAsString: () => mockFileContent }),
      };

      const mockFileIterator = {
        hasNext: jest.fn().mockReturnValueOnce(true).mockReturnValue(false),
        next: jest.fn().mockReturnValue(mockFile),
      };

      mockDriveApp.searchFiles.mockReturnValue(mockFileIterator);

      const mockSheet = {
        appendRow: jest.fn(),
        getRange: jest.fn().mockReturnValue({
          setValues: jest.fn(),
          setFontWeight: jest.fn(),
          setBackground: jest.fn(),
        }),
        getLastRow: jest.fn().mockReturnValue(1),
        setFrozenRows: jest.fn(),
      };
      const mockSs = { getSheetByName: jest.fn().mockReturnValue(mockSheet) };
      mockSpreadsheetApp.getActiveSpreadsheet.mockReturnValue(mockSs);

      writeLogsToSheet_();

      // 除外ドメインなので、setValuesは呼ばれないはず
      expect(mockSheet.getRange().setValues).not.toHaveBeenCalled();
    });
  });
});

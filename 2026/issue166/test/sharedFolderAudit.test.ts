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
import { executeExport_ } from '../src/sharedFolderAudit';

// GASのグローバルオブジェクトをモック化
// test/sharedFolderAudit.test.ts

const mockSheet = {
  clear: jest.fn().mockReturnThis(), // clear() もチェーンされる可能性に備えて
  appendRow: jest.fn().mockReturnThis(),
  // getRange の返り値がさらに setFontWeight や setBackground を持っている必要がある
  getRange: jest.fn().mockReturnThis(),
  setFontWeight: jest.fn().mockReturnThis(), // 追加
  setBackground: jest.fn().mockReturnThis(), // 追加
  setValues: jest.fn().mockReturnThis(),
};

const mockSpreadsheet = {
  getSheetByName: jest.fn(),
  insertSheet: jest.fn().mockReturnValue(mockSheet),
  getActiveSpreadsheet: jest.fn(),
};

const mockFolder = {
  getName: jest.fn().mockReturnValue('Test Folder'),
  getId: jest.fn().mockReturnValue('folder-123'),
  getEditors: jest.fn().mockReturnValue([]),
  getViewers: jest.fn().mockReturnValue([]),
  getOwner: jest.fn().mockReturnValue({
    getName: () => 'Owner',
    getEmail: () => 'owner@example.com',
  }),
  getFolders: jest.fn().mockReturnValue({ hasNext: () => false }),
};

describe('executeExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // グローバルオブジェクトをセット
    (global as any).SpreadsheetApp = mockSpreadsheet;
    (global as any).DriveApp = {
      getFolderById: jest.fn().mockReturnValue(mockFolder),
    };
    (global as any).Utilities = {
      formatDate: jest.fn().mockReturnValue('20260512'),
    };

    mockSpreadsheet.getActiveSpreadsheet.mockReturnValue(mockSpreadsheet);
  });

  it('既存のシートがない場合、新しいシートを作成してヘッダーを書き込むこと', () => {
    mockSpreadsheet.getSheetByName.mockReturnValue(null); // シートが存在しない想定

    executeExport_('folder-123', '内部共有のみ', 0);

    expect(mockSpreadsheet.insertSheet).toHaveBeenCalledWith(
      '内部共有のみ_20260512'
    );
    expect(mockSheet.appendRow).toHaveBeenCalled();
  });

  it('既存のシートがある場合、クリアして再利用すること', () => {
    mockSpreadsheet.getSheetByName.mockReturnValue(mockSheet); // シートが存在する想定

    executeExport_('folder-123', '内部共有のみ', 0);

    expect(mockSheet.clear).toHaveBeenCalled();
    expect(mockSpreadsheet.insertSheet).not.toHaveBeenCalled();
  });
});

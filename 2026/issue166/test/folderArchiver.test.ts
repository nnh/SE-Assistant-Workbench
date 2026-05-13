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
import { FolderArchiver } from '../src/folderArchiver';

// Google Apps Scriptのグローバルオブジェクトをモック化
const mockGetProperty = jest.fn();
const mockSetProperty = jest.fn();
const mockSetProperties = jest.fn();

global.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: mockGetProperty,
    setProperty: mockSetProperty,
    setProperties: mockSetProperties,
  }),
} as any;

global.Utilities = {
  formatDate: jest.fn().mockReturnValue('20260513_1300'),
} as any;

global.console = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;

describe('FolderArchiver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('コンストラクタ実行時にプロパティが存在しない場合、デフォルト値を設定すること', () => {
    // getPropertyがすべてnullを返す（プロパティ未設定）状態をシミュレート
    mockGetProperty.mockReturnValue(null);

    new FolderArchiver();

    // 必要なキーがデフォルト値で作成されたか確認
    expect(mockSetProperty).toHaveBeenCalledWith(
      'SAVE_DESTINATION_FOLDER_ID',
      expect.stringContaining('SET_YOUR_')
    );
    expect(mockSetProperty).toHaveBeenCalledWith(
      'TARGET_SHARED_DRIVE_IDS',
      expect.stringContaining('SET_DRIVE_ID_')
    );
  });

  test('ダミー値が設定されている場合、validateAndThrowがエラーをスローすること', () => {
    mockGetProperty.mockImplementation((key: string) => {
      if (key === 'SAVE_DESTINATION_FOLDER_ID')
        return 'SET_YOUR_FOLDER_ID_HERE';
      if (key === 'TARGET_SHARED_DRIVE_IDS') return 'DRIVE_ID_123';
      return null;
    });

    const archiver = new FolderArchiver();

    // validateAndThrowがprivateの場合は、外部から呼べるメソッド経由でテスト
    expect(() => {
      archiver.initQueue();
    }).toThrow('[Configuration Error]');
  });

  test('TODOリストが空の場合、executeNextが処理を中断すること', () => {
    mockGetProperty.mockImplementation((key: string) => {
      if (key === 'SAVE_DESTINATION_FOLDER_ID') return 'valid_folder_id';
      if (key === 'TARGET_SHARED_DRIVE_IDS') return 'drive_id_1';
      if (key === 'TODO_DRIVE_IDS') return ''; // 空のTODO
      return null;
    });

    const archiver = new FolderArchiver();
    archiver.executeNext();

    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining('TODOリストが空です')
    );
  });
});

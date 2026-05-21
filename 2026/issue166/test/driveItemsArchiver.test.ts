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
import { DriveItemsArchiver } from '../src/core/item/driveItemsArchiver';
import * as Const from '../src/common/const';

// GASのグローバルオブジェクトをモック化
const mockGetProperty = jest.fn();
const mockSetProperty = jest.fn();
const mockSetProperties = jest.fn();

global.PropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: mockGetProperty,
    setProperty: mockSetProperty,
    setProperties: mockSetProperties,
  }),
} as any;

global.DriveApp = {
  getFolderById: jest.fn().mockReturnValue({
    getName: () => 'TestFolder',
  }),
} as any;

describe('DriveItemsArchiver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトのプロパティ戻り値を設定
    mockGetProperty.mockImplementation((key: string) => {
      if (key === Const.PROPERTY_KEYS.JSON_FOLDER_ID) return 'folder_123';
      if (key === Const.PROPERTY_KEYS.TARGET_SHARED_DRIVE_ID)
        return 'drive_A,drive_B';
      return null;
    });
  });

  it('コンストラクタ：プロパティからIDを正しく読み込むこと', () => {
    const archiver = new DriveItemsArchiver('TestDrive', false);
    expect(archiver).toBeDefined();
    expect(mockGetProperty).toHaveBeenCalledWith(
      Const.PROPERTY_KEYS.JSON_FOLDER_ID
    );
  });
});

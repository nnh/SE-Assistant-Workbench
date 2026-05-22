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
import { SharedDrivePolicyReportGenerator } from '../src/core/policy/sharedDrivePolicyReportGenerator'; // パスは環境に合わせて調整
import { DriveApiService } from '../src/common/driveApiService';
import { FileUtils } from '../src/common/fileUtils';
import * as Const from '../src/common/const';

// 1. 外部サービスのモック化（使うメソッドだけ最低限偽装）
jest.mock('../src/common/driveApiService');
jest.mock('../src/common/fileUtils');

describe('SharedDrivePolicyReportGenerator', () => {
  let generator: SharedDrivePolicyReportGenerator;
  let mockGetProperty: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // props.getProperty が呼ばれたときの振る舞いを定義
    mockGetProperty = jest.fn((key: string) => {
      // 親クラス (BaseReport) のコンストラクタが要求するキーにはダミーの値を返す
      if (key === Const.PROPERTY_KEYS.POLICY_REPORT_JSON_FOLDER_ID) {
        return 'dummy_folder_id_123';
      }
      if (key === Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID) {
        return 'dummy_spreadsheet_id_123';
      }
      return null;
    });

    // 1. PropertiesService のモック
    global.PropertiesService = {
      getScriptProperties: jest.fn().mockReturnValue({
        getProperty: mockGetProperty,
        setProperty: jest.fn(),
      }),
    } as any;

    // 2. DriveApp のモック（←これを追加！）
    global.DriveApp = {
      getFolderById: jest.fn().mockReturnValue({
        // 必要に応じて、フォルダオブジェクトが持つメソッド（getName等）をここに生やす
        getName: jest.fn().mockReturnValue('dummy_folder_name'),
      }),
    } as any;

    // 3. SpreadsheetApp のモック（エラーは出ていませんが、先々必要になるため予防措置）
    global.SpreadsheetApp = {
      openById: jest.fn().mockReturnValue({
        getSheetByName: jest.fn(),
        insertSheet: jest.fn(),
      }),
    } as any;

    generator = new SharedDrivePolicyReportGenerator();
  });

  // -------------------------------------------------------------
  // テストケース1: 【正常系】プロパティからドライブIDが正しく取得できて保存されるか
  // -------------------------------------------------------------
  test('fetchAndSaveDriveGet: ドライブIDが正しく分割され、情報が保存されること', () => {
    // カンマ区切り、前後のスペース、空要素が含まれる模擬データを返す
    mockGetProperty.mockReturnValue(' id1,  id2 , , id3 ');

    // APIから返ってくるダミーデータ
    (DriveApiService.fetchDriveInfo as jest.Mock).mockImplementation(
      (id: string) => ({
        id: id,
        name: `Drive-${id}`,
        restrictions: {},
        capabilities: {},
      })
    );

    // ファイル名生成のダミー
    (FileUtils.generateJsonFileName as jest.Mock).mockReturnValue(
      'dummy_file.json'
    );

    // 実行
    generator.fetchAndSaveDriveGet();

    // 検証A: APIが空要素を除いた「3回」正しく呼ばれたか
    expect(DriveApiService.fetchDriveInfo).toHaveBeenCalledTimes(3);
    expect(DriveApiService.fetchDriveInfo).toHaveBeenNthCalledWith(1, 'id1');
    expect(DriveApiService.fetchDriveInfo).toHaveBeenNthCalledWith(2, 'id2');
    expect(DriveApiService.fetchDriveInfo).toHaveBeenNthCalledWith(3, 'id3');

    // 検証B: 最終的にファイル保存処理が1回呼ばれたか
    expect(FileUtils.saveAsJsonFile).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------
  // テストケース2: 【異常系】プロパティが空だった場合にエラーを投げるか
  // -------------------------------------------------------------
  test('fetchAndSaveDriveGet: ドライブIDが設定されていない場合エラーになること', () => {
    // フォルダID等は通しつつ、ドライブIDのキーが呼ばれたときだけ空文字を返すように上書き
    mockGetProperty.mockImplementation((key: string) => {
      if (key === Const.PROPERTY_KEYS.POLICY_REPORT_TARGET_DRIVE_IDS) {
        return ''; // ドライブIDを空にする
      }
      // それ以外は初期設定の値を返す
      if (key === Const.PROPERTY_KEYS.POLICY_REPORT_JSON_FOLDER_ID)
        return 'dummy_folder_id_123';
      if (key === Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID)
        return 'dummy_spreadsheet_id_123';
      return null;
    });

    // 実行するとエラーが発生することを検証
    expect(() => {
      generator.fetchAndSaveDriveGet();
    }).toThrow(
      '共有ドライブ設定レポートの対象ドライブIDが設定されていません。'
    );
  });
});

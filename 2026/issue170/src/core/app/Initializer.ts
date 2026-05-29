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
import * as Const from '../../common/const';

class ProjectInitializer {
  /**
   * 全体の初期処理：必要なスクリプトプロパティの雛形を一括作成する
   */
  public static initProperties(): void {
    try {
      console.log('スクリプトプロパティの初期化処理を開始します。');
      const props = PropertiesService.getScriptProperties();

      // 登録したいプロパティのキーと、開発者に設定してもらうための雛形値（デフォルト値）の定義
      const propertyTemplates: Record<string, string> = {
        [Const.PROPERTY_KEYS.JSON_FOLDER_ID]:
          'SET_YOUR_JSON_SAVE_FOLDER_ID_HERE',
        [Const.PROPERTY_KEYS.POLICY_REPORT_TARGET_DRIVE_IDS]:
          'SET_YOUR_POLICY_REPORT_TARGET_DRIVE_IDS',
        [Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID]:
          'SET_YOUR_OUTPUT_SPREADSHEET_ID_HERE',
        [Const.PROPERTY_KEYS.PERMISSION_JSON_FOLDER_ID]:
          'SET_YOUR_PERMISSION_JSON_FOLDER_ID_HERE',
      };

      let createdCount = 0;
      let skippedCount = 0;

      // 定義したテンプレートをループして登録
      for (const [key, defaultValue] of Object.entries(propertyTemplates)) {
        const currentValue = props.getProperty(key);

        if (currentValue === null) {
          // プロパティがまだ存在しない場合のみ、雛形値で新規作成
          props.setProperty(key, defaultValue);
          console.log(
            `[Property Created] キー「${key}」の雛形を作成しました。`
          );
          createdCount++;
        } else {
          // すでに値がある場合は、開発者が設定した値を上書きしないようにスキップ
          console.log(
            `[Property Skipped] キー「${key}」は既に存在するためスキップしました。`
          );
          skippedCount++;
        }
      }

      console.log(
        `初期化処理が完了しました。（新規作成: ${createdCount} 件, スキップ: ${skippedCount} 件）`
      );
      console.log(
        '※「SET_YOUR_...」となっているプロパティに、実際のGoogleドライブのID等を設定してください。'
      );
    } catch (error) {
      console.error('プロパティ初期化処理でエラーが発生しました:', error);
      throw error;
    }
  }
}

/**
 * GASのエディタ画面から手動で実行するためのエントリーポイント
 * スクリプトエディタの関数一覧から「setupProjectProperties」を選択して実行します。
 */
export const setupProjectProperties_ = () =>
  ProjectInitializer.initProperties();

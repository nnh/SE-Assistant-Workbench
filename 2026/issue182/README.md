# issue182 共有ドライブ ファイル一覧 / ウェブ公開状態チェック

スプレッドシートにバインドした Google Apps Script（[aside](https://github.com/google/aside) 構成）プロジェクトです。TypeScript で記述し、rollup でバンドルして `dist/` を clasp で push します。

## 機能

| エントリポイント | 内容 |
| --- | --- |
| `listSharedDriveFiles` | スクリプトプロパティで指定した共有ドライブ配下のドキュメント・スプレッドシートの ID とファイル名を取得し、「ファイル一覧」シートに出力する |
| `checkAroExternalSharePublishStatus` | 「ARO外部共有」シートのファイルがウェブに公開（Publish to web）されているか判定する |
| `checkAroInternalSharePublishStatus` | 「ARO内部のみ共有」シートに対して同上 |

実行できるのは上記 3 つのみです。末尾に `_` が付いた関数（`updatePublishStatus_` など）は GAS の private 関数で、エディタの実行メニューには表示されません。

## ファイル構成

```
src/
  index.ts            … エントリポイント（実行用関数のみ）
  sharedDriveFiles.ts … 共有ドライブのファイル一覧取得処理
  publishStatus.ts    … ウェブ公開状態の判定処理
  constants.ts        … 定数定義
appsscript.json       … マニフェスト（タイムゾーン Asia/Tokyo、Drive 高度サービス v3 を有効化）
```

## 事前準備

### スクリプトプロパティ（`listSharedDriveFiles` で必要）

スクリプトエディタ → プロジェクトの設定 → スクリプトプロパティに以下を追加します。

| キー | 値 |
| --- | --- |
| `SHARED_DRIVE_ID` | 対象の共有ドライブの ID（フォルダではなく共有ドライブ自体の ID） |

※ スクリプトプロパティはプロジェクトごとに個別設定が必要です。

## 各機能の仕様

### listSharedDriveFiles

- 共有ドライブ全体を 1 クエリでフラット検索するため、フォルダ階層の深さに依存しません。
- API 呼び出し回数 ＝ ⌈対象ファイル数 ÷ 1000⌉。出力は「ファイル一覧」シートに `種別 / ファイル名 / ID` を一括書き込みします。

### checkAroExternalSharePublishStatus / checkAroInternalSharePublishStatus

対象シートの列構成（1 行目はヘッダー、2 行目以降がデータ）:

| 列 | 内容 |
| --- | --- |
| C | ファイル ID |
| D | 空白でなければその行をスキップ |
| E | 判定結果の出力先（`公開` / `非公開`、取得失敗時は `エラー: ...`） |

- スキップ条件: C 列が空、D 列が空白でない、または E 列に既に値がある行。
- 1 ファイルにつき Drive API（`Revisions.list`）を 1 回呼び出します。
- GAS の実行時間（6 分）制限を超えないよう、開始から約 5 分で処理を打ち切り、それまでの結果を E 列へ書き戻します。
- 未処理行は E 列が空のまま残るので、**未処理が 0 になるまで同じエントリポイントを繰り返し実行**してください。

> 対象が数千件規模の場合、1 ファイル＝1 API 呼び出しのため数回に分けた実行が必要です。

## 開発・デプロイ

```bash
npm install        # 依存関係のインストール
npm run build      # TypeScript を dist/ にバンドル
npm run deploy     # dev 環境（.clasp-dev.json）へ push
npm run deploy:prod # prod 環境（.clasp-prod.json）へ push
```

- `.clasp-dev.json` … 1 つ目のスプレッドシート（dev、既定）
- `.clasp-prod.json` … 2 つ目のスプレッドシート（prod）
- `deploy` / `deploy:prod` は対応する設定を `.clasp.json` にコピーしてから push します。

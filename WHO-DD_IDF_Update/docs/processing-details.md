# 処理の詳細

WHO-DD・IDF・MedDRAのZIPファイルについて、BOXおよびS3への格納時に対象とするファイルとリネーム有無をまとめる。

## BOX格納（ダウンロードしたZIPファイルそのまま）

ZIP内を展開せず、ダウンロードしたZIPファイル自体をそのままアップロードする（[upload-box.R](../programs/upload-box.R)）。

| 対象 | 格納先フォルダ | リネーム | 備考 |
|---|---|---|---|
| MedDRA | `MedDRA/圧縮ファイル` | なし | パスワードファイル（`<zip名>_pw.txt`）も同フォルダに格納 |
| WHO-DD | `WHO-DD/圧縮ファイル` | なし | |
| IDF | `IDF/圧縮ファイル` | なし | パスワードファイルも同フォルダに格納 |

## S3格納（ZIPを展開し、特定ファイルのみ抽出してアップロード）

格納先プレフィックス: `WHO-DD_IDF/<バージョンフォルダ名>/WHODD/`, `WHO-DD_IDF/<バージョンフォルダ名>/IDF/`

`<バージョンフォルダ名>`はWHO-DD ZIPのファイル名から `WHODrug Japan CRT` と `.zip` を除去した文字列。
例: `WHODrug Japan CRT 2025 Sep 1.zip` → `2025 Sep 1`

### WHO-DD（`WHODD/`配下）

| 元ファイル名 | 変更後ファイル名 |
|---|---|
| `IDMapping.csv` | `IDMapping.csv`（変更なし） |
| `WHODDsGenericNames.csv` | `WHODDsGenericNames.csv`（変更なし） |
| `Version.txt` | `Version.txt`（変更なし） |

### IDF（`IDF/`配下）

| 元ファイル名 | 変更後ファイル名 |
|---|---|
| `全件.txt` | `data.txt` |
| `英名＜可変長＞.txt` | `full_en.txt` |
| `全件＜可変長＞.txt` | `full_ja.txt` |

（[upload-s3.R](../programs/upload-s3.R)）

### MedDRA

- **対象ファイル:** ZIP展開後の `<トップディレクトリ>/ASCII/<*_UTF8のディレクトリ>/` 配下の全ファイル（個別指定ではなく、ディレクトリ内の全ファイルを対象）
- **リネーム:** なし（元のファイル名のまま）
- **格納先:** `MedDRA/<version>/`（例: `MedDRA/28.1/`。versionはZIPファイル名の数字部分を整形したもの）

（[upload-meddra-s3.R](../programs/upload-meddra-s3.R)）

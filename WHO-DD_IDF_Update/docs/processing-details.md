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
| `Version.csv`または`Version.txt` | 同名（変更なし） |

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

## BOX格納（展開後ファイル、S3と同じファイル群）

S3にアップロードする対象ファイル・リネーム内容は上記と同じ。格納先はconfig.txtの`kBoxExtractedDirId`で指定したフォルダの配下で、フォルダが存在しない場合は自動作成される。

| 対象 | 格納先フォルダ |
|---|---|
| WHO-DD | `<kBoxExtractedDirId>/WHO-DD_IDF/<バージョンフォルダ名>/WHODD/` |
| IDF | `<kBoxExtractedDirId>/WHO-DD_IDF/<バージョンフォルダ名>/IDF/` |
| MedDRA | `<kBoxExtractedDirId>/MedDRA/<version>/` |

WHO-DD・IDFの`<バージョンフォルダ名>`はS3格納時と同じ（WHO-DD ZIPのファイル名から `WHODrug Japan CRT` と `.zip` を除去した文字列。例: `2025 Sep 1`）。MedDRAの`<version>`はS3格納時と同じバージョン文字列（例: `28.1`）。

（[box-functions.R](../programs/functions/box-functions.R)の`UploadToBox`）

## FORGE用辞書データファイルの出力

`upload-s3.R`・`upload-meddra-s3.R`・`upload-box-extracted.R`の最後に、S3・BOXへのアップロード対象と同じ展開ファイルから、FORGE(stat-forge)のWeb版が読み込む辞書データファイルを作成する。出力先はconfig.txtの`kForgeDataDir`で指定したフォルダ（FORGEの`dictionary_data`）。出力内容はFORGEのWeb版でバージョンフォルダをドラッグ&ドロップした場合と同じ。

| 対象 | 出力ファイル | 使用するファイル | 出力列 |
|---|---|---|---|
| MedDRA | `<kForgeDataDir>/meddra/<version>.js` | `soc.asc`・`soc_hlgt.asc`・`hlgt.asc`・`hlgt_hlt.asc`・`hlt.asc`・`hlt_pt.asc`・`pt.asc`・`llt.asc` | llt_code, llt_name, pt_code, pt_name, hlt_code, hlt_name, hlgt_code, hlgt_name, soc_code, soc_name |
| WHO-DD・IDF | `<kForgeDataDir>/who_drug/<バージョンフォルダ名>.js` | `data.txt`・`full_en.txt`・`IDMapping.csv`・`WHODDsGenericNames.csv` | drug_code, full_name_en, generic_name_en |

- ファイル名は、バージョン名に含まれる英数字・`.`・`_`・`-`以外の文字を`_`に置き換えたもの（例: `2025 Sep 1` → `2025_Sep_1.js`）
- 出力後、`<kForgeDataDir>/versions.js`の該当する一覧に`{label, file}`を追加する（同じlabelがあれば上書き）
- 日本語名のファイル（MedDRAの`*_j.asc`、IDFの`full_ja.txt`）は使用しない

（[forge-dictionary-functions.R](../programs/functions/forge-dictionary-functions.R)）

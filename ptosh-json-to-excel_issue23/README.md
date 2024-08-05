# JSON to Excel Converter

このプログラムはR言語で書かれており、R Studioでの実行を前提としています。入力としてJSONファイルを処理し、出力として.xlsxファイルを生成します。

## 使用手順
1. リポジトリの [Code] ボタンをクリックし、[Download ZIP] を選択してZIPファイルをダウンロードします。

2. ダウンロードしたZIPファイルを適当なディレクトリに「すべて展開」します。 初期状態では`input`フォルダ、`output`フォルダに`dummy`というファイルが存在します。処理に影響はありませんが、不要であれば削除して下さい。

1. R Studioを開きます。

2. R Studioのメニューから [File] > [New Project...] を選択します。

3. [New Project] ダイアログが表示されたら、[Existing Directory] を選択します。

4. [Project working directory] > [Browse...] を選択します。 先ほど「すべて展開」したフォルダを選択し、[ptosh-json-to-excel-master] > [ptosh-json-to-excel-master] を開いて[Open] を選択します。

6. [Create Project] ボタンをクリックしてプロジェクトを開きます。

1. JSONファイルを `input` ディレクトリに格納してください。ファイルの拡張子は必ず `.json` である必要があります。 

2. [File] > [Open File...]から、`prg/json_to_excel.R` ファイルを開いてください。
   
4. `source` をクリックし、 画面左下のconsoleに「処理が終了しました。」と出るまでお待ちください。 処理の途中で「パブリックネットワークとプライベートネットワークにこのアプリのアクセスを許可しますか？」というWindowsセキュリティのポップアップが出た場合は、「キャンセル」をクリックして下さい。

5. 処理されたJSONファイルに対応する.xlsxファイルが `output/output_処理年月/` ディレクトリに出力されます。`output_処理年月`のフォルダは自動で作成されます。

7. 上記ディレクトリ内には、プログラムが生成した `list` フォルダがあり、その中には入力JSONファイルの内容を集計した `checklist.xlsx` が出力されます。

## ディレクトリ構造
```
ptosh-json-to-excel
├── LICENSE
├── README.md
├── input
│   ├── aaa.json
│   └── zzz.json
├── output
│   └── output_YYYYMMDDHHMMSS
│       ├── aaa.xlsx
│       ├── list
│       │   └── checklist.xlsx
│       └── zzz.xlsx
├── prg
│   ├── functions
│   └── json_to_excel.R
└── tools
```

## 注意事項

- プログラムが前提とするディレクトリ構造が整っていることを確認してください。

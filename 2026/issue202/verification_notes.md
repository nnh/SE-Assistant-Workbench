# File System Access API 動作検証メモ (issue #202)

検証用ツール: [fsa_test.html](fsa_test.html) を `file://` で直接開いて確認する。

## 検証環境

- OS: Windows
- ブラウザ: Chrome, Edge(いずれもWindows端末上で確認)

## 確認項目と結果

| # | 確認項目 | Chrome | Edge | 備考 |
|---|---|---|---|---|
| 1 | `showDirectoryPicker()` で file:// ページから任意のフォルダへのアクセスを許可できるか | ○ | ○ | Chrome: `showDirectoryPicker成功: name=26.0`。 |
| 2 | 許可したフォルダの中身を列挙できるか (`dirHandle.entries()`) | ○ | ○ | Chrome: `entries()列挙成功: 22件`(Edgeで書き込んだ分含む)→書き込み後`23件`と正しく反映。 |
| 3 | 許可したフォルダに新規ファイルを書き込めるか (`getFileHandle(create:true)` → `createWritable()`) | ○ | ○ | Chrome: `ファイル書き込み成功: fsa-test-1787813283875.txt`。件数22→23に増加。 |
| 4 | ハンドルをIndexedDBに保存し、ページをリロードしても `queryPermission()` で権限が残っているか(ピッカー再表示なしで再アクセス可能か) | ○ | ○ | Chrome: リロード後に`起動時チェック: 保存済みハンドルあり`→`queryPermission結果: granted`、`entries()`も23件で正常取得。 |
| 5 | ブラウザを再起動した後も同様に権限が残るか | △ | △ | Chrome: 完全終了→再起動後は`起動時チェック: 保存済みハンドルあり`だがハンドルは残るものの`queryPermission結果: prompt`となり権限は失効。`requestPermission()`を呼ぶと(フルのフォルダ選択ダイアログなしで)`granted`に復帰し、`entries()`も正常に再取得できた。Edgeと完全に同じ挙動。 |
| 6 | Chrome・Edgeで1〜5に差がないか | | ○ | 項目1〜5すべてでChrome・Edgeの挙動は一致(再起動後に`prompt`へ戻る点も含め差異なし)。 |

(○=問題なし / △=一部制限あり / ×=動作しない、で記入してください)

## 手順

1. `fsa_test.html` をブラウザにドラッグ&ドロップ、または `file://` パスを直接開く。
2. 「① フォルダを選択」でテスト用フォルダを選ぶ。一覧表示とIndexedDBへの保存ログを確認。
3. 「③ テストファイルを書き込む」でファイルが実際に作成されるか確認。
4. ページをリロードし、「保存済みハンドルの権限を確認」を押す。`queryPermission` の結果が `granted` ならピッカーなしで再アクセスできている。`prompt` の場合は「権限を再要求」で `requestPermission()` を試す。
5. ブラウザを完全に再起動し、手順4を再実施。
6. 同じ手順をもう一方のブラウザ(Chrome/Edge)でも実施し、差異を記録。

## file:// 特有の制限・気づいた点

- Edgeでは file:// ページからの `showDirectoryPicker()`、`entries()` 列挙、`createWritable()` 書き込みがいずれも問題なく動作した。
- IndexedDBに保存したディレクトリハンドルは、ページ再読み込み後も `queryPermission()` が `granted` を返し、ピッカーを開き直す必要がなかった(項目4クリア)。
- 「保存済みハンドルを削除」→再度フォルダ選択、という一連の操作もエラーなく動作。
- 項目5: プロセス完全終了→再起動直後は `queryPermission()` が `prompt` を返し、権限は自動では復元されない。ただしハンドル自体はIndexedDBに残っており、`requestPermission()` を呼ぶだけで(`showDirectoryPicker()`を再度呼ばずに)`granted`へ復帰でき、`entries()`も正常に再取得できた。→ **ブラウザ再起動後でも、ユーザーに一度だけ許可確認をしてもらえば、フォルダ選択のやり直しなしで再アクセスできる**、というのがEdgeでの結論。
- Chrome・Edgeで同じテスト用フォルダ(`26.0`)を共有しているため、片方のブラウザで書き込んだファイルがもう片方の`entries()`件数にも反映される(相互に影響する点に注意。別々にテストする場合はフォルダを分けた方が結果が読みやすい)。
- Chromeも項目1〜5すべてEdgeと同じ結果(再起動後`prompt`に戻り、`requestPermission()`だけで`granted`に復帰する点も含む)。Chrome・Edgeで挙動差は見られなかった。

## issue190への提言

- 第1段階の設計(D&Dによる辞書登録)をそのまま進めてよいか: 進めてよい。`showDirectoryPicker()`+IndexedDB保存+`queryPermission()`/`requestPermission()`というアプローチはfile://環境でChrome・Edgeともに動作し、両ブラウザで挙動差もなかった。
  - ただし前提として、ブラウザを完全に再起動した後は権限が`prompt`に戻るため、**フォルダの選び直しは不要だが、`requestPermission()`によるユーザー操作を伴う再許可は毎回起き得る**、という体験を織り込んでUI設計する必要がある(完全に無人・自動での復帰はできない)。
  - リロード程度(ページ更新やタブの再読み込み)であれば権限は保持されるため、通常の利用中は再許可なしで動作する。
- 代替案が必要な場合、その理由と方向性: 特になし。今回の制限(再起動後の再許可)はFile System Access APIの仕様上の制約であり、file://固有の問題ではないため、第1段階の設計を変更する必要はない。UI側で「再起動後に一度だけ許可を求められる場合がある」旨をユーザーに示す程度の対応で十分と考える。

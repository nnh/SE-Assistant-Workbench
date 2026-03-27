function extractSpecificRowsByGroup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getActiveSheet();
  const lastRow = sourceSheet.getLastRow();
  
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("データがありません。");
    return;
  }

  // 全データを取得 (A列からG列までを想定)
  const lastCol = sourceSheet.getLastColumn();
  const data = sourceSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const header = sourceSheet.getRange(1, 1, 1, lastCol).getValues()[0];

  // 管理番号(G列: インデックス6)ごとにデータを分類
  const groups = {};
  
  data.forEach(row => {
    const groupKey = row[6]; // G列
    if (!groupKey) return; // 管理番号がない行はスキップ

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(row);
  });

  const outputData = [];

  // 各グループ内で条件に合う行を特定
  for (let key in groups) {
    const rows = groups[key];
    
    let oldest = rows[0];
    let newest = rows[0];
    let withAttachments = [];

    rows.forEach(row => {
      const date = new Date(row[0]); // A列: 受信日時
      const attachmentInfo = String(row[5]); // F列: 添付情報

      // 1. 一番古い日時を更新
      if (date < new Date(oldest[0])) oldest = row;
      
      // 2. 一番新しい日時を更新
      if (date > new Date(newest[0])) newest = row;
      
      // 3. 添付ファイルがある行（F列が「なし」以外）
      if (attachmentInfo !== "なし" && attachmentInfo !== "") {
        withAttachments.push(row);
      }
    });

    // 重複を避けるため、Set（ユニークな行の文字列表現など）を使わず
    // 順番に追加（同じ行が「最新かつ添付あり」などの場合は複数出る可能性があります）
    outputData.push(oldest);
    if (newest !== oldest) outputData.push(newest);
    
    withAttachments.forEach(attRow => {
      // すでに追加した行(oldest/newest)と重複していない場合のみ追加したい場合はここでチェック
      if (attRow !== oldest && attRow !== newest) {
        outputData.push(attRow);
      }
    });
  }

  // --- 出力処理 ---
  const newSheetName = "抽出結果_" + Utilities.formatDate(new Date(), "JST", "MMdd_HHmm");
  const exportSheet = ss.insertSheet(newSheetName);
  
  // ヘッダーの書き込み
  exportSheet.getRange(1, 1, 1, header.length).setValues([header]);
  
  // データの書き込み
  if (outputData.length > 0) {
    exportSheet.getRange(2, 1, outputData.length, lastCol).setValues(outputData);
    
    // 見栄えの調整
    exportSheet.getRange(1, 1, 1, lastCol).setBackground("#d9ead3").setFontWeight("bold");
    exportSheet.autoResizeColumns(1, lastCol);
    
    SpreadsheetApp.getUi().alert("新しいシート「" + newSheetName + "」に抽出しました。");
  } else {
    SpreadsheetApp.getUi().alert("条件に合うデータが見つかりませんでした。");
  }
}

function extractControlNumbersToG() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("データがありません。");
    return;
  }

  // B列（件名）の2行目から最後までのデータを取得
  const subjects = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  
  // 出力用の配列（G列用）
  const results = [];
  
  // 正規表現パターンの定義
  const cmPattern = /CM-[A-Z0-9-]+/i;         // CM-から始まる英数字とハイフン
  const refPattern = /\[\s?ref:.*?\s?\]/i;    // [ ref: ... ] 形式
  
  for (let i = 0; i < subjects.length; i++) {
    const subject = subjects[i][0];
    let extractedId = ""; // 見つからない場合は空白
    
    if (subject) {
      // 1. CM番号を優先的に探す
      const cmMatch = subject.match(cmPattern);
      if (cmMatch) {
        extractedId = cmMatch[0];
      } else {
        // 2. なければ ref ID を探す
        const refMatch = subject.match(refPattern);
        if (refMatch) {
          extractedId = refMatch[0];
        }
      }
    }
    results.push([extractedId]);
  }

  // G列（7列目）の見出しを設定
  sheet.getRange(1, 7).setValue("管理番号/ref ID");
  
  // G列の2行目から結果を一括書き込み
  sheet.getRange(2, 7, results.length, 1).setValues(results);

  SpreadsheetApp.getUi().alert("G列に管理番号の抽出が完了しました。");
}

function checkAllAttachments() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  
  // 1行目はヘッダーなので、データがない（2行目未満）場合は終了
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("処理するデータがありません。");
    return;
  }

  // D列（4列目）の2行目から最後までのメールIDを取得
  const idRange = sheet.getRange(2, 4, lastRow - 1, 1);
  const idValues = idRange.getValues();
  
  // 結果を格納する配列（F列用）
  const results = [];

  // 各IDに対して添付ファイルをチェック
  for (let i = 0; i < idValues.length; i++) {
    const messageId = idValues[i][0];
    
    if (!messageId) {
      results.push(["IDなし"]);
      continue;
    }

    try {
      const message = GmailApp.getMessageById(messageId);
      const attachments = message.getAttachments();
      
      if (attachments.length > 0) {
        // 添付がある場合は「あり」とファイル名を表示
        const names = attachments.map(a => a.getName()).join(", ");
        results.push(["あり (" + names + ")"]);
      } else {
        results.push(["なし"]);
      }
    } catch (e) {
      // IDが無効な場合などのエラーハンドリング
      results.push(["エラー: 取得失敗"]);
    }
  }

  // F列（6列目）の2行目から結果を一括書き込み
  sheet.getRange(2, 6, results.length, 1).setValues(results);
  
  SpreadsheetApp.getUi().alert("F列に添付ファイルの有無を出力しました。");
}

function extractClarivateEmails() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // 検索条件: 送信ドメイン、件名、および 2024/03/01 以降
  const query = 'from:clarivate.com subject:(CM-) after:2024/03/01';
  
  const threads = GmailApp.search(query);
  const results = [];
  
  // 見出し行（メールIDを追加）
  results.push(["受信日時", "件名", "送信元", "メールID", "本文(抜粋)"]);
  
  threads.forEach(thread => {
    const messages = thread.getMessages();
    messages.forEach(message => {
      const subject = message.getSubject();
      const from = message.getFrom();
      const messageId = message.getId(); // PDF化に利用するID
      
      // 厳密な条件チェック
      if (from.includes('@clarivate.com') && subject.indexOf('CM-') !== -1) {
        results.push([
          message.getDate(),
          subject,
          from,
          messageId,
          message.getPlainBody().substring(0, 100)
        ]);
      }
    });
  });
  
  sheet.clear();
  if (results.length > 0) {
    sheet.getRange(1, 1, results.length, results[0].length).setValues(results);
    SpreadsheetApp.getUi().alert(results.length - 1 + " 件のメールを抽出しました。D列のIDを使ってPDF化できます。");
  } else {
    SpreadsheetApp.getUi().alert("該当するメールは見つかりませんでした。");
  }
}
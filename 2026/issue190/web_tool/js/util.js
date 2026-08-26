// 汎用ユーティリティ(CSV変換・ダウンロード・乱数系)

// 配列からランダムに1件選ぶ
function sampleOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// check_box: radio_buttonと異なり複数選択が可能なため、実際の選択肢("" を除く)から1個以上を
// ランダムに選び、カンマ区切りで1つの文字列に結合する(選ぶ個数自体もランダムにすることで、
// 単一選択と複数選択が混在するようにする)。""が選択肢に含まれる場合(必須でない項目)は、
// 未選択(空欄)になることもある。Rのsample_check_box_values()に対応
function sampleCheckBoxValues(choices, n) {
  const realChoices = choices.filter((c) => c !== "");
  const hasBlank = choices.includes("");
  if (realChoices.length === 0) {
    return Array(n).fill(hasBlank ? "" : null);
  }
  const values = [];
  for (let i = 0; i < n; i += 1) {
    if (hasBlank && Math.random() < 0.5) {
      values.push("");
      continue;
    }
    const k = 1 + Math.floor(Math.random() * realChoices.length);
    const shuffled = [...realChoices].sort(() => Math.random() - 0.5);
    values.push(shuffled.slice(0, k).join(","));
  }
  return values;
}

// startDateStr〜endDateStr(YYYY-MM-DD)の間のランダムな日付文字列(YYYY-MM-DD)を返す
function randomDateBetween(startDateStr, endDateStr) {
  const start = new Date(startDateStr).getTime();
  const end = new Date(endDateStr).getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  // Rのgenerate_random_date()と同様、日未満の端数を持たせない(丸めてから日付化する)
  const randomDay = Math.floor(start / oneDay + Math.random() * ((end - start) / oneDay + 1));
  return new Date(randomDay * oneDay).toISOString().slice(0, 10);
}

// tibble的な行オブジェクトの配列をCSV文字列に変換する。
// RのNA相当(null/undefined)は空欄として出力する(文字列としての"NA"とは区別するため)
function toCsv(rows, columns) {
  const escapeCell = (value) => {
    if (value === null || value === undefined) return "";
    const s = String(value);
    if (/[",\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const header = columns.map(escapeCell).join(",");
  const body = rows.map((row) => columns.map((col) => escapeCell(row[col])).join(",")).join("\n");
  return header + "\n" + body + "\n";
}

// CSV文字列をファイルとしてダウンロードさせる(file://で開いていてもBlob+aタグで動作する)
function downloadCsv(csvText, filename) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

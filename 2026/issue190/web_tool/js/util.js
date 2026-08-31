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

// date_vars同士がvalidate_date_after_or_equal_to/validate_date_before_or_equal_to(他フィールド参照)で
// 数珠つなぎに依存し合う場合、参照先が先に生成されていないと値を引けない。dateRefBounds(このdateVars同士の
// 依存だけ)を使って依存が無いものから順に並べ替える(トポロジカルソート。循環参照があれば残りは元の順のまま追加する。
// R版populate_date_fields()内のソート処理に対応)
function sortDateVarsByDependency(dateVars, dateRefBounds) {
  if (!dateRefBounds || dateRefBounds.length === 0 || dateVars.length <= 1) return dateVars;
  const dateVarSet = new Set(dateVars);
  const deps = dateRefBounds.filter((r) => dateVarSet.has(r.cdisc_variable) && dateVarSet.has(r.ref_cdisc_variable));
  const sorted = [];
  let remaining = [...dateVars];
  while (remaining.length > 0) {
    const remainingSet = new Set(remaining);
    const unresolved = new Set(deps.filter((d) => remainingSet.has(d.ref_cdisc_variable)).map((d) => d.cdisc_variable));
    const ready = remaining.filter((v) => !unresolved.has(v));
    if (ready.length === 0) {
      sorted.push(...remaining);
      break;
    }
    sorted.push(...ready);
    remaining = remaining.filter((v) => !ready.includes(v));
  }
  return sorted;
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
// RのNA相当(null/undefined)は空欄として出力する(文字列としての"NA"とは区別するため)。
// 改行はLF、先頭にBOM(U+FEFF)を付ける(Windows版Excelでの文字化け防止のため、
// UTF-8 with BOMとして出力する)
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
  return "\uFEFF" + header + "\n" + body + "\n";
}

// --- ZIP生成(外部ライブラリを使わず自前実装。file://でも動き、ドメイン数が増えて
// ダウンロードファイル数が多くなっても、常に1ファイルのダウンロードで完結させるため) ---

// ZIP形式のCRC-32計算用テーブル
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// 現在時刻を、ZIP形式のローカルファイルヘッダで使うDOS日時形式(2バイトずつ)にエンコードする
function toDosDateTime(date) {
  const time = ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((date.getSeconds() >> 1) & 0x1f);
  const dosDate = (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0xf) << 5) | (date.getDate() & 0x1f);
  return { time, dosDate };
}

// files([{name, content(文字列)}, ...])から、圧縮なし(store方式)のZIPファイルをBlobとして組み立てる。
// ZIP形式(ローカルファイルヘッダ+データ を各ファイル分、続いて中央ディレクトリ、
// 最後に終端レコード)を直接バイト列で書き出す
function buildZipBlob(files) {
  const encoder = new TextEncoder();
  const { time, dosDate } = toDosDateTime(new Date());
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const crc = crc32(contentBytes);
    const size = contentBytes.length;

    const localHeader = new DataView(new ArrayBuffer(30));
    localHeader.setUint32(0, 0x04034b50, true); // ローカルファイルヘッダの署名
    localHeader.setUint16(4, 20, true); // 解凍に必要なバージョン(2.0)
    localHeader.setUint16(6, 0, true); // 汎用フラグ
    localHeader.setUint16(8, 0, true); // 圧縮方式(0=無圧縮)
    localHeader.setUint16(10, time, true);
    localHeader.setUint16(12, dosDate, true);
    localHeader.setUint32(14, crc, true);
    localHeader.setUint32(18, size, true); // 圧縮後サイズ
    localHeader.setUint32(22, size, true); // 圧縮前サイズ
    localHeader.setUint16(26, nameBytes.length, true);
    localHeader.setUint16(28, 0, true); // 拡張フィールド長
    localParts.push(new Uint8Array(localHeader.buffer), nameBytes, contentBytes);

    const centralHeader = new DataView(new ArrayBuffer(46));
    centralHeader.setUint32(0, 0x02014b50, true); // 中央ディレクトリファイルヘッダの署名
    centralHeader.setUint16(4, 20, true); // 作成時バージョン
    centralHeader.setUint16(6, 20, true); // 解凍に必要なバージョン
    centralHeader.setUint16(8, 0, true);
    centralHeader.setUint16(10, 0, true);
    centralHeader.setUint16(12, time, true);
    centralHeader.setUint16(14, dosDate, true);
    centralHeader.setUint32(16, crc, true);
    centralHeader.setUint32(20, size, true);
    centralHeader.setUint32(24, size, true);
    centralHeader.setUint16(28, nameBytes.length, true);
    centralHeader.setUint16(30, 0, true); // 拡張フィールド長
    centralHeader.setUint16(32, 0, true); // コメント長
    centralHeader.setUint16(34, 0, true); // ディスク番号
    centralHeader.setUint16(36, 0, true); // 内部属性
    centralHeader.setUint32(38, 0, true); // 外部属性
    centralHeader.setUint32(42, offset, true); // ローカルヘッダへのオフセット
    centralParts.push(new Uint8Array(centralHeader.buffer), nameBytes);

    offset += 30 + nameBytes.length + contentBytes.length;
  });

  const centralDirOffset = offset;
  const centralDirSize = centralParts.reduce((sum, part) => sum + part.length, 0);

  const endRecord = new DataView(new ArrayBuffer(22));
  endRecord.setUint32(0, 0x06054b50, true); // 終端レコードの署名
  endRecord.setUint16(4, 0, true);
  endRecord.setUint16(6, 0, true);
  endRecord.setUint16(8, files.length, true);
  endRecord.setUint16(10, files.length, true);
  endRecord.setUint32(12, centralDirSize, true);
  endRecord.setUint32(16, centralDirOffset, true);
  endRecord.setUint16(20, 0, true); // コメント長

  return new Blob([...localParts, ...centralParts, new Uint8Array(endRecord.buffer)], { type: "application/zip" });
}

// files([{name, content}])を1つのZIPファイルとしてダウンロードさせる
function downloadZip(files, filename) {
  const blob = buildZipBlob(files);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

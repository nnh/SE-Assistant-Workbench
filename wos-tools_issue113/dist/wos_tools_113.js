function getPubMedInfo_(pubmedIdList) {
  const target = pubmedIdList.map(pubmedId => {
    if (String(pubmedId).length !== 8) {
      return [pubmedId, ''];
    }
    const url = `https://pubmed.ncbi.nlm.nih.gov/${pubmedId}/`;
    const response = UrlFetchApp.fetch(url);
    const html = response.getContentText();
    const title = html
      .match(/<h1 class="heading-title">([\s\S]*?)<\/h1>/)[1]
      .trim();
    return [pubmedId, title];
  });
  if (target.length === 0) {
    return null;
  }
  const outputSheet = createSheetWithTimestamp_(
    SpreadsheetApp.getActiveSpreadsheet(),
    'p'
  );
  outputSheet.getRange(1, 1, target.length, target[0].length).setValues(target);
  return outputSheet;
}

function getNhoInfoMain() {
  const checkTargetPubmedIdList = [
    35226565, 37868401, 37587626, 000746677900001,
  ];
  getNhoInfo_(checkTargetPubmedIdList);
}
function getNhoInfo_(checkTargetPubmedIdList) {
  const years = [2022, 2023, 2024];
  const outputSheet = getPubMedInfo_(checkTargetPubmedIdList);
  if (outputSheet === null) {
    return;
  }
  let startRow = outputSheet.getLastRow();
  // ホームページに掲載されているPMID
  const dummyPubmedIdList = [
    35092535, 35179645, 35305022, 35462552, 35594695, 35768778, 35612971,
    35964936, 36048237, 36239929, 36368892, 36478587, 36717188, 36849845,
    37012904, 37113581, 37183028, 37368907, 37458287, 37555797, 37669003,
    37864465, 37920961, 38156372, 38282201, 38375315, 38477374,
  ];
  const pubmedIdList = [...checkTargetPubmedIdList, ...dummyPubmedIdList];
  const target = years
    .map(year => {
      const months = Array.from({ length: 12 }, (_, i) =>
        (i + 1).toString().padStart(2, '0')
      );
      const res = months.map(month => {
        try {
          if (year === 2024 && parseInt(month) > 3) {
            return [null];
          }
          const url = `https://nho.hosp.go.jp/research/publication_${year}_${month}.html`;
          const response = UrlFetchApp.fetch(url);
          Utilities.sleep(1000);
          const html = response.getContentText();
          const check = pubmedIdList
            .map(pubmedId => {
              const temp = html.match(pubmedId);
              if (temp !== null) {
                return [`${year}${month}`, temp[0]];
              }
              return temp;
            })
            .filter(x => x !== null);
          return check;
        } catch (e) {
          return null;
        }
      });
      try {
        const res2 = res.filter(x => x.length > 0);
        return res2;
      } catch (e) {
        return [[null]];
      }
    })
    .flat()
    .flat()
    .filter(x => x !== null);
  startRow++;
  outputSheet
    .getRange(startRow, 1, 1, 1)
    .setValues([[`検索結果：${target.length}件`]]);
  // dummy出力チェック
  let dummyForCheck = [...dummyPubmedIdList];
  let targetForCheck = target.map(([_, id]) => Number(id));
  for (let i = 0; i <= dummyPubmedIdList.length; i++) {
    if (targetForCheck.includes(dummyForCheck[i])) {
      dummyForCheck[i] = null;
    }
  }
  const dummyCheck = dummyForCheck.every(x => x === null);
  startRow++;
  outputSheet
    .getRange(startRow, 1, 1, 2)
    .setValues([['dummyがすべて検索できていればTrue：', dummyCheck]]);
  if (!dummyCheck) {
    startRow++;
    const joinDummy = dummyCheckArray.join(',');
    outputSheet
      .getRange(startRow, 1, 1, 2)
      .setValues([['dummy出力NG：', joinDummy]]);
  }
  startRow++;
  outputSheet
    .getRange(startRow, 1, 1, 1)
    .setValues([['指定IDの出力チェック開始']]);
  checkTargetPubmedIdList.forEach(pubmedId => {
    const checkOutput = target
      .map(([ym, id]) => (String(pubmedId) === id ? ym : null))
      .filter(x => x !== null);
    const outputStr =
      checkOutput.length > 0 ? `出力あり：${checkOutput[0]}` : '出力なし';
    startRow++;
    outputSheet.getRange(startRow, 1, 1, 2).setValues([[pubmedId, outputStr]]);
  });
  startRow++;
  outputSheet
    .getRange(startRow, 1, 1, 1)
    .setValues([['指定IDの出力チェック終了']]);
}

function createSheetWithTimestamp_(spreadsheet, sheetnameStr) {
  // 現在の日時を取得
  const now = new Date();

  // YYYYMMDDHHMMSS形式にフォーマット
  const year = now.getFullYear();
  const month = ('0' + (now.getMonth() + 1)).slice(-2); // 月は0から始まるので+1
  const day = ('0' + now.getDate()).slice(-2);
  const hours = ('0' + now.getHours()).slice(-2);
  const minutes = ('0' + now.getMinutes()).slice(-2);
  const seconds = ('0' + now.getSeconds()).slice(-2);
  const timestamp = year + month + day + hours + minutes + seconds;

  // 新しいシートを作成
  const newSheet = spreadsheet.insertSheet(`${sheetnameStr}_${timestamp}`);

  // 作成したシートをアクティブに設定（任意）
  spreadsheet.setActiveSheet(newSheet);

  // 新しいシートを返す（任意）
  return newSheet;
}

function workDeleteSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.getSheets().forEach(sheet => {
    if (/^p_/.test(sheet.getName())) {
      ss.deleteSheet(sheet);
    }
  });
}

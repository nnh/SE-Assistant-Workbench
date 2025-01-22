function createEmptyArray_(length) {
  let temp = new Array(length).fill('');
  temp[0] = 99999;
  return temp;
}
function sortDataByColumns_(data) {
  data.sort((a, b) => {
    if (a[16] === b[16]) {
      return a[0] > b[0] ? 1 : -1;
    }
    return a[16] > b[16] ? 1 : -1;
  });

  return data;
}

function getHospInfo_() {
  const hospInfoId =
    PropertiesService.getScriptProperties().getProperty('hospInfoId');
  const hospInfo = SpreadsheetApp.openById(hospInfoId)
    .getSheetByName('base')
    .getDataRange()
    .getValues();
  const tempHospInfo = hospInfo.map((values, idx) => {
    if (idx === 0) {
      return [-99999, ...values];
    }
    const sortNo =
      values[3] === 'センター'
        ? 0
        : values[3] === '臨床研究部'
          ? 10000
          : values[3] === '院内標榜'
            ? 50000
            : 99999;
    return [sortNo + values[0], ...values];
  });
  return tempHospInfo;
}

function getFormValues_(propertyId, tempHospInfo) {
  const ss = SpreadsheetApp.openById(propertyId);
  const ss1FormValues = ss
    .getSheetByName('フォームの回答 1')
    .getDataRange()
    .getValues()
    .filter(x => x[0] !== '');
  const ss1CheckValues = ss1FormValues.map((x, idx) => {
    if (idx === 0) {
      return [...x, ...tempHospInfo[0]];
    }
    const nhoHospname = x[1].replace(/^NHO/i, '');
    const temp = tempHospInfo.filter(
      tempHospInfo => tempHospInfo[8] === nhoHospname
    );
    if (temp.length === 0) {
      const dummyHospInfo = createEmptyArray_(tempHospInfo[0].length);
      return [...x, ...dummyHospInfo];
    }
    const temp2 = tempHospInfo
      .map((tempHospInfo, idx) =>
        tempHospInfo[8] === nhoHospname ? idx : null
      )
      .filter(x => x !== null)
      .flat();
    return [...x, ...tempHospInfo[temp2]];
  });
  const ss1CheckValuesSort = sortDataByColumns_(ss1CheckValues);
  return [ss, ss1CheckValuesSort];
}
function checkValues_(ss, values) {
  // 実績・貢献・環境
  console.log(ss.getName());
  const ss1Ans1 = ss
    .getSheetByName('実績・貢献・環境')
    .getDataRange()
    .getValues()
    .filter(x => x[0] !== '');
  const ss1Ans1Check = ss1Ans1.map(x => [
    x[1],
    x[2],
    x[3],
    x[4],
    x[5],
    x[6],
    x[7],
    x[8],
  ]);
  const ss1Values1 = values.map(x => [
    x[1],
    x[20],
    x[21],
    x[22],
    x[2],
    x[3],
    x[4],
    x[5],
  ]);
  for (let i = 1; i < ss1Ans1Check.length; i++) {
    for (let j = 0; j < 8; j++) {
      if (ss1Ans1Check[i][j] !== ss1Values1[i][j]) {
        const test1 = ss1Ans1Check[i][j];
        const test2 = ss1Values1[i][j];
        console.log('実績・貢献・環境/ng');
      }
    }
  }
  // 広報
  const ss1Ans2 = ss
    .getSheetByName('広報')
    .getDataRange()
    .getValues()
    .filter(x => x[0] !== '');
  const ss1Ans2Check = ss1Ans2.map(x => [
    x[1],
    x[2],
    x[3],
    x[4],
    x[5],
    x[6],
    x[7],
    x[8],
    x[9],
  ]);
  const ss1Values2 = values.map(x => [
    x[1],
    x[20],
    x[21],
    x[22],
    x[6],
    x[7],
    x[8],
    x[9],
    x[10],
  ]);
  for (let i = 1; i < ss1Ans2Check.length; i++) {
    for (let j = 0; j < ss1Ans2Check[0].length; j++) {
      if (ss1Ans2Check[i][j] !== ss1Values2[i][j]) {
        const test1 = ss1Ans2Check[i][j];
        const test2 = ss1Values2[i][j];
        console.log('広報/ng');
      }
    }
  }
  // 経費・自由記載
  const ss1Ans3 = ss
    .getSheetByName('経費・自由記載')
    .getDataRange()
    .getValues()
    .filter(x => x[0] !== '');
  const ss1Ans3Check = ss1Ans3.map(x => [
    x[1],
    x[2],
    x[3],
    x[4],
    x[5],
    x[6],
    x[7],
    x[8],
    x[9],
  ]);
  const ss1Values3 = values.map(x => [
    x[1],
    x[20],
    x[21],
    x[22],
    x[11],
    x[12],
    x[13],
    x[14],
    x[15],
  ]);
  for (let i = 1; i < ss1Ans3Check.length; i++) {
    for (let j = 0; j < ss1Ans3Check[0].length; j++) {
      if (ss1Ans3Check[i][j] !== ss1Values3[i][j]) {
        const test1 = ss1Ans3Check[i][j];
        const test2 = ss1Values3[i][j];
        console.log('経費・自由記載/ng');
      }
    }
  }
}

function myFunction() {
  const tempHospInfo = getHospInfo_();
  ['form1Id', 'form2Id'].forEach(id => {
    const ssId = PropertiesService.getScriptProperties().getProperty(id);
    const [ss, ssCheckValuesSort] = getFormValues_(ssId, tempHospInfo);
    checkValues_(ss, ssCheckValuesSort);
  });
}

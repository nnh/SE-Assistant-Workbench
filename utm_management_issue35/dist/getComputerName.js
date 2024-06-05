function getComputerName() {
  const deleteRows = [
    'コンピュータ名の確認方法につきましては下記マニュアルをご参照ください。',
    'ご多用中のことと存じますが、何卒宜しくお願いします。',
    'ご不明な点がございましたら、information.system@nnh.go.jp宛に返信下さいますようお願い申し上げます。',
    'なお、個人所有のコンピュータを臨床研究センター内SINETネットワークに接続する場合は、接続前にBYOD申請が必要となります。BYOD利用に関する情報およびSINETネットワーク接続に関する情報は下記マニュアルの「接続」をご参照ください。',
    'また、コンピュータ名の変更、人員の異動等があった場合は、恐れ入りますが情報を更新していただけますよう、お願い申し上げます。',
    '情報システム研究室',
    '端末登録情報の修正手順につきましては下記マニュアルの「端末情報の修正」をご参照ください。',
    '表題の件につきまして、下記名称のコンピュータを所持されている方は下記リンクより接続許可依頼書を送信くださいますようお願いいたします。',
    '平素より大変お世話になっております。',
    '名古屋医療センター 臨床研究センター',
    '臨床研究センター関係者各位',
    '突然のメール失礼いたします。',
    '大塚　真理子',
    'お世話になっております。',
    'データセンター',
    'BYOD申請を行わない場合は無線guestへの接続に変更くださいますようお願いいたします。',
    "☆*.*'°~°*☆*.*'°~°*☆*.*'°~°*☆*.*'°~°*☆",
    '------',
    'Fax: 052-972-7740',
    'Tel: 052-951-1111 (内)2751',
    'Tel: 052-951-1111 (内)2484',
  ];
  const targetValues = SpreadsheetApp.getActiveSpreadsheet()
    .getSheets()[0]
    .getDataRange()
    .getValues();
  const res = targetValues.map(([ymd, text]) => {
    const temp1 = text.split(/\r\n\r\n/); //.map(x => x.split(/\n/));
    const temp2 = temp1.map(x => x.split(/\n/)).flat();
    const temp3 = temp2.map(x => x.split(/\r/)).flat();
    const res = temp3.map(x => [ymd, x]);
    return res;
  });
  const temp = res.flat();
  const outputValues = temp
    .filter(([_, text]) => !deleteRows.includes(text))
    .map(([ymd, text]) =>
      !/^.*代理送信.*$/.test(text) ? [ymd, text] : [ymd, '']
    )
    .map(([ymd, text]) =>
      !/^.*表題の件に.*$/.test(text) ? [ymd, text] : [ymd, '']
    )
    .map(([ymd, text]) =>
      !/^.*下記リンク.*$/.test(text) ? [ymd, text] : [ymd, '']
    )
    .map(([ymd, text]) => (!/^.*様$/.test(text) ? [ymd, text] : [ymd, '']))
    .map(([ymd, text]) =>
      !/情報システム研究室/.test(text) ? [ymd, text] : [ymd, '']
    )
    .map(([ymd, text]) =>
      !new RegExp('https://docs.google.com/document/').test(text)
        ? [ymd, text]
        : [ymd, '']
    )
    .map(([ymd, text]) =>
      !new RegExp('https://goo.gl/wm3ard').test(text) ? [ymd, text] : [ymd, '']
    )
    .map(([ymd, text]) =>
      !/[a-z0-9\.]+@[a-z\.]+/.test(text) ? [ymd, text] : [ymd, '']
    )
    .filter(([_, text]) => text !== '');
  const outputSheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[1];
  outputSheet.clear();
  outputSheet.getRange(1, 1).setValue('年月');
  outputSheet.getRange(1, 2).setValue('PC名');
  outputSheet
    .getRange(2, 1, outputValues.length, outputValues[0].length)
    .setValues(outputValues);
}

function main() {
  const docId: string | null =
    PropertiesService.getScriptProperties().getProperty('onDemandDocId');
  if (!docId) {
    throw new Error('onDemandDocId is not set');
  }
  const email: string | null =
    PropertiesService.getScriptProperties().getProperty('toMailAddress');
  if (!email) {
    throw new Error('toMailAddress is not set');
  }
  const myEmail = Session.getActiveUser().getEmail();
  const headings: [string, string, string, string | null][] = [
    [
      'sasSidHeadingId',
      'SASのSIDファイル更新',
      'SAS 9.4 Software License Renewal Order',
      myEmail,
    ],
    [
      'sinetKoujiHeadingId',
      'SINET機器のメンテナンス連絡',
      'SINET kouji renraku',
      email,
    ],
    [
      'ptoshSetupHeadingId',
      'Ptoshセットアップ依頼書',
      'Ptoshセットアップ依頼書（回答）',
      myEmail,
    ],
    [
      'idfZenkenId',
      'WHODrug、MedDRAのバージョン更新',
      'MedDRAバージョン　リリース',
      null,
    ],
    ['idfZenkenId', 'IDFのバージョン更新', 'MT協議会　全件提供データ', null],
    [
      'mtKyougikaiHeadingId',
      'MT協議会レターメール到着時処理',
      'MT協議会レター',
      null,
    ],
  ];
  const mappedHeadings: [string, string, string, string | null][] =
    headings.map(
      ([propertyId, subject, titlePattern, email]: [
        string,
        string,
        string,
        string | null,
      ]) => {
        const headingId: string | null =
          PropertiesService.getScriptProperties().getProperty(propertyId);
        const headingText = headingId !== null ? `#heading=${headingId}` : '';
        const url = `https://docs.google.com/document/d/${docId}/edit?tab=t.0${headingText}`;
        return [subject, titlePattern, url, email];
      }
    );
  mappedHeadings.forEach(
    ([subjectText, titlePattern, documentUrl, mailAddress]) =>
      getRecentEmail_(subjectText, titlePattern, mailAddress, documentUrl)
  );
}

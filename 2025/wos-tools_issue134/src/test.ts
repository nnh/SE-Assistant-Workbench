/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function getScriptProperty_(key: string): string {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    throw new Error(`Script property ${key} is not set.`);
  }
  return value;
}
function getSheetByName_(spreadsheetId: string, sheetName: string) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  if (!spreadsheet) {
    throw new Error(`Spreadsheet with ID ${spreadsheetId} not found.`);
  }
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(
      `Sheet ${sheetName} not found in spreadsheet ${spreadsheetId}.`
    );
  }
  return sheet;
}

// 調査対象のレコードを抽出してスプレッドシートに書き出す処理
export function extractWOSRecordsToSheet_() {
  const inputSpreadsheetId = getScriptProperty_('inputSpreadSheetId');
  const inputSheet = getSheetByName_(inputSpreadsheetId, 'Sheet1');
  const inputValues = inputSheet.getRange('A5:AI3635').getValues();
  const facilitySpreadsheetId = getScriptProperty_('facilitySpreadSheetId');
  const facilitySheet = getSheetByName_(facilitySpreadsheetId, 'Base');
  const facilityValues = facilitySheet
    .getDataRange()
    .getValues()
    .map(row => [row[7], row[0]]);
  const facilityMap = new Map<string, string>();
  for (const [name, code] of facilityValues) {
    facilityMap.set(name as string, code as string);
  }
  facilityMap.set('函館医療センター', '102');
  facilityMap.set('静岡てんかん・神経医療センター', '307');
  const filteredInputValues = inputValues
    .filter(row => row[33] !== '') // AH列は33番目（0始まり）
    .map(row => [facilityMap.get(row[0]), row[0], row[1], row[2]]); // A, B, C列だけを残す
  const undefinedFacilityRows = filteredInputValues.filter(
    row => row[0] === undefined
  );
  if (undefinedFacilityRows.length > 0) {
    console.warn('Undefined facility names found:');
    undefinedFacilityRows.forEach(row => {
      console.warn(`Facility Name: ${row[1]}, Row Data: ${row}`);
    });
  }
  const undefinedWosIdRecords = filteredInputValues.filter(
    row => !/^WOS:(\d{15})$/i.test(row[3])
  );
  if (undefinedWosIdRecords.length > 0) {
    console.warn('Undefined WOS IDs found:');
    undefinedWosIdRecords.forEach(row => {
      console.warn(`WOS ID: ${row[3]}, Row Data: ${row}`);
    });
  }
  const targetWosIdRecords = filteredInputValues.filter(row =>
    /^WOS:(\d{15})$/i.test(row[3])
  );
  if (targetWosIdRecords.length === 0) {
    console.warn('No valid WOS IDs found.');
  }
  const outputSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    '調査対象'
  );
  outputSheet.clearContents();
  const header = [['施設コード', '施設名', 'PubMed ID', 'WOS ID']];
  outputSheet.getRange(1, 1, 1, header[0].length).setValues(header);
  outputSheet
    .getRange(2, 1, targetWosIdRecords.length, targetWosIdRecords[0].length)
    .setValues(targetWosIdRecords);
  return;
}
// 調査対象シートから情報を取得し、JSONファイルに存在するか確認する処理
export function verifyWosIdsInJsonFiles_() {
  const targetWosIdRecordsSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    '調査対象'
  );
  const targetValues = targetWosIdRecordsSheet
    .getDataRange()
    .getValues()
    .filter((_, idx) => idx > 0);
  const facilityWosMap = new Map<string, string[]>();
  for (const row of targetValues) {
    const facilityCode = row[0] as string;
    const wosId = row[3] as string;
    if (!facilityWosMap.has(facilityCode)) {
      facilityWosMap.set(facilityCode, []);
    }
    facilityWosMap.get(facilityCode)!.push(wosId);
  }
  const facilityWosArray: [string, string[]][] = Array.from(
    facilityWosMap.entries()
  );

  const inputJsonFolderId = getScriptProperty_('targetJsonFolderId');
  const files = getFilesInFolder_(inputJsonFolderId);
  const facilityWosStatusArray: [string, [string, string][]][] =
    facilityWosArray.map(([facilityCode, wosIds]) => {
      // Find the file matching the facility code (e.g., "100.json")
      const file = files.find(f => f.getName() === `${facilityCode}.json`);
      let jsonWosIds: string[] = [];
      if (file) {
        try {
          const content = file.getBlob().getDataAsString();
          const jsonData = JSON.parse(content);
          jsonWosIds = jsonData['papers'].map(
            (paper: any) => paper['uid'] as string
          );
        } catch (e) {
          console.error(
            `Error parsing JSON in file ${facilityCode}.json: ${e}`
          );
        }
      }
      const wosIdSet = new Set(jsonWosIds || []);
      const wosStatus: [string, string][] = wosIds.map(wosId => [
        wosId,
        wosIdSet.has(wosId) ? 'あり' : 'なし',
      ]);
      return [facilityCode, wosStatus];
    });
  const flatFacilityWosStatusArray: [string, string, string][] = [];
  facilityWosStatusArray.forEach(([facilityCode, wosStatusList]) => {
    wosStatusList.forEach(([wosId, status]) => {
      flatFacilityWosStatusArray.push([facilityCode, wosId, status]);
    });
  });
  const outputSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    'jsonファイル存在確認'
  );
  outputSheet.clearContents();
  const header = [['施設コード', 'WOS ID', 'JSONファイル内の存在有無']];
  outputSheet.getRange(1, 1, 1, header[0].length).setValues(header);
  if (flatFacilityWosStatusArray.length > 0) {
    outputSheet
      .getRange(2, 1, flatFacilityWosStatusArray.length, header[0].length)
      .setValues(flatFacilityWosStatusArray);
  } else {
    console.warn('No data to write to the output sheet.');
  }
}
function getFilesInFolder_(folderId: string): GoogleAppsScript.Drive.File[] {
  const folder = DriveApp.getFolderById(folderId);
  const files: GoogleAppsScript.Drive.File[] = [];
  const fileIterator = folder.getFiles();
  while (fileIterator.hasNext()) {
    files.push(fileIterator.next());
  }
  return files;
}
// クエリ文字列を作成する
export function createQueryString_(): void {
  const inputSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    'jsonファイル存在確認'
  );
  const inputValues = inputSheet.getDataRange().getValues();
  const wosIds: string = inputValues
    .filter((row, idx) => idx > 0 && row[2] === 'なし')
    .map(row => {
      const wosid = row[1] as string;
      const res = `UT="${wosid}"`;
      return res;
    })
    .join(' OR ');
  const fileName = 'wos_query.txt';
  const folder = DriveApp.getRootFolder(); // マイドライブ
  const file = folder.createFile(fileName, wosIds, MimeType.PLAIN_TEXT);
  console.log(`File created: ${file.getUrl()}`);
}
// pmid.jsonファイルを読み込む処理
export function importPmidJsonToSheet_(): void {
  const thisFolderId = getScriptProperty_('thisFolderId');
  const folder = DriveApp.getFolderById(thisFolderId);
  const fileIterator = folder.getFiles();
  let jsonContent = '';
  while (fileIterator.hasNext()) {
    const file = fileIterator.next();
    if (file.getName() === 'pmid.json') {
      jsonContent = file.getBlob().getDataAsString();
      break;
    }
  }
  if (!jsonContent) {
    throw new Error('pmid.json file not found in the specified folder.');
  }
  const jsonData: { [key: string]: any } = JSON.parse(jsonContent);
  const uidAndAuthors = new Map<string, any[]>();

  for (const key in jsonData) {
    const value = jsonData[key];
    uidAndAuthors.set(
      String(value.uid),
      Array.isArray(value.authors) ? value.authors : []
    );
  }
  const uidAndAuthorsArray = Array.from(uidAndAuthors.entries()).flatMap(
    ([key, authors]) =>
      authors.map(author => [key, author.name, author.affiliation])
  );
  // 除外対象の所属名の配列
  const excludeAffiliations = [
    'Department of Internal Medicine, Kyushu University Beppu Hospital, Oita, Japan.',
    'Department of Rheumatology, Hiroshima Red Cross Hospital and Atomic-Bomb Survivors Hospital, Hiroshima, Japan.',
    'Center for the Study of Global Infection, Kyushu University Hospital, Fukuoka, Japan.',
    'Department of Medicine and Biosystemic Science, Kyushu University Graduate School of Medical Sciences, Fukuoka, Japan.',
    'Department of Medical Education, Kyushu University Graduate School of Medical Sciences, Fukuoka, Japan.',
    'Department of Clinical Chemistry and Laboratory Medicine, Kyushu University Hospital, Fukuoka, Japan.',
    'Division of Rheumatology and Clinical Immunology, Keio University, Tokyo, Japan.',
    'Department of Medicine and Bioregulatory Science, Graduate School of Medical Sciences, Kyushu University, Japan.',
    'Department of Neuropsychiatry, Neuroscience, Ehime University Graduate School of Medicine, Ehime University, Ehime, Japan.',
    'Department of Aging Research and Geriatric Medicine, Institute of Development, Aging and Cancer, Tohoku University, Sendai, Japan.',
    'Department of Neuropsychiatry, Zaidan Niihama Hospital, Ehime, Japan.',
    'Department of Psychiatry, Heisei Hospital, Ehime, Japan.',
    'Department of Epidemiology and Public Health, Graduate School of Medical Sciences, Kyushu University, Fukuoka, Japan.',
    'Department of Neuropsychiatry, Graduate School of Medical Sciences, Kyusyu University, Fukuoka, Japan.',
    'Department of Social Medicine, Graduate School of Medicine, Hirosaki University, Hirosaki, Japan.',
    'Division of Neurology and Gerontology, Department of Internal Medicine, School of Medicine, Iwate Medical University, Iwate, Japan.',
    'Department of Neurology, Kanazawa University Graduate School of Medical Sciences, Kanazawa University, Kanazawa, Japan.',
    'Keio University School of Medicine, Tokyo, Japan.',
    'Department of Neuropsychiatry, Faculty of Life Sciences, Kumamoto University, Kumamoto, Japan.',
    'Department of Pulmonary Medicine, Graduate School of Comprehensive Human Science, University of Tsukuba, Japan.',
    'Hematology and Oncology Division, Hitachi General Hospital, Japan.',
    'Department of Urology, Mito Saiseikai General Hospital, Japan.',
    'Department of Physical Therapy, Faculty of Health and Welfare, Prefectural University of Hiroshima, Hiroshima, Japan.',
    'Department of Respiratory Medicine and Infectious Disease, Graduate School of Medicine, Yamaguchi University, Japan.',
    'Department of Pulmonology and Gerontology, Graduate School of Medicine, Yamaguchi University, Japan.',
    'Department of Orthopaedic Surgery, Osaka University, Graduate School of Medicine, Suita, Osaka, Japan.',
    'Department of Orthopaedic Surgery, Osaka Rosai Hospital, Sakai, Osaka, Japan.',
    "Graduate School of Public Health, St. Luke's International University, Tokyo, Japan.",
    'Department of Infectious Diseases, Fujita Health University School of Medicine, Aichi, Japan.',
    'Department of Infectious Diseases, University of Tokyo Hospital, Tokyo, Japan.',
    'Tokyo Foundation for Policy Research, Tokyo, Japan; Cancer Control Center, Osaka International Cancer Institute, Osaka, Japan.',
    'Tokyo Foundation for Policy Research, Tokyo, Japan.',
    'Tokyo Foundation for Policy Research, Tokyo, Japan; Muribushi Okinawa Center for Teaching Hospitals, Okinawa, Japan. Electronic address: yasuharu.tokuda@gmail.com.',
    'Department of Pharmacy, Hyogo Medical University Hospital, Nishinomiya, Hyogo, Japan. Electronic address: ykhikasa@hyo-med.ac.jp.',
    'Department of Pharmacy, Gifu University Hospital, Gifu, Gifu, Japan.',
    'Division of Pharmacy, Chiba University Hospital, Chiba, Chiba, Japan.',
    'Department of Hospital Pharmacy, Sapporo Medical University Hospital, Sapporo, Hokkaido, Japan.',
    'Department of Pharmacy, Kobe City Medical Center General Hospital, Kobe, Hyogo, Japan.',
    'Department of Pharmacy, Kobe University Hospital, Kobe, Japan.',
    'Division of Pharmacy, Wakayama Medical University Hospital, Wakayama, Wakayama, Japan.',
    'Department of Pharmacy, Nara Medical University Hospital, Kashihara, Nara, Japan.',
    'Division of Pharmacy, Japanese Red Cross Kyoto Daiichi Hospital, Higashiyama, Kyoto, Japan.',
    'Department of Pharmaceutical Services, Hiroshima University Hospital, Hiroshima, Hiroshima, Japan.',
    'Department of Pharmacy, Hyogo Medical University Hospital, Nishinomiya, Hyogo, Japan.',
    'Sugawara Clinic, Nerima-ku, Japan.',
    'Department of Internal Medicine, Sakurajyuji Yatsushiro Rehabilitation Hospital, Yatsushiro, Japan.',
    'Department of General Medicine and Primary Care, Kumamoto University Hospital, Kumamoto, Japan.',
    'Uchiyama Clinic, Joetsu, Japan.',
    'Yokota Naika, Miyazaki, Japan.',
    'Tokutake Iin, Kawaguchi, Japan.',
    'Wakasa Medical Clinic, Kanazawa, Japan.',
    'Hiramitsu Heart Clinic, Nagoya, Japan.',
    'Shizuoka City Shizuoka Hospital, Shizuoka, Japan.',
    'Jinnouchi Hospital Diabetes Care Center, Kumamoto, Japan.',
    'Kakuda Iin, Kahoku, Japan.',
    'Hayashi Medical Clinic, Sakai, Japan.',
    'Kawai Naika Clinic, Gifu, Japan.',
    'Fuji Health Promotion Center, Fuji, Japan.',
    'Department of Cardiovascular Medicine, Graduate School of Medical Sciences, Kumamoto University, Kumamoto, Japan.',
    'University of the Ryukyu Hospital, Nishihara-cho, Japan.',
    'Yokosuka City Hospital, Yokosuka, Japan.',
    'Nara Prefecture Seiwa Medical Center, Ikoma-gun, Japan.',
    'Kumamoto University, Kumamoto, Japan.',
    'Department of Gynecology and Obstetrics, Graduate School of Medical Sciences, Kyushu University, Fukuoka, Japan.',
    'Department of Pathology, Graduate School of Medicine, Dentistry and Pharmaceutical Science, Okayama University, Okayama, Japan.',
    'Department of Anatomic Pathology, Pathological Sciences, Graduate School of Medical Sciences, Kyushu University, Fukuoka, Japan.',
    'Department of Otorhinolaryngology, Graduate School of Medical Sciences, Kyushu University, Fukuoka, Japan.',
    'Division of Stem Cell Regulation, Center for Molecular Medicine, Jichi Medical University, Tochigi, Japan.',
    'Department of Infectious Diseases, The University of Tokyo Hospital, Tokyo, Japan.',
    'Cancer Control Center, Osaka International Cancer Institute, Osaka, Japan.',
    'The Tokyo Foundation for Policy Research, Tokyo, Japan.',
    'Department of Medicine, Division of Gastroenterology and Hepatology, Shinshu University School of Medicine, Matsumoto, Japan.',
    'Department of Medicine, Division of Gastroenterology and Hepatology, Shinshu University School of Medicine, Matsumoto, Japan. kimuratakefumii@yahoo.co.jp.',
    'Department of Gastroenterology, Maruko Central Hospital, Ueda, Japan.',
    'Department of Hepatology, Nagano Municipal Hospital, Nagano, Japan.',
    'Bioscience Division, TOSOH Corporation, Ayase, Kanagawa, Japan.',
    'Department of Pulmonary Medicine, Institute of Medicine, University of Tsukuba, 1-1-1 Tennoudai, Tsukuba, Ibaraki, 305-8575, Japan. Electronic address: yoshida.kazufumi.ay@ms.hosp.tsukuba.ac.jp.',
    'Department of Pulmonary Medicine, Institute of Medicine, University of Tsukuba, 1-1-1 Tennoudai, Tsukuba, Ibaraki, 305-8575, Japan.',
    'Department of Global Medical Research Promotion, Shinshu University Graduate School of Medicine, Matsumoto, Japan.',
    'Department of Endocrinology and Metabolism, Institute of Medicine, University of Tsukuba, 1-1-1 Tennoudai, Tsukuba, Ibaraki, 305-8575, Japan.',
    'Department of Gynecology, National Cancer Center Hospital, Tokyo, Japan.',
    'Laboratory and Integrative Oncology, National Cancer Center Research Institute, Tokyo, Japan.',
    'Department of Diagnostic Pathology, National Cancer Center Hospital, Tokyo, Japan.',
    'R&D Department, Dynacom Co., Ltd., Chiba, Japan.',
    'Department of Breast and Medical Oncology, National Cancer Center Hospital, Tokyo, Japan.',
    'Department of Biobank and Tissue Resources, National Cancer Center Research Institute, Tokyo, Japan.',
    'Department of Head and Neck, Esophageal Medical Oncology, National Cancer Center Hospital, Tokyo, Japan.',
    'Department of Gynecology, National Cancer Center Hospital, Tokyo, Japan.',
    'Department of Molecular and Cellular Medicine, Institute of Medical Science, Tokyo Medical University, Tokyo, Japan.',
    'New Projects Development Division, Toray Industries, Inc., Kamakura city, Kanagawa, Japan.',
    'Division of Infection Control and Prevention, University of Fukui Hospital, Fukui 910-1193, Japan.',
    'Department of Pediatrics, Tokai University Hachioji Hospital, Tokyo, Japan.',
    'Department of Pediatrics, Dokkyo Medical University, Mibu, Japan.',
    'Department of Basic Clinical Science and Public Health, Tokai University School of Medicine, Isehara, Japan.',
    'Department of Cardiology, Kokura Memorial Hospital, Kitakyushu, Japan.',
    'Department of Cardiovascular Medicine, Saga University, Saga, Japan.',
    'Department of Cardiology, Hirakata Kohsai Hospital, Hirakata, Japan.',
    'Department of Clinical Epidemiology, Hyogo College of Medicine, Nishinomiya, Japan.',
    'Department of Cardiovascular Medicine, Kyoto University Graduate School of Medicine, Kyoto, Japan.',
    'Department of Cardiology, Juntendo University Shizuoka Hospital, Izunokuni, Japan.',
    'Department of Cardiology, Sendai Kousei Hospital, Sendai, Japan.',
    'Department of Cardiology, Hirakata Kohsai Hospital, Hirakata, Japan.',
    'Department of Cardiology, Dokkyo Medical University Saitama Medical Center, Koshigaya, Japan.',
    'Department of Cardiology, Tenri Hospital, Tenri, Japan.',
    'Department of Cardiology, Teine Keijinkai Hospital, Teine, Japan.',
    'Department of Cardiovascular Center, Japanese Red Cross Osaka Hospital, Osaka Japan.',
    'Department of Cardiology, Fukuoka Wajiro Hospital, Fukuoka, Japan.',
    'Showa University Fujigaoka Hospital, Yokohama, Japan.',
    'Department of Cardiology, Kindai University Faculty of Medicine, Osakasayama, Japan.',
    'Division of Cardiology, Tsukazaki Hospital, Himeji, Japan.',
    'Ogaki Municipal Hospital, Ogaki, Japan.',
    'Department of Cardiovascular Medicine, Kyoto University Graduate School of Medicine, Kyoto, Japan.',
    'Department of Cardiology, Hirakata Kohsai Hospital, Hirakata, Japan. Electronic address: taketaka@kuhp.kyoto-u.ac.jp.',
    'Pulmonary Hypertension Center, Saiseikai Narashino Hospital, Narashino, Chiba, Japan.',
    'Department of Healthcare Quality Assessment, Graduate School of Medicine, The University of Tokyo, Tokyo, Japan.',
    'Pulmonary Hypertension Center, International University of Health and Welfare Mita Hospital, Tokyo, Japan.',
    'Department of Respiratory Medicine and Allergy, Tosei General Hospital, Seto, Aichi, Japan.',
    'Department of Cardiovascular Medicine, Shinko Hospital, Kobe, Japan.',
    'Department of Healthcare Quality Assessment, Graduate School of Medicine, The University of Tokyo, Tokyo, Japan.',
    'Department of Respiratory Medicine and Allergology, Kindai University Faculty of Medicine, Osakasayama, Osaka, Japan.',
    'Division of Respiratory and Cardiovascular Innovative Research, Faculty of Medicine, Hokkaido University, Sapporo, Japan.',
    'Department of Respirology, Graduate School of Medicine, Chiba University, Chiba, Japan.',
    'Department of Respiratory Medicine, Nagano Red Cross Hospital, Nagano, Nagano, Japan.',
    'Division of Cardiovascular Medicine, Department of Internal Medicine, Kobe University Graduate School of Medicine, Kobe, Japan.',
    'Department of Chest Medicine, Japan Railway Tokyo General Hospital, Tokyo, Japan.',
    'Department of Allergy and Rheumatology, Nippon Medical School Graduate School of Medicine, Tokyo, Japan.',
    'Department of Respiratory Medicine, Juntendo University Graduate School of Medicine, Tokyo, Japan.',
    'Department of Respiratory Medicine, Graduate School of Medicine, Kyoto University, Kyoto, Japan.',
    'Department of Cardiology, International University of Health and Welfare Narita Hospital, Narita, Japan.',
    'Division of Respiratory Disease, Department of Medicine, Tokai University Hachioji Hospital, Hchioji, Japan.',
    'Department of Respirology, Graduate School of Medicine, Chiba University, Chiba, Japan.',
    'Division of Cardiovascular Medicine, Department of Internal Medicine, Kobe University Graduate School of Medicine, Kobe, Japan.',
    'First Department of Internal Medicine, Shinshu University School of Medicine, Matsumoto, Nagano, Japan.',
    'Division of Cardiology, Department of Medicine, Kyorin University Hospital, Mitaka, Tokyo, Japan.',
    'Division of Pulmonary Medicine, Department of Medicine, Tokai University School of Medicine, Isehara, Kanagawa, Japan.',
    'Division of Respiratory Medicine, Department of Internal Medicine, Kobe University Graduate School of Medicine, Kobe, Japan.',
    'Department of Respiratory Medicine, Fukujuji Hospital, Japan Anti-Tuberculosis Association (JATA), Kiyose, Tokyo, Japan.',
    'Department of Health Policy and Management, Keio University School of Medicine, Tokyo, Japan.',
    'Department of Respirology, Graduate School of Medicine, Chiba University, Chiba, Japan.',
    'Agency for Student Support and Disability Resources, Kyoto University, Yoshida-Honmachi, Kyoto, 606-8501, Japan.',
    'Center for Mathematical and Data Sciences, Kobe University, Kobe, Japan.',
    'Department of Advanced Emergency And Disaster Medical Center, Hirosaki University Hospital, Hirosaki, Aomori, Japan.',
    'Department of Advanced Medicine for Respiratory Failure, Graduate School of Medicine, Kyoto University, 54 Shogoin Kawahara-cho, Sakyo-ku, Kyoto, 606-8507, Japan.',
    'Department of Advanced Medicine Research and Development Center for New Medical Frontiers Kitasato University School of Medicine Kanagawa Japan.',
    'Department of Cardiology Dokkyo Medical University Saitama Medical Center Koshigaya Japan.',
    'Department of Cardiology Juntendo University Shizuoka Hospital Izunokuni Japan.',
    'Department of Cardiology, Nagoya University Graduate School of Medicine, Nagoya, Japan.',
    'Department of Cardiology, Nagoya University Hospital, Nagoya, Japan.',
    'Department of Cardiology, Showa University Koto Toyosu Hospital, Tokyo, Japan.',
    'Department of Cardiovascular Medicine Chiba University Hospital Chiba Japan.',
    'Department of Cardiovascular Medicine Saga University Saga Japan.',
    'Department of Cardiovascular Medicine Tokushima University Hospital Tokushima Japan.',
    'Department of Cardiovascular Medicine, Graduate School of Medicine Kyoto University Kyoto Japan.',
    'Department of Cardiovascular Medicine, Graduate School of Medicine, Kyoto University, Kyoto, Japan.',
    'Department of Clinical Epidemiology, Hyogo Medical University, Nishinomiya, Japan.',
    'Department of Clinical Laboratory and Biomedical Sciences, Osaka University Graduate School of Medicine, 1-7 Yamadaoka, Suita, Osaka 565-0871, Japan.',
    'Department of Clinical Oncology, Kyoto University Hospital, 54 Shogoin Kawahara-cho, Sakyo-ku, Kyoto, 606-8507, Japan.',
    'Department of Clinical Pharmacology and Therapeutics, Kyoto University Hospital, 54 Shogoin Kawahara-cho, Sakyo-ku, Kyoto, 606-8507, Japan.',
    'Department of Clinical Pharmacology and Therapeutics, Kyoto University Hospital, 54 Shogoin Kawahara-cho, Sakyo-ku, Kyoto, 606-8507, Japan. ayone@kuhp.kyoto-u.ac.jp.',
    'Department of Diagnostic and Generalist Medicine, Dokkyo Medical University Hospital, Mibu, Tochigi, Japan.',
    'Department of Gastroenterological and General Surgery Kyorin University Faculty of Medicine Tokyo Japan.',
    'Department of Gastroenterological Surgery Hyogo Medical University Hyogo Japan.',
    'Department of Gastroenterological Surgery, Faculty of Medicine, Fukuoka University, Fukuoka, Japan.',
    'Department of Gastroenterology and Hepatology, Graduate School of Medicine, Kyoto University, 54 Kawahara-cho, Shogoin, Sakyo-ku, Kyoto, 606-8507, Japan.',
    'Department of Gastroenterology and Hepatology, Graduate School of Medicine, Kyoto University, 54 Kawahara-cho, Shogoin, Sakyo-ku, Kyoto, 606-8507, Japan. atsushit@kuhp.kyoto-u.ac.jp.',
    'Department of Gastroenterology and Hepatology, Hokkaido University Hospital, Sapporo, Hokkaido, Japan.',
    'Department of Gastroenterology and Hepatology, Sapporo Medical University School of Medicine, Sapporo, Hokkaido, Japan.',
    'Department of Gastroenterology Kobe University International Clinical Cancer Research Center Hyogo Japan.',
    'Department of Gastrointestinal Tract Surgery Fukushima Medical University Fukushima Japan.',
    'Department of General Medicine, Faculty of Medicine, Juntendo University, Tokyo, Japan.',
    'Department of General Medicine, Saga University Hospital, Saga, Japan.',
    'Department of Hematology and Oncology, Nagoya University Graduate School of Medicine, Nagoya, Japan.',
    'Department of Laboratory Medicine, Shinshu University Hospital, Matsumoto, Japan.',
    'Department of Laboratory Medicine/Cardiology, The Institute of Medical Science, The University of Tokyo, 4-6-1 Shirokanedai, Minato-ku, Tokyo 108-8639, Japan.',
    'Department of Medical Microbiology, Mycology and Immunology, Tohoku University Graduate School of Medicine, Sendai, Miyagi, Japan.',
    'Department of Medical Oncology, Sapporo Medical University School of Medicine, Sapporo, Hokkaido, Japan.',
    'Department of Medical Technology and Science, Faculty of Fukuoka Health Care, International University of Health and Welfare, Okawa, Fukuoka, Japan; Medical Laboratory Science Graduate School of Health and Welfare Sciences, International University of Health and Welfare Graduate School, Okawa, Fukuoka, Japan.',
    'Department of Medical Technology and Science, Faculty of Fukuoka Health Care, International University of Health and Welfare, Okawa, Fukuoka, Japan; Medical Laboratory Science Graduate School of Health and Welfare Sciences, International University of Health and Welfare Graduate School, Okawa, Fukuoka, Japan. Electronic address: yaguchi@iuhw.ac.jp.',
    'Department of Medicine, Asahikawa Medical University, Asahikawa, Hokkaido, Japan.',
    'Department of Medicine, Kawasaki University of Health and Welfare, Okayama 701-0193, Japan.',
    'Department of Microbiology, Graduate School of Medicine and Faculty of Medicine, The University of Tokyo, Tokyo, Japan.',
    'Department of Microbiology, Graduate School of Medicine and Faculty of Medicine, The University of Tokyo, Tokyo, Japan. y-kitai@m.u-tokyo.ac.jp.',
    'Department of Molecular and Cellular Immunology, Shinshu University School of Medicine, Matsumoto, Japan.',
    'Department of Neuropathology, Graduate School of Medical Sciences, Kyushu University, Fukuoka, Japan.',
    'Department of Neuropsychiatry Graduate School of Medical Sciences, Kyushu University Fukuoka Japan.',
    'Department of Neuropsychiatry, Akita University Graduate School of Medicine, 1-1-1 Hondo, Akita, 010-8543, Japan.',
    'Department of Neuropsychiatry, Graduate School of Medicine, University of the Ryukyus, 207 Uehara, Nishihara, 903-0215, Japan.',
    'Department of Neuropsychiatry, Kanazawa Medical University, 1-1 Daigaku, Uchinada, 920-0293, Japan.',
    'Department of Neuropsychiatry, Kyorin University School of Medicine, 6-20-2 Shinkawa, Mitaka, 181-8611, Japan.',
    'Department of Neuropsychiatry, Molecules and Function, Ehime University Graduate School of Medicine, Shitsukawa, Toon, 791-0295, Japan.',
    'Department of Neuropsychiatry, University of Tokyo Hospital, 7-3-1 Hongo, Bunkyo, 113-8655, Japan.',
    'Department of Neurosurgery, Aichi Medical University, Nagoya, Japan.',
    'Department of Neurosurgery, Hirosaki University Hospital, Hirosaki, Aomori, Japan.',
    'Department of Neurosurgery, Hyogo Medical University, Nishinomiya, Japan.',
    'Department of Neurosurgery, Juntendo University, Tokyo, Japan.',
    'Department of Neurosurgery, Kindai University, Sayama, Japan.',
    'Department of Neurosurgery, Kyoto University, Kyoto, Japan.',
    'Department of Neurosurgery, Nagoya University, Nagoya, Japan.',
    'Department of Neurosurgery, Okayama University, Okayama, Japan.',
    'Department of Neurosurgery, Tsukuba University, Tsukuba, Japan.',
    'Department of Nursing, Graduate School of Health Sciences, Kobe University, Kobe 654-0142, Japan.',
    'Department of Nursing, Nagasaki University Graduate School of Biomedical Sciences, Nagasaki, Japan.',
    'Department of Pediatrics, Keio University School of Medicine, Tokyo, Japan.',
    'Department of Pediatrics, Shinshu University School of Medicine, Matsumoto, Japan.',
    'Department of Perioperative and Critical Care Management, Graduate School of Biomedical and Health Sciences Hiroshima University Hiroshima Japan.',
    'Department of Physical Therapy Science, Nagasaki University Graduate School of Biomedical Sciences, Nagasaki, Japan; and Department of Rehabilitation Medicine, Nagasaki University Hospital, Nagasaki, Japan.',
    'Department of Physical Therapy Science, Nagasaki University Graduate School of Biomedical Sciences, Nagasaki, Japan; and Department of Rehabilitation Medicine, Nagasaki University Hospital, Nagasaki, Japan. ryokozu@nagasaki-u.ac.jp.',
    'Department of Psychiatry, Dokkyo Medical University School of Medicine, 880 Kitakobayashi, Mibu, 321-0293, Japan. furukori@dokkyomed.ac.jp.',
    'Department of Psychiatry, Faculty of Medicine, Fukuoka University, 7-45-1 Nanakuma, Fukuoka, 814-0180, Japan.',
    'Department of Psychiatry, Gifu University Graduate School of Medicine, 1-1 Yanagido, Gifu, 501-1194, Japan.',
    'Department of Psychiatry, Graduate School of Biomedical Science, Tokushima University, 3-8-15 Kuramoto-cho, Tokushima, 770-8503, Japan.',
    'Department of Psychiatry, Hokkaido University Graduate School of Medicine, Kita 15 Nishi 7, Sapporo, 060-8638, Japan.',
    'Department of Psychiatry, Kitasato University School of Medicine, 1-15-1 Kitazato, Sagamihara, 252-0373, Japan.',
    'Department of Psychiatry, Nara Medical University, 840 Shijo-cho, Kashihara, 634-8522, Japan.',
    'Department of Psychiatry, Shinshu University School of Medicine, 3-1-1 Asahi, Matsumoto, 390-8621, Japan.',
    'Department of Public Health, Okayama University Graduate School of Medicine, Dentistry, and Pharmaceutical Sciences, 2-5-1 Shikata-cho, Kita-ku, Okayama 700-8558, Japan.',
    'Department of Radiation Oncology, Yokohama City University Graduate School of Medicine, Yokohama, Japan.',
    'Department of Respiratory Medicine, Graduate School of Medicine, Kyoto University, 54 Shogoin Kawahara-cho, Sakyo-ku, Kyoto, 606-8507, Japan.',
    'Department of Stroke Neurology, Kyorin Medical University, Tokyo, Japan.',
    'Department of Surgery Keio University School of Medicine Tokyo Japan.',
    'Department of Surgery Teikyo University Chiba Medical Center Chiba Japan.',
    'Department of Upper Gastrointestinal Surgery Kitasato University School of Medicine Kanagawa Japan.',
    'Department of Urology and Renal Transplantation, Yokohama City University Medical Center, Yokohama, Japan; hu0428@yokohama-cu.ac.jp.',
    'Department of Urology and Renal Transplantation, Yokohama City University Medical Center, Yokohama, Japan.',
    'Department of Urology, Hyogo Medical University, Nishinomiya, Hyogo, Japan.',
    'Department of Urology, Keio University School of Medicine, Shinjuku, Tokyo, Japan.',
    'Department of Urology, Showa University, Shinagawa, Tokyo, Japan.',
    'Department of Urology, Tokyo Medical and Dental University, Bunkyo, Tokyo, Japan.',
    'Department of Urology, Yokohama City, University Graduate School of Medicine, Yokohama, Japan.',
    'Department of Virology, Tohoku University Graduate School of Medicine, Sendai, Japan.',
    'Digestive Diseases Center Showa University Koto Toyosu Hospital Tokyo Japan.',
    'Division of Cardiology Department of Medicine, Kyorin University Hospital, Mitaka, Tokyo, Japan.',
    'Division of Cardiology, Showa University Fujigaoka Hospital, Yokohama, Japan.',
    'Division of Cardiology, Yokohama City University Medical Center, Yokohama, Japan.',
    'Division of Clinical Immunology and Cancer Immunotherapy, Center for Cancer Immunotherapy and Immunobiology, Graduate School of Medicine, Kyoto University, 53 Shogoin Kawahara-cho, Sakyo-ku, Kyoto, 606-8507, Japan.',
    'Division of Digestive Surgery, Department of Surgery Kyoto Prefectural University of Medicine Kyoto Japan.',
    'Division of General Internal Medicine, Department of Internal Medicine, St. Marianna University School of Medicine, Kanagawa, Japan.',
    'Division of Hepato-Biliary-Pancreatic Surgery and Transplantation, Department of Surgery, Graduate School of Medicine, Kyoto University, Kyoto, Japan.',
    'Division of Infection Control and Prevention, University of Fukui Hospital, Fukui, Japan.',
    'Division of Patient Safety, Hiroshima University Hospital, 1-2-3 Kasumi, Minami-ku, Hiroshima 734-8551, Japan.',
    'First Department of Surgery, Hamamatsu University School of Medicine, Hamamatsu, Japan.',
    'General Medicine Center, Shimane University Hospital, Enya‑cho, Shimane, Japan.',
    'General Medicine of Department, Faculty of Medicine, Fukuoka University, Fukuoka, Japan.',
    'Graduate School of Pharmaceutical Sciences, Osaka University, Suita, Osaka, Japan.',
    'Health Sciences, University of Hokkaido Ishikari-gun Japan.',
    'Medical Laboratory Science Graduate School of Health and Welfare Sciences, International University of Health and Welfare Graduate School, Okawa, Fukuoka, Japan; Department of Clinical Laboratory, Okawa, Fukuoka, Japan.',
    'Division of General Medicine, Nerima Hikarigaoka Hospital, 2-11-1 Hikarigaoka Nerima-ku, Tokyo, 179-0072, Japan. hrdtaku@gmail.com.',
    'Division of Emergency and General Medicine, Tokyo Metropolitan Tama Medical Center, Fuchu, Japan.',
    'National Center of Neurology and Psychiatry, Tokyo, Japan.',
    'Department of Infectious Disease, Ise Red Cross Hospital, Ise, Japan.',
    'Department of Gastroenterology and Hepatology, Hyogo Prefectural Amagasaki General Medical Center, Amagasaki, Japan.',
    'Department of Gastroenterology and Hepatology, Japanese Red Cross Wakayama Medical Center, Wakayama, Japan.',
    'Department of Internal Medicine, Sapporo Shirakaba-dai Hospital, Sapporo, JPN.',
    'Department of Pediatrics, Nagano Red Cross Hospital, Wakasato, Nagano, Japan.',
    'Department of Gastrointestinal Endoscopy, NTT Medical Center Tokyo, Tokyo, Japan.',
    "Department of Cardiovascular Medicine, St. Luke's International Hospital, Tokyo 104-8560, Japan.",
    'Department of Nursing, Japanese Nursing Association, Tokyo 150-0001, Japan.',
    'Department of Gastroenterology Toranomon Hospital Tokyo Japan.',
    'Division of Interventional Neuroradiology, Ronald Reagan UCLA Medical Center, Los Angeles, CA, USA.',
    'Department of Neurosurgery, Shinrakuen Hospital, Niigata, Japan.',
    'Department of Neurovascular Research, Kobe City Medical Center General Hospital, Kobe, Japan.',
    'Department of Cardiology Fukuoka Wajiro Hospital Fukuoka Japan.',
    'Division of Cardiology Hirakata Kohsai Hospital Hirakata Japan.',
    "Department of Cardiology, Tokyo Metropolitan Children's Medical Center, 2-8-29 Musashidai Fuchu, Tokyo, 183-8561, Japan. masaru10miura@gmail.com.",
    "Clinical Research Support Center, Tokyo Metropolitan Children's Medical Center, Tokyo, Japan.",
    "Department of General Pediatrics, Tokyo Metropolitan Children's Medical Center, Tokyo, Japan.",
    'Department of Data Science, Clinical Research Center, National Center for Child Health and Development, Tokyo, Japan.',
    'Department of Pediatrics, Tokyo Metropolitan Bokutoh Hospital, Tokyo, Japan.',
    'Department of Pediatrics, Saiseikai Utsunomiya Hospital, Tochigi, Japan.',
    'Department of Pediatrics, Japanese Red Cross Ashikaga Hospital, Tochigi, Japan.',
    'Division of Cardiology Hirakata Kohsai Hospital Hirakata Japan.',
    'Department of Clinical Epidemiology Hyogo College of Medicine Nishinomiya Japan.',
    'Department of Cardiology Kokura Memorial Hospital Kitakyusyu Japan.',
    'Department of Cardiology Kokura Memorial Hospital Kitakyusyu Japan.',
    'Department of Cardiology Sendai Kousei Hospital Sendai Japan.',
    'Division of Cardiology Hirakata Kohsai Hospital Hirakata Japan.',
    'Division of Cardiology Shizuoka Saiseikai General Hospital Shizuoka Japan.',
    'Department of Cardiovascular Medicine Hokko Memorial Hospital Sapporo Japan.',
    'Department of Cardiology Higashiyamato Hospital Higashiyamato Japan.',
    'Department of Cardiology Tenri Hospital Tenri Japan.',
    'Department of Cardiovascular Center Japanese Red Cross Osaka Hospital Osaka Japan.',
    'Department of Pathology of Mental Diseases, National Institute of Mental Health, National Center of Neurology and Psychiatry, 4-1-1 Ogawahigashi, Kodaira, 187-8553, Japan.',
    'Department of Child and Adolescent Psychiatry, Kohnodai Hospital, National Center for Global Health and Medicine, 1-7-1 Kohnodai, Ichikawa, 272-8516, Japan.',
    'Department of Orthopedics, The Medical City, Pasig, Philippines.',
    'Department of Urology, National Defense Medical College, Tokorozawa, Saitama, Japan.',
    'Department of Urology, Fujisawa Shonandai Hospital, Fujisawa, Kanagawa, Japan.',
    'Kawasaki City College of Nursing, Kawasaki, Kanagawa, Japan.',
    'Department of Neurosurgery, Kuroishi General Hospital, Kuroishi, Aomori, Japan.',
    'Department of Neurosurgery, Aomori City Hospital, Aomori, Aomori, Japan.',
    'Department of Neurosurgery, Southern Tohoku Hospital, Iwanuma, Miyagi, Japan.',
    'Division of Cardiology, Hirakata Kohsai Hospital, Hirakata, Japan.',
    'Division of Cardiology, Chikamori Hospital, Kochi, Japan.',
    'Department of Gastroenterology, Obihiro Kosei Hospital, Obihiro, Hokkaido, Japan.',
    'Department of Gastroenterology, Oji General Hospital, Tomakomai, Hokkaido, Japan.',
    'Department of Gastroenterology, Hokkaido Gastroenterology Hospital, Sapporo, Hokkaido, Japan.',
    'Department of Gastroenterology, Aiiku Hospital, Sapporo, Hokkaido, Japan.',
    'Department of Gastroenterology, Tonan Hospital, Sapporo, Hokkaido, Japan.',
    'Department of Gastroenterology, IMS Sapporo Digestive Disease Center General Hospital, Sapporo, Hokkaido, Japan.',
    'Department of Gastroenterology, Sapporo City General Hospital, Sapporo, Hokkaido, Japan.',
    "Department of Cardiology, Tokyo Metropolitan Children's Medical Center, 2-8-29 Musashidai Fuchu, Tokyo, 183-8561, Japan.",
    'Department of Nursing, Yumino Medical Corporation, Tokyo 171-0033, Japan.',
    'Department of Gastroenterological Surgery Cancer Institute Ariake Hospital Tokyo Japan.',
    'Department of Gastroenterology Tonan Hospital Sapporo Hokkaido Japan.',
    'Department of Gastroenterology Ishikawa Prefectural Central Hospital Kanazawa Japan.',
    'Department of Endoscopy Saku Central Hospital Advanced Care Center Nagano Japan.',
    'Department of Gastrointestinal Oncology Osaka International Cancer Institute Osaka Japan.',
    "Division of Neuropediatirics, Nagano Children's Hospital, Azumino, Japan.",
    "Department of Hematology/Oncology, Nagano Children's Hospital, Azumino, Japan.",
    'Department of Gastroenterology and Hepatology, Kurashiki Central Hospital, Kurashiki, Japan.',
    'Department of Gastroenterology and Hepatology, Osaka Red Cross Hospital, Osaka, Japan.',
    'Department of Hematology, Sapporo City General Hospital, Sapporo, JPN.',
    'Research Division, Shimadzu Diagnostics Corporation, Yuki, Ibaraki, Japan.',
    'National Center of Neurology and Psychiatry, Tokyo, Japan.',
    'National Center of Neurology and Psychiatry Tokyo Japan.',
    "Department of Pediatric Urology, Jichi Children's Medical Center Tochigi, Shimotsuke, Tochigi, Japan.",
    'Department of Urology, Shizuoka City Shizuoka Hospital, Shizuoka City, Shizuoka, Japan.',
    'Department of Urology, Toyama Rousai Hospital, Uozu, Toyama, Japan.',
    'Department of Urology, Kurashiki Central Hospital, Kurashiki, Okayama, Japan.',
    'Department of General Medicine, Tone Chuo Hospital, Numata, Gunma, Japan.',
    'Department of Gastroenterology and Hepatology, Meiwa Hospital, Nishinomiya, Japan.',
    'Department of Gastroenterology and Hepatology, Kyoto Katsura Hospital, Kyoto, Japan.',
    'Department of Medical Oncology, Shiga General Hospital, Moriyama, Japan.',
    'Department of Gastroenterology and Hepatology, Shiga General Hospital, Moriyama, Japan.',
    'Department of Neurosurgery, National Cerebral and Cardiovascular Center, Suita, Japan.',
    'Division of Medical Statistics and Data Science, Foundation for Biomedical Research and Innovation, Kobe, Japan.',
    'Department of Nursing, Sakakibara Heart Institute, Tokyo 183-0003, Japan.',
    'Department of Nursing, Social Insurance Union of Societies Related to Nursing, Tokyo 150-0001, Japan.',
    'Department of Nursing, Aso Iizuka Hospital, Fukuoka 820-8505, Japan.',
    'Center for Surveillance, Immunization, and Epidemiologic Research, National Institute of Infectious Diseases, Tokyo 162-8640, Japan.',
    'Department of Cardiology, Hiratsuka Kyosai Hospital, Hiratsuka, Japan.',
    'Division of Cardiology, Japanese Red Cross Aichi Medical Center Nagoya Daini Hospital, Nagoya, Japan.',
    'Department of Cardiology, Ogaki Municipal Hospital, Ogaki, Japan.',
    'Division of Cardiology, Hirakata Kohsai Hospital, Hirakata, Japan. Electronic address: taketaka@kuhp.kyoto-u.ac.jp.',
    'Center for Gastroenterology, Teine-Keijinkai Hospital, Sapporo, Hokkaido, Japan.',
    'Department of Internal Medicine, Kushiro Rosai Hospital, Kushiro, Hokkaido, Japan.',
    'Department of Gastroenterology and Hepatology, Hakodate Municipal Hospital, Hakodate, Hokkaido, Japan.',
    'Department of Gastroenterology, Steel Memorial Muroran Hospital, Muroran, Hokkaido, Japan.',
    'Department of Gastroenterology, Tomakomai City Hospital, Tomakomai, Hokkaido, Japan.',
    'Department of Gastroenterology, Iwamizawa Municipal General Hospital, Iwamizawa, Hokkaido, Japan.',
    'Department of Gastroenterology, NTT East Sapporo Hospital, Sapporo, Hokkaido, Japan.',
    'Department of Gastroenterology, Kitami Red Cross Hospital, Kitami, Hokkaido, Japan.',
    'Center for Gastroenterology, Teine-Keijinkai Hospital, Sapporo, Hokkaido, Japan.',
    'Division of Gastric Surgery Shizuoka Cancer Center Shizuoka Japan.',
    'Department of Surgery, Toyama City Hospital, Toyama, Japan.',
    'Department of Gastrointestinal Endoscopy, NTT Medical Center Tokyo, Tokyo, Japan.',
    "Department of Gastroenterology, St. Luke's International Hospital, Tokyo, Japan.",
    'Department of Urology, Kanagawa Prefectural Ashigarakami Hospital, Kanagawa, Japan.',
  ];
  const filteredUidAndAuthorsArray = uidAndAuthorsArray.filter(
    ([, , affiliation]) =>
      !excludeAffiliations.includes(affiliation) && affiliation !== null
  );

  const header = ['PubMed ID', '著者名', '所属'];
  const outputValues = [header, ...filteredUidAndAuthorsArray];

  const outputSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    'PubMedの所属情報'
  );
  outputSheet.clearContents();
  outputSheet
    .getRange(1, 1, outputValues.length, outputValues[0].length)
    .setValues(outputValues);
}

// WoS GUI検索結果のタブ区切りテキストをスプレッドシートに書き出す処理
export function importWosTsvToSheet_(): void {
  const thisFolderId = getScriptProperty_('thisFolderId');
  const folder = DriveApp.getFolderById(thisFolderId);
  const fileIterator = folder.getFiles();
  let tsvContent = '';
  while (fileIterator.hasNext()) {
    const file = fileIterator.next();
    if (file.getName() === 'savedrecs.txt') {
      tsvContent = file.getBlob().getDataAsString();
      break;
    }
  }
  if (!tsvContent) {
    throw new Error('savedrecs.txt file not found in the specified folder.');
  }
  const rows: string[][] = tsvContent.split('\n').map(line => line.split('\t'));
  const headerLength = rows[0].length;
  const outputValues = rows.map(row => {
    if (row.length < headerLength) {
      return [...row, ...Array(headerLength - row.length).fill('')];
    }
    return row.slice(0, headerLength);
  });
  const outputSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    'WoS検索結果'
  );
  outputSheet.clearContents();
  outputSheet
    .getRange(1, 1, outputValues.length, outputValues[0].length)
    .setValues(outputValues);
  return;
}
// PubMedの所属情報シートとWoS検索結果シートを突き合わせて、WoSIDとPubMedデータ結合シートに結果を書き出す処理
export function mergeWosResultsWithPubmed_(): void {
  const pubmedSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    'PubMedの所属情報'
  );
  const pubmedValues: string[][] = pubmedSheet.getDataRange().getValues();
  const wosSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    'WoS検索結果'
  );
  const wosValues: string[][] = wosSheet.getDataRange().getValues();
  const outputSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    'WoSIDとPubMedデータ結合'
  );
  const pubmedHeader = pubmedValues[0];
  const wosHeader = wosValues[0];
  const outputHeader = [...wosHeader, ...pubmedHeader.slice(1)];

  // PubMedのA列(PMID)をキーにMapを作成
  const pubmedMap = new Map<string, string[][]>();
  for (let i = 1; i < pubmedValues.length; i++) {
    const row = pubmedValues[i];
    const key = String(row[0]);
    const values = pubmedValues.filter(r => String(r[0]) === key);
    pubmedMap.set(key, values);
  }

  // WoSのPM列(0始まりで何列目か)を取得
  const wosKeyCol = wosHeader.indexOf('PM');
  if (wosKeyCol === -1) throw new Error('PM列がWoS検索結果にありません');

  // left join
  const outputRows: string[][] = [outputHeader];
  for (let i = 1; i < wosValues.length; i++) {
    const wosRow = wosValues[i];
    const key = String(wosRow[wosKeyCol]);
    const pubmedRows = pubmedMap.get(key);
    if (pubmedRows) {
      pubmedRows.forEach(pubmedRow => {
        outputRows.push([...wosRow, ...pubmedRow.slice(1)]);
      });
    } else {
      //outputRows.push([...wosRow, ...Array(pubmedHeader.length - 1).fill('')]);
    }
  }
  const outputValues = outputRows.map(row => [
    row[70],
    row[65],
    row[71],
    row[72],
  ]); // WoSID, 著者名, 所属

  outputSheet.clearContents();
  outputSheet
    .getRange(1, 1, outputValues.length, outputValues[0].length)
    .setValues(outputValues);
}
// WoS GUIにて検索した結果と調査依頼シートの内容を突き合わせる処理
export function mergeRequestSheetWithWosResults_(): void {
  const pubmedSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    'WoSIDとPubMedデータ結合'
  );
  const pubmedValues: string[][] = pubmedSheet.getDataRange().getValues();
  const pubmedMap = new Map<string, string[]>();
  for (let i = 1; i < pubmedValues.length; i++) {
    const [wosid, pmid, author, affiliation] = pubmedValues[i];
    if (!pubmedMap.has(wosid)) pubmedMap.set(wosid, []);
    pubmedMap.get(wosid)!.push(`${author}:${affiliation}`);
  }
  const groupedPubmedArray: string[][] = Array.from(pubmedMap.entries()).map(
    ([a, arr]) => [a, arr.join('\n')]
  );
  const wosidAndAffiliationMap = new Map<string, string>();
  groupedPubmedArray.forEach(([wosid, affil]) => {
    wosidAndAffiliationMap.set(wosid, affil);
  });
  const requestSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    '調査対象'
  );
  const requestValues: string[][] = requestSheet.getDataRange().getValues();
  const wosSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    'WoS検索結果'
  );
  const wosValues: string[][] = wosSheet.getDataRange().getValues();
  const wosTargetColnames = ['UT', 'PY', 'PD', 'PM', 'DT', 'C1'];
  const header = wosValues[0].map((col: string) => col.trim());
  const wosTargetColMaps: Map<string, number> = new Map();
  wosTargetColnames.forEach((colname: string) => {
    const idx: number = header.indexOf(colname);
    if (idx === -1) {
      throw new Error(`Column ${colname} not found in WoS search results.`);
    }
    wosTargetColMaps.set(colname, idx);
  });
  const idxWosUt = 0;
  const idxWosPy = 1;
  const idxWosPm = 3;
  const idxWosDt = 4;
  const idxRequestWosId = 3;
  const validTypes = ['Letter', 'Editorial Material', 'Article', 'Review'];
  const wosGuiValues: string[][] = [];
  wosValues.forEach((row: string[], idx: number) => {
    const filteredRow: string[] = [];
    wosTargetColMaps.forEach((idx: number, _) => {
      filteredRow.push(row[idx]);
    });
    let value1 = ''; // 出力対象外の理由
    let value2 = ''; // PubMedの所属情報
    const uid = String(filteredRow[idxWosUt].trim());
    if (idx === 0) {
      value1 = '出力対象外の理由';
      value2 = 'PubMedの所属情報';
    } else if (uid === 'WOS:001174582400001') {
      value1 = [
        '施設名の記載に誤りがある',
        'Ichiro Hisatome:HNOYonago Medical Center, Yonago, Japan.',
      ].join('\n');
    } else if (String(filteredRow[idxWosPy]) !== '2024') {
      value1 = 'PYが2024以外の論文';
    } else {
      const dt = String(filteredRow[idxWosDt]);
      if (!validTypes.some(type => dt.includes(type))) {
        value1 = 'DTがLetter, Editorial Material, Article, Review以外の論文';
      }
    }
    if (value1 === '') {
      if (
        uid === 'WOS:001204453100001' ||
        uid === 'WOS:001247267400001' ||
        uid === 'WOS:001243805800006' ||
        uid === 'WOS:001230489600006' ||
        uid === 'WOS:001252768100001' ||
        uid === 'WOS:001246162300001' ||
        uid === 'WOS:001251770200001' ||
        uid === 'WOS:001266321000065' ||
        uid === 'WOS:001278822800032' ||
        uid === 'WOS:001293234400001' ||
        uid === 'WOS:001307323300001' ||
        uid === 'WOS:001284904100072' ||
        uid === 'WOS:001285216600001' ||
        uid === 'WOS:001314804100001' ||
        uid === 'WOS:001396274800001' ||
        uid === 'WOS:001381133500003' ||
        uid === 'WOS:001194776600001' ||
        uid === 'WOS:001292893800003' ||
        uid === 'WOS:001307024200013' ||
        uid === 'WOS:001243347800007' ||
        uid === 'WOS:001157696000001' ||
        uid === 'WOS:001179165100001' ||
        uid === 'WOS:001296688600003' ||
        uid === 'WOS:001215740900001'
      ) {
        value1 =
          '施設名に「NHO」「National Hospital Organization」の記載がない';
      } else if (
        uid === 'WOS:001369941600001' ||
        uid === 'WOS:001381947700001' ||
        uid === 'WOS:001325874600001' ||
        uid === 'WOS:001337605800001' ||
        uid === 'WOS:001315080400001' ||
        uid === 'WOS:001290093700001' ||
        uid === 'WOS:001276092900001' ||
        uid === 'WOS:001262309200001' ||
        uid === 'WOS:001234479800001' ||
        uid === 'WOS:001299464100001' ||
        uid === 'WOS:001300968800001' ||
        uid === 'WOS:001174876500003' ||
        uid === 'WOS:001274076200020'
      ) {
        value1 = 'issue #125の修正対象施設（2025/6修正）';
      } else if (
        uid === 'WOS:001362370000001' ||
        uid === 'WOS:001420056300011' ||
        uid === 'WOS:001304493800012' ||
        uid === 'WOS:001299011500006' ||
        uid === 'WOS:001184037200001' ||
        uid === 'WOS:001180367800001' ||
        uid === 'WOS:001304493800012'
      ) {
        value1 = 'issue #121の修正対象施設（2025/6クラリベイト社にてDB修正）';
      } else if (uid === 'WOS:001490513700008') {
        // 近畿中央呼吸器センター
        value1 = 'issue #121の修正対象施設（2025/6クラリベイト社にてDB修正）';
      } else if (uid === 'WOS:001367562200001') {
        value1 = 'issue #125の修正対象施設（2025/6修正）';
        value2 = [
          'Shiiya, Norihiko',
          'First Department of Surgery, Hamamatsu University School of Medicine, Hamamatsu, Japan.',
          'Department of Cardiovascular Surgery, NHO Hakodate Medical Center, Hokkaido, Japan.',
        ].join('\n');
      } else if (uid === 'WOS:001300026600001') {
        // Subjective symptoms are triggers for the detection of immune checkpoint inhibitor-induced interstitial lung disease and associate with disease severity: a single-center retrospective study.
        // Journal of Pharmaceutical Health Care and Sciences
        // 谷澤公伸
        value1 = '該当著者がNHO施設に所属している記載がない';
        value2 = [
          'Kiminobu Tanizawa',
          'Department of Respiratory Medicine, Graduate School of Medicine, Kyoto University, 54 Shogoin Kawahara-cho, Sakyo-ku, Kyoto, 606-8507, Japan.',
          'https://jphcs.biomedcentral.com/articles/10.1186/s40780-024-00373-7',
        ].join('\n');
      } else if (uid === 'WOS:001164609700001') {
        // Clinicopathologic Features of Adult-onset Still's Disease Complicated by Severe Liver Injury
        // Internal Medicine
        // 国府島庸之
        value1 = '該当著者がNHO施設に所属している記載がない';
        value2 = [
          'Kohjima, Motoyuki',
          'Department of Medicine and Bioregulatory Science, Graduate School of Medical Sciences, Kyushu University, Japan.',
          'https://www.jstage.jst.go.jp/article/internalmedicine/63/4/63_2043-23/_article',
        ].join('\n');
      } else if (uid === 'WOS:001206355700001') {
        // Potential utility of pretreatment serum miRNAs for optimal treatment selection in advanced high-grade serous ovarian cancer
        // Japanese Journal of Clinical Oncology
        // 植原貴史
        value1 = '該当著者がNHO施設に所属している記載がない';
        value2 = [
          'Uehara, Takashi',
          'Department of Gynecology, National Cancer Center Hospital, Tokyo, Japan.',
          'Department of Obstetrics and Gynecology, Chiba University Hospital, Chiba, Japan.',
          'https://academic.oup.com/jjco/article/54/8/917/7655838?login=false',
        ].join('\n');
      } else if (uid === 'WOS:001526826000006') {
        value1 = 'クラリベイト社に修正依頼を行う';
      } else if (
        [
          'WOS:001040584800001',
          'WOS:001505211700003',
          'WOS:001492944500036',
          'WOS:001472196600010',
          'WOS:001253422300001',
          'WOS:001476878100016',
        ].includes(uid)
      ) {
        value1 = '原因不明';
      } else if (uid === 'WOS:001183950500001') {
        value1 = '原因不明';
        value2 = [
          'Kanayama, Hiroyuki',
          'PubMed Affiliation:',
          'Department of Molecular Oral Physiology, Institute of Biomedical Sciences, Tokushima University Graduate School, 3-18-15 Kuramoto, Tokushima, 770-8504,  Japan.,',
          'Department of Oral and Maxillofacial Surgery, National Hospital Organization Osaka National Hospital, Osaka, 540-0006, Japan.',
          'WoS C1:',
          '[Kanayama, Hiroyuki; Yoshimura, Hiroshi] Tokushima Univ, Inst Biomed Sci, Dept Mol Oral Physiol, Grad Sch, 3-18-15 Kuramoto, Tokushima 7708504, Japan; ',
          '[Kanayama, Hiroyuki] Osaka Natl Hosp, Natl Hosp Org, Dept Oral & Maxillofacial Surg, Osaka 5400006, Japan;',
        ].join('\n');
      } else if (uid === 'WOS:001526826000003') {
        value1 = '原因不明';
        value2 = [
          'Imai, Ryo',
          '[Imai, Ryo; Yoshida, Masahiro; Shimokata, Shigetake; Okumura, Naoki; Murohara, Toyoaki; Kondo, Takahisa] Nagoya Univ, Dept Cardiol, Grad Sch Med, Nagoya, Aichi, Japan;',
          'Department of Cardiology, Nagoya University Graduate School of Medicine, Nagoya, Japan.',
          'Department of Cardiology, NHO Nagoya Medical Center, Nagoya, Japan.',
          'PubMed Affiliation:',
          'WoS C1:',
          '[Imai, Ryo; Kondo, Takahisa] NHO, Dept Cardiol, Nagoya Med Ctr, 4-1-1 Sannomaru,Naka Ku, Nagoya, Aichi 4600001, Japan;',
        ].join('\n');
      } else if (uid === 'WOS:001200552800001') {
        value1 = '論文の修正依頼が必要';
        value2 =
          'https://docs.google.com/document/d/1gjjbdVCupCXK3G4GzmE2Xq5DXxNsrLWmAkFkK3otCSs/edit?tab=t.0';
      } else if (uid === 'WOS:001252588100001') {
        value1 = '論文の修正依頼が必要';
        value2 =
          'https://docs.google.com/document/d/1sH_J3CryhEGcQ9I6zxRNTE_V9vnEjJoPY5ohmQVU1SU/edit?tab=t.0';
      }
      if (wosidAndAffiliationMap.has(filteredRow[idxWosUt])) {
        value2 = wosidAndAffiliationMap.get(filteredRow[idxWosUt])!;
      }
    }

    const isMatched: string[][] = requestValues.filter(
      requestRow =>
        requestRow[idxRequestWosId].trim() === filteredRow[idxWosUt].trim()
    );
    if (isMatched.length === 0 && idx !== 0) {
      console.warn(`No matching WOS ID found for UT: ${filteredRow[idxWosUt]}`);
    }
    if (isMatched.length > 1) {
      console.warn(
        `Multiple matching WOS IDs found for UT: ${filteredRow[idxWosUt]}`
      );
    }
    // isMatchedが複数ある場合は全てのレコードを出力
    const joinRecords: string[][] =
      isMatched.length > 0
        ? isMatched.map(row => row.slice(0, -1))
        : idx === 0
          ? [['施設コード', '施設名', 'PubMed ID']]
          : [['', '', '']];
    // joinRecordsごとにtargetRowを作成
    if (joinRecords.length > 1) {
      joinRecords.forEach(joinRecord => {
        wosGuiValues.push([...joinRecord, ...filteredRow, value1, value2]);
      });
      //
    } else {
      wosGuiValues.push([...joinRecords[0], ...filteredRow, value1, value2]);
    }
  });
  const outputSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    '調査結果'
  );
  outputSheet.clearContents();
  outputSheet
    .getRange(1, 1, wosGuiValues.length, wosGuiValues[0].length)
    .setValues(wosGuiValues);
  return;
}
export function createSubmissionSheet_(): void {
  const requestSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    '調査対象'
  );
  // 施設コード、施設名、WoS ID
  const requestValues: string[][] = requestSheet
    .getDataRange()
    .getValues()
    .map(row => [row[0], row[1], row[3]]);
  // 調査結果シートの内容を取得
  const resultSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    '調査結果'
  );
  const resultFacilityCodeCol = 0; // 施設コードの列インデックス
  const resultWosIdCol = 3; // WoS IDの列インデックス
  const resultValues: string[][] = resultSheet.getDataRange().getValues();
  // 施設コードとWoS IDをキーにしてrequestValuesとresultValuesをleft joinする
  const resultMap = new Map<string, string[]>();
  for (let i = 1; i < resultValues.length; i++) {
    const row = resultValues[i];
    const key = `${row[resultFacilityCodeCol]}|${row[resultWosIdCol].trim()}`;
    resultMap.set(key, row);
  }
  const joinedValues: string[][] = [resultValues[0]]; // ヘッダー
  for (let i = 1; i < requestValues.length; i++) {
    const [facilityCode, , wosId] = requestValues[i];
    const key = `${facilityCode}|${wosId.trim()}`;
    if (resultMap.has(key)) {
      joinedValues.push(resultMap.get(key)!);
    } else {
      // resultValuesのヘッダー長に合わせて空欄で埋める
      joinedValues.push([
        facilityCode,
        requestValues[i][1],
        '',
        wosId,
        ...Array(resultValues[0].length - 4).fill(''),
      ]);
    }
  }
  const outputValues: string[][] = joinedValues.map((row, idx) => {
    if (idx === 0) {
      return [
        '施設コード',
        '施設名',
        'Wos連番',
        '出力対象外の理由',
        'PMID',
        'PY',
        'DT(docType)',
        'Wosの所属情報',
        'PubMedの所属情報',
      ];
    }
    return [
      row[0], // 施設コード
      row[1], // 施設名
      row[3], // WoS ID
      row[9],
      row[4],
      row[6], // PubMed ID
      row[7], // 著者名
      row[8],
      row[10],
    ];
  });

  const outputSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    '提出用'
  );
  outputSheet.clearContents();
  outputSheet
    .getRange(1, 1, outputValues.length, outputValues[0].length)
    .setValues(outputValues);
  return;
}

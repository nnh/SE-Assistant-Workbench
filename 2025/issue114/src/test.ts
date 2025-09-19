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
function getDocByPropertyKey_(
  propertyKey: string
): GoogleAppsScript.Document.Document {
  const targetProperty =
    PropertiesService.getScriptProperties().getProperty(propertyKey);
  if (!targetProperty) {
    throw new Error(`Property with key "${propertyKey}" not found.`);
  }
  const docId = targetProperty;
  const doc = DocumentApp.openById(docId);
  return doc;
}
function getTabsFromDoc_(doc: GoogleAppsScript.Document.Document) {
  const tabs = doc.getTabs();
  return tabs;
}
export function arraySliceAndJoin_(
  array: { text: string; heading: string }[],
  start: number,
  end: number
) {
  return array
    .slice(start, end)
    .map(item => item.text)
    .join('\n');
}
function getInputBody_(): GoogleAppsScript.Document.Body {
  const inputPrt: GoogleAppsScript.Document.Document =
    getDocByPropertyKey_('ProtocolDocId');
  const tabs: GoogleAppsScript.Document.Tab[] = getTabsFromDoc_(inputPrt);
  const firstTab: GoogleAppsScript.Document.Tab = tabs[0];
  const body: GoogleAppsScript.Document.Body = firstTab
    .asDocumentTab()
    .getBody();
  return body;
}
// 目的及び評価項目の取得
export function getPurposeAndEndpoints_(): Map<string, string[]> {
  const body = getInputBody_();
  const childCount = body.getNumChildren();
  const purposeAndEndpoints = new Map<string, string[]>();
  let targetFlag = false;
  let table = null;
  for (let i = 0; i < childCount; i++) {
    const element = body.getChild(i);
    if (element.getType() === DocumentApp.ElementType.PARAGRAPH) {
      if (element.asParagraph().getText().includes('目的および評価項目')) {
        targetFlag = true;
      }
    }
    if (element.getType() === DocumentApp.ElementType.TABLE) {
      if (!targetFlag) {
        continue;
      }
      table = element.asTable();
      break;
    }
  }
  if (table === null) {
    console.warn("'目的および評価項目' table not found.");
    return purposeAndEndpoints;
  }
  const primaryPurpose = getListItemsFromTableCell_(table.getCell(1, 0));
  const primaryEndpoints = getListItemsFromTableCell_(table.getCell(1, 1));
  purposeAndEndpoints.set('primaryPurpose', primaryPurpose);
  purposeAndEndpoints.set('primaryEndpoints', primaryEndpoints);
  if (table.getNumRows() > 2) {
    const secondaryPurpose = getListItemsFromTableCell_(table.getCell(2, 0));
    const secondaryEndpoints = getListItemsFromTableCell_(table.getCell(2, 1));
    purposeAndEndpoints.set('secondaryPurpose', secondaryPurpose);
    purposeAndEndpoints.set('secondaryEndpoints', secondaryEndpoints);
  }
  // exploratoryのセルが存在する場合のみ処理する
  if (table.getNumRows() > 3) {
    const exploratoryPurpose = getListItemsFromTableCell_(table.getCell(3, 0));
    const exploratoryEndpoints = getListItemsFromTableCell_(
      table.getCell(3, 1)
    );
    purposeAndEndpoints.set('exploratoryPurpose', exploratoryPurpose);
    purposeAndEndpoints.set('exploratoryEndpoints', exploratoryEndpoints);
  }
  return purposeAndEndpoints;
}

function getListItemsFromTableCell_(
  cell: GoogleAppsScript.Document.TableCell
): string[] {
  const items: string[] = [];
  const numChildren = cell.getNumChildren();
  for (let i = 0; i < numChildren; i++) {
    const child = cell.getChild(i);
    if (child.getType() === DocumentApp.ElementType.LIST_ITEM) {
      items.push(child.asListItem().getText().trim());
    }
  }
  return items;
}

export function getTargetTextArray_(): { text: string; heading: string }[] {
  const body = getInputBody_();
  const childCount = body.getNumChildren();
  const result: { text: string; heading: string }[] = [];

  for (let i = 0; i < childCount; i++) {
    const element = body.getChild(i);

    // 目次は除外
    if (element.getType() === DocumentApp.ElementType.TABLE_OF_CONTENTS)
      continue;

    if (element.getType() === DocumentApp.ElementType.PARAGRAPH) {
      const para = element.asParagraph();
      const text = para.getText().trim();
      if (text === '') continue;

      const heading = para.getHeading(); // DocumentApp.ParagraphHeading
      result.push({
        text: text,
        heading: heading.toString(), // "HEADING1" など列挙型の文字列
      });
    }
  }
  return result;
}

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
export function getDocByPropertyKey_(
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
export function getTabsFromDoc_(doc: GoogleAppsScript.Document.Document) {
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

/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const editPayloadForTeams_ = message => {
  return {
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.2',
          body: [
            {
              type: 'TextBlock',
              text: message,
              wrap: true,
            },
          ],
        },
      },
    ],
  };
};

function getThisFileInformation_() {
  const ss = getScriptBindingType_();
  if (ss === null) {
    throw new Error('This script is not bound to a Spreadsheet.');
  }
  const fileUrl = ss.getUrl();
  const filename = ss.getName();
  return { fileUrl, filename };
}
function getScriptBindingType_() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) {
      return ss;
    }
  } catch (e) {}
  return null;
}

const execSendTeamsNotification_ = () => {
  const { filename, fileUrl } = getThisFileInformation_();
  const url =
    PropertiesService.getScriptProperties().getProperty('WEBHOOK_URL');
  if (!url) {
    throw new Error('WEBHOOK_URL not set in script properties.');
  }
  sendTeamsWebHook_(
    url,
    `## フォームが送信されました。内容を確認してください。\n\n* ファイル名: ${filename}\n* ファイルURL: ${fileUrl}`
  );
};
const sendTeamsWebHook_ = (webhookUrl, message) => {
  const payload = editPayloadForTeams_(message);
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
  };
  try {
    const response = UrlFetchApp.fetch(webhookUrl, options);
    console.log(
      'Message sent to Teams channel. Response code: ' +
        response.getResponseCode()
    );
  } catch (error) {
    console.log('Error sending message to Teams channel: ' + error);
  }
};

function main() {
  execSendTeamsNotification_();
}
console.log('');

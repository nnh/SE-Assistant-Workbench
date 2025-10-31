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
import { editPayloadForTeams_ } from '../src/editPayload';

describe('editPayload', () => {
  describe('editPayloadForTeams_', () => {
    it('Returns a hello message', () => {
      expect(editPayloadForTeams_('Hello Apps Script!')).toEqual({
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
                  text: 'Hello Apps Script!',
                  wrap: true,
                },
              ],
            },
          },
        ],
      });
    });
  });
});

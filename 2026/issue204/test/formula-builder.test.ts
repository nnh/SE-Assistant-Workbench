/**
 * Copyright 2026 Google LLC
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
import {
  buildDisplayNameFormula_,
  buildMissingStartCondition_,
  buildTimelineEndFormula_,
  buildTimelineStartFormula_,
  buildTrialInfoFormula_,
} from '../src/formula-builder';

describe('buildTrialInfoFormula_', () => {
  it('Stat の取り込み・Datacenter の left join・追跡終了→登録終了の昇順ソートを1つの数式で行う', () => {
    expect(buildTrialInfoFormula_('https://example.com/x')).toBe(
      '=LET(' +
        'stat,QUERY(IMPORTRANGE("https://example.com/x","Stat!A2:Q"),' +
        '"select Col1, Col3, Col6, Col14, Col16, Col17 where Col1 is not null and ' +
        "(Col14 is null or not (Col14 = 'Completed' or Col14 = 'Stop' or Col14 = 'No Support'))\",0)," +
        'joined,ARRAYFORMULA(IFERROR(VLOOKUP(INDEX(stat,0,1),' +
        'IMPORTRANGE("https://example.com/x","Datacenter!A:W"),{20,21,22,23},FALSE),"")),' +
        'VSTACK({"プロトコルID","試験名","研究種別","状態","FPI","LPO",' +
        '"登録開始","登録終了","中間用データ固定","追跡終了"},' +
        'SORT(HSTACK(stat,joined),10,TRUE,8,TRUE)))',
    );
  });
  it('URL 内のダブルクォートをエスケープする', () => {
    expect(buildTrialInfoFormula_('a"b')).toContain('IMPORTRANGE("a""b"');
  });
});

describe('試験一覧の自動計算の列', () => {
  it('タイムライン開始は開始日（空欄なら今日）。試験名が空欄・非表示なら空欄', () => {
    expect(buildTimelineStartFormula_()).toBe(
      '=ARRAYFORMULA(IF((A2:A="")+(B2:B="非表示"),"",IF(C2:C="",TODAY(),C2:C)))',
    );
  });
  it('タイムライン終了は終了日を優先し、空欄なら開始日の4か月後（開始日も空欄ならタイムライン開始と同じ）', () => {
    expect(buildTimelineEndFormula_()).toBe(
      '=ARRAYFORMULA(IF(F2:F="","",IF(D2:D<>"",D2:D,IF(C2:C="",F2:F,EDATE(C2:C,4)))))',
    );
  });
  it('表示名は試験名に、開始日が空欄なら「（スケジュール未定）」を付ける', () => {
    expect(buildDisplayNameFormula_()).toBe(
      '=ARRAYFORMULA(IF(A2:A="","",A2:A&IF(C2:C="","（スケジュール未定）","")))',
    );
  });
  it('試験名があり非表示でなく開始日が空欄のときに真になる条件', () => {
    expect(buildMissingStartCondition_()).toBe(
      '=AND($A2<>"",$B2<>"非表示",$C2="")',
    );
  });
});

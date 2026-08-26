// DMドメインを生成する。R版のbuild_dm_domain.R/populate_dm_domain()に対応するが、
// 現時点ではUSUBJID/STUDYID/SUBJIDの採番、SITEID、BRTHDTC、ARM算出(割り付けグラフ)、
// radio_button型・check_box型・date型項目の埋め込み、それ以外のDUMMYフォールバックまで対応する。
// meddra/drug型項目(外部辞書が必要)、presence_conditionsによるゲーティングはまだ未移植

// R版constant.Rのdummy_siteに対応。ダミー施設を10件生成する(SITEIDは9桁のランダムな数値文字列で重複無し、
// SITENAMEは「ダミーNN病院」)。生成のたびに呼び、その回の生成セッション内で使い回す
function generateDummySites() {
  const usedIds = new Set();
  const sites = [];
  for (let i = 1; i <= 10; i += 1) {
    let siteId;
    do {
      siteId = String(Math.floor(100000000 + Math.random() * 800000000));
    } while (usedIds.has(siteId));
    usedIds.add(siteId);
    sites.push({ SITEID: siteId, SITENAME: `ダミー${String(i).padStart(2, "0")}病院` });
  }
  return sites;
}

// sheet_groupsのうちis_default==trueのグループに含まれるsheetのalias_name一覧を返す。
// defaultグループは全被験者が共通して持つシート集合を表す
function defaultSheetAliasNames(sheetGroups) {
  const names = new Set();
  (sheetGroups || []).forEach((g) => {
    if (g.is_default) {
      (g.sheets || []).forEach((s) => names.add(s.alias_name));
    }
  });
  return [...names];
}

// 被験者ごとに、有効なalias_name(そのシートが実際にその被験者に表示される)集合と、
// 割り付け系シート(category=="allocation")ごとに割り当てたcodeを計算する。
// defaultグループのシートを起点に、割り付け結果に応じて追加で有効になる非defaultグループのシートを
// 連鎖的にたどる(Rのbuild_subject_active_sheets()に対応)。
// 戻り値: { activeSheets: USUBJID -> Set(alias_name), assignedCodes: USUBJID -> { alloc_alias: code } }
function buildSubjectActiveSheets(sheets, sheetGroups, usubjids) {
  const defaultAlias = new Set(defaultSheetAliasNames(sheetGroups));

  // sheet_groups(defaultも非defaultも含む)のどこにも登場しないシート(例: registration)は、
  // 割り付けによる条件分岐の対象外(=常に表示される)とみなし、defaultと同様に全被験者の
  // 初期有効集合に含める
  const allGroupedAliasNames = new Set();
  (sheetGroups || []).forEach((g) => (g.sheets || []).forEach((s) => allGroupedAliasNames.add(s.alias_name)));
  const allSheetAliasNames = sheets.map((s) => s.alias_name);
  const ungroupedAliasNames = allSheetAliasNames.filter((a) => !allGroupedAliasNames.has(a));
  const initialActive = new Set([...defaultAlias, ...ungroupedAliasNames]);

  const allocationLookup = {};
  sheets.forEach((s) => {
    if (s.category === "allocation") allocationLookup[s.alias_name] = s;
  });
  const nonDefaultGroups = (sheetGroups || []).filter((g) => !g.is_default);

  const activeSheets = {};
  const assignedCodes = {};
  usubjids.forEach((id) => {
    activeSheets[id] = new Set(initialActive);
    assignedCodes[id] = {};
  });

  if (Object.keys(allocationLookup).length === 0) {
    return { activeSheets, assignedCodes };
  }

  let changed = true;
  while (changed) {
    changed = false;
    usubjids.forEach((usubjid) => {
      const reachableAllocs = [...activeSheets[usubjid]].filter((a) => a in allocationLookup);
      const unassigned = reachableAllocs.filter((a) => !(a in assignedCodes[usubjid]));
      unassigned.forEach((allocAlias) => {
        const codes = ((allocationLookup[allocAlias].allocation || {}).groups || []).map((g) => g.code);
        if (codes.length === 0) return;
        const code = sampleOne(codes);
        assignedCodes[usubjid][allocAlias] = code;
        changed = true;

        nonDefaultGroups
          .filter((g) => (g.allocation_sheet || {}).alias_name === allocAlias && g.allocation_group === code)
          .forEach((g) => {
            (g.sheets || []).forEach((s) => activeSheets[usubjid].add(s.alias_name));
          });
      });
    });
  }

  return { activeSheets, assignedCodes };
}

// BRTHDTC(生年月日)を生成する。R版のgenerate_brthdtc.Rに対応する。
// 年齢層(その他20-64歳/前期高齢者65-74歳/後期高齢者75-89歳)を確率的に選んでから、
// その層の範囲内でランダムな年齢(日単位)を選び、refDateから引いて生年月日にする
function generateBrthdtc(n, refDate) {
  const ref = new Date(refDate);
  const strata = [
    { minAge: 20, maxAge: 64, prob: 0.5 },
    { minAge: 65, maxAge: 74, prob: 0.25 },
    { minAge: 75, maxAge: 89, prob: 0.25 },
  ];
  const daysPerYear = 365.25;
  const oneDay = 24 * 60 * 60 * 1000;

  const brthdtc = [];
  for (let i = 0; i < n; i += 1) {
    const r = Math.random();
    let cumProb = 0;
    let stratum = strata[strata.length - 1];
    for (const s of strata) {
      cumProb += s.prob;
      if (r < cumProb) {
        stratum = s;
        break;
      }
    }
    const minDays = stratum.minAge * daysPerYear;
    const maxDays = (stratum.maxAge + 1) * daysPerYear - 1;
    const ageDays = Math.round(minDays + Math.random() * (maxDays - minDays));
    const brthDate = new Date(ref.getTime() - ageDays * oneDay);
    brthdtc.push(brthDate.toISOString().slice(0, 10));
  }
  return brthdtc;
}

// n人分のDMの土台(USUBJID等)を作り、BRTHDTC・ARMも生成する(Rのbuild_dm_domain()に対応)。
// ARMは、defaultグループに属する割り付けシート(通常1つ)に割り当てられたcodeとする。
// 戻り値: { dm: 行の配列, activeSheets: buildSubjectActiveSheets()の結果(他ドメイン生成時に使う) }
function buildDmDomain(n, sheets, sheetGroups) {
  const brthdtc = generateBrthdtc(n, new Date());
  const dummySites = generateDummySites();
  const usubjids = [];
  for (let i = 1; i <= n; i += 1) {
    usubjids.push(`dummy-studyid-${String(i).padStart(4, "0")}`);
  }

  const activeResult = buildSubjectActiveSheets(sheets, sheetGroups, usubjids);

  const defaultAlias = defaultSheetAliasNames(sheetGroups);
  const defaultAllocationAlias = sheets
    .filter((s) => s.category === "allocation" && defaultAlias.includes(s.alias_name))
    .map((s) => s.alias_name);

  const rows = usubjids.map((usubjid, i) => {
    let arm = "";
    for (const alias of defaultAllocationAlias) {
      const code = activeResult.assignedCodes[usubjid][alias];
      if (code != null) {
        arm = code;
        break;
      }
    }
    return {
      STUDYID: "dummy-studyid",
      DOMAIN: "DM",
      USUBJID: usubjid,
      SUBJID: String(i + 1).padStart(4, "0"),
      SITEID: sampleOne(dummySites).SITEID,
      BRTHDTC: brthdtc[i],
      ARM: arm,
    };
  });

  return { dm: rows, activeSheets: activeResult.activeSheets };
}

// radio_button/check_box型のDM項目に、選択肢(code、無ければdefault_value)からランダムな値を入れる
// (check_boxは複数選択がカンマ区切りで1つの文字列になる)。
// date型の項目(BRTHDTCは既にbuildDmDomain()で埋まっているため対象外)には、
// registrationStartDate〜今日の間のランダムな日付を入れる(Rのpopulate_date_fields()に対応)
function populateDmDomain(dm, cdiscVariableValues, registrationStartDate) {
  const dmSpec = cdiscVariableValues.filter((r) => r.prefix === "DM");
  const existingColumns = new Set(Object.keys(dm[0] || {}));

  const choiceSpec = dmSpec.filter(
    (r) => (r.field_type === "radio_button" || r.field_type === "check_box") && !existingColumns.has(r.cdisc_variable)
  );
  const choicesByVariable = {};
  const fieldTypeByVariable = {};
  choiceSpec.forEach((row) => {
    const code = row.code != null ? row.code : row.default_value;
    if (!choicesByVariable[row.cdisc_variable]) choicesByVariable[row.cdisc_variable] = [];
    choicesByVariable[row.cdisc_variable].push(code);
    if (row.field_type === "check_box") fieldTypeByVariable[row.cdisc_variable] = "check_box";
  });
  Object.keys(choicesByVariable).forEach((varName) => {
    const choices = [...new Set(choicesByVariable[varName])];
    if (fieldTypeByVariable[varName] === "check_box") {
      const values = sampleCheckBoxValues(choices, dm.length);
      dm.forEach((row, i) => {
        row[varName] = values[i];
      });
    } else {
      dm.forEach((row) => {
        row[varName] = sampleOne(choices);
      });
    }
  });

  const dateVars = [...new Set(dmSpec.filter((r) => r.field_type === "date").map((r) => r.cdisc_variable))].filter(
    (v) => !existingColumns.has(v)
  );
  const today = new Date().toISOString().slice(0, 10);
  dateVars.forEach((varName) => {
    dm.forEach((row) => {
      row[varName] = randomDateBetween(registrationStartDate, today);
    });
  });

  // 上記(radio_button/check_box/date)のいずれでも埋まらなかった対象変数(meddra/drug型等、
  // まだ未移植のfield_type)は、とりあえずDUMMY値を入れる(Rのpopulate_dummy_fields()に対応)
  const targetVars = [...new Set(dmSpec.map((r) => r.cdisc_variable))].filter((v) => !existingColumns.has(v));
  const filledVars = new Set(Object.keys(dm[0] || {}));
  const remainingVars = targetVars.filter((v) => !filledVars.has(v));
  remainingVars.forEach((varName) => {
    dm.forEach((row) => {
      row[varName] = "DUMMY";
    });
  });

  return dm;
}

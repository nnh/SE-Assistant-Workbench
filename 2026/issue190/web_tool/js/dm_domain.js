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

// ageBounds(cdisc_variable, ref_cdisc_variable, min_age, max_age)のうち、ref_cdisc_variable=="BRTHDTC"な
// 行(=BRTHDTCからの年齢で条件付けられている項目、例: RFICDTC)を全て満たす年齢範囲(交差範囲)を求める。
// 該当行が無い(=年齢に関する制約が試験仕様に無い)場合は、小児(0歳)〜高齢者(89歳)まで幅広く対象にする
// (Rのcompute_birth_age_range()に対応)
function computeBirthAgeRange(ageBounds) {
  const relevant = (ageBounds || []).filter((ab) => ab.ref_cdisc_variable === "BRTHDTC");
  if (relevant.length === 0) return { minAge: 0, maxAge: 89 };
  const minAges = relevant.map((r) => r.min_age).filter((v) => v != null);
  const maxAges = relevant.map((r) => r.max_age).filter((v) => v != null);
  return {
    minAge: minAges.length > 0 ? Math.max(...minAges) : 0,
    maxAge: maxAges.length > 0 ? Math.min(...maxAges) : 89,
  };
}

// BRTHDTC(生年月日)を生成する。R版のgenerate_brthdtc.Rに対応する。
// minAge〜maxAge歳の範囲で一様ランダムに年齢(日単位)を選び、refDateから引いて生年月日にする
// (minAge/maxAgeは通常computeBirthAgeRange()で試験のageBoundsから求めた値を渡す)
function generateBrthdtc(n, refDate, minAge = 0, maxAge = 89) {
  const ref = new Date(refDate);
  const daysPerYear = 365.25;
  const oneDay = 24 * 60 * 60 * 1000;
  const minDays = minAge * daysPerYear;
  const maxDays = (maxAge + 1) * daysPerYear - 1;

  const brthdtc = [];
  for (let i = 0; i < n; i += 1) {
    const ageDays = Math.round(minDays + Math.random() * (maxDays - minDays));
    const brthDate = new Date(ref.getTime() - ageDays * oneDay);
    brthdtc.push(brthDate.toISOString().slice(0, 10));
  }
  return brthdtc;
}

// n人分のDMの土台(USUBJID等)を作り、BRTHDTC・ARMも生成する(Rのbuild_dm_domain()に対応)。
// ARMは、defaultグループに属する割り付けシート(通常1つ)に割り当てられたcodeとする。
// studyidは既定で"dummy-studyid"だが、呼び出し側からEDC仕様JSONのname(試験名)+"_dummy"を渡すことで、
// 生成データを見ただけでどのJSONから生成したか分かるようにする
// 戻り値: { dm: 行の配列, activeSheets: buildSubjectActiveSheets()の結果(他ドメイン生成時に使う) }
function buildDmDomain(n, sheets, sheetGroups, ageBounds, studyid = "dummy-studyid") {
  const birthAgeRange = computeBirthAgeRange(ageBounds);
  const brthdtc = generateBrthdtc(n, new Date(), birthAgeRange.minAge, birthAgeRange.maxAge);
  const dummySites = generateDummySites();
  const usubjids = [];
  for (let i = 1; i <= n; i += 1) {
    usubjids.push(`${studyid}-${String(i).padStart(4, "0")}`);
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
      STUDYID: studyid,
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

// meddra型のDM項目にLLT名を格納する。default_valueが8桁数字の場合はllt_codeとみなし、
// 対応するllt_nameを固定値として使う。それ以外はmeddraSample(行ごとに対応する階層)のllt_nameを使う
// (Rのpopulate_meddra_fields()に対応。DUMMYフォールバックの後に呼び、既に入っているDUMMY値を上書きする
// 点もRと同じ)
function populateDmMeddraFields(dm, dmSpec, meddraData, meddraSample) {
  const meddraVars = [...new Set(dmSpec.filter((r) => r.field_type === "meddra").map((r) => r.cdisc_variable))];
  meddraVars.forEach((varName) => {
    const fixedCodes = [
      ...new Set(
        dmSpec
          .filter((r) => r.field_type === "meddra" && r.cdisc_variable === varName && /^[0-9]{8}$/.test(r.default_value || ""))
          .map((r) => r.default_value)
      ),
    ];
    if (fixedCodes.length === 1) {
      const fixedRow = meddraData.find((r) => r.llt_code === fixedCodes[0]);
      const lltName = fixedRow ? fixedRow.llt_name : undefined;
      dm.forEach((row) => {
        row[varName] = lltName;
      });
    } else {
      dm.forEach((row, i) => {
        row[varName] = meddraSample[i].llt_name;
      });
    }
  });
  return dm;
}

// radio_button/check_box型のDM項目に、選択肢(code、無ければdefault_value)からランダムな値を入れる
// (check_boxは複数選択がカンマ区切りで1つの文字列になる)。requiredVarsに含まれず、かつ可視
// (いずれの行もis_invisibleでない)場合は、空欄("")も選択肢に加える。numericBoundsに該当エントリが
// あれば、数値として範囲外のcodeを選択肢から除く(Rのpopulate_radio_button_fields()の
// has_alias_name==FALSEの分岐に対応)。
// date型の項目(BRTHDTCは既にbuildDmDomain()で埋まっているため対象外)には、
// registrationStartDate〜今日の間のランダムな日付を入れる(Rのpopulate_date_fields()に対応)。
// その後、DUMMYフォールバック・meddra型項目・presence_conditionsゲーティング・field_ref_bounds・
// age_boundsを順に適用する(Rのpopulate_dm_domain()に対応)
function populateDmDomain(
  dm,
  cdiscVariableValues,
  registrationStartDate,
  meddraData,
  presenceConditions,
  requiredVars,
  numericBounds,
  fieldRefBounds,
  ageBounds,
  dateRefBounds
) {
  const dmSpec = cdiscVariableValues.filter((r) => r.prefix === "DM");
  const existingColumns = new Set(Object.keys(dm[0] || {}));
  const requiredSet = new Set(requiredVars || []);

  const choiceSpec = dmSpec.filter(
    (r) => (r.field_type === "radio_button" || r.field_type === "check_box") && !existingColumns.has(r.cdisc_variable)
  );
  const choicesByVariable = {};
  const fieldTypeByVariable = {};
  const invisibleByVariable = {};
  choiceSpec.forEach((row) => {
    const code = row.code != null ? row.code : row.default_value;
    if (!choicesByVariable[row.cdisc_variable]) choicesByVariable[row.cdisc_variable] = [];
    choicesByVariable[row.cdisc_variable].push(code);
    if (row.field_type === "check_box") fieldTypeByVariable[row.cdisc_variable] = "check_box";
    if (row.is_invisible) invisibleByVariable[row.cdisc_variable] = true;
  });
  Object.keys(choicesByVariable).forEach((varName) => {
    let choices = [...new Set(choicesByVariable[varName])];
    const isVisible = !invisibleByVariable[varName];
    if (!requiredSet.has(varName) && isVisible) {
      choices = [...new Set([...choices, ""])];
    }
    const bounds = numericBounds && numericBounds[varName];
    if (bounds) {
      choices = choices.filter((c) => {
        const n = Number(c);
        if (Number.isNaN(n)) return true;
        if (bounds.min_value != null && n < bounds.min_value) return false;
        if (bounds.max_value != null && n > bounds.max_value) return false;
        return true;
      });
    }
    if (choices.length === 0) return;
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

  let dateVars = [...new Set(dmSpec.filter((r) => r.field_type === "date").map((r) => r.cdisc_variable))].filter(
    (v) => !existingColumns.has(v)
  );
  dateVars = sortDateVarsByDependency(dateVars, dateRefBounds);
  const today = new Date().toISOString().slice(0, 10);
  // BRTHDTC(生年月日)より前の日付を生成しないよう、行ごとの下限を「登録開始日とBRTHDTCの遅い方」にする
  // (小児等でBRTHDTCが登録開始日より後になる場合、RFICDTC等がBRTHDTCより前になってしまう矛盾を防ぐ。
  // Rのpopulate_date_fields()の同様の対応に合わせる)。dateRefBoundsが渡された場合、他フィールド参照
  // (同じ行)による下限/上限も、上記のBRTHDTC由来の下限とあわせて尊重する
  dateVars.forEach((varName) => {
    const minRow = (dateRefBounds || []).find((r) => r.cdisc_variable === varName && r.bound_type === "min_date");
    const maxRow = (dateRefBounds || []).find((r) => r.cdisc_variable === varName && r.bound_type === "max_date");
    dm.forEach((row) => {
      let lower = row.BRTHDTC && row.BRTHDTC > registrationStartDate ? row.BRTHDTC : registrationStartDate;
      if (minRow != null && row[minRow.ref_cdisc_variable] != null && row[minRow.ref_cdisc_variable] > lower) {
        lower = row[minRow.ref_cdisc_variable];
      }
      let upper = today;
      if (maxRow != null && row[maxRow.ref_cdisc_variable] != null && row[maxRow.ref_cdisc_variable] < upper) {
        upper = row[maxRow.ref_cdisc_variable];
      }
      if (upper < lower) upper = lower;
      row[varName] = randomDateBetween(lower, upper);
    });
  });

  // 上記(radio_button/check_box/date)のいずれでも埋まらなかった対象変数(meddra/drug型等)は、
  // とりあえずDUMMY値を入れる(Rのpopulate_dummy_fields()に対応)
  const targetVars = [...new Set(dmSpec.map((r) => r.cdisc_variable))].filter((v) => !existingColumns.has(v));
  const filledVars = new Set(Object.keys(dm[0] || {}));
  const remainingVars = targetVars.filter((v) => !filledVars.has(v));
  remainingVars.forEach((varName) => {
    dm.forEach((row) => {
      row[varName] = "DUMMY";
    });
  });

  // meddra型項目があれば、DUMMYで仮埋めした値をLLT名で上書きする(Rの並び順に対応)
  const meddraVars = dmSpec.filter((r) => r.field_type === "meddra");
  if (meddraVars.length > 0 && meddraData) {
    const meddraSample = sampleMeddraRows(meddraData, dm.length);
    populateDmMeddraFields(dm, dmSpec, meddraData, meddraSample);
  }

  applyPresenceConditions(dm, presenceConditions || []);
  applyFieldRefBounds(dm, dmSpec, fieldRefBounds || []);
  applyAgeDateBounds(dm, ageBounds || [], registrationStartDate);

  return dm;
}

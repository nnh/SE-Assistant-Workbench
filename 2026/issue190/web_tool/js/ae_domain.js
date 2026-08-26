// AEドメインを生成する。R版のbuild_ae_domain.R/populate_ae_domain()に対応するが、
// 現時点ではUSUBJIDの採番(DMからの重複ありサンプリング)、alias_name割り当て、
// radio_button/check_box型項目(required_vars/numeric_bounds含む)、date型項目、
// meddra型項目+コーディングブロックの埋め込み、DUMMYフォールバック、presence_conditionsによる
// ゲーティング、field_ref_bounds、AETOXGR=5(死亡)関連の並べ替え・矛盾レコード除外、
// AESPID/AESEQ・列順整理まで対応する。
// FA等のリンクブロック生成・inject_required_llt_codesはまだ未移植

// dmのUSUBJIDから重複ありでn件サンプリングし、STUDYID/DOMAINを付与する(Rのbuild_ae_domain()に対応)
function buildAeDomain(dm, n) {
  const rows = [];
  for (let i = 0; i < n; i += 1) {
    const dmRow = sampleOne(dm);
    rows.push({
      STUDYID: dmRow.STUDYID,
      DOMAIN: "AE",
      USUBJID: dmRow.USUBJID,
    });
  }
  return rows;
}

// AE行ごとにalias_name(どのAE報告シートの行か)を割り当てる。
// activeSheets(USUBJID -> Set(alias_name)。buildDmDomain()が返すもの)が指定されている場合、
// その被験者にとって実際に有効な(=そのシートが表示される)alias_nameだけから選ぶ
// (どのalias_nameも有効でない行は、AE報告自体が存在しないとみなして除外する)。
// 指定が無い場合は全alias_nameから一様ランダムに選ぶ(Rのpopulate_ae_domain()の該当部分に対応)
function assignAeAliasNames(ae, aeSpec, activeSheets) {
  const aliasNames = [...new Set(aeSpec.map((r) => r.alias_name))];

  if (activeSheets) {
    return ae
      .map((row) => {
        const eligible = activeSheets[row.USUBJID];
        const pool = eligible ? aliasNames.filter((a) => eligible.has(a)) : [];
        return pool.length > 0 ? { ...row, alias_name: sampleOne(pool) } : null;
      })
      .filter((row) => row !== null);
  }

  return ae.map((row) => ({ ...row, alias_name: sampleOne(aliasNames) }));
}

// radio_button/check_box型のAE項目に、選択肢(code、無ければdefault_value)からランダムな値を入れる
// (check_boxは複数選択がカンマ区切りで1つの文字列になる)。requiredVarsに含まれず、かつそのalias_name内で
// 可視(いずれの行もis_invisibleでない)場合は、空欄("")も選択肢に加える。numericBoundsに該当エントリが
// あれば、数値として範囲外のcodeを選択肢から除く。
// AEはalias_name(どのAE報告シートの行か)によって同じcdisc_variableでも選択肢が異なりうるため、
// 行のalias_nameと一致するaliasSpecの選択肢だけから選ぶ(Rのpopulate_radio_button_fields()の
// has_alias_name==TRUEの分岐に対応)
function populateAeChoiceFields(ae, aeSpec, requiredVars, numericBounds) {
  const existingColumns = new Set(Object.keys(ae[0] || {}));
  const choiceSpec = aeSpec.filter((r) => r.field_type === "radio_button" || r.field_type === "check_box");
  const targetVars = [...new Set(choiceSpec.map((r) => r.cdisc_variable))].filter((v) => !existingColumns.has(v));
  const requiredSet = new Set(requiredVars || []);

  targetVars.forEach((varName) => {
    // Rの`data[[var_name]] <- NA_character_`に対応: このcdisc_variableを定義していないalias_nameの行にも
    // 列自体は必ず持たせる(値はnullのまま)。持たせないと、後続のDUMMYフォールバックが
    // (最初の行のキー集合だけを見て)列の有無を誤判定してしまう
    ae.forEach((row) => {
      row[varName] = null;
    });
    const varRows = choiceSpec.filter((r) => r.cdisc_variable === varName);
    const aliasNamesForVar = [...new Set(varRows.map((r) => r.alias_name))];
    aliasNamesForVar.forEach((an) => {
      const anRows = varRows.filter((r) => r.alias_name === an);
      let choices = [...new Set(anRows.map((r) => (r.code != null ? r.code : r.default_value)))];
      const isVisible = !anRows.some((r) => r.is_invisible);
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
      const isCheckBox = anRows.some((r) => r.field_type === "check_box");
      const targetRows = ae.filter((row) => row.alias_name === an);
      if (choices.length === 0 || targetRows.length === 0) return;
      if (isCheckBox) {
        const values = sampleCheckBoxValues(choices, targetRows.length);
        targetRows.forEach((row, i) => {
          row[varName] = values[i];
        });
      } else {
        targetRows.forEach((row) => {
          row[varName] = sampleOne(choices);
        });
      }
    });
  });
  return ae;
}

// date型のAE項目に、registrationStartDate〜今日の間のランダムな日付を入れる。
// AESTDTC -> それ以外 -> AEENDTC(AESTDTC以降になるよう制御)の順に生成する(Rのpopulate_ae_domain()の
// date生成部分に対応)。AEENDTCは、AESTDTCが対象変数に含まれる場合はAESTDTC〜今日の間、
// そうでなければ他のdate項目と同様registrationStartDate〜今日の間から選ぶ
function populateAeDateFields(ae, aeSpec, registrationStartDate) {
  const existingColumns = new Set(Object.keys(ae[0] || {}));
  const dateVars = [...new Set(aeSpec.filter((r) => r.field_type === "date").map((r) => r.cdisc_variable))].filter(
    (v) => !existingColumns.has(v)
  );
  const orderedDateVars = [
    ...(dateVars.includes("AESTDTC") ? ["AESTDTC"] : []),
    ...dateVars.filter((v) => v !== "AESTDTC" && v !== "AEENDTC"),
    ...(dateVars.includes("AEENDTC") ? ["AEENDTC"] : []),
  ];
  const today = new Date().toISOString().slice(0, 10);

  orderedDateVars.forEach((varName) => {
    const useAestdtcAsStart = varName === "AEENDTC" && "AESTDTC" in (ae[0] || {});
    ae.forEach((row) => {
      const start = useAestdtcAsStart ? row.AESTDTC : registrationStartDate;
      row[varName] = randomDateBetween(start, today);
    });
  });
  return ae;
}

// LLTコードを少数(poolSize件)に絞り、Zipf的な重み(1/順位)でサンプリングすることで、
// 頻出病名と稀な病名が混在するようにする。1件につきLLT〜SOCの階層をまとめて返すため、
// 各コード値の対応関係が崩れない(Rのsample_meddra_rows()に対応)
function sampleMeddraRows(meddraData, n, poolSize = 20) {
  const seen = new Set();
  const distinctRows = [];
  meddraData.forEach((row) => {
    if (!seen.has(row.llt_code)) {
      seen.add(row.llt_code);
      distinctRows.push(row);
    }
  });
  const shuffled = [...distinctRows].sort(() => Math.random() - 0.5);
  const pool = shuffled.slice(0, Math.min(poolSize, distinctRows.length));

  const weights = pool.map((_, i) => 1 / (i + 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const result = [];
  for (let i = 0; i < n; i += 1) {
    let r = Math.random() * totalWeight;
    let idx = 0;
    while (idx < weights.length - 1 && r > weights[idx]) {
      r -= weights[idx];
      idx += 1;
    }
    result.push(pool[idx]);
  }
  return result;
}

// presence_conditionsのうち、ref_cdisc_variableが"<prefix>LLTCD"(meddra参照)かつcondition_type=="equals"な
// 行のexpected_valueを集め、必ずサンプルに混ぜ込むべきLLTコード一覧を求める。
// R版はconstant.Rに手動定数(required_ae_llt_codes)として持っていたが、Web版はpresence_conditionsを
// 既に構築しているため、そこから自動導出する(試験ごとの手動設定は不要にする)。
// 該当する行が無ければ空配列を返す(=注入しない。指定なしでも正常動作する)
function deriveRequiredLltCodes(presenceConditions) {
  const codes = new Set();
  (presenceConditions || []).forEach((pc) => {
    if (pc.condition_type !== "equals") return;
    if (!pc.ref_cdisc_variable || !pc.ref_cdisc_variable.endsWith("LLTCD")) return;
    if (pc.expected_value != null && pc.expected_value !== "") codes.add(pc.expected_value);
  });
  return [...codes];
}

// meddraSampleの一部の行を、requiredLltCodes(必ずデータに含めたいLLTコード)の値で上書きする。
// コードごとに1行を選び、そのLLTコードに対応する階層一式に丸ごと差し替える。
// requiredLltCodesが空、meddraSampleが0件、または該当コードがmeddraDataに存在しない場合は
// そのコードを無視する(=何もしない。指定なしでも正常動作する。Rのinject_required_llt_codes()に対応)
function injectRequiredLltCodes(meddraSample, meddraData, requiredLltCodes) {
  const codes = (requiredLltCodes || []).filter((c) => c != null && c !== "");
  if (codes.length === 0 || meddraSample.length === 0) return meddraSample;

  const n = meddraSample.length;
  const withReplacement = codes.length > n;
  const targetRows = [];
  if (withReplacement) {
    for (let i = 0; i < codes.length; i += 1) targetRows.push(Math.floor(Math.random() * n));
  } else {
    const shuffled = [...Array(n).keys()].sort(() => Math.random() - 0.5);
    targetRows.push(...shuffled.slice(0, codes.length));
  }

  codes.forEach((code, i) => {
    const hierarchyRow = meddraData.find((r) => r.llt_code === code);
    if (!hierarchyRow) return;
    meddraSample[targetRows[i]] = hierarchyRow;
  });
  return meddraSample;
}

// meddra型のAE項目にLLT名を格納する。default_valueが8桁数字の場合はllt_codeとみなし、
// 対応するllt_nameを固定値として使う。それ以外はmeddraSample(行ごとに対応する階層)のllt_nameを使う
// (Rのpopulate_meddra_fields()に対応。alias_nameによる絞り込みは行わない点もRと同じ)
function populateAeMeddraFields(ae, aeSpec, meddraData, meddraSample) {
  const existingColumns = new Set(Object.keys(ae[0] || {}));
  const meddraVars = [...new Set(aeSpec.filter((r) => r.field_type === "meddra").map((r) => r.cdisc_variable))].filter(
    (v) => !existingColumns.has(v)
  );

  meddraVars.forEach((varName) => {
    const fixedCodes = [
      ...new Set(
        aeSpec
          .filter((r) => r.field_type === "meddra" && r.cdisc_variable === varName && /^[0-9]{8}$/.test(r.default_value || ""))
          .map((r) => r.default_value)
      ),
    ];
    if (fixedCodes.length === 1) {
      const fixedRow = meddraData.find((r) => r.llt_code === fixedCodes[0]);
      const lltName = fixedRow ? fixedRow.llt_name : undefined;
      ae.forEach((row) => {
        row[varName] = lltName;
      });
    } else {
      ae.forEach((row, i) => {
        row[varName] = meddraSample[i].llt_name;
      });
    }
  });
  return ae;
}

// MedDRAコーディングブロック(LLT〜SOC)の列名(例: prefix="AE" -> AELLT, AELLTCD, ...)
const MEDDRA_CODING_COLS = ["LLT", "LLTCD", "DECOD", "PTCD", "HLT", "HLTCD", "HLGT", "HLGTCD", "BODSYS", "BDSYCD", "SOC", "SOCCD"];
const MEDDRA_CODING_FIELD_MAP = {
  LLT: "llt_name",
  LLTCD: "llt_code",
  DECOD: "pt_name",
  PTCD: "pt_code",
  HLT: "hlt_name",
  HLTCD: "hlt_code",
  HLGT: "hlgt_name",
  HLGTCD: "hlgt_code",
  BODSYS: "soc_name",
  BDSYCD: "soc_code",
  SOC: "soc_name",
  SOCCD: "soc_code",
};

// MedDRAコーディングブロック(LLT〜SOC)を追加する。meddraSampleと同じ階層を使い、
// コード間の対応関係を保つ(Rのadd_meddra_coding_block()に対応)
function addAeMeddraCodingBlock(ae, meddraSample, prefix) {
  MEDDRA_CODING_COLS.forEach((col) => {
    const field = MEDDRA_CODING_FIELD_MAP[col];
    ae.forEach((row, i) => {
      row[prefix + col] = meddraSample[i][field];
    });
  });
  return ae;
}

// radio_button/check_box/date/meddra型のいずれでも埋まらなかった対象変数(specに定義はあるが
// まだ値の無い列)に、とりあえずDUMMY値を格納する(Rのpopulate_dummy_fields()に対応)。
// presence_conditionsが後段でこれらの列を参照する場合があるため、ゲーティング適用前に列自体は
// 必ず埋めておく必要がある
function populateAeDummyFields(ae, aeSpec) {
  const existingColumns = new Set(Object.keys(ae[0] || {}));
  const remainingVars = [...new Set(aeSpec.map((r) => r.cdisc_variable))].filter((v) => !existingColumns.has(v));
  remainingVars.forEach((varName) => {
    ae.forEach((row) => {
      row[varName] = "DUMMY";
    });
  });
  return ae;
}

// USUBJIDごとに、AETOXGR=="5"(死亡)のレコードが最後に来るよう並べ替える(Rのpopulate_ae_domain()の
// 該当部分に対応。表示順の整理のみで、他のレコードの妥当性には影響しない)
function sortAeDeathLast(ae) {
  if (!ae[0] || !("AETOXGR" in ae[0])) return ae;
  const byUsubjid = {};
  const order = [];
  ae.forEach((row) => {
    if (!byUsubjid[row.USUBJID]) {
      byUsubjid[row.USUBJID] = [];
      order.push(row.USUBJID);
    }
    byUsubjid[row.USUBJID].push(row);
  });
  const result = [];
  order.forEach((usubjid) => {
    const rows = byUsubjid[usubjid];
    const alive = rows.filter((r) => r.AETOXGR !== "5");
    const dead = rows.filter((r) => r.AETOXGR === "5");
    result.push(...alive, ...dead);
  });
  return result;
}

// AETOXGR=="5"(死亡)のAEENDTC(被験者ごとの最も早い日)より後にAESTDTCが始まる他のAEレコードは、
// 死亡後に新たな有害事象が発生したことになり矛盾するため除外する(Rのpopulate_ae_domain()の
// 該当部分に対応)
function filterAeDeathDateConsistency(ae) {
  if (!ae[0] || !("AETOXGR" in ae[0]) || !("AESTDTC" in ae[0]) || !("AEENDTC" in ae[0])) return ae;
  const deathDateByUsubjid = {};
  ae.forEach((row) => {
    if (row.AETOXGR !== "5") return;
    const current = deathDateByUsubjid[row.USUBJID];
    if (current == null || row.AEENDTC < current) {
      deathDateByUsubjid[row.USUBJID] = row.AEENDTC;
    }
  });
  return ae.filter((row) => {
    const deathDate = deathDateByUsubjid[row.USUBJID];
    return deathDate == null || row.AESTDTC <= deathDate;
  });
}

// USUBJIDごとの死亡日テーブル(AETOXGR=="5"のレコードのうち、最も早いAEENDTC)を作る。
// DSドメインのDEATH確定(finalizeDsDisposition)で使う(Rのbuild_death_date_table()に対応)
function buildDeathDateTable(ae) {
  const byUsubjid = {};
  ae.forEach((row) => {
    if (row.AETOXGR !== "5") return;
    if (!byUsubjid[row.USUBJID] || row.AEENDTC < byUsubjid[row.USUBJID]) {
      byUsubjid[row.USUBJID] = row.AEENDTC;
    }
  });
  return Object.keys(byUsubjid).map((usubjid) => ({ USUBJID: usubjid, DTHDTC: byUsubjid[usubjid] }));
}

// AESPID(USUBJID内の連番、例: sae_report1, sae_report2)・AESEQ(全体通番)を付与し、
// alias_name列を除去したうえで、列順を STUDYID/DOMAIN/USUBJID/AESEQ/AESPID -> meddra項目 ->
// MedDRAコーディングブロック -> その他 -> AETOXGR/AESTDTC/AEENDTC に整理する
// (Rのpopulate_ae_domain()末尾のAESPID/AESEQ付与・reorder_domain_columns()に対応)
function finalizeAeDomain(ae, aeSpec) {
  const usubjidCounters = {};
  ae.forEach((row) => {
    usubjidCounters[row.USUBJID] = (usubjidCounters[row.USUBJID] || 0) + 1;
    row.AESPID = `${row.alias_name}${usubjidCounters[row.USUBJID]}`;
  });
  ae.forEach((row, i) => {
    row.AESEQ = i + 1;
  });
  ae.forEach((row) => {
    delete row.alias_name;
  });

  const meddraVars = [...new Set(aeSpec.filter((r) => r.field_type === "meddra").map((r) => r.cdisc_variable))];
  const frontCols = ["STUDYID", "DOMAIN", "USUBJID", "AESEQ", "AESPID", ...meddraVars, ...MEDDRA_CODING_COLS.map((c) => "AE" + c)];
  const endCols = ["AETOXGR", "AESTDTC", "AEENDTC"];
  const allCols = Object.keys(ae[0] || {});
  const middleCols = allCols.filter((c) => !frontCols.includes(c) && !endCols.includes(c));
  const orderedCols = [
    ...frontCols.filter((c) => allCols.includes(c)),
    ...middleCols,
    ...endCols.filter((c) => allCols.includes(c)),
  ];

  return ae.map((row) => {
    const newRow = {};
    orderedCols.forEach((c) => {
      newRow[c] = row[c];
    });
    return newRow;
  });
}

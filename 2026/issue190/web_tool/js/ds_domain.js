// DSドメインを生成する。R版のbuild_ds_domain.R/build_ds_domain()・populate_ds_domain()に対応するが、
// 現時点ではUSUBJID/STUDYID/DOMAINの採番、DSEPOCHがある場合のEPOCH/DSSPID展開(シート表示順に積み上げ)、
// radio_button/date型項目(alias_nameスコープ含む)、DUMMYフォールバック、DSSEQ、meddra型項目、
// presence_conditionsによるゲーティング、field_ref_bounds、列順整理まで対応する。
// finalize_ds_disposition(DEATH/COMPLETED確定)、add_randomization_ds_rows(RANDOMIZED行追加)は
// まだ未移植

// dm(USUBJID/STUDYID)から、DSドメインの土台を作る。
// DSEPOCHがcdiscVariableValues(prefix=="DS")に定義されている場合、そのdefault_value(エポック名)ごとに
// USUBJID×エポックの行を作る(alias_nameのsheet_seq昇順に積み上げることで、同一USUBJID内での行の並びが
// シートの登場順=経過順と一致するようにする)。出力列名はSDTM標準に合わせてDSEPOCHではなくEPOCHにする。
// DSSPIDには、そのエポックの元になったシートのalias_nameを入れる。
// alias_name/labelも保持する(将来、他ドメインが特定のDSブロックを参照する際に使う想定。
// 最終出力からは取り除く想定)。
// DSEPOCHが定義されていない場合は、USUBJIDごとに1行だけ作る(Rのbuild_ds_domain()に対応)
function buildDsDomain(dm, cdiscVariableValues) {
  const dsSpec = cdiscVariableValues.filter((r) => r.prefix === "DS");
  const epochRows = dsSpec.filter((r) => r.cdisc_variable === "DSEPOCH");

  let ds;
  if (epochRows.length > 0) {
    const seen = new Set();
    const epochTable = [];
    epochRows.forEach((r) => {
      const key = `${r.alias_name}|${r.label}|${r.default_value}`;
      if (seen.has(key)) return;
      seen.add(key);
      epochTable.push({ alias_name: r.alias_name, label: r.label, default_value: r.default_value, sheet_seq: r.sheet_seq });
    });
    epochTable.sort((a, b) => (a.sheet_seq ?? 0) - (b.sheet_seq ?? 0));

    ds = [];
    epochTable.forEach((epoch) => {
      dm.forEach((dmRow) => {
        ds.push({
          USUBJID: dmRow.USUBJID,
          STUDYID: dmRow.STUDYID,
          EPOCH: epoch.default_value,
          DSSPID: epoch.alias_name,
          alias_name: epoch.alias_name,
          label: epoch.label,
        });
      });
    });
  } else {
    ds = dm.map((dmRow) => ({ USUBJID: dmRow.USUBJID, STUDYID: dmRow.STUDYID }));
  }

  ds.forEach((row) => {
    row.DOMAIN = "DS";
  });

  // 列順を STUDYID/DOMAIN/USUBJID -> DSSPID/EPOCH/alias_name/label(存在するもののみ) に整理する
  const frontCols = ["STUDYID", "DOMAIN", "USUBJID", "DSSPID", "EPOCH", "alias_name", "label"];
  return ds.map((row) => {
    const newRow = {};
    frontCols.forEach((c) => {
      if (c in row) newRow[c] = row[c];
    });
    return newRow;
  });
}

// radio_button/check_box型のDS項目に、選択肢(code、無ければdefault_value)からランダムな値を入れる。
// DSはalias_name(どのDSブロックの行か)によって同じcdisc_variableでも選択肢が異なりうるため、
// 行のalias_nameと一致するspecの選択肢だけから選ぶ(Rのpopulate_radio_button_fields()の
// has_alias_name==TRUEの分岐に対応。requiredVars/numericBoundsの扱いはDM/AEと同じ)
function populateDsChoiceFields(ds, dsSpec, requiredVars, numericBounds) {
  const existingColumns = new Set(Object.keys(ds[0] || {}));
  const choiceSpec = dsSpec.filter((r) => r.field_type === "radio_button" || r.field_type === "check_box");
  const targetVars = [...new Set(choiceSpec.map((r) => r.cdisc_variable))].filter((v) => !existingColumns.has(v));
  const requiredSet = new Set(requiredVars || []);

  targetVars.forEach((varName) => {
    ds.forEach((row) => {
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
      const targetRows = ds.filter((row) => row.alias_name === an);
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
  return ds;
}

// date型のDS項目に、registrationStartDate〜今日の間のランダムな日付を入れる。
// DSはalias_name(どのDSブロックの行か)によって同じcdisc_variableでも定義の有無が異なりうるため、
// その変数を定義しているalias_nameの行だけに値を入れる(Rのpopulate_date_fields()の
// has_alias_name==TRUEの分岐に対応)。dateRefBoundsが渡された場合、validate_date_after_or_equal_to/
// validate_date_before_or_equal_to(他フィールド参照、例: DSDTC>=DSSTDTC)による下限/上限
// (参照先フィールドの値、同じ行)を一律の範囲より優先する
function populateDsDateFields(ds, dsSpec, registrationStartDate, dateRefBounds) {
  const existingColumns = new Set(Object.keys(ds[0] || {}));
  let dateVars = [...new Set(dsSpec.filter((r) => r.field_type === "date").map((r) => r.cdisc_variable))].filter(
    (v) => !existingColumns.has(v)
  );
  dateVars = sortDateVarsByDependency(dateVars, dateRefBounds);
  const today = new Date().toISOString().slice(0, 10);

  dateVars.forEach((varName) => {
    const dateAliasNames = new Set(
      dsSpec.filter((r) => r.field_type === "date" && r.cdisc_variable === varName).map((r) => r.alias_name)
    );
    const minRow = (dateRefBounds || []).find((r) => r.cdisc_variable === varName && r.bound_type === "min_date");
    const maxRow = (dateRefBounds || []).find((r) => r.cdisc_variable === varName && r.bound_type === "max_date");
    ds.forEach((row) => {
      if (!dateAliasNames.has(row.alias_name)) {
        row[varName] = null;
        return;
      }
      let lower = registrationStartDate;
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
  return ds;
}

// radio_button/check_box/date型のいずれでも埋まらなかった対象変数(specに定義はあるがまだ値の無い列)に、
// とりあえずDUMMY値を格納する(Rのpopulate_dummy_fields()に対応)
function populateDsDummyFields(ds, dsSpec) {
  const existingColumns = new Set(Object.keys(ds[0] || {}));
  const remainingVars = [...new Set(dsSpec.map((r) => r.cdisc_variable))].filter((v) => !existingColumns.has(v));
  remainingVars.forEach((varName) => {
    ds.forEach((row) => {
      row[varName] = "DUMMY";
    });
  });
  return ds;
}

// meddra型のDS項目にLLT名を格納する(Rのpopulate_meddra_fields()に対応。alias_nameによる絞り込みは
// 行わない点はAE/DMと同じ)
function populateDsMeddraFields(ds, dsSpec, meddraData, meddraSample) {
  const existingColumns = new Set(Object.keys(ds[0] || {}));
  const meddraVars = [...new Set(dsSpec.filter((r) => r.field_type === "meddra").map((r) => r.cdisc_variable))].filter(
    (v) => !existingColumns.has(v)
  );
  meddraVars.forEach((varName) => {
    const fixedCodes = [
      ...new Set(
        dsSpec
          .filter((r) => r.field_type === "meddra" && r.cdisc_variable === varName && /^[0-9]{8}$/.test(r.default_value || ""))
          .map((r) => r.default_value)
      ),
    ];
    if (fixedCodes.length === 1) {
      const fixedRow = meddraData.find((r) => r.llt_code === fixedCodes[0]);
      const lltName = fixedRow ? fixedRow.llt_name : undefined;
      ds.forEach((row) => {
        row[varName] = lltName;
      });
    } else {
      ds.forEach((row, i) => {
        row[varName] = meddraSample[i].llt_name;
      });
    }
  });
  return ds;
}

// DSSEQ(全体通番)を付与する(Rのadd_seq("DSSEQ")に対応)
function addDsSeq(ds) {
  ds.forEach((row, i) => {
    row.DSSEQ = i + 1;
  });
  return ds;
}

// DSドメインにradio_button/check_box/date型項目・DUMMYフォールバック・DSSEQ・meddra型項目・
// presence_conditionsゲーティング・field_ref_boundsを適用し、列順を整理する
// (Rのpopulate_ds_domain()に対応)。alias_name/label列は残したまま返す(他ドメイン生成や
// finalize_ds_disposition()で使う想定のため、最終出力からはfinalize時に取り除く)
function populateDsDomain(ds, cdiscVariableValues, registrationStartDate, meddraData, presenceConditions, requiredVars, numericBounds, fieldRefBounds, dateRefBounds) {
  // DSEPOCHはbuild_ds_domain()側でEPOCHという列名として既に生成済みのため、
  // spec上のcdisc_variable名のままだと重複生成されてしまう。ここで除外する
  const dsSpec = cdiscVariableValues.filter((r) => r.prefix === "DS" && r.cdisc_variable !== "DSEPOCH");

  const dsDateVars = [...new Set(dsSpec.filter((r) => r.field_type === "date").map((r) => r.cdisc_variable))];

  ds = populateDsChoiceFields(ds, dsSpec, requiredVars, numericBounds);
  ds = populateDsDateFields(ds, dsSpec, registrationStartDate, dateRefBounds);
  // DSが複数のalias(シート、例: "discon"/"withdrawal")にまたがる場合、シートの本来の並び順
  // (sheet_seq)に沿うようalias単位でまとめて日付をシフトする
  ds = reorderDatesBySheetSeq(ds, dsDateVars, dsSpec, registrationStartDate);
  ds = populateDsDummyFields(ds, dsSpec);
  ds = addDsSeq(ds);

  const meddraVars = dsSpec.filter((r) => r.field_type === "meddra");
  if (meddraVars.length > 0 && meddraData) {
    const meddraSample = sampleMeddraRows(meddraData, ds.length);
    ds = populateDsMeddraFields(ds, dsSpec, meddraData, meddraSample);
  }

  ds = applyPresenceConditions(ds, presenceConditions || []);
  ds = applyFieldRefBounds(ds, dsSpec, fieldRefBounds || []);

  // 列順を STUDYID/DOMAIN/USUBJID/DSSEQ/DSSPID -> その他 に整理する(Rのdomain_front_cols("DS")に対応)
  const frontCols = ["STUDYID", "DOMAIN", "USUBJID", "DSSEQ", "DSSPID"];
  const allCols = Object.keys(ds[0] || {});
  const middleCols = allCols.filter((c) => !frontCols.includes(c));
  const orderedCols = [...frontCols.filter((c) => allCols.includes(c)), ...middleCols];
  return ds.map((row) => {
    const newRow = {};
    orderedCols.forEach((c) => {
      newRow[c] = row[c];
    });
    return newRow;
  });
}

// DSTERMの最終判定を確定する。deathDate(AE由来の死亡日テーブル、buildDeathDateTable()の戻り値)と
// 矛盾しないようDEATHを設定し、死亡していない被験者は最後のレコードの約completedRateをCOMPLETEDにする。
// DSTERM列が無ければ何もしない。
// cdiscVariableValuesが渡され、DSTERMの選択肢に"DEATH"を含むalias_name(例: discon)が判別できる場合は、
// そのブロックの行にDEATHを設定する(単に時系列上最後の行に設定すると、DEATHを選択肢に持たない
// 別ブロック(例: withdrawal)の行になってしまう可能性があるため)。判別できない場合は、
// 従来通り各被験者の最後の行に設定する(Rのfinalize_ds_disposition()に対応)
function finalizeDsDisposition(ds, deathDate, cdiscVariableValues, completedRate = 0.6) {
  if (!ds[0] || !("DSTERM" in ds[0])) return ds;

  const diedUsubjidSet = new Set((deathDate || []).map((d) => d.USUBJID));
  const dthdtcByUsubjid = {};
  (deathDate || []).forEach((d) => {
    dthdtcByUsubjid[d.USUBJID] = d.DTHDTC;
  });
  const hasDsdtc = "DSDTC" in ds[0];
  const hasAliasName = "alias_name" in ds[0];

  // 既存のDEATH表記は一旦すべて解除(重複・矛盾を避けるため)。どの行が元々DEATHだったかは、
  // 実際には死亡していない被験者がランダムでDEATHを選んでいた場合などに、後で(DEATH以外の
  // 選択肢から)埋め直すために記録しておく
  const wasDeathIndices = new Set();
  ds.forEach((row, i) => {
    if (row.DSTERM === "DEATH") {
      wasDeathIndices.add(i);
      row.DSTERM = null;
    }
  });

  const deathAliasNames = new Set();
  if (cdiscVariableValues && hasAliasName) {
    cdiscVariableValues
      .filter((r) => r.prefix === "DS" && r.cdisc_variable === "DSTERM" && r.code === "DEATH")
      .forEach((r) => deathAliasNames.add(r.alias_name));
  }

  // 死亡した被験者ごとに、DEATHを選択肢に持つブロック(あれば)の行、無ければ最後のレコードを
  // DEATHとして確定させる
  const diedIndicesByUsubjid = {};
  ds.forEach((row, i) => {
    if (!diedUsubjidSet.has(row.USUBJID)) return;
    if (!diedIndicesByUsubjid[row.USUBJID]) diedIndicesByUsubjid[row.USUBJID] = [];
    diedIndicesByUsubjid[row.USUBJID].push(i);
  });

  const chosenIndices = new Set();
  Object.keys(diedIndicesByUsubjid).forEach((usubjid) => {
    const indices = diedIndicesByUsubjid[usubjid];
    let chosen;
    if (deathAliasNames.size > 0) {
      const preferred = indices.filter((i) => deathAliasNames.has(ds[i].alias_name));
      chosen = preferred.length > 0 ? preferred[preferred.length - 1] : indices[indices.length - 1];
    } else {
      chosen = indices[indices.length - 1];
    }
    chosenIndices.add(chosen);
    ds[chosen].DSTERM = "DEATH";
    if (hasDsdtc) {
      const dthdtc = dthdtcByUsubjid[usubjid];
      ds[chosen].DSDTC = dthdtc;
      // DSDTC(死亡日、AE側の実際の死亡日が根拠)をここで上書きすると、date_ref_boundsが期待する
      // DSDTC>=DSSTDTC(同じ行)の関係が崩れる場合がある(DSSTDTCは死亡日を知らずに生成されているため)。
      // 死亡日は動かせない事実なので、矛盾する場合はDSSTDTC側を死亡日に合わせて引き戻す
      if ("DSSTDTC" in ds[chosen] && ds[chosen].DSSTDTC != null && dthdtc != null && ds[chosen].DSSTDTC > dthdtc) {
        ds[chosen].DSSTDTC = dthdtc;
      }
    }
  });

  // 元々DEATHだったがchosenIndicesに選ばれなかった行(実際には死亡していない被験者がランダムで
  // DEATHを選んでいた、または同じ被験者の別ブロックがDEATH行に選ばれた)は、解除されたまま空白になって
  // しまうため、DEATH以外の選択肢から改めて値を入れ直す
  if (cdiscVariableValues && hasAliasName) {
    const dstermChoicesByAlias = {};
    cdiscVariableValues
      .filter((r) => r.prefix === "DS" && r.cdisc_variable === "DSTERM")
      .forEach((r) => {
        const code = r.code != null ? r.code : r.default_value;
        if (code == null || code === "DEATH") return;
        if (!dstermChoicesByAlias[r.alias_name]) dstermChoicesByAlias[r.alias_name] = new Set();
        dstermChoicesByAlias[r.alias_name].add(code);
      });
    wasDeathIndices.forEach((i) => {
      if (chosenIndices.has(i)) return;
      const choices = [...(dstermChoicesByAlias[ds[i].alias_name] || [])];
      if (choices.length > 0) {
        ds[i].DSTERM = sampleOne(choices);
      }
    });
  }

  // 死亡していない被験者は、最後のレコードの約completedRateをCOMPLETEDにする。
  // 最終的にCOMPLETEDとなった被験者は、途中経過のレコードもすべてCOMPLETEDにする
  const aliveLastIndexByUsubjid = {};
  ds.forEach((row, i) => {
    if (diedUsubjidSet.has(row.USUBJID)) return;
    aliveLastIndexByUsubjid[row.USUBJID] = i;
  });
  const aliveLastIndices = Object.values(aliveLastIndexByUsubjid);

  const completedCount = Math.round(aliveLastIndices.length * completedRate);
  const shuffled = [...aliveLastIndices].sort(() => Math.random() - 0.5);
  const completedUsubjidSet = new Set(shuffled.slice(0, completedCount).map((i) => ds[i].USUBJID));

  ds.forEach((row) => {
    if (completedUsubjidSet.has(row.USUBJID)) row.DSTERM = "COMPLETED";
  });

  return ds;
}

// 割り付け(群)があるUSUBJID(dm.ARMが空でない)に対して、DSドメインにランダム化のマイルストーン行
// (DSCAT="PROTOCOL MILESTONE", DSDECOD/DSTERM="RANDOMIZED")を追加する。
// dm.ARMが全員空("")の場合(単群、割り付けなし)は何もしない。
// ランダム化は同意取得〜適格性確認の直後(初回投与前)に行われるのが一般的なため、DSDTCは
// dmにRFICDTC(同意取得日)があればその数日以内(0〜3日)、無ければ登録開始日から数日以内(0〜7日)とする。
// 追加した行は既存のdsより前に置き、DSSEQを全体で振り直す(Rのadd_randomization_ds_rows()に対応)
function addRandomizationDsRows(ds, dm, registrationStartDate) {
  const randomizedUsubjidSet = new Set(dm.filter((r) => r.ARM && r.ARM !== "").map((r) => r.USUBJID));
  if (randomizedUsubjidSet.size === 0) return ds;

  const dsColumns = new Set(Object.keys(ds[0] || {}));
  const hasRficdtc = dm.length > 0 && "RFICDTC" in dm[0];
  const maxOffset = hasRficdtc ? 3 : 7;
  const todayDays = daysFromEpoch(new Date().toISOString().slice(0, 10));

  const randomizationRows = dm
    .filter((r) => randomizedUsubjidSet.has(r.USUBJID))
    .map((dmRow) => {
      const row = { USUBJID: dmRow.USUBJID, STUDYID: dmRow.STUDYID, DOMAIN: "DS" };
      if (dsColumns.has("DSSPID")) row.DSSPID = "allocation";
      if (dsColumns.has("DSCAT")) row.DSCAT = "PROTOCOL MILESTONE";
      if (dsColumns.has("DSDECOD")) row.DSDECOD = "RANDOMIZED";
      if (dsColumns.has("DSTERM")) row.DSTERM = "RANDOMIZED";
      if (dsColumns.has("DSDTC")) {
        const baseDateStr = hasRficdtc && dmRow.RFICDTC ? dmRow.RFICDTC : registrationStartDate;
        const offset = Math.floor(Math.random() * (maxOffset + 1));
        // RFICDTCが今日に近い被験者だと、オフセットを足した結果が未来日になり得るため、今日でクランプする
        row.DSDTC = dateFromDays(Math.min(daysFromEpoch(baseDateStr) + offset, todayDays));
      }
      return row;
    });

  const combined = [...randomizationRows, ...ds];
  combined.forEach((row, i) => {
    row.DSSEQ = i + 1;
  });

  // 列順を STUDYID/DOMAIN/USUBJID/DSSEQ/DSSPID -> その他 に整理する(既存dsに無い列(alias_name/label等)は
  // ランダム化行側にnullとして補完される)
  const allColsSet = new Set();
  combined.forEach((row) => Object.keys(row).forEach((c) => allColsSet.add(c)));
  const frontCols = ["STUDYID", "DOMAIN", "USUBJID", "DSSEQ", "DSSPID"];
  const middleCols = [...allColsSet].filter((c) => !frontCols.includes(c));
  const orderedCols = [...frontCols.filter((c) => allColsSet.has(c)), ...middleCols];

  return combined.map((row) => {
    const newRow = {};
    orderedCols.forEach((c) => {
      newRow[c] = c in row ? row[c] : null;
    });
    return newRow;
  });
}

// USUBJIDごとの中止日テーブル(DSTERM!="COMPLETED"のレコードのうち、最も早いDSDTC)を作る。
// DS自体の出力ではなく、他ドメイン(EX/LB等)で中止日以降のレコードが発生していないかを
// チェックする際に使う想定(Rのbuild_discontinuation_date_table()に対応)。
// RANDOMIZED(addRandomizationDsRows()が追加する無作為化マイルストーン行)も、中止理由ではなく
// 通常は治療開始前の早い日付のため除外する(呼び出し側がaddRandomizationDsRows()より後のds
// (RANDOMIZED行を含む)を渡してしまっても、無作為化日が誤って中止日として扱われないようにするため)。
// Rのmin()はna.rm=FALSEなので、対象レコードのいずれか1件でもDSDTCが無い被験者は、
// その被験者のDISCONDTC自体をnullにする(一部だけ無視して他の値からminを取ったりはしない)
function buildDiscontinuationDateTable(ds) {
  if (!ds[0] || !("DSTERM" in ds[0]) || !("DSDTC" in ds[0])) return [];

  const datesByUsubjid = {};
  ds.forEach((row) => {
    if (row.DSTERM === "COMPLETED" || row.DSTERM === "RANDOMIZED") return;
    if (!datesByUsubjid[row.USUBJID]) datesByUsubjid[row.USUBJID] = [];
    datesByUsubjid[row.USUBJID].push(row.DSDTC);
  });

  return Object.keys(datesByUsubjid).map((usubjid) => {
    const dates = datesByUsubjid[usubjid];
    const hasMissing = dates.some((d) => d == null);
    const discondtc = hasMissing ? null : dates.reduce((min, d) => (d < min ? d : min), dates[0]);
    return { USUBJID: usubjid, DISCONDTC: discondtc };
  });
}

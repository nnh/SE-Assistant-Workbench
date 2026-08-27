// DM/AE/DS以外のドメイン(CM/MH/EG等)を生成する。R版のbuild_domain_common.Rの
// build_other_domains()/build_generic_domain()/build_repeated_domain()に対応する。
// 依存関係解決の基盤(トポロジカルソート)、build_generic_domain(個別ロジックを持たないドメイン向け)、
// build_repeated_domain(TR/LB等、同一alias_name内で複数labelを持つ繰り返しドメイン向け)、
// inject_cross_domain_refs(ドメインをまたぐpresence_conditions/age_bounds解決)、
// build_other_domains本体のオーケストレーション(トポロジカルソート順の呼び分け・built_domainsへの積み上げ)、
// drug型項目(who_drug_idf、WHO Drug参照)、visit_lookup(VISIT/VISITNUM列)まで対応する。
// apply_orres_populators(LB/TR/VSのORRESを基準範囲に基づいた値に置き換える処理)は
// js/orres_realism.jsに分離して対応済み。
// AEリンクブロック(FA等、AE報告と同じフォーム上の別prefixブロック)は、まだ未移植

// MedDRAコーディングブロック(LLT〜SOC)の列名(ae_domain.jsのMEDDRA_CODING_COLSと同じ対応表を使う)

// cdisc_variable_valuesから、cdisc_variable名 -> prefix の対応表を作る。
// MedDRAコーディングブロックの列(例: AELLTCD)はEDC仕様には存在せずaddAeMeddraCodingBlock()等で
// 独自に追加する列のため、この対応表にも明示的に加えておく(Rのbuild_cdisc_variable_to_prefix()に対応)
function buildCdiscVariableToPrefix(cdiscVariableValues) {
  const map = {};
  cdiscVariableValues.forEach((r) => {
    map[r.cdisc_variable] = r.prefix;
  });
  const prefixes = new Set(cdiscVariableValues.map((r) => r.prefix));
  prefixes.forEach((prefix) => {
    MEDDRA_CODING_COLS.forEach((col) => {
      map[prefix + col] = prefix;
    });
  });
  return map;
}

// presence_conditions/field_ref_bounds/age_boundsのうち、cdisc_variableとref_cdisc_variableのprefixが
// 異なる(=ドメインをまたぐ参照)行から、(from, to)の依存エッジ一覧を作る。fromはtoに依存する
// (toを先に生成する必要がある)(Rのbuild_cross_prefix_edges()に対応)
function buildCrossPrefixEdges(presenceConditions, fieldRefBounds, cdiscVariableToPrefix, ageBounds) {
  const pairs = [
    ...(presenceConditions || []).map((r) => [r.cdisc_variable, r.ref_cdisc_variable]),
    ...(fieldRefBounds || []).map((r) => [r.cdisc_variable, r.ref_cdisc_variable]),
    ...(ageBounds || []).map((r) => [r.cdisc_variable, r.ref_cdisc_variable]),
  ];
  const seen = new Set();
  const result = [];
  pairs.forEach(([cdiscVariable, refCdiscVariable]) => {
    const prefix = cdiscVariableToPrefix[cdiscVariable];
    const refPrefix = cdiscVariableToPrefix[refCdiscVariable];
    if (!prefix || !refPrefix || prefix === refPrefix) return;
    const key = `${prefix}|${refPrefix}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ from: prefix, to: refPrefix });
  });
  return result;
}

// prefixesを、edges(from依存toの依存関係)に基づいて依存先が先に来るように並べ替える(トポロジカルソート)。
// 循環参照がある場合は、それ以上並べ替えできない分をそのまま残りの順序で追加する(Rのtopo_sort_prefixes()に対応)
function topoSortPrefixes(prefixes, edges) {
  const scopedEdges = edges.filter((e) => prefixes.includes(e.from) && prefixes.includes(e.to));
  let remaining = [...prefixes];
  const ordered = [];
  while (remaining.length > 0) {
    const remainingSet = new Set(remaining);
    const ready = remaining.filter((p) => !scopedEdges.some((e) => e.from === p && remainingSet.has(e.to)));
    if (ready.length === 0) {
      ordered.push(...remaining);
      break;
    }
    ordered.push(...ready);
    remaining = remaining.filter((p) => !ready.includes(p));
  }
  return ordered;
}

// buildSubjectActiveSheets()が返すactiveSheets({USUBJID: Set(alias_name)})を、
// (USUBJID, alias_name)の縦持り配列に変換する(Rのactive_sheet_membership_table()に対応)
function buildActiveSheetTable(activeSheets) {
  const rows = [];
  Object.keys(activeSheets).forEach((usubjid) => {
    activeSheets[usubjid].forEach((aliasName) => {
      rows.push({ USUBJID: usubjid, alias_name: aliasName });
    });
  });
  return rows;
}

// edcSpec.sheetsのうちcategory=="visit"のシートは、name(シート表示名)の末尾に"(VisitName)"という形で
// edcSpec.visitsのnameが含まれている(例: "効果判定報告(End of Induction Cycle1)")。これを抽出して
// visitsと突き合わせ、(alias_name, VISIT, VISITNUM)の配列を作る。一致しない行(末尾が"(...)"形式で
// ない等)は含めない(Rのbuild_visit_lookup()に対応)
function buildVisitLookup(sheets, visits) {
  if (!visits || visits.length === 0) return [];
  const visitNumByName = {};
  visits.forEach((v) => {
    visitNumByName[v.name] = v.num;
  });
  const result = [];
  (sheets || []).forEach((sheet) => {
    if (sheet.category !== "visit") return;
    const m = /\(([^()]+)\)$/.exec(sheet.name || "");
    if (!m) return;
    const visitName = m[1];
    if (!(visitName in visitNumByName)) return;
    result.push({ alias_name: sheet.alias_name, VISIT: visitName, VISITNUM: visitNumByName[visitName] });
  });
  return result;
}

// visitLookup(alias_name, VISIT, VISITNUM)をalias_nameで結合し、VISIT/VISITNUM列を追加する。
// category=="visit"のシート由来でない行(一致しない行)はnullのまま。このドメインにvisitカテゴリの
// シート由来の行が1件も無ければ(全行null)、意味の無い空列を出さないよう列自体を追加しない。
// また、既にVISITNUM列がある(そのドメイン自身がVISITNUMをradio_button等で直接定義している)場合は
// 上書きしない(Rのadd_visit_columns()に対応)
function addVisitColumns(data, visitLookup) {
  if (!visitLookup || visitLookup.length === 0 || !data[0] || !("alias_name" in data[0]) || "VISITNUM" in data[0]) {
    return data;
  }
  const lookupByAlias = {};
  visitLookup.forEach((r) => {
    if (!(r.alias_name in lookupByAlias)) lookupByAlias[r.alias_name] = r;
  });
  const anyMatch = data.some((row) => row.alias_name in lookupByAlias);
  if (!anyMatch) return data;
  data.forEach((row) => {
    const hit = lookupByAlias[row.alias_name];
    row.VISIT = hit ? hit.VISIT : null;
    row.VISITNUM = hit ? hit.VISITNUM : null;
  });
  return data;
}

// candidates([{USUBJID, alias_name}, ...]、USUBJIDごとに複数のalias_name候補がある)の各USUBJIDについて、
// 1つのalias_nameを選ぶ。presenceConditions(このドメイン自身のcdisc_variableに絞り込み済み)から、
// 候補のalias_nameが実際にゲーティング条件を満たす(=値が入る)ものであれば、それを優先して選ぶ。
// 条件を満たす候補が無い、builtDomainsに参照先ドメインがまだ無い、またはpresenceConditionsに
// 該当するequals条件が無い場合はランダムに1つ選ぶ(Rのresolve_preferred_alias_name()に対応)
function resolvePreferredAliasName(candidates, presenceConditions, builtDomains, cdiscVariableToPrefix) {
  const groupByUsubjid = (list) => {
    const byUsubjid = {};
    list.forEach((c) => {
      if (!byUsubjid[c.USUBJID]) byUsubjid[c.USUBJID] = [];
      byUsubjid[c.USUBJID].push(c);
    });
    return byUsubjid;
  };
  const randomOnePerUsubjid = (list) => {
    const byUsubjid = groupByUsubjid(list);
    return Object.keys(byUsubjid).map((usubjid) => sampleOne(byUsubjid[usubjid]));
  };

  const equalsConditions = (presenceConditions || []).filter((pc) => pc.condition_type === "equals" && pc.ref_alias_name != null);
  if (equalsConditions.length === 0) {
    return randomOnePerUsubjid(candidates);
  }

  const groups = new Map();
  equalsConditions.forEach((pc) => {
    const key = `${pc.ref_cdisc_variable}|${pc.ref_alias_name}|${pc.ref_label}`;
    if (!groups.has(key)) {
      groups.set(key, { refCdiscVariable: pc.ref_cdisc_variable, refAliasName: pc.ref_alias_name, refLabel: pc.ref_label, expectedValues: new Set() });
    }
    groups.get(key).expectedValues.add(pc.expected_value);
  });

  const satisfied = new Set();
  groups.forEach((g) => {
    const refPrefix = cdiscVariableToPrefix[g.refCdiscVariable];
    if (!refPrefix || !builtDomains || !builtDomains[refPrefix]) return;
    const refData = builtDomains[refPrefix];
    const hasAliasLabel = refData[0] && "alias_name" in refData[0] && "label" in refData[0];
    const refSlice =
      hasAliasLabel && g.refLabel != null
        ? refData.filter((r) => r.alias_name === g.refAliasName && r.label === g.refLabel)
        : refData;
    refSlice.forEach((r) => {
      if (g.expectedValues.has(r[g.refCdiscVariable])) {
        satisfied.add(`${r.USUBJID}|${g.refAliasName}`);
      }
    });
  });

  if (satisfied.size === 0) {
    return randomOnePerUsubjid(candidates);
  }

  const byUsubjid = groupByUsubjid(candidates);
  return Object.keys(byUsubjid).map((usubjid) => {
    const list = byUsubjid[usubjid];
    const satisfiedList = list.filter((c) => satisfied.has(`${c.USUBJID}|${c.alias_name}`));
    const pool = satisfiedList.length > 0 ? satisfiedList : list;
    return sampleOne(pool);
  });
}

// presence_conditions/field_ref_bounds/age_boundsが参照するcdisc_variableのうち、dataにまだ無いものを、
// 既に生成済みのbuiltDomainsから探して結合する(他ドメイン参照)。
// refAliasName/refLabel(参照先フィールド自身が属する固定のブロック、例: RSがSCの特定labelを参照する場合)が
// 分かっていればそのインスタンスに固定して結合する(USUBJIDのみ)。
// 無指定の場合は、両者がalias_name/labelを持てばそれも突き合わせキーにする(同じブロック内の参照)。
// どちらの情報も無ければUSUBJIDのみで結合する(参照元に複数レコードあると最初の1件を使う)。
// 戻り値は{ data, injectedCols }(injectedColsはこのために追加した列名。呼び出し側でゲーティングに
// 使い終わった後に削除する想定)(Rのinject_cross_domain_refs()に対応)
function injectCrossDomainRefs(data, presenceConditions, fieldRefBounds, builtDomains, cdiscVariableToPrefix, ageBounds) {
  if (!data || data.length === 0) return { data, injectedCols: [] };

  const refInstances = [
    ...(presenceConditions || []).map((r) => ({ ref_cdisc_variable: r.ref_cdisc_variable, ref_alias_name: r.ref_alias_name, ref_label: r.ref_label })),
    ...(fieldRefBounds || []).map((r) => ({ ref_cdisc_variable: r.ref_cdisc_variable, ref_alias_name: null, ref_label: null })),
    ...(ageBounds || []).map((r) => ({ ref_cdisc_variable: r.ref_cdisc_variable, ref_alias_name: r.ref_alias_name, ref_label: r.ref_label })),
  ].filter((r) => r.ref_cdisc_variable != null);

  const hasDataAliasName = "alias_name" in data[0];
  const hasDataAlias = hasDataAliasName && "label" in data[0];
  const dataAliasNames = hasDataAliasName ? new Set(data.map((r) => r.alias_name)) : new Set();

  const injectedCols = [];
  const refVars = [...new Set(refInstances.map((r) => r.ref_cdisc_variable))];

  refVars.forEach((refVar) => {
    if (refVar in data[0]) return;
    const refPrefix = cdiscVariableToPrefix ? cdiscVariableToPrefix[refVar] : null;
    if (!refPrefix || !builtDomains || !builtDomains[refPrefix] || builtDomains[refPrefix].length === 0) return;
    const refData = builtDomains[refPrefix];
    if (!(refVar in refData[0])) return;
    const hasRefAlias = "alias_name" in refData[0] && "label" in refData[0];

    const resultCol = new Array(data.length).fill(null);

    const pinKeys = new Set();
    const pins = [];
    refInstances
      .filter((r) => r.ref_cdisc_variable === refVar)
      .forEach((r) => {
        const key = `${r.ref_alias_name}|${r.ref_label}`;
        if (!pinKeys.has(key)) {
          pinKeys.add(key);
          pins.push({ alias: r.ref_alias_name, label: r.ref_label });
        }
      });

    pins.forEach((pin) => {
      const pinAlias = pin.alias;
      const pinLabel = pin.label;

      let targetRows;
      if (hasDataAliasName && pinAlias != null && dataAliasNames.has(pinAlias)) {
        targetRows = data.map((row) => row.alias_name === pinAlias);
        if (hasDataAlias && pinLabel != null) {
          const labelsInAlias = new Set(data.filter((row, i) => targetRows[i]).map((row) => row.label));
          if (labelsInAlias.has(pinLabel)) {
            targetRows = data.map((row, i) => targetRows[i] && row.label === pinLabel);
          }
        }
      } else {
        targetRows = data.map(() => true);
      }
      if (!targetRows.some((v) => v)) return;

      if (pinLabel != null && hasRefAlias) {
        const valueMap = {};
        refData.forEach((row) => {
          if (row.alias_name === pinAlias && row.label === pinLabel && !(row.USUBJID in valueMap)) {
            valueMap[row.USUBJID] = row[refVar];
          }
        });
        data.forEach((row, i) => {
          if (targetRows[i]) resultCol[i] = row.USUBJID in valueMap ? valueMap[row.USUBJID] : null;
        });
      } else if (hasDataAlias && hasRefAlias) {
        const refMap = {};
        refData.forEach((row) => {
          const key = `${row.USUBJID}|${row.alias_name}|${row.label}`;
          if (!(key in refMap)) refMap[key] = row[refVar];
        });
        data.forEach((row, i) => {
          if (targetRows[i]) {
            const key = `${row.USUBJID}|${row.alias_name}|${row.label}`;
            resultCol[i] = key in refMap ? refMap[key] : null;
          }
        });
      } else {
        const valueMap = {};
        refData.forEach((row) => {
          if (!(row.USUBJID in valueMap)) valueMap[row.USUBJID] = row[refVar];
        });
        data.forEach((row, i) => {
          if (targetRows[i]) resultCol[i] = row.USUBJID in valueMap ? valueMap[row.USUBJID] : null;
        });
      }
    });

    data.forEach((row, i) => {
      row[refVar] = resultCol[i];
    });
    injectedCols.push(refVar);
  });

  return { data, injectedCols };
}

// USUBJID×alias_nameでグループ化し、multiRecordAliasNamesに該当するalias_nameの行だけ、
// そのグループ内の連番("alias_name"+通番)にSPIDを振り直す(Rのapply_multi_record_spid()に対応)
function applyMultiRecordSpid(data, spidVar, multiRecordAliasNames) {
  if (!multiRecordAliasNames || multiRecordAliasNames.length === 0 || !data[0] || !("alias_name" in data[0])) {
    return data;
  }
  const set = new Set(multiRecordAliasNames);
  const counters = {};
  data.forEach((row) => {
    if (!set.has(row.alias_name)) return;
    const key = `${row.USUBJID}|${row.alias_name}`;
    counters[key] = (counters[key] || 0) + 1;
    row[spidVar] = `${row.alias_name}${counters[key]}`;
  });
  return data;
}

// radio_button/check_box型の項目に、選択肢(code、無ければdefault_value)からランダムな値を入れる。
// alias_name(どのブロックの行か)によって同じcdisc_variableでも選択肢が異なりうるため、
// 行のalias_nameと一致するspecの選択肢だけから選ぶ(Rのpopulate_radio_button_fields()の
// has_alias_name==TRUEの分岐に対応。requiredVars/numericBoundsの扱いはDM/AE/DSと同じ)
function populateGenericChoiceFields(data, spec, requiredVars, numericBounds) {
  const existingColumns = new Set(Object.keys(data[0] || {}));
  const choiceSpec = spec.filter((r) => r.field_type === "radio_button" || r.field_type === "check_box");
  const targetVars = [...new Set(choiceSpec.map((r) => r.cdisc_variable))].filter((v) => !existingColumns.has(v));
  const requiredSet = new Set(requiredVars || []);

  targetVars.forEach((varName) => {
    data.forEach((row) => {
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
      const targetRows = data.filter((row) => row.alias_name === an);
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
  return data;
}

// date型の項目に、registrationStartDate〜今日の間のランダムな日付を入れる。alias_nameによって
// 同じcdisc_variableでも定義の有無が異なりうるため、その変数を定義しているalias_nameの行だけに
// 値を入れる(Rのpopulate_date_fields()のhas_alias_name==TRUEの分岐に対応)
function populateGenericDateFields(data, spec, registrationStartDate) {
  const existingColumns = new Set(Object.keys(data[0] || {}));
  const dateVars = [...new Set(spec.filter((r) => r.field_type === "date").map((r) => r.cdisc_variable))].filter(
    (v) => !existingColumns.has(v)
  );
  const today = new Date().toISOString().slice(0, 10);

  dateVars.forEach((varName) => {
    const dateAliasNames = new Set(spec.filter((r) => r.field_type === "date" && r.cdisc_variable === varName).map((r) => r.alias_name));
    data.forEach((row) => {
      row[varName] = dateAliasNames.has(row.alias_name) ? randomDateBetween(registrationStartDate, today) : null;
    });
  });
  return data;
}

// 変数名が"DOSE"で終わる項目に、それらしい用量の数値を入れる(Rのpopulate_dose_fields()に対応)
function populateDoseFields(data, spec) {
  const existingColumns = new Set(Object.keys(data[0] || {}));
  const doseVars = [...new Set(spec.map((r) => r.cdisc_variable))].filter((v) => !existingColumns.has(v) && /DOSE$/.test(v));
  const doseChoices = ["50", "100", "150", "200", "250", "300", "400", "500"];
  doseVars.forEach((varName) => {
    data.forEach((row) => {
      row[varName] = sampleOne(doseChoices);
    });
  });
  return data;
}

// radio_button/check_box/date/doseのいずれでも埋まらなかった対象変数に、とりあえずDUMMY値を格納する
// (Rのpopulate_dummy_fields()に対応)
function populateGenericDummyFields(data, spec) {
  const existingColumns = new Set(Object.keys(data[0] || {}));
  const remainingVars = [...new Set(spec.map((r) => r.cdisc_variable))].filter((v) => !existingColumns.has(v));
  remainingVars.forEach((varName) => {
    data.forEach((row) => {
      row[varName] = "DUMMY";
    });
  });
  return data;
}

// meddra型の項目にLLT名を格納する(Rのpopulate_meddra_fields()に対応。alias_nameによる絞り込みは
// 行わない点はAE/DM/DSと同じ)
function populateGenericMeddraFields(data, spec, meddraData, meddraSample) {
  const existingColumns = new Set(Object.keys(data[0] || {}));
  const meddraVars = [...new Set(spec.filter((r) => r.field_type === "meddra").map((r) => r.cdisc_variable))].filter(
    (v) => !existingColumns.has(v)
  );
  meddraVars.forEach((varName) => {
    const fixedCodes = [
      ...new Set(
        spec
          .filter((r) => r.field_type === "meddra" && r.cdisc_variable === varName && /^[0-9]{8}$/.test(r.default_value || ""))
          .map((r) => r.default_value)
      ),
    ];
    if (fixedCodes.length === 1) {
      const fixedRow = meddraData.find((r) => r.llt_code === fixedCodes[0]);
      const lltName = fixedRow ? fixedRow.llt_name : undefined;
      data.forEach((row) => {
        row[varName] = lltName;
      });
    } else {
      data.forEach((row, i) => {
        row[varName] = meddraSample[i].llt_name;
      });
    }
  });
  return data;
}

// field_type=="drug"に該当する変数名を抽出(Rのcompute_drug_vars()に対応)
function computeDrugVars(spec) {
  return [...new Set(spec.filter((r) => r.field_type === "drug").map((r) => r.cdisc_variable))];
}

// drugVars(field_type=="drug"な変数)のspec行が、1つでもdefault_value(固定コード)無し
// (=ランダムサンプリングされ、実際にwhoDrugIdfとの一致を確認する意味がある)場合はtrue。
// 全て固定コードで値が確定している場合はfalse(この場合、prefixDECOD列は生成しない)
// (Rのdrug_vars_need_decod()に対応)
function drugVarsNeedDecod(spec, drugVars) {
  const drugVarSet = new Set(drugVars);
  return spec.some((r) => r.field_type === "drug" && drugVarSet.has(r.cdisc_variable) && (r.default_value == null || r.default_value === ""));
}

// drug型の項目に、whoDrugIdf(drug_code/full_name_en/generic_name_enの配列)から薬剤名(full_name_en)を
// 格納する。default_valueが数値の場合はwhoDrugIdf$drug_codeとみなし対応するfull_name_enを固定値として
// 使う。それ以外はwhoDrugIdf$full_name_enからランダムにサンプリングする。alias_nameでスコープを絞る
// (同じcdisc_variableが別alias_nameで固定値/別のfield_typeとして定義されている場合、その行は変更しない)
// (Rのpopulate_drug_fields()に対応)
function populateDrugFields(data, spec, drugVars, whoDrugIdf) {
  const drugNames = [...new Set(whoDrugIdf.map((r) => r.full_name_en).filter((v) => v != null))];
  if (drugNames.length === 0) return data;
  drugVars.forEach((varName) => {
    const drugSpecRows = spec.filter((r) => r.field_type === "drug" && r.cdisc_variable === varName);
    const aliasNames = [...new Set(drugSpecRows.map((r) => r.alias_name))];
    aliasNames.forEach((an) => {
      const targetRows = data.filter((row) => row.alias_name === an);
      if (targetRows.length === 0) return;
      const defaultValues = [
        ...new Set(drugSpecRows.filter((r) => r.alias_name === an).map((r) => r.default_value).filter((v) => v != null && v !== "")),
      ];
      let fixedName = null;
      if (defaultValues.length === 1 && /^[0-9]+$/.test(defaultValues[0])) {
        const hit = whoDrugIdf.find((r) => r.drug_code === defaultValues[0] && r.full_name_en != null);
        if (hit) fixedName = hit.full_name_en;
      }
      targetRows.forEach((row) => {
        row[varName] = fixedName != null ? fixedName : sampleOne(drugNames);
      });
    });
  });
  return data;
}

// drug変数の値がwhoDrugIdfの薬剤名(full_name_en)に完全一致する場合、prefixDECOD(例: CMDECOD)に
// generic_name_enを格納する(一致しない場合はnull)。field_type=="drug"と定義されているalias_nameの
// 行だけを対象にする。drugVarsが複数ある場合は、最初に一致した変数の値を採用する
// (Rのadd_drug_decod()に対応)
function addDrugDecod(data, spec, drugVars, whoDrugIdf, prefix) {
  if (drugVars.length === 0 || !data[0]) return data;
  // 同じfull_name_enが複数行あり、一部だけgeneric_name_enが空のことがあるため、
  // generic_name_enが空でない行を優先して残してからルックアップを作る
  const lookup = {};
  [...whoDrugIdf]
    .filter((r) => r.full_name_en != null)
    .sort((a, b) => (a.generic_name_en == null ? 1 : 0) - (b.generic_name_en == null ? 1 : 0))
    .forEach((r) => {
      if (!(r.full_name_en in lookup)) lookup[r.full_name_en] = r.generic_name_en;
    });

  const decodVar = `${prefix}DECOD`;
  data.forEach((row) => {
    row[decodVar] = null;
  });
  drugVars.forEach((varName) => {
    const drugAliasNames = new Set(spec.filter((r) => r.field_type === "drug" && r.cdisc_variable === varName).map((r) => r.alias_name));
    data.forEach((row) => {
      if (row[decodVar] != null || !drugAliasNames.has(row.alias_name)) return;
      const matched = lookup[row[varName]];
      if (matched != null) row[decodVar] = matched;
    });
  });
  return data;
}

// データセット全体の通番を付与する(Rのadd_seq()に対応)
function addSeq(data, seqVar) {
  data.forEach((row, i) => {
    row[seqVar] = i + 1;
  });
  return data;
}

// DM/AE/DSのような個別ロジックを持たないドメイン向けの汎用生成。
// alias_nameがmultiRecordAliasNamesに該当しない場合はUSUBJIDごとに1レコード、該当する場合
// (AE報告のように被験者ごとに複数件記録されうるシート)はAEドメインと同様、被験者に対して
// ランダムな件数(0件を含む)のレコードを作る(Rのbuild_generic_domain()に対応)。
// options: { addCodingBlock, builtDomains, cdiscVariableToPrefix, ageBounds, multiRecordAliasNames, activeSheetTable, whoDrugIdf, visitLookup }
function buildGenericDomain(dm, spec, prefix, registrationStartDate, meddraData, presenceConditions, requiredVars, numericBounds, fieldRefBounds, options) {
  const opts = options || {};
  const addCodingBlock = !!opts.addCodingBlock;
  const builtDomains = opts.builtDomains || {};
  const cdiscVariableToPrefix = opts.cdiscVariableToPrefix || {};
  const ageBounds = opts.ageBounds || [];
  const multiRecordAliasNames = opts.multiRecordAliasNames || [];
  const activeSheetTable = opts.activeSheetTable || null;
  const whoDrugIdf = opts.whoDrugIdf || null;
  const visitLookup = opts.visitLookup || null;

  // presence_conditions/field_ref_bounds/age_boundsは全ドメイン分を含む共通テーブルのため、
  // このドメイン自身のcdisc_variableに関する行だけに絞ってから使う
  const ownVars = new Set(spec.map((r) => r.cdisc_variable));
  const scopedPresenceConditions = (presenceConditions || []).filter((pc) => ownVars.has(pc.cdisc_variable));
  const scopedFieldRefBounds = (fieldRefBounds || []).filter((fb) => ownVars.has(fb.cdisc_variable));
  const scopedAgeBounds = ageBounds.filter((ab) => ownVars.has(ab.cdisc_variable));

  const aliasNames = [...new Set(spec.map((r) => r.alias_name))];
  const multiSet = new Set(multiRecordAliasNames);
  const singleAliasNames = aliasNames.filter((a) => !multiSet.has(a));
  const multiAliasNames = aliasNames.filter((a) => multiSet.has(a));

  let singleRows = [];
  if (singleAliasNames.length > 0) {
    let candidates;
    if (activeSheetTable) {
      const singleSet = new Set(singleAliasNames);
      candidates = activeSheetTable.filter((r) => singleSet.has(r.alias_name));
    } else {
      candidates = [];
      dm.forEach((dmRow) => {
        singleAliasNames.forEach((a) => candidates.push({ USUBJID: dmRow.USUBJID, alias_name: a }));
      });
    }
    singleRows = resolvePreferredAliasName(candidates, scopedPresenceConditions, builtDomains, cdiscVariableToPrefix);
  }

  const multiRows = [];
  multiAliasNames.forEach((an) => {
    const eligibleUsubjids = activeSheetTable
      ? [...new Set(activeSheetTable.filter((r) => r.alias_name === an).map((r) => r.USUBJID))]
      : dm.map((r) => r.USUBJID);
    if (eligibleUsubjids.length === 0) return;
    for (let i = 0; i < eligibleUsubjids.length; i += 1) {
      multiRows.push({ USUBJID: sampleOne(eligibleUsubjids), alias_name: an });
    }
  });

  const dmByUsubjid = {};
  dm.forEach((r) => {
    dmByUsubjid[r.USUBJID] = r;
  });

  let data = [...singleRows, ...multiRows].map((row) => ({
    STUDYID: dmByUsubjid[row.USUBJID] ? dmByUsubjid[row.USUBJID].STUDYID : null,
    DOMAIN: prefix,
    USUBJID: row.USUBJID,
    alias_name: row.alias_name,
  }));

  const spidVar = `${prefix}SPID`;
  data.forEach((row) => {
    row[spidVar] = row.alias_name;
  });
  data = applyMultiRecordSpid(data, spidVar, multiRecordAliasNames);

  data = populateGenericChoiceFields(data, spec, requiredVars, numericBounds);
  data = populateGenericDateFields(data, spec, registrationStartDate);
  data = populateDoseFields(data, spec);
  data = populateGenericDummyFields(data, spec);
  const seqVar = `${prefix}SEQ`;
  addSeq(data, seqVar);

  const meddraVars = [...new Set(spec.filter((r) => r.field_type === "meddra").map((r) => r.cdisc_variable))];
  let codingCols = [];
  if (meddraVars.length > 0 && meddraData && data.length > 0) {
    const meddraSample = sampleMeddraRows(meddraData, data.length);
    data = populateGenericMeddraFields(data, spec, meddraData, meddraSample);
    if (addCodingBlock) {
      data = addAeMeddraCodingBlock(data, meddraSample, prefix);
      codingCols = MEDDRA_CODING_COLS.map((c) => prefix + c);
    }
  }

  // drug変数(field_type=="drug")には、whoDrugIdfから薬剤名をサンプリングして格納する。
  // alias_nameでスコープを絞る(同じcdisc_variableが別alias_nameで固定値等の場合はそちらを変更しない)
  const drugVars = computeDrugVars(spec);
  if (drugVars.length > 0 && whoDrugIdf) {
    data = populateDrugFields(data, spec, drugVars, whoDrugIdf);
  }

  // presence_conditions/field_ref_bounds/age_boundsが他ドメインの変数を参照している場合、
  // builtDomains(既に生成済みのドメイン)から値を結合してから条件を適用し、結合用に追加した列は最後に外す
  const injected = injectCrossDomainRefs(data, scopedPresenceConditions, scopedFieldRefBounds, builtDomains, cdiscVariableToPrefix, scopedAgeBounds);
  data = injected.data;
  data = applyPresenceConditions(data, scopedPresenceConditions);
  data = applyFieldRefBounds(data, spec, scopedFieldRefBounds);
  data = applyAgeDateBounds(data, scopedAgeBounds, registrationStartDate);
  data.forEach((row) => {
    injected.injectedCols.forEach((c) => delete row[c]);
  });

  // drug変数の値がwhoDrugIdfの薬剤名(full_name_en)に完全一致する場合、prefixDECODに
  // generic_name_enを格納する(presence_conditions等で値が変わった後の最終状態を見る)。
  // 全て固定コード(default_value)で値が確定している場合は、一致確認する意味が無いのでDECOD列自体を作らない
  if (drugVars.length > 0 && whoDrugIdf && drugVarsNeedDecod(spec, drugVars)) {
    data = addDrugDecod(data, spec, drugVars, whoDrugIdf, prefix);
  }

  data = addVisitColumns(data, visitLookup);

  data.forEach((row) => {
    delete row.alias_name;
  });

  // 列順を STUDYID/DOMAIN/USUBJID/prefixSEQ/prefixSPID -> meddra項目 -> コーディングブロック -> その他 に整理する
  const frontCols = ["STUDYID", "DOMAIN", "USUBJID", seqVar, spidVar, ...meddraVars, ...codingCols];
  const allColsSet = new Set();
  data.forEach((row) => Object.keys(row).forEach((c) => allColsSet.add(c)));
  const middleCols = [...allColsSet].filter((c) => !frontCols.includes(c));
  const orderedCols = [...frontCols.filter((c) => allColsSet.has(c)), ...middleCols];

  return data.map((row) => {
    const newRow = {};
    orderedCols.forEach((c) => {
      newRow[c] = c in row ? row[c] : null;
    });
    return newRow;
  });
}

// specの中で、同じ(alias_name, cdisc_variable)の組が複数の異なるlabelを持つか(=繰り返しフィールドか)を判定する
// (Rのhas_repeated_labels()に対応)
function hasRepeatedLabels(spec) {
  const counts = new Map();
  spec.forEach((r) => {
    if (r.label == null) return;
    const key = `${r.alias_name}|${r.cdisc_variable}`;
    if (!counts.has(key)) counts.set(key, new Set());
    counts.get(key).add(r.label);
  });
  return [...counts.values()].some((labels) => labels.size > 1);
}

// TR/LBのように、同じcdisc_variableが同じalias_name内で複数のlabel(繰り返しフィールド)に対応するドメイン向け。
// USUBJID×(alias_name, label)の組み合わせごとに1レコード作り、各変数は自分のlabelに対応するspec行だけを見て
// 値を生成する(対応するlabelが無ければnullのまま)。radio_button/check_box/date/meddra/drug/dose/dummyに
// 対応する(Rのbuild_repeated_domain()に対応)。
// options: { addCodingBlock, builtDomains, cdiscVariableToPrefix, ageBounds, multiRecordAliasNames, activeSheetTable, whoDrugIdf, visitLookup }
function buildRepeatedDomain(dm, spec, prefix, registrationStartDate, meddraData, presenceConditions, requiredVars, options) {
  const opts = options || {};
  const addCodingBlock = !!opts.addCodingBlock;
  const builtDomains = opts.builtDomains || {};
  const cdiscVariableToPrefix = opts.cdiscVariableToPrefix || {};
  const ageBounds = opts.ageBounds || [];
  const multiRecordAliasNames = opts.multiRecordAliasNames || [];
  const activeSheetTable = opts.activeSheetTable || null;
  const whoDrugIdf = opts.whoDrugIdf || null;
  const visitLookup = opts.visitLookup || null;
  const drugNames = whoDrugIdf ? [...new Set(whoDrugIdf.map((r) => r.full_name_en).filter((v) => v != null))] : [];
  const requiredSet = new Set(requiredVars || []);

  const ownVars = new Set(spec.map((r) => r.cdisc_variable));
  const scopedPresenceConditions = (presenceConditions || []).filter((pc) => ownVars.has(pc.cdisc_variable));
  const scopedAgeBounds = ageBounds.filter((ab) => ownVars.has(ab.cdisc_variable));

  const repeatUnitsMap = new Map();
  spec.forEach((r) => {
    if (r.label == null) return;
    const key = `${r.alias_name}|${r.label}`;
    if (!repeatUnitsMap.has(key)) repeatUnitsMap.set(key, { alias_name: r.alias_name, label: r.label });
  });
  const repeatUnits = [...repeatUnitsMap.values()];

  const dmByUsubjid = {};
  dm.forEach((r) => {
    dmByUsubjid[r.USUBJID] = r;
  });

  let data = [];
  if (activeSheetTable) {
    activeSheetTable.forEach((row) => {
      repeatUnits.forEach((ru) => {
        if (ru.alias_name === row.alias_name) {
          data.push({ USUBJID: row.USUBJID, alias_name: ru.alias_name, label: ru.label });
        }
      });
    });
  } else {
    dm.forEach((dmRow) => {
      repeatUnits.forEach((ru) => {
        data.push({ USUBJID: dmRow.USUBJID, alias_name: ru.alias_name, label: ru.label });
      });
    });
  }
  data.forEach((row) => {
    row.STUDYID = dmByUsubjid[row.USUBJID] ? dmByUsubjid[row.USUBJID].STUDYID : null;
    row.DOMAIN = prefix;
  });

  const spidVar = `${prefix}SPID`;
  data.forEach((row) => {
    row[spidVar] = row.alias_name;
  });
  data = applyMultiRecordSpid(data, spidVar, multiRecordAliasNames);

  const existingColumns = new Set(Object.keys(data[0] || {}));
  const targetVars = [...new Set(spec.map((r) => r.cdisc_variable))].filter((v) => !existingColumns.has(v));

  // (alias_name, label)ごとにグループ化しておく(組み合わせ数×行数のスキャンを避けるため)
  const groups = new Map();
  data.forEach((row) => {
    const key = `${row.alias_name}|${row.label}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });

  const doseChoices = ["50", "100", "150", "200", "250", "300", "400", "500"];
  const today = new Date().toISOString().slice(0, 10);

  targetVars.forEach((varName) => {
    const varSpec = spec.filter((r) => r.cdisc_variable === varName);
    const specByGroup = new Map();
    varSpec.forEach((r) => {
      const key = `${r.alias_name}|${r.label}`;
      if (!specByGroup.has(key)) {
        specByGroup.set(key, { fieldType: r.field_type, defaultValue: r.default_value, codes: new Set(), isInvisibleAny: false });
      }
      const g = specByGroup.get(key);
      g.codes.add(r.code != null ? r.code : r.default_value);
      if (r.is_invisible) g.isInvisibleAny = true;
    });

    groups.forEach((rows, key) => {
      const g = specByGroup.get(key);
      if (!g) {
        rows.forEach((row) => {
          row[varName] = null;
        });
        return;
      }
      if (g.fieldType == null) {
        // このUSUBJID×(alias_name,label)の組み合わせでは、この変数自体が定義されていない
        // (同じalias_name内の他labelで定義された別変数がこの繰り返し単位を作っただけ)。
        // Rのbuild_repeated_domain()のis.na(ft)分岐と同じくnullのままにする("DUMMY"にはしない)
        rows.forEach((row) => {
          row[varName] = null;
        });
        return;
      }
      let codes = [...g.codes];
      if (!requiredSet.has(varName) && !g.isInvisibleAny) {
        codes = [...new Set([...codes, ""])];
      }
      if (g.fieldType === "radio_button" || g.fieldType === "check_box") {
        if (codes.length === 0) {
          rows.forEach((row) => {
            row[varName] = null;
          });
        } else if (g.fieldType === "check_box") {
          const values = sampleCheckBoxValues(codes, rows.length);
          rows.forEach((row, i) => {
            row[varName] = values[i];
          });
        } else {
          rows.forEach((row) => {
            row[varName] = sampleOne(codes);
          });
        }
      } else if (g.fieldType === "date") {
        rows.forEach((row) => {
          row[varName] = randomDateBetween(registrationStartDate, today);
        });
      } else if (g.fieldType === "meddra") {
        const dv = g.defaultValue;
        if (dv != null && /^[0-9]{8}$/.test(dv)) {
          const hit = meddraData.find((r) => r.llt_code === dv);
          const lltName = hit ? hit.llt_name : null;
          rows.forEach((row) => {
            row[varName] = lltName;
          });
        } else {
          const sample = sampleMeddraRows(meddraData, rows.length);
          rows.forEach((row, i) => {
            row[varName] = sample[i].llt_name;
          });
        }
      } else if (g.fieldType === "drug") {
        const dv = g.defaultValue;
        let fixedName = null;
        if (dv != null && /^[0-9]+$/.test(dv) && whoDrugIdf) {
          const hit = whoDrugIdf.find((r) => r.drug_code === dv && r.full_name_en != null);
          if (hit) fixedName = hit.full_name_en;
        }
        if (fixedName != null) {
          rows.forEach((row) => {
            row[varName] = fixedName;
          });
        } else if (drugNames.length > 0) {
          rows.forEach((row) => {
            row[varName] = sampleOne(drugNames);
          });
        } else {
          rows.forEach((row) => {
            row[varName] = null;
          });
        }
      } else if (/DOSE$/.test(varName)) {
        rows.forEach((row) => {
          row[varName] = sampleOne(doseChoices);
        });
      } else {
        rows.forEach((row) => {
          row[varName] = "DUMMY";
        });
      }
    });
  });

  let codingCols = [];
  if (addCodingBlock) {
    const meddraTypeVars = [...new Set(spec.filter((r) => r.field_type === "meddra").map((r) => r.cdisc_variable))].filter((v) =>
      Object.prototype.hasOwnProperty.call(data[0] || {}, v)
    );
    if (meddraTypeVars.length > 0) {
      const lltLookup = {};
      meddraData.forEach((r) => {
        if (!(r.llt_name in lltLookup)) lltLookup[r.llt_name] = r;
      });
      const meddraSample = data.map((row) => {
        let lltName = null;
        for (let i = 0; i < meddraTypeVars.length; i += 1) {
          if (row[meddraTypeVars[i]] != null) {
            lltName = row[meddraTypeVars[i]];
            break;
          }
        }
        // lltNameがmeddraデータ上のllt_nameと完全一致しない場合(例: radio_button型のMHTERMのように
        // 選択肢の文言そのものを使っている場合)、LLTCD等のコード系列はnullのままにしつつ、
        // LLT列自体は元のlltNameを保持する(Rのadd_meddra_coding_block()がleft_joinでllt_name列を
        // 保持したまま他列だけNAにするのと同じ挙動)
        return lltLookup[lltName] || { llt_name: lltName };
      });
      data = addAeMeddraCodingBlock(data, meddraSample, prefix);
      codingCols = MEDDRA_CODING_COLS.map((c) => prefix + c);
    }
  }

  // presence_conditions/age_boundsが他ドメインの変数を参照している場合、builtDomainsから値を結合してから
  // 条件を適用し、結合用に追加した列は最後に外す(field_ref_boundsはRのbuild_repeated_domain()と同様に対象外)
  const injected = injectCrossDomainRefs(data, scopedPresenceConditions, null, builtDomains, cdiscVariableToPrefix, scopedAgeBounds);
  data = injected.data;
  data = applyPresenceConditions(data, scopedPresenceConditions);
  data = applyAgeDateBounds(data, scopedAgeBounds, registrationStartDate);
  data.forEach((row) => {
    injected.injectedCols.forEach((c) => delete row[c]);
  });

  // drug変数の値がwhoDrugIdfの薬剤名(full_name_en)に完全一致する場合、prefixDECODに
  // generic_name_enを格納する。全て固定コード(default_value)で値が確定している場合は
  // DECOD列自体を作らない
  const drugVarsInData = computeDrugVars(spec).filter((v) => data[0] && v in data[0]);
  if (drugVarsInData.length > 0 && whoDrugIdf && drugVarsNeedDecod(spec, drugVarsInData)) {
    data = addDrugDecod(data, spec, drugVarsInData, whoDrugIdf, prefix);
  }

  data = addVisitColumns(data, visitLookup);

  const seqVar = `${prefix}SEQ`;
  addSeq(data, seqVar);

  // alias_name/labelはここでは残す(オーケストレーター(buildOtherDomains)が他ドメイン参照の突き合わせキーとして使い、
  // 最終出力を作る段階で取り除く。Rのbuild_repeated_domain()と同じ)
  const frontCols = ["STUDYID", "DOMAIN", "USUBJID", seqVar, spidVar, ...codingCols];
  const allColsSet = new Set();
  data.forEach((row) => Object.keys(row).forEach((c) => allColsSet.add(c)));
  const middleCols = [...allColsSet].filter((c) => !frontCols.includes(c));
  const orderedCols = [...frontCols.filter((c) => allColsSet.has(c)), ...middleCols];

  return data.map((row) => {
    const newRow = {};
    orderedCols.forEach((c) => {
      newRow[c] = c in row ? row[c] : null;
    });
    return newRow;
  });
}

// cdiscVariableValuesに含まれるprefixのうち、excludePrefixes(既定でDM/AE/DS)を除いた全てについて、
// ドメイン間の依存関係(presence_conditions/field_ref_bounds/age_boundsが他ドメインを参照する箇所)を
// トポロジカルソートで解決した順に、has_repeated_labels(またはrepeatedPrefixesで明示指定)に応じて
// buildGenericDomain/buildRepeatedDomainを呼び分けて生成する。prefixをキーにしたオブジェクトで返す
// (Rのbuild_other_domains()に対応するが、AEリンクブロック・apply_orres_populatorsはまだ未対応)。
// options: { excludePrefixes, codingBlockPrefixes, repeatedPrefixes, builtDomains, ageBounds,
//            multiRecordAliasNames, activeSheetTable, whoDrugIdf, visitLookup }
function buildOtherDomains(dm, cdiscVariableValues, registrationStartDate, meddraData, presenceConditions, requiredVars, numericBounds, fieldRefBounds, options) {
  const opts = options || {};
  const excludePrefixes = new Set(opts.excludePrefixes || ["DM", "AE", "DS"]);
  const codingBlockPrefixes = new Set(opts.codingBlockPrefixes || ["MH"]);
  const forceRepeatedPrefixes = new Set(opts.repeatedPrefixes || []);
  const builtDomains = Object.assign({}, opts.builtDomains || {});
  const ageBounds = opts.ageBounds || [];
  const multiRecordAliasNames = opts.multiRecordAliasNames || [];
  const activeSheetTable = opts.activeSheetTable || null;
  const whoDrugIdf = opts.whoDrugIdf || null;
  const visitLookup = opts.visitLookup || null;

  const prefixes = [...new Set(cdiscVariableValues.map((r) => r.prefix))].filter((p) => !excludePrefixes.has(p));
  const cdiscVariableToPrefix = buildCdiscVariableToPrefix(cdiscVariableValues);
  const edges = buildCrossPrefixEdges(presenceConditions, fieldRefBounds, cdiscVariableToPrefix, ageBounds);
  const orderedPrefixes = topoSortPrefixes(prefixes, edges);

  orderedPrefixes.forEach((prefix) => {
    const spec = cdiscVariableValues.filter((r) => r.prefix === prefix);
    const addCodingBlock = codingBlockPrefixes.has(prefix);
    const buildOptions = {
      addCodingBlock,
      builtDomains,
      cdiscVariableToPrefix,
      ageBounds,
      multiRecordAliasNames,
      activeSheetTable,
      whoDrugIdf,
      visitLookup,
    };
    builtDomains[prefix] =
      forceRepeatedPrefixes.has(prefix) || hasRepeatedLabels(spec)
        ? buildRepeatedDomain(dm, spec, prefix, registrationStartDate, meddraData, presenceConditions, requiredVars, buildOptions)
        : buildGenericDomain(dm, spec, prefix, registrationStartDate, meddraData, presenceConditions, requiredVars, numericBounds, fieldRefBounds, buildOptions);
  });

  const result = {};
  prefixes.forEach((prefix) => {
    result[prefix] = (builtDomains[prefix] || []).map((row) => {
      const { alias_name, label, ...rest } = row;
      return rest;
    });
  });
  return result;
}

// gatedVars(presence_conditionsで条件付けされている変数)が全てnullの行を除外する。
// DD(死因)のように、DDTEST/DDTESTCDのような固定値の列は常に埋まっているため、
// 「ドメインの全列がnull」ではなく「条件付きの列(例: DDORRES)が全てnull」で判定する必要がある。
// gatedVarsが空、またはdomainに1つも存在しない場合は何もしない(Rのdrop_empty_domain_rows()に対応)
function dropEmptyDomainRows(domain, gatedVars) {
  const relevantVars = (gatedVars || []).filter((v) => domain[0] && v in domain[0]);
  if (relevantVars.length === 0) return domain;
  return domain.filter((row) => relevantVars.some((v) => row[v] != null && row[v] !== ""));
}

// EDC仕様のvalidate_presence_if等(field_itemsのvalidators)から、presence_conditions等の
// 生成制約テーブル一式を組み立て、ドメインデータに適用する。
// R版のbuild_validator_table.R/build_generation_constraints.R/build_domain_common.Rの
// apply_presence_conditions()・apply_age_date_bounds()に対応する

// --- build_validator_table.R相当 ---

// sheetsのfield_items.validatorsを(alias_name, field_name, validator_type, validator_key, value)の
// 縦持り配列にする(Rのbuild_validator_table_raw()に対応)
function buildValidatorTableRaw(sheets) {
  const rows = [];
  (sheets || []).forEach((sheet) => {
    (sheet.field_items || []).forEach((field) => {
      const validators = field.validators || {};
      Object.keys(validators).forEach((validatorType) => {
        const rules = validators[validatorType] || {};
        const keys = Object.keys(rules);
        if (keys.length === 0) {
          rows.push({ alias_name: sheet.alias_name, field_name: field.name, validator_type: validatorType, validator_key: null, value: null });
        } else {
          keys.forEach((validatorKey) => {
            const raw = rules[validatorKey];
            const value = Array.isArray(raw) ? raw.map(String).join(", ") : raw == null ? null : String(raw);
            rows.push({ alias_name: sheet.alias_name, field_name: field.name, validator_type: validatorType, validator_key: validatorKey, value });
          });
        }
      });
    });
  });
  return rows;
}

function classifyBoundType(validatorType, validatorKey) {
  if (validatorType === "date" && validatorKey === "validate_date_after_or_equal_to") return "min_date";
  if (validatorType === "date" && validatorKey === "validate_date_before_or_equal_to") return "max_date";
  if (validatorType === "numericality" && validatorKey === "validate_numericality_greater_than_or_equal_to") return "min_value";
  if (validatorType === "numericality" && validatorKey === "validate_numericality_less_than_or_equal_to") return "max_value";
  return null;
}

function extractNumericValue(validatorType, value) {
  // Number("")は0を返してしまう(RのNAとは異なりJSは空文字列を数値として扱えるため)。
  // 値未設定のバリデータ行を上限/下限0として誤って扱わないよう、空文字列もnullとして除外する
  if (validatorType !== "numericality" || value == null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function extractRefField(validatorType, value) {
  if (validatorType === "date" && value != null && /^field[0-9]+$/.test(value)) return value;
  return null;
}

// valueが"ref('sheet_alias', N)"のような他シート参照の場合(date型バリデータの
// validate_date_after_or_equal_to/validate_date_before_or_equal_toで使われる形。presence/formula側の
// ref('sheet_alias', N)=='値'とは異なり、値の比較を伴わない単独のref()呼び出し)、参照先のシート
// (alias_name)とフィールド名を取り出す(Rのextract_date_cross_ref_alias/extract_date_cross_ref_fieldに対応)
const DATE_CROSS_REF_PATTERN = /^ref\('([^']+)'\s*,\s*([0-9]+)\)$/;

function extractDateCrossRefAlias(validatorType, value) {
  if (validatorType !== "date" || value == null) return null;
  const m = value.match(DATE_CROSS_REF_PATTERN);
  return m ? m[1] : null;
}

function extractDateCrossRefField(validatorType, value) {
  if (validatorType !== "date" || value == null) return null;
  const m = value.match(DATE_CROSS_REF_PATTERN);
  return m ? `field${m[2]}` : null;
}

// value(例: field2=='ADVERSE EVENT'、f4=='Y' || f4=='N'、field6=="Y")を"||"で分割し、
// 全断片が同一フィールドに対するfieldN==値(またはfN==値)の形であれば、フィールド名と値の一覧を返す。
// 異なるフィールドが混ざる、またはパースできない断片があればnull(Rのparse_presence_or_conditions()に対応)
const PRESENCE_OR_FRAGMENT_RE = /^(?:field|f)([0-9]+)\s*==\s*(?:'([^']*)'|"([^"]*)"|(\S+))$/;
function parsePresenceOrConditions(value) {
  const fragments = value.split("||").map((s) => s.trim());
  const matches = fragments.map((f) => f.match(PRESENCE_OR_FRAGMENT_RE));
  if (matches.some((m) => m === null)) return null;
  const fieldNums = [...new Set(matches.map((m) => m[1]))];
  if (fieldNums.length !== 1) return null;
  const values = matches.map((m) => (m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4]));
  return { field: `field${fieldNums[0]}`, values };
}

function computePresenceRefFieldAndValue(validatorType, validatorKey, value) {
  if (validatorType !== "presence" || validatorKey !== "validate_presence_if" || value == null) {
    return { field: null, value: null };
  }
  const parsed = parsePresenceOrConditions(value);
  if (!parsed) return { field: null, value: null };
  return { field: parsed.field, value: parsed.values.join(", ") };
}

// value(例: STAT.blank?、ORRES.present?)が"接尾辞.blank?"/"接尾辞.present?"の形かどうかを判定する
const PRESENCE_PREDICATE_RE = /^([A-Za-z_][A-Za-z0-9_]*)\.(blank|present)\?$/;
function extractPresencePredicate(validatorKey, value) {
  if (!["validate_presence_if", "validate_formula_if"].includes(validatorKey) || value == null) {
    return { suffix: null, type: null };
  }
  const m = value.match(PRESENCE_PREDICATE_RE);
  if (!m) return { suffix: null, type: null };
  return { suffix: m[1], type: m[2] };
}

// f18<=3のような、自分自身のフィールドに対する単一数値比較(formula)を解釈する
const FORMULA_SINGLE_FIELD_RE = /^f([0-9]+)\s*(<=|>=|==|<|>)\s*(-?[0-9]+(?:\.[0-9]+)?)$/;
function boundTypeFromOperator(operator) {
  if (operator === "<=" || operator === "<") return "max_value";
  if (operator === ">=" || operator === ">") return "min_value";
  if (operator === "==") return "exact_value";
  return null;
}
function computeFormulaSingleField(validatorType, validatorKey, value) {
  if (validatorType !== "formula" || validatorKey !== "validate_formula_if" || value == null) {
    return { refField: null, boundType: null, boundValue: null };
  }
  const m = value.match(FORMULA_SINGLE_FIELD_RE);
  if (!m) return { refField: null, boundType: null, boundValue: null };
  return { refField: `field${m[1]}`, boundType: boundTypeFromOperator(m[2]), boundValue: Number(m[3]) };
}

// f350<=f59のような、同一シート内の別フィールドとの比較(formula)を解釈する
const FORMULA_FIELD_REF_RE = /^f([0-9]+)\s*(<=|>=|==|<|>)\s*f([0-9]+)$/;
function computeFormulaFieldRef(validatorType, validatorKey, value) {
  if (validatorType !== "formula" || validatorKey !== "validate_formula_if" || value == null) {
    return { refField: null, boundType: null };
  }
  const m = value.match(FORMULA_FIELD_REF_RE);
  if (!m) return { refField: null, boundType: null };
  return { refField: `field${m[3]}`, boundType: boundTypeFromOperator(m[2]) };
}

// age(f2, f3)>=20 && age(f2, f3)<=80のような年齢条件を解釈する
const AGE_CONDITION_RE = /^age\(\s*f([0-9]+)\s*,\s*f([0-9]+)\s*\)\s*(>=|<=)\s*([0-9]+(?:\.[0-9]+)?)$/;
function parseAgeCondition(value) {
  const clauses = value.split("&&").map((s) => s.trim());
  const matches = clauses.map((c) => c.match(AGE_CONDITION_RE));
  if (matches.some((m) => m === null)) return null;
  const fieldPairs = [...new Set(matches.map((m) => `${m[1]}-${m[2]}`))];
  if (fieldPairs.length !== 1) return null;
  const geClause = matches.find((m) => m[3] === ">=");
  const leClause = matches.find((m) => m[3] === "<=");
  return {
    field1: `field${matches[0][1]}`,
    field2: `field${matches[0][2]}`,
    minAge: geClause ? Number(geClause[4]) : null,
    maxAge: leClause ? Number(leClause[4]) : null,
  };
}
function extractAgeCondition(fieldName, validatorKey, value) {
  if (validatorKey !== "validate_formula_if" || value == null) return { ageRefField: null, minAge: null, maxAge: null };
  const parsed = parseAgeCondition(value);
  if (!parsed) return { ageRefField: null, minAge: null, maxAge: null };
  let otherField = null;
  if (parsed.field1 === fieldName) otherField = parsed.field2;
  else if (parsed.field2 === fieldName) otherField = parsed.field1;
  if (!otherField) return { ageRefField: null, minAge: null, maxAge: null };
  return { ageRefField: otherField, minAge: parsed.minAge, maxAge: parsed.maxAge };
}

// value(例: (STAT.blank?) && (ref('registration', 4)=='F'))を"&&"で分割し、各断片の括弧を除いた文字列にする
function parseAndClauses(value) {
  if (!value.includes("&&")) return null;
  return value.split("&&").map((s) => s.trim().replace(/^\(/, "").replace(/\)$/, "").trim());
}

const CROSS_REF_RE = /^ref\('([^']+)'\s*,\s*([0-9]+)\)\s*==\s*(?:'([^']*)'|"([^"]*)"|([^\s|&()]+))$/;
const AND_FIELD_REF_RE = /^(?:field|f)([0-9]+)\s*==\s*(?:'([^']*)'|"([^"]*)"|([^\s|&()]+))$/;
// fieldN==fieldM(または fN==fM)のように、値側もフィールド参照の形。AND_FIELD_REF_REは値側を
// 「引用符無しの単純リテラル」として扱うため、これを先に判定しておかないと"fN"という文字列そのものと
// 一致するかのリテラル条件として誤解釈されてしまう(この形は「別フィールドの値をそのままコピーする」
// という意味で、extractFieldEqualityRef()による別のcopy機構で扱われるため、ここでは何もしない扱いにする)
const AND_FIELD_EQUALITY_RE = /^(?:field|f)([0-9]+)\s*==\s*(?:field|f)([0-9]+)$/;

// parseAndClauses()で分割した1断片を種類ごとに分類する(Rのclassify_and_clause()に対応)
//   - "fieldN==fieldM"のような、値側もフィールド参照のコピー条件
//     -> kind="field_equality_skip"(別のcopy機構(extractFieldEqualityRef)で扱われるため、
//        ここではpresenceConditions行を作らない)
//   - "fieldN==2 || fieldN==3 || ..."のような、断片自体が同一フィールドに対するOR条件
//     (例: (field22==2||field22==3||...) && (field348=='CR'||field348=='PR'))
//     -> kind="field_ref_or"(parsePresenceOrConditions()を再利用し、複数のexpected_valueを持つ)
function classifyAndClause(clause) {
  const mPred = clause.match(PRESENCE_PREDICATE_RE);
  if (mPred) return { kind: "predicate", suffix: mPred[1], predicateType: mPred[2] };
  const mRef = clause.match(CROSS_REF_RE);
  if (mRef) return { kind: "cross_ref", refAliasName: mRef[1], refField: `field${mRef[2]}`, value: mRef[3] ?? mRef[4] ?? mRef[5] };
  const mEq = clause.match(AND_FIELD_EQUALITY_RE);
  if (mEq) return { kind: "field_equality_skip" };
  const mField = clause.match(AND_FIELD_REF_RE);
  if (mField) return { kind: "field_ref", refField: `field${mField[1]}`, value: mField[2] ?? mField[3] ?? mField[4] };
  const orParsed = parsePresenceOrConditions(clause);
  if (orParsed) return { kind: "field_ref_or", refField: orParsed.field, values: orParsed.values };
  return null;
}

function parseAndConditions(value) {
  const clauses = parseAndClauses(value);
  if (!clauses) return null;
  const parsed = clauses.map(classifyAndClause);
  if (parsed.some((p) => p === null)) return null;
  return parsed;
}

// valueのどこかにref('sheet_alias', N)=='値'という断片が含まれていれば、その最初の1箇所を抽出する
// (Rのextract_cross_ref_clause()に対応、&&を伴わない単独ref()や、他が複雑な式のフォールバック用)
const CROSS_REF_LOOSE_RE = /ref\('([^']+)'\s*,\s*([0-9]+)\)\s*==\s*(?:'([^']*)'|"([^"]*)"|([^\s|&()]+))/;
function extractCrossRefClause(value) {
  const m = value.match(CROSS_REF_LOOSE_RE);
  if (!m) return null;
  return { refAliasName: m[1], refField: `field${m[2]}`, value: m[3] ?? m[4] ?? m[5] };
}

// valueのどこかにfieldN==fieldM(またはfN==fM)というフィールド同士の等号比較が含まれていれば、
// field_name自身ではないもう一方のフィールド名を返す(Rのextract_field_equality_ref()に対応)
const FIELD_EQUALITY_LOOSE_RE = /(?:field|f)([0-9]+)\s*==\s*(?:field|f)([0-9]+)/;
function extractFieldEqualityRef(fieldName, value) {
  const m = value.match(FIELD_EQUALITY_LOOSE_RE);
  if (!m) return null;
  const field1 = `field${m[1]}`;
  const field2 = `field${m[2]}`;
  if (field1 === fieldName) return field2;
  if (field2 === fieldName) return field1;
  return null;
}

// sheetsから、resolved_value/bound_type/ref_field/numeric_value/presence_ref_field/presence_ref_value/
// presence_predicate_suffix/presence_predicate_type/age_ref_field/min_age/max_ageまで付与した
// validator_tableを組み立てる(Rのbuild_validator_table()に対応)
function buildValidatorTable(sheets) {
  const raw = buildValidatorTableRaw(sheets);
  return raw.map((row) => {
    const { validator_type: validatorType, validator_key: validatorKey, value, field_name: fieldName } = row;

    const formulaSingle = computeFormulaSingleField(validatorType, validatorKey, value);
    const formulaFieldRef = computeFormulaFieldRef(validatorType, validatorKey, value);
    const boundType = classifyBoundType(validatorType, validatorKey) ?? formulaSingle.boundType ?? formulaFieldRef.boundType;
    const refField = extractRefField(validatorType, value) ?? extractDateCrossRefField(validatorType, value) ?? formulaSingle.refField ?? formulaFieldRef.refField;
    const dateRefAliasName = extractDateCrossRefAlias(validatorType, value);
    const numericValue = extractNumericValue(validatorType, value) ?? formulaSingle.boundValue ?? null;

    const presence = computePresenceRefFieldAndValue(validatorType, validatorKey, value);
    const predicate = extractPresencePredicate(validatorKey, value);
    const age = extractAgeCondition(fieldName, validatorKey, value);

    return {
      ...row,
      bound_type: boundType,
      ref_field: refField,
      date_ref_alias_name: dateRefAliasName,
      numeric_value: numericValue,
      presence_ref_field: presence.field,
      presence_ref_value: presence.value,
      presence_predicate_suffix: predicate.suffix,
      presence_predicate_type: predicate.type,
      age_ref_field: age.ageRefField,
      min_age: age.minAge,
      max_age: age.maxAge,
    };
  });
}

// field_items内のtype=="FieldItem::Reference"な要素を(alias_name, field_name, reference_type, reference_field)の
// 配列にする(Rのbuild_field_reference_table()に対応)
function buildFieldReferenceTable(sheets) {
  const rows = [];
  (sheets || []).forEach((sheet) => {
    (sheet.field_items || []).forEach((item) => {
      if (item.type === "FieldItem::Reference") {
        // reference_fieldは"field48"のような素の名前の場合と、"baseline1.field48"のように
        // 自分自身のalias_name付きの場合がある(EDC仕様側の出力形式の違いによる)。reference_type=="sheet"
        // (同じシート内参照)は必ず自分自身のalias_name内のフィールドを指すため、プレフィックスが
        // 付いていれば取り除いて常に素のフィールド名に正規化する(付いていないと、このあとの
        // buildFieldReferenceCopyConditions()側の突き合わせ(alias_name+素のfield名)が常に失敗し、
        // このフィールドの値コピーが機能しなくなる)
        const ownPrefix = `${sheet.alias_name}.`;
        const referenceField =
          item.reference_field != null && item.reference_field.startsWith(ownPrefix)
            ? item.reference_field.slice(ownPrefix.length)
            : item.reference_field;
        rows.push({
          alias_name: sheet.alias_name,
          field_name: item.name,
          reference_type: item.reference_type,
          reference_field: referenceField,
        });
      }
    });
  });
  return rows;
}

// --- build_generation_constraints.R相当 ---

// dfCdisc((alias_name, field, cdisc_variable, label, prefix, field_type)を含む行の配列。
// cdisc_variable_values.jsのbuildDfCdisc()が返す形)から、(alias_name, field) -> 候補一覧の索引を作る。
// Rは(alias_name,field,cdisc_variable)等を個別にdistinct/left_joinするが、実データでは1つの(alias_name,field)は
// 通常1つの(cdisc_variable,label,prefix,field_type)の組にしか対応しないため、df_cdisc本来の行の組をそのまま
// 候補として保持する(行ごとに完結した組を使うことで、個別joinの組み合わせ爆発を避ける)
function buildFieldLookup(dfCdisc) {
  const map = {};
  dfCdisc.forEach((row) => {
    const key = `${row.alias_name} ${row.field}`;
    if (!map[key]) map[key] = [];
    const exists = map[key].some(
      (t) => t.cdisc_variable === row.cdisc_variable && t.label === row.label && t.prefix === row.prefix && t.field_type === row.field_type
    );
    if (!exists) {
      map[key].push({ cdisc_variable: row.cdisc_variable, label: row.label, prefix: row.prefix, field_type: row.field_type });
    }
  });
  return map;
}
function lookupField(fieldLookup, aliasName, field) {
  if (field == null) return [];
  return fieldLookup[`${aliasName} ${field}`] || [];
}

// validate_presence_ifの単純なfieldN==値(OR可)から、condition_type="equals"のpresence_conditions行を作る。
// 参照先(presence_ref_field)がmeddra型の場合、値はLLT名ではなくLLTコードとの比較を意図しているため、
// ref_cdisc_variableをMedDRAコーディングブロックのコード列(prefixLLTCD)に差し替える
function buildEqualsPresenceConditions(validatorTable, fieldLookup) {
  const seen = new Set();
  const rows = [];
  validatorTable.forEach((vr) => {
    if (vr.presence_ref_field == null) return;
    const key = `${vr.alias_name}|${vr.field_name}|${vr.presence_ref_field}|${vr.presence_ref_value}`;
    if (seen.has(key)) return;
    seen.add(key);

    const ownMatches = lookupField(fieldLookup, vr.alias_name, vr.field_name);
    const refMatches = lookupField(fieldLookup, vr.alias_name, vr.presence_ref_field);
    ownMatches.forEach((own) => {
      refMatches.forEach((ref) => {
        const refCdiscVariable = ref.field_type === "meddra" ? `${ref.prefix}LLTCD` : ref.cdisc_variable;
        if (own.cdisc_variable == null || refCdiscVariable == null) return;
        (vr.presence_ref_value || "")
          .split(",")
          .map((s) => s.trim())
          .forEach((expectedValue) => {
            rows.push({
              cdisc_variable: own.cdisc_variable,
              label: own.label,
              alias_name: vr.alias_name,
              ref_cdisc_variable: refCdiscVariable,
              ref_alias_name: vr.alias_name,
              ref_label: ref.label != null ? ref.label : null,
              expected_value: expectedValue,
              condition_type: "equals",
            });
          });
      });
    });
  });
  return rows;
}

// "接尾辞.blank?"/"接尾辞.present?"形式のvalidate_presence_if/validate_formula_ifから、
// condition_type="equals"(blank)または"not_blank"(present)のpresence_conditions行を作る
function buildPredicatePresenceConditions(validatorTable, fieldLookup) {
  const seen = new Set();
  const rows = [];
  validatorTable.forEach((vr) => {
    if (vr.presence_predicate_suffix == null) return;
    const key = `${vr.alias_name}|${vr.field_name}|${vr.presence_predicate_suffix}|${vr.presence_predicate_type}`;
    if (seen.has(key)) return;
    seen.add(key);
    lookupField(fieldLookup, vr.alias_name, vr.field_name).forEach((own) => {
      if (own.cdisc_variable == null || own.prefix == null) return;
      rows.push({
        cdisc_variable: own.cdisc_variable,
        label: own.label,
        alias_name: vr.alias_name,
        ref_cdisc_variable: `${own.prefix}${vr.presence_predicate_suffix}`,
        ref_alias_name: vr.alias_name,
        ref_label: null,
        expected_value: vr.presence_predicate_type === "blank" ? "" : null,
        condition_type: vr.presence_predicate_type === "blank" ? "equals" : "not_blank",
      });
    });
  });
  return rows;
}

// "&&"で複数条件が組み合わさったvalidate_presence_if/validate_formula_ifを断片ごとに分解し、
// 断片の種類(predicate/cross_ref/field_ref)ごとにpresence_conditions行を作る
function buildAndPresenceConditions(validatorTable, fieldLookup) {
  const rows = [];
  const seen = new Set();
  validatorTable.forEach((vr) => {
    if (!["validate_presence_if", "validate_formula_if"].includes(vr.validator_key)) return;
    if (vr.age_ref_field != null) return;
    const value = vr.value;
    if (value == null || !(value.includes("&&") || value.includes("ref("))) return;
    const dedupKey = `${vr.alias_name}|${vr.field_name}|${value}`;
    if (seen.has(dedupKey)) return;
    seen.add(dedupKey);

    const ownMatches = lookupField(fieldLookup, vr.alias_name, vr.field_name);
    if (ownMatches.length === 0) return;

    let parsed = parseAndConditions(value);
    if (!parsed) {
      const clause = extractCrossRefClause(value);
      if (!clause) return;
      parsed = [{ kind: "cross_ref", refAliasName: clause.refAliasName, refField: clause.refField, value: clause.value }];
    }

    ownMatches.forEach((own) => {
      parsed.forEach((clause) => {
        if (clause.kind === "predicate") {
          if (own.prefix == null) return;
          rows.push({
            cdisc_variable: own.cdisc_variable,
            label: own.label,
            alias_name: vr.alias_name,
            ref_cdisc_variable: `${own.prefix}${clause.suffix}`,
            ref_alias_name: vr.alias_name,
            ref_label: null,
            expected_value: clause.predicateType === "blank" ? "" : null,
            condition_type: clause.predicateType === "blank" ? "equals" : "not_blank",
          });
        } else if (clause.kind === "field_equality_skip") {
          // fieldN==fieldMは別のcopy機構(extractFieldEqualityRef、下記)で扱われるため、
          // ここではpresenceConditions行を作らない(&&の他の断片(OR条件等)の解析は妨げない)
        } else if (clause.kind === "cross_ref") {
          const refMatches = lookupField(fieldLookup, clause.refAliasName, clause.refField);
          refMatches.forEach((ref) => {
            const refCdiscVariable = ref.field_type === "meddra" ? `${ref.prefix}LLTCD` : ref.cdisc_variable;
            if (refCdiscVariable == null) return;
            rows.push({
              cdisc_variable: own.cdisc_variable,
              label: own.label,
              alias_name: vr.alias_name,
              ref_cdisc_variable: refCdiscVariable,
              ref_alias_name: clause.refAliasName,
              ref_label: ref.label != null ? ref.label : null,
              expected_value: clause.value,
              condition_type: "equals",
            });
          });
        } else if (clause.kind === "field_ref") {
          const refMatches = lookupField(fieldLookup, vr.alias_name, clause.refField);
          refMatches.forEach((ref) => {
            const refCdiscVariable = ref.field_type === "meddra" ? `${ref.prefix}LLTCD` : ref.cdisc_variable;
            if (refCdiscVariable == null || refCdiscVariable === own.cdisc_variable) return;
            rows.push({
              cdisc_variable: own.cdisc_variable,
              label: own.label,
              alias_name: vr.alias_name,
              ref_cdisc_variable: refCdiscVariable,
              ref_alias_name: vr.alias_name,
              ref_label: ref.label != null ? ref.label : null,
              expected_value: clause.value,
              condition_type: "equals",
            });
          });
        } else if (clause.kind === "field_ref_or") {
          // 断片自体がOR条件(例: field22==2||field22==3||...)の場合、同じref_cdisc_variableに対する
          // 複数のexpected_value行を作る(applyPresenceConditions側でref_cdisc_variableごとに
          // グルーピングされ、値の集合に対するOR判定になる。異なるref_cdisc_variable同士はAND)
          const refMatches = lookupField(fieldLookup, vr.alias_name, clause.refField);
          refMatches.forEach((ref) => {
            const refCdiscVariable = ref.field_type === "meddra" ? `${ref.prefix}LLTCD` : ref.cdisc_variable;
            if (refCdiscVariable == null || refCdiscVariable === own.cdisc_variable) return;
            clause.values.forEach((expectedValue) => {
              rows.push({
                cdisc_variable: own.cdisc_variable,
                label: own.label,
                alias_name: vr.alias_name,
                ref_cdisc_variable: refCdiscVariable,
                ref_alias_name: vr.alias_name,
                ref_label: ref.label != null ? ref.label : null,
                expected_value: expectedValue,
                condition_type: "equals",
              });
            });
          });
        }
      });
    });
  });
  return rows;
}

// validator_type=="formula"の式にリテラルを伴わないfieldN==fieldMが含まれる場合、
// condition_type="copy"のpresence_conditions行を作る(例: FAOBJがAETERMをコピーする)
function buildFieldEqualityCopyConditions(validatorTable, fieldLookup) {
  const rows = [];
  const seen = new Set();
  validatorTable.forEach((vr) => {
    if (vr.validator_type !== "formula" || vr.value == null) return;
    const dedupKey = `${vr.alias_name}|${vr.field_name}|${vr.value}`;
    if (seen.has(dedupKey)) return;
    seen.add(dedupKey);
    const copyRefField = extractFieldEqualityRef(vr.field_name, vr.value);
    if (!copyRefField) return;
    const ownMatches = lookupField(fieldLookup, vr.alias_name, vr.field_name);
    const refMatches = lookupField(fieldLookup, vr.alias_name, copyRefField);
    ownMatches.forEach((own) => {
      refMatches.forEach((ref) => {
        if (own.cdisc_variable == null || ref.cdisc_variable == null) return;
        rows.push({
          cdisc_variable: own.cdisc_variable,
          label: own.label,
          alias_name: vr.alias_name,
          ref_cdisc_variable: ref.cdisc_variable,
          ref_alias_name: vr.alias_name,
          ref_label: ref.label != null ? ref.label : null,
          expected_value: null,
          condition_type: "copy",
        });
      });
    });
  });
  return rows;
}

// FieldItem::Reference(reference_type=="sheet")から、condition_type="copy"のpresence_conditions行を作る
function buildFieldReferenceCopyConditions(fieldReferenceTable, fieldLookup) {
  const rows = [];
  fieldReferenceTable.forEach((fr) => {
    if (fr.reference_type !== "sheet") return;
    const ownMatches = lookupField(fieldLookup, fr.alias_name, fr.field_name);
    const refMatches = lookupField(fieldLookup, fr.alias_name, fr.reference_field);
    ownMatches.forEach((own) => {
      refMatches.forEach((ref) => {
        if (own.cdisc_variable == null || ref.cdisc_variable == null) return;
        rows.push({
          cdisc_variable: own.cdisc_variable,
          label: own.label,
          alias_name: fr.alias_name,
          ref_cdisc_variable: ref.cdisc_variable,
          ref_alias_name: fr.alias_name,
          ref_label: ref.label != null ? ref.label : null,
          expected_value: null,
          condition_type: "copy",
        });
      });
    });
  });
  return rows;
}

// validator_type=="presence"を持つ(alias_name, label, cdisc_variable)の一覧を抽出する。
// 同じcdisc_variable名が複数のalias_name/labelに定義されている場合(例: MHTERMが"主診断"(必須)と
// "再発診断"(非必須、複数label)の両方に使われる)があるため、cdisc_variable名だけでなく
// alias_name・label単位で必須かどうかを判定できるようにする
// (Rのbuild_generation_constraints.Rのrequired_var_instancesに対応)
function buildRequiredVarInstances(validatorTable, fieldLookup) {
  const seenField = new Set();
  const seenInstance = new Set();
  const instances = [];
  validatorTable.forEach((vr) => {
    if (vr.validator_type !== "presence") return;
    const fieldKey = `${vr.alias_name}|${vr.field_name}`;
    if (seenField.has(fieldKey)) return;
    seenField.add(fieldKey);
    lookupField(fieldLookup, vr.alias_name, vr.field_name).forEach((own) => {
      if (own.cdisc_variable == null) return;
      const instanceKey = `${vr.alias_name}|${own.label}|${own.cdisc_variable}`;
      if (seenInstance.has(instanceKey)) return;
      seenInstance.add(instanceKey);
      instances.push({ alias_name: vr.alias_name, label: own.label, cdisc_variable: own.cdisc_variable });
    });
  });
  return instances;
}

// 後方互換用: cdisc_variable名だけでunique化したフラット版(段階的に置き換え中)
function buildRequiredVars(requiredVarInstances) {
  return [...new Set(requiredVarInstances.map((r) => r.cdisc_variable))];
}

// bound_type(min_value/max_value)を持つ行から、cdisc_variableごとの数値範囲(より厳しい方を採用)を作る
function buildNumericBounds(validatorTable, fieldLookup) {
  const perVar = {};
  const seen = new Set();
  validatorTable.forEach((vr) => {
    if (vr.bound_type == null || vr.numeric_value == null) return;
    if (vr.bound_type !== "min_value" && vr.bound_type !== "max_value") return;
    const key = `${vr.alias_name}|${vr.field_name}|${vr.bound_type}|${vr.numeric_value}`;
    if (seen.has(key)) return;
    seen.add(key);
    lookupField(fieldLookup, vr.alias_name, vr.field_name).forEach((own) => {
      if (own.cdisc_variable == null) return;
      if (!perVar[own.cdisc_variable]) perVar[own.cdisc_variable] = { mins: [], maxs: [] };
      if (vr.bound_type === "min_value") perVar[own.cdisc_variable].mins.push(vr.numeric_value);
      else perVar[own.cdisc_variable].maxs.push(vr.numeric_value);
    });
  });
  const result = {};
  Object.keys(perVar).forEach((v) => {
    const { mins, maxs } = perVar[v];
    result[v] = {
      min_value: mins.length > 0 ? Math.max(...mins) : null,
      max_value: maxs.length > 0 ? Math.min(...maxs) : null,
    };
  });
  return result;
}

// numericBoundsはcdisc_variable単位に集約されるため、LBORRESのように同じcdisc_variable名を
// 多数のTESTCD別フィールドが共有するケースでは使えない(全フィールドのmin/maxが「厳しい方」で
// 一律にまとまってしまう)。buildDateRefBoundsと同じく(alias_name, label, cdisc_variable)単位で
// 集約せず個別に保持したバージョンを別途用意する(LB/TR/VSのORRES生成で使う)(Rのfield_numeric_boundsに対応)
function buildFieldNumericBounds(validatorTable, fieldLookup) {
  const perGroup = {};
  const seen = new Set();
  validatorTable.forEach((vr) => {
    if (vr.bound_type == null || vr.numeric_value == null) return;
    if (vr.bound_type !== "min_value" && vr.bound_type !== "max_value") return;
    const key = `${vr.alias_name}|${vr.field_name}|${vr.bound_type}|${vr.numeric_value}`;
    if (seen.has(key)) return;
    seen.add(key);
    lookupField(fieldLookup, vr.alias_name, vr.field_name).forEach((own) => {
      if (own.cdisc_variable == null) return;
      const groupKey = `${vr.alias_name}|${own.label}|${own.cdisc_variable}`;
      if (!perGroup[groupKey]) {
        perGroup[groupKey] = { alias_name: vr.alias_name, label: own.label != null ? own.label : null, cdisc_variable: own.cdisc_variable, mins: [], maxs: [] };
      }
      if (vr.bound_type === "min_value") perGroup[groupKey].mins.push(vr.numeric_value);
      else perGroup[groupKey].maxs.push(vr.numeric_value);
    });
  });
  return Object.values(perGroup)
    .map((g) => ({
      alias_name: g.alias_name,
      label: g.label,
      cdisc_variable: g.cdisc_variable,
      min_value: g.mins.length > 0 ? Math.max(...g.mins) : null,
      max_value: g.maxs.length > 0 ? Math.min(...g.maxs) : null,
    }))
    .filter((r) => r.min_value != null || r.max_value != null);
}

// formulaでフィールド同士を比較している行(例: f350<=f59)から、(cdisc_variable, ref_cdisc_variable, bound_type)を作る
function buildFieldRefBounds(validatorTable, fieldLookup) {
  const rows = [];
  const seen = new Set();
  validatorTable.forEach((vr) => {
    if (vr.validator_type !== "formula") return;
    if (vr.bound_type == null || vr.ref_field == null) return;
    if (vr.ref_field === vr.field_name) return;
    const key = `${vr.alias_name}|${vr.field_name}|${vr.ref_field}|${vr.bound_type}`;
    if (seen.has(key)) return;
    seen.add(key);
    const ownMatches = lookupField(fieldLookup, vr.alias_name, vr.field_name);
    const refMatches = lookupField(fieldLookup, vr.alias_name, vr.ref_field);
    ownMatches.forEach((own) => {
      refMatches.forEach((ref) => {
        if (own.cdisc_variable == null || ref.cdisc_variable == null) return;
        rows.push({ cdisc_variable: own.cdisc_variable, ref_cdisc_variable: ref.cdisc_variable, bound_type: vr.bound_type });
      });
    });
  });
  return rows;
}

// validate_date_after_or_equal_to/validate_date_before_or_equal_toが他フィールド参照(例: "field5")の場合の
// 下限/上限(bound_type="min_date"/"max_date")を、buildFieldRefBoundsと同様にcdisc_variable名に変換した
// テーブルにする。alias_name/label/ref_labelも保持する。ECのような繰り返しブロックでは、同じcdisc_variable名
// (例: ECSTDTC/ECENDTC)が1つのalias内で複数回(投与1回目・2回目...)登場し、「同じlabel内の開始日<=終了日」と
// 「次のlabelの開始日>=前のlabelの終了日」のようにlabelを跨ぐ参照と跨がない参照が混在する。cdisc_variable単位
// まで潰してしまうと(ECSTDTC min_date ECENDTC / ECENDTC min_date ECSTDTCのように)矛盾した規則に見えてしまう
// ため、buildRepeatedDomain側でlabel/ref_labelを見てlabelを跨ぐ参照かどうかを判定できるようにする
// (R版build_generation_constraints.Rのdate_ref_boundsと同じ理由)
function buildDateRefBounds(validatorTable, fieldLookup) {
  const rows = [];
  const seen = new Set();
  validatorTable.forEach((vr) => {
    if (vr.validator_type !== "date") return;
    if (vr.bound_type == null || vr.ref_field == null) return;
    if (vr.ref_field === vr.field_name) return;
    const key = `${vr.alias_name}|${vr.field_name}|${vr.ref_field}|${vr.bound_type}`;
    if (seen.has(key)) return;
    seen.add(key);
    // ref('sheet_alias', N)形式の他シート参照(dateRefAliasName)があればそちらを、無ければ
    // 従来通り自分自身と同じalias_nameを参照先のlookupに使う(Rのref_lookup_alias_nameに対応)
    const refLookupAliasName = vr.date_ref_alias_name != null ? vr.date_ref_alias_name : vr.alias_name;
    const ownMatches = lookupField(fieldLookup, vr.alias_name, vr.field_name);
    const refMatches = lookupField(fieldLookup, refLookupAliasName, vr.ref_field);
    ownMatches.forEach((own) => {
      refMatches.forEach((ref) => {
        if (own.cdisc_variable == null || ref.cdisc_variable == null) return;
        rows.push({
          alias_name: vr.alias_name,
          label: own.label != null ? own.label : null,
          cdisc_variable: own.cdisc_variable,
          ref_alias_name: refLookupAliasName,
          ref_label: ref.label != null ? ref.label : null,
          ref_cdisc_variable: ref.cdisc_variable,
          bound_type: vr.bound_type,
        });
      });
    });
  });
  return rows;
}

// age(fN,fM)>=X && age(fN,fM)<=Yのような年齢条件から、(cdisc_variable, ref_cdisc_variable, min_age, max_age)を作る
function buildAgeBounds(validatorTable, fieldLookup) {
  const rows = [];
  const seen = new Set();
  validatorTable.forEach((vr) => {
    if (vr.age_ref_field == null) return;
    const key = `${vr.alias_name}|${vr.field_name}|${vr.age_ref_field}|${vr.min_age}|${vr.max_age}`;
    if (seen.has(key)) return;
    seen.add(key);
    const ownMatches = lookupField(fieldLookup, vr.alias_name, vr.field_name);
    const refMatches = lookupField(fieldLookup, vr.alias_name, vr.age_ref_field);
    ownMatches.forEach((own) => {
      refMatches.forEach((ref) => {
        if (own.cdisc_variable == null || ref.cdisc_variable == null) return;
        rows.push({
          cdisc_variable: own.cdisc_variable,
          ref_cdisc_variable: ref.cdisc_variable,
          ref_alias_name: vr.alias_name,
          ref_label: ref.label != null ? ref.label : null,
          min_age: vr.min_age,
          max_age: vr.max_age,
        });
      });
    });
  });
  return rows;
}

// cdiscVariableValues(各生成関数にspecとして渡される配列)の各行に、そのalias_name/label/
// cdisc_variableのインスタンスが実際にpresenceバリデータを持つかどうか(isRequired)を付与する。
// requiredVars(cdisc_variable名だけでunique化したフラット版)と違い、同じcdisc_variable名が
// 複数のalias_name/labelに定義されていても、インスタンスごとに正確に必須/非必須を判定できる。
// labelがnull(そのfieldにlabelが無い)の行同士も一致させるため、joinキーは空文字列に揃える
// (Rのload_edc_spec.Rのcdisc_variable_values %>% left_join(...)に対応)
function attachIsRequired(cdiscVariableValues, requiredVarInstances) {
  const requiredSet = new Set(requiredVarInstances.map((r) => `${r.alias_name}|${r.label != null ? r.label : ""}|${r.cdisc_variable}`));
  cdiscVariableValues.forEach((row) => {
    row.is_required = requiredSet.has(`${row.alias_name}|${row.label != null ? row.label : ""}|${row.cdisc_variable}`);
  });
  return cdiscVariableValues;
}

// validatorTable + dfCdisc(+fieldReferenceTable)から、presence_conditions/required_vars/numeric_bounds/
// field_ref_bounds/age_boundsを組み立てて返す(Rのbuild_generation_constraints()に対応)
function buildGenerationConstraints(validatorTable, dfCdisc, fieldReferenceTable) {
  const fieldLookup = buildFieldLookup(dfCdisc);
  let presenceConditions = [
    ...buildEqualsPresenceConditions(validatorTable, fieldLookup),
    ...buildPredicatePresenceConditions(validatorTable, fieldLookup),
    ...buildAndPresenceConditions(validatorTable, fieldLookup),
    ...buildFieldEqualityCopyConditions(validatorTable, fieldLookup),
  ];
  if (fieldReferenceTable && fieldReferenceTable.length > 0) {
    presenceConditions = presenceConditions.concat(buildFieldReferenceCopyConditions(fieldReferenceTable, fieldLookup));
  }
  const requiredVarInstances = buildRequiredVarInstances(validatorTable, fieldLookup);
  return {
    presenceConditions,
    requiredVars: buildRequiredVars(requiredVarInstances),
    requiredVarInstances,
    numericBounds: buildNumericBounds(validatorTable, fieldLookup),
    fieldNumericBounds: buildFieldNumericBounds(validatorTable, fieldLookup),
    fieldRefBounds: buildFieldRefBounds(validatorTable, fieldLookup),
    dateRefBounds: buildDateRefBounds(validatorTable, fieldLookup),
    ageBounds: buildAgeBounds(validatorTable, fieldLookup),
  };
}

// --- apply_presence_conditions相当 ---

// presence_conditionsに基づき、条件を満たさない行のcdisc_variableをnullにする(Rのapply_presence_conditions()に対応)。
// dataがalias_name列を持つ場合、ref_alias_nameがdata自身のalias_nameのいずれかと一致する行だけに絞り込む
// (一致しなければ真に外部の固定参照とみなし全行を対象にする)。dataがlabel列も持つ場合は、同様にlabelでも絞り込む
// (現状DM/AEドメインはlabel列を持たないため、この絞り込みは実質alias_nameのみで機能する)
function applyPresenceConditions(data, presenceConditions, cdiscVariableToPrefix) {
  if (!data || data.length === 0) return data;
  const columns = new Set(Object.keys(data[0]));
  const applicable = presenceConditions.filter((pc) => columns.has(pc.cdisc_variable) && columns.has(pc.ref_cdisc_variable));

  const hasAliasName = columns.has("alias_name");
  const hasLabel = hasAliasName && columns.has("label");
  const dataAliasNames = hasAliasName ? new Set(data.map((r) => r.alias_name)) : new Set();

  // ownAliasName/ownLabelが指定されている場合、cdisc_variable自身のインスタンス(data自身のalias_name・label)
  // でも絞り込む。labelはシートをまたいで重複しうる(例: 別々のシートがどちらも"006"というlabel番号を使う)ため、
  // ownAliasNameも必ず合わせて絞り込むことで、同じlabel番号を使う無関係な別シートの行を誤って巻き込まないようにする
  function targetRowsFor(refAliasName, refLabel, ownLabel, ownAliasName) {
    return data.map((row) => {
      let match;
      if (hasAliasName && refAliasName != null && dataAliasNames.has(refAliasName)) {
        match = row.alias_name === refAliasName;
        if (match && hasLabel && refLabel != null) {
          const labelExistsWithinAlias = data.some((r) => r.alias_name === refAliasName && r.label === refLabel);
          if (labelExistsWithinAlias) match = match && row.label === refLabel;
        }
      } else {
        match = true;
      }
      if (hasAliasName && ownAliasName != null) {
        match = match && row.alias_name === ownAliasName;
      }
      if (hasLabel && ownLabel != null) {
        match = match && row.label === ownLabel;
      }
      return match;
    });
  }

  // copy: 先に適用する(同じcdisc_variableに他のゲーティング条件も併せて存在する場合、
  // 先にコピーしてから後段でNA化できるようにするため)
  const hasUsubjid = columns.has("USUBJID");
  const copySeen = new Set();
  applicable
    .filter((pc) => pc.condition_type === "copy")
    .forEach((pc) => {
      const key = `${pc.cdisc_variable}|${pc.ref_cdisc_variable}|${pc.alias_name}|${pc.label}|${pc.ref_alias_name}|${pc.ref_label}`;
      if (copySeen.has(key)) return;
      copySeen.add(key);
      const targetRows = data.map((r) => {
        let match = true;
        if (hasAliasName && pc.alias_name != null) match = match && r.alias_name === pc.alias_name;
        if (hasLabel && pc.label != null) match = match && r.label === pc.label;
        return match;
      });

      // 参照元がref_cdisc_variable(別prefixの変数、例: TU側のTUDTC)である場合、この関数が呼ばれる前の
      // injectCrossDomainRefs()が既にUSUBJID単位で正しい値をref_cdisc_variable列としてdataに結合済みのため、
      // targetRowsの位置でそのまま読めばよい(ここでさらにalias_name/labelで突き合わせようとすると、
      // ref_label/ref_alias_nameは参照先(別prefix)自身のラベル空間の値であり、data(このprefix自身の行)の
      // alias_name/labelとは無関係な値のため、誤って一致してしまう/一致せず空になるおそれがある)。
      // 一方、参照元が自分自身と同じprefixの場合、同じcdisc_variable列を複数labelブロックが共有しているため、
      // (alias_name, label)が自分自身と一致する場合(例: FAOBJがAETERMをコピーする、同じ行の別フィールドを
      // 参照する)はtargetRowsの値をそのまま読めばよいが、別の(alias_name, label)ブロックを参照する場合
      // (例: SAXISのTRDTCがLDIAMのTRDTCをコピーする)は、コピー元・コピー先が別々の行になるため、
      // 同じ行のインデックスをそのまま使うと自分自身(まだ値が入っていない)を読んでしまう。USUBJIDで
      // 対応付けてから値を引く
      const ownPrefix = cdiscVariableToPrefix ? cdiscVariableToPrefix[pc.cdisc_variable] : null;
      const refPrefix = cdiscVariableToPrefix ? cdiscVariableToPrefix[pc.ref_cdisc_variable] : null;
      const isCrossPrefix = ownPrefix != null && refPrefix != null && ownPrefix !== refPrefix;

      const sameAlias = pc.ref_alias_name == null || (pc.alias_name != null && pc.ref_alias_name === pc.alias_name);
      const sameLabel = pc.ref_label == null || (pc.label != null && pc.ref_label === pc.label);
      const isSameBlock = isCrossPrefix || (sameAlias && sameLabel);

      if (isSameBlock || !hasUsubjid) {
        data.forEach((row, i) => {
          if (targetRows[i]) row[pc.cdisc_variable] = row[pc.ref_cdisc_variable];
        });
      } else {
        const refLookup = new Map();
        data.forEach((r) => {
          let match = true;
          if (hasAliasName && pc.ref_alias_name != null) match = match && r.alias_name === pc.ref_alias_name;
          if (hasLabel && pc.ref_label != null) match = match && r.label === pc.ref_label;
          if (match) refLookup.set(r.USUBJID, r[pc.ref_cdisc_variable]);
        });
        data.forEach((row, i) => {
          if (targetRows[i]) row[pc.cdisc_variable] = refLookup.has(row.USUBJID) ? refLookup.get(row.USUBJID) : null;
        });
      }
    });

  // equals: (cdisc_variable, ref_cdisc_variable, ref_alias_name, ref_label, alias_name, label)でグループ化し、
  // 期待値集合のいずれにも一致しない行をnullにする
  const equalsGroups = new Map();
  applicable
    .filter((pc) => pc.condition_type === "equals")
    .forEach((pc) => {
      const key = `${pc.cdisc_variable}|${pc.ref_cdisc_variable}|${pc.ref_alias_name}|${pc.ref_label}|${pc.alias_name}|${pc.label}`;
      if (!equalsGroups.has(key)) {
        equalsGroups.set(key, {
          cdisc_variable: pc.cdisc_variable,
          ref_cdisc_variable: pc.ref_cdisc_variable,
          ref_alias_name: pc.ref_alias_name,
          ref_label: pc.ref_label,
          alias_name: pc.alias_name,
          label: pc.label,
          expectedValues: new Set(),
        });
      }
      equalsGroups.get(key).expectedValues.add(pc.expected_value);
    });
  equalsGroups.forEach((g) => {
    const targetRows = targetRowsFor(g.ref_alias_name, g.ref_label, g.label, g.alias_name);
    data.forEach((row, i) => {
      if (targetRows[i] && !g.expectedValues.has(row[g.ref_cdisc_variable])) {
        row[g.cdisc_variable] = null;
      }
    });
  });

  // not_blank: ref_cdisc_variableが空白/nullの行をnullにする
  const notBlankSeen = new Set();
  applicable
    .filter((pc) => pc.condition_type === "not_blank")
    .forEach((pc) => {
      const key = `${pc.cdisc_variable}|${pc.ref_cdisc_variable}|${pc.ref_alias_name}|${pc.ref_label}|${pc.alias_name}|${pc.label}`;
      if (notBlankSeen.has(key)) return;
      notBlankSeen.add(key);
      const targetRows = targetRowsFor(pc.ref_alias_name, pc.ref_label, pc.label, pc.alias_name);
      data.forEach((row, i) => {
        const refVal = row[pc.ref_cdisc_variable];
        const isBlank = refVal == null || refVal === "";
        if (targetRows[i] && isBlank) {
          row[pc.cdisc_variable] = null;
        }
      });
    });

  return data;
}

// --- apply_age_date_bounds相当 ---

function daysFromEpoch(dateStr) {
  return Math.floor(new Date(dateStr).getTime() / 86400000);
}
function dateFromDays(days) {
  return new Date(days * 86400000).toISOString().slice(0, 10);
}

// ageBounds(cdisc_variable, ref_cdisc_variable, min_age, max_age)に基づき、cdisc_variable(日付)を
// ref_cdisc_variable(日付、例: BRTHDTC)からの経過年数がmin_age〜max_ageに収まるよう生成し直す
// (片方だけ、あるいは両方無い場合もある)。生成範囲はregistrationStartDate〜今日にも収める。
// ref_cdisc_variableが無効な日付、またはcdisc_variableが既にnull(presence_conditions等で
// ゲーティングされ空欄になった場合を含む)の行は変更しない(Rのapply_age_date_bounds()に対応)
function applyAgeDateBounds(data, ageBounds, registrationStartDate) {
  if (!ageBounds || ageBounds.length === 0 || !data || data.length === 0) return data;
  const columns = new Set(Object.keys(data[0]));
  const applicable = ageBounds.filter((ab) => columns.has(ab.cdisc_variable) && columns.has(ab.ref_cdisc_variable));
  if (applicable.length === 0) return data;

  const regStart = daysFromEpoch(registrationStartDate);
  const today = daysFromEpoch(new Date().toISOString().slice(0, 10));

  applicable.forEach((ab) => {
    const varName = ab.cdisc_variable;
    const refVar = ab.ref_cdisc_variable;
    const minAge = ab.min_age;
    const maxAge = ab.max_age;

    data.forEach((row) => {
      const current = row[varName];
      const refValRaw = row[refVar];
      if (current == null || refValRaw == null) return;
      const refDays = daysFromEpoch(refValRaw);
      if (Number.isNaN(refDays)) return;

      const rawLower = minAge != null ? refDays + Math.round(minAge * 365.25) : regStart;
      const rawUpper = maxAge != null ? refDays + Math.round(maxAge * 365.25) : today;

      let lower = Math.max(rawLower, regStart);
      let upper = Math.min(rawUpper, today);
      // registrationStartDate〜今日でクランプすると逆転してしまう場合(高齢のため年齢条件と
      // 登録期間が両立しない等)は、年齢条件を優先してクランプせずそのまま使う
      if (lower > upper) {
        lower = rawLower;
        upper = rawUpper;
      }
      upper = Math.max(upper, lower);

      const randomDay = Math.floor(lower + rng() * (upper - lower + 1));
      row[varName] = dateFromDays(randomDay);
    });
  });
  return data;
}

// --- apply_field_ref_bounds相当 ---

// fieldRefBounds(cdisc_variable, ref_cdisc_variable, bound_type)に基づき、cdisc_variableの値が
// ref_cdisc_variableの値との大小関係(max_value/min_value/exact_value)を満たさない場合、
// 条件を満たすradio_button選択肢から選び直す。空白("")や、ref_cdisc_variableが数値でない場合は
// 対象外(そのまま)とする(Rのapply_field_ref_bounds()に対応)
function applyFieldRefBounds(data, spec, fieldRefBounds) {
  if (!fieldRefBounds || fieldRefBounds.length === 0 || !data || data.length === 0) return data;
  const columns = new Set(Object.keys(data[0]));
  const applicable = fieldRefBounds.filter((fb) => columns.has(fb.cdisc_variable) && columns.has(fb.ref_cdisc_variable));

  applicable.forEach((fb) => {
    const varName = fb.cdisc_variable;
    const refVar = fb.ref_cdisc_variable;
    const boundType = fb.bound_type;

    const choiceRows = spec.filter((r) => r.cdisc_variable === varName && r.field_type === "radio_button");
    const choices = [...new Set(choiceRows.map((r) => (r.code != null ? r.code : r.default_value)))];

    data.forEach((row) => {
      const current = row[varName];
      if (current == null || current === "") return;
      const refValue = Number(row[refVar]);
      if (Number.isNaN(refValue)) return;

      let valid;
      if (boundType === "max_value") {
        valid = choices.filter((c) => {
          const n = Number(c);
          return !Number.isNaN(n) && n <= refValue;
        });
      } else if (boundType === "min_value") {
        valid = choices.filter((c) => {
          const n = Number(c);
          return !Number.isNaN(n) && n >= refValue;
        });
      } else if (boundType === "exact_value") {
        valid = choices.filter((c) => {
          const n = Number(c);
          return !Number.isNaN(n) && n === refValue;
        });
      } else {
        valid = choices;
      }
      if (valid.length === 0 || valid.includes(current)) return;
      row[varName] = sampleOne(valid);
    });
  });
  return data;
}

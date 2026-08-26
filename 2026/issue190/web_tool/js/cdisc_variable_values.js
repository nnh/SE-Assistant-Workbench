// edc_spec(パース済みJSON)から、cdisc_variable_values(選択肢展開済みの配列)を組み立てる。
// R版のbuild_cdisc_variable_values.Rに対応する

// 1シート分のfield_itemsとcdisc_sheet_configsを結合し、
// (prefix, cdisc_variable, alias_name, label, field_type, default_value, is_invisible, option_name)の配列にする
function buildCdiscSheetConfigTable(sheet) {
  const fieldItems = {};
  (sheet.field_items || []).forEach((item) => {
    fieldItems[item.name] = item;
  });

  const rows = [];
  (sheet.cdisc_sheet_configs || []).forEach((config) => {
    const prefix = config.prefix || "";
    const table = config.table || {};
    Object.keys(table).forEach((fieldName) => {
      const value = table[fieldName];
      if (value == null || String(value).startsWith("_")) return;
      const item = fieldItems[fieldName];
      if (!item) return;
      // prefixがDMの場合、またはvalueがVISITNUM/SPDEVIDの場合は、prefixを付けずそのままcdisc_variable名にする
      // (build_cdisc_variable_values.Rのcase_whenに対応)
      const cdiscVariable = prefix === "DM" || value === "VISITNUM" || value === "SPDEVID" ? value : prefix + value;
      rows.push({
        prefix,
        cdisc_variable: cdiscVariable,
        alias_name: sheet.alias_name,
        field: fieldName,
        label: config.label,
        field_type: item.field_type,
        default_value: item.default_value,
        is_invisible: !!item.is_invisible,
        option_name: item.option_name || null,
      });
    });
  });
  return rows;
}

// edc_specの全シートを対象に、buildCdiscSheetConfigTable()を連結したもの(選択肢展開前のfield単位の生データ)。
// Rのdf_cdisc(build_cdisc_variable_values.R)に対応し、presence_conditions等の制約テーブル構築時に
// (alias_name, field)からcdisc_variable/label/prefix/field_typeを引くのに使う
function buildDfCdisc(edcSpec) {
  const sheets = edcSpec.sheets || [];
  const rows = [];
  sheets.forEach((sheet) => {
    buildCdiscSheetConfigTable(sheet).forEach((row) => rows.push(row));
  });
  return rows;
}

// edc_spec.optionsを(option_name, code, value_name)の配列に展開する(is_usable=falseは除く)
function buildOptionValues(edcSpec) {
  const rows = [];
  (edcSpec.options || []).forEach((opt) => {
    (opt.values || []).forEach((v) => {
      if (v.is_usable === false) return;
      rows.push({
        option_name: opt.name,
        code: v.code,
        value_name: v.name,
      });
    });
  });
  return rows;
}

// cdisc_variable_values本体を組み立てる。option_nameを持つ行(radio_button/check_box等)は、
// 対応する選択肢の数だけ複製し、それぞれにcodeを持たせる(Rのleft_join(options, by=c("option_name","is_invisible"))に相当)。
// R側のoptionsテーブルは常にis_invisible=falseとして扱われるため、フィールド自身がis_invisible=trueの場合は
// (is_invisibleが一致せず結合できないため)選択肢展開されず、code=nullの1行のままになる。
// この非表示フィールドの挙動もRと合わせて再現する
function buildCdiscVariableValues(edcSpec) {
  const sheets = edcSpec.sheets || [];
  const optionValues = buildOptionValues(edcSpec);
  const optionsByName = {};
  optionValues.forEach((row) => {
    if (!optionsByName[row.option_name]) optionsByName[row.option_name] = [];
    optionsByName[row.option_name].push(row);
  });

  const cdiscVariableValues = [];
  sheets.forEach((sheet) => {
    buildCdiscSheetConfigTable(sheet).forEach((row) => {
      const opts = row.option_name && !row.is_invisible ? optionsByName[row.option_name] : null;
      if (opts && opts.length > 0) {
        opts.forEach((opt) => {
          cdiscVariableValues.push({ ...row, code: opt.code });
        });
      } else {
        cdiscVariableValues.push({ ...row, code: null });
      }
    });
  });
  return cdiscVariableValues;
}

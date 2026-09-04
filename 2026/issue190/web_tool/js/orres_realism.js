// LB/TR/VSのORRES(検査結果値)を、EDC仕様の数値バリデーション(min/max)に基づいたそれらしい数値に
// 置き換える。R版のlb_reference_ranges.R・tr_orres_values.R・vs_orres_values.R・
// build_domain_common.Rのapply_orres_populators()に対応する

function randomUniform(min, max) {
  return min + rng() * (max - min);
}

// fieldNumericBounds(alias_name, label単位のcdisc_variable別min/max。generation_constraints.js参照)を、
// testcdVar(例: LBTESTCD)の値をキーにした対応表に変換する。testcdVarは(alias_name, label)ごとに
// 1つの固定値(defaultValue)を持つradio_button項目であるため、これをブリッジとして使うことで、
// alias_name/label情報が失われた最終出力後のデータ(populateLbOrres等)からでもtestcd値だけで
// 対応するmin/maxを引けるようにする(LB/TR/VSのORRES生成で共通して使う)(Rのbuild_testcd_numeric_boundsに対応)
function buildTestcdNumericBounds(cdiscVariableValues, fieldNumericBounds, testcdVar, orresVar) {
  const testcdMap = new Map();
  cdiscVariableValues.forEach((r) => {
    if (r.cdisc_variable !== testcdVar || r.default_value == null) return;
    testcdMap.set(`${r.alias_name}|${r.label}`, r.default_value);
  });
  const result = new Map();
  (fieldNumericBounds || []).forEach((r) => {
    if (r.cdisc_variable !== orresVar) return;
    const testcd = testcdMap.get(`${r.alias_name}|${r.label}`);
    if (testcd == null) return;
    if (!result.has(testcd)) result.set(testcd, { min_value: r.min_value, max_value: r.max_value });
  });
  return result;
}

// testcdごとに、testcdBounds(buildTestcdNumericBounds()の結果)にある範囲内でランダムな数値を
// 生成する。バリデーション(min/max)が定義されていないtestcd(testcdBoundsに無い)は0〜100の
// ランダムな整数にする(未知のtestcd・バリデーション未定義の既知testcdの両方をこれでカバーする)。
// 範囲の片方だけ定義されている場合、無い方はこのフォールバックと同じ0(下限)・100(上限)を使う
// (Rのgenerate_orres_valueに対応)
function generateOrresValue(testcd, testcdBounds) {
  const bound = testcdBounds.get(testcd);
  if (bound == null) {
    return Math.floor(randomUniform(0, 101));
  }
  const min = bound.min_value != null ? bound.min_value : 0;
  const max = bound.max_value != null ? bound.max_value : 100;
  return Math.round(randomUniform(min, max) * 100) / 100;
}

// LBTESTCD/LBORRESが両方ある場合のみ、EDC仕様の数値バリデーション(min/max)に基づいてLBORRESを
// それらしい数値に置き換える。バリデーションが定義されていないLBTESTCD(未知のTESTCD含む)は
// generateOrresValue()側で0〜100のランダムな整数になる。LBORRESが既にnull(NOT DONE等の
// presence_conditionsで空白化された)の行は上書きしない(Rのpopulate_lb_orres()に対応)
function populateLbOrres(lb, cdiscVariableValues, fieldNumericBounds) {
  if (!lb[0] || !("LBTESTCD" in lb[0]) || !("LBORRES" in lb[0])) return lb;
  const testcdBounds = buildTestcdNumericBounds(cdiscVariableValues, fieldNumericBounds, "LBTESTCD", "LBORRES");
  lb.forEach((row) => {
    if (row.LBORRES == null) return;
    row.LBORRES = String(generateOrresValue(row.LBTESTCD, testcdBounds));
  });
  return lb;
}

// TRTESTCD/TRORRESが両方ある場合のみ、EDC仕様の数値バリデーション(min/max)に基づいてTRORRESを
// それらしい数値に置き換える。バリデーションが定義されていないTRTESTCD(未知のTESTCD含む)は
// generateOrresValue()側で0〜100のランダムな整数になる。TRORRESが既にnull(presence_conditionsで
// 空白化された)の行は上書きしない(Rのpopulate_tr_orres()に対応)
function populateTrOrres(tr, cdiscVariableValues, fieldNumericBounds) {
  if (!tr[0] || !("TRTESTCD" in tr[0]) || !("TRORRES" in tr[0])) return tr;
  const testcdBounds = buildTestcdNumericBounds(cdiscVariableValues, fieldNumericBounds, "TRTESTCD", "TRORRES");
  tr.forEach((row) => {
    if (row.TRORRES == null) return;
    row.TRORRES = String(generateOrresValue(row.TRTESTCD, testcdBounds));
  });
  return tr;
}

// VSTESTCD/VSORRESが両方ある場合のみ、EDC仕様の数値バリデーション(min/max)に基づいてVSORRESを
// それらしい数値に置き換える。バリデーションが定義されていないVSTESTCD(未知のTESTCD含む)は
// generateOrresValue()側で0〜100のランダムな整数になる。VSORRESが既にnull(presence_conditionsで
// 空白化された)の行は上書きしない(Rのpopulate_vs_orres()に対応)
function populateVsOrres(vs, cdiscVariableValues, fieldNumericBounds) {
  if (!vs[0] || !("VSTESTCD" in vs[0]) || !("VSORRES" in vs[0])) return vs;
  const testcdBounds = buildTestcdNumericBounds(cdiscVariableValues, fieldNumericBounds, "VSTESTCD", "VSORRES");
  vs.forEach((row) => {
    if (row.VSORRES == null) return;
    row.VSORRES = String(generateOrresValue(row.VSTESTCD, testcdBounds));
  });
  return vs;
}

// otherDomains(prefixをキーにしたオブジェクト)のうち、populators(prefix -> populate関数)に
// 該当するドメインだけ、対応するpopulate関数を適用する(Rのapply_orres_populators()に対応)
function applyOrresPopulators(otherDomains, populators) {
  Object.keys(populators).forEach((domainName) => {
    if (domainName in otherDomains) {
      otherDomains[domainName] = populators[domainName](otherDomains[domainName]);
    }
  });
  return otherDomains;
}

// LB/TR/VSのORRES(検査結果値)を、基準範囲・条件に基づいたそれらしい数値に置き換える。
// R版のlb_reference_ranges.R・tr_orres_values.R・vs_orres_values.R・
// build_domain_common.Rのapply_orres_populators()に対応する

function randomUniform(min, max) {
  return min + Math.random() * (max - min);
}

// LBTESTCDごとの基準範囲(成人一般・概算値)。ダミーデータ生成用の目安であり、実臨床の判定には使わない。
// 新しい検査項目を追加したい場合は、この表に行を足すだけでよい(コード側の変更は不要)
const LB_REFERENCE_RANGES = [
  { LBTESTCD: "HGB", unit: "g/dL", min_value: 11.5, max_value: 16.5 },
  { LBTESTCD: "PLAT", unit: "10^3/uL", min_value: 150, max_value: 350 },
  { LBTESTCD: "LYM", unit: "%", min_value: 20, max_value: 40 },
  { LBTESTCD: "LDH", unit: "U/L", min_value: 120, max_value: 245 },
  { LBTESTCD: "B2MICG", unit: "mg/L", min_value: 0.8, max_value: 2.2 },
  { LBTESTCD: "NEUT", unit: "%", min_value: 40, max_value: 70 },
  { LBTESTCD: "WBC", unit: "10^3/uL", min_value: 3.3, max_value: 8.6 },
  { LBTESTCD: "RBC", unit: "10^6/uL", min_value: 3.8, max_value: 5.5 },
  { LBTESTCD: "PROT", unit: "g/dL", min_value: 6.5, max_value: 8.0 },
  { LBTESTCD: "ALB", unit: "g/dL", min_value: 3.8, max_value: 5.2 },
  { LBTESTCD: "BILI", unit: "mg/dL", min_value: 0.3, max_value: 1.2 },
  { LBTESTCD: "AST", unit: "U/L", min_value: 13, max_value: 30 },
  { LBTESTCD: "ALT", unit: "U/L", min_value: 7, max_value: 42 },
  { LBTESTCD: "ALP", unit: "U/L", min_value: 38, max_value: 113 },
  { LBTESTCD: "GGT", unit: "U/L", min_value: 10, max_value: 50 },
  { LBTESTCD: "UREAN", unit: "mg/dL", min_value: 8, max_value: 20 },
  { LBTESTCD: "CREAT", unit: "mg/dL", min_value: 0.4, max_value: 1.2 },
  { LBTESTCD: "SODIUM", unit: "mmol/L", min_value: 138, max_value: 145 },
  { LBTESTCD: "K", unit: "mmol/L", min_value: 3.6, max_value: 4.8 },
  { LBTESTCD: "CA", unit: "mg/dL", min_value: 8.5, max_value: 10.2 },
  { LBTESTCD: "PHOS", unit: "mg/dL", min_value: 2.5, max_value: 4.5 },
  { LBTESTCD: "CRP", unit: "mg/dL", min_value: 0, max_value: 0.3 },
  { LBTESTCD: "IL2SR", unit: "U/mL", min_value: 122, max_value: 496 },
  { LBTESTCD: "INR", unit: "", min_value: 0.9, max_value: 1.1 },
  { LBTESTCD: "APTT", unit: "sec", min_value: 25, max_value: 40 },
  { LBTESTCD: "DDIMER", unit: "ug/mL", min_value: 0, max_value: 1.0 },
  { LBTESTCD: "FIBRINO", unit: "mg/dL", min_value: 200, max_value: 400 },
  { LBTESTCD: "FDP", unit: "ug/mL", min_value: 0, max_value: 5 },
  { LBTESTCD: "HCT", unit: "%", min_value: 34, max_value: 50 },
  { LBTESTCD: "CL", unit: "mmol/L", min_value: 98, max_value: 108 },
  { LBTESTCD: "CEA", unit: "ng/mL", min_value: 0, max_value: 5.0 },
  { LBTESTCD: "CA19_9AG", unit: "U/mL", min_value: 0, max_value: 37 },
  { LBTESTCD: "GLUC", unit: "mg/dL", min_value: 70, max_value: 109 },
  { LBTESTCD: "HBA1C", unit: "%", min_value: 4.6, max_value: 6.2 },
  { LBTESTCD: "CHOL", unit: "mg/dL", min_value: 130, max_value: 219 },
  { LBTESTCD: "TRIG", unit: "mg/dL", min_value: 30, max_value: 149 },
  { LBTESTCD: "CYURIAC", unit: "mg/dL", min_value: 2.5, max_value: 8.0 },
  { LBTESTCD: "BLASTLE", unit: "%", min_value: 0, max_value: 5 },
  { LBTESTCD: "MYBLALE", unit: "%", min_value: 0, max_value: 5 },
  { LBTESTCD: "DNAINDEX", unit: "", min_value: 0.9, max_value: 1.1 },
  { LBTESTCD: "NEUTLE", unit: "%", min_value: 40, max_value: 70 },
  { LBTESTCD: "LYMLE", unit: "%", min_value: 20, max_value: 40 },
  { LBTESTCD: "MONOLE", unit: "%", min_value: 2, max_value: 10 },
  { LBTESTCD: "EOSLE", unit: "%", min_value: 0, max_value: 6 },
  { LBTESTCD: "BASOLE", unit: "%", min_value: 0, max_value: 2 },
  { LBTESTCD: "PBTCCE", unit: "%", min_value: 0, max_value: 100 },
];

// lbtestcdごとに、基準範囲内をベースにランダムな数値を生成する。outOfRangeProbの確率で
// 範囲をやや外れた値(異常値)も混ぜることで、全部正常値になる不自然さを避ける
// (Rのgenerate_lab_value()に対応)
function generateLabValue(lbtestcd, referenceRanges, outOfRangeProb = 0.15) {
  const bounds = referenceRanges.find((r) => r.LBTESTCD === lbtestcd);
  if (!bounds) return null;
  const inRange = randomUniform(bounds.min_value, bounds.max_value);
  const rangeWidth = bounds.max_value - bounds.min_value;
  const outLow = randomUniform(bounds.min_value - rangeWidth * 0.3, bounds.min_value);
  const outHigh = randomUniform(bounds.max_value, bounds.max_value + rangeWidth * 0.3);
  const outValue = Math.random() < 0.5 ? outLow : outHigh;
  const isOut = Math.random() < outOfRangeProb;
  let value = isOut ? outValue : inRange;
  // %(パーセント)の項目は0〜100を超えられないため、異常値側にクランプする
  if (bounds.unit === "%") {
    value = Math.min(Math.max(value, 0), 100);
  }
  return Math.round(value * 100) / 100;
}

// LBTESTCD/LBORRESが両方ある場合のみ、参照範囲にある検査項目のLBORRESをそれらしい数値に置き換える。
// 参照範囲に無い項目(PBTCCEなど)はそのまま(populateGenericDummyFields由来のDUMMY)にしておく。
// LBORRESが既にnull(NOT DONE等のpresence_conditionsで空白化された)の行は上書きしない
// (Rのpopulate_lb_orres()に対応)
function populateLbOrres(lb, referenceRanges = LB_REFERENCE_RANGES) {
  if (!lb[0] || !("LBTESTCD" in lb[0]) || !("LBORRES" in lb[0])) return lb;
  const codes = new Set(referenceRanges.map((r) => r.LBTESTCD));
  lb.forEach((row) => {
    if (row.LBORRES == null || !codes.has(row.LBTESTCD)) return;
    row.LBORRES = String(generateLabValue(row.LBTESTCD, referenceRanges));
  });
  return lb;
}

// TRTESTCDごとの数値範囲(mm、概算値)。ダミーデータ生成用の目安
const TR_DIAMETER_RANGES = [
  { TRTESTCD: "LDIAM", min_value: 10, max_value: 150 },
  { TRTESTCD: "SAXIS", min_value: 10, max_value: 80 },
];

// TRTESTCDがLDIAM/SAXISの場合のみ、TRORRESをその範囲内のそれらしい数値(mm)に置き換える。
// それ以外のTRTESTCDや、TRORRESが既にnull(presence_conditionsで空白化された)の行は変更しない
// (Rのpopulate_tr_orres()に対応)
function populateTrOrres(tr, diameterRanges = TR_DIAMETER_RANGES) {
  if (!tr[0] || !("TRTESTCD" in tr[0]) || !("TRORRES" in tr[0])) return tr;
  tr.forEach((row) => {
    if (row.TRORRES == null) return;
    const bounds = diameterRanges.find((r) => r.TRTESTCD === row.TRTESTCD);
    if (!bounds) return;
    row.TRORRES = String(Math.round(randomUniform(bounds.min_value, bounds.max_value) * 10) / 10);
  });
  return tr;
}

// VSTESTCDごとの基準範囲(成人一般・概算値)。ダミーデータ生成用の目安であり、実臨床の判定には使わない
const VS_REFERENCE_RANGES = [
  { VSTESTCD: "HEIGHT", unit: "cm", min_value: 150, max_value: 180 },
  { VSTESTCD: "WEIGHT", unit: "kg", min_value: 45, max_value: 90 },
  { VSTESTCD: "TEMP", unit: "C", min_value: 36.0, max_value: 37.5 },
  { VSTESTCD: "PULSE", unit: "beats/min", min_value: 60, max_value: 100 },
  { VSTESTCD: "SYSBP", unit: "mmHg", min_value: 100, max_value: 140 },
  { VSTESTCD: "DIABP", unit: "mmHg", min_value: 60, max_value: 90 },
];

// vstestcdごとに、基準範囲内をベースにランダムな数値を生成する。outOfRangeProbの確率で
// 範囲をやや外れた値も混ぜることで、全部同じような値になる不自然さを避ける(Rのgenerate_vs_value()に対応)
function generateVsValue(vstestcd, referenceRanges, outOfRangeProb = 0.1) {
  const bounds = referenceRanges.find((r) => r.VSTESTCD === vstestcd);
  if (!bounds) return null;
  const inRange = randomUniform(bounds.min_value, bounds.max_value);
  const rangeWidth = bounds.max_value - bounds.min_value;
  const outLow = randomUniform(bounds.min_value - rangeWidth * 0.2, bounds.min_value);
  const outHigh = randomUniform(bounds.max_value, bounds.max_value + rangeWidth * 0.2);
  const outValue = Math.random() < 0.5 ? outLow : outHigh;
  const isOut = Math.random() < outOfRangeProb;
  const value = isOut ? outValue : inRange;
  return Math.round(value * 10) / 10;
}

// VSTESTCD/VSORRESが両方ある場合のみ、基準範囲にある検査項目のVSORRESをそれらしい数値に置き換える。
// 基準範囲に無い項目はそのまま(populateGenericDummyFields由来のDUMMY)にしておく。
// VSORRESが既にnull(presence_conditionsで空白化された)の行は上書きしない(Rのpopulate_vs_orres()に対応)
function populateVsOrres(vs, referenceRanges = VS_REFERENCE_RANGES) {
  if (!vs[0] || !("VSTESTCD" in vs[0]) || !("VSORRES" in vs[0])) return vs;
  const codes = new Set(referenceRanges.map((r) => r.VSTESTCD));
  vs.forEach((row) => {
    if (row.VSORRES == null || !codes.has(row.VSTESTCD)) return;
    row.VSORRES = String(generateVsValue(row.VSTESTCD, referenceRanges));
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

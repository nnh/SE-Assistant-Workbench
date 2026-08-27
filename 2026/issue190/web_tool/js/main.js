// 画面操作の配線: JSONアップロード -> 設定入力 -> 生成 -> プレビュー/ダウンロード

let edcSpec = null;
let cdiscVariableValues = null;
let presenceConditions = null;
let ageBounds = null;
let requiredVars = null;
let numericBounds = null;
let fieldRefBounds = null;
let generatedDm = null;
let generatedAe = null;
let generatedDs = null;
let generatedOtherDomains = null;

const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const fileNameLabel = document.getElementById("file-name");
const configSection = document.getElementById("config-section");
const resultSection = document.getElementById("result-section");
const dictionaryStatus = document.getElementById("dictionary-status");

// MedDRA/WHO Drugのバージョン選択プルダウンを、data/versions.jsの一覧で埋める。
// versions.jsは古い→新しい順に並んでいる前提で、末尾(最新)をデフォルト選択にする
function populateVersionSelect(selectId, kind) {
  const select = document.getElementById(selectId);
  const labels = listDictionaryVersions(kind);
  labels.forEach((label) => {
    const option = document.createElement("option");
    option.value = label;
    option.textContent = label;
    select.appendChild(option);
  });
  if (labels.length > 0) {
    select.value = labels[labels.length - 1];
  }
}
populateVersionSelect("meddra-version", "meddra");
populateVersionSelect("who-drug-version", "who_drug");

function handleFile(file) {
  if (!file.name.toLowerCase().endsWith(".json")) {
    alert("JSONファイルを選択してください。");
    return;
  }
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      edcSpec = JSON.parse(event.target.result);
      cdiscVariableValues = buildCdiscVariableValues(edcSpec);
      const dfCdisc = buildDfCdisc(edcSpec);
      const validatorTable = buildValidatorTable(edcSpec.sheets);
      const fieldReferenceTable = buildFieldReferenceTable(edcSpec.sheets);
      const constraints = buildGenerationConstraints(validatorTable, dfCdisc, fieldReferenceTable);
      presenceConditions = constraints.presenceConditions;
      ageBounds = constraints.ageBounds;
      requiredVars = constraints.requiredVars;
      numericBounds = constraints.numericBounds;
      fieldRefBounds = constraints.fieldRefBounds;
      fileNameLabel.textContent = `読み込み済み: ${file.name}`;
      configSection.style.display = "block";
    } catch (e) {
      alert("JSONの読み込みに失敗しました: " + e.message);
    }
  };
  reader.readAsText(file);
}

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
dropZone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});

document.getElementById("generate-btn").addEventListener("click", async () => {
  const n = parseInt(document.getElementById("registration-n").value, 10);
  const registrationStartDate = document.getElementById("registration-start-date").value;
  const meddraVersion = document.getElementById("meddra-version").value;
  const whoDrugVersion = document.getElementById("who-drug-version").value;

  // MedDRA/WHO Drugはまだ実際のDM生成には使っていないが、選択されたバージョンが
  // 正しく読み込めることをここで確認しておく(辞書を使う項目の移植時にそのまま使う)
  dictionaryStatus.textContent = "辞書を読み込み中...";
  try {
    await loadDictionaryVersion("meddra", meddraVersion);
    await loadDictionaryVersion("who_drug", whoDrugVersion);
    const meddraCount = getDictionaryData("meddra", meddraVersion).length;
    const whoDrugCount = getDictionaryData("who_drug", whoDrugVersion).length;
    dictionaryStatus.textContent = `辞書読み込み済み: MedDRA ${meddraVersion}(${meddraCount}件) / WHO Drug ${whoDrugVersion}(${whoDrugCount}件)`;
  } catch (e) {
    dictionaryStatus.textContent = "辞書の読み込みに失敗しました: " + e.message;
    return;
  }

  const meddraData = getDictionaryData("meddra", meddraVersion);

  const dmResult = buildDmDomain(n, edcSpec.sheets, edcSpec.sheet_groups, ageBounds);
  let dm = populateDmDomain(
    dmResult.dm,
    cdiscVariableValues,
    registrationStartDate,
    meddraData,
    presenceConditions,
    requiredVars,
    numericBounds,
    fieldRefBounds,
    ageBounds
  );
  generatedDm = dm;
  renderPreview(dm, "dm-preview");
  resultSection.style.display = "block";

  const aeN = parseInt(document.getElementById("ae-n").value, 10);
  const aeSpec = cdiscVariableValues.filter((r) => r.prefix === "AE");
  let ae = buildAeDomain(dm, aeN);
  ae = assignAeAliasNames(ae, aeSpec, dmResult.activeSheets);
  ae = populateAeChoiceFields(ae, aeSpec, requiredVars, numericBounds);
  ae = populateAeDateFields(ae, aeSpec, registrationStartDate);
  const meddraSample = sampleMeddraRows(meddraData, ae.length);
  const requiredLltCodes = deriveRequiredLltCodes(presenceConditions);
  injectRequiredLltCodes(meddraSample, meddraData, requiredLltCodes);
  ae = populateAeMeddraFields(ae, aeSpec, meddraData, meddraSample);
  ae = addAeMeddraCodingBlock(ae, meddraSample, "AE");
  ae = populateAeDummyFields(ae, aeSpec);
  ae = applyPresenceConditions(ae, presenceConditions);
  ae = applyFieldRefBounds(ae, aeSpec, fieldRefBounds);
  ae = sortAeDeathLast(ae);
  ae = filterAeDeathDateConsistency(ae);
  ae = finalizeAeDomain(ae, aeSpec);
  generatedAe = ae;
  renderPreview(ae, "ae-preview");

  let ds = buildDsDomain(dm, cdiscVariableValues);
  ds = populateDsDomain(ds, cdiscVariableValues, registrationStartDate, meddraData, presenceConditions, requiredVars, numericBounds, fieldRefBounds);
  const deathDate = buildDeathDateTable(ae);
  ds = finalizeDsDisposition(ds, deathDate, cdiscVariableValues);
  ds = addRandomizationDsRows(ds, dm, registrationStartDate);

  // DM/AE/DS以外のドメイン(CM/MH/EG等)。dsのalias_name/labelは、DDがDSの特定ブロック(例: discon)を
  // 参照する際の突き合わせキーとして使うため、ここではまだ取り除かない
  const activeSheetTable = buildActiveSheetTable(dmResult.activeSheets);
  const multiRecordAliasNames = (edcSpec.sheets || [])
    .filter((s) => s.category === "ae_report" || s.category === "multiple")
    .map((s) => s.alias_name);
  const otherDomains = buildOtherDomains(dm, cdiscVariableValues, registrationStartDate, meddraData, presenceConditions, requiredVars, numericBounds, fieldRefBounds, {
    builtDomains: { DM: dm, AE: ae, DS: ds },
    ageBounds,
    multiRecordAliasNames,
    activeSheetTable,
  });
  // DD(死因)は死亡した被験者のみのレコードにする(DDTEST/DDTESTCDのような固定値の列ではなく、
  // presence_conditionsで条件付けされている列(例: DDORRES)が全てnullの行を除外)
  if (otherDomains.DD) {
    const ddGatedVars = [...new Set(presenceConditions.filter((pc) => pc.cdisc_variable in (otherDomains.DD[0] || {})).map((pc) => pc.cdisc_variable))];
    otherDomains.DD = dropEmptyDomainRows(otherDomains.DD, ddGatedVars);
  }
  generatedOtherDomains = otherDomains;
  renderOtherDomainPreviews(otherDomains);

  // alias_name/labelは他ドメイン生成時の突き合わせキーとして使うためここまで保持していたが、
  // 最終出力には不要なので取り除く(Rのload_edc_spec.Rでの同様の処理に対応)
  ds = ds.map((row) => {
    const { alias_name, label, ...rest } = row;
    return rest;
  });
  generatedDs = ds;
  renderPreview(ds, "ds-preview");
});

function renderPreview(data, containerOrId) {
  const container = typeof containerOrId === "string" ? document.getElementById(containerOrId) : containerOrId;
  if (data.length === 0) {
    container.innerHTML = "<p>データがありません</p>";
    return;
  }
  const columns = Object.keys(data[0]);
  const rowsToShow = data.slice(0, 1);
  let html = "<table><thead><tr>" + columns.map((c) => `<th>${c}</th>`).join("") + "</tr></thead><tbody>";
  rowsToShow.forEach((row) => {
    html += "<tr>" + columns.map((c) => `<td>${row[c] ?? ""}</td>`).join("") + "</tr>";
  });
  html += "</tbody></table>";
  if (data.length > 1) html += `<p>...ほか${data.length - 1}件</p>`;
  container.innerHTML = html;
}

// DM/AE/DS以外の各ドメイン(CM/MH/EG等)のプレビューを、#other-domains-preview配下に
// ドメインごとの見出し+テーブルとして動的に追加する
function renderOtherDomainPreviews(otherDomains) {
  const container = document.getElementById("other-domains-preview");
  container.innerHTML = "";
  Object.keys(otherDomains)
    .sort()
    .forEach((prefix) => {
      const heading = document.createElement("h2");
      heading.textContent = `${prefix}ドメイン プレビュー(先頭1件)`;
      const previewDiv = document.createElement("div");
      container.appendChild(heading);
      container.appendChild(previewDiv);
      renderPreview(otherDomains[prefix], previewDiv);
    });
}

// DM/AE/DS/その他各ドメインのCSVを1つのZIPファイルにまとめてダウンロードする。
// 複数ファイルを連続ダウンロードする方式だと、ドメイン数が増えたとき(将来20件規模になる想定)に
// ブラウザの複数ファイルダウンロード制限に引っかかるため、常に1ファイルのダウンロードにまとめる
document.getElementById("download-all-btn").addEventListener("click", () => {
  if (!generatedDm || generatedDm.length === 0 || !generatedAe || generatedAe.length === 0 || !generatedDs || generatedDs.length === 0) return;
  const files = [
    { name: "DM_dummy.csv", content: toCsv(generatedDm, Object.keys(generatedDm[0])) },
    { name: "AE_dummy.csv", content: toCsv(generatedAe, Object.keys(generatedAe[0])) },
    { name: "DS_dummy.csv", content: toCsv(generatedDs, Object.keys(generatedDs[0])) },
  ];
  Object.keys(generatedOtherDomains || {})
    .sort()
    .forEach((prefix) => {
      const data = generatedOtherDomains[prefix];
      if (!data || data.length === 0) return;
      files.push({ name: `${prefix}_dummy.csv`, content: toCsv(data, Object.keys(data[0])) });
    });
  downloadZip(files, "dummy_data.zip");
});

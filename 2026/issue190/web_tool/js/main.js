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

// MedDRA/WHO Drugのバージョン選択プルダウンをlabelsの一覧で埋める。
// 末尾(最新)をデフォルト選択にする
function populateVersionSelectFromLabels(selectId, labels) {
  const select = document.getElementById(selectId);
  select.innerHTML = "";
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

// データフォルダへのアクセスが許可されていればdata/meddra・data/who_drug配下の実ファイルから、
// 未許可ならdata/versions.jsの一覧から、プルダウンを埋め直す
async function refreshVersionSelects() {
  if (hasDataDirAccess()) {
    const meddraLabels = await listVersionsFromDataDir("meddra");
    const whoDrugLabels = await listVersionsFromDataDir("who_drug");
    populateVersionSelectFromLabels("meddra-version", meddraLabels);
    populateVersionSelectFromLabels("who-drug-version", whoDrugLabels);
  } else {
    populateVersionSelectFromLabels("meddra-version", listDictionaryVersions("meddra"));
    populateVersionSelectFromLabels("who-drug-version", listDictionaryVersions("who_drug"));
  }
}

const grantDataDirBtn = document.getElementById("grant-data-dir-btn");
const dataDirStatus = document.getElementById("data-dir-status");
let dataDirState = "not-set";

function updateDataDirUi() {
  if (dataDirState === "granted") {
    grantDataDirBtn.textContent = "データフォルダへのアクセス: 許可済み(別のフォルダを選び直す)";
    dataDirStatus.textContent = "web_tool/dataフォルダへのアクセスが有効です。バージョン一覧はこのフォルダから取得しています。";
  } else if (dataDirState === "needs-reauth") {
    grantDataDirBtn.textContent = "データフォルダへのアクセスを再許可";
    dataDirStatus.textContent = "以前許可したフォルダへのアクセスが失効しています(ブラウザ再起動後など)。ボタンを押して再許可してください。";
  } else {
    grantDataDirBtn.textContent = "データフォルダ(web_tool/data)へのアクセスを許可";
    dataDirStatus.textContent = "未許可です(未許可でも従来通り動作します。許可すると、バージョン一覧をdataフォルダから自動取得できます)。";
  }
}

grantDataDirBtn.addEventListener("click", async () => {
  try {
    if (dataDirState === "needs-reauth") {
      dataDirState = (await reauthorizeDataDirAccess()) ? "granted" : "needs-reauth";
    } else {
      await requestDataDirAccess();
      dataDirState = "granted";
    }
    updateDataDirUi();
    await refreshVersionSelects();
  } catch (e) {
    dataDirStatus.textContent = "アクセス許可に失敗しました: " + e.message;
  }
});

(async () => {
  dataDirState = await restoreDataDirAccess();
  updateDataDirUi();
  await refreshVersionSelects();
})();

// 辞書バージョンフォルダ(MedDRA/WHO Drug)のドラッグ&ドロップ登録
const dictionaryDropZone = document.getElementById("dictionary-drop-zone");
const dictionaryImportStatus = document.getElementById("dictionary-import-status");

dictionaryDropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dictionaryDropZone.classList.add("drag-over");
});
dictionaryDropZone.addEventListener("dragleave", () => dictionaryDropZone.classList.remove("drag-over"));
dictionaryDropZone.addEventListener("drop", async (e) => {
  e.preventDefault();
  dictionaryDropZone.classList.remove("drag-over");

  if (!hasDataDirAccess()) {
    dictionaryImportStatus.textContent = "先に上の「データフォルダへのアクセスを許可」を行ってください。";
    return;
  }

  const item = e.dataTransfer.items && e.dataTransfer.items[0];
  if (!item || typeof item.getAsFileSystemHandle !== "function") {
    dictionaryImportStatus.textContent = "この操作はお使いのブラウザでは対応していません(Chrome/Edgeでお試しください)。";
    return;
  }

  const droppedHandle = await item.getAsFileSystemHandle();
  if (droppedHandle.kind !== "directory") {
    dictionaryImportStatus.textContent = "フォルダをドロップしてください。";
    return;
  }

  const kind = await detectDictionaryFolderKind(droppedHandle);
  if (kind === null) {
    dictionaryImportStatus.textContent =
      "MedDRA(soc.asc等)にもWHO Drug/IDF(WHODD・IDFサブフォルダ)にも該当しないフォルダのようです。";
    return;
  }
  const dictionaryLabel = kind === "meddra" ? "MedDRA" : "WHO Drug/IDF";
  const buildVersionJsContent = kind === "meddra" ? buildMeddraVersionJsContent : buildWhoDrugVersionJsContent;

  try {
    dictionaryImportStatus.textContent = `${dictionaryLabel}「${droppedHandle.name}」を変換中...`;
    const { version, content, rowCount } = await buildVersionJsContent(droppedHandle);

    if (await dictionaryVersionFileExists(kind, version)) {
      const overwrite = confirm(`${dictionaryLabel}バージョン「${version}」は既に登録済みです。上書きしますか?`);
      if (!overwrite) {
        dictionaryImportStatus.textContent = `キャンセルしました(${dictionaryLabel}「${version}」は上書きしていません)。`;
        return;
      }
    }

    const filename = await writeDictionaryVersionFile(kind, version, content);
    dictionaryImportStatus.textContent = `${dictionaryLabel}「${version}」を登録しました(${rowCount}行, data/${kind}/${filename})。`;
    await refreshVersionSelects();
  } catch (e) {
    dictionaryImportStatus.textContent = `${dictionaryLabel}の取り込みに失敗しました: ` + e.message;
  }
});

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
  const whoDrugIdf = getDictionaryData("who_drug", whoDrugVersion);

  // STUDYIDはEDC仕様JSONのname(試験名)に"_dummy"を付けたものにする。固定のダミー値だと
  // どのJSONから生成したデータか分からなくなるため、生成データを見ただけで試験を判別できるようにする
  const studyid = `${edcSpec.name}_dummy`;
  const dmResult = buildDmDomain(n, edcSpec.sheets, edcSpec.sheet_groups, ageBounds, studyid);
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
  // "ae"シートのように、AE報告と同じフォーム上に他prefix(例: FA)のブロックがある場合、
  // そのフィールドも同じ行に追加する。presence_conditionsが同じ行内で完結するようにするため、
  // applyPresenceConditionsより前に行う
  const linkedResult = populateLinkedBlocks(ae, cdiscVariableValues, "AE", registrationStartDate, meddraData, requiredVars, whoDrugIdf);
  ae = linkedResult.data;
  const linkedSpec = linkedResult.linkedSpec;
  ae = populateAeDummyFields(ae, aeSpec);
  ae = applyPresenceConditions(ae, presenceConditions);
  ae = applyFieldRefBounds(ae, aeSpec, fieldRefBounds);
  ae = sortAeDeathLast(ae);
  ae = filterAeDeathDateConsistency(ae);
  const aeResult = finalizeAeDomain(ae, aeSpec, linkedSpec);
  ae = aeResult.ae;
  const aeLinkedDomains = aeResult.linked;
  generatedAe = ae;
  renderPreview(ae, "ae-preview");

  let ds = buildDsDomain(dm, cdiscVariableValues);
  ds = populateDsDomain(ds, cdiscVariableValues, registrationStartDate, meddraData, presenceConditions, requiredVars, numericBounds, fieldRefBounds);
  const deathDate = buildDeathDateTable(ae);
  ds = finalizeDsDisposition(ds, deathDate, cdiscVariableValues);
  ds = addRandomizationDsRows(ds, dm, registrationStartDate);
  // 中止日判定は、直前に追加したRANDOMIZED行(中止ではない)が混ざらないよう、
  // add_randomization_ds_rows()より後に呼び出す
  const discontinuationDate = buildDiscontinuationDateTable(ds);

  // DM/AE/DS以外のドメイン(CM/MH/EG等)。dsのalias_name/labelは、DDがDSの特定ブロック(例: discon)を
  // 参照する際の突き合わせキーとして使うため、ここではまだ取り除かない
  const activeSheetTable = buildActiveSheetTable(dmResult.activeSheets);
  const multiRecordAliasNames = (edcSpec.sheets || [])
    .filter((s) => s.category === "ae_report" || s.category === "multiple")
    .map((s) => s.alias_name);
  const visitLookup = buildVisitLookup(edcSpec.sheets, edcSpec.visits);
  // ae/sae_reportのように、AE報告と同じフォーム上の他prefixブロック(例: FA)は、
  // 既にpopulateLinkedBlocks側で(AE報告と同じ行として)生成済みのため、
  // buildOtherDomains側では二重生成しないよう該当のprefix/alias_nameを除外する
  const cdiscVariableValuesForOthers = excludeAeLinkedPrefixes(cdiscVariableValues, aeLinkedDomains);
  const otherDomains = buildOtherDomains(dm, cdiscVariableValuesForOthers, registrationStartDate, meddraData, presenceConditions, requiredVars, numericBounds, fieldRefBounds, {
    builtDomains: { DM: dm, AE: ae, DS: ds },
    ageBounds,
    multiRecordAliasNames,
    activeSheetTable,
    whoDrugIdf,
    visitLookup,
    discontinuationDate,
  });
  // DD(死因)は死亡した被験者のみのレコードにする(DDTEST/DDTESTCDのような固定値の列ではなく、
  // presence_conditionsで条件付けされている列(例: DDORRES)が全てnullの行を除外)
  if (otherDomains.DD) {
    const ddGatedVars = [...new Set(presenceConditions.filter((pc) => pc.cdisc_variable in (otherDomains.DD[0] || {})).map((pc) => pc.cdisc_variable))];
    otherDomains.DD = dropEmptyDomainRows(otherDomains.DD, ddGatedVars);
  }
  // AE報告と同じ行として生成したリンク先ブロック(例: FA)を、対応するドメインにマージする
  mergeLinkedDomains(otherDomains, aeLinkedDomains);
  // LB/TR/VSのORRESを、それぞれの基準範囲・条件に基づいたそれらしい数値に置き換える
  applyOrresPopulators(otherDomains, { LB: populateLbOrres, TR: populateTrOrres, VS: populateVsOrres });
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

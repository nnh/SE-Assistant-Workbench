// 画面操作の配線: JSONアップロード -> 設定入力 -> 生成 -> プレビュー/ダウンロード

let edcSpec = null;
let cdiscVariableValues = null;
let generatedDm = null;

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

  const dmResult = buildDmDomain(n, edcSpec.sheets, edcSpec.sheet_groups);
  let dm = populateDmDomain(dmResult.dm, cdiscVariableValues, registrationStartDate);
  generatedDm = dm;
  renderPreview(dm);
  resultSection.style.display = "block";
});

function renderPreview(dm) {
  const container = document.getElementById("dm-preview");
  if (dm.length === 0) {
    container.innerHTML = "<p>データがありません</p>";
    return;
  }
  const columns = Object.keys(dm[0]);
  const rowsToShow = dm.slice(0, 10);
  let html = "<table><thead><tr>" + columns.map((c) => `<th>${c}</th>`).join("") + "</tr></thead><tbody>";
  rowsToShow.forEach((row) => {
    html += "<tr>" + columns.map((c) => `<td>${row[c] ?? ""}</td>`).join("") + "</tr>";
  });
  html += "</tbody></table>";
  if (dm.length > 10) html += `<p>...ほか${dm.length - 10}件</p>`;
  container.innerHTML = html;
}

document.getElementById("download-btn").addEventListener("click", () => {
  if (!generatedDm || generatedDm.length === 0) return;
  const columns = Object.keys(generatedDm[0]);
  const csv = toCsv(generatedDm, columns);
  downloadCsv(csv, "DM_dummy.csv");
});

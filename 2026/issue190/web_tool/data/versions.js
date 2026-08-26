// MedDRA/WHO Drugの利用可能なバージョン一覧(プルダウンの選択肢に使う)。
// r_version/tools/convert_meddra_to_js.R・convert_who_drug_to_js.Rで変換を追加した際は、
// ここにも手動で追記すること。
// { label: 表示名(バージョン名そのもの。window.__meddraVersions/__whoDrugVersionsのキーと一致させる),
//   file: data/meddra または data/who_drug 配下のファイル名(拡張子なし) }
window.__dictionaryVersions = {
  meddra: [
    { label: "26.0", file: "26.0" },
    { label: "28.1", file: "28.1" },
    { label: "29.0", file: "29.0" },
  ],
  who_drug: [
    { label: "2025 Mar 1", file: "2025_Mar_1" },
    { label: "2025 Sep 1", file: "2025_Sep_1" },
  ],
};

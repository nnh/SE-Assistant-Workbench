function getFolder_() {
  const folderId =
    PropertiesService.getScriptProperties().getProperty("folderId");
  const folder = DriveApp.getFolderById(folderId);
  if (!folder) {
    throw new Error("Folder not found");
  }
  return folder;
}

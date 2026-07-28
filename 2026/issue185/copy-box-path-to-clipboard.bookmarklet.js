javascript: (function () {
  var global = window;
  global.COPY_TO_CLIPBOARD = global.COPY_TO_CLIPBOARD || {};

  global.COPY_TO_CLIPBOARD.confirmUrlExistence = function (url) {
    return fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        return response.json();
      })
      .catch((error) => {
        console.log("Fetch failed.", error);
      });
  };

  global.COPY_TO_CLIPBOARD.createTargetFolderPath = function (targetFolderId) {
    return (
      Box.prefetchedData["/app-api/enduserapp/current-user"].preview.appHost +
      "app-api/enduserapp/folder/" +
      targetFolderId
    );
  };

  global.COPY_TO_CLIPBOARD.createTargetFilePath = function (targetFileId) {
    return (
      Box.prefetchedData["/app-api/enduserapp/current-user"].preview.appHost +
      "app-api/enduserapp/item/f_" +
      targetFileId +
      "?format=preview"
    );
  };

  global.COPY_TO_CLIPBOARD.getBoxFolderPath = function (json) {
    return json.folder.path.map((i) => i.name).filter((_, idx) => idx > 0);
  };

  global.COPY_TO_CLIPBOARD.getUrlInfo = function () {
    let a = new String(document.title);
    a.allReplace = function (a) {
      let b = this,
        c;
      for (c in a) b = b.replace(new RegExp(c, "g"), a[c]);
      return b;
    }.bind(a);
    return a.allReplace({ ":": "：", "\\[": "［", "\\]": "］" }) + "\n" + document.URL;
  };

  global.COPY_TO_CLIPBOARD.writeToClipboard = async function (text) {
    window.focus();
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.log("navigator.clipboard.writeText failed. Falling back to execCommand.", error);
      const textarea = document.createElement("textarea");
      textarea.textContent = text;
      const body = document.getElementsByTagName("body")[0];
      body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      body.removeChild(textarea);
    }
  };

  global.COPY_TO_CLIPBOARD.copyTextAndTitle = function () {
    this.writeToClipboard(this.getUrlInfo());
  };

  global.COPY_TO_CLIPBOARD.copyToClipboard = async function () {
    if (!/^.*\.box\.com.*$/.test(document.URL)) {
      console.log("Does not work outside Box web.");
      this.copyTextAndTitle();
      return;
    }

    const fileId = document.URL.split("/").pop().split("?")[0];
    if (!/^\d+$/.test(fileId)) {
      return;
    }

    const isFolder = /folder/.test(document.URL);
    let fileName = null;
    let folderId = fileId;

    if (!isFolder) {
      const jsonFile = await this.confirmUrlExistence(this.createTargetFilePath(fileId));
      if (!jsonFile) {
        console.log("Failed to obtain file information.");
        return;
      }
      fileName = jsonFile.items[0].name;
      folderId = jsonFile.items[0].parentFolderID;
    }

    const jsonFolder = await this.confirmUrlExistence(this.createTargetFolderPath(folderId));
    if (!jsonFolder) {
      console.log("Failed to obtain folder information.");
      return;
    }

    const arrayFolder = this.getBoxFolderPath(jsonFolder);
    const joinFolderName = arrayFolder.join("/");
    const folderAndFileName = fileName !== null ? joinFolderName + "/" + fileName : joinFolderName;
    const boxPathStr = "/Box/" + folderAndFileName + "\n";
    const res = boxPathStr + document.URL;

    await this.writeToClipboard(res);
    console.log(res);
    return;
  };

  global.COPY_TO_CLIPBOARD.copyToClipboard();
})();

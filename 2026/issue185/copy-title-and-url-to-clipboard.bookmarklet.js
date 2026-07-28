javascript: (function () {
  var global = window;
  global.COPY_TO_CLIPBOARD = global.COPY_TO_CLIPBOARD || {};

  global.COPY_TO_CLIPBOARD.getUrlInfo = function () {
    var a = new String(document.title);
    a.allReplace = function (a) {
      var b = this,
        c;
      for (c in a) b = b.replace(new RegExp(c, "g"), a[c]);
      return b;
    }.bind(a);
    return a.allReplace({ ":": "：", "\\[": "［", "\\]": "］" }) + "\n" + document.URL;
  };

  global.COPY_TO_CLIPBOARD.copyToClipboard = function () {
    var a = document.createElement("textarea");
    a.textContent = this.getUrlInfo();
    var d = document.getElementsByTagName("body")[0];
    d.appendChild(a);
    a.select();
    var b = document.execCommand("copy");
    d.removeChild(a);
    return b;
  };

  global.COPY_TO_CLIPBOARD.copyToClipboard();
})();

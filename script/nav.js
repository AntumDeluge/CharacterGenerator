
/****************************************************
 * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
 ****************************************************
 * This software is licensed under the MIT license. *
 * See: LICENSE.txt for details.                    *
 ****************************************************/

"use strict";

import { PreviewGenerator } from "./PreviewGenerator.js";
import { config } from "./config.js";


window.onNavButton = function(href="/") {
  document.location.href = href;
};

window.onDownload = function() {
  // prepare image
  const anchor = document.createElement("a");
  anchor.href = PreviewGenerator.buildPNG();
  anchor.download = "character_sheet.png";
  // simulate click
  anchor.click();
}

const formatLinks = function() {
  for (const anchor of document.getElementsByTagName("a")) {
    if (anchor.id && typeof(config[anchor.id]) !== "undefined") {
      anchor.href = config[anchor.id];
    }
    if (config["desktop"] && anchor.classList.contains("extern")) {
      anchor.onclick = function(evt) {
        evt.preventDefault();
        // open external links in system browser
        Neutralino.os.open(anchor.href);
      }
    }
  }
}

window.onload = function() {
  formatLinks();
}

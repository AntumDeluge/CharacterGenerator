
/****************************************************
 * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
 ****************************************************
 * This software is licensed under the MIT license. *
 * See: LICENSE.txt for details.                    *
 ****************************************************/

"use strict";

import { SpriteGenerator } from "./SpriteGenerator.js";
import { config } from "./config.js";


window.onNavButton = function(href="/") {
  document.location.href = href;
};

window.onDownload = function() {
  // prepare image
  const anchor = document.createElement("a");
  anchor.href = SpriteGenerator.buildPNG();
  anchor.download = "character_sheet.png";
  // simulate click
  anchor.click();
}

const formatLinks = function() {
  for (const element of document.getElementsByClassName("asset-info")) {
    if (element instanceof HTMLAnchorElement) {
      // link to tag for release
      element.href = config["asset-info"];
    }
  }
}

window.onload = function() {
  formatLinks();
}

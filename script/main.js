
/****************************************************
 * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
 ****************************************************
 * This software is licensed under the MIT license. *
 * See: LICENSE.txt for details.                    *
 ****************************************************/

"use strict";

import { LayerManager } from "./LayerManager.js";
import { config } from "./config.js";

window.main = {};


main.init = function() {
  // add version info
  const ver = document.getElementById("version");
  ver.innerText = "Version " + config.version;
  // add link to desktop download
  if (config["web-dist"]) {
    const dl = document.getElementById("desktop-download")
    const anchor = document.createElement("a")
    anchor.href = config["git-repo"] + "/releases/tag/v" + config.version
    anchor.innerText = "get the desktop version"
    dl.appendChild(anchor)
  }

  // initialize the layer manager
  LayerManager.init();
};

window.onload = main.init();


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
    const dl = document.getElementById("desktop-download");
    const dl_button = document.createElement("span");
    dl_button.className = "button";
    dl_button.innerText = "Get Desktop Version";
    dl_button.onclick = function() {
      document.location.href = config["git-repo"] + "/releases/tag/v" + config.version;
    };
    dl.appendChild(dl_button);
  }

  // initialize the layer manager
  LayerManager.init();
};

window.onload = main.init();


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

  // initialize the layer manager
  LayerManager.init();
};

window.onload = main.init();

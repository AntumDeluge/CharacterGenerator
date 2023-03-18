
/****************************************************
 * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
 ****************************************************
 * This software is licensed under the MIT license. *
 * See: LICENSE.txt for details.                    *
 ****************************************************/

"use strict";

import { LayerManager } from "./LayerManager.js";

window.main = {};


main.init = function() {
  console.log("this document is a work-in-progress");
  const tmp = document.createElement("div");
  tmp.innerText = "this document is a work-in-progress";
  document.body.appendChild(tmp);

  // initialize the layer manager
  LayerManager.init();
};

main.onLayerDataLoaded = function() {
};

window.onload = main.init();

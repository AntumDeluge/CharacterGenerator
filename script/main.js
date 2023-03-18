
/****************************************************
 * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
 ****************************************************
 * This software is licensed under the MIT license. *
 * See: LICENSE.txt for details.                    *
 ****************************************************/

"use strict";

import { LayerManager } from "./LayerManager.js";
import { SpriteGenerator } from "./SpriteGenerator.js";

window.main = {};


main.init = function() {
  // initialize the layer manager
  LayerManager.init();
};

main.onSelection = function(data) {
  // DEBUG:
  console.log("generating preview for selection");

  SpriteGenerator.set(data);
  SpriteGenerator.renderPreview();
};

window.onload = main.init();

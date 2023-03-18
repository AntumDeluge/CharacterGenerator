
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
  console.log("this document is a work-in-progress");
  const tmp = document.createElement("div");
  tmp.innerText = "this document is a work-in-progress";
  document.body.appendChild(tmp);

  // initialize the layer manager
  LayerManager.init();
};

main.onLayerDataLoaded = function() {
  // DEBUG:
  console.log("creating proof-of-concept preview");
  SpriteGenerator.set({
    "race": "human_elf",
    "type": "adult",
    "dimensions": {"width": 48, "height": 64},
    "layers": {
      "base": {
        "body": 0,
        "arms": 0,
        "head": 0,
        "ears": 0,
        "eyes": 0
      },
      "outfit": {}
    }
  });
  SpriteGenerator.renderPreview();
};

window.onload = main.init();

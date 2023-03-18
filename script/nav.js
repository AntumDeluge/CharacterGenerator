
/****************************************************
 * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
 ****************************************************
 * This software is licensed under the MIT license. *
 * See: LICENSE.txt for details.                    *
 ****************************************************/

"use strict";

import { SpriteGenerator } from "./SpriteGenerator.js";


window.onDownload = function() {
  // prepare image
  const anchor = document.createElement("a");
  anchor.href = SpriteGenerator.buildPNG();
  anchor.download = "sprite.png";
  // simulate click
  anchor.click();
}

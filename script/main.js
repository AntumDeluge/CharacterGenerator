
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
  // initialize the layer manager
  LayerManager.init();
};

window.onload = main.init();

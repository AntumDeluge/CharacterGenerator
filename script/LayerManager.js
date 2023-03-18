
/****************************************************
 * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
 ****************************************************
 * This software is licensed under the MIT license. *
 * See: LICENSE.txt for details.                    *
 ****************************************************/

"use strict";

import { JSONLoader } from "./JSONLoader.js";


export const LayerManager = {
  initialized: false,
  layers: {},

  init: function() {
    if (this.initialized) {
      console.warn("Tried to re-initialize LayerManager");
      return;
    }
    this.initialized = true;

    JSONLoader.loadFile((data) => {
      this.layers = data;
      main.onLayerDataLoaded();
    }, "/assets/layers.json");
  },

  getLayerData: function() {
    return this.layers;
  }
};


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

  /**
   * Loads layer information from JSON file.
   */
  init: function() {
    if (this.initialized) {
      console.warn("Tried to re-initialize LayerManager");
      return;
    }
    this.initialized = true;

    JSONLoader.loadFile((data) => {
      this.layers = data;
      main.onLayerDataLoaded();
    }, "assets/layers.json");
  },

  /**
   * Retrieves available layer indexes.
   *
   * @param dim
   *   Desired dimensions (available: 24x32, 48x64).
   * @param race
   *   Race identifier (available: human_elf).
   * @param type
   *   Body type (e.g. adult, elder, child).
   * @return
   *   Table of available indexes indexed by layer name.
   */
  getBaseIndexes: function(dim, race, type) {
    let data = this.layers[dim];
    if (typeof(data) === "undefined") {
      alert("Invalid dimensions requested: " + dim);
      return undefined;
    }
    data = data[race];
    if (typeof(data) === "undefined") {
      alert("Invalid race requested: " + race);
      return undefined;
    }
    data = data[type];
    if (typeof(data) === "undefined") {
      alert("Invalid body type requested: " + type);
      return undefined;
    }
    return data;
  }
};

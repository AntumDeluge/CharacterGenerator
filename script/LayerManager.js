
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
      this.onInit();
    }, "assets/layers.json");
  },

  /**
   * Action(s) when layer data is loaded.
   */
  onInit: function() {
    let sel = document.getElementById("select-size");
    const sizes = Object.keys(this.layers);
    if (sizes.length < 1) {
      alert("ERROR: no layer information available");
      return;
    }
    sel.remove(0);
    for (const size of sizes) {
      const opt = document.createElement("option");
      opt.value = size;
      opt.text = size;
      sel.add(opt);
    }
    sel.addEventListener("change", (evt) => {
      this.onSizeChanged();
    });

    document.getElementById("select-race").addEventListener("change", (evt) => {
      this.onRaceChanged();
    });
    document.getElementById("select-type").addEventListener("change", (evt) => {
      this.onBodyTypeChanged();
    });

    for (const layer of this.getLayerNames()) {
      sel = document.getElementById("select-" + layer);
      sel.addEventListener("change", (evt) => {
        this.onLayerChanged();
      });
    }

    // initialize preview with default values
    this.onSizeChanged();
  },

  /**
   * Retrieves usable layer names.
   */
  getLayerNames: function() {
    return ["body", "arms", "head", "ears", "eyes"];
  },

  /**
   * Retrieves an option from cache or creates a new one.
   *
   * @param prefix
   *   Identifier prefix.
   * @param suffix
   *   Identifier suffix.
   * @param text
   *   Alternative text to display.
   * @return
   *   HTMLOptionElement.
   */
  getOption: function(prefix, suffix, text=undefined) {
    const id = "opt-" + prefix + "-" + suffix;
    let opt = document.getElementById(id);
    if (opt == null) {
      opt = document.createElement("option");
      opt.id = id;
      opt.value = suffix;
      if (typeof(text) === "undefined") {
        text = suffix;
      }
      opt.text = text;
    }
    return opt;
  },

  /**
   * Removes all options from a select element.
   *
   * @param sel
   *   Element to be cleared.
   */
  clearSelector: function(sel) {
    for (let idx = sel.length-1; idx >= 0; idx--) {
      sel.remove(idx);
    }
  },

  /**
   * Retrieves selected size.
   */
  getSelectedSize: function() {
    const sel = document.getElementById("select-size");
    return sel.options[sel.selectedIndex].value;
  },

  /**
   * Retrieves selected race.
   */
  getSelectedRace: function() {
    const sel = document.getElementById("select-race");
    return sel.options[sel.selectedIndex].value;
  },

  /**
   * Retrieves selected body type.
   */
  getSelectedBodyType() {
    const sel = document.getElementById("select-type");
    return sel.options[sel.selectedIndex].value;
  },

  /**
   * Action(s) when size is selected.
   */
  onSizeChanged: function() {
    this.setRaces(this.getSelectedSize());
  },

  /**
   * Retrieves available races.
   *
   * @param size
   *   The desired sprite dimensions.
   * @return
   *   List of races.
   */
  getRaces: function(size) {
    return Object.keys(this.layers[size]) || [];
  },

  /**
   * Sets available races for selection.
   *
   * @param size
   *   Selected size.
   */
  setRaces: function(size) {
    const sel = document.getElementById("select-race");
    this.clearSelector(sel);
    for (const race of this.getRaces(size)) {
      const opt = this.getOption("race", race);
      sel.add(opt);
    }
    sel.selectedIndex = "0";
    this.onRaceChanged();
  },

  /**
   * Action(s) when race is selected.
   */
  onRaceChanged: function() {
    const size = this.getSelectedSize();
    const race = this.getSelectedRace();
    this.setBodyTypes(size, race);
  },

  /**
   * Retrieves available body types.
   *
   * @param size
   *   The desired sprite dimensions.
   * @param race
   *   The race name.
   * @return
   *   List of body types.
   */
  getBodyTypes(size, race) {
    return Object.keys(this.layers[size][race]) || [];
  },

  /**
   * Sets available body types for selection.
   *
   * @param size
   *   Selected size.
   * @param race
   *   Selected race.
   */
  setBodyTypes: function(size, race) {
    const sel = document.getElementById("select-type");
    this.clearSelector(sel);
    for (const type of this.getBodyTypes(size, race)) {
      const opt = this.getOption("type", type);
      sel.add(opt);
    }
    sel.selectedIndex = "0";
    this.onBodyTypeChanged();
  },

  /**
   * Action(s) when body type is selected.
   */
  onBodyTypeChanged: function() {
    const size = this.getSelectedSize();
    const race = this.getSelectedRace();
    const type = this.getSelectedBodyType();
    this.setLayers(size, race, type);
  },

  /**
   * Sets values for layer selectors.
   *
   * @param size
   * @param race
   * @param type
   */
  setLayers: function(size, race, type) {
    for (const layer of this.getLayerNames()) {
      const sel = document.getElementById("select-" + layer);
      this.clearSelector(sel);
      const idxCount = this.layers[size][race][type][layer];
      for (let idx = 0; idx < idxCount; idx++) {
        const opt = this.getOption("layer-" + layer, idx, idx + 1);
        sel.add(opt);
      }
      sel.selectedIndex = "0";
    }
    this.onLayerChanged();
  },

  /**
   * Retrieves the selected index for layer.
   *
   * @param layer
   *   The layer name.
   * @return
   *   Selected index.
   */
  getSelectedLayer: function(layer) {
    const sel = document.getElementById("select-" + layer);
    return parseInt(sel.selectedIndex, 10);
  },

  /**
   * Action(s) when layer is selected.
   */
  onLayerChanged: function() {
    const size = this.getSelectedSize();
    const race = this.getSelectedRace(size);
    const type = this.getSelectedBodyType(size, race);

    const layers = {
      "base": {
        "head-rear": this.layers[size][race][type]["head-rear"] || []
      },
      "outfit": {}
    };

    for (const layer of this.getLayerNames()) {
      layers["base"][layer] = this.getSelectedLayer(layer);
    }

    const dim = size.split("x");

    const selected = {
      "dimensions": {"width": parseInt(dim[0], 10), "height": parseInt(dim[1], 10)},
      "race": race,
      "type": type,
      "layers": layers
    };
    main.onSelection(selected);
  },
};

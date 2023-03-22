
/****************************************************
 * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
 ****************************************************
 * This software is licensed under the MIT license. *
 * See: LICENSE.txt for details.                    *
 ****************************************************/

"use strict";

import { JSONLoader } from "./JSONLoader.js";
import { PreviewGenerator } from "./PreviewGenerator.js";


export const LayerManager = {
  initialized: false,
  baseLayers: {},
  outfitLayers: {},

  // labels to show in selector
  labels: {},

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
      for (const size of Object.keys(data)) {
        if (size === "labels") {
          this.labels = data[size];
          continue;
        }
        let tmp = data[size]["base"];
        if (typeof(tmp) !== "undefined" && typeof(tmp["body"]) !== "undefined") {
          const bodytypes = tmp["body"];
          for (const layer of ["head", "ears", "eyes"]) {
            const lcount = tmp[layer] || 0;
            for (const btype of Object.keys(bodytypes)) {
              bodytypes[btype][layer] = lcount;
            }
          }
          this.baseLayers[size] = bodytypes;
        }
        if (typeof(this.baseLayers[size]) !== "undefined"
            && typeof(data[size]["outfit"]) !== "undefined") {
          this.outfitLayers[size] = data[size]["outfit"];
        }
      }
      this.onInit();
    }, "assets/layers.json");
  },

  /**
   * Action(s) when layer data is loaded.
   */
  onInit: function() {
    let sel = document.getElementById("select-size");
    const sizes = Object.keys(this.baseLayers);
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

    document.getElementById("select-type").addEventListener("change", (evt) => {
      this.onBodyTypeChanged();
    });

    for (const layer of [...this.getBaseLayerNames(), ...this.getOutfitLayerNames()]) {
      sel = document.getElementById("select-" + layer);
      sel.addEventListener("change", (evt) => {
        this.onLayerChanged();
      });
    }

    // checkbox for toggling base layers
    for (const layer of this.getBaseLayerNames()) {
      const chk = document.getElementById("show-" + layer)
      // add tooltip
      chk.title = "show " + layer;
      // default to enabled
      chk.checked = true;
      chk.addEventListener("change", (evt) => {
        this.onLayerChanged();
      });
    }

    // checkbox for upscaling
    document.getElementById("upscale").addEventListener("change", (evt) => {
      this.onLayerChanged();
    });

    // initialize preview with default values
    this.onSizeChanged();
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
   * Sets selector options.
   *
   * @param id
   *   Selector string identifier.
   * @param options
   *   List of options to add to selector.
   */
  updateSelector: function(id, options) {
    const sel = document.getElementById("select-" + id);
    this.clearSelector(sel);
    for (const opt of options) {
      sel.add(opt);
    }
  },

  /**
   * Retrieves usable base layer names.
   */
  getBaseLayerNames: function() {
    return ["body", "arms", "head", "eyes", "ears"];
  },

  /**
   * Retrieves usable outfit layer names.
   */
  getOutfitLayerNames: function() {
    return ["shoes", "legs", "torso", "mask", "hair", "hat", "detail"];
  },

  /**
   * Returns a list of base layer names that should be drawn in preview.
   */
  getVisibleBaseLayers: function() {
    const visible = [];
    for (const layer of this.getBaseLayerNames()) {
      if (document.getElementById("show-" + layer).checked) {
        visible.push(layer);
      }
    }
    return visible;
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
   * Retrieves value of a selection.
   *
   * @param id
   *   Selector string identifier.
   * @return
   *   String value of selector index.
   */
  getSelectedValue: function(id) {
    const sel = document.getElementById("select-" + id);
    if (sel.options) {
      const opt = sel.options[sel.selectedIndex];
      if (typeof(opt) !== "undefined") {
        return opt.value;
      }
    }
    return undefined;
  },

  /**
   * Retrieves text of a selection.
   *
   * @param id
   *   Selector string identifier.
   * @return
   *   Text representation of selector index.
   */
  getSelectedText: function(id) {
    const sel = document.getElementById("select-" + id);
    return sel.options[sel.selectedIndex].text;
  },

  /**
   * Updates preview & selector when size is changed.
   */
  onSizeChanged: function() {
    const size = this.getSelectedValue("size");
    // update body types
    const options = [];
    for (const type of Object.keys(this.baseLayers[size])) {
      options.push(this.getOption("type", type));
    }
    this.updateSelector("type", options);
    this.onBodyTypeChanged();
  },

  /**
   * Updates preview & selectors when body type is changed.
   */
  onBodyTypeChanged: function() {
    const size = this.getSelectedValue("size");
    const type = this.getSelectedValue("type");
    for (const layer of this.getBaseLayerNames()) {
      const options = [];
      const indexes = this.baseLayers[size][type][layer] || 0;
      for (let idx = 0; idx < indexes; idx++) {
        const idxActual = idx + 1;
        let label;
        if (typeof(this.labels[layer]) !== "undefined"
            && typeof(this.labels[layer][idxActual]) !== "undefined") {
          label = idxActual + " (" + this.labels[layer][idxActual] + ")";
        }
        options.push(this.getOption(layer, idxActual, label));
      }
      this.updateSelector(layer, options);
    }
    for (const layer of this.getOutfitLayerNames()) {
      const options = [this.getOption(layer, 0, "(none)")]; // first index of outfit layers is empty
      const indexes = this.outfitLayers[size][layer] || 0;
      for (let idx = 0; idx < indexes; idx++) {
        const idxActual = idx + 1;
        let label;
        if (typeof(this.labels[layer]) !== "undefined"
            && typeof(this.labels[layer][idxActual]) !== "undefined") {
          label = idxActual + " (" + this.labels[layer][idxActual] + ")";
        }
        options.push(this.getOption(layer, idxActual, label))
      }
      this.updateSelector(layer, options);
    }
    this.onLayerChanged();
  },

  /**
   * Updates preview when a layer option is changed.
   */
  onLayerChanged: function() {
    const sizeSt = this.getSelectedValue("size");
    const size = sizeSt.split("x");
    const type = this.getSelectedValue("type");

    const data = {
      "size": {"width": size[0], "height": size[1]},
      "type": type,
      "layers": {
        "base": {},
        "outfit": {}
      }
    };

    for (const layer of this.getBaseLayerNames()) {
      data["layers"]["base"][layer] = parseInt(this.getSelectedValue(layer), 10);
    }
    for (const layer of this.getOutfitLayerNames()) {
      data["layers"]["outfit"][layer] = parseInt(this.getSelectedValue(layer), 10);
    }

    PreviewGenerator.set(data, document.getElementById("upscale").checked);
    PreviewGenerator.renderPreview();
  }
};

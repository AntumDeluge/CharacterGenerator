
/****************************************************
 * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
 ****************************************************
 * This software is licensed under the MIT license. *
 * See: LICENSE.txt for details.                    *
 ****************************************************/

"use strict";

import { JSONLoader } from "./JSONLoader.js";
import { PreviewGenerator } from "./PreviewGenerator.js";
import { util } from "./util.js";


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
      message.warn("tried to re-initialize layer manager");
      return;
    }
    this.initialized = true;

    // DEBUG:
    message.debug("initializing layer manager ...");

    // prepare preview generator
    PreviewGenerator.init();

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
      message.error("no layer information available", true);
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

    for (const layer of this.getBaseLayerNames()) {
      sel = document.getElementById("select-" + layer);
      sel.addEventListener("change", (evt) => {
        this.onBaseLayerChanged();
      });

      // checkbox for toggling base layers
      const chk = document.getElementById("show-" + layer)
      // add tooltip
      chk.title = "show " + layer;
      // default to enabled
      chk.checked = true;
      chk.addEventListener("change", (evt) => {
        this.onOutfitLayerChanged();
      });
    }

    for (const layer of this.getOutfitLayerNames()) {
      sel = document.getElementById("select-" + layer);
      sel.addEventListener("change", (evt) => {
        this.onOutfitLayerChanged();
      });
    }

    // checkbox for upscaling
    document.getElementById("upscale").addEventListener("change", (evt) => {
      this.onOutfitLayerChanged();
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
   * Retrieves a selected layer index.
   *
   * @param id
   *   Selector string identifier.
   * @return
   *   Integer index.
   */
  getSelectedIndex: function(id) {
    return parseInt(this.getSelectedValue(id), 10);
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
    const bodyType = this.getSelectedValue("type");
    for (const layer of this.getBaseLayerNames()) {
      const options = [];
      const indexes = this.baseLayers[size][bodyType][layer] || 0;
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

    this.onBaseLayerChanged();
  },

  /**
   * Retrieves a mapping string for layer.
   *
   * @param map
   *   Map to parse.
   * @param idx
   *   Layer index.
   * @param bodyType
   *   Body type layer should be mapped to.
   * @param bodyIdx
   *   Body index layer should be mapped to.
   * @return
   *   String representation of mapping or undefined.
   */
  getBodyMapping: function(map, idx, bodyType, bodyIdx) {
    const key = idx + "-" + bodyType + "-" + bodyIdx;
    // get body type this layer is mapped to
    let bodyMapping = map[key];
    if (bodyMapping === null) {
      // values marked by 'null' should not be mapped
      return undefined;
    }
    if (typeof(bodyMapping) === "undefined") {
      bodyMapping = bodyIdx;
    }
    return bodyType + "-" + util.getIndexString(bodyMapping);
  },

  /**
   * Updates preview & selectors when base layer is changed.
   */
  onBaseLayerChanged: function() {
    const size = this.getSelectedValue("size");
    const bodyType = this.getSelectedText("type");
    const bodyIndex = this.getSelectedIndex("body");
    for (const layer of this.getOutfitLayerNames()) {
      const options = [this.getOption(layer, 0, "(none)")]; // first index of outfit layers is empty

      let indexes = this.outfitLayers[size][layer] || 0;
      let layermap;
      if (typeof(indexes) === "object" && ["shoes", "legs", "torso", "detail"].indexOf(layer) > -1) {
        // body type related layers
        layermap = indexes["bodymap"];
        indexes = indexes["indexes"];

        let errmsg = [];
        if (typeof(indexes) === "undefined") {
          errmsg.push("indexes not defined");
        }
        if (typeof(layermap) === "undefined") {
          errmsg.push("bodymap not defined");
        }
        if (errmsg.length > 0) {
          errmsg.splice(0, 0, "ERROR:");
          errmsg = errmsg.join("\n- ");
          message.error(errmsg, true);
          return;
        }
      }

      for (let idx = 0; idx < indexes; idx++) {
        const idxActual = idx + 1;
        let label;
        if (typeof(this.labels[layer]) !== "undefined"
            && typeof(this.labels[layer][idxActual]) !== "undefined") {
          label = idxActual + " (" + this.labels[layer][idxActual] + ")";
        }
        const opt = this.getOption(layer, idxActual, label);

        if (typeof(layermap) !== "undefined") {
          const mapping = this.getBodyMapping(layermap, idxActual, bodyType, bodyIndex);
          if (!mapping) {
            continue;
          } else {
            opt.bodymap = mapping;
          }
        }
        options.push(opt)
      }

      this.updateSelector(layer, options);
    }

    this.onOutfitLayerChanged();
  },

  /**
   * Updates preview when an outfit layer is changed.
   */
  onOutfitLayerChanged: function() {
    const sizeSt = this.getSelectedValue("size");
    const size = sizeSt.split("x");
    const type = this.getSelectedValue("type");

    const data = {
      "size": {"width": size[0], "height": size[1]},
      "type": type,
      "layers": {
        "base": {},
        "outfit": {},
        "bodymap": {}
      }
    };

    const bodyType = this.getSelectedValue("type");
    const bodyIndex = this.getSelectedIndex("body");
    for (const layer of this.getBaseLayerNames()) {
      data["layers"]["base"][layer] = parseInt(this.getSelectedValue(layer), 10);
    }
    for (const layer of this.getOutfitLayerNames()) {
      const layerIndex = this.getSelectedIndex(layer);
      const opt = this.getOption(layer, layerIndex);
      if (typeof(opt.bodymap) !== "undefined") {
        // pass body mapping to preview generator
        data["layers"]["bodymap"][layer] = opt.bodymap;
      }
      data["layers"]["outfit"][layer] = layerIndex;
    }

    PreviewGenerator.set(data, document.getElementById("upscale").checked);
    PreviewGenerator.renderPreview();
  }
};

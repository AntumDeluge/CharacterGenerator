
/****************************************************
 * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
 ****************************************************
 * This software is licensed under the MIT license. *
 * See: LICENSE.txt for details.                    *
 ****************************************************/

"use strict";

import { LayerManager } from "./LayerManager.js";
import { SpriteStore } from "./SpriteStore.js";
import { util } from "./util.js";


export const PreviewGenerator = {
  initialized: false,

  // main preview canvas & drawing context
  previewCanvas: document.getElementById("preview"),
  previewCtx: undefined,
  // animated preview canvas & drawing context
  animationCanvas: document.getElementById("animated-preview"),
  animationCtx: undefined,
  // horizonal and vertical frame counts
  framesX: 3,
  framesY: 4,
  // if true, previews will by upscaled x2
  upscale: false,

  // selected body type
  body: undefined,

  // selected layer indexes
  layers: {
    base: {},
    outfit: {}
  },


  /**
   * Sets up drawing contexts.
   */
  init: function() {
    if (this.initialized) {
      console.warn("tried to re-initialize preview generator");
      return;
    }
    this.initialized = true;

    // DEBUG:
    console.log("initializing preview generator ...");

    this.previewCtx = this.previewCanvas.getContext("2d");
    this.animationCtx = this.animationCanvas.getContext("2d");
    this.previewCtx.imageSmoothingEnabled = false;
    this.animationCtx.imageSmoothingEnabled = false;
  },

  /**
   * Creates an image resource from preview.
   */
  buildPNG: function() {
    // DEBUG:
    console.log("preparing PNG data ...");

    return this.previewCanvas.toDataURL("image/png");
  },

  /**
   * Sets layer information to be drawn.
   *
   * @param data
   *   Layer information.
   * @param upscale
   *   If true, previews will be upscaled by a factor of 2.
   */
  set: function(data, upscale=false) {
    this.upscale = upscale;
    this.setFrameSize(data.size);
    this.body = data.type;
    this.layers = data.layers;
  },

  /**
   * Sets canvas size according to frame dimensions.
   *
   * @param fsize
   *   Size object representing frame dimensions.
   */
  setFrameSize: function(fsize) {
    // DEBUG:
    console.log("frame dimensions: " + fsize.width + "x" + fsize.height);

    if (this.upscale) {
      fsize.width = fsize.width * 2;
      fsize.height = fsize.height * 2;
    }
    const cwidth = fsize.width * this.framesX;
    this.previewCanvas.width = cwidth;
    this.previewCanvas.height = fsize.height * this.framesY;
    this.animationCanvas.width = cwidth;
    this.animationCanvas.height = fsize.height; // animated preview contains only 1 row
  },

  /**
   * Retrieves dimensions of canvas.
   *
   * @return
   *   Table with 'width' & 'height' attributes.
   */
  getCanvasSize: function() {
    return {width: this.previewCanvas.width, height: this.previewCanvas.height};
  },

  /**
   * Retrieves frame dimensions.
   *
   * @return
   *   Table with 'width' & 'height' attributes.
   */
  getFrameSize: function() {
    const csize = this.getCanvasSize();
    if (this.upscale) {
      csize.width = csize.width / 2;
      csize.height = csize.height / 2;
    }
    return {width: csize.width / this.framesX, height: csize.height / this.framesY};
  },

  /**
   * Renders a layer on the canvas.
   *
   * @param img
   *   Layer to be drawn.
   */
  drawLayer: function(img) {
    if (img.hide) {
      // DEBUG:
      console.log("hidden layer: " + img.src);

      return;
    }

    // DEBUG:
    console.log("visible layer: " + img.src);

    if (img.offset.x != 0) {
      const fsize = this.getFrameSize();
      // slice layer into 4 parts to offset east/west facing frames
      for (let slice = 0; slice < 4; slice++) {
        let offsetX = 0;
        if (slice == 1) {
          offsetX = img.offset.x;
        } else if (slice == 3) {
          offsetX = -img.offset.x;
        }
        let offsetY = img.offset.y;
        let swidth = img.width;
        let sheight = fsize.height;
        if (this.upscale) {
          offsetX *= 2;
          offsetY *= 2;
          swidth *= 2;
          sheight *= 2;
        }

        this.previewCtx.drawImage(img,
            0, slice*fsize.height, img.width, fsize.height,
            offsetX, (slice*sheight)+offsetY, swidth, sheight);
      }
    } else {
      if (this.upscale) {
        this.previewCtx.drawImage(img,
          0, 0,
              img.width, img.height,
          0+(img.offset.x*2), 0+(img.offset.y*2),
              this.previewCanvas.width, this.previewCanvas.height);
      } else {
        this.previewCtx.drawImage(img, 0+img.offset.x, 0+img.offset.y);
      }
    }
  },

  /**
   * Generates preview image.
   */
  renderPreview: function() {
    const fsize = this.getFrameSize();
    const sizeSt = fsize.width + "x" + fsize.height;
    const offset = {
      "head": {
        "child": {x: 0, y: Math.floor(6 * (fsize.height / 64))},
        "dwarf": {x: 0, y: Math.floor(4 * (fsize.height / 64))},
        "elder": {x: Math.floor(4 * (fsize.width / 48)), y: Math.floor(5 * (fsize.height / 64))},
        "tall": {x: 0, y: Math.floor(-5 * (fsize.height / 64))}
      }
    };

    // preserve order that images should be drawn
    const imageLayers = [];
    const visibleBaseLayers = LayerManager.getVisibleBaseLayers();
    const rearIndexes = {}; // unused?
    for (const layer in this.layers.base) {
      const idx = this.layers.base[layer];
      if (layer.endsWith("-rear")) {
        rearIndexes[layer.substring(0, layer.indexOf("-rear"))] = idx;
        continue;
      }
      const img = SpriteStore.getBaseImage(sizeSt, this.body, layer, idx);
      if (["arms", "body"].indexOf(layer) > -1) {
        // unique layers
        img.offset = {x: 0, y: 0};
      } else {
        // common layers
        img.offset = offset["head"][this.body] || {x: 0, y: 0};
      }
      // don't draw layers that should be disabled in prieview
      img.hide = visibleBaseLayers.indexOf(layer) < 0;
      imageLayers.push(img);
    }

    // head layers have a separate "rear" layer
    // these need to be in order of last draw to first draw
    for (const layer of ["ears", "head"]) {
      const img = SpriteStore.getBaseImage(sizeSt, this.body, layer, this.layers.base[layer],
          "rear");
      img.offset = offset["head"][this.body] || {x: 0, y: 0};
      // don't draw layers that should be disabled in prieview
      img.hide = visibleBaseLayers.indexOf(layer) < 0;
      imageLayers.splice(0, 0, img);
    }

    for (const layer in this.layers.outfit) {
      const idx = this.layers.outfit[layer];
      if (idx == 0) {
        // ignore empty layers
        continue;
      }
      const suffix = this.layers.bodymap[layer];

      // DEBUG:
      if (typeof(suffix) !== "undefined") {
        console.log("using bodymap for layer: " + layer);
      }

      const img = SpriteStore.getOutfitImage(sizeSt, layer, idx, suffix);
      if (["hair", "mask", "hat"].indexOf(layer) > -1) {
        // layers on head
        img.offset = offset["head"][this.body] || {x: 0, y: 0};
      } else {
        img.offset = {x: 0, y: 0};
      }
      // all selected outfit layers are drawn
      img.hide = false;
      if (layer === "hair") {
        // draw hair under ears
        imageLayers.splice(5, 0, img);
      } else {
        imageLayers.push(img);
      }
    }

    // detail layer has separate rear layer
    const detailIndex = this.layers.outfit["detail"];
    if (detailIndex > 0) {
      const img = SpriteStore.getOutfitImage(sizeSt, "detail", detailIndex, "rear");
      img.offset = {x: 0, y: 0};
      // detail is bottom-most layer
      imageLayers.splice(0, 0, img);
    }

    const lgroup = LayerGroup(imageLayers);
    lgroup.callback = () => {
      for (const layer of lgroup.layers) {
        this.drawLayer(layer);
      }
    };
  },
};


/**
 * Object representing individual layers of a composite image.
 *
 * @param images
 *   Layers making up the entire image.
 */
const LayerGroup = function(images) {
  const def = {
    layers: images,
    /** Function to execute when layers loading is complete. */
    callback: undefined,

    /**
     * Called when all layer images are loaded.
     */
    onLoaded: function() {
      // DEBUG:
      console.log("layer group loaded");

      if (typeof(this.callback) === "function") {
        this.callback();
      }
    }
  };

  for (const imgOuter of def.layers) {
    imgOuter.onload = function() {
      for (const imgInner of def.layers) {
        if (!imgInner.complete || imgInner.naturalWidth === 0) {
          return;
        }
      }
      // all layers loaded
      def.onLoaded();
    }
    // call onload manually in case image was cached
    imgOuter.onload();
  }

  return def;
};


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
  previewCanvas: document.getElementById("preview"),
  animationCanvas: document.getElementById("animated-preview"),
  framesX: 3, // horizonal frame count
  framesY: 4, // vertical frame count
  upscale: false,

  body: undefined,

  // selected layer indexes
  layers: {
    base: {},
    outfit: {}
  },


  /**
   * Retrieves the 2d drawing context.
   *
   * @return
   *   CanvasRenderingContext2D.
   */
  getContext: function() {
    return this.previewCanvas.getContext("2d");
  },

  /**
   * Creates an image resource from preview.
   */
  buildPNG: function() {
    return this.previewCanvas.toDataURL("image/png");
  },

  /**
   * Sets layer information to be drawn.
   *
   * @param data
   *   Layer information.
   * @param upscale
   */
  set: function(data, upscale=false) {
    this.upscale = upscale;
    this.setFrameSize(data["size"]);
    this.body = data["type"];
    this.layers = data["layers"];
  },

  /**
   * Sets canvas size according to frame dimensions.
   *
   * @param dim
   *   Frame dimensions.
   */
  setFrameSize: function(dim) {
    if (this.upscale) {
      dim["width"] = dim["width"] * 2;
      dim["height"] = dim["height"] * 2;
    }
    this.previewCanvas.width = dim["width"] * this.framesX;
    this.previewCanvas.height = dim["height"] * this.framesY;
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

    const ctx = this.getContext();
    ctx.imageSmoothingEnabled = false;

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

        ctx.drawImage(img,
            0, slice*fsize.height, img.width, fsize.height,
            offsetX, (slice*sheight)+offsetY, swidth, sheight);
      }
    } else {
      if (this.upscale) {
        ctx.drawImage(img, 0, 0, img.width, img.height,
          0+(img.offset.x*2), 0+(img.offset.y*2), this.previewCanvas.width, this.previewCanvas.height);
      } else {
        ctx.drawImage(img, 0+img.offset.x, 0+img.offset.y);
      }
    }
  },

  /**
   * Generates preview image.
   */
  renderPreview: function() {
    const size = this.getFrameSize();
    const sizeSt = size.width + "x" + size.height;

    // DEBUG:
    console.log("frame dimensions: " + sizeSt);

    const offset = {
      "head": {
        "child": {x: 0, y: Math.floor(6 * (size.height / 64))},
        "dwarf": {x: 0, y: Math.floor(4 * (size.height / 64))},
        "elder": {x: Math.floor(4 * (size.width / 48)), y: Math.floor(5 * (size.height / 64))},
        "tall": {x: 0, y: Math.floor(-5 * (size.height / 64))}
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

    // flag to prevent redrawing
    let drawComplete = false;
    for (const img of imageLayers) {
      img.onload = () => {
        if (drawComplete) {
          return;
        }
        let allLoaded = true;
        for (const i2 of imageLayers) {
          if (!i2.complete || i2.naturalWidth === 0) {
            allLoaded = false;
            break;
          }
        }
        if (allLoaded) {
          for (const i2 of imageLayers) {
            this.drawLayer(i2);
          }
          drawComplete = true;
        }
      };
      // call 'onload' manually in case image was cached
      img.onload();
    }
  },

  /**
   * Refreshes canvas for re-drawing.
   */
  clear: function() {
    this.getContext().clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    this.layers = {
      base: {},
      outfit: {}
    };
  }
};

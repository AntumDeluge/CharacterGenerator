
/****************************************************
 * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
 ****************************************************
 * This software is licensed under the MIT license. *
 * See: LICENSE.txt for details.                    *
 ****************************************************/

"use strict";

import { SpriteStore } from "./SpriteStore.js";


export const PreviewGenerator = {
  previewCanvas: document.getElementById("preview"),
  animationCanvas: document.getElementById("animated-preview"),
  framesX: 3, // horizonal frame count
  framesY: 4, // vertical frame count

  race: undefined,
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
   */
  set: function(data) {
    this.setFrameSize(data["size"]);
    this.race = data["race"];
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
    return {width: csize.width / this.framesX, height: csize.height / this.framesY};
  },

  /**
   * Renders a layer on the canvas.
   *
   * @param img
   *   Layer to be drawn.
   */
  drawLayer: function(img) {
    // DEBUG:
    console.log("drawing layer: " + img.src);

    this.getContext().drawImage(img, 0+img.offset.x, 0+img.offset.y);
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
        "child": {x: 0, y: Math.floor(6 * (size.height / 64))}
      }
    };

    // preserve order that images should be drawn
    const imageLayers = [];
    const rearIndexes = {};
    for (const layer in this.layers.base) {
      const idx = this.layers.base[layer];
      if (layer.endsWith("-rear")) {
        rearIndexes[layer.substring(0, layer.indexOf("-rear"))] = idx;
        continue;
      }
      const img = SpriteStore.getBaseImage(sizeSt, this.race, this.body, layer, idx);
      img.offset = {x: 0, y: 0};
      imageLayers.push(img);
    }

    // check for head indexes requiring a "rear" layer
    const headIdx = this.layers.base["head"];
    if (typeof(rearIndexes["head"]) !== "undefined" && rearIndexes["head"].indexOf(headIdx) > -1) {
      const img = SpriteStore.getBaseImage(sizeSt, this.race, this.body, "head", headIdx, "rear");
      img.offset = offset["head"][this.body] || {x: 0, y: 0};
      imageLayers.splice(0, 0, img);
    }

    for (const layer in this.layers.outfit) {
      const idx = this.layers.outfit[layer];
      if (idx == 0) {
        // ignore empty layers
        continue;
      }
      const img = SpriteStore.getOutfitImage(sizeSt, layer, idx);
      if (layer === "hair") {
        img.offset = offset["head"][this.body] || {x: 0, y: 0};
      } else {
        img.offset = {x: 0, y: 0};
      }
      imageLayers.push(img);
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

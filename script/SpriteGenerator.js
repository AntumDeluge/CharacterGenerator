
/****************************************************
 * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
 ****************************************************
 * This software is licensed under the MIT license. *
 * See: LICENSE.txt for details.                    *
 ****************************************************/

"use strict";

import { SpriteStore } from "./SpriteStore.js";


export const SpriteGenerator = {
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
   * Sets layer information to be drawn.
   *
   * @param data
   *   Layer information.
   */
  set: function(data) {
    this.setFrameSize(data["dimensions"]);
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
   * Retrieves frame dimensions in a formatted string.
   *
   * @return
   *   Frame dimensions formatted at 'WIDTHxHEIGHT'.
   */
  getFrameSizeString: function() {
    const fsize = this.getFrameSize();
    return fsize.width + "x" + fsize.height;
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

    this.getContext().drawImage(img, 0, 0);
  },

  /**
   * Generates preview image.
   */
  renderPreview: function() {
    const dim = this.getFrameSizeString();

    // DEBUG:
    console.log("frame dimensions: " + dim);

    // preserve order that images should be drawn
    const imageLayers = [];
    let headIdx = -1;
    for (const layer in this.layers.base) {
      const idx = this.layers.base[layer];
      if (layer.endsWith("-rear")) {
        continue;
      } else if (layer === "head") {
        headIdx = idx;
      }
      imageLayers.push(SpriteStore.getBaseImage(dim, this.race, this.body, layer, idx));
    }

    // check for head indexes requiring a "rear" layer
    if (this.layers.base["head-rear"].indexOf(headIdx) > -1) {
      imageLayers.splice(0, 0,
          SpriteStore.getBaseImage(dim, this.race, this.body, "head", headIdx, "rear"));
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

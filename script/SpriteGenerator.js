
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

    for (const layer in this.layers.base) {
      const img = SpriteStore.getBaseImage(dim, this.race, this.body, layer, this.layers.base[layer]);
      img.onload = () => {
        this.drawLayer(img);
      };
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

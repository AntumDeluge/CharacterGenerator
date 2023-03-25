
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

  // animated preview image element
  animation: undefined,
  // timeout id
  animationId: undefined,
  // animation refresh rate (ms)
  frameDelay: 250,
  // track frame to draw
  frameIdx: 0,
  // time of last frame change
  frameStart: 0,

  // animation debugging
  fps: 30, // draw refresh rate
  fpsActual: 0,
  cycleStart: 0, // time of most recent cycle start
  cycleCount: 0,

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
      message.warn("tried to re-initialize preview generator");
      return;
    }
    this.initialized = true;

    // DEBUG:
    message.debug("initializing preview generator ...");

    this.previewCtx = this.previewCanvas.getContext("2d");
    this.animationCtx = this.animationCanvas.getContext("2d");
    this.previewCtx.imageSmoothingEnabled = false;
    this.animationCtx.imageSmoothingEnabled = false;
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
    this.setFrameSize(Size(data.size.width, data.size.height));
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
    message.debug("frame dimensions: " + fsize.toString());

    if (this.upscale) {
      fsize.scale(2);
    }
    const cwidth = fsize.width * this.framesX;
    this.previewCanvas.width = cwidth;
    this.previewCanvas.height = fsize.height * this.framesY;
    this.animationCanvas.width = cwidth;
    this.animationCanvas.height = fsize.height; // animated preview contains only 1 row
  },

  /**
   * Retrieves frame dimensions.
   *
   * @return
   *   Frame dimenstions table & string representation.
   */
  getFrameSize: function() {
    const csize = this.getCanvasSize();
    if (this.upscale) {
      csize.scale(0.5);
    }
    return Size(csize.width / this.framesX, csize.height / this.framesY);
  },

  /**
   * Retrieves dimensions of canvas.
   *
   * @return
   *   Image dimensions table & string representation.
   */
  getCanvasSize: function() {
    return Size(this.previewCanvas.width, this.previewCanvas.height);
  },

  /**
   * Creates an image resource from preview.
   */
  buildPNG: function() {
    // DEBUG:
    message.debug("preparing PNG data ...");

    return this.previewCanvas.toDataURL("image/png");
  },

  /**
   * Prepares image of 3x3 frames to draw animated preview.
   */
  buildAnimation: function() {
    // DEBUG:
    message.debug("preparing animation ...");

    const preview = new Image();
    preview.src = this.buildPNG();
    preview.onload = () => {
      if (!preview.complete) {
        // DEBUG:
        message.debug("preview.onload() called prematurely");

        return;
      } else {
        // DEBUG:
        message.debug("preview.onload() image ready");
      }

      const fsize = this.getFrameSize();
      if (this.upscale) {
        fsize.scale(2);
      }

      // stage temporary canvas for creating animated preview
      const canvas = document.getElementById("animation-builder");
      canvas.width = fsize.width * 3;
      canvas.height = fsize.height * 3;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;

      // 3 rows each representing a frame with 3 columns for S/N/E facing directions
      const slices = [
        [[1, 2], [1, 0], [1, 1]],
        [[0, 2], [0, 0], [0, 1]],
        [[2, 2], [2, 0], [2, 1]]
      ];

      for (let ridx = 0; ridx < slices.length; ridx++) {
        const rslice = slices[ridx];
        for (let cidx = 0; cidx < rslice.length; cidx++) {
          const cslice = rslice[cidx];
          const soffsetX = cslice[0] * fsize.width;
          const soffsetY = cslice[1] * fsize.height;
          const toffsetX = cidx * fsize.width;
          const toffsetY = ridx * fsize.height;
          ctx.drawImage(preview,
            soffsetX, soffsetY, fsize.width, fsize.height,
            toffsetX, toffsetY, fsize.width, fsize.height
          );
        }
      }

      // TODO: store/retrieve image using cache

      this.animation = new Image();
      this.animation.onload = () => {
        // DEBUG:
        //~ message.debug("animation frames:\n" + this.animation.src);

        // initialize frame draw timestamp
        this.frameStart = Date.now();
        this.cycleStart = this.frameStart;
        this.renderAnimation();
      };
      this.animation.src = canvas.toDataURL("image/png");
    }

    // in case preview was cached
    preview.onload();
  },

  /**
   * Stops animation & clears animated preview.
   */
  removeAnimation: function() {
    // DEBUG:
    message.debug("resetting animation ...");

    if (typeof(this.animationId) !== "undefined") {
      clearTimeout(this.animationId);
    }
    this.animation = undefined;
  },

  /**
   * Draws a frame of the animated preview.
   */
  renderAnimation: function() {
    if (typeof(this.animation) === "undefined") {
      this.buildAnimation();
      return;
    }
    if (!this.animation.complete) {
      // DEBUG:
      message.debug("animation not ready, retrying ...");

      this.animationId = setTimeout(() => {
        this.renderAnimation();
      }, 500);
      return;
    }

    const debugging = debugEnabled();
    const debugMessage = [];

    const timestamp = Date.now();

    let timediff;
    if (debugging) {
      timediff = timestamp - this.frameStart;
      if (timediff >= this.frameDelay) {
        this.frameStart = timestamp;
        this.frameIdx = this.frameIdx < 3 ? this.frameIdx + 1 : 0;
        // refresh canvas before drawing a new frame
        this.animationCtx.clearRect(0, 0, this.animationCanvas.width, this.animationCanvas.height);

        debugMessage.push("frame index: " + this.frameIdx);
        debugMessage.push("draw delay: " + timediff + "ms");
      }
    }

    let drawIdx = this.frameIdx;
    if (drawIdx % 2 == 0) {
      // use first frame for even indexes
      drawIdx = 0;
    } else if (drawIdx == 3) {
      // animation's 4th frame is index 2
      drawIdx = 2;
    }

    const fsize = this.getFrameSize();
    if (this.upscale) {
      fsize.scale(2);
    }
    this.animationCtx.drawImage(this.animation,
      0, drawIdx*fsize.height, this.animationCanvas.width, fsize.height,
      0, 0, this.animationCanvas.width, this.animationCanvas.height
    );

    // debugging
    if (debugging) {
      this.cycleCount++;
      timediff = timestamp - this.cycleStart;
      if (timediff >= 1000) {
        // check frame refresh rate
        debugMessage.push("cycle delay: " + timediff + "ms");
        debugMessage.push("framerate: " + this.cycleCount + "fps");

        this.cycleCount = 0;
        this.cycleStart = Date.now();
      }

      // DEBUG:
      if (debugMessage.length > 0) {
        message.debug(2, debugMessage.join("\n"));
      }
    }

    this.animationId = setTimeout(() => {
      this.renderAnimation();
    }, 1000 / this.fps);
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
      message.debug("hidden layer: " + img.src);

      return;
    }

    // DEBUG:
    message.debug("visible layer: " + img.src);

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
    const sizeSt = fsize.toString();
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
        message.debug("using bodymap for layer: " + layer);
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

    // clear animated preview
    this.removeAnimation();

    const lgroup = LayerGroup(imageLayers);
    lgroup.setCallback(() => {
      for (const layer of lgroup.layers) {
        this.drawLayer(layer);
      }
      // build animation after preview is finished drawing
      this.renderAnimation();
    });
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

    /**
     * Sets callback function & initializes image loading.
     *
     * @param callback
     *   Function to call when image loading is complete.
     */
    setCallback: function(callback) {
      let allLoaded = false;
      for (const imgOuter of this.layers) {
        imgOuter.onload = () => {
          if (allLoaded) {
            return;
          }
          let loaded = true;
          for (const imgInner of this.layers) {
            loaded = loaded && imgInner.complete && imgInner.naturalWidth !== 0;
            if (!loaded) {
              break;
            }
          }
          if (loaded) {
            // all layers loaded
            if (typeof(callback) !== "function") {
              message.error("failed to execute callback on layer group load, not a function: " + typeof(callback));
              return;
            }
            callback();
            allLoaded = true;
          }
        }
        // call onload manually in case image was cached
        imgOuter.onload();
      }
    }
  };

  return def;
};


/**
 * Object representing image dimensions.
 *
 * @param width
 *   Image width in pixels.
 * @param height
 *   Image height in pixels.
 */
const Size = function(width, height) {
  return {
    width: width,
    height: height,

    /**
     * Rescales dimensions.
     *
     * @param factor
     *   Factor to scale by.
     */
    scale: function(factor) {
      this.width = this.width * factor;
      this.height = this.height * factor;
    },

    /**
     * Retrievies dimensions in string representation.
     */
    toString: function() {
      return this.width + "x" + this.height;
    }
  };
};

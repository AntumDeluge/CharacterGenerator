
/****************************************************
 * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
 ****************************************************
 * This software is licensed under the MIT license. *
 * See: LICENSE.txt for details.                    *
 ****************************************************/

"use strict";

import { util } from "./util.js";


export const SpriteStore = {
  cache: {},


  /**
   * Retrieves an image from cache or creates a new one.
   *
   * @param filepath
   *   Path to image to be loaded.
   * @return
   *   HTMLImageElement.
   */
  getImage: function(filepath) {
    return this.getHashedImage(util.joinPath("assets", filepath));
  },

  /**
   * Retrieves an image from cache or creates a new one.
   *
   * @param data
   *   Image data or path to image to be loaded.
   * @return
   *   HTMLImageElement.
   */
  getHashedImage: function(data) {
    const hash = util.stringHash(data);
    if (typeof(this.cache[hash]) !== "undefined") {
      return this.cache[hash];
    }
    const img = new Image();
    img.src = data;
    this.cache[hash] = img;
    return img;
  },

  /**
   * Retrieves a base image layer.
   *
   * @param size
   *   Image dimensions string (e.g. 48x64).
   * @param body
   *   Body type (e.g. adult, elder, child, etc.).
   * @param layer
   *   Layer name (e.g. head, body, eyes, etc.).
   * @param idx
   *   Layer index.
   * @param suffix
   *   Optional suffix to append to filename.
   * @return
   *   HTMLImageElement.
   */
  getBaseImage: function(size, body, layer, idx, suffix=undefined) {
    let filepath;
    if (["arms", "body"].indexOf(layer) > -1) {
      // unique layers
      filepath = util.joinPath(size, "base/body", body, layer, util.getIndexString(idx));
    } else {
      // common layers
      filepath = util.joinPath(size, "base", layer, util.getIndexString(idx));
    }
    if (typeof(suffix) !== "undefined") {
      filepath += "-" + suffix;
    }
    return this.getImage(filepath + ".png");
  },

  /**
   * Retrieves an outfit image layer.
   *
   * @param size
   *   Image dimensions string (e.g. 48x64).
   * @param race
   *   Race identifier (e.g. human_elf, dwarf, etc.).
   * @param body
   *   Body type (e.g. adult, elder, child, etc.).
   * @param layer
   *   Layer name (e.g. torso, legs, hair, etc.).
   * @param idx
   *   Layer index.
   * @param suffix
   *   Optional suffix to append to filename.
   * @return
   *   HTMLImageElement.
   */
  getOutfitImage: function(size, layer, idx, suffix=undefined) {
    let filepath = util.joinPath(size, "outfit", layer, util.getIndexString(idx));
    if (typeof(suffix) !== "undefined") {
      filepath += "-" + suffix;
    }
    return this.getImage(filepath + ".png");
  }
}

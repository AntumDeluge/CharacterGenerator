
/****************************************************
 * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
 ****************************************************
 * This software is licensed under the MIT license. *
 * See: LICENSE.txt for details.                    *
 ****************************************************/

"use strict";


export const SpriteStore = {
  cache: {},

  /**
   * Join path nodes into a single string.
   *
   * @param nodes
   *   List of node strings to be joined.
   * @return
   *   Formatted path string.
   */
  joinPath: function(...nodes) {
    let path = "";
    for (let node of nodes) {
      // trim leading & trailing node delimeters
      node = node.replace(/^\/+|\/+$/g, "").trim();
      if (path.length > 0) {
        path += "/";
      }
      path += node;
    }
    return path;
  },

  /**
   * Formats layer index into a usable string.
   *
   * @param idx
   *   Layer index.
   * @return
   *   Index string prefixed by 0s.
   */
  getIndexString(idx) {
    return idx < 100 ? ("00" + idx).slice(-3) : "" + idx;
  },

  /**
   * Retrieves an image from cache or creates a new one.
   *
   * @param filepath
   *   Path to image to be loaded.
   * @return
   *   HTMLImageElement.
   */
  getImage: function(filepath) {
    if (typeof(this.cache[filepath]) !== "undefined") {
      return this.cache[filepath];
    }
    const img = new Image();
    img.src = this.joinPath("assets", filepath);
    this.cache[filepath] = img;
    return img;
  },

  /**
   * Retrieves a base image layer.
   *
   * @param dim
   *   Image dimensions string (e.g. 48x64).
   * @param race
   *   Race identifier (e.g. human_elf, dwarf, etc.).
   * @param body
   *   Body type (e.g. adult, elder, child, etc.).
   * @param layer
   *   Layer name (e.g. head, body, eyes, etc.).
   * @param idx
   *   Layer index.
   * @return
   *   HTMLImageElement.
   */
  getBaseImage: function(dim, race, body, layer, idx) {
    const filepath = this.joinPath(dim, "base", race, body, layer, this.getIndexString(idx) + ".png");
    return this.getImage(filepath);
  },

  /**
   * Retrieves an outfit image layer.
   *
   * @param dim
   *   Image dimensions string (e.g. 48x64).
   * @param race
   *   Race identifier (e.g. human_elf, dwarf, etc.).
   * @param body
   *   Body type (e.g. adult, elder, child, etc.).
   * @param layer
   *   Layer name (e.g. torso, legs, hair, etc.).
   * @param idx
   *   Layer index.
   * @return
   *   HTMLImageElement.
   */
  getOutfitImage: function(dim, race, body, layer, idx) {
    const filepath = this.joinPath(dim, "outfit", race, body, layer, this.getIndexString(idx) + ".png");
    return this.getImage(filepath);
  }
}

/****************************************************
 * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
 ****************************************************
 * This software is licensed under the MIT license. *
 * See: LICENSE.txt for details.                    *
 ****************************************************/

"use strict";


export const util = {

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
  }
};

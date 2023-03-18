
/****************************************************
 * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
 ****************************************************
 * This software is licensed under the MIT license. *
 * See: LICENSE.txt for details.                    *
 ****************************************************/

"use strict";


export const JSONLoader = {
  /**
   * Loads JSON data from a file.
   *
   * @param callback
   *   Function to call after data is retrieved from response.
   * @param filepath
   *   Path to file to be read.
   * @return
   *   JSON data.
   */
  loadFile: function(callback, filepath) {
    fetch(filepath, {
      method: "GET",
      mode: "cors",
      cache: "default",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      }
    }).then((res) => res.json())
      .then((data) => callback(data));
  }
}

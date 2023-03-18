
/****************************************************
 * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
 ****************************************************
 * This software is licensed under the MIT license. *
 * See: LICENSE.txt for details.                    *
 ****************************************************/

"use strict";


export const JSONLoader = {
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

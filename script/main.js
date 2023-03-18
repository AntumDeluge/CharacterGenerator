
/****************************************************
 * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
 ****************************************************
 * This software is licensed under the MIT license. *
 * See: LICENSE.txt for details.                    *
 ****************************************************/

"use strict";


function main() {
  console.log("this document is a work-in-progress");
  const tmp = document.createElement("div");
  tmp.innerText = "this document is a work-in-progress";
  document.body.appendChild(tmp);
}

window.onload = main;

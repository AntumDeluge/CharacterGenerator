
/****************************************************
 * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
 ****************************************************
 * This software is licensed under the MIT license. *
 * See: LICENSE.txt for details.                    *
 ****************************************************/

"use strict";

const { app, BrowserWindow } = require("electron");


app.whenReady().then(() => {
  const window = new BrowserWindow({
    width: 800,
    height: 600
  });
  window.loadFile("index.html");
});

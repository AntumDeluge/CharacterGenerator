
/****************************************************
 * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
 ****************************************************
 * This software is licensed under the MIT license. *
 * See: LICENSE.txt for details.                    *
 ****************************************************/

"use strict";


const levels = ["info", "warn", "error", "debug"];

const getDebugLevel = function() {
  let dlvl = sessionStorage.getItem("debugging");
  dlvl = dlvl == null ? 0 : parseInt(dlvl, 10);
  return Number.isNaN(dlvl) ? 0 : dlvl;
}

window.debugEnabled = function() {
  return getDebugLevel() > 0;
}

window.message = function(lvl, msg) {
  if (typeof(msg) === "undefined") {
    msg = lvl;
    lvl = "info";
  }
  lvl = lvl.toLowerCase();
  if (lvl === "debug" && !debugEnabled()) {
    return;
  }

  if (levels.indexOf(lvl) < 0) {
    msg = "unknown message level: " + lvl;
    lvl = "error";
  }

  let prefix = "";
  if (lvl !== "info") {
    prefix = lvl.toUpperCase() + ": ";
  }

  let logger;
  switch(lvl) {
    case "error":
      logger = console.error;
      break;
    case "warn":
      logger = console.warn;
      break;
    case "debug":
      logger = console.debug;
      break;
    default:
      logger = console.log;
  }
  logger(prefix + msg);
};

message.info = function(msg) {
  this("info", msg);
};

message.warn = function(msg) {
  this("warn", msg);
};

message.error = function(msg, showAlert) {
  this("error", msg);
  if (showAlert === true) {
    alert("ERROR: " + msg);
  }
};

message.debug = function(dlvl, msg) {
  if (typeof(msg) === "undefined") {
    msg = dlvl;
    dlvl = 1;
  }
  if (getDebugLevel() >= dlvl) {
    this("debug", msg);
  }
};

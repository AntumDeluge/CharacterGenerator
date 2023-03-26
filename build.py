#!/usr/bin/env python

# ****************************************************
# * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
# ****************************************************
# * This software is licensed under the MIT license. *
# * See: LICENSE.txt for details.                    *
# ****************************************************


import codecs, errno, math, os, shutil, subprocess, sys, time

from urllib.error import HTTPError
from zipfile import ZipFile

try:
  import wget
except ModuleNotFoundError:
  print("\ninstalling wget Python module ...")
  subprocess.run(("python", "-m", "pip", "install", "wget"))
  try:
    import wget
  except ModuleNotFoundError:
    print("\nWARNING: could not install 'wget' module, downloads will fail")


options = {
  "commands": ("stage", "electron", "clean")
}


# --- UTILITY FUNCTIONS --- #

def printUsage():
  file_exe = os.path.basename(__file__)
  print("\nUSAGE:\n  {} {}".format(file_exe, "|".join(options["commands"])))

def printWarning(msg):
  print("\nWARNING: " + msg)

def printError(msg):
  print("\nERROR: " + msg)

def exitWithError(msg, code=1, usage=False):
  printError(msg)
  if usage:
    printUsage()
  sys.exit(code)

def readFile(filepath):
  if not os.path.exists(filepath):
    exitWithError("cannot open file for reading, does not exist: {}".format(filepath), errno.ENOENT)
  if os.path.isdir(filepath):
    exitWithError("cannot open file for reading, directory exists: {}".format(filepath), errno.EISDIR)

  fopen = codecs.open(filepath, "r", "utf-8")
  # clean up line delimeters
  content = fopen.read().replace("\r\n", "\n").replace("\r", "\n")
  fopen.close()

  return content

def writeFile(filepath, data):
  if type(data) in (list, tuple):
    # convert data to string
    data = "\n".join(data)

  fopen = codecs.open(filepath, "w", "utf-8")
  fopen.write(data)
  fopen.close()

def getConfig(key, default=None):
  file_conf = os.path.join(os.getcwd(), "build.conf")
  if not os.path.isfile(file_conf):
    printError("config not found: {}".format(file_conf))
    return None

  lines = readFile(file_conf).split("\n")
  lidx = 0;
  for line in lines:
    lidx =+ 0
    line = line.strip()
    if not line or line.startswith("#"):
      continue
    if "=" not in line:
      printWarning("malformed line in config ({}): {}".format(lidx, line))
      continue
    tmp = line.split("=", 1)
    if key == tmp[0].strip():
      return tmp[1].strip()
  return default

def checkTargetNotExists(target, action=None, add_parent=False):
  err = errno.EEXIST
  msg = ""
  if action:
    msg += "cannot " + action + ", "

  if os.path.exists(target):
    if os.path.isdir(target):
      err = errno.EISDIR
      msg += "directory"
    else:
      msg += "file"
    msg += " exists: {}".format(target)
    exitWithError(msg, err)

  if add_parent:
    dir_parent = os.path.dirname(target)
    if not os.path.exists(dir_parent):
      os.makedirs(dir_parent)
    elif not os.path.isdir(dir_parent):
      exitWithError("cannot create directory, file exists: {}".format(dir_parent), err)

def checkFileSourceExists(source, action=None):
  msg = ""
  if action:
    msg += "cannot " + action + " file, "

  if not os.path.exists(source):
    msg += "source does not exist: {}".format(source)
    exitWithError(msg, errno.ENOENT)
  if os.path.isdir(source):
    msg += "source is a directory: {}".format(source)
    exitWithError(msg, errno.EISDIR)

def checkDirSourceExists(source, action=None):
  msg = ""
  if action:
    msg += "cannot " + action + " directory, "

  if not os.path.exists(source):
    msg += "source does not exist: {}".format(source)
    exitWithError(msg, errno.ENOENT)
  if not os.path.isdir(source):
    msg += "source is a file: {}".format(source)
    exitWithError(msg, errno.EEXIST)

def makeDir(dirpath, verbose=True):
  checkTargetNotExists(dirpath, "create directory")
  os.makedirs(dirpath)
  if not os.path.isdir(dirpath):
    exitWithError("failed to create directory, an unknown error occured: {}".format(dirpath))
  if verbose:
    print("new directory '{}'".format(dirpath))

def deleteFile(filepath, verbose=True):
  if os.path.exists(filepath):
    if os.path.isdir(filepath):
      exitWithError("cannot delete file, directory exists: {}".format(filepath), errno.EISDIR)
    os.remove(filepath)
    if os.path.exists(filepath):
      exitWithError("failed to delete file, an unknown error occured: {}".format(filepath))
    if verbose:
      print("delete '{}'".format(filepath))

def deleteDir(dirpath, verbose=True):
  if os.path.exists(dirpath):
    if not os.path.isdir(dirpath):
      exitWithError("cannot delete directory, file exists: {}".format(dirpath), errno.EEXIST)
    for obj in os.listdir(dirpath):
      objpath = os.path.join(dirpath, obj)
      if not os.path.isdir(objpath):
        deleteFile(objpath)
      else:
        deleteDir(objpath)
    if len(os.listdir(dirpath)) != 0:
      exitWithError("failed to delete directory, not empty: {}".format(dirpath))
    os.rmdir(dirpath)
    if os.path.exists(dirpath):
      exitWithError("failed to delete directory, an unknown error occurred: {}".format(dirpath))
    if verbose:
      print("delete '{}'".format(dirpath))

def copyFile(source, target, name=None, verbose=True):
  if name:
    target = os.path.join(target, name)
  checkFileSourceExists(source, "copy")
  checkTargetNotExists(target, "copy file", True)
  shutil.copyfile(source, target)
  if not os.path.exists(target):
    exitWithError("failed to copy file, an unknown error occurred: {}".format(target))
  if verbose:
    print("copy '{}' -> '{}'".format(source, target))

def copyDir(source, target, name=None, verbose=True):
  if name:
    target = os.path.join(target, name)
  checkDirSourceExists(source, "copy")
  checkTargetNotExists(target, "copy directory")
  makeDir(target)
  if not os.path.isdir(target):
    exitWithError("failed to copy directory, an unknown error occurred: {}".format(target))
  if verbose:
    print("copy '{}' -> '{}'".format(source, target))
  for obj in os.listdir(source):
    objsource = os.path.join(source, obj)
    objtarget = os.path.join(target, obj)
    if not os.path.isdir(objsource):
      copyFile(objsource, objtarget, None, verbose)
    else:
      copyDir(objsource, objtarget, None, verbose)

def moveFile(source, target, name=None, verbose=True):
  if name:
    target = os.path.join(target, name)
  checkFileSourceExists(source, "move")
  checkTargetNotExists(target, "move file", True)
  shutil.move(source, target)
  if os.path.exists(source) or not os.path.exists(target):
    exitWithError("failed to move file, an unknown error occurred: {}".format(target))
  if verbose:
    print("move '{}' -> '{}'".format(source, target))

def moveDir(source, target, name=None, verbose=True):
  if name:
    target = os.path.join(target, name)
  checkDirSourceExists(source, "move")
  checkTargetNotExists(target, "move directory")
  makeDir(target)
  if not os.path.isdir(target):
    exitWithError("failed to move directory, an unknown error occurred: {}".format(target))
  for obj in os.listdir(source):
    objsource = os.path.join(source, obj)
    objtarget = os.path.join(target, obj)
    if not os.path.isdir(objsource):
      moveFile(objsource, objtarget, None, verbose)
    else:
      moveDir(objsource, objtarget, None, verbose)
  deleteDir(source, False)
  if verbose:
    print("move '{}' -> '{}'".format(source, target))

def downloadFile(url, filename, verbose=True):
  if verbose:
    print("\ndownloading file from {} ...".format(url))

  dir_target = os.path.join(os.getcwd(), "temp")
  if not os.path.exists(dir_target):
    os.makedirs(dir_target)
  if not os.path.isdir(dir_target):
    exitWithError("cannot download to temp directory, file exists: {}".format(dir_target), errno.EEXIST)

  file_target = os.path.join(dir_target, filename)
  if os.path.exists(file_target):
    print("{} exists, delete to re-download".format(file_target))
    return

  try:
    wget.download(url, file_target)
  except HTTPError:
    exitWithError("could not download file from: {}".format(url))

def packZipDir(filepath, sourcepath, verbose=True):
  if os.path.exists(filepath):
    if os.path.isdir(filepath):
      exitWithError("cannot create zip, directory exists: {}".format(filepath), errno.EEXIST)
    os.remove(filepath)

  dir_start = os.getcwd()
  os.chdir(sourcepath)
  # clean up path name
  sourcepath = os.getcwd()
  idx_trim = len(sourcepath) + 1

  zopen = ZipFile(filepath, "w")
  for ROOT, DIRS, FILES in os.walk(sourcepath):
    for f in FILES:
      f = os.path.join(ROOT, f)[idx_trim:]
      zopen.write(f)
  zopen.close()

  os.chdir(dir_start)
  if verbose:
    print("packed archive: {}".format(filepath))

def unpackZip(filepath, dir_target=None, verbose=True):
  if not os.path.isfile(filepath):
    exitWithError("cannot extract zip, file not found: {}".format(filepath), errno.ENOENT)

  dir_start = os.getcwd()
  dir_parent = os.path.dirname(filepath)
  if dir_target == None:
    dir_target = os.path.join(dir_parent, os.path.basename(filepath).lower().split(".zip")[0])

  if os.path.exists(dir_target):
    if not os.path.isdir(dir_target):
      exitWithError("cannot extract zip, file exists: {}".format(dir_target), errno.EEXIST)
    shutil.rmtree(dir_target)
  os.makedirs(dir_target)

  os.chdir(dir_target)
  if verbose:
    print("extracting contents of {} ...".format(filepath))
  zopen = ZipFile(filepath, "r")
  zopen.extractall()
  zopen.close()
  # return to original directory
  os.chdir(dir_start)


# --- TARGET FUNCTIONS --- #

def stage(_dir, verbose=True):
  dir_stage = os.path.join(_dir, "build", "stage")
  deleteDir(dir_stage)

  if verbose:
    print("\nstaging files ...")

  os.makedirs(dir_stage)
  if not os.path.isdir(dir_stage):
    # FIXME: correct error value
    exitWithError("failed to create staging directory: {}".format(dir_stage), errno.ENOENT)

  files_stage = getConfig("stage_files", "").split(";")
  dirs_stage = getConfig("stage_dirs", "").split(";")

  for f in files_stage:
    file_source = os.path.join(_dir, f)
    file_target = os.path.join(dir_stage, f)
    copyFile(file_source, file_target, None, verbose)

  for d in dirs_stage:
    dir_source = os.path.join(_dir, d)
    dir_target = os.path.join(dir_stage, d)
    copyDir(dir_source, dir_target, None, verbose)

  dir_assets = os.path.join(dir_stage, "assets")
  if not os.path.isdir(dir_assets):
    exitWithError("no assets staged (missing directory: {})".format(dir_assets), errno.ENOENT)

  if verbose:
    print("\ncleaning staged files ...")
  for ROOT, DIRS, FILES in os.walk(dir_assets):
    for f in FILES:
      file_staged = os.path.join(ROOT, f)
      if ".xcf" in f:
        deleteFile(file_staged, verbose)

def buildElectron(_dir):
  stage(_dir)
  dir_stage = os.path.join(_dir, "build", "stage")
  for f in ("electron_main.js", "package.json"):
    shutil.copy(os.path.join(_dir, f), dir_stage)

  ver_electron = getConfig("electron_version")
  if ver_electron == None:
    exitWithError("chromedriver version not configured in 'build.conf'")

  print("\nsetting up for electron version: {}".format(ver_electron))

  dl_prefix = "https://github.com/electron/electron/releases/download/v{0}/".format(ver_electron)

  for platform in ("linux-x64", "win32-x64"):
    print("\nbuilding for platform " + platform + " ...")
    dl_url = dl_prefix + "electron-v{}-".format(ver_electron) + platform + ".zip"
    filename = os.path.basename(dl_url)
    downloadFile(dl_url, filename)
    dl_filepath = os.path.join(_dir, "temp", filename)
    dir_build = os.path.join(_dir, "build", platform)
    unpackZip(dl_filepath, dir_build)
    dir_app = os.path.join(dir_build, "resources", "app")
    # make sure parent dir exists
    if not os.path.isdir(os.path.dirname(dir_app)):
      os.makedirs(os.path.dirname(dir_app))
    shutil.copytree(dir_stage, dir_app)
    if platform.startswith("linux"):
      for exe in ("electron", "chrome-sandbox", "chrome_crashpad_handler"):
        exe = os.path.join(dir_build, exe)
        if os.path.isfile(exe):
          os.chmod(exe, 0o775)
    file_dist = os.path.join(os.path.dirname(dir_build), "CharGen_{}_{}.zip".format(getConfig("version"), platform))
    packZipDir(file_dist, dir_build)

def clean(_dir, verbose=True):
  dir_build = os.path.join(_dir, "build")
  if os.path.exists(dir_build):
    if not os.path.isdir(dir_build):
      exitWithError("cannot remove build directory, file exists: {}".format(dir_build), errno.EEXIST)

    if verbose:
      print("\ncleaning build files ...")

    deleteDir(dir_build, verbose)


def main(_dir, argv):
  if len(argv) == 0:
    exitWithError("missing command parameter", usage=True)
  elif len(argv) > 1:
    exitWithError("too many commands", usage=True)

  command = argv[0]
  if command not in options["commands"]:
    exitWithError("unknown command: {}".format(command), usage=True)

  time_start = time.time()

  if "clean" == command:
    clean(_dir)
  elif "stage" == command:
    stage(_dir)
  elif "electron" == command:
    buildElectron(_dir)

  time_end = time.time()
  time_diff = time_end - time_start
  secs = math.floor(time_diff)
  ms = math.floor(round(time_diff - secs, 3) * 1000)
  mins = math.floor(secs / 60)
  secs = secs if mins == 0 else math.floor(secs % (mins * 60))

  duration = "{}s".format(secs)
  if ms > 0:
    duration += ".{}ms".format(ms)
  if mins > 0:
    duration = "{}m:".format(mins) + duration
  print("\nduration: {}".format(duration));


if __name__ == "__main__":
  os.chdir(os.path.dirname(__file__))
  main(os.getcwd(), sys.argv[1:])

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
  subprocess.run(("python", "-m", "pip", "install", "wget"), check=True)
  try:
    import wget
  except ModuleNotFoundError:
    print("\nWARNING: could not install 'wget' module, downloads will fail")


def getConfig(key, default=None):
  file_conf = os.path.join(os.getcwd(), "build.conf")
  if not os.path.isfile(file_conf):
    print("\nERROR: config not found: {}".format(file_conf))
    return None

  fopen = codecs.open(file_conf, "r", "utf-8")
  lines = fopen.read().replace("\r\n", "\n").replace("\r", "\n").split("\n")
  fopen.close()

  lidx = 0;
  for line in lines:
    lidx =+ 0
    line = line.strip()
    if not line or line.startswith("#"):
      continue
    if "=" not in line:
      print("\nWARNING: malformed line in config ({}): {}".format(lidx, line))
      continue
    tmp = line.split("=", 1)
    if key == tmp[0].strip():
      return tmp[1].strip()
  return default

def downloadFile(url, filename):
  # DEBUG:
  print("downloading file from: {}".format(url))

  dir_target = os.path.join(os.getcwd(), "temp")
  if not os.path.exists(dir_target):
    os.makedirs(dir_target)
  if not os.path.isdir(dir_target):
    print("\nERROR: cannot download to temp directory, file exists: {}".format(dir_target))
    sys.exit(errno.EEXIST)

  file_target = os.path.join(dir_target, filename)
  if os.path.exists(file_target):
    print("{} exists, delete to re-download".format(file_target))
    return

  try:
    wget.download(url, file_target)
  except HTTPError:
    print("\nERROR: could not download file from: {}".format(url))
    sys.exit(1)

def packZipDir(filepath, sourcepath):
  if os.path.exists(filepath):
    if os.path.isdir(filepath):
      print("\nERROR: cannot create zip, directory exists: {}".format(filepath))
      sys.exit(errno.EEXIST)
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
  print("packed archive: {}".format(filepath))

def unpackZip(filepath, dir_target=None):
  if not os.path.isfile(filepath):
    print("\nERROR: cannot extract zip, file not found: {}".format(filepath))
    sys.exit(errno.ENOENT)

  dir_start = os.getcwd()
  dir_parent = os.path.dirname(filepath)
  if dir_target == None:
    dir_target = os.path.join(dir_parent, os.path.basename(filepath).lower().split(".zip")[0])

  if os.path.exists(dir_target):
    if not os.path.isdir(dir_target):
      print("\nERROR: cannot extract zip, file exists: {}".format(dir_target))
      sys.exit(errno.EEXIST)
    shutil.rmtree(dir_target)
  os.makedirs(dir_target)

  os.chdir(dir_target)
  print("extracting contents of {} ...".format(filepath))
  zopen = ZipFile(filepath, "r")
  zopen.extractall()
  zopen.close()
  # return to original directory
  os.chdir(dir_start)

def cleanStage(dir_stage):
  if os.path.exists(dir_stage):
    if not os.path.isdir(dir_stage):
      print("\nERROR: cannot stage, file exists: {}".format(dir_stage))
      sys.exit(errno.EEXIST)

    print("\nremoving old staging directory ...")
    print("delete '{}'".format(dir_stage))
    shutil.rmtree(dir_stage)

def stage(_dir):
  dir_stage = os.path.join(_dir, "build", "stage")
  cleanStage(dir_stage)
  print("\nstaging ...")
  os.makedirs(dir_stage)
  if not os.path.isdir(dir_stage):
    print("\nERROR: failed to create staging directory: {}".format(dir_stage))
    # FIXME: correct error value
    sys.exit(errno.ENOENT)

  files_stage = ("index.html", "info.html", "LICENSE.txt")
  dirs_stage = ("assets", "data", "doc", "script")

  for f in files_stage:
    file_source = os.path.join(_dir, f)
    file_target = os.path.join(dir_stage, f)
    print("'" + file_source + "' -> '" + file_target + "'")
    shutil.copyfile(file_source, file_target)
    if not os.path.isfile(file_target):
      print("\nERROR: failed to copy file to staging directory: {}".format(file_source))
      # FIXME: correct error value
      sys.exit(errno.ENOENT)

  for d in dirs_stage:
    dir_source = os.path.join(_dir, d)
    dir_target = os.path.join(dir_stage, d)
    shutil.copytree(dir_source, dir_target)
    print("'" + dir_source + "' -> '" + dir_target + "'")
    if not os.path.isdir(dir_target):
      print("\nERROR: failed to copy directory to staging directory: {}".format(dir_source))
      # FIXME: correct error value
      sys.exit(errno.ENOENT)

  dir_assets = os.path.join(dir_stage, "assets")
  if not os.path.isdir(dir_assets):
    print("\nERROR: no assets staged (missing directory: {})".format(dir_assets))
    sys.exit(errno.ENOENT)

  print("\ncleaning stage ...")
  for ROOT, DIRS, FILES in os.walk(dir_assets):
    for f in FILES:
      file_staged = os.path.join(ROOT, f)
      if ".xcf" in f:
        print("delete '{}'".format(file_staged))
        os.remove(file_staged)
        if os.path.isfile(file_staged):
          print("\nERROR: failed to remove unused file: {}".format(file_staged))
          # FIXME: correct error value
          sys.exit(errno.EEXIST)

def buildElectron(_dir):
  stage(_dir)
  dir_stage = os.path.join(_dir, "build", "stage")
  for f in ("electron_main.js", "package.json"):
    shutil.copy(os.path.join(_dir, f), dir_stage)

  ver_electron = getConfig("electron_version")
  if ver_electron == None:
    print("\nERROR: chromedriver version not configured in 'build.conf'")
    sys.exit(1)

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


def main(_dir, argv):
  if len(argv) == 0:
    file_exe = os.path.basename(__file__)
    print("missing command parameter")
    print("\nUsage:\n  " + file_exe + " stage|electron")
    sys.exit(0)
  elif len(argv) > 1:
    file_exe = os.path.basename(__file__)
    print("too many commands")
    print("\nUsage:\n  " + file_exe + " stage|electron")
    sys.exit(0)

  time_start = time.time()

  command = argv[0]
  if "stage" == command:
    stage(_dir)
  elif "electron" == command:
    buildElectron(_dir)
  else:
    file_exe = os.path.basename(__file__)
    print("\nERROR: unknown command: {}".format(command))
    print("\nUsage:\n  " + file_exe + " stage|electron")
    sys.exit(1)

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

#!/usr/bin/env python

# ****************************************************
# * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
# ****************************************************
# * This software is licensed under the MIT license. *
# * See: LICENSE.txt for details.                    *
# ****************************************************


import errno, math, os, shutil, sys, time


def cleanStage(dir_stage):
  if os.path.exists(dir_stage):
    if not os.path.isdir(dir_stage):
      print("\nERROR: cannot stage, file exists: {}".format(dir_stage))
      sys.exit(errno.EEXIST)

    print("\nremoving old staging directory ...")
    print("delete '{}'".format(dir_stage))
    shutil.rmtree(dir_stage)

def stage(_dir):
  dir_stage = os.path.join(_dir, "stage")
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


def main(_dir, argv):
  time_start = time.time()

  if "stage" in argv:
    stage(_dir)
  else:
    file_exe = os.path.basename(__file__)
    print("missing command parameter")
    print("\nUsage:\n  " + file_exe + " stage")
    sys.exit(0)

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

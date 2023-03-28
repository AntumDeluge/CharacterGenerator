#!/usr/bin/env python

# ****************************************************
# * Copyright (C) 2023 - Jordan Irwin (AntumDeluge)  *
# ****************************************************
# * This software is licensed under the MIT license. *
# * See: LICENSE.txt for details.                    *
# ****************************************************


import codecs, errno, math, os, re, shutil, subprocess, sys, time

from urllib.error import HTTPError
from zipfile import ZipFile

modules = {}

def installModule(mod, pkg=None):
  if mod in modules:
    print("\nWARNING: module '{}' already imported".format(mod))
    return

  pkg = mod if not pkg else pkg
  try:
    modules[mod] = __import__(mod)
  except ModuleNotFoundError:
    print("\ninstalling {} module ...".format(mod))
    subprocess.run((sys.executable, "-m", "pip", "install", pkg))
    try:
      modules[mod] = __import__(mod)
    except ModuleNotFoundError:
      print("\nWARNING: failed to install '{}' module".format(mod))


# set up environment
dir_root = os.path.dirname(__file__)
os.chdir(dir_root)
dir_root = os.getcwd()
file_conf = os.path.join(dir_root, "build.conf")

class Targets:
  names = []
  actions = {}
  completed = []

  def getNames(self):
    return self.names

  def add(self, name, action):
    if not callable(action):
      exitWithError("action parameter of Targets.add must be a function")
    if name in self.actions:
      exitWithError("cannot re-define target: {}".format(name))
    self.names.append(name)
    self.actions[name] = action

  def run(self, name, _dir, verbose=False):
    if name not in self.actions:
      exitWithError("target not defined: {}".format(name))
    elif name in self.completed:
      if verbose:
        print("\nnot re-running target: {}".format(name))
      return
    if name == "clean":
      # cleaning resets all targets (only first time run)
      self.completed = []
    self.actions[name](_dir, verbose)
    self.completed.append(name)


targets = Targets()

options = {
  "web-dist": False
}

templates = {}
templates["html-head"] = "<html>\n\
<head>\n\
{{head}}\n\
</head>\
\n<body>"
templates["html-tail"] = "</body>\n</html>"
templates["favicon-data"] = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAJ1BMVEVHcEzytYYAAABhPAA2Njbkhnb/2rCYWUE9GwD6+voskrrX19cedpDJqZNvAAAAAXRSTlMAQObYZgAAAFRJREFUCNdjYIADJiUlCEPFxQnCVAIBBbCUCpThqKQkAma4CSmmgBmCQABiMEs0SjQagBjRB2W2ghmRy7KmghmlYonhIAaDeaBoMdgOZmNjAwYsAACaGQ2gK4O7gQAAAABJRU5ErkJggg=="
templates["favicon"] = "<link rel=\"icon\" href=\"{}\">".format(templates["favicon-data"])
templates["button-uplevel"] = "<a class=\"button\" href=\"../\" name=\"top\"><span class=\"button\">Back</span></a>"
templates["button-totop"] = "<a class=\"button\" href=\"#top\"><span class=\"button\">Back to Top</span></a>"


# --- UTILITY FUNCTIONS --- #

def printUsage():
  file_exe = os.path.basename(__file__)
  print("\nUSAGE:\n  {} [-h] [-v|-q] [-w] {}".format(file_exe, "|".join(targets.getNames())))

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

def checkTargetNotDir(target, action=None):
  msg = ""
  if action:
    msg += "cannot " + action + ", "

  if os.path.exists(target) and os.path.isdir(target):
    exitWithError(msg + "directory exists: {}".format(target), errno.EISDIR)

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

def makeDir(dirpath, verbose=False):
  checkTargetNotExists(dirpath, "create directory")
  os.makedirs(dirpath)
  if not os.path.isdir(dirpath):
    exitWithError("failed to create directory, an unknown error occured: {}".format(dirpath))
  if verbose:
    print("new directory '{}'".format(dirpath))

def deleteFile(filepath, verbose=False):
  if os.path.exists(filepath):
    if os.path.isdir(filepath):
      exitWithError("cannot delete file, directory exists: {}".format(filepath), errno.EISDIR)
    os.remove(filepath)
    if os.path.exists(filepath):
      exitWithError("failed to delete file, an unknown error occured: {}".format(filepath))
    if verbose:
      print("delete '{}'".format(filepath))

def deleteDir(dirpath, verbose=False):
  if os.path.exists(dirpath):
    if not os.path.isdir(dirpath):
      exitWithError("cannot delete directory, file exists: {}".format(dirpath), errno.EEXIST)
    for obj in os.listdir(dirpath):
      objpath = os.path.join(dirpath, obj)
      if not os.path.isdir(objpath):
        deleteFile(objpath, verbose)
      else:
        deleteDir(objpath, verbose)
    if len(os.listdir(dirpath)) != 0:
      exitWithError("failed to delete directory, not empty: {}".format(dirpath))
    os.rmdir(dirpath)
    if os.path.exists(dirpath):
      exitWithError("failed to delete directory, an unknown error occurred: {}".format(dirpath))
    if verbose:
      print("delete '{}'".format(dirpath))

def copyFile(source, target, name=None, verbose=False):
  if name:
    target = os.path.join(target, name)
  checkFileSourceExists(source, "copy")
  checkTargetNotExists(target, "copy file", True)
  shutil.copyfile(source, target)
  if not os.path.exists(target):
    exitWithError("failed to copy file, an unknown error occurred: {}".format(target))
  if verbose:
    print("copy '{}' -> '{}'".format(source, target))

def copyExecutable(source, target, name=None, verbose=False):
  copyFile(source, target, name, verbose)
  os.chmod(target, 0o775)

def copyDir(source, target, name=None, verbose=False):
  if name:
    target = os.path.join(target, name)
  checkDirSourceExists(source, "copy")
  checkTargetNotExists(target, "copy directory")
  makeDir(target, False)
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

def moveFile(source, target, name=None, verbose=False):
  if name:
    target = os.path.join(target, name)
  checkFileSourceExists(source, "move")
  checkTargetNotExists(target, "move file", True)
  shutil.move(source, target)
  if os.path.exists(source) or not os.path.exists(target):
    exitWithError("failed to move file, an unknown error occurred: {}".format(target))
  if verbose:
    print("move '{}' -> '{}'".format(source, target))

def moveDir(source, target, name=None, verbose=False):
  if name:
    target = os.path.join(target, name)
  checkDirSourceExists(source, "move")
  checkTargetNotExists(target, "move directory")
  makeDir(target, False)
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

def downloadFile(url, filename, verbose=False):
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
    modules["wget"].download(url, file_target)
  except HTTPError:
    exitWithError("could not download file from: {}".format(url))

def packFile(sourcefile, archive, amend=False, verbose=False):
  checkFileSourceExists(sourcefile)

  new_archive = type(archive) != ZipFile
  zopen = archive
  if new_archive:
    checkTargetNotDir(archive, "create zip")
    zopen = ZipFile(archive, "a" if amend else "w")
  zopen.write(sourcefile)
  # if ZipFile was passed, calling instruction should close the file
  if new_archive:
    zopen.close()

  if verbose:
    print("compress '{}' => '{}'".format(sourcefile, archive))

def packDir(sourcedir, archive, incroot=False, amend=False, verbose=False):
  checkDirSourceExists(sourcedir)
  checkTargetNotDir(archive, "create zip")

  dir_start = os.getcwd()

  # normalize path to archive
  a_basename = os.path.basename(archive)
  a_dirname = os.path.dirname(archive)
  if a_dirname:
    os.chdir(a_dirname)
  a_dirname = os.getcwd()
  archive = os.path.join(a_dirname, a_basename)
  os.chdir(dir_start)

  # clean up path name
  os.chdir(sourcedir)
  dir_abs = os.getcwd()
  idx_trim = len(dir_abs) + 1
  if incroot:
    os.chdir(dir_start)
    idx_trim = len(dir_start) + 1

  zopen = ZipFile(archive, "a" if amend else "w")
  z_count_start = len(zopen.namelist())
  for ROOT, DIRS, FILES in os.walk(dir_abs):
    for f in FILES:
      f = os.path.join(ROOT, f)[idx_trim:]
      packFile(f, zopen, True, verbose)
  z_count_end = len(zopen.namelist())
  zopen.close()

  os.chdir(dir_start)
  if z_count_end == 0:
    printWarning("no files compressed, archive empty: {}".format(archive))
    deleteFile(archive, verbose)
  elif verbose:
    z_count_diff = z_count_end - z_count_start
    if z_count_diff == 0:
      print("archive unchanged: {}".format(archive))
    else:
      print("added {} files into archive: {}".format(z_count_diff, archive))

def unpack(filepath, dir_target=None, verbose=False):
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

def runCommand(cmd, args=[], failOnError=True, winext=None):
  if sys.platform == "win32" and winext:
    cmd = cmd + "." + winext
  args = [cmd] + list(args)
  try:
    res = subprocess.run(args)
    if res.returncode != 0 and failOnError:
      exitWithError("called process exited with error: {}".format(" ".join(args)), res.returncode)
    return res.returncode
  except FileNotFoundError:
    exitWithError("the system could not find file to execute: {}".format(cmd), errno.ENOENT)
  return 0

# --- TARGET FUNCTIONS --- #

def clean(_dir, verbose=False):
  print("\ncleaning build files ...")

  dir_build = os.path.join(_dir, "build")
  if os.path.exists(dir_build):
    if not os.path.isdir(dir_build):
      exitWithError("cannot remove build directory, file exists: {}".format(dir_build), errno.EEXIST)

    deleteDir(dir_build, verbose)
    return
  print("no files to remove")

def updateVersion(_dir, verbose=False):
  app_ver = getConfig("version")

  print("\nchargen version {}".format(app_ver))

  file_config_js = os.path.join(_dir, "script", "config.js")
  contents = readFile(file_config_js)
  changes = re.sub(
    r"^config\[\"version\"\] = .*;$",
    "config[\"version\"] = \"{}\";".format(app_ver),
    contents, 1, re.M)
  if changes != contents:
    writeFile(file_config_js, changes)
    if verbose:
      print("updated file '{}'".format(file_config_js))

  file_changelog = os.path.join(_dir, "doc", "changelog.txt")
  contents = readFile(file_changelog)
  changes = re.sub(r"^next$", app_ver, contents, 1, re.M)
  if changes != contents:
    writeFile(file_changelog, changes)
    if verbose:
      print("updated file '{}'".format(file_changelog))

  file_config_neu = os.path.join(_dir, "neutralino.config.json")
  contents = readFile(file_config_neu)
  changes = re.sub(
    r"\"version\": .*,$",
    "\"version\": \"{}\",".format(app_ver),
    contents, 1, re.M
  )
  if changes != contents:
    writeFile(file_config_neu, changes)
    if verbose:
      print("updated file '{}'".format(file_config_neu))

def stageWeb(_dir, verbose=False):
  installModule("markdown")
  targets.run("update-version", _dir, verbose)

  print("\nstaging web files ...")

  dir_web = os.path.join(_dir, "build", "web")
  deleteDir(dir_web, verbose)
  makeDir(dir_web, verbose)
  if not os.path.isdir(dir_web):
    # FIXME: correct error value
    exitWithError("failed to create staging directory: {}".format(dir_web), errno.ENOENT)

  files_stage = getConfig("stage_files", "").split(";")
  dirs_stage = getConfig("stage_dirs", "").split(";")

  for f in files_stage:
    file_source = os.path.join(_dir, f)
    file_target = os.path.join(dir_web, f)
    copyFile(file_source, file_target, None, verbose)

  for d in dirs_stage:
    dir_source = os.path.join(_dir, d)
    dir_target = os.path.join(dir_web, d)
    copyDir(dir_source, dir_target, None, verbose)

  dir_assets = os.path.join(dir_web, "assets")
  if not os.path.isdir(dir_assets):
    exitWithError("no assets staged (missing directory: {})".format(dir_assets), errno.ENOENT)

  # convert README to HTML
  file_readme = os.path.join(dir_assets, "README")
  html = modules["markdown"].markdown(readFile(file_readme + ".md"))
  html_head = [
    "  <title>Assets Info</title>",
    # ~ "<link rel=\"icon\" href=\"{}\">".format(templates["favicon"]),
    templates["favicon"],
    "<link rel=\"stylesheet\" href=\"../script/main.css\">",
    "<script type=\"module\" src=\"../script/nav.js\"></script>"
  ]
  html_head = re.sub(r"^{{head}}$", "\n  ".join(html_head), templates["html-head"], 1, re.M)
  html = "\n".join((html_head, templates["button-uplevel"], html, templates["button-totop"],
      templates["html-tail"]))
  writeFile(file_readme + ".html", html)

  print("\ncleaning web files ...")
  for ROOT, DIRS, FILES in os.walk(dir_assets):
    for f in FILES:
      file_staged = os.path.join(ROOT, f)
      if ".xcf" in f or f.endswith(".md"):
        deleteFile(file_staged, verbose)

  file_config_js = os.path.join(dir_web, "script", "config.js")
  contents = readFile(file_config_js)
  changes = re.sub(
    r"^config\[\"asset-info\"\] = .*$",
    "config[\"asset-info\"] = \"assets/README.html\"",
    contents, 1, re.M
  )
  writeFile(file_config_js, changes)

  if options["web-dist"]:
    contents = changes
    changes = re.sub(
      r"^config\[\"web-dist\"\] = false",
      "config[\"web-dist\"] = true",
      contents, 1, re.M
    )
    if changes != contents:
      writeFile(file_config_js, changes)
      if verbose:
        print("configured for web distribution: {}".format(file_config_js))

def distWeb(_dir, verbose=False):
  targets.run("stage-web", _dir, verbose)

  print("\ncreating web distribution ...")

  app_ver = getConfig("version")
  dir_build = os.path.join(_dir, "build")
  dir_web = os.path.join(dir_build, "web")
  dir_dist = os.path.join(dir_build, "dist")
  file_dist = os.path.join(dir_dist, "chargen_{}_web.zip".format(app_ver))
  if not os.path.exists(dir_dist):
    makeDir(dir_dist, verbose)
  packDir(dir_web, file_dist, False, False, verbose)
  packFile("README.md", file_dist, True, verbose)

def stageDesktop(_dir, verbose=False):
  targets.run("stage-web", _dir, verbose)

  print("\nstaging desktop files ...")

  dir_build = os.path.join(_dir, "build")
  dir_web = os.path.join(dir_build, "web")
  dir_neu = os.path.join(dir_build, "neutralinojs")
  dir_app = os.path.join(dir_build, "desktop")
  dir_doc = os.path.join(dir_app, "doc")
  dir_res = os.path.join(dir_app, "resources")

  if not os.path.isdir(dir_neu):
    res = runCommand("npm", ("run", "stage-desktop"), False, "cmd")
    if res != 0:
      printWarning("call to 'npm' returned error")
  else:
    print("\nskipped Neutralinojs download, directory exists: {}".format(dir_neu))

  deleteDir(dir_app, verbose)
  makeDir(dir_app, verbose)
  copyDir(dir_web, dir_app, "resources", verbose)
  copyFile(
    os.path.join(dir_neu, "LICENSE"),
    dir_app,
    "LICENSE-neutralinojs.txt",
    verbose
  )
  copyFile(
    os.path.join(dir_res, "LICENSE.txt"),
    os.path.join(dir_app, "LICENSE.txt"),
    None, verbose
  )
  copyDir(
    os.path.join(dir_neu, "bin"),
    os.path.join(dir_app, "bin"),
    None, verbose
  )
  copyFile(
    os.path.join(dir_neu, "resources", "js", "neutralino.js"),
    os.path.join(dir_res, "js", "neutralino.js"),
    None, verbose
  )
  copyFile(
    os.path.join(_dir, "neutralino.config.json"),
    os.path.join(dir_app, "neutralino.config.json"),
    None, verbose
  )

  # add Neutralinojs script to HTML
  if verbose:
    print("\nincorporating neutralino.js into index.html")
  file_index = os.path.join(dir_res, "index.html")
  lines_orig = readFile(file_index).split("\n")
  lines = list(lines_orig)
  for idx in range(len(lines)):
    if lines[idx].strip() == "<head>":
      lines.insert(idx+1, "  <script src=\"js/neutralino.js\"></script>")
      break
  if lines != lines_orig:
    writeFile(file_index, lines)
  file_config_js = os.path.join(dir_res, "script", "config.js")
  content = readFile(file_config_js)
  changes = re.sub(
    r"^config\[\"desktop\"\] = false",
    "config[\"desktop\"] = true",
    content, 1, re.M
  )
  if changes != content:
    writeFile(file_config_js, changes)
    if verbose:
      print("updated file '{}'".format(file_config_js))

def runDesktop(_dir, verbose=False):
  targets.run("stage-desktop", _dir, verbose)

  print("\nrunning desktop app ...")

  dir_start = os.getcwd()
  dir_app = os.path.join(_dir, "build", "desktop")

  os.chdir(dir_app)
  ret = runCommand("npm", ("exec", "neu", "run"), winext="cmd")

  os.chdir(dir_start)

def _packageDist(distname, ext="", verbose=False):
  app_ver = getConfig("version")
  dir_temp = os.path.join(os.getcwd(), "tmp")
  makeDir(dir_temp, verbose)
  target_exe = os.path.join(dir_temp, "chargen"+ext)
  copyExecutable(
    os.path.normpath("chargen/chargen-{}{}".format(distname, ext)),
    target_exe, None, verbose
  )
  copyFile(
    os.path.normpath("chargen/resources.neu"),
    dir_temp, "resources.neu", verbose
  )
  if ext == ".exe":
    copyFile(
      os.path.normpath("chargen/WebView2Loader.dll"),
      dir_temp, "WebView2Loader.dll", verbose
    )
  copyDir(
    os.path.normpath("../resources/doc"),
    dir_temp, "doc", verbose
  )
  for filename in ("LICENSE.txt", "LICENSE-neutralinojs.txt"):
    copyFile(
      os.path.join("..", filename),
      dir_temp, filename, verbose
    )
  copyFile(
    os.path.join(dir_root, "README.md"),
    dir_temp, "README.md", verbose
  )
  packDir(dir_temp, "chargen_{}_{}.zip".format(app_ver, distname), False, False, verbose)
  deleteDir(dir_temp, verbose)

def distDesktop(_dir, verbose=False):
  targets.run("stage-desktop", _dir, verbose)

  print("\ncreating desktop app distribution ...")

  dir_start = os.getcwd()
  dir_build = os.path.join(_dir, "build")
  dir_app = os.path.join(dir_build, "desktop")
  dir_dist_temp = os.path.join(dir_app, "dist")

  os.chdir(dir_app)
  runCommand("npm", ("exec", "neu", "build", "--release"), winext="cmd")

  os.chdir(dir_dist_temp)
  if verbose:
    print("packaging Linux binaries ...")
  for arch in ("arm64", "armhf", "x64"):
    _packageDist("linux_" + arch, "", verbose)
  if verbose:
    print("packaging Mac OS X binaries ...")
  for arch in ("arm64", "x64"):
    _packageDist("mac_" + arch, "", verbose)
  if verbose:
    print("packaging Windows binaries ...")
  _packageDist("win_x64", ".exe", verbose)

  dir_dist = os.path.join(dir_build, "dist")
  if not os.path.isdir(dir_dist):
    makeDir(dir_dist, verbose)
  for obj in os.listdir(dir_dist_temp):
    objpath = os.path.join(dir_dist_temp, obj)
    if os.path.isfile(objpath):
      moveFile(objpath, dir_dist, obj, verbose)

  os.chdir(dir_start)
  deleteDir(dir_dist_temp, verbose)

def printChanges(_dir, verbose=False):
  changelog = getConfig("changelog")
  if not changelog:
    exitWithError("cannot parse changelog, 'changelog' not configured in build.conf")
  changelog = os.path.join(dir_root, os.path.normpath(changelog))
  if not os.path.isfile(changelog):
    exitWithError("cannot parse changelog, file not found: {}".format(changelog), errno.ENOENT)
  lines = []
  started = False
  for li in readFile(changelog).split("\n"):
    if started and not li:
      break
    if not started and li and not li.startswith("-"):
      started = True
    elif started and li:
      lines.append(li)
  print("\n".join(lines))

def init(_dir, verbose=False):
  installModule("wget")
  installModule("markdown")

targets.add("init", init)
targets.add("clean", clean)
targets.add("update-version", updateVersion)
targets.add("stage-web", stageWeb)
targets.add("dist-web", distWeb)
targets.add("stage-desktop", stageDesktop)
targets.add("run-desktop", runDesktop)
targets.add("dist-desktop", distDesktop)
targets.add("print-changes", printChanges)

def main(_dir, argv):
  if "-h" in argv or "--help" in argv:
    printUsage()
    sys.exit(0)

  verbose = "-v" in argv
  if verbose:
    argv.pop(argv.index("-v"))
  silent = "-q" in argv
  if silent:
    argv.pop(argv.index("-q"))
    # silent overrides verbose
    verbose = False
  options["web-dist"] = "-w" in argv
  if options["web-dist"]:
    argv.pop(argv.index("-w"))

  if len(argv) == 0:
    exitWithError("missing command parameter", usage=True)

  # check commands before starting
  command_list = targets.getNames()
  for command in argv:
    if command not in command_list:
      exitWithError("unknown command: {}".format(command), usage=True)

  time_start = time.time()

  for command in argv:
    targets.run(command, _dir, verbose)

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
  if not silent:
    print("\nduration: {}".format(duration));


if __name__ == "__main__":
  os.chdir(os.path.dirname(__file__))
  main(os.getcwd(), sys.argv[1:])

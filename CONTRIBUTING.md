# Contributing to InkLink

Thanks for considering contributing!

## Project structure
- 3ds/ -> Nintendo 3DS homebrew app (sends UDP touch + buttons)
- src/ -> Desktop app source (Electron)
- buildscripts/ -> build/bundle/obfuscation scripts

## Requirements
- Node.js + npm (Desktop)
- devkitPro (3DS) if you want to build the 3DS app from source

## Desktop (dev)
1) Install dependencies:
   npm install
2) Run:
   npm start

## Desktop (production / release build)
- Build prod bundle:
  npm run prod:build
- Package installers:
  npm run dist

## 3DS (build)
Inside 3ds/:
- make clean
- make

## Bug reports
Please include:
- OS (macOS/Windows/Linux)
- InkLink version (release tag) or commit hash
- Steps to reproduce
- Logs/screenshots

## Pull requests
- Keep PRs focused (one change per PR)
- Explain what you changed and why
- Add notes for testing (how you validated it)

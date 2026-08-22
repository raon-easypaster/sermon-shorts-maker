#!/bin/bash
# Headless launcher for the desktop shortcut (invoked from an AppleScript .app
# via `do shell script`, which has no Terminal window and a minimal PATH — so
# every tool this needs must be found explicitly rather than assumed).
set -e

export PATH="$HOME/.local/node/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
INSTALL_DIR="$HOME/Applications/sermon-shorts-maker"
LOG="/tmp/sermon-shorts-maker.log"
PORT=3939

cd "$INSTALL_DIR"

if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display alert "설교 쇼츠 메이커" message "Node.js가 설치되어 있지 않습니다. https://nodejs.org 에서 설치한 뒤 다시 실행하세요."'
  exit 1
fi

if [ ! -d node_modules ]; then
  osascript -e 'display notification "처음 실행이라 필요한 프로그램을 설치합니다 (몇 분 걸릴 수 있어요)" with title "설교 쇼츠 메이커"'
  npm install >> "$LOG" 2>&1
fi

if [ ! -f .next/BUILD_ID ]; then
  osascript -e 'display notification "앱을 준비하는 중입니다..." with title "설교 쇼츠 메이커"'
  npm run build >> "$LOG" 2>&1
fi

# Only start a new server if one isn't already answering on the port —
# repeat double-clicks must not crash into "EADDRINUSE".
if ! curl -s -o /dev/null "http://localhost:$PORT/"; then
  nohup npm run start >> "$LOG" 2>&1 &
  disown
fi

# Poll instead of a fixed delay: first run (install+build above) can already
# take minutes, and a fixed sleep would either race a slow start or waste
# time on a fast one.
for _ in $(seq 1 90); do
  curl -s -o /dev/null "http://localhost:$PORT/" && break
  sleep 1
done

open "http://localhost:$PORT"

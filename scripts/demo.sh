#!/usr/bin/env bash
# Start a throwaway Epoch with demo data, for screenshots and recordings.
# It gets its own HOME, state and theme folders, and a fixed time zone, so it
# never touches your real alarms or shows where you are.
#
#   scripts/demo.sh start [theme]    start it (default theme: gruvbox), floated at WxH
#   scripts/demo.sh seed             add the demo alarms, timers and cities
#   scripts/demo.sh theme <name>     switch the demo's theme the way omarchy-theme-set does
#   scripts/demo.sh call <fn> [arg]  IPC into the demo, e.g. `call run "t 25m tea"`, `call key a`
#   scripts/demo.sh shot <file>      screenshot the demo window
#   scripts/demo.sh stop
set -euo pipefail
EPOCH_DIR=$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)
DEMO=${EPOCH_DEMO_HOME:-/tmp/epoch-demo}
CUR="$DEMO/.local/state/omarchy/current"
SIZE=${EPOCH_DEMO_SIZE:-1346x732+10+26}

pid() { cat "$DEMO/pid" 2>/dev/null; }
addr() { hyprctl clients -j | jq -r --argjson p "$(pid)" '.[] | select(.pid == $p) | .address'; }
d() { hyprctl dispatch "$1" >/dev/null; }

set_theme() {
  local src="/usr/share/omarchy/themes/$1"
  [[ -d $src ]] || src="$HOME/.config/omarchy/themes/$1"
  mkdir -p "$CUR/next-theme"
  cp "$src/colors.toml" "$CUR/next-theme/"
  rm -rf "$CUR/theme"
  mv "$CUR/next-theme" "$CUR/theme"
  echo "$1" >"$CUR/theme.name"
}

case "${1:-}" in
  start)
    rm -rf "$DEMO" && mkdir -p "$CUR" "$DEMO/state"
    set_theme "${2:-gruvbox}"
    (HOME=$DEMO XDG_STATE_HOME=$DEMO/state TZ=Europe/London setsid qs -p "$EPOCH_DIR" >"$DEMO/log" 2>&1 & echo $! >"$DEMO/pid")
    for _ in $(seq 1 40); do [[ -n $(addr) ]] && break; sleep 0.1; done
    w=${SIZE%%x*}; rest=${SIZE#*x}; h=${rest%%+*}; xy=${rest#*+}; x=${xy%%+*}; y=${xy#*+}
    a="address:$(addr)"
    d "hl.dsp.window.float({ window = \"$a\", action = \"set\" })"
    d "hl.dsp.window.resize({ window = \"$a\", x = $w, y = $h })"
    d "hl.dsp.window.move({ window = \"$a\", x = $x, y = $y })"
    sleep 1.2 ;;
  seed)
    for c in "a 6:45 run weekdays" "a 7:30 gym mon,wed,fri" "a 9:45 standup weekdays" "a 13:00 lunch" "a 22:30 wind down daily" \
      "w tokyo" "w new york" "w san francisco" "w sydney" "t 5m tea" "t 25m deploy" "t 50m focus && t 10m break"; do
      qs ipc --pid "$(pid)" call epoch run "$c" >/dev/null
    done ;;
  theme) set_theme "$2" ;;
  call) shift; qs ipc --pid "$(pid)" call epoch "$@" ;;
  shot) grim -g "$(hyprctl clients -j | jq -r --argjson p "$(pid)" '.[] | select(.pid == $p) | "\(.at[0]),\(.at[1]) \(.size[0])x\(.size[1])"')" "$2" ;;
  geometry) hyprctl clients -j | jq -r --argjson p "$(pid)" '.[] | select(.pid == $p) | "\(.size[0])x\(.size[1])+\(.at[0])+\(.at[1])"' ;;
  stop) kill "$(pid)" 2>/dev/null || true ;;
  *) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac

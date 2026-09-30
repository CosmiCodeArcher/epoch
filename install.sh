#!/usr/bin/env bash
# Install Epoch for the current user:
#   - the `epoch` command in ~/.local/bin
#   - an app launcher entry and icon
#   - on Omarchy (Hyprland Lua config): a solid-window rule, SUPER+E to toggle,
#     SUPER+ALT+E to pin, and autostart so alarms ring with the window closed
#
#   ./install.sh              install (safe to re-run, e.g. after moving the repo)
#   ./install.sh --no-hypr    skip the Hyprland config
#   ./install.sh --uninstall  remove all of the above (your alarms and timers stay
#                             in ~/.local/state/epoch)

set -euo pipefail

DIR=$(cd "$(dirname "$(readlink -f "$0")")" && pwd)
BIN_DIR="$HOME/.local/bin"
APPS_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
ICON_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor/scalable/apps"
HYPR_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/hypr"
EPOCH_BIN="$BIN_DIR/epoch"
REQUIRE='require("hypr.epoch")'

say() { printf '  %s\n' "$*"; }

backup() { cp "$1" "$1.bak.$(date +%s)"; }

reload_hyprland() {
  command -v hyprctl >/dev/null || return 0
  hyprctl reload >/dev/null 2>&1 || return 0
  local errors
  errors=$(hyprctl configerrors 2>/dev/null | grep -v '^\s*$' || true)
  if [[ -n $errors ]]; then
    echo "Hyprland reported config errors:" >&2
    echo "$errors" >&2
    return 1
  fi
}

uninstall() {
  "$EPOCH_BIN" quit 2>/dev/null || true
  rm -f "$EPOCH_BIN" "$APPS_DIR/epoch.desktop" "$ICON_DIR/epoch.svg" "$HYPR_DIR/epoch.lua"
  if [[ -f $HYPR_DIR/hyprland.lua ]] && grep -qF "$REQUIRE" "$HYPR_DIR/hyprland.lua"; then
    backup "$HYPR_DIR/hyprland.lua"
    sed -i '/^-- Epoch: /d; /^require("hypr\.epoch")$/d' "$HYPR_DIR/hyprland.lua"
    reload_hyprland || true
  fi
  echo "Epoch removed. Your alarms and timers are still in ~/.local/state/epoch."
}

install_hypr() {
  if [[ ! -f $HYPR_DIR/hyprland.lua ]]; then
    say "No Lua Hyprland config at $HYPR_DIR/hyprland.lua; skipped the window rule,"
    say "keybinds and autostart. See extras/hypr/epoch.lua for what to add by hand."
    return
  fi
  sed "s#@EPOCH_BIN@#$EPOCH_BIN#g" "$DIR/extras/hypr/epoch.lua" >"$HYPR_DIR/epoch.lua"
  if ! grep -qF "$REQUIRE" "$HYPR_DIR/hyprland.lua"; then
    backup "$HYPR_DIR/hyprland.lua"
    printf '\n-- Epoch: window rule, keybinds and autostart (see epoch.lua next to this file)\n%s\n' "$REQUIRE" >>"$HYPR_DIR/hyprland.lua"
  fi
  if reload_hyprland; then
    say "Hyprland: SUPER+E toggles Epoch, SUPER+ALT+E pins it"
  else
    say "Hyprland config has errors (above); fix them or run ./install.sh --uninstall"
  fi
}

case "${1:-}" in
  --uninstall) uninstall; exit 0 ;;
  --no-hypr | "") ;;
  *) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac

missing=()
for cmd in qs hyprctl jq pw-play notify-send; do
  command -v "$cmd" >/dev/null || missing+=("$cmd")
done
if ((${#missing[@]})); then
  echo "Epoch needs: ${missing[*]}" >&2
  exit 1
fi

echo "Installing Epoch from $DIR"
mkdir -p "$BIN_DIR" "$APPS_DIR" "$ICON_DIR"
chmod +x "$DIR/bin/epoch"
ln -sfn "$DIR/bin/epoch" "$EPOCH_BIN"
say "command: $EPOCH_BIN"
sed "s#@EPOCH_BIN@#$EPOCH_BIN#g" "$DIR/extras/epoch.desktop" >"$APPS_DIR/epoch.desktop"
cp "$DIR/extras/epoch.svg" "$ICON_DIR/epoch.svg"
say "launcher entry: Epoch"

[[ ${1:-} == --no-hypr ]] || install_hypr

"$EPOCH_BIN" daemon
say "running in the background; open it with 'epoch' or SUPER+E"

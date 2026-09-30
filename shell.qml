//@ pragma AppId epoch
import QtQuick
import Quickshell
import "core"
import "ui"
import "directions/monolith"

// Epoch: a clock for Omarchy. One long-running Quickshell process holds the
// engine, so alarms and timers keep going while the window is hidden;
// `epoch toggle` shows and hides it.
ShellRoot {
  id: shell

  // JetBrains Mono's ExtraBold (800) carries the big type; the installed
  // JetBrainsMono Nerd Font only ships up to Bold. Glyphs fall back to it.
  FontLoader { source: "assets/fonts/JetBrainsMono-Regular.woff2" }
  FontLoader { source: "assets/fonts/JetBrainsMono-Bold.woff2" }
  FontLoader { source: "assets/fonts/JetBrainsMono-ExtraBold.woff2" }

  App {
    id: app
    direction: ({ id: "monolith", faces: ["digits", "words", "hex"], puzzle: "reverse" })
  }

  Theme {
    id: theme
    tokens: app.tokens
    animate: app.themeLoaded
  }

  FloatingWindow {
    id: win
    title: "Epoch"
    visible: app.windowOpen
    implicitWidth: 960
    implicitHeight: 600
    minimumSize: Qt.size(200, 70)
    color: theme.bg
    onVisibleChanged: if (visible) monolith.forceActiveFocus()
    onClosed: app.windowOpen = false

    Monolith {
      id: monolith
      anchors.fill: parent
      app: app
      th: theme
      Component.onCompleted: forceActiveFocus()
    }
  }

  NotifyCards { app: app; th: theme }
}

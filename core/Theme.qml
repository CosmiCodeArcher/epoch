import QtQuick
import "theme.mjs" as Th

// The 12 design tokens as animated colors. When the Omarchy theme changes,
// every token eases to its new value: that color morph is part of the design.
Item {
  id: th
  visible: false

  property var tokens: Th.FALLBACK
  // Off for the first load so startup doesn't animate from the fallback palette.
  property bool animate: false

  property color bg: tokens["bg"]
  property color bgDark: tokens["bg-dark"]
  property color bgLight: tokens["bg-light"]
  property color fg: tokens["fg"]
  property color muted: tokens["muted"]
  property color accent: tokens["accent"]
  property color red: tokens["red"]
  property color yellow: tokens["yellow"]
  property color green: tokens["green"]
  property color cyan: tokens["cyan"]
  property color blue: tokens["blue"]
  property color magenta: tokens["magenta"]
  // color-mix(in oklab, fg 58%, bg), recomputed every frame of the morph.
  readonly property color dim: {
    const m = Th.mixRgb([fg.r, fg.g, fg.b], [bg.r, bg.g, bg.b], 0.58);
    return Qt.rgba(m[0], m[1], m[2], 1);
  }

  // CSS `ease`
  readonly property var ease: [0.25, 0.1, 0.25, 1, 1, 1]

  Behavior on bg { enabled: th.animate; ColorAnimation { duration: 750; easing.type: Easing.BezierSpline; easing.bezierCurve: th.ease } }
  Behavior on bgDark { enabled: th.animate; ColorAnimation { duration: 750; easing.type: Easing.BezierSpline; easing.bezierCurve: th.ease } }
  Behavior on bgLight { enabled: th.animate; ColorAnimation { duration: 750; easing.type: Easing.BezierSpline; easing.bezierCurve: th.ease } }
  Behavior on muted { enabled: th.animate; ColorAnimation { duration: 750; easing.type: Easing.BezierSpline; easing.bezierCurve: th.ease } }
  Behavior on fg {
    enabled: th.animate
    SequentialAnimation { PauseAnimation { duration: 100 } ColorAnimation { duration: 750; easing.type: Easing.BezierSpline; easing.bezierCurve: th.ease } }
  }
  Behavior on accent {
    enabled: th.animate
    SequentialAnimation { PauseAnimation { duration: 200 } ColorAnimation { duration: 900; easing.type: Easing.BezierSpline; easing.bezierCurve: th.ease } }
  }

  function c(name) {
    switch (name) {
      case "bg": return bg;
      case "bg-dark": return bgDark;
      case "bg-light": return bgLight;
      case "fg": return fg;
      case "muted": return muted;
      case "accent": return accent;
      case "red": return red;
      case "yellow": return yellow;
      case "green": return green;
      case "cyan": return cyan;
      case "blue": return blue;
      case "magenta": return magenta;
      case "dim": return dim;
    }
    return "transparent";
  }
}

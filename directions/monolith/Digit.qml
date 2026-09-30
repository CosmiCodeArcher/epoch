import QtQuick
import QtQuick.Effects
import "../../ui"

// One digit of HH:MM. When its value changes it drops in from above:
// translateY(-38%), opacity 0 and a 6px blur easing to rest over 520ms,
// staggered 40ms per digit position.
Txt {
  id: d
  property int index: 0
  property real drop: 0
  property bool ready: false

  opacity: 1 - drop
  transform: Translate { y: -0.38 * d.height * d.drop }
  layer.enabled: drop > 0.001
  layer.effect: MultiEffect { blurEnabled: true; blurMax: 12; blur: d.drop * 0.5 }

  onTextChanged: if (ready) fall.restart()
  Component.onCompleted: ready = true

  SequentialAnimation {
    id: fall
    PropertyAction { target: d; property: "drop"; value: 1 }
    PauseAnimation { duration: d.index * 40 }
    NumberAnimation { target: d; property: "drop"; to: 0; duration: 520; easing.type: Easing.BezierSpline; easing.bezierCurve: [0.2, 0.9, 0.1, 1, 1, 1] }
  }
}

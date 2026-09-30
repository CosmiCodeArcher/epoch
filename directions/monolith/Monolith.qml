import QtQuick
import "../../ui"
import "layout.mjs" as Lay

// Monolith: one enormous time, nothing else until you ask for it.
Item {
  id: root
  required property var app
  required property var th

  readonly property var lay: app.view ? Lay.layout(app.view, width, height) : null
  readonly property bool pinned: !!lay && lay.pin

  focus: true
  Keys.onPressed: event => {
    const e = root.keyOf(event);
    if (e && root.app.key(e, root.pinned)) event.accepted = true;
  }

  // Qt key event -> the DOM-style { key, ctrlKey, ... } the engine speaks.
  function keyOf(ev) {
    let k = "";
    switch (ev.key) {
      case Qt.Key_Escape: k = "Escape"; break;
      case Qt.Key_Return: case Qt.Key_Enter: k = "Enter"; break;
      case Qt.Key_Tab: case Qt.Key_Backtab: k = "Tab"; break;
      case Qt.Key_Backspace: k = "Backspace"; break;
      case Qt.Key_Delete: k = "Delete"; break;
      case Qt.Key_Up: k = "ArrowUp"; break;
      case Qt.Key_Down: k = "ArrowDown"; break;
      case Qt.Key_Left: k = "ArrowLeft"; break;
      case Qt.Key_Right: k = "ArrowRight"; break;
      default: k = ev.text;
    }
    const ctrl = (ev.modifiers & Qt.ControlModifier) !== 0;
    if (ctrl && ev.key >= Qt.Key_A && ev.key <= Qt.Key_Z) k = String.fromCharCode(97 + ev.key - Qt.Key_A);
    if (!k) return null;
    return { key: k, ctrlKey: ctrl, altKey: (ev.modifiers & Qt.AltModifier) !== 0, metaKey: (ev.modifiers & Qt.MetaModifier) !== 0 };
  }

  Rectangle { anchors.fill: parent; color: root.th.bg }

  Loader {
    anchors.fill: parent
    active: !!root.lay
    sourceComponent: Item {
      anchors.fill: parent
      readonly property var lay: root.lay

      ClockScreen { lay: parent.lay; th: root.th; visible: parent.lay.screen === "clock" }
      AlarmsScreen { lay: parent.lay; th: root.th; app: root.app; visible: parent.lay.screen === "alarms" }
      TimersScreen { lay: parent.lay; th: root.th; app: root.app; visible: parent.lay.screen === "timers" }
      StopwatchScreen { lay: parent.lay; th: root.th; visible: parent.lay.screen === "stopwatch" }
      WorldScreen { lay: parent.lay; th: root.th; app: root.app; visible: parent.lay.screen === "world" }

      CommandBar { lay: parent.lay; th: root.th; visible: parent.lay.cmdOpen && !parent.lay.pin }
      Help { lay: parent.lay; th: root.th; visible: parent.lay.help && !parent.lay.pin }
      Ringing { lay: parent.lay; th: root.th; visible: parent.lay.ringing }

      /* boot: EPOCH typed in bg on an fg fill, then a hard cut to the clock */
      Rectangle {
        anchors.fill: parent
        visible: parent.lay.booting
        color: root.th.fg
        Txt { x: parent.parent.lay.padX; anchors.verticalCenter: parent.verticalCenter; text: parent.parent.lay.bootText; fs: parent.parent.lay.bootFs; ls: -0.05; color: root.th.bg }
      }

      /* theme change: a hard accent wipe, 40% of the window wide, left → right */
      Rectangle {
        id: sweep
        property real t: 0
        visible: sweepAnim.running
        width: parent.width * 0.4
        height: parent.height
        x: -1.1 * width + t * 3.7 * width
        color: root.th.accent
        NumberAnimation { id: sweepAnim; target: sweep; property: "t"; from: 0; to: 1; duration: 620; easing.type: Easing.BezierSpline; easing.bezierCurve: [0.7, 0, 0.3, 1, 1, 1] }
        Connections { target: root.app; function onThemeSwept() { sweepAnim.restart(); } }
      }

      /* the four corner labels sit above everything, as in the design */
      Item {
        anchors.fill: parent
        visible: parent.lay.microShow
        readonly property var lay: parent.lay
        Txt { x: parent.lay.padX; y: parent.lay.padY; text: parent.lay.microTL; fs: parent.lay.microFs; ls: 0.18; weight: 700; color: root.th.dim }
        Txt { anchors.right: parent.right; anchors.rightMargin: parent.lay.padX; y: parent.lay.padY; text: parent.lay.microTR; fs: parent.lay.microFs; ls: 0.18; weight: 700; color: root.th.dim }
        Txt {
          x: parent.lay.padX; anchors.bottom: parent.bottom; anchors.bottomMargin: parent.lay.padY
          width: Math.min(implicitWidth, parent.width - parent.lay.padX * 2 - microBR.implicitWidth - 16); elide: Text.ElideRight
          text: parent.lay.microBL; fs: parent.lay.microFs; ls: 0.18; weight: 700; color: root.th.c(parent.lay.echoC)
        }
        Txt { id: microBR; anchors.right: parent.right; anchors.rightMargin: parent.lay.padX; anchors.bottom: parent.bottom; anchors.bottomMargin: parent.lay.padY; text: parent.lay.microBR; fs: parent.lay.microFs; ls: 0.18; weight: 700; color: root.th.dim }
      }
    }
  }
}

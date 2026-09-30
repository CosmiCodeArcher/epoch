import QtQuick
import Quickshell
import Quickshell.Wayland
import "../directions/monolith/layout.mjs" as Lay

// Epoch's own notification cards for finished timers, drawn on a layer-shell
// surface so they look exactly like the design: an inverted block with the big
// value, then title and body. They drop in at the top center (Omarchy's regular toasts own the top
// right) and leave after 9s or on click.
PanelWindow {
  id: win
  required property var app
  required property var th
  // Alarms take over the Epoch window itself, so a card on top would only repeat it.
  readonly property var notes: app.view ? app.view.notes.filter(n => n.kind === "timer") : []

  visible: notes.length > 0
  anchors.top: true
  margins.top: 36
  exclusionMode: ExclusionMode.Ignore
  focusable: false
  color: "transparent"
  implicitWidth: 420
  implicitHeight: Math.max(1, stack.implicitHeight)
  WlrLayershell.layer: WlrLayer.Overlay
  WlrLayershell.namespace: "epoch-notify"

  Column {
    id: stack
    width: parent.width
    spacing: 10
    Repeater {
      model: win.notes
      Rectangle {
        id: card
        required property var modelData
        readonly property var c: Lay.noteCard(modelData)
        width: stack.width
        height: Math.max(big.implicitHeight + 20, right.implicitHeight + 20)
        color: win.th.bg
        border.width: 2
        border.color: win.th.accent
        radius: 8
        clip: true
        Rectangle {
          id: block
          x: 2; y: 2
          width: big.implicitWidth + 32
          height: parent.height - 4
          color: win.th.fg
          Text {
            id: big
            anchors.centerIn: parent
            text: card.c.big
            color: win.th.bg
            font.family: "JetBrains Mono"; font.pixelSize: 44; font.weight: 800; font.letterSpacing: -0.05 * 44
          }
        }
        Column {
          id: right
          anchors.left: block.right
          anchors.leftMargin: 16
          anchors.right: parent.right
          anchors.rightMargin: 16
          anchors.verticalCenter: parent.verticalCenter
          Text { width: parent.width; elide: Text.ElideRight; text: card.c.title; color: win.th.fg; font.family: "JetBrains Mono"; font.pixelSize: 22; font.weight: 800; font.letterSpacing: -0.02 * 22 }
          Text { width: parent.width; elide: Text.ElideRight; text: card.c.body; color: win.th.accent; font.family: "JetBrains Mono"; font.pixelSize: 12; font.weight: 700; font.letterSpacing: 0.12 * 12 }
        }
        MouseArea { anchors.fill: parent; onClicked: win.app.act(engine => engine.dismissNote(card.modelData.id)) }
      }
    }
  }
}

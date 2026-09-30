import QtQuick
import "../../ui"

// `:` takes over the window. Suggestions stack above the typed command, which is
// the hero in giant type with a block cursor and ghost completion; a dry-run line
// below says exactly what Enter will do.
Rectangle {
  id: s
  required property var lay
  required property var th
  anchors.fill: parent
  color: th.bg

  property bool blinkOn: true
  Timer { interval: 500; running: s.visible; repeat: true; onTriggered: s.blinkOn = !s.blinkOn }
  onVisibleChanged: blinkOn = true

  Column {
    anchors.left: parent.left
    anchors.right: parent.right
    anchors.bottom: parent.bottom
    anchors.leftMargin: s.lay.padX
    anchors.rightMargin: s.lay.padX
    anchors.bottomMargin: s.lay.cmdOpen ? s.lay.cmdPadB : 0
    spacing: s.lay.gapPx

    Column {
      spacing: 0.5 * (s.lay.suggFs || 0)
      Repeater {
        model: s.lay.sugg || []
        Row {
          id: sg
          required property var modelData
          spacing: 1.2 * s.lay.suggFs
          Item {
            width: Math.max(kind.implicitWidth, 6 * 0.6 * s.lay.suggFs)
            height: kind.implicitHeight
            Txt { id: kind; text: sg.modelData.kind; fs: s.lay.suggFs; ls: 0.04; color: s.th.c(sg.modelData.c) }
          }
          Txt { text: sg.modelData.label; fs: s.lay.suggFs; ls: 0.04; color: s.th.c(sg.modelData.c) }
          Txt { text: sg.modelData.desc; fs: s.lay.suggFs; ls: 0.04; weight: 700; color: s.th.dim }
        }
      }
    }

    Item {
      width: parent.width
      height: typed.implicitHeight
      clip: true
      Row {
        id: typed
        Txt { text: ":"; fs: s.lay.cmdFs || 1; ls: -0.045; color: s.th.accent }
        Txt { text: s.lay.cmdText || ""; fs: s.lay.cmdFs || 1; ls: -0.045; color: s.th.fg; visible: text.length > 0 }
        Rectangle {
          width: cur.implicitWidth
          height: cur.implicitHeight
          color: s.th.accent
          opacity: s.blinkOn ? 1 : 0
          Txt { id: cur; text: s.lay.cursorCh || " "; fs: s.lay.cmdFs || 1; ls: -0.045; color: s.th.bg }
        }
        Txt { text: s.lay.cmdGhost || ""; fs: s.lay.cmdFs || 1; ls: -0.045; color: s.th.muted; visible: text.length > 0 }
      }
    }

    Item {
      width: parent.width
      height: head.implicitHeight
      Txt { id: head; text: s.lay.dry ? s.lay.dry.head : ""; fs: s.lay.dryFs || 1; ls: -0.01; color: s.th.c(s.lay.dry ? s.lay.dry.c : "fg") }
      Txt {
        x: head.implicitWidth + 0.6 * (s.lay.dryFs || 1)
        anchors.baseline: head.baseline
        text: s.lay.dry ? s.lay.dry.sub : ""; fs: (s.lay.dryFs || 1) * 0.6; ls: 0.14; color: s.th.dim
      }
    }
  }
}

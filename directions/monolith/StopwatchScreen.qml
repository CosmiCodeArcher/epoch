import QtQuick
import "../../ui"

// MM:SS enormous with hundredths in accent, then one bar per lap
// (the fastest in accent) and a micro status line.
Item {
  id: s
  required property var lay
  required property var th
  anchors.fill: parent

  Column {
    id: col
    x: s.lay.padX
    width: parent.width - s.lay.padX * 2
    anchors.verticalCenter: parent.verticalCenter
    anchors.verticalCenterOffset: (s.lay.listTop - s.lay.listBottom) / 2
    spacing: s.lay.gapPx

    Item {
      width: col.width
      height: main.implicitHeight
      Txt { id: main; text: s.lay.swMain; fs: s.lay.swFs; lh: 0.8; ls: -0.05; color: s.th.fg }
      Txt { x: main.implicitWidth; anchors.baseline: main.baseline; text: "." + s.lay.swCs; fs: s.lay.swFs * 0.36; ls: -0.02; color: s.th.accent }
    }
    Item {
      width: col.width
      height: s.lay.lapH
      Row {
        id: bars
        anchors.bottom: parent.bottom
        spacing: s.lay.lapGap
        readonly property int n: s.lay.lapBars.length
        Repeater {
          model: s.lay.lapBars
          Rectangle {
            required property var modelData
            anchors.bottom: parent.bottom
            width: (col.width - s.lay.lapGap * Math.max(0, bars.n - 1)) / Math.max(1, bars.n)
            height: s.lay.lapH * modelData.h
            color: s.th.c(modelData.c)
            Txt {
              anchors.horizontalCenter: parent.horizontalCenter
              y: 0.3 * s.lay.microFs
              text: parent.modelData.t; fs: s.lay.microFs; ls: 0.06; color: s.th.bg
            }
          }
        }
      }
    }
    Txt { text: s.lay.swMeta; fs: s.lay.microFs; ls: 0.2; weight: 700; color: s.th.dim }
  }
}

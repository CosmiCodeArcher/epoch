import QtQuick
import "../../ui"

// Home plus the added cities, one row each. Daytime cities invert, so day and
// night read through inversion rather than color; the selected row is accent.
Item {
  id: s
  required property var lay
  required property var th
  required property var app
  anchors.fill: parent

  Item {
    id: area
    x: s.lay.padX
    y: s.lay.listTop
    width: parent.width - s.lay.padX * 2
    height: parent.height - s.lay.listTop - s.lay.listBottom

    Column {
      anchors.fill: parent
      Repeater {
        model: s.lay.cities
        Rectangle {
          id: row
          required property var modelData
          readonly property color ink: s.th.c(modelData.c)
          readonly property real fs: s.lay.wRowFs
          width: area.width
          height: area.height / Math.max(1, s.lay.cities.length)
          color: modelData.bg ? s.th.c(modelData.bg) : "transparent"
          clip: true
          Rectangle { width: parent.width; height: 2; color: s.th.fg }
          Item {
            anchors.fill: parent
            anchors.leftMargin: 0.15 * row.fs
            anchors.rightMargin: 0.15 * row.fs
            Txt {
              id: time
              anchors.right: parent.right
              anchors.verticalCenter: parent.verticalCenter
              text: row.modelData.hhmm; fs: row.fs; ls: -0.045; color: row.ink
            }
            Txt {
              id: meta
              anchors.right: time.left
              anchors.rightMargin: s.lay.gapPx
              anchors.verticalCenter: parent.verticalCenter
              text: row.modelData.meta; fs: s.lay.microFs; ls: 0.2; weight: 700; color: row.ink
            }
            Txt {
              anchors.left: parent.left
              anchors.right: meta.left
              anchors.rightMargin: s.lay.gapPx
              anchors.verticalCenter: parent.verticalCenter
              text: row.modelData.name; fs: row.fs * 0.5; ls: -0.02; color: row.ink; elide: Text.ElideRight
            }
          }
          MouseArea {
            anchors.fill: parent
            onClicked: if (row.modelData.idx >= 0) s.app.act(engine => engine.selSet("world", row.modelData.idx))
          }
        }
      }
    }
  }
}

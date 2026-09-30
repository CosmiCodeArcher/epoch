import QtQuick
import "../../ui"

// Rows split evenly down the window, each with a hard 2px rule on top.
// Selected rows invert; disarmed alarms go muted and struck through.
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
        model: s.lay.alms
        Rectangle {
          id: row
          required property var modelData
          readonly property color ink: s.th.c(modelData.c)
          width: area.width
          height: area.height / Math.max(1, s.lay.alms.length)
          color: modelData.bg ? s.th.c(modelData.bg) : "transparent"
          clip: true
          Rectangle { width: parent.width; height: 2; color: s.th.fg }
          Row {
            x: 0.12 * s.lay.rowFs
            anchors.verticalCenter: parent.verticalCenter
            spacing: s.lay.gapPx
            Txt { anchors.verticalCenter: parent.verticalCenter; text: row.modelData.hhmm; fs: s.lay.rowFs; ls: -0.045; color: row.ink; strike: row.modelData.strike }
            Column {
              anchors.verticalCenter: parent.verticalCenter
              spacing: 0.12 * s.lay.rowFs
              Txt { text: row.modelData.label; fs: s.lay.rowFs * 0.42; ls: -0.02; color: row.ink; width: Math.min(implicitWidth, area.width * 0.55); elide: Text.ElideRight }
              Txt { text: row.modelData.meta; fs: s.lay.microFs; ls: 0.2; weight: 700; color: row.ink }
            }
          }
          MouseArea { anchors.fill: parent; onClicked: s.app.act(engine => engine.selSet("alarms", row.modelData.idx)) }
        }
      }
    }

    // Nothing set yet: say so in the same voice, and show how.
    Column {
      visible: s.lay.alms.length === 0
      anchors.verticalCenter: parent.verticalCenter
      spacing: s.lay.gapPx
      Txt { text: "NO ALARMS"; fs: Math.min(area.width / (9 * 0.555), area.height * 0.3); ls: -0.045; color: s.th.dim }
      Txt { text: "N OR :A 7:30 GYM WEEKDAYS"; fs: s.lay.microFs; ls: 0.2; weight: 700; color: s.th.dim }
    }
  }
}

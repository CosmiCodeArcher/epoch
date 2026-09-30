import QtQuick
import "../../ui"

// `?`: a full-window inversion listing every key.
Rectangle {
  id: s
  required property var lay
  required property var th
  anchors.fill: parent
  color: th.fg

  Grid {
    id: grid
    x: s.lay.padX
    anchors.verticalCenter: parent.verticalCenter
    columns: s.lay.helpCols
    columnSpacing: s.lay.helpFs
    rowSpacing: 0.15 * s.lay.helpFs
    readonly property real cellW: (s.width - s.lay.padX * 2 - (s.lay.helpCols - 1) * s.lay.helpFs) / s.lay.helpCols
    Repeater {
      model: s.lay.helpRows
      Item {
        id: cell
        required property var modelData
        width: grid.cellW
        height: k.implicitHeight
        clip: true
        Txt { id: k; text: cell.modelData.k; fs: s.lay.helpFs; ls: -0.03; color: s.th.accent }
        Txt { x: k.implicitWidth + 0.6 * s.lay.helpFs; text: cell.modelData.l; fs: s.lay.helpFs; ls: -0.03; color: s.th.bg }
      }
    }
  }
}

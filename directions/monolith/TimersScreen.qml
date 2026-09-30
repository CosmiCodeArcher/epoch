import QtQuick
import "../../ui"

// The selected timer is the hero: its name and state, an enormous countdown,
// a progress bar, and the other timers wrapping below.
Item {
  id: s
  required property var lay
  required property var th
  required property var app
  anchors.fill: parent

  readonly property var t: lay.tsel
  readonly property real pct: t.pct

  Column {
    id: col
    x: s.lay.padX
    width: parent.width - s.lay.padX * 2
    anchors.verticalCenter: parent.verticalCenter
    anchors.verticalCenterOffset: (s.lay.listTop - s.lay.listBottom) / 2
    spacing: s.lay.gapPx

    Item {
      width: col.width
      height: name.implicitHeight
      Txt { id: name; text: s.t.name; fs: s.lay.tNameFs; ls: -0.03; color: s.th.c(s.t.nc) }
      Txt {
        x: name.implicitWidth + 0.6 * s.lay.tNameFs * 0.4
        anchors.baseline: name.baseline
        text: s.t.state; fs: s.lay.tNameFs * 0.4; ls: 0.12; color: s.th.dim
      }
    }
    Txt { text: s.t.rem; fs: s.lay.tfs; lh: 0.8; ls: -0.05; color: s.th.fg; opacity: s.t.op }
    Rectangle {
      width: col.width
      height: s.lay.barH
      color: s.th.bgLight
      Rectangle {
        id: fill
        property real p: 0
        height: parent.height
        width: parent.width * p
        color: s.th.accent
        NumberAnimation { id: fillAnim; target: fill; property: "p"; duration: 1000; easing.type: Easing.Linear }
      }
    }
    Flow {
      width: col.width
      spacing: 1.4 * s.lay.tOthFs
      Repeater {
        model: s.lay.tothers
        Txt {
          required property var modelData
          text: modelData.name + " " + modelData.rem; fs: s.lay.tOthFs; ls: -0.02; color: s.th.c(modelData.c)
          MouseArea { anchors.fill: parent; onClicked: s.app.act(engine => engine.selSet("timers", parent.modelData.idx)) }
        }
      }
    }
  }

  // Progress eases forward each second; switching timers or restarting jumps.
  property string lastName: ""
  onPctChanged: {
    fillAnim.stop();
    if (t.name !== lastName || pct < fill.p) { lastName = t.name; fill.p = pct; return; }
    fillAnim.to = pct; fillAnim.start();
  }
  Component.onCompleted: { lastName = t.name; fill.p = pct; }
}

import QtQuick
import "../../ui"

// The whole window is the time. Faces: digits (row, or stacked HH over MM in a
// half tile), words and hex. A seconds bar runs along the bottom edge.
Item {
  id: s
  required property var lay
  required property var th
  anchors.fill: parent

  readonly property real cfs: lay.cfs
  readonly property real secPct: lay.secPct

  /* digits, row: HH:MM centered, colon in accent */
  Row {
    visible: s.lay.face === "digits" && !s.lay.stack
    anchors.centerIn: parent
    Digit { index: 0; text: s.lay.digits[0]; fs: s.cfs; ls: -0.045; color: s.th.fg }
    Digit { index: 1; text: s.lay.digits[1]; fs: s.cfs; ls: -0.045; color: s.th.fg }
    Item {
      width: colon.implicitWidth - 0.12 * s.cfs
      height: colon.implicitHeight
      Txt { id: colon; x: -0.06 * s.cfs; text: ":"; fs: s.cfs; ls: -0.045; color: s.th.accent }
    }
    Digit { index: 2; text: s.lay.digits[2]; fs: s.cfs; ls: -0.045; color: s.th.fg }
    Digit { index: 3; text: s.lay.digits[3]; fs: s.cfs; ls: -0.045; color: s.th.fg }
  }

  /* digits, stacked (half tile): hours, an accent rule, minutes; no colon */
  Column {
    id: stack
    visible: s.lay.face === "digits" && s.lay.stack
    x: s.lay.padX
    anchors.verticalCenter: parent.verticalCenter
    Row {
      id: hours
      Digit { index: 0; text: s.lay.digits[0]; fs: s.cfs; lh: 0.74; ls: -0.045; color: s.th.fg }
      Digit { index: 1; text: s.lay.digits[1]; fs: s.cfs; lh: 0.74; ls: -0.045; color: s.th.fg }
    }
    Item { width: 1; height: s.lay.ruleM }
    Rectangle { width: hours.width; height: s.lay.ruleH; color: s.th.accent }
    Item { width: 1; height: s.lay.ruleM }
    Row {
      Digit { index: 2; text: s.lay.digits[2]; fs: s.cfs; lh: 0.74; ls: -0.045; color: s.th.fg }
      Digit { index: 3; text: s.lay.digits[3]; fs: s.cfs; lh: 0.74; ls: -0.045; color: s.th.fg }
    }
  }

  /* words: one word per line, the hour in accent */
  Column {
    visible: s.lay.face === "words"
    x: s.lay.padX
    width: parent.width - s.lay.padX * 2
    anchors.verticalCenter: parent.verticalCenter
    Repeater {
      model: s.lay.wlines
      Txt { required property var modelData; text: modelData.t; fs: s.lay.wfs; lh: 0.86; ls: -0.045; color: s.th.c(modelData.c) }
    }
  }

  /* hex: the day as a fraction of 65536, 0x prefix in accent */
  Item {
    visible: s.lay.face === "hex"
    width: prefix.implicitWidth + 0.08 * prefix.fs + hexText.implicitWidth
    height: hexText.implicitHeight
    anchors.verticalCenter: parent.verticalCenter
    x: s.lay.stack ? s.lay.padX : (parent.width - width) / 2
    Txt { id: prefix; text: "0x"; fs: s.lay.xfs * 0.34; ls: -0.045; color: s.th.accent; anchors.baseline: hexText.baseline }
    Txt { id: hexText; x: prefix.implicitWidth + 0.08 * prefix.fs; text: s.lay.hex; fs: s.lay.xfs; ls: -0.045; color: s.th.fg }
  }

  /* seconds bar: full-bleed along the bottom edge, 0→100% each minute */
  Rectangle {
    id: bar
    property real p: 0
    anchors.left: parent.left
    anchors.bottom: parent.bottom
    height: s.lay.secH
    width: s.width * p
    color: s.th.fg
    NumberAnimation { id: barAnim; target: bar; property: "p"; duration: 1000; easing.type: Easing.Linear }
  }
  onSecPctChanged: {
    if (secPct < bar.p - 0.001) { barAnim.stop(); bar.p = secPct; return; } // wrapped 59 → 0: jump
    barAnim.stop(); barAnim.to = secPct; barAnim.start();
  }
  Component.onCompleted: bar.p = secPct
}

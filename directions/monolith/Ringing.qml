import QtQuick
import "../../ui"

// The alarm takes over the window, flashing fg ↔ accent every 500ms. The only
// ways out are typing the prompt backwards or snoozing; wrong answers shake.
Rectangle {
  id: s
  required property var lay
  required property var th
  anchors.fill: parent
  color: th.c(lay.ringBg || "fg")

  readonly property var r: lay.ring || ({ label: "", daysStr: "", since: "", hhmm: "", prompt: "", chars: [], errs: 0 })
  readonly property int errs: r.errs

  property bool blinkOn: true
  Timer { interval: 500; running: s.visible; repeat: true; onTriggered: s.blinkOn = !s.blinkOn }

  Column {
    x: s.lay.padX
    width: parent.width - s.lay.padX * 2
    anchors.verticalCenter: parent.verticalCenter
    spacing: s.lay.gapPx

    Txt { text: "ALARM · " + s.r.label + " · " + s.r.daysStr + " · RINGING " + s.r.since; fs: s.lay.microFs; ls: 0.3; weight: 700; color: s.th.bg }
    Txt { text: s.r.hhmm; fs: s.lay.ringFs || 1; lh: 0.8; ls: -0.05; color: s.th.bg }
    Txt { text: "TYPE “" + s.r.prompt + "” BACKWARDS"; fs: s.lay.ringQFs || 1; ls: -0.02; color: s.th.bg }
    Item {
      width: parent.width
      height: Math.max(input.implicitHeight, s.lay.ringInFs || 1)
      Row {
        id: input
        property real shake: 0
        x: shake
        anchors.verticalCenter: parent.verticalCenter
        Repeater {
          model: s.r.chars
          Txt { required property var modelData; text: modelData.ch; fs: s.lay.ringInFs || 1; ls: -0.02; color: s.th.bg; strike: modelData.strike; strikeEm: 0.08 }
        }
        Rectangle {
          anchors.verticalCenter: parent.verticalCenter
          width: 0.5 * (s.lay.ringInFs || 1)
          height: 0.9 * (s.lay.ringInFs || 1)
          color: s.th.bg
          opacity: s.blinkOn ? 1 : 0
        }
      }
    }
    Txt { text: s.lay.ringMsg || ""; fs: s.lay.microFs; ls: 0.24; weight: 700; color: s.th.bg }
  }

  // 420ms damped shake: 0, −14, +12, −8, +5, 0 px
  SequentialAnimation {
    id: shakeAnim
    NumberAnimation { target: input; property: "shake"; to: -14; duration: 84 }
    NumberAnimation { target: input; property: "shake"; to: 12; duration: 84 }
    NumberAnimation { target: input; property: "shake"; to: -8; duration: 84 }
    NumberAnimation { target: input; property: "shake"; to: 5; duration: 84 }
    NumberAnimation { target: input; property: "shake"; to: 0; duration: 84 }
  }
  onErrsChanged: if (errs > 0) shakeAnim.restart()
}

import QtQuick

// One line of text laid out like CSS: the box is `lh` × font size tall and the
// glyphs sit centered in it (half-leading), so the design's tight line-heights
// (.74, .8, .86) land where they do in the browser. Letter spacing is in em.
Item {
  id: root
  property alias text: t.text
  property real fs: 16
  property real lh: 1
  property real ls: 0
  property int weight: 800
  property color color: "white"
  property bool strike: false
  property real strikeEm: 0.06
  property alias elide: t.elide
  property alias horizontalAlignment: t.horizontalAlignment
  readonly property alias contentWidth: t.contentWidth
  readonly property alias textItem: t

  implicitWidth: t.implicitWidth
  implicitHeight: Math.round(fs * lh)
  baselineOffset: t.y + t.baselineOffset

  Text {
    id: t
    width: root.width > 0 ? root.width : implicitWidth
    y: Math.round((root.height - implicitHeight) / 2)
    color: root.color
    textFormat: Text.PlainText
    wrapMode: Text.NoWrap
    font.family: "JetBrains Mono"
    font.pixelSize: Math.max(1, root.fs)
    font.weight: root.weight
    font.letterSpacing: root.ls * root.fs
    font.features: { "liga": 0, "calt": 0, "tnum": 1 }
    font.hintingPreference: Font.PreferNoHinting
  }

  // CSS text-decoration: line-through with an explicit thickness.
  Rectangle {
    visible: root.strike && root.text.length > 0
    color: root.color
    x: 0
    width: t.contentWidth
    height: Math.max(1, Math.round(root.fs * root.strikeEm))
    y: t.y + t.baselineOffset - root.fs * 0.3 - height / 2
  }
}

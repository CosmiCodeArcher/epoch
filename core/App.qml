import QtQuick
import Quickshell
import Quickshell.Io
import "engine.mjs" as Eng
import "theme.mjs" as Th

// Hosts the engine: drives its clock, saves its state, feeds it the Omarchy
// theme and time zone offsets, and turns its events into sound and notifications.
Scope {
  id: app

  // { id, faces, puzzle } of the direction being drawn.
  required property var direction

  property var engine: null
  property var view: null
  property bool windowOpen: Quickshell.env("EPOCH_HIDDEN") !== "1"
  // Demo recordings only: EPOCH_CLOCK=<epoch ms> starts Epoch's clock at that
  // moment (it then runs normally), so re-shot footage can match earlier footage.
  readonly property real clockOffset: Quickshell.env("EPOCH_CLOCK") ? Number(Quickshell.env("EPOCH_CLOCK")) - Date.now() : 0

  property var tokens: Th.FALLBACK
  property string themeName: ""
  property bool themeLoaded: false
  signal themeSwept()

  property var tzOffsets: ({})
  property int ringSeq: 0
  readonly property bool ringing: !!(view && view.ring)
  signal ringStarted()

  readonly property string homeDir: Quickshell.env("HOME")
  readonly property string stateDir: (Quickshell.env("XDG_STATE_HOME") || homeDir + "/.local/state") + "/epoch"
  readonly property string omarchyCurrent: homeDir + "/.local/state/omarchy/current"
  readonly property string sounds: "/usr/share/sounds/freedesktop/stereo"
  property string lastSaved: ""

  /* ---------- engine plumbing ---------- */
  function refresh() {
    view = engine.view();
    if (view.ring && view.ring.seq !== ringSeq) { ringSeq = view.ring.seq; windowOpen = true; ringStarted(); }
    const s = JSON.stringify(engine.serialize());
    if (s !== lastSaved) { lastSaved = s; saveTimer.restart(); }
  }
  function schedule() { ticker.interval = Math.max(10, engine.nextDelay()); ticker.restart(); }
  function pump() { engine.step(); refresh(); schedule(); }
  // e: DOM-style key event. Returns true when the engine used it.
  function key(e, pinned) {
    const used = engine.handleKey(e, pinned);
    if (used) { refresh(); schedule(); }
    return used;
  }
  // Run an engine action from the UI (clicks, IPC) and redraw.
  function act(fn) { fn(engine); refresh(); schedule(); }

  function onNote(note) {
    const alarm = note.kind === "alarm";
    const title = alarm ? note.title : note.title + " done";
    const body = alarm ? note.body : "timer · " + Eng.durWords(note.dur);
    Quickshell.execDetached(["notify-send", "-a", "Epoch", "-h", "string:omarchy-glyph:" + (alarm ? "" : ""), title.toUpperCase(), body.toUpperCase()]);
    if (!alarm) Quickshell.execDetached(["pw-play", sounds + "/complete.oga"]);
  }

  function onTz(text) {
    const lines = String(text || "").trim().split("\n");
    const local = (lines.shift() || "").trim();
    const map = {};
    lines.forEach(l => {
      const m = l.match(/^(\S+) ([+-])(\d\d)(\d\d)$/);
      if (m) map[m[1]] = (m[2] === "-" ? -1 : 1) * (+m[3] * 60 + +m[4]);
    });
    tzOffsets = map;
    if (local && engine && engine.home.tz !== local) engine.setLocalTz(local);
    if (engine) refresh();
  }

  // theme.name and colors.toml load independently and in either order, so each
  // one calls this and it applies once both are in. The first apply is instant;
  // every later theme change animates and sweeps.
  property string colorsText: ""
  function syncTheme() {
    if (!themeName || !colorsText) return;
    tokens = Th.tokensFromColors(colorsText).tokens;
    const id = Eng.themeId(themeName);
    const changed = themeLoaded && engine.theme.id !== id;
    engine.setTheme(id, Eng.themeLabel(id));
    refresh();
    if (changed) themeSwept();
    themeLoaded = true;
  }

  Component.onCompleted: {
    engine = Eng.createEngine({
      now: () => Date.now() + app.clockOffset,
      localTz: "",
      tzOffset: (tz, ms) => { const v = app.tzOffsets[tz]; return v === undefined ? null : v; },
      direction: app.direction,
      onNotify: note => app.onNote(note),
      onThemeSet: id => Quickshell.execDetached(["bash", "-lc", "omarchy theme set " + id]),
    });
    const raw = stateFile.text();
    if (raw) {
      try { engine.load(JSON.parse(raw)); } catch (err) { console.warn("epoch: ignoring unreadable state file:", err); }
    }
    lastSaved = JSON.stringify(engine.serialize());
    engine.step();
    refresh();
    schedule();
  }

  Timer { id: ticker; repeat: false; onTriggered: app.pump() }

  /* ---------- state file ---------- */
  Process { running: true; command: ["mkdir", "-p", app.stateDir] }
  FileView {
    id: stateFile
    path: app.stateDir + "/state.json"
    blockLoading: true
    printErrors: false
    atomicWrites: true
  }
  Timer { id: saveTimer; interval: 400; onTriggered: stateFile.setText(app.lastSaved) }

  /* ---------- Omarchy theme ---------- */
  // omarchy-theme-set swaps the whole theme directory, then rewrites theme.name,
  // so watching theme.name and re-reading colors.toml catches every switch.
  FileView {
    path: app.omarchyCurrent + "/theme.name"
    watchChanges: true
    printErrors: false
    onFileChanged: reload()
    onLoaded: {
      const name = text().trim();
      if (!name) return; // caught mid-rewrite; the next change event has it
      app.themeName = name;
      app.syncTheme();
      colorsFile.reload();
      themeList.running = true;
    }
  }
  FileView {
    id: colorsFile
    path: app.omarchyCurrent + "/theme/colors.toml"
    printErrors: false
    onLoaded: { app.colorsText = text(); app.syncTheme(); }
  }
  Process {
    id: themeList
    command: ["bash", "-lc", "omarchy theme list"]
    stdout: StdioCollector {
      onStreamFinished: app.engine.themeList = String(text).split("\n").map(s => Eng.themeId(s)).filter(s => s.length > 0)
    }
  }

  /* ---------- time zones ---------- */
  // QML has no Intl, so the system's tz database answers instead: one line with
  // the local zone ($TZ if set, else /etc/localtime), then "<zone> <+hhmm>" for
  // every built-in city. Re-run every five minutes to pick up DST changes.
  Process {
    id: tzProc
    running: true
    command: ["bash", "-c", "if [ -n \"$TZ\" ]; then echo \"${TZ#:}\"; else readlink -f /etc/localtime | sed 's#.*/zoneinfo/##'; fi; for tz in \"$@\"; do printf '%s %s\\n' \"$tz\" \"$(TZ=$tz date +%z)\"; done", "epoch-tz"].concat(Eng.TIMEZONES)
    stdout: StdioCollector { onStreamFinished: app.onTz(text) }
  }
  Timer { interval: 300000; running: true; repeat: true; onTriggered: tzProc.running = true }

  /* ---------- alarm sound ---------- */
  // Loops until the alarm is dismissed or snoozed.
  Process {
    id: alarmSound
    command: ["pw-play", app.sounds + "/alarm-clock-elapsed.oga"]
    onExited: if (app.ringing) soundGap.restart()
  }
  Timer { id: soundGap; interval: 250; onTriggered: if (app.ringing) alarmSound.running = true }
  onRingingChanged: {
    if (ringing) alarmSound.running = true;
    else { soundGap.stop(); alarmSound.running = false; }
  }
  // Bring the window forward so the prompt gets the keyboard (Lua dispatcher on
  // Hyprland 0.56+, classic syntax before that).
  onRingStarted: Quickshell.execDetached(["bash", "-c", "hyprctl dispatch 'hl.dsp.focus({ window = \"class:^(epoch)$\" })' >/dev/null 2>&1 || hyprctl dispatch focuswindow 'class:^(epoch)$'"])

  /* ---------- IPC: `epoch <verb>` ---------- */
  IpcHandler {
    target: "epoch"
    function open(): void { app.windowOpen = true; }
    function close(): void { app.windowOpen = false; }
    function toggle(): void { app.windowOpen = !app.windowOpen; }
    function ring(): void { app.act(engine => engine.demoRing()); }
    // Press keys as if typed into the window: `epoch key "?"`, `epoch key Escape`.
    function key(name: string): void {
      const named = ["Escape", "Enter", "Tab", "Backspace", "Delete", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      const keys = named.indexOf(name) >= 0 ? [name] : name.split("");
      keys.forEach(k => app.key({ key: k, ctrlKey: false, altKey: false, metaKey: false }, false));
    }
    // Run a command-bar line from a terminal: `epoch t 25m tea`.
    function run(line: string): string {
      const p = app.engine.parse(line);
      if (!p.ok) return "✗ " + (p.err || "nothing to run");
      app.act(() => p.run());
      return "→ " + p.summary + (p.detail ? "  (" + p.detail + ")" : "");
    }
  }
}

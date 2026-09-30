// Monolith layout: every size and string the views draw, from one engine view
// and the window size. A direct port of renderVals() in the design handoff's
// EpochMonolith.dc.html. Colors are returned as token names ('fg', 'accent', ...)
// and resolved by the QML side, so the theme morph animates them.

export const FACES = ['digits', 'words', 'hex'];
const CW = 0.6; // JetBrains Mono advance width, in em

// The design's four size modes, picked from the real window size.
export function sizeMode(W, H) {
  if (H <= 140 || W <= 300) return 'pin';
  if (W < H * 0.95) return 'half';
  if (W <= 760 || H <= 480) return 'float';
  return 'stage';
}

const durWords = ms => { const s = Math.round(ms / 1000); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; const p2 = n => String(n).padStart(2, '0'); if (h) return `${h}h ${p2(m)}m`; if (m) return ss ? `${m}m ${p2(ss)}s` : `${m}m`; return `${ss}s`; };
const clockDur = ms => { const p2 = n => String(n).padStart(2, '0'); const s = Math.ceil(Math.max(0, ms) / 1000); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return h ? `${h}:${p2(m)}:${p2(ss)}` : `${p2(m)}:${p2(ss)}`; };
const up = s => String(s).toUpperCase();

export function layout(V, W, H) {
  const size = sizeMode(W, H);
  const stage = size === 'stage', half = size === 'half', flt = size === 'float', pin = size === 'pin';
  const padX = pin ? 10 : flt ? 18 : 40, padY = pin ? 8 : flt ? 14 : 30, microFs = pin ? 9 : flt ? 10 : 13;
  const gapPx = pin ? 6 : flt ? 10 : 22;
  const o = { size, stage, half, flt, pin, padX, padY, microFs, gapPx };
  const scr = pin ? 'clock' : V.screen;
  o.screen = scr;
  o.microShow = !pin;
  const na = V.nextAlarm;
  // Corner labels. The design gives stage, half (~940px) and float variants;
  // narrower tiles step down to the short forms so the corners never collide.
  const chW = microFs * 0.78; // 0.6em advance + 0.18em letter spacing
  const fits = (a, b) => (a.length + b.length) * chW + 24 <= W - padX * 2;
  const date = up(`${V.Dow} ${V.dd} ${V.Mon}`);
  const tl = [date + ` · ${up(scr)}`, date], tr = [`WEEK ${V.week} · ${(V.dayPct * 100).toFixed(1)}% · [?] KEYS`, '[?]'];
  let ti = flt ? 1 : 0, tj = flt ? 1 : 0;
  if (!fits(tl[ti], tr[tj])) tj = 1;
  if (!fits(tl[ti], tr[tj])) ti = 1;
  o.microTL = tl[ti]; o.microTR = tr[tj];
  o.microBL = V.echo ? up(V.echo.text) : na ? up(`NEXT ${na.hhmm} ${na.label} · ${na.inStr}`) : 'NO ALARMS';
  o.echoC = V.echo && V.echo.err ? 'red' : V.echo ? 'fg' : 'dim';
  const br = [`${V.hh}:${V.mm}:${V.ss} · ${up(V.theme.name)}`, V.ss];
  o.microBR = br[flt || !fits(o.microBL, br[0]) ? 1 : 0];
  o.listTop = padY + microFs * 2.4; o.listBottom = padY + microFs * 2.4;
  const innerW = W - padX * 2, innerH = H - (pin ? 10 : padY * 2 + microFs * 5);
  o.innerW = innerW; o.innerH = innerH;

  /* clock */
  const face = pin ? 'digits' : V.face.name;
  o.face = face;
  o.digits = [V.hh[0], V.hh[1], V.mm[0], V.mm[1]];
  o.stack = half;
  const wEm = 5 * CW - 4 * 0.045;
  o.cfs = Math.floor(half ? Math.min(innerW / (2 * CW - 0.045), innerH / 2 / 0.78) : Math.min(innerW / wEm, innerH / 0.76));
  o.ruleH = Math.max(6, Math.round(o.cfs * 0.025)); o.ruleM = Math.round(o.cfs * 0.05);
  o.secH = pin ? 4 : flt ? 5 : 8; o.secPct = V.secPct;
  const words = V.words.words;
  const maxLen = Math.max.apply(null, words.map(w => w.length));
  o.wfs = Math.floor(Math.min(innerW / (maxLen * CW - maxLen * 0.045), innerH / (words.length * 0.86)));
  o.wlines = words.map((t, i) => ({ t, c: i === words.length - 1 ? 'accent' : 'fg' }));
  o.xfs = Math.floor(Math.min(innerW / (4 * CW + 0.34 * 2 * CW), innerH / 0.76));
  o.hex = V.hex;

  /* alarms */
  const AL = V.alarms.slice(0, stage ? 5 : 4), nA = Math.max(1, AL.length);
  o.rowFs = Math.floor(Math.min((innerH / nA) * 0.78, innerW / 4.6));
  // The meta (`M T W T F · · · IN 17H 02M`) is one line when the row is wide
  // enough, else the days and the countdown stack on two lines; only when even
  // that won't fit does it fall back to named days, then the countdown alone.
  const metaRoom = innerW - 0.12 * o.rowFs - 5 * (CW - 0.045) * o.rowFs - gapPx - 8;
  const metaFits = lines => lines.every(s => s.length * microFs * (CW + 0.2) <= metaRoom);
  o.alms = AL.map(a => {
    const when = a.on ? up(a.inStr) : 'OFF';
    const days = a.days ? a.mask.map(m => m.on ? m.l : '·').join(' ') : 'ONCE';
    const forms = [[`${days} · ${when}`], [days, when], [up(a.daysStr), when], [when]];
    return {
      idx: a.idx, hhmm: a.hhmm, label: up(a.label), strike: !a.on, meta: forms.find(metaFits) || [when],
      bg: a.sel ? 'fg' : null, c: a.sel ? 'bg' : a.on ? 'fg' : 'muted',
    };
  });

  /* timers */
  const T = V.timers, ts = T.find(t => t.sel) || T[0];
  if (ts) {
    const rem = ts.done ? '00:00' : ts.remStr;
    o.tfs = Math.floor(Math.min(innerW / (rem.length * CW - rem.length * 0.05), innerH * 0.56 / 0.8));
    o.tNameFs = Math.floor(Math.min(o.tfs * 0.24, innerW / (ts.name.length * CW + 4)));
    o.tsel = { name: up(ts.name), state: up(ts.stateWord), rem, pct: ts.pct, nc: ts.done ? 'accent' : 'fg', op: ts.paused ? 0.45 : 1, empty: false };
  } else {
    o.tfs = Math.floor(Math.min(innerW / (5 * CW - 5 * 0.05), innerH * 0.56 / 0.8)); o.tNameFs = Math.floor(Math.min(o.tfs * 0.24, innerW / 12));
    o.tsel = { name: 'NO TIMERS', state: ':T 25M TEA', rem: '--:--', pct: 0, nc: 'dim', op: 0.4, empty: true };
  }
  o.barH = pin ? 4 : flt ? 6 : 12; o.tOthFs = Math.round(Math.min(stage ? 34 : half ? 28 : 16, innerW / 30));
  o.tothers = T.filter(t => t !== ts).map(t => ({
    idx: t.idx, name: up(t.name),
    rem: t.done ? 'DONE' : t.paused ? '‖ ' + t.remStr : t.queued ? '… ' + clockDur(t.dur) : t.remStr,
    c: t.done ? 'accent' : t.running ? 'fg' : 'dim',
  }));

  /* stopwatch */
  const swm = V.sw.str.main;
  o.swMain = swm; o.swCs = V.sw.str.cs;
  o.swFs = Math.floor(Math.min(innerW / ((swm.length + 1.1) * CW - swm.length * 0.05), innerH * 0.55 / 0.8));
  o.lapH = Math.round(innerH * (flt ? 0.26 : 0.3)); o.lapGap = flt ? 4 : 8;
  o.lapBars = V.sw.laps.map(l => ({ h: 0.22 + l.norm * 0.78, c: l.best ? 'accent' : 'fg', t: flt ? '' : String(l.n) }));
  o.swMeta = `${V.sw.running ? 'RUNNING' : 'STOPPED'} · LAP ${V.sw.n + 1} ${V.sw.curStr} · MEAN ${V.sw.meanStr} · ␣ L R`;

  /* world */
  const cs = [V.home].concat(V.world).slice(0, stage ? 6 : 5);
  o.wRowFs = Math.floor(Math.min((innerH / cs.length) * 0.8, innerW / 7.2));
  o.cities = cs.map(c => {
    const isHome = c.id === 'home', inv = c.isDay;
    const offPart = isHome ? 'LOCAL' : c.known ? up(c.offStr) + (c.dayDiff ? ' ' + c.dayDiff : '') : '…';
    return {
      idx: isHome ? -1 : c.idx, name: (isHome ? '⌂ ' : '') + up(c.name), hhmm: c.hhmm,
      meta: flt ? (isHome ? 'LOCAL' : up(c.offStr)) : `${offPart} · ${c.isDay ? 'DAY' : 'NIGHT'}`,
      bg: c.sel && !isHome ? 'accent' : inv ? 'fg' : null, c: (c.sel && !isHome) || inv ? 'bg' : 'fg',
    };
  });

  /* command bar */
  o.cmdOpen = !!V.cmd.open;
  if (V.cmd.open) {
    const c = V.cmd; const full = ':' + c.text + (c.ghost || ' ');
    o.cmdFs = Math.floor(Math.min(innerW / (Math.max(8, full.length) * CW), stage ? 190 : half ? 120 : 56));
    o.suggFs = stage ? 22 : half ? 18 : 11; o.dryFs = stage ? 40 : half ? 30 : 16; o.cmdPadB = padY + microFs * 3;
    o.cmdText = up(c.text); o.cursorCh = c.ghost ? up(c.ghost[0]) : ' '; o.cmdGhost = c.ghost ? up(c.ghost.slice(1)) : '';
    o.sugg = c.sugg.slice(0, flt ? 3 : 5).map(x => ({ kind: up(x.kind), label: up(x.label), desc: up(x.desc), c: x.sel ? 'accent' : 'fg' }));
    const p = c.parse;
    o.dry = c.err ? { head: '✗ ' + up(c.err), sub: '', c: 'red' }
      : p.ok ? { head: '→ ' + up(p.summary), sub: up(p.detail || ''), c: 'accent' }
      : { head: c.text ? up(p.err || '…') : 'TYPE A COMMAND', sub: '⇥ COMPLETE · ⏎ RUN · ESC', c: 'dim' };
  }

  /* help */
  o.help = !!V.help;
  o.helpCols = stage ? 2 : 1;
  const HELP = [['A', 'alarms'], ['T', 'timers'], ['S', 'stopwatch'], ['W', 'world'], ['C', 'clock'], [':', 'command'], ['F', 'face'], ['␣', 'toggle'], ['↑↓', 'select'], ['K', 'kill'], ['X', 'delete'], ['L R', 'lap reset'], ['N', 'new'], ['U', 'undo'], ['ESC', 'back']];
  // Rows are 1em tall with .15em between; size the type so every row fits.
  const helpRowsN = Math.ceil(HELP.length / o.helpCols);
  o.helpFs = Math.floor(Math.min(stage ? 58 : 40, (H - padY * 2) / (helpRowsN * 1.15)));
  o.helpRows = HELP.map(r => ({ k: r[0], l: up(r[1]) }));

  /* ringing */
  o.ringing = !!V.ring;
  if (V.ring) {
    const r = V.ring;
    o.ring = { label: up(r.label), daysStr: up(r.daysStr), since: up(r.since), hhmm: r.hhmm, prompt: up(r.prompt), chars: r.chars.map(c => ({ ch: up(c.ch), strike: !c.ok })), errs: r.errs };
    o.ringBg = r.blink ? 'fg' : 'accent';
    o.ringFs = Math.floor(Math.min(innerW / (5 * CW - 0.2), innerH * 0.5 / 0.8)); o.ringQFs = Math.floor(Math.min(o.ringFs * 0.16, innerW / 26)); o.ringInFs = Math.floor(o.ringFs * 0.36);
    o.ringMsg = r.errs ? `WRONG × ${r.errs} · STILL RINGING` : `⏎ SUBMIT · ⇥ SNOOZE 5M${r.demo ? ' · ESC EXIT DEMO' : ''}`;
  }

  /* boot */
  o.booting = !!V.booting;
  o.bootText = 'EPOCH'.slice(0, Math.max(1, Math.ceil(V.bootT * 6)));
  o.bootFs = Math.floor(Math.min(innerW / (5 * CW), innerH / 0.76));
  return o;
}

// Notification card content for a note from the engine.
export function noteCard(x) {
  const t = x.kind === 'timer';
  return { big: t ? '0:00' : x.hhmm, title: up(t ? `${x.title} done` : x.title), body: up(t ? `timer · ${durWords(x.dur)} · click to dismiss` : 'alarm · type to stop') };
}

// Epoch engine: all clock state and the command language, with no UI in it.
// Ported from the design handoff's epoch-core.js. It runs in Node (tests) and in
// Quickshell's QML JavaScript engine, which is roughly ES2017: no object spread,
// no Object.fromEntries, no Array#flat, no class fields, no Intl. Keep it that way.

/* ---------- small helpers ---------- */
export const p2 = n => String(n).padStart(2, '0');
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const RAD = Math.PI / 180;
const assign = Object.assign;

export const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dowIdx = d => (d.getDay() + 6) % 7;

export const hm = d => p2(d.getHours()) + ':' + p2(d.getMinutes());
export const durWords = ms => { const s = Math.round(ms / 1000); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; if (h) return `${h}h ${p2(m)}m`; if (m) return ss ? `${m}m ${p2(ss)}s` : `${m}m`; return `${ss}s`; };
export const clockDur = ms => { const s = Math.ceil(Math.max(0, ms) / 1000); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return h ? `${h}:${p2(m)}:${p2(ss)}` : `${p2(m)}:${p2(ss)}`; };
export const relIn = ms => { const mm = Math.max(0, Math.round(ms / 6e4)); const h = Math.floor(mm / 60), m = mm % 60; if (h >= 24) return `in ${Math.floor(h / 24)}d ${h % 24}h`; return h ? `in ${h}h ${p2(m)}m` : `in ${m}m`; };
export const swStr = ms => { const cs = Math.floor(ms / 10) % 100, s = Math.floor(ms / 1000); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return { main: h ? `${h}:${p2(m)}:${p2(ss)}` : `${p2(m)}:${p2(ss)}`, cs: p2(cs) }; };
export const lapStr = ms => { const s = Math.floor(ms / 1000), cs = Math.floor(ms / 10) % 100; return `${Math.floor(s / 60)}:${p2(s % 60)}.${p2(cs)}`; };
export const offStr = min => { if (!min) return '±0'; const s = min > 0 ? '+' : '−'; const a = Math.abs(min); return s + Math.floor(a / 60) + (a % 60 ? ':' + p2(a % 60) : 'h'); };

export function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dn = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - dn + 3);
  const fy = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((t - fy) / 864e5 - 3 + ((fy.getUTCDay() + 6) % 7)) / 7);
}
export function daysStr(days) {
  if (!days) return 'once';
  const k = days.join('');
  if (k === '1111111') return 'daily'; if (k === '1111100') return 'weekdays'; if (k === '0000011') return 'weekends';
  if (k === '0000000') return 'never';
  return DOW.filter((_, i) => days[i]).map(s => s.toLowerCase()).join(' ');
}

/* ---------- cities ---------- */
const C = (id, name, code, tz, lat, lon) => ({ id, name, code, tz, lat, lon });
export const CITIES = [
  C('tokyo', 'Tokyo', 'TYO', 'Asia/Tokyo', 35.68, 139.69), C('london', 'London', 'LON', 'Europe/London', 51.51, -0.13),
  C('new-york', 'New York', 'NYC', 'America/New_York', 40.71, -74.01), C('san-francisco', 'San Francisco', 'SFO', 'America/Los_Angeles', 37.77, -122.42),
  C('los-angeles', 'Los Angeles', 'LAX', 'America/Los_Angeles', 34.05, -118.24), C('seattle', 'Seattle', 'SEA', 'America/Los_Angeles', 47.61, -122.33),
  C('berlin', 'Berlin', 'BER', 'Europe/Berlin', 52.52, 13.40), C('paris', 'Paris', 'PAR', 'Europe/Paris', 48.86, 2.35),
  C('copenhagen', 'Copenhagen', 'CPH', 'Europe/Copenhagen', 55.68, 12.57), C('amsterdam', 'Amsterdam', 'AMS', 'Europe/Amsterdam', 52.37, 4.90),
  C('stockholm', 'Stockholm', 'STO', 'Europe/Stockholm', 59.33, 18.07), C('oslo', 'Oslo', 'OSL', 'Europe/Oslo', 59.91, 10.75),
  C('helsinki', 'Helsinki', 'HEL', 'Europe/Helsinki', 60.17, 24.94), C('lisbon', 'Lisbon', 'LIS', 'Europe/Lisbon', 38.72, -9.14),
  C('madrid', 'Madrid', 'MAD', 'Europe/Madrid', 40.42, -3.70), C('rome', 'Rome', 'ROM', 'Europe/Rome', 41.90, 12.50),
  C('warsaw', 'Warsaw', 'WAW', 'Europe/Warsaw', 52.23, 21.01), C('kyiv', 'Kyiv', 'KYV', 'Europe/Kyiv', 50.45, 30.52),
  C('istanbul', 'Istanbul', 'IST', 'Europe/Istanbul', 41.01, 28.98), C('moscow', 'Moscow', 'MOW', 'Europe/Moscow', 55.76, 37.62),
  C('tel-aviv', 'Tel Aviv', 'TLV', 'Asia/Jerusalem', 32.09, 34.78), C('cairo', 'Cairo', 'CAI', 'Africa/Cairo', 30.04, 31.24),
  C('lagos', 'Lagos', 'LOS', 'Africa/Lagos', 6.52, 3.38), C('nairobi', 'Nairobi', 'NBO', 'Africa/Nairobi', -1.29, 36.82),
  C('johannesburg', 'Johannesburg', 'JNB', 'Africa/Johannesburg', -26.20, 28.05), C('dubai', 'Dubai', 'DXB', 'Asia/Dubai', 25.20, 55.27),
  C('mumbai', 'Mumbai', 'BOM', 'Asia/Kolkata', 19.08, 72.88), C('bengaluru', 'Bengaluru', 'BLR', 'Asia/Kolkata', 12.97, 77.59),
  C('kathmandu', 'Kathmandu', 'KTM', 'Asia/Kathmandu', 27.72, 85.32), C('bangkok', 'Bangkok', 'BKK', 'Asia/Bangkok', 13.76, 100.50),
  C('singapore', 'Singapore', 'SIN', 'Asia/Singapore', 1.35, 103.82), C('jakarta', 'Jakarta', 'JKT', 'Asia/Jakarta', -6.21, 106.85),
  C('shanghai', 'Shanghai', 'SHA', 'Asia/Shanghai', 31.23, 121.47), C('hong-kong', 'Hong Kong', 'HKG', 'Asia/Hong_Kong', 22.32, 114.17),
  C('taipei', 'Taipei', 'TPE', 'Asia/Taipei', 25.03, 121.57), C('seoul', 'Seoul', 'SEL', 'Asia/Seoul', 37.57, 126.98),
  C('sydney', 'Sydney', 'SYD', 'Australia/Sydney', -33.87, 151.21), C('melbourne', 'Melbourne', 'MEL', 'Australia/Melbourne', -37.81, 144.96),
  C('adelaide', 'Adelaide', 'ADL', 'Australia/Adelaide', -34.93, 138.60), C('auckland', 'Auckland', 'AKL', 'Pacific/Auckland', -36.85, 174.76),
  C('honolulu', 'Honolulu', 'HNL', 'Pacific/Honolulu', 21.31, -157.86), C('anchorage', 'Anchorage', 'ANC', 'America/Anchorage', 61.22, -149.90),
  C('vancouver', 'Vancouver', 'YVR', 'America/Vancouver', 49.28, -123.12), C('denver', 'Denver', 'DEN', 'America/Denver', 39.74, -104.99),
  C('chicago', 'Chicago', 'CHI', 'America/Chicago', 41.88, -87.63), C('toronto', 'Toronto', 'YYZ', 'America/Toronto', 43.65, -79.38),
  C('mexico-city', 'Mexico City', 'MEX', 'America/Mexico_City', 19.43, -99.13), C('bogota', 'Bogotá', 'BOG', 'America/Bogota', 4.71, -74.07),
  C('lima', 'Lima', 'LIM', 'America/Lima', -12.05, -77.04), C('sao-paulo', 'São Paulo', 'SAO', 'America/Sao_Paulo', -23.55, -46.63),
  C('buenos-aires', 'Buenos Aires', 'BUE', 'America/Argentina/Buenos_Aires', -34.60, -58.38), C('st-johns', "St. John's", 'YYT', 'America/St_Johns', 47.56, -52.71),
  C('reykjavik', 'Reykjavík', 'REK', 'Atlantic/Reykjavik', 64.15, -21.94),
];
export const cityById = id => CITIES.find(c => c.id === id);
export const TIMEZONES = CITIES.map(c => c.tz).filter((tz, i, a) => a.indexOf(tz) === i);

export function homeCity(localTz, offMin) {
  const c = CITIES.find(x => x.tz === localTz);
  if (c) return assign({}, c, { id: 'home' });
  const nm = ((localTz || '').split('/').pop() || 'Local').replace(/_/g, ' ');
  return { id: 'home', name: nm, code: nm.slice(0, 3).toUpperCase(), tz: localTz || 'UTC', lat: 45, lon: clamp((offMin || 0) / 4, -180, 180) };
}

// Wall-clock parts at a fixed UTC offset (minutes east of UTC).
function partsAt(ms, offMin) {
  const s = new Date(ms + offMin * 6e4);
  return { y: s.getUTCFullYear(), mo: s.getUTCMonth() + 1, d: s.getUTCDate(), h: s.getUTCHours(), m: s.getUTCMinutes(), s: s.getUTCSeconds(), wdi: (s.getUTCDay() + 6) % 7 };
}
export const localOffset = ms => -new Date(ms).getTimezoneOffset();

/* ---------- sun (only elevation: world rows invert for daytime cities) ---------- */
function solar(d) {
  const n = d.getTime() / 864e5 + 2440587.5 - 2451545.0;
  const L = ((280.46 + 0.9856474 * n) % 360 + 360) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * RAD;
  const lam = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD;
  const eps = (23.439 - 0.0000004 * n) * RAD;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
  let e = L * RAD - ra; e = ((e + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  const eot = e * 4 / RAD;
  const utcMin = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
  let sublon = -((utcMin + eot) / 4 - 180); sublon = ((sublon + 540) % 360) - 180;
  return { dec, sublon };
}
export function elevation(lat, lon, d) {
  const s = solar(d); const H = (lon - s.sublon) * RAD;
  return Math.asin(Math.sin(lat * RAD) * Math.sin(s.dec) + Math.cos(lat * RAD) * Math.cos(s.dec) * Math.cos(H)) / RAD;
}

/* ---------- faces ---------- */
const HOURW = ['TWELVE', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN'];
export function wordClock(h, m) {
  const m5 = Math.floor(m / 5) * 5, rest = m - m5;
  const MW = { 0: [], 5: ['FIVE', 'PAST'], 10: ['TEN', 'PAST'], 15: ['A', 'QUARTER', 'PAST'], 20: ['TWENTY', 'PAST'], 25: ['TWENTY', 'FIVE', 'PAST'], 30: ['HALF', 'PAST'],
    35: ['TWENTY', 'FIVE', 'TO'], 40: ['TWENTY', 'TO'], 45: ['A', 'QUARTER', 'TO'], 50: ['TEN', 'TO'], 55: ['FIVE', 'TO'] }[m5];
  const hr = HOURW[(m5 >= 35 ? h + 1 : h) % 12];
  const words = MW.concat([hr], m5 === 0 ? ['O’CLOCK'] : []);
  return { words, phrase: words.join(' '), rest };
}
export function hexTime(d) { const ds = new Date(d); ds.setHours(0, 0, 0, 0); const v = Math.floor((d - ds) / 864e5 * 65536); return clamp(v, 0, 65535).toString(16).toUpperCase().padStart(4, '0'); }

/* ---------- command language ---------- */
export function parseDur(tok) {
  if (!tok) return null; let m;
  if (/^\d+$/.test(tok)) return +tok ? +tok * 6e4 : null;
  if ((m = tok.match(/^(\d+):(\d{2})(?::(\d{2}))?$/))) return m[3] != null ? (+m[1] * 3600 + +m[2] * 60 + +m[3]) * 1e3 : (+m[1] * 60 + +m[2]) * 1e3;
  if ((m = tok.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i)) && (m[1] || m[2] || m[3])) { const v = ((+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0)) * 1e3; return v || null; }
  return null;
}
export function parseTime(tok) {
  const m = tok && tok.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm|a|p)?$/i); if (!m) return null;
  let h = +m[1]; const mi = m[2] ? +m[2] : 0;
  if (m[3]) { if (h > 12 || h === 0) return null; if (h === 12) h = 0; if (/p/i.test(m[3])) h += 12; }
  if (h > 23 || mi > 59) return null; return { h, m: mi };
}
const DAYKEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export function parseDaysTok(tok) {
  const t = tok.toLowerCase();
  if (t === 'weekdays' || t === 'wkd') return [1, 1, 1, 1, 1, 0, 0];
  if (t === 'weekends') return [0, 0, 0, 0, 0, 1, 1];
  if (t === 'daily' || t === 'everyday') return [1, 1, 1, 1, 1, 1, 1];
  const out = [0, 0, 0, 0, 0, 0, 0]; let any = false;
  for (const part of t.split(',')) {
    if (!part) return null;
    const rg = part.split('-').map(x => x.length >= 3 ? DAYKEYS.indexOf(x.slice(0, 3)) : -1);
    if (rg.some(i => i < 0) || rg.length > 2) return null;
    if (rg.length === 2) { for (let i = rg[0]; ; i = (i + 1) % 7) { out[i] = 1; if (i === rg[1]) break; } } else out[rg[0]] = 1;
    any = true;
  }
  return any ? out : null;
}
const normName = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
export function fuzzyCities(q) {
  const k = normName(q || ''); if (!k) return CITIES.slice(0, 6);
  const a = CITIES.filter(c => normName(c.name).startsWith(k) || c.code.toLowerCase() === k);
  const b = CITIES.filter(c => a.indexOf(c) < 0 && (normName(c.name).indexOf(k) >= 0 || normName(c.tz).indexOf(k) >= 0));
  return a.concat(b);
}
export const COMMANDS = [
  { k: 't', name: 'timer', sig: 't <dur> [name]', desc: 'spawn a timer · chain with &&', kind: 'timer' },
  { k: 'a', name: 'alarm', sig: 'a <time> [label] [days]', desc: 'set an alarm', kind: 'alarm' },
  { k: 'w', name: 'world', sig: 'w <city>', desc: 'add a world clock', kind: 'world' },
  { k: 's', name: 'stopwatch', sig: 's [lap|reset]', desc: 'start / stop the stopwatch', kind: 'stopwatch' },
  { k: 'k', name: 'kill', sig: 'k <pid|name>', desc: 'kill a timer', kind: 'kill' },
  { k: 'f', name: 'face', sig: 'f <face>', desc: 'switch clock face', kind: 'face' },
  { k: 'theme', name: 'theme', sig: 'theme <name>', desc: 'omarchy theme set', kind: 'theme' },
  { k: 'u', name: 'undo', sig: 'u', desc: 'undo last change', kind: 'undo' },
  { k: 'ring', name: 'ring', sig: 'ring', desc: 'test the alarm', kind: 'ring' },
];
export const themeId = name => String(name || '').trim().toLowerCase().replace(/\s+/g, '-');
export const themeLabel = id => String(id || '').replace(/-/g, ' ');

const SCREENS = ['clock', 'alarms', 'timers', 'stopwatch', 'world'];
const STATE_VERSION = 1;

/* ---------- engine ----------
 * env: {
 *   now()                  -> ms (defaults to Date.now)
 *   localTz                IANA name of the system zone
 *   tzOffset(tz, ms)       -> minutes east of UTC, or null while unknown
 *   direction              { id, faces: [...], puzzle: 'reverse' | 'type' | 'math' | 'hex' }
 *   onNotify(note)         a timer finished or an alarm started ringing
 *   onThemeSet(id)         the user asked for `theme <id>`
 * }
 */
export function createEngine(env) {
  env = env || {};
  const now = env.now || (() => Date.now());
  const dir = env.direction || { id: 'monolith', faces: ['digits'], puzzle: 'reverse' };
  const E = { tick: 0 };
  const t0 = now();
  let home = homeCity(env.localTz, localOffset(t0));
  E.home = home;
  E.setLocalTz = tz => { home = homeCity(tz, localOffset(now())); E.home = home; };

  E.screen = 'clock'; E.faces = {}; E.help = false;
  E.bootAt = t0; E.bootMs = 850;
  E.timers = []; E.alarms = []; E.world = [];
  E.sw = { running: false, acc: 0, startAt: 0, laps: [] };
  E.sel = { timers: 0, alarms: 0, world: 0 };
  E.cmd = { open: false, text: '', sel: 0, err: null, seq: 0 };
  E.echo = null; E.ring = null; E.notes = []; E.undoStack = [];
  E.theme = { id: 'gruvbox', name: 'gruvbox' }; E.themeSeq = 0; E.themeList = [];
  let pid = 4100 + Math.floor(Math.random() * 40), aid = 1, noteId = 0;
  let lastMin = null; // last minute (epoch minutes) the alarm check covered
  const nextPid = () => (pid += 1 + Math.floor(Math.random() * 7));

  const tzOff = (tz, ms) => {
    if (tz === home.tz) return localOffset(ms);
    const v = env.tzOffset ? env.tzOffset(tz, ms) : null;
    return v == null ? null : v;
  };

  const clampSel = () => { E.sel.timers = clamp(E.sel.timers, 0, Math.max(0, E.timers.length - 1)); E.sel.alarms = clamp(E.sel.alarms, 0, Math.max(0, E.alarms.length - 1)); E.sel.world = clamp(E.sel.world, 0, Math.max(0, E.world.length - 1)); };
  const say = (text, err) => { E.echo = { text, err: !!err, t: now() }; };
  E.say = say;
  const snap = () => JSON.stringify({ timers: E.timers, alarms: E.alarms, world: E.world });
  let undoMuted = false; // set while a multi-command line runs, so one `u` undoes it all
  const pushUndo = () => { if (undoMuted) return; E.undoStack.push(snap()); if (E.undoStack.length > 30) E.undoStack.shift(); };
  E.undo = () => { const s = E.undoStack.pop(); if (!s) { say('already at oldest change', true); return; } const o = JSON.parse(s); E.timers = o.timers; E.alarms = o.alarms; E.world = o.world; clampSel(); say('undo · 1 change reverted'); };

  /* persistence: plain JSON, written by the host whenever it changes */
  E.serialize = () => ({ v: STATE_VERSION, pid, aid, lastMin, timers: E.timers, alarms: E.alarms, world: E.world, sw: E.sw, faces: E.faces });
  E.load = o => {
    if (!o || o.v !== STATE_VERSION) return false;
    if (Array.isArray(o.timers)) E.timers = o.timers;
    if (Array.isArray(o.alarms)) E.alarms = o.alarms;
    if (Array.isArray(o.world)) E.world = o.world.filter(id => !!cityById(id));
    if (o.sw && Array.isArray(o.sw.laps)) E.sw = o.sw;
    if (o.faces) E.faces = o.faces;
    if (o.pid) pid = o.pid;
    if (o.aid) aid = o.aid;
    // Don't re-ring an alarm the user already dealt with before a restart,
    // but do catch one that came due in the last few minutes while we were down.
    if (typeof o.lastMin === 'number') lastMin = Math.max(o.lastMin, Math.floor(now() / 6e4) - 15);
    clampSel();
    return true;
  };

  /* clock */
  const rem = (t, n) => t.state === 'R' ? Math.max(0, t.end - n) : t.state === 'Z' ? 0 : t.left;
  function finish(t, n) {
    t.state = 'Z'; t.doneAt = n; t.left = 0;
    if (t.ringAlarm) { E.timers = E.timers.filter(x => x !== t); clampSel(); E.startRing(t.ringAlarm); }
    else notify({ kind: 'timer', title: t.name, body: `timer finished · ${durWords(t.dur)}`, pid: t.pid, dur: t.dur });
    E.timers.forEach(c => { if (c.parent === t.pid && c.state === 'S') { c.state = 'R'; c.end = t.end + c.dur; c.created = t.end; if (c.end <= n) finish(c, n); } });
  }
  function checkAlarms(n) {
    const cur = Math.floor(n / 6e4);
    if (lastMin === null) lastMin = cur - 1;
    if (cur <= lastMin) return;
    const from = Math.max(lastMin + 1, cur - 15);
    lastMin = cur;
    if (E.ring) return;
    for (let mi = from; mi <= cur; mi++) {
      const d = new Date(mi * 6e4), di = dowIdx(d);
      const a = E.alarms.find(x => x.on && x.h === d.getHours() && x.m === d.getMinutes() && (!x.days || x.days[di]));
      if (a) { if (!a.days) a.on = false; E.startRing(a); return; }
    }
  }
  E.step = () => {
    const n = now();
    E.timers.slice().forEach(t => { if (t.state === 'R' && t.end <= n) finish(t, n); });
    checkAlarms(n);
    if (E.notes.length) E.notes = E.notes.filter(x => n - x.t < 9000);
    E.tick++;
  };
  E.booting = () => now() < E.bootAt + E.bootMs;
  E.bootT = () => clamp((now() - E.bootAt) / E.bootMs, 0, 1);
  E.replayBoot = () => { E.bootAt = now(); };
  E.skipBoot = () => { E.bootAt = 0; };
  // How long the host should wait before the next step().
  E.nextDelay = () => {
    const n = now();
    if (E.booting()) return 50;
    if (E.sw.running && E.screen === 'stopwatch' && !E.cmd.open && !E.help) return 50;
    if (E.ring) return 250 - (n % 250) + 5;
    return 1000 - (n % 1000) + 5;
  };

  /* actions */
  E.setTheme = (id, name) => { if (id === E.theme.id) return; E.theme = { id, name: name || themeLabel(id) }; E.themeSeq++; };
  E.go = s => { if (SCREENS.indexOf(s) < 0) return; E.help = false; E.screen = s; };
  E.faceOf = () => { const faces = dir.faces; const i = (((E.faces[dir.id] || 0) % faces.length) + faces.length) % faces.length; return { idx: i, name: faces[i], n: faces.length }; };
  E.cycleFace = d => { const faces = dir.faces; const i = E.faceOf().idx; E.faces[dir.id] = (i + d + faces.length) % faces.length; say(`face · ${faces[E.faces[dir.id]]}`); };
  E.setFace = name => { const i = dir.faces.indexOf(name); if (i < 0) return false; E.faces[dir.id] = i; return true; };
  const listFor = s => s === 'timers' ? E.timers : s === 'alarms' ? E.alarms : s === 'world' ? E.world : null;
  E.selMove = d => { const L = listFor(E.screen); if (!L || !L.length) return; E.sel[E.screen] = clamp(E.sel[E.screen] + d, 0, L.length - 1); };
  E.selSet = (s, i) => { const L = listFor(s); if (!L) return; E.sel[s] = clamp(i, 0, Math.max(0, L.length - 1)); };
  const selT = () => E.timers[clamp(E.sel.timers, 0, E.timers.length - 1)];
  E.addTimer = (name, dur, extra) => {
    const n = now();
    const t = assign({ pid: nextPid(), name: name || 'timer', dur, state: 'R', end: n + dur, left: dur, created: n, parent: 0 }, extra || {});
    if (t.parent) { const i = E.timers.findIndex(x => x.pid === t.parent); let j = i + 1; while (j < E.timers.length && E.timers[j].parent) j++; E.timers.splice(j, 0, t); }
    else E.timers.push(t);
    return t;
  };
  E.pauseTimer = t => {
    t = t || selT(); if (!t) return; const n = now();
    if (t.state === 'R') { t.left = Math.max(0, t.end - n); t.state = 'T'; say(`[${t.pid}] stopped  ${t.name}`); }
    else if (t.state === 'T') { t.end = n + t.left; t.state = 'R'; say(`[${t.pid}] continued  ${t.name}`); }
    else if (t.state === 'Z') E.restartTimer(t);
  };
  E.restartTimer = t => { t = t || selT(); if (!t) return; const n = now(); t.state = 'R'; t.end = n + t.dur; t.left = t.dur; t.created = n; say(`[${t.pid}] restarted  ${t.name}`); };
  E.killTimer = t => {
    t = t || selT(); if (!t) return; pushUndo();
    const kill = [t.pid]; let grew = true;
    while (grew) { grew = false; E.timers.forEach(x => { if (x.parent && kill.indexOf(x.parent) >= 0 && kill.indexOf(x.pid) < 0) { kill.push(x.pid); grew = true; } }); }
    E.timers = E.timers.filter(x => kill.indexOf(x.pid) < 0); clampSel();
    say(`[${t.pid}]+ ${t.state === 'Z' ? 'reaped' : 'killed'}  ${t.name}   (u to undo)`);
  };
  E.adjustTimer = (ms, t) => {
    t = t || selT(); if (!t || t.state === 'Z' || t.state === 'S') return; const n = now();
    if (t.state === 'R') t.end = Math.max(n + 1000, t.end + ms); else t.left = Math.max(1000, t.left + ms);
    t.dur = Math.max(1000, t.dur + ms); say(`[${t.pid}] ${ms > 0 ? '+' : '−'}1m  ${t.name}`);
  };
  const swTotal = n => E.sw.acc + (E.sw.running ? n - E.sw.startAt : 0);
  E.toggleSw = () => { const n = now(), s = E.sw; if (s.running) { s.acc += n - s.startAt; s.running = false; say('stopwatch stopped'); } else { s.startAt = n; s.running = true; say('stopwatch running'); } };
  E.lap = () => { const n = now(), tot = swTotal(n); const done = E.sw.laps.reduce((a, b) => a + b, 0); if (tot - done < 300) return; E.sw.laps.push(tot - done); say(`lap ${E.sw.laps.length} · ${lapStr(tot - done)}`); };
  E.resetSw = () => { E.sw = { running: false, acc: 0, startAt: 0, laps: [] }; say('stopwatch reset'); };
  E.addAlarm = a => { pushUndo(); const x = assign({ id: aid++, on: true }, a); E.alarms.push(x); E.alarms.sort((p, q) => p.h * 60 + p.m - (q.h * 60 + q.m)); E.sel.alarms = E.alarms.indexOf(x); return x; };
  E.toggleAlarm = i => { const a = E.alarms[i == null ? E.sel.alarms : i]; if (!a) return; a.on = !a.on; say(`alarm ${p2(a.h)}:${p2(a.m)} ${a.on ? 'armed' : 'off'}`); };
  E.delAlarm = i => { i = i == null ? E.sel.alarms : i; const a = E.alarms[i]; if (!a) return; pushUndo(); E.alarms.splice(i, 1); clampSel(); say(`alarm ${p2(a.h)}:${p2(a.m)} deleted   (u to undo)`); };
  E.addWorld = id => { if (E.world.indexOf(id) >= 0) { E.sel.world = E.world.indexOf(id); return; } pushUndo(); E.world.push(id); E.sel.world = E.world.length - 1; };
  E.delWorld = i => { i = i == null ? E.sel.world : i; const id = E.world[i]; if (!id) return; pushUndo(); E.world.splice(i, 1); clampSel(); say(`${cityById(id).name} removed   (u to undo)`); };
  function notify(o) { o.id = ++noteId; o.t = now(); E.notes = [o].concat(E.notes).slice(0, 3); if (env.onNotify) env.onNotify(o); }
  E.notify = notify;
  E.dismissNote = id => { E.notes = E.notes.filter(x => x.id !== id); };

  /* ringing */
  const PUZ_CMDS = ['git push', 'sudo !!', ':wq', 'exit 0', 'kill -9 sleep', 'make coffee', 'systemctl start day', 'rm -rf ~/sleep'];
  function makePuzzle(kind, alarm) {
    if (kind === 'math') { const a = 6 + Math.floor(Math.random() * 13), b = 3 + Math.floor(Math.random() * 7), c = 2 + Math.floor(Math.random() * 29); return { kind, prompt: `${a} × ${b} + ${c}`, answer: String(a * b + c) }; }
    if (kind === 'reverse') { const w = ((alarm.label || 'awake').split(/\s+/)[0] || 'awake').toUpperCase(); const ww = w.length < 3 ? 'AWAKE' : w; return { kind, prompt: ww, answer: ww.split('').reverse().join('') }; }
    if (kind === 'hex') { const c = Array.from({ length: 4 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join(''); return { kind, prompt: c, answer: c }; }
    const c = PUZ_CMDS[Math.floor(Math.random() * PUZ_CMDS.length)]; return { kind: 'type', prompt: c, answer: c };
  }
  E.startRing = (alarm, demo) => {
    const pz = makePuzzle(dir.puzzle || 'type', alarm);
    E.ring = assign({ alarm: assign({}, alarm), input: '', errs: 0, lastErr: 0, t: now(), demo: !!demo, seq: (E.ring ? E.ring.seq : 0) + 1 }, pz);
    E.cmd.open = false; E.help = false;
    notify({ kind: 'alarm', title: alarm.label || 'alarm', body: `alarm · ${p2(alarm.h)}:${p2(alarm.m)} · ${daysStr(alarm.days)}`, hhmm: `${p2(alarm.h)}:${p2(alarm.m)}` });
  };
  E.demoRing = () => { const d = new Date(now()); E.startRing({ h: d.getHours(), m: d.getMinutes(), label: 'gym', days: [1, 1, 1, 1, 1, 0, 0] }, true); };
  E.dismissRing = () => { E.ring = null; say('alarm dismissed · good morning'); };
  E.snooze = () => { const a = E.ring.alarm; E.ring = null; E.addTimer('snooze·' + (a.label || 'alarm'), 5 * 6e4, { ringAlarm: a }); say(`snoozed 5m · ${a.label || 'alarm'}`); };
  const norm = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
  E.checkRing = () => { const r = E.ring; if (!r) return; if (norm(r.input) === norm(r.answer)) E.dismissRing(); else { r.errs++; r.lastErr = now(); r.input = ''; } };
  function ringKey(e) {
    const r = E.ring;
    if (e.key === 'Escape' && r.demo) { E.ring = null; say('demo alarm closed'); return true; }
    if (e.key === 'Tab') { E.snooze(); return true; }
    if (e.key === 'Enter') { E.checkRing(); return true; }
    if (e.key === 'Backspace') { r.input = r.input.slice(0, -1); return true; }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { r.input = (r.input + e.key).slice(0, 40); return true; }
    return true;
  }

  /* commands */
  function nextOcc(a, n) {
    const d = new Date(n);
    for (let k = 0; k < 8; k++) { const x = new Date(d); x.setDate(d.getDate() + k); x.setHours(a.h, a.m, 0, 0); if (x.getTime() > n && (!a.days || a.days[dowIdx(x)])) return x.getTime(); }
    return n + 7 * 864e5;
  }
  // One line can hold several commands joined by `then` (or `&&`, which a shell
  // would take as its own operator). Timers queue, each waiting for the timer
  // before it; alarms and cities are just set. After `then`, a bare duration is
  // another timer, so its `t` is optional: `t 25m work then 5m break then a 7:30 gym`.
  const CHAIN = /\s*&&\s*|\s+then\s+(?=(?:t|timer|a|alarm|w|world)\s|\d)/i;
  const CHAINABLE = ['timer', 'alarm', 'world'];
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  function parseChain(s, links) {
    const parts = links.map((x, i) => parseOne(i && /^\d/.test(x.trim()) ? 't ' + x : x));
    const ok = parts.every(p => p.ok && CHAINABLE.indexOf(p.kind) >= 0);
    const timers = parts.filter(p => p.kind === 'timer'), alarms = parts.filter(p => p.kind === 'alarm'), cities = parts.filter(p => p.kind === 'world');
    const summary = [timers.map(p => `${p.name} ${clockDur(p.dur)}`).join(' → ')].concat(alarms.concat(cities).map(p => p.summary)).filter(x => x).join(' + ');
    const detail = [timers.length > 1 ? `${timers.length} timers, run in sequence` : '', alarms.length ? alarms.map(p => p.detail).join(', ') : ''].filter(x => x).join(' · ');
    return { ok, kind: 'chain', parts, summary: ok ? summary : '', detail: ok ? detail : '',
      err: ok ? null : (parts.find(p => !p.ok) || {}).err || 'chain: timers, alarms and cities only',
      run: () => {
        pushUndo(); undoMuted = true;
        let prev = null, first = null;
        parts.forEach(p => {
          if (p.kind === 'timer') { prev = E.addTimer(p.name, p.dur, prev ? { state: 'S', end: 0, parent: prev.pid } : {}); first = first || prev; }
          else if (p.kind === 'alarm') E.addAlarm({ h: p.h, m: p.m, label: p.label, days: p.days });
          else E.addWorld(p.city.id);
        });
        undoMuted = false;
        if (first) E.sel.timers = E.timers.indexOf(first);
        say(timers.length && !alarms.length && !cities.length ? `spawned ${timers.length} chained timers`
          : 'set ' + [timers.length ? plural(timers.length, 'timer') : '', alarms.length ? plural(alarms.length, 'alarm') : '', cities.length ? plural(cities.length, 'city').replace('citys', 'cities') : ''].filter(x => x).join(' + '));
        E.go(timers.length ? 'timers' : alarms.length ? 'alarms' : 'world');
      } };
  }
  const relOff = (tz, n) => { const o = tzOff(tz, n); return o == null ? null : o - localOffset(n); };
  const cityClock = (tz, n) => { const o = tzOff(tz, n); if (o == null) return '--:--'; const p = partsAt(n, o); return p2(p.h) + ':' + p2(p.m); };
  E.parse = text => {
    const s = (text || '').trim(); if (!s) return { ok: false, kind: null, summary: '', detail: '' };
    const links = s.split(CHAIN);
    return links.length > 1 ? parseChain(s, links) : parseOne(s);
  };
  function parseOne(text) {
    const s = (text || '').trim(); if (!s) return { ok: false, kind: null, summary: '', detail: '' };
    const tok = s.split(/\s+/), c = tok[0].toLowerCase(), rest = tok.slice(1);
    const n = now();
    if (c === 't' || c === 'timer') {
      const dur = parseDur(rest[0]); const name = rest.slice(1).join(' ') || 'timer';
      if (!dur) return { ok: false, kind: 'timer', err: rest[0] ? `can't read duration "${rest[0]}"` : 'duration? e.g. 25m, 1h30m, 90s, 4:30', summary: '' };
      const end = new Date(n + dur);
      return { ok: true, kind: 'timer', dur, name, summary: `timer · ${name} · ${clockDur(dur)}`, detail: `ends ${hm(end)}`,
        run: () => { pushUndo(); const t = E.addTimer(name, dur); E.sel.timers = E.timers.indexOf(t); say(`[${E.timers.length}] ${t.pid}  ${name}  ${durWords(dur)}`); E.go('timers'); } };
    }
    if (c === 'a' || c === 'alarm') {
      // `a 6:25 pm` means `a 6:25pm`, not an alarm labelled "pm".
      if (rest[0] && rest[1] && /^[ap]\.?m?\.?$/i.test(rest[1]) && /^\d/.test(rest[0]) && !/[ap]m?$/i.test(rest[0])) rest.splice(0, 2, rest[0] + rest[1].replace(/\./g, ''));
      const tm = parseTime(rest[0]);
      if (!tm) return { ok: false, kind: 'alarm', err: rest[0] ? `can't read time "${rest[0]}"` : 'time? e.g. 7:30, 6pm, 0645', summary: '' };
      let days = null, words = rest.slice(1);
      if (words.length) { const dd = parseDaysTok(words[words.length - 1]); if (dd) { days = dd; words = words.slice(0, -1); } }
      const label = words.join(' ') || 'alarm';
      const nx = nextOcc({ h: tm.h, m: tm.m, days }, n);
      return { ok: true, kind: 'alarm', h: tm.h, m: tm.m, days, label, summary: `alarm · ${p2(tm.h)}:${p2(tm.m)} · ${label}`, detail: `${daysStr(days)} · ${relIn(nx - n)}`,
        run: () => { E.addAlarm({ h: tm.h, m: tm.m, label, days }); say(`alarm ${p2(tm.h)}:${p2(tm.m)} ${label} · ${relIn(nx - n)}`); E.go('alarms'); } };
    }
    if (c === 'w' || c === 'world') {
      const q = rest.join(' '); const m = fuzzyCities(q)[0];
      if (!q || !m) return { ok: false, kind: 'world', err: q ? `no city matches "${q}"` : 'city? e.g. tokyo', summary: '' };
      const ro = relOff(m.tz, n);
      return { ok: true, kind: 'world', city: m, summary: `world · ${m.name}`, detail: `${cityClock(m.tz, n)} there${ro == null ? '' : ' · ' + offStr(ro)}`,
        run: () => { E.addWorld(m.id); say(`${m.name} added · ${cityClock(m.tz, now())}`); E.go('world'); } };
    }
    if (c === 's' || c === 'sw' || c === 'stopwatch' || c === 'lap') {
      const sub = c === 'lap' ? 'lap' : (rest[0] || '').toLowerCase();
      if (sub === 'lap') return { ok: true, kind: 'stopwatch', summary: 'stopwatch · lap', detail: '', run: () => E.lap() };
      if (sub === 'reset') return { ok: true, kind: 'stopwatch', summary: 'stopwatch · reset', detail: '', run: () => E.resetSw() };
      return { ok: true, kind: 'stopwatch', summary: `stopwatch · ${E.sw.running ? 'stop' : 'start'}`, detail: '', run: () => { E.toggleSw(); E.go('stopwatch'); } };
    }
    if (c === 'k' || c === 'kill') {
      const q = (rest[0] || '').replace('%', ''); const t = E.timers.find(x => String(x.pid) === q || x.name === rest.join(' ')) || (/^\d$/.test(q) ? E.timers[+q - 1] : null);
      if (!t) return { ok: false, kind: 'kill', err: q ? `no such process "${q}"` : 'pid or name?', summary: '' };
      return { ok: true, kind: 'kill', summary: `kill · ${t.pid} ${t.name}`, detail: t.state === 'Z' ? 'reap zombie' : `${clockDur(rem(t, n))} left`, run: () => E.killTimer(t) };
    }
    if (c === 'f' || c === 'face') {
      const q = (rest[0] || '').toLowerCase(); const f = dir.faces.find(x => x.startsWith(q));
      if (!q) return { ok: true, kind: 'face', summary: 'face · next', detail: '', run: () => { E.cycleFace(1); E.go('clock'); } };
      if (!f) return { ok: false, kind: 'face', err: `faces: ${dir.faces.join(' ')}`, summary: '' };
      return { ok: true, kind: 'face', summary: `face · ${f}`, detail: '', run: () => { E.setFace(f); say(`face · ${f}`); E.go('clock'); } };
    }
    if (c === 'theme') {
      const q = themeId(rest.join(' '));
      const L = E.themeList, t = q ? (L.find(x => x === q) || L.find(x => x.startsWith(q))) : null;
      if (!t) return { ok: false, kind: 'theme', err: q ? `no theme "${q}"` : 'theme? e.g. tokyo-night', summary: '' };
      return { ok: true, kind: 'theme', summary: `omarchy theme set ${t}`, detail: t === E.theme.id ? 'already active' : '', run: () => { say(`omarchy theme set ${t}`); if (env.onThemeSet) env.onThemeSet(t); } };
    }
    if (c === 'u' || c === 'undo') return { ok: true, kind: 'undo', summary: 'undo', detail: `${E.undoStack.length} change(s) on stack`, run: () => E.undo() };
    if (c === 'ring') return { ok: true, kind: 'ring', summary: 'ring · test alarm now', detail: 'esc exits the test', run: () => E.demoRing() };
    const scr = { c: 'clock', clock: 'clock', alarms: 'alarms', timers: 'timers', ps: 'timers', world: 'world', stopwatch: 'stopwatch' }[c];
    if (scr) return { ok: true, kind: 'go', summary: `go · ${scr}`, detail: '', run: () => E.go(scr) };
    return { ok: false, kind: null, err: `not an editor command: ${tok[0]}`, summary: '' };
  };
  E.suggest = text => {
    const s = text || ''; const sp = s.indexOf(' ');
    if (/\s+then\s*$/i.test(s)) return [{ fill: s.replace(/\s*$/, ' ') + '5m break', label: '5m break', desc: 'then a break', kind: 'timer' }];
    if (s.indexOf('&&') >= 0) { const tail = s.slice(s.lastIndexOf('&&') + 2).replace(/^\s+/, ''); if (!tail) return [{ fill: s.replace(/\s*$/, ' ') + 't 5m break', label: 't 5m break', desc: 'then a break', kind: 'timer' }]; return []; }
    // In a multi-command line, suggest for the last command and keep the rest.
    const G = new RegExp(CHAIN.source, 'gi'); let m, cut = -1;
    while ((m = G.exec(s))) cut = m.index + m[0].length;
    if (cut > 0) {
      const head = s.slice(0, cut), tail = s.slice(cut), bare = /^\d/.test(tail);
      return E.suggest(bare ? 't ' + tail : tail).map(x => assign({}, x, { fill: head + (bare ? x.fill.replace(/^t /, '') : x.fill) }));
    }
    if (sp < 0) {
      const q = s.toLowerCase();
      return COMMANDS.filter(c => !q || c.k.startsWith(q) || c.name.startsWith(q)).map(c => ({ fill: c.k + ' ', label: c.sig, desc: c.desc, kind: c.kind }));
    }
    const c = s.slice(0, sp).toLowerCase(), rest = s.slice(sp + 1), toks = rest.split(/\s+/), last = toks[toks.length - 1].toLowerCase();
    const head = s.slice(0, s.length - last.length);
    const n = now();
    if (c === 't' || c === 'timer') {
      if (toks.length > 1) return [];
      const opts = ['25m focus', '5m tea', '12m eggs', '1h', '90s', '25m work then 5m break'];
      return opts.filter(o => o.startsWith(rest)).map(o => { const d = parseDur(o.split(' ')[0]); return { fill: c + ' ' + o, label: o, desc: o.indexOf(' then ') >= 0 ? 'pomodoro chain' : `ends ${hm(new Date(n + d))}`, kind: 'timer' }; });
    }
    if (c === 'a' || c === 'alarm') {
      if (toks.length === 1) return ['7:00', '7:30', '6:45', '9:00', '22:30'].filter(o => o.startsWith(rest)).map(o => { const t = parseTime(o); return { fill: c + ' ' + o + ' ', label: o, desc: relIn(nextOcc({ h: t.h, m: t.m, days: null }, n) - n), kind: 'alarm' }; });
      return ['weekdays', 'daily', 'weekends', 'mon,wed,fri'].filter(o => last && o.startsWith(last)).map(o => ({ fill: head + o, label: o, desc: 'repeat', kind: 'alarm' }));
    }
    if (c === 'w' || c === 'world') {
      return fuzzyCities(rest).slice(0, 6).map(m => { const ro = relOff(m.tz, n); return { fill: c + ' ' + m.name.toLowerCase(), label: m.name.toLowerCase(), desc: `${cityClock(m.tz, n)}  ${ro == null ? '' : offStr(ro)}`, kind: 'world' }; });
    }
    if (c === 'f' || c === 'face') return dir.faces.filter(f => f.startsWith(last)).map(f => ({ fill: 'f ' + f, label: f, desc: 'face', kind: 'face' }));
    if (c === 'theme') { const q = themeId(rest); return E.themeList.filter(t => t.startsWith(q)).slice(0, 8).map(t => ({ fill: 'theme ' + t, label: t, desc: t === E.theme.id ? 'active' : 'theme', kind: 'theme' })); }
    if (c === 'k' || c === 'kill') return E.timers.filter(t => String(t.pid).startsWith(last) || t.name.startsWith(last)).slice(0, 6).map(t => ({ fill: 'k ' + t.pid, label: `${t.pid} ${t.name}`, desc: t.state === 'Z' ? 'zombie' : clockDur(rem(t, n)), kind: 'kill' }));
    if (c === 's' || c === 'sw') return ['lap', 'reset'].filter(o => o.startsWith(last)).map(o => ({ fill: 's ' + o, label: o, desc: 'stopwatch', kind: 'stopwatch' }));
    return [];
  };
  E.openCmd = pre => { E.cmd = { open: true, text: pre || '', sel: 0, err: null, seq: E.cmd.seq + 1 }; E.help = false; };
  E.closeCmd = () => { E.cmd.open = false; E.cmd.err = null; };
  E.runCmd = () => {
    const c = E.cmd; let p = E.parse(c.text);
    if (!p.ok) {
      const sg = E.suggest(c.text)[c.sel];
      if (sg && sg.fill.trim() !== c.text.trim()) { c.text = sg.fill; c.sel = 0; p = E.parse(c.text); if (!p.ok) return; }
      else { c.err = p.err || 'nothing to run'; return; }
    }
    E.closeCmd(); p.run();
  };
  function cmdKey(e) {
    const c = E.cmd, k = e.key;
    if (k === 'Escape') { E.closeCmd(); return true; }
    if (k === 'Enter') { E.runCmd(); return true; }
    const sg = E.suggest(c.text);
    if (k === 'Tab' || k === 'ArrowRight') { const x = sg[c.sel]; if (x) { c.text = x.fill; c.sel = 0; } return true; }
    if (k === 'ArrowUp') { c.sel = clamp(c.sel - 1, 0, Math.max(0, sg.length - 1)); return true; }
    if (k === 'ArrowDown') { c.sel = clamp(c.sel + 1, 0, Math.max(0, sg.length - 1)); return true; }
    if (k === 'Backspace') { if (!c.text) E.closeCmd(); else c.text = c.text.slice(0, -1); c.sel = 0; c.err = null; return true; }
    if (e.ctrlKey && k === 'w') { c.text = c.text.replace(/\S+\s*$/, ''); c.sel = 0; return true; }
    if (e.ctrlKey && k === 'u') { c.text = ''; c.sel = 0; return true; }
    if (k.length === 1 && !e.ctrlKey) { c.text += k; c.sel = 0; c.err = null; return true; }
    return true;
  }
  function globalKey(e) {
    const k = e.key, s = E.screen;
    if (k === ':') { E.openCmd(''); return true; }
    if (k === '?') { E.help = !E.help; return true; }
    if (k === 'Escape') { if (E.help) E.help = false; else E.go('clock'); return true; }
    const scr = { c: 'clock', a: 'alarms', t: 'timers', s: 'stopwatch', w: 'world' }[k];
    if (scr) { E.go(scr); return true; }
    if (k === 'f') { E.cycleFace(1); return true; }
    if (k === 'F') { E.cycleFace(-1); return true; }
    if (k === 'u') { E.undo(); return true; }
    if (k === 'n') { E.openCmd({ timers: 't ', alarms: 'a ', world: 'w ' }[s] || ''); return true; }
    if (k === 'ArrowDown' || k === 'j') { E.selMove(1); return true; }
    if (k === 'ArrowUp' || (k === 'k' && s !== 'timers')) { E.selMove(-1); return true; }
    if (k === ' ') { if (s === 'timers') E.pauseTimer(); else if (s === 'alarms') E.toggleAlarm(); else E.toggleSw(); return true; }
    if (k === 'l') { E.lap(); return true; }
    if (k === 'r') { if (s === 'timers') E.restartTimer(); else if (s === 'stopwatch') E.resetSw(); return true; }
    if (k === 'k' && s === 'timers') { E.killTimer(); return true; }
    if (k === 'x' || k === 'Delete') { if (s === 'timers') E.killTimer(); else if (s === 'alarms') E.delAlarm(); else if (s === 'world') E.delWorld(); return true; }
    if ((k === '+' || k === '=') && s === 'timers') { E.adjustTimer(6e4); return true; }
    if (k === '-' && s === 'timers') { E.adjustTimer(-6e4); return true; }
    return false;
  }
  // e: { key, ctrlKey, altKey, metaKey } with DOM-style key names. Returns true if handled.
  // `pinned` limits the keymap to cycling faces, as the tiny pin widget does.
  E.handleKey = (e, pinned) => {
    if (e.metaKey || e.altKey) return false;
    if (e.ctrlKey && !E.cmd.open) return false;
    if (E.booting()) { E.skipBoot(); return true; }
    if (E.ring) return ringKey(e);
    if (pinned) { if (e.key === 'f') { E.cycleFace(1); return true; } if (e.key === 'F') { E.cycleFace(-1); return true; } return false; }
    if (E.cmd.open) return cmdKey(e);
    return globalKey(e);
  };

  /* view: everything a direction needs to draw one frame */
  E.view = () => {
    const n = now(), d = new Date(n);
    const h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
    const ds = new Date(d); ds.setHours(0, 0, 0, 0); const dayMs = ds.getTime();
    const localOff = localOffset(n);
    const timers = E.timers.map((t, i) => {
      const r = rem(t, n);
      return { pid: t.pid, name: t.name, state: t.state, stateWord: { R: 'running', T: 'paused', S: 'queued', Z: 'done' }[t.state], dur: t.dur, rem: r, pct: t.dur ? clamp(1 - r / t.dur, 0, 1) : 0,
        remStr: clockDur(r), durStr: durWords(t.dur), endsAt: t.state === 'R' ? hm(new Date(t.end)) : '--:--',
        sel: i === E.sel.timers, idx: i, parent: t.parent, done: t.state === 'Z', running: t.state === 'R', paused: t.state === 'T', queued: t.state === 'S', snooze: !!t.ringAlarm };
    });
    const alarms = E.alarms.map((a, i) => {
      const nx = nextOcc(a, n);
      return { id: a.id, h: a.h, m: a.m, hhmm: p2(a.h) + ':' + p2(a.m), label: a.label, days: a.days, on: a.on, daysStr: daysStr(a.days),
        mask: ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, j) => ({ l, on: a.days ? !!a.days[j] : false })),
        nextAt: nx, inStr: a.on ? relIn(nx - n) : 'off', sel: i === E.sel.alarms, idx: i };
    });
    const armed = alarms.filter(a => a.on).sort((a, b) => a.nextAt - b.nextAt);
    const mkCity = (c, i) => {
      const off = c.id === 'home' ? localOff : tzOff(c.tz, n);
      const el = elevation(c.lat, c.lon, d);
      const base = { id: c.id, name: c.name, code: c.code, tz: c.tz, sel: i === E.sel.world, idx: i, isDay: el > -0.833 };
      if (off == null) return assign(base, { hhmm: '--:--', offStr: '', dayDiff: '', known: false });
      const p = partsAt(n, off), rel = off - localOff;
      const dd = Date.UTC(p.y, p.mo - 1, p.d) - Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
      return assign(base, { hhmm: p2(p.h) + ':' + p2(p.m), off: rel, offStr: offStr(rel), dayDiff: dd > 0 ? '+1' : dd < 0 ? '−1' : '', known: true });
    };
    const world = E.world.map((id, i) => mkCity(cityById(id), i));
    const tot = swTotal(n), done = E.sw.laps.reduce((a, b) => a + b, 0);
    const L = E.sw.laps, mn = L.length ? Math.min.apply(null, L) : 0, mx = L.length ? Math.max.apply(null, L) : 0, mean = L.length ? done / L.length : 0;
    const sw = { running: E.sw.running, total: tot, str: swStr(tot), curStr: lapStr(tot - done), n: L.length, meanStr: L.length ? lapStr(mean) : '—',
      laps: L.map((ms, i) => ({ n: i + 1, ms, str: lapStr(ms), best: L.length > 1 && ms === mn, norm: mx > mn ? (ms - mn) / (mx - mn) : 0.5 })) };
    let cmdV = { open: false };
    if (E.cmd.open) {
      const cmd = E.cmd, sg = E.suggest(cmd.text).slice(0, 6), sel = clamp(cmd.sel, 0, Math.max(0, sg.length - 1)), cur = sg[sel];
      const ghost = cur && cur.fill.startsWith(cmd.text) ? cur.fill.slice(cmd.text.length) : '';
      cmdV = { open: true, text: cmd.text, ghost, sugg: sg.map((x, i) => assign({}, x, { sel: i === sel })), parse: E.parse(cmd.text), err: cmd.err, seq: cmd.seq };
    }
    let ring = null;
    if (E.ring) {
      const r = E.ring, ans = String(r.answer);
      ring = { seq: r.seq, demo: r.demo, errs: r.errs, lastErr: r.lastErr, prompt: r.prompt, kind: r.kind,
        hhmm: p2(r.alarm.h) + ':' + p2(r.alarm.m), label: r.alarm.label || 'alarm', daysStr: daysStr(r.alarm.days),
        chars: r.input.split('').map((ch, i) => ({ ch: ch === ' ' ? ' ' : ch, ok: (ans[i] || '').toLowerCase() === ch.toLowerCase() })),
        since: durWords(n - r.t), shaking: !!r.lastErr && n - r.lastErr < 600, blink: Math.floor(n / 500) % 2 === 0 };
    }
    return {
      n, h, m, s, hh: p2(h), mm: p2(m), ss: p2(s), Dow: DOW[dowIdx(d)], dd: p2(d.getDate()), Mon: MON[d.getMonth()], week: isoWeek(d),
      dayPct: (n - dayMs) / 864e5, hex: hexTime(d), words: wordClock(h, m), secPct: (s + (n % 1000) / 1000) / 60,
      theme: E.theme, themeSeq: E.themeSeq, screen: E.screen, help: E.help, face: E.faceOf(),
      timers, alarms, nextAlarm: armed[0] || null, world, home: mkCity(home, -1), sw, cmd: cmdV, ring, notes: E.notes,
      echo: E.echo && n - E.echo.t < 4000 ? E.echo : null, booting: E.booting(), bootT: E.bootT(), undoN: E.undoStack.length,
    };
  };
  return E;
}

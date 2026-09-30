import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, parseDur, parseTime, parseDaysTok, wordClock, hexTime, fuzzyCities, clockDur, relIn, offStr, daysStr } from '../core/engine.mjs';

// A fake clock the tests can move forward.
function rig(start, extra) {
  const clock = { t: start };
  const notes = [], themes = [];
  const E = createEngine(Object.assign({
    now: () => clock.t,
    localTz: 'Europe/London',
    tzOffset: (tz) => ({ 'Asia/Tokyo': 540, 'America/New_York': -240 })[tz] ?? null,
    direction: { id: 'monolith', faces: ['digits', 'words', 'hex'], puzzle: 'reverse' },
    onNotify: n => notes.push(n),
    onThemeSet: id => themes.push(id),
  }, extra || {}));
  E.skipBoot();
  const at = (h, m, s) => { const d = new Date(start); d.setHours(h, m, s || 0, 0); return d.getTime(); };
  const run = text => { E.openCmd(text); E.runCmd(); };
  const key = (k, o) => E.handleKey(Object.assign({ key: k }, o || {}));
  const advance = ms => { clock.t += ms; E.step(); };
  return { E, clock, notes, themes, at, run, key, advance };
}
const morning = () => new Date(2026, 8, 29, 7, 29, 30).getTime(); // Tue 29 Sep 2026, 07:29:30 local

test('durations parse in every documented form', () => {
  assert.equal(parseDur('25m'), 25 * 6e4);
  assert.equal(parseDur('1h30m'), 90 * 6e4);
  assert.equal(parseDur('90s'), 90e3);
  assert.equal(parseDur('4:30'), 270e3);
  assert.equal(parseDur('1:00:05'), 3605e3);
  assert.equal(parseDur('25'), 25 * 6e4);
  assert.equal(parseDur('2x'), null);
  assert.equal(parseDur('0'), null);
  assert.equal(parseDur('0m'), null);
});

test('alarm times and day sets parse', () => {
  assert.deepEqual(parseTime('7:30'), { h: 7, m: 30 });
  assert.deepEqual(parseTime('0730'), { h: 7, m: 30 });
  assert.deepEqual(parseTime('6pm'), { h: 18, m: 0 });
  assert.deepEqual(parseTime('12am'), { h: 0, m: 0 });
  assert.equal(parseTime('25:00'), null);
  assert.deepEqual(parseDaysTok('weekdays'), [1, 1, 1, 1, 1, 0, 0]);
  assert.deepEqual(parseDaysTok('mon,wed,fri'), [1, 0, 1, 0, 1, 0, 0]);
  assert.deepEqual(parseDaysTok('fri-mon'), [1, 0, 0, 0, 1, 1, 1]);
  assert.equal(parseDaysTok('gym'), null);
  assert.equal(parseDaysTok('m'), null);
  assert.equal(daysStr([1, 1, 1, 1, 1, 0, 0]), 'weekdays');
  assert.equal(daysStr(null), 'once');
});

test('faces: word clock rounds down to 5 minutes, hex is 4 digits of the day', () => {
  assert.deepEqual(wordClock(14, 27).words, ['TWENTY', 'FIVE', 'PAST', 'TWO']);
  assert.deepEqual(wordClock(14, 47).words, ['A', 'QUARTER', 'TO', 'THREE']);
  assert.deepEqual(wordClock(0, 2).words, ['TWELVE', 'O’CLOCK']);
  assert.equal(hexTime(new Date(2026, 0, 1, 12, 0, 0)), '8000');
  assert.equal(hexTime(new Date(2026, 0, 1, 0, 0, 0)), '0000');
});

test('formatters', () => {
  assert.equal(clockDur(61000), '01:01');
  assert.equal(clockDur(3600e3 + 5000), '1:00:05');
  assert.equal(relIn(17 * 36e5 + 2 * 6e4), 'in 17h 02m');
  assert.equal(offStr(420), '+7h');
  assert.equal(offStr(-330), '−5:30');
  assert.equal(fuzzyCities('sao')[0].id, 'sao-paulo');
  assert.equal(fuzzyCities('nyc')[0].id, 'new-york');
});

test('a timer runs, finishes, notifies and starts its queued child', () => {
  const r = rig(morning());
  r.run('t 25m work && t 5m break');
  assert.equal(r.E.timers.length, 2);
  assert.equal(r.E.timers[1].state, 'S');
  assert.equal(r.E.screen, 'timers');
  r.advance(25 * 6e4);
  assert.equal(r.E.timers[0].state, 'Z');
  assert.equal(r.E.timers[1].state, 'R');
  assert.equal(r.notes[0].kind, 'timer');
  assert.equal(r.notes[0].title, 'work');
  r.advance(5 * 6e4);
  assert.equal(r.E.timers[1].state, 'Z');
  assert.equal(r.notes.length, 2);
});

test('chained timers catch up correctly after a long gap', () => {
  const r = rig(morning());
  r.run('t 1m a && t 1m b && t 1m c');
  r.advance(10 * 6e4); // app was suspended: all three came due
  assert.deepEqual(r.E.timers.map(t => t.state), ['Z', 'Z', 'Z']);
  assert.equal(r.notes.length, 3);
});

test('pause, adjust, restart and kill (with undo) on the selected timer', () => {
  const r = rig(morning());
  r.run('t 10m tea');
  r.key('t');
  r.key(' ');
  assert.equal(r.E.timers[0].state, 'T');
  r.advance(60e3);
  assert.equal(r.E.view().timers[0].remStr, '10:00');
  r.key('+');
  assert.equal(r.E.view().timers[0].remStr, '11:00');
  r.key('k');
  assert.equal(r.E.timers.length, 0);
  r.key('u');
  assert.equal(r.E.timers.length, 1);
});

test('alarms ring on their minute, one-offs disarm, and the reverse puzzle dismisses', () => {
  const r = rig(morning());
  r.run('a 7:30 gym weekdays');
  r.run('a 7:31 coffee');
  assert.equal(r.E.alarms.length, 2);
  r.E.step();
  assert.equal(r.E.ring, null);
  r.advance(30e3); // 07:30:00
  assert.ok(r.E.ring);
  assert.equal(r.E.ring.prompt, 'GYM');
  assert.equal(r.notes[0].kind, 'alarm');
  // Keys other than typing can't close a real alarm.
  r.key('Escape');
  assert.ok(r.E.ring);
  'mgx'.split('').forEach(k => r.key(k));
  r.key('Enter');
  assert.ok(r.E.ring);
  assert.equal(r.E.ring.errs, 1);
  'myg'.split('').forEach(k => r.key(k));
  r.key('Enter');
  assert.equal(r.E.ring, null);
  r.advance(60e3); // 07:31 one-off
  assert.ok(r.E.ring);
  assert.equal(r.E.alarms.find(a => a.label === 'coffee').on, false);
});

test('an alarm missed while suspended still rings, but not one older than 15 minutes', () => {
  const r = rig(morning());
  r.run('a 7:30 gym');
  r.E.step();
  r.clock.t = new Date(2026, 8, 29, 7, 40, 0).getTime();
  r.E.step();
  assert.ok(r.E.ring, 'rings 10 minutes late after resume');

  const s = rig(morning());
  s.run('a 7:30 gym');
  s.E.step();
  s.clock.t = new Date(2026, 8, 29, 8, 0, 0).getTime();
  s.E.step();
  assert.equal(s.E.ring, null);
});

test('snooze makes a 5 minute timer that rings the alarm again', () => {
  const r = rig(morning());
  r.run('a 7:30 gym weekdays');
  r.advance(30e3);
  r.key('Tab');
  assert.equal(r.E.ring, null);
  assert.equal(r.E.timers[0].name, 'snooze·gym');
  r.advance(5 * 6e4);
  assert.ok(r.E.ring);
  assert.equal(r.E.timers.length, 0);
});

test('state survives a restart without re-ringing a handled alarm', () => {
  const r = rig(morning());
  r.run('a 7:30 gym weekdays');
  r.run('t 25m focus');
  r.run('w tokyo');
  r.advance(30e3);
  'myg'.split('').forEach(k => r.key(k));
  r.key('Enter');
  const saved = JSON.parse(JSON.stringify(r.E.serialize()));

  const s = rig(r.clock.t + 10e3);
  assert.ok(s.E.load(saved));
  s.E.step();
  assert.equal(s.E.ring, null);
  assert.equal(s.E.timers[0].name, 'focus');
  assert.deepEqual(s.E.world, ['tokyo']);
  assert.equal(s.E.load({ v: 99 }), false);
});

test('command bar: suggestions, ghost text, tab completion, errors', () => {
  const r = rig(morning());
  r.key(':');
  assert.ok(r.E.cmd.open);
  'w to'.split('').forEach(k => r.key(k));
  const v = r.E.view();
  assert.equal(v.cmd.sugg[0].label, 'tokyo');
  assert.equal(v.cmd.ghost, 'kyo');
  assert.match(v.cmd.sugg[0].desc, /^\d\d:\d\d  \+/);
  r.key('Tab');
  assert.equal(r.E.cmd.text, 'w tokyo');
  r.key('Enter');
  assert.deepEqual(r.E.world, ['tokyo']);
  assert.equal(r.E.screen, 'world');

  r.key(':');
  't 2x'.split('').forEach(k => r.key(k));
  assert.equal(r.E.view().cmd.parse.err, `can't read duration "2x"`);
  r.key('u', { ctrlKey: true });
  assert.equal(r.E.cmd.text, '');
  r.key('Backspace');
  assert.equal(r.E.cmd.open, false);
});

test('theme command asks Omarchy to switch, and world clocks use supplied offsets', () => {
  const r = rig(morning());
  r.E.themeList = ['gruvbox', 'tokyo-night', 'catppuccin-latte'];
  r.run('theme tok');
  assert.deepEqual(r.themes, ['tokyo-night']);
  r.run('w tokyo');
  r.run('w new york');
  r.run('w paris'); // no offset known yet
  const v = r.E.view();
  const tokyo = new Date(r.clock.t + 540 * 6e4);
  assert.equal(v.world[0].hhmm, String(tokyo.getUTCHours()).padStart(2, '0') + ':' + String(tokyo.getUTCMinutes()).padStart(2, '0'));
  assert.equal(v.world[2].hhmm, '--:--');
  assert.equal(v.home.id, 'home');
});

test('faces cycle and persist per direction', () => {
  const r = rig(morning());
  assert.equal(r.E.view().face.name, 'digits');
  r.key('f');
  assert.equal(r.E.view().face.name, 'words');
  r.key('F'); r.key('F');
  assert.equal(r.E.view().face.name, 'hex');
  r.run('f dig');
  assert.equal(r.E.view().face.name, 'digits');
});

test('pinned windows only take face keys, and boot swallows the first key', () => {
  const r = rig(morning());
  r.E.replayBoot();
  assert.equal(r.key('a'), true);
  assert.equal(r.E.screen, 'clock');
  assert.equal(r.key('a', {}), true);
  assert.equal(r.E.screen, 'alarms');
  r.key('c');
  assert.equal(r.E.handleKey({ key: 'a' }, true), false);
  assert.equal(r.E.handleKey({ key: 'f' }, true), true);
});

test('am/pm can be a separate word', () => {
  const r = rig(morning());
  r.run('a 6:25 pm');
  r.run('a 7 am gym weekdays');
  r.run('a 9:15 p.m. call');
  assert.deepEqual(r.E.alarms.map(a => [a.h, a.m, a.label]), [[7, 0, 'gym'], [18, 25, 'alarm'], [21, 15, 'call']]);
  assert.deepEqual(r.E.alarms[0].days, [1, 1, 1, 1, 1, 0, 0]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { tokensFromColors, mix } from '../core/theme.mjs';
import { layout, sizeMode } from '../directions/monolith/layout.mjs';
import { createEngine } from '../core/engine.mjs';

const GRUVBOX = `mode = "dark"
accent = "#7daea3"
selection = "#504945"
muted = "#665c54"
background = "#282828"
dark_background = "#1e1e1e"
lighter_background = "#3c3836"
foreground = "#d4be98"
red = "#ea6962"
yellow = "#d8a657"
green = "#a9b665"
cyan = "#89b482"
blue = "#7daea3"
magenta = "#d3869b"
`;

test('colors.toml maps onto the 12 design tokens', () => {
  const { tokens, light } = tokensFromColors(GRUVBOX);
  assert.equal(light, false);
  assert.deepEqual(tokens, {
    bg: '#282828', 'bg-dark': '#1e1e1e', 'bg-light': '#3c3836', fg: '#d4be98', muted: '#665c54', accent: '#7daea3',
    red: '#ea6962', yellow: '#d8a657', green: '#a9b665', cyan: '#89b482', blue: '#7daea3', magenta: '#d3869b',
  });
});

test('older themes that only ship color0..15 still get every token', () => {
  const { tokens } = tokensFromColors('color0 = "#000000"\ncolor1 = "#ff0000"\ncolor4 = "#0000ff"\ncolor7 = "#ffffff"\ncolor8 = "#808080"\n');
  assert.equal(tokens.bg, '#000000');
  assert.equal(tokens.fg, '#ffffff');
  assert.equal(tokens.accent, '#0000ff');
  assert.equal(tokens.muted, '#808080');
  Object.values(tokens).forEach(v => assert.match(v, /^#[0-9a-f]{6}$/));
});

test('every installed Omarchy theme parses to 12 valid tokens', () => {
  const dir = '/usr/share/omarchy/themes';
  if (!existsSync(dir)) return;
  for (const name of ['gruvbox', 'tokyo-night', 'hackerman', 'retro-82', 'lumon', 'catppuccin-latte']) {
    const f = `${dir}/${name}/colors.toml`;
    if (!existsSync(f)) continue;
    const { tokens } = tokensFromColors(readFileSync(f, 'utf8'));
    Object.values(tokens).forEach(v => assert.match(v, /^#[0-9a-f]{6}$/, name));
  }
});

test('OKLab mix matches the endpoints and lands between them', () => {
  assert.equal(mix('#d4be98', '#282828', 1), '#d4be98');
  assert.equal(mix('#d4be98', '#282828', 0), '#282828');
  const dim = mix('#d4be98', '#282828', 0.58);
  const r = parseInt(dim.slice(1, 3), 16);
  assert.ok(r > 0x28 && r < 0xd4, dim);
});

test('size modes follow the design sizes', () => {
  assert.equal(sizeMode(1896, 1030), 'stage');
  assert.equal(sizeMode(941, 1030), 'half');
  assert.equal(sizeMode(476, 316), 'float');
  assert.equal(sizeMode(236, 86), 'pin');
});

test('monolith layout reproduces the handoff formulas', () => {
  const t = new Date(2026, 8, 29, 14, 32, 7).getTime();
  const E = createEngine({ now: () => t, localTz: 'Europe/London', direction: { id: 'monolith', faces: ['digits', 'words', 'hex'] } });
  E.skipBoot();
  const V = E.view();
  const st = layout(V, 1896, 1030);
  // stage clock: min(innerW / (5·0.6 − 4·0.045), innerH / 0.76)
  assert.equal(st.cfs, Math.floor(Math.min((1896 - 80) / (3 - 0.18), (1030 - 60 - 65) / 0.76)));
  assert.equal(st.microTL, 'TUE 29 SEP · CLOCK');
  assert.equal(st.microBR, '14:32:07 · GRUVBOX');
  assert.equal(st.microBL, 'NO ALARMS');
  const hf = layout(V, 941, 1030);
  assert.equal(hf.stack, true);
  assert.equal(hf.cfs, Math.floor(Math.min((941 - 80) / (1.2 - 0.045), (1030 - 60 - 65) / 2 / 0.78)));
  const pin = layout(V, 236, 86);
  assert.equal(pin.microShow, false);
  assert.equal(pin.secH, 4);
  assert.equal(layout(V, 476, 316).microTR, '[?]');
});

test('corner labels step down instead of colliding in narrow tiles', () => {
  const t = new Date(2026, 8, 29, 14, 32, 7).getTime();
  const E = createEngine({ now: () => t, localTz: 'Europe/London', direction: { id: 'monolith', faces: ['digits'] } });
  E.skipBoot();
  E.parse('a 7:30 gym weekdays').run();
  const V = E.view();
  const wide = layout(V, 941, 1030);
  assert.equal(wide.microTR, 'WEEK 40 · 60.6% · [?] KEYS');
  const narrow = layout(V, 327, 700);
  assert.equal(narrow.size, 'half');
  assert.equal(narrow.microTR, '[?]');
  assert.equal(narrow.microTL, 'TUE 29 SEP');
  assert.equal(narrow.microBR, '07');
});

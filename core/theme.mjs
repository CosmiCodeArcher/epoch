// Omarchy theme -> Epoch's 12 design tokens.
// Reads the active theme's colors.toml (named keys, with the older color0..15
// keys as fallbacks) and does the OKLab mixing the design uses for `dim`.

export const TOKENS = ['bg', 'bg-dark', 'bg-light', 'fg', 'muted', 'accent', 'red', 'yellow', 'green', 'cyan', 'blue', 'magenta'];

export const FALLBACK = {
  bg: '#282828', 'bg-dark': '#1e1e1e', 'bg-light': '#3c3836', fg: '#d4be98', muted: '#665c54', accent: '#7daea3',
  red: '#ea6962', yellow: '#d8a657', green: '#a9b665', cyan: '#89b482', blue: '#7daea3', magenta: '#d3869b',
};

export function parseToml(text) {
  const out = {};
  String(text || '').split('\n').forEach(line => {
    const m = line.match(/^\s*([A-Za-z0-9_-]+)\s*=\s*["']?(#?[^"'#\s]+)["']?/);
    if (m) out[m[1]] = m[2];
  });
  return out;
}

const isHex = v => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

export function tokensFromColors(text) {
  const raw = parseToml(text);
  const pick = function () { for (let i = 0; i < arguments.length; i++) { const v = raw[arguments[i]]; if (isHex(v)) return v.toLowerCase(); } return null; };
  const bg = pick('background', 'color0') || FALLBACK.bg;
  const fg = pick('foreground', 'color7', 'color15') || FALLBACK.fg;
  const blue = pick('blue', 'color4') || FALLBACK.blue;
  const t = {
    bg, fg,
    'bg-dark': pick('dark_background', 'darker_background') || mix(bg, '#000000', 0.25),
    'bg-light': pick('lighter_background', 'selection') || mix(fg, bg, 0.12),
    muted: pick('muted', 'color8') || mix(fg, bg, 0.35),
    accent: pick('accent') || blue,
    red: pick('red', 'color1') || FALLBACK.red,
    yellow: pick('yellow', 'color3') || FALLBACK.yellow,
    green: pick('green', 'color2') || FALLBACK.green,
    cyan: pick('cyan', 'color6') || FALLBACK.cyan,
    blue,
    magenta: pick('magenta', 'color5') || FALLBACK.magenta,
  };
  return { tokens: t, light: raw.mode === 'light' };
}

/* ---------- OKLab ---------- */
const toLin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const toGam = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

export function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
}
export function rgbToHex(rgb) {
  return '#' + rgb.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');
}
function rgbToOklab(rgb) {
  const r = toLin(rgb[0]), g = toLin(rgb[1]), b = toLin(rgb[2]);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
function oklabToRgb(lab) {
  const l = Math.pow(lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2], 3);
  const m = Math.pow(lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2], 3);
  const s = Math.pow(lab[0] - 0.0894841775 * lab[1] - 1.2914855480 * lab[2], 3);
  return [toGam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), toGam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), toGam(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)];
}
// color-mix(in oklab, a p, b): p of `a`, the rest `b`. Takes and returns '#rrggbb'.
export function mix(a, b, p) { return rgbToHex(mixRgb(hexToRgb(a), hexToRgb(b), p)); }
// Same on [r, g, b] in 0..1, so QML can feed it animated colors directly.
export function mixRgb(a, b, p) {
  const A = rgbToOklab(a), B = rgbToOklab(b);
  return oklabToRgb([A[0] * p + B[0] * (1 - p), A[1] * p + B[1] * (1 - p), A[2] * p + B[2] * (1 - p)]);
}

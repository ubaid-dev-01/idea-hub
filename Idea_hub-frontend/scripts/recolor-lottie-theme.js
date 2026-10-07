/**
 * Remap all Lottie fill/stroke/gradient colors to Idea Hub landing theme:
 * ink #0A0A0A · stone #F5F5F3 · white #FFFFFF · teal #0F766E
 *
 * Only touches known color fields (c, fc, sc solids, gradient stops) —
 * never position/scale vectors that happen to look like RGB.
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../public/lottie');

const INK = [10 / 255, 10 / 255, 10 / 255];
const STONE = [245 / 255, 245 / 255, 243 / 255];
const WHITE = [1, 1, 1];
const TEAL = [15 / 255, 118 / 255, 110 / 255];
const TEAL_LIGHT = [45 / 255, 212 / 255, 191 / 255];
const TEAL_DARK = [17 / 255, 94 / 255, 89 / 255];
const MUTED = [115 / 255, 115 / 255, 115 / 255];

function lum(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function mix(a, b, t) {
  const u = Math.min(1, Math.max(0, t));
  return [
    a[0] + (b[0] - a[0]) * u,
    a[1] + (b[1] - a[1]) * u,
    a[2] + (b[2] - a[2]) * u,
  ];
}

function remapRgb(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max < 1e-6 ? 0 : (max - min) / max;
  const L = lum(r, g, b);

  if (L >= 0.97) return [...WHITE];
  if (L <= 0.06) return [...INK];

  if (sat < 0.14) {
    if (L >= 0.9) return [...STONE];
    if (L >= 0.55) return mix(MUTED, STONE, (L - 0.55) / 0.35);
    return mix(INK, MUTED, L / 0.55);
  }

  if (L >= 0.78) return mix(TEAL_LIGHT, WHITE, (L - 0.78) / 0.22);
  if (L >= 0.45) return mix(TEAL, TEAL_LIGHT, (L - 0.45) / 0.33);
  if (L >= 0.2) return mix(TEAL_DARK, TEAL, (L - 0.2) / 0.25);
  return mix(INK, TEAL_DARK, L / 0.2);
}

function remapColor4(arr) {
  const [nr, ng, nb] = remapRgb(arr[0], arr[1], arr[2]);
  const out = [nr, ng, nb];
  if (arr.length >= 4) out.push(arr[3]);
  return out;
}

function isColor4(arr) {
  return (
    Array.isArray(arr) &&
    arr.length >= 3 &&
    arr.length <= 4 &&
    arr.every((n) => typeof n === 'number' && n >= 0 && n <= 1.01)
  );
}

/** Remap a color value object: { a: 0, k: [r,g,b,a] } or animated keyframes */
function remapColorProp(prop) {
  if (!prop || typeof prop !== 'object') return;
  const k = prop.k;
  if (isColor4(k)) {
    prop.k = remapColor4(k);
    return;
  }
  if (!Array.isArray(k)) return;
  for (const frame of k) {
    if (!frame || typeof frame !== 'object') continue;
    if (isColor4(frame.s)) frame.s = remapColor4(frame.s);
    if (isColor4(frame.e)) frame.e = remapColor4(frame.e);
  }
}

/**
 * Gradient stops: [offset, r, g, b, ...] × p, then optional opacity stops [offset, a, ...]
 * Color length is always `p * 4` — do not require the full array length to divide evenly.
 */
function remapGradientStops(stops, colorCount) {
  if (!Array.isArray(stops) || stops.length < 4) return stops;
  const p =
    colorCount && colorCount > 0
      ? colorCount
      : Math.max(1, Math.floor(stops.length / 4));
  const colorLen = Math.min(stops.length, p * 4);
  const out = stops.slice();
  for (let i = 0; i + 3 < colorLen; i += 4) {
    const r = out[i + 1];
    const g = out[i + 2];
    const b = out[i + 3];
    if (
      typeof r !== 'number' ||
      typeof g !== 'number' ||
      typeof b !== 'number' ||
      r > 1.01 ||
      g > 1.01 ||
      b > 1.01
    ) {
      continue;
    }
    const [nr, ng, nb] = remapRgb(r, g, b);
    out[i + 1] = nr;
    out[i + 2] = ng;
    out[i + 3] = nb;
  }
  return out;
}

function remapGradientProp(g) {
  if (!g || typeof g !== 'object') return;
  const p = typeof g.p === 'number' ? g.p : null;
  const k = g.k;
  if (!k) return;
  if (Array.isArray(k)) {
    // rare: direct array
    g.k = remapGradientStops(k, p);
    return;
  }
  if (typeof k === 'object') {
    if (Array.isArray(k.k) && typeof k.k[0] === 'number') {
      k.k = remapGradientStops(k.k, p);
    } else if (Array.isArray(k.k)) {
      for (const frame of k.k) {
        if (frame && Array.isArray(frame.s))
          frame.s = remapGradientStops(frame.s, p);
        if (frame && Array.isArray(frame.e))
          frame.e = remapGradientStops(frame.e, p);
      }
    }
  }
}

function walkShapes(items) {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    // Group
    if (item.ty === 'gr' && item.it) walkShapes(item.it);
    // Fill
    if (item.ty === 'fl' && item.c) remapColorProp(item.c);
    // Stroke
    if (item.ty === 'st' && item.c) remapColorProp(item.c);
    // Gradient fill / stroke
    if ((item.ty === 'gf' || item.ty === 'gs') && item.g) remapGradientProp(item.g);
  }
}

function walkLayer(layer) {
  if (!layer || typeof layer !== 'object') return;
  if (typeof layer.sc === 'string' && /^#?[0-9A-Fa-f]{6}$/.test(layer.sc)) {
    const hex = layer.sc.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const [nr, ng, nb] = remapRgb(r, g, b);
    layer.sc =
      '#' +
      [nr, ng, nb]
        .map((n) =>
          Math.round(n * 255)
            .toString(16)
            .padStart(2, '0')
        )
        .join('');
  }
  if (layer.shapes) walkShapes(layer.shapes);
  // Text layer color (some exports)
  if (layer.sw && layer.sc) {
    /* solid handled above */
  }
}

function recolorAnimation(json) {
  if (Array.isArray(json.layers)) json.layers.forEach(walkLayer);
  if (Array.isArray(json.assets)) {
    for (const asset of json.assets) {
      if (asset && Array.isArray(asset.layers)) asset.layers.forEach(walkLayer);
    }
  }
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
for (const f of files) {
  const fp = path.join(dir, f);
  const json = JSON.parse(fs.readFileSync(fp, 'utf8'));
  recolorAnimation(json);
  fs.writeFileSync(fp, JSON.stringify(json));
  console.log('recolored', f);
}
console.log('done', files.length, 'files');

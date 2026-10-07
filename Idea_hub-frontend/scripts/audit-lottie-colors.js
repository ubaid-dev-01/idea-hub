const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '../public/lottie');

function hex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((n) =>
        Math.round(Math.min(1, Math.max(0, n)) * 255)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

function addColor(colors, arr) {
  if (!Array.isArray(arr) || arr.length < 3) return;
  if (arr.slice(0, 3).some((n) => typeof n !== 'number' || n < 0 || n > 1.01))
    return;
  const h = hex(arr[0], arr[1], arr[2]);
  colors.set(h, (colors.get(h) || 0) + 1);
}

function addStops(colors, stops, p) {
  if (!Array.isArray(stops)) return;
  const count = p && p > 0 ? p : Math.floor(stops.length / 4);
  const colorLen = Math.min(stops.length, count * 4);
  for (let i = 0; i + 3 < colorLen; i += 4) {
    addColor(colors, [stops[i + 1], stops[i + 2], stops[i + 3]]);
  }
}

function colorProp(colors, prop) {
  if (!prop || !('k' in prop)) return;
  if (Array.isArray(prop.k) && typeof prop.k[0] === 'number') addColor(colors, prop.k);
  else if (Array.isArray(prop.k)) {
    for (const f of prop.k) {
      if (f?.s) addColor(colors, f.s);
      if (f?.e) addColor(colors, f.e);
    }
  }
}

function shapes(colors, items) {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (!item) continue;
    if (item.ty === 'gr' && item.it) shapes(colors, item.it);
    if ((item.ty === 'fl' || item.ty === 'st') && item.c) colorProp(colors, item.c);
    if ((item.ty === 'gf' || item.ty === 'gs') && item.g?.k) {
      const p = item.g.p;
      const k = item.g.k;
      if (Array.isArray(k?.k) && typeof k.k[0] === 'number') addStops(colors, k.k, p);
      else if (Array.isArray(k?.k)) {
        for (const f of k.k) {
          if (f?.s) addStops(colors, f.s, p);
          if (f?.e) addStops(colors, f.e, p);
        }
      }
    }
  }
}

function layer(colors, l) {
  if (!l) return;
  if (typeof l.sc === 'string') {
    const h = l.sc.startsWith('#') ? l.sc.toLowerCase() : '#' + l.sc.toLowerCase();
    colors.set(h, (colors.get(h) || 0) + 1);
  }
  if (l.shapes) shapes(colors, l.shapes);
}

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const json = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const colors = new Map();
  (json.layers || []).forEach((l) => layer(colors, l));
  for (const a of json.assets || []) {
    (a.layers || []).forEach((l) => layer(colors, l));
  }
  const sorted = [...colors.entries()].sort((a, b) => b[1] - a[1]);
  console.log('\n' + f + ' (' + sorted.length + ' fill/stroke colors)');
  console.log(sorted.slice(0, 12).map(([h, c]) => h + '×' + c).join('  ') || '(none)');
}

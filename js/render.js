'use strict';
// ════════════════════════════════════════════════════════════════
//  RENDERING: textures, chunk cache, parallax, lighting, sprites
// ════════════════════════════════════════════════════════════════
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
function shade(h, a) { const [r, g, b] = hexRgb(h), f = x => clamp(Math.round(a >= 0 ? x + (255 - x) * a : x * (1 + a)), 0, 255); return `rgb(${f(r)},${f(g)},${f(b)})`; }
function alpha(h, a) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function ell(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, 6.2832); }
function lg(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => gr.addColorStop(stops.length === 1 ? 0 : i / (stops.length - 1), s)); return gr; }
function rg(g, x, y, r, stops) { const gr = g.createRadialGradient(x, y, 0, x, y, r); stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s)); return gr; }

let TEX = null, BG = null, SPR = null, DECOR = [], WEATHER = [];
const chunks = new Map(), CH = 16;
const lightC = mk(W / 4, H / 4), lctx = lightC.getContext('2d');
let vignette = null;

// ── TILE TEXTURES ───────────────────────────────────────────────
function buildTextures(th, name) {
  const t = { soil: [], top: [], stone: [] };
  for (let v = 0; v < 4; v++) {
    const c = mk(T, T), g = c.getContext('2d'), r = RNG(101 + v * 17);
    g.fillStyle = th.soil; g.fillRect(0, 0, T, T);
    for (let i = 0; i < 50; i++) { g.fillStyle = r() < .5 ? alpha(th.soilDark, .25 + r() * .35) : alpha(th.soilLight, .2 + r() * .3); const s = 2 + r() * 5; g.fillRect(r() * T | 0, r() * T | 0, s, s * .6); }
    for (let i = 0; i < 3; i++) { const x = 7 + r() * 34, y = 7 + r() * 34, w = 3 + r() * 5; g.fillStyle = alpha(th.soilDark, .8); ell(g, x, y + 1.5, w, w * .65); g.fill(); g.fillStyle = shade(th.soilLight, .12); ell(g, x, y, w, w * .65); g.fill(); g.fillStyle = 'rgba(255,255,255,.18)'; ell(g, x - w * .3, y - w * .2, w * .35, w * .2); g.fill(); }
    t.soil.push(c);
  }
  for (let v = 0; v < 4; v++) { // top overlay (grass / moss / snow / ash) – 48x34, drawn at y-14
    const c = mk(T, 34), g = c.getContext('2d'), r = RNG(555 + v * 31);
    if (th.top === 'snow') {
      g.fillStyle = lg(g, 0, 6, 0, 32, [th.grassLight, th.grass, th.grassDark]);
      g.beginPath(); g.moveTo(0, 14);
      for (let x = 0; x <= T; x += 12) g.quadraticCurveTo(x + 6, 5 + r() * 4, x + 12, 13);
      g.lineTo(T, 26); for (let x = T; x >= 0; x -= 8) g.quadraticCurveTo(x - 4, 31 + r() * 3, x - 8, 25 + r() * 3); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 5; i++) g.fillRect(r() * T | 0, 9 + r() * 10 | 0, 2, 2);
    } else {
      const moss = th.top !== 'grass';
      g.fillStyle = lg(g, 0, 10, 0, 32, [th.grass, th.grassDark]);
      g.beginPath(); g.moveTo(0, 13); g.lineTo(T, 13); g.lineTo(T, 24);
      for (let x = T; x >= 0; x -= 8) g.quadraticCurveTo(x - 4, (moss ? 27 : 30) + r() * 4, x - 8, 23 + r() * 3);
      g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 22, T, 2);
      if (th.top === 'ash') { g.fillStyle = alpha(th.grassLight, .8); for (let i = 0; i < 4; i++) g.fillRect(r() * T | 0, 15 + r() * 6 | 0, 3 + r() * 5, 1.5); }
      const n = moss ? 6 : 11;
      for (let i = 0; i < n; i++) {
        const x = (i + r() * .8) * T / n, h = moss ? 3 + r() * 4 : 6 + r() * 9, lean = (r() - .5) * 6;
        g.fillStyle = r() < .5 ? th.grass : th.grassLight;
        g.beginPath(); g.moveTo(x - 3, 15); g.quadraticCurveTo(x + lean * .5, 15 - h * .6, x + lean, 14 - h); g.quadraticCurveTo(x + 2 + lean * .5, 15 - h * .5, x + 4, 15); g.fill();
      }
      g.fillStyle = alpha(th.grassLight, .55); g.fillRect(0, 13, T, 2);
    }
    t.top.push(c);
  }
  for (let v = 0; v < 3; v++) {
    const c = mk(T, T), g = c.getContext('2d'), r = RNG(900 + v * 13);
    g.fillStyle = shade(th.stone, -.5); g.fillRect(0, 0, T, T);
    g.fillStyle = lg(g, 0, 0, T, T, [shade(th.stone, .18), th.stone, shade(th.stone, -.2)]); rr(g, 1.5, 1.5, T - 3, T - 3, 5); g.fill();
    for (let i = 0; i < 26; i++) { g.fillStyle = r() < .5 ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.09)'; g.fillRect(3 + r() * 40 | 0, 3 + r() * 40 | 0, 2 + r() * 4, 2); }
    g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(5, T - 8); g.lineTo(5, 5); g.lineTo(T - 8, 5); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.moveTo(T - 4, 8); g.lineTo(T - 4, T - 4); g.lineTo(8, T - 4); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.beginPath(); let x = 10 + r() * 20, y = 8; g.moveTo(x, y); for (let i = 0; i < 3; i++) { x += (r() - .5) * 12; y += 6 + r() * 6; g.lineTo(x, y); } g.stroke();
    t.stone.push(c);
  }
  const one = fn => { const c = mk(T, T); fn(c.getContext('2d')); return c; };
  t.crack = one(g => {
    g.drawImage(t.stone[0], 0, 0); g.fillStyle = 'rgba(255,220,160,.12)'; g.fillRect(2, 2, T - 4, T - 4);
    g.strokeStyle = 'rgba(0,0,0,.75)'; g.lineWidth = 2.2; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(8, 3); g.lineTo(18, 16); g.lineTo(12, 26); g.lineTo(24, 34); g.lineTo(20, 45); g.moveTo(18, 16); g.lineTo(32, 12); g.lineTo(42, 20); g.moveTo(24, 34); g.lineTo(38, 30); g.lineTo(44, 40); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(10, 3); g.lineTo(20, 16); g.moveTo(26, 34); g.lineTo(22, 45); g.stroke();
  });
  t.brick = one(g => {
    g.fillStyle = shade(th.brick, -.55); g.fillRect(0, 0, T, T);
    const b = (x, y, w, h) => { g.fillStyle = lg(g, 0, y, 0, y + h, [shade(th.brick, .16), th.brick, shade(th.brick, -.22)]); rr(g, x, y, w, h, 3); g.fill(); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(x + 3, y + 2, w - 6, 2); };
    b(1, 1, 22, 14); b(25, 1, 22, 14); b(1, 17, 10, 14); b(13, 17, 22, 14); b(37, 17, 10, 14); b(1, 33, 22, 14); b(25, 33, 22, 14);
  });
  t.q = one(g => {
    g.fillStyle = '#6a3d00'; rr(g, 0, 0, T, T, 7); g.fill();
    g.fillStyle = lg(g, 0, 0, 0, T, ['#ffe98a', '#f7b21c', '#c97c00']); rr(g, 2, 2, T - 4, T - 4, 6); g.fill();
    g.fillStyle = 'rgba(255,255,255,.45)'; rr(g, 5, 4, T - 10, 6, 3); g.fill();
    g.fillStyle = '#8a5200'; [[7, 8], [T - 9, 8], [7, T - 8], [T - 9, T - 8]].forEach(p => { ell(g, p[0] + 1, p[1], 2.4, 2.4); g.fill(); });
    g.fillStyle = '#8a5200'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, rad = i % 2 ? 5 : 15; g.lineTo(24 + Math.cos(a) * rad, 26 + Math.sin(a) * rad); } g.fill();
    g.fillStyle = '#fffbe0'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, rad = i % 2 ? 4.5 : 14; g.lineTo(24 + Math.cos(a) * rad, 24 + Math.sin(a) * rad); } g.fill();
  });
  t.used = one(g => {
    g.fillStyle = '#2e241c'; rr(g, 0, 0, T, T, 7); g.fill();
    g.fillStyle = lg(g, 0, 0, 0, T, ['#9a7f66', '#75604e', '#54443a']); rr(g, 2, 2, T - 4, T - 4, 6); g.fill();
    g.fillStyle = '#3a2e26'; [[8, 8], [T - 8, 8], [8, T - 8], [T - 8, T - 8]].forEach(p => { ell(g, p[0], p[1], 2.4, 2.4); g.fill(); });
  });
  t.ice = one(g => {
    g.fillStyle = lg(g, 0, 0, 0, T, ['#f2fbff', '#a8dcf7', '#6fb4e6']); g.fillRect(0, 0, T, T);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(6, 30); g.lineTo(22, 8); g.lineTo(27, 8); g.lineTo(11, 30); g.fill(); g.beginPath(); g.moveTo(26, 40); g.lineTo(38, 22); g.lineTo(41, 22); g.lineTo(29, 40); g.fill();
    g.fillStyle = '#fff'; g.fillRect(0, 0, T, 5); g.fillStyle = 'rgba(40,90,150,.25)'; g.fillRect(0, T - 3, T, 3);
  });
  t.oneway = one(g => {
    g.fillStyle = lg(g, 0, 0, 0, 14, ['#d9a05a', '#a56a2e', '#6e431a']); rr(g, 0, 0, T, 14, 3); g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(2, 1, T - 4, 2); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(23, 0, 2, 14);
    g.fillStyle = '#3a2410'; ell(g, 6, 7, 1.8, 1.8); g.fill(); ell(g, T - 6, 7, 1.8, 1.8); g.fill();
    g.fillStyle = '#5a3818'; g.beginPath(); g.moveTo(8, 14); g.lineTo(14, 14); g.lineTo(8, 22); g.fill(); g.beginPath(); g.moveTo(T - 8, 14); g.lineTo(T - 14, 14); g.lineTo(T - 8, 22); g.fill();
  });
  t.cloud = one(g => {
    const dark = th.dark > 0;
    g.fillStyle = dark ? 'rgba(190,200,255,.5)' : 'rgba(255,255,255,.5)'; ell(g, 24, 18, 30, 12); g.fill();
    g.fillStyle = lg(g, 0, 0, 0, 30, [dark ? '#e8e6ff' : '#ffffff', dark ? '#a9a6e0' : '#d5e6f7']);
    g.beginPath(); g.arc(8, 14, 12, 0, 6.29); g.arc(24, 11, 14, 0, 6.29); g.arc(40, 14, 12, 0, 6.29); g.rect(0, 14, T, 12); g.fill();
    g.fillStyle = 'rgba(255,255,255,.8)'; ell(g, 20, 6, 8, 3); g.fill();
  });
  t.ladder = one(g => {
    if (th.tree === 'oak' || th.tree === 'shroom' || th.tree === 'autumn') {
      g.strokeStyle = '#2c7a2a'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(24, 0); g.bezierCurveTo(34, 12, 14, 36, 24, 48); g.stroke();
      g.strokeStyle = '#6fd05a'; g.lineWidth = 2; g.beginPath(); g.moveTo(23, 0); g.bezierCurveTo(33, 12, 13, 36, 23, 48); g.stroke();
      const leaf = (x, y, a) => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#4fb53f'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(9, -7, 17, 0); g.quadraticCurveTo(9, 6, 0, 0); g.fill(); g.strokeStyle = '#2c7a2a'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.lineTo(15, 0); g.stroke(); g.restore(); };
      leaf(28, 10, -.4); leaf(20, 24, 3.4); leaf(27, 38, .3);
    } else {
      g.fillStyle = lg(g, 0, 0, T, 0, ['#8a5a2e', '#b98248', '#8a5a2e']); g.fillRect(8, 0, 6, T); g.fillRect(T - 14, 0, 6, T);
      g.fillStyle = '#c99556'; for (let y = 6; y < T; y += 16) { g.fillRect(8, y, T - 16, 5); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(8, y + 5, T - 16, 2); g.fillStyle = '#c99556'; }
    }
  });
  const spike = flip => one(g => {
    if (flip) { g.translate(0, T); g.scale(1, -1); }
    for (let i = 0; i < 3; i++) { const x = i * 16;
      g.fillStyle = lg(g, x, 0, x + 16, 0, ['#f4f7fb', '#b9c2ce', '#6c7684']); g.beginPath(); g.moveTo(x + 1, T); g.lineTo(x + 8, 14); g.lineTo(x + 15, T); g.fill();
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(x + 4, T); g.lineTo(x + 8, 16); g.lineTo(x + 7, T); g.fill(); }
    g.fillStyle = '#4a5260'; g.fillRect(0, T - 4, T, 4);
  });
  t.spikeUp = spike(false); t.spikeDown = spike(true);
  t.crumble = one(g => {
    g.fillStyle = shade(th.soilLight, -.45); rr(g, 0, 0, T, T, 4); g.fill();
    g.fillStyle = lg(g, 0, 0, 0, T, [shade(th.soilLight, .25), th.soilLight]); rr(g, 2, 2, T - 4, T - 6, 4); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(14, 2); g.lineTo(20, 18); g.lineTo(12, 30); g.lineTo(18, 44); g.moveTo(20, 18); g.lineTo(34, 24); g.lineTo(38, 42); g.stroke();
  });
  return t;
}

// ── CHUNK CACHE ─────────────────────────────────────────────────
function coveredBySecret(c, r) { for (const s of level.secrets) if (s.cover && !s.found && c >= s.c0 && c <= s.c1 && r >= s.r0 && r <= s.r1) return true; return false; }
function inSecretWall(c, r) { for (const s of level.secrets) if (s.wall && c >= s.c0 && c <= s.c1 && r >= s.r0 && r <= s.r1) return true; return false; }
const groundLike = (c, r) => { const ch = tileAt(c, r); return ch === '#' || ch === 'c' || ch === 'I' || coveredBySecret(c, r); };
function invalidateChunk(c) { chunks.delete(Math.floor(c / CH)); if (c % CH === 0) chunks.delete(Math.floor(c / CH) - 1); if (c % CH === CH - 1) chunks.delete(Math.floor(c / CH) + 1); }
function drawSoilCell(g, x, y, c, r) {
  g.drawImage(TEX.soil[(hash2(c, r) * 4) | 0], x, y);
  let d = 0; while (d < 6 && groundLike(c, r - d - 1)) d++;
  if (d) { g.fillStyle = `rgba(0,0,10,${d * .05})`; g.fillRect(x, y, T, T); }
}
function getChunk(i) {
  let cv = chunks.get(i);
  if (cv) return cv;
  if (chunks.size > 4) { let far = null, fd = -1; chunks.forEach((_, k) => { const d = Math.abs(k - i); if (d > fd) { fd = d; far = k; } }); chunks.delete(far); }
  cv = mk(CH * T, level.rows * T); const g = cv.getContext('2d'), th = level.theme, c0 = i * CH;
  for (let r = 0; r < level.rows; r++) for (let c = c0; c < c0 + CH && c < level.cols; c++) {
    const ch = level.grid[r][c], x = (c - c0) * T, y = r * T;
    if (ch !== '#' && inSecretWall(c, r)) { g.drawImage(TEX.soil[(hash2(c, r) * 4) | 0], x, y); g.fillStyle = 'rgba(0,0,12,.58)'; g.fillRect(x, y, T, T); }
    if (ch === '#') {
      drawSoilCell(g, x, y, c, r);
      if (!groundLike(c - 1, r) && c > 0) { g.fillStyle = lg(g, x, 0, x + 12, 0, ['rgba(0,0,0,.4)', 'rgba(0,0,0,0)']); g.fillRect(x, y, 12, T); g.fillStyle = alpha(th.soilLight, .5); g.fillRect(x, y, 2, T); }
      if (!groundLike(c + 1, r) && c < level.cols - 1) { g.fillStyle = lg(g, x + T - 12, 0, x + T, 0, ['rgba(0,0,0,0)', 'rgba(0,0,0,.45)']); g.fillRect(x + T - 12, y, 12, T); }
      if (!groundLike(c, r + 1) && r < level.rows - 1) { g.fillStyle = lg(g, 0, y + T - 14, 0, y + T, ['rgba(0,0,0,0)', 'rgba(0,0,0,.55)']); g.fillRect(x, y + T - 14, T, 14); }
    } else if (ch === 'S') g.drawImage(TEX.stone[(hash2(c, r) * 3) | 0], x, y);
    else if (ch === 'c') g.drawImage(TEX.crack, x, y);
    else if (ch === 'I') g.drawImage(TEX.ice, x, y);
    else if (ch === '-') g.drawImage(TEX.oneway, x, y);
    else if (ch === 'k') g.drawImage(TEX.cloud, x, y - 4);
    else if (ch === 'H') g.drawImage(TEX.ladder, x, y);
    else if (ch === '^') g.drawImage(TEX.spikeUp, x, y);
    else if (ch === 'v') g.drawImage(TEX.spikeDown, x, y);
  }
  // tops + small flora
  for (let r = 1; r < level.rows; r++) for (let c = c0; c < c0 + CH && c < level.cols; c++) {
    if (level.grid[r][c] !== '#') continue;
    const up = level.grid[r - 1][c], x = (c - c0) * T, y = r * T;
    if (up === '~' || up === 'w' || up === 'L' || SOLIDS.indexOf(up) >= 0 || inSecretWall(c, r - 1)) continue;
    g.drawImage(TEX.top[(hash2(c * 3, r) * 4) | 0], x, y - 14);
    if (up !== ' ') continue;
    const h = hash2(c * 13 + 5, r * 7), rnd = RNG((c * 977 + r * 131) | 1), fx = x + 8 + rnd() * 30;
    if (h < .55) drawFlora(g, th, fx, y, rnd);
  }
  chunks.set(i, cv); return cv;
}
function drawFlora(g, th, x, y, r) {
  const k = r();
  if (th.tree === 'oak' || th.tree === 'autumn' || th.tree === 'shroom') {
    if (k < .45) { // flower
      const col = th.tree === 'shroom' ? ['#9ff', '#f9f', '#ff9'][r() * 3 | 0] : ['#fff', '#ffd23f', '#ff7a9a', '#c9a0ff', '#ff9a3d'][r() * 5 | 0], h = 10 + r() * 10;
      g.strokeStyle = th.grassDark; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 3, y - h * .5, x, y - h); g.stroke();
      g.fillStyle = col; for (let i = 0; i < 5; i++) { const a = i * 1.257; ell(g, x + Math.cos(a) * 3.2, y - h + Math.sin(a) * 3.2, 2.8, 2.8); g.fill(); }
      g.fillStyle = '#ffb020'; ell(g, x, y - h, 2, 2); g.fill();
    } else if (k < .8) { // tall tuft
      g.strokeStyle = th.grassLight; g.lineWidth = 2; g.lineCap = 'round';
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x + i * 2, y); g.quadraticCurveTo(x + i * 4, y - 9, x + i * 6, y - 13 - r() * 6); g.stroke(); }
    } else { // mushroom
      g.fillStyle = '#f2e6d0'; rr(g, x - 2, y - 8, 4, 8, 2); g.fill(); g.fillStyle = th.tree === 'shroom' ? '#d07aff' : '#e2483a'; g.beginPath(); g.arc(x, y - 8, 7, Math.PI, 0); g.fill(); g.fillStyle = '#fff'; ell(g, x - 3, y - 11, 1.3, 1.3); g.fill(); ell(g, x + 2, y - 12, 1.1, 1.1); g.fill();
    }
  } else if (th.tree === 'crystal') {
    if (k < .5) { const h = 8 + r() * 12; g.fillStyle = lg(g, x - 5, 0, x + 5, 0, ['#bff', '#4fd6c8', '#2a8a9a']); g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x - 2, y - h); g.lineTo(x + 3, y - h * .8); g.lineTo(x + 5, y); g.fill(); }
    else { g.fillStyle = shade(th.soil, -.2); g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x, y - 12 - r() * 10); g.lineTo(x + 7, y); g.fill(); }
  } else if (th.tree === 'pine') {
    if (k < .5) { g.fillStyle = '#fff'; ell(g, x, y - 2, 9 + r() * 5, 5); g.fill(); g.fillStyle = 'rgba(160,190,230,.5)'; ell(g, x + 2, y, 8, 3); g.fill(); }
    else { g.strokeStyle = '#5a4030'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y - 14); g.moveTo(x + 1, y - 7); g.lineTo(x + 7, y - 12); g.moveTo(x + 1, y - 9); g.lineTo(x - 5, y - 13); g.stroke(); }
  } else {
    if (k < .5) { g.fillStyle = shade(th.stone, -.3); ell(g, x, y - 3, 8, 5); g.fill(); g.fillStyle = shade(th.stone, .05); ell(g, x - 1, y - 4, 6, 3.5); g.fill(); }
    else { g.fillStyle = '#e8e0d0'; rr(g, x - 7, y - 4, 14, 3, 1.5); g.fill(); ell(g, x - 7, y - 3, 2.5, 2.5); g.fill(); ell(g, x + 7, y - 3, 2.5, 2.5); g.fill(); }
  }
}

// ── SPRITES (trees, big decor, clouds) ──────────────────────────
function buildSprites(th) {
  const s = { trees: [], bushes: [], hang: [], clouds: [] }, kind = th.tree;
  for (let v = 0; v < 3; v++) {
    const c = mk(240, 320), g = c.getContext('2d'), r = RNG(4242 + v * 91), cx = 120, by = 318;
    if (kind === 'oak' || kind === 'autumn') {
      const pal = kind === 'oak' ? ['#1f6a2a', '#2f8a34', '#57b947', '#9be06a'] : ['#8a2f1a', '#c2501c', '#ee8a2a', '#ffc85a'];
      const th_ = 190 + r() * 60;
      g.fillStyle = lg(g, cx - 14, 0, cx + 14, 0, ['#3a2414', '#7a5030', '#4a2e18']);
      g.beginPath(); g.moveTo(cx - 16, by); g.quadraticCurveTo(cx - 8, by - th_ * .5, cx - 7, by - th_); g.lineTo(cx + 7, by - th_); g.quadraticCurveTo(cx + 8, by - th_ * .5, cx + 18, by); g.fill();
      g.strokeStyle = '#4a2e18'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, by - th_ * .6); g.lineTo(cx - 40, by - th_ * .85); g.moveTo(cx, by - th_ * .7); g.lineTo(cx + 44, by - th_ * .95); g.stroke();
      const blobs = []; for (let i = 0; i < 16; i++) blobs.push([cx + (r() - .5) * 150, by - th_ - 10 + (r() - .5) * 90, 28 + r() * 24]);
      blobs.forEach(b => { g.fillStyle = pal[0]; ell(g, b[0], b[1] + 6, b[2], b[2] * .9); g.fill(); });
      blobs.forEach(b => { g.fillStyle = pal[1]; ell(g, b[0], b[1], b[2] * .92, b[2] * .82); g.fill(); });
      blobs.forEach(b => { g.fillStyle = pal[2]; ell(g, b[0] - b[2] * .2, b[1] - b[2] * .25, b[2] * .6, b[2] * .5); g.fill(); });
      blobs.forEach(b => { g.fillStyle = alpha(pal[3], .7); ell(g, b[0] - b[2] * .32, b[1] - b[2] * .42, b[2] * .26, b[2] * .18); g.fill(); });
    } else if (kind === 'pine') {
      const th_ = 230 + r() * 60;
      g.fillStyle = '#4a3222'; g.fillRect(cx - 7, by - 50, 14, 50);
      for (let i = 0; i < 6; i++) { const y = by - 30 - i * (th_ - 40) / 6, w = 84 - i * 12, h = (th_ - 40) / 6 + 26;
        g.fillStyle = lg(g, cx - w, 0, cx + w, 0, ['#1d4a3c', '#2f6e55', '#16382e']); g.beginPath(); g.moveTo(cx - w, y); g.lineTo(cx, y - h); g.lineTo(cx + w, y); g.quadraticCurveTo(cx, y + 10, cx - w, y); g.fill();
        g.fillStyle = '#f4f9ff'; g.beginPath(); g.moveTo(cx - w * .75, y - h * .22); g.lineTo(cx, y - h); g.lineTo(cx + w * .6, y - h * .3); g.quadraticCurveTo(cx + w * .2, y - h * .32, cx, y - h * .5); g.quadraticCurveTo(cx - w * .3, y - h * .25, cx - w * .75, y - h * .22); g.fill(); }
    } else if (kind === 'crystal') {
      for (let i = 0; i < 5; i++) { const x = cx + (i - 2) * 26 + (r() - .5) * 12, h = 70 + r() * 130, w = 14 + r() * 12, a = (i - 2) * .16; const hue = r() < .5 ? ['#d8fbff', '#58dcd0', '#1f7f96'] : ['#f0dcff', '#b07aff', '#5a2fa8'];
        g.save(); g.translate(x, by); g.rotate(a);
        g.fillStyle = lg(g, -w, 0, w, 0, hue); g.beginPath(); g.moveTo(-w, 0); g.lineTo(-w, -h + 18); g.lineTo(0, -h); g.lineTo(w, -h + 18); g.lineTo(w, 0); g.fill();
        g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(-w, 0); g.lineTo(-w, -h + 18); g.lineTo(0, -h); g.lineTo(-w * .2, 0); g.fill(); g.restore(); }
    } else if (kind === 'column') {
      const h = 200 + r() * 70;
      g.fillStyle = lg(g, cx - 22, 0, cx + 22, 0, ['#3a3236', '#7a7076', '#2c2629']); g.fillRect(cx - 20, by - h, 40, h);
      g.fillStyle = 'rgba(0,0,0,.25)'; for (let x = -14; x <= 14; x += 9) g.fillRect(cx + x, by - h + 10, 3, h - 20);
      g.fillStyle = '#5a5056'; g.fillRect(cx - 30, by - 16, 60, 16); g.fillRect(cx - 28, by - h - 12, 56, 14);
      if (v !== 1) { g.fillStyle = lg(g, 0, by - h, 0, by - h + 130, ['#b02a1e', '#6a1410']); g.beginPath(); g.moveTo(cx + 34, by - h + 6); g.lineTo(cx + 78, by - h + 6); g.lineTo(cx + 78, by - h + 120); g.lineTo(cx + 56, by - h + 100); g.lineTo(cx + 34, by - h + 120); g.fill(); g.fillStyle = '#ffb040'; ell(g, cx + 56, by - h + 50, 9, 9); g.fill(); g.fillStyle = '#3a3236'; g.fillRect(cx + 28, by - h + 2, 56, 5); }
    } else { // giant glowing mushrooms
      const h = 120 + r() * 120, w = 60 + r() * 40, col = [['#ff7ad0', '#a02a9a'], ['#7ad0ff', '#2a5aa0'], ['#b0ff7a', '#2a8a6a']][v];
      g.fillStyle = lg(g, cx - 12, 0, cx + 12, 0, ['#cfc6e8', '#f4f0ff', '#a9a0c8']); g.beginPath(); g.moveTo(cx - 14, by); g.quadraticCurveTo(cx - 6, by - h * .5, cx - 9, by - h); g.lineTo(cx + 9, by - h); g.quadraticCurveTo(cx + 6, by - h * .5, cx + 16, by); g.fill();
      g.fillStyle = rg(g, cx - w * .3, by - h - w * .5, w * 1.4, [col[0], col[1]]); g.beginPath(); g.moveTo(cx - w, by - h + 6); g.quadraticCurveTo(cx - w, by - h - w * .9, cx, by - h - w * .9); g.quadraticCurveTo(cx + w, by - h - w * .9, cx + w, by - h + 6); g.quadraticCurveTo(cx, by - h - 8, cx - w, by - h + 6); g.fill();
      g.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 6; i++) { ell(g, cx + (r() - .5) * w * 1.4, by - h - 14 - r() * w * .6, 4 + r() * 5, 3 + r() * 4); g.fill(); }
    }
    s.trees.push(c);
  }
  for (let v = 0; v < 2; v++) { // bushes / rocks
    const c = mk(120, 70), g = c.getContext('2d'), r = RNG(77 + v * 5);
    if (kind === 'oak' || kind === 'autumn' || kind === 'shroom') {
      const pal = kind === 'oak' ? ['#1f6a2a', '#3a9a3c', '#7fd060'] : kind === 'autumn' ? ['#7a2a18', '#c8581e', '#ffb04a'] : ['#1c5a6a', '#2fa89a', '#9fffe0'];
      const bl = []; for (let i = 0; i < 7; i++) bl.push([18 + i * 14 + (r() - .5) * 8, 46 - Math.sin(i / 6 * Math.PI) * 16 + (r() - .5) * 6, 16 + r() * 8]);
      bl.forEach(b => { g.fillStyle = pal[0]; ell(g, b[0], b[1] + 4, b[2], b[2]); g.fill(); });
      bl.forEach(b => { g.fillStyle = pal[1]; ell(g, b[0], b[1], b[2] * .9, b[2] * .85); g.fill(); });
      bl.forEach(b => { g.fillStyle = alpha(pal[2], .8); ell(g, b[0] - 4, b[1] - 6, b[2] * .45, b[2] * .35); g.fill(); });
      if (kind !== 'autumn') { g.fillStyle = kind === 'oak' ? '#ff5a6a' : '#fff'; for (let i = 0; i < 6; i++) { ell(g, 14 + r() * 92, 30 + r() * 24, 2.5, 2.5); g.fill(); } }
    } else {
      const col = kind === 'pine' ? '#c9d8ea' : th.stone;
      g.fillStyle = shade(col, -.35); g.beginPath(); g.moveTo(8, 70); g.lineTo(22, 34); g.lineTo(52, 20 + v * 10); g.lineTo(88, 30); g.lineTo(112, 70); g.fill();
      g.fillStyle = lg(g, 0, 20, 0, 70, [shade(col, .25), col]); g.beginPath(); g.moveTo(14, 70); g.lineTo(26, 38); g.lineTo(52, 25 + v * 10); g.lineTo(72, 36); g.lineTo(84, 70); g.fill();
      if (kind === 'pine') { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(22, 40); g.lineTo(52, 20 + v * 10); g.lineTo(88, 32); g.quadraticCurveTo(54, 36, 22, 40); g.fill(); }
    }
    s.bushes.push(c);
  }
  for (let v = 0; v < 3; v++) { // hanging (stalactites / icicles / chains)
    const c = mk(70, 150), g = c.getContext('2d'), r = RNG(31 + v * 9), h = 60 + r() * 80;
    g.fillStyle = lg(g, 10, 0, 60, 0, [shade(th.soil, .15), th.soil, shade(th.soil, -.4)]);
    g.beginPath(); g.moveTo(6, 0); g.quadraticCurveTo(26, h * .4, 35 + (r() - .5) * 10, h); g.quadraticCurveTo(44, h * .4, 64, 0); g.fill();
    g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(12, 0); g.quadraticCurveTo(26, h * .4, 34, h * .9); g.quadraticCurveTo(28, h * .3, 24, 0); g.fill();
    s.hang.push(c);
  }
  for (let v = 0; v < 4; v++) {
    const c = mk(300, 130), g = c.getContext('2d'), r = RNG(8 + v * 3), n = 6 + v;
    const base = th.tree === 'autumn' ? [255, 196, 170] : th.tree === 'shroom' ? [150, 140, 220] : [255, 255, 255];
    for (let i = 0; i < n; i++) { const x = 50 + i * (200 / n) + (r() - .5) * 20, y = 74 - Math.sin(i / (n - 1) * Math.PI) * 26 + (r() - .5) * 8, rad = 30 + r() * 22;
      g.fillStyle = rg(g, x - rad * .2, y - rad * .3, rad, [`rgba(${base},.95)`, `rgba(${base},.75)`, `rgba(${base},0)`]); ell(g, x, y, rad, rad * .8); g.fill(); }
    g.fillStyle = `rgba(${base.map(x => x * .7 | 0)},.16)`; ell(g, 150, 92, 100, 12); g.fill();
    s.clouds.push(c);
  }
  return s;
}

// ── BACKGROUND LAYERS ───────────────────────────────────────────
const BGW = 2048;
function buildBackground(th, name) {
  const b = {};
  b.sky = mk(W, H); let g = b.sky.getContext('2d');
  g.fillStyle = lg(g, 0, 0, 0, H, th.sky); g.fillRect(0, 0, W, H);
  if (th.stars) { const r = RNG(99); for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(255,255,255,${.3 + r() * .7})`; const s = r() < .1 ? 2.4 : 1.3; g.fillRect(r() * W, r() * H * .75, s, s); } }
  if (th.orb) { const o = th.orb, x = o.x * W, y = o.y * H;
    g.fillStyle = rg(g, x, y, o.r * 6, [o.glow + '.55)', o.glow + '.18)', o.glow + '0)']); g.fillRect(0, 0, W, H);
    g.fillStyle = rg(g, x, y, o.r, ['#ffffff', o.c, o.c]); ell(g, x, y, o.r, o.r); g.fill(); }
  const ridge = (seed, amp, base, rough) => { const r = RNG(seed), ph = [r() * 6, r() * 6, r() * 6, r() * 6]; return x => { const u = x / BGW * 6.2832; return base - amp * (.5 + .5 * Math.sin(u * 2 + ph[0])) - amp * .5 * Math.abs(Math.sin(u * 5 + ph[1])) - amp * rough * Math.abs(Math.sin(u * 13 + ph[2])) - amp * rough * .5 * Math.sin(u * 29 + ph[3]); }; };
  const layer = (fn, cols, extra) => { const c = mk(BGW, H), g = c.getContext('2d'); g.fillStyle = lg(g, 0, 150, 0, H, cols); g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= BGW; x += 6) g.lineTo(x, fn(x)); g.lineTo(BGW, H); g.fill(); if (extra) extra(g, fn); return c; };
  const hazeCol = th.sky[th.sky.length - 1];
  if (name === 'cave' || name === 'keep') {
    const r = RNG(name === 'cave' ? 5 : 6);
    b.far = mk(BGW, H); g = b.far.getContext('2d');
    for (let i = 0; i < 26; i++) { const x = r() * BGW, w = 60 + r() * 140, top = r() < .5;
      g.fillStyle = alpha(th.mnt[i % 2], .9);
      if (name === 'keep' && i % 3 === 0) { const hh = 260 + r() * 200; g.fillRect(x, H - hh, w * .6, hh); for (let k = 0; k < 4; k++) g.fillRect(x - 6 + k * w * .2, H - hh - 16, w * .12, 18); g.fillStyle = 'rgba(255,140,50,.5)'; for (let k = 0; k < 3; k++) rr(g, x + w * .2, H - hh + 40 + k * 60, 14, 26, 7), g.fill(); }
      else { g.beginPath(); if (top) { g.moveTo(x - w / 2, 0); g.quadraticCurveTo(x, 80 + r() * 320, x + (r() - .5) * 20, 160 + r() * 260); g.quadraticCurveTo(x, 80, x + w / 2, 0); } else { g.moveTo(x - w / 2, H); g.quadraticCurveTo(x, H - 100 - r() * 200, x, H - 200 - r() * 220); g.quadraticCurveTo(x, H - 100, x + w / 2, H); } g.fill(); } }
    b.mid = mk(BGW, H); g = b.mid.getContext('2d');
    for (let i = 0; i < 18; i++) { const x = r() * BGW, w = 90 + r() * 160; g.fillStyle = alpha(th.hills[i % 2], .95);
      g.beginPath(); g.moveTo(x - w / 2, 0); g.quadraticCurveTo(x - w * .1, 120 + r() * 200, x, 220 + r() * 240); g.quadraticCurveTo(x + w * .1, 120, x + w / 2, 0); g.fill();
      g.beginPath(); g.moveTo(x + 200 - w / 2, H); g.quadraticCurveTo(x + 200, H - 160, x + 200, H - 180 - r() * 160); g.quadraticCurveTo(x + 200, H - 160, x + 200 + w / 2, H); g.fill(); }
    if (name === 'keep') { g.fillStyle = lg(g, 0, H - 220, 0, H, ['rgba(255,90,20,0)', 'rgba(255,90,20,.35)']); g.fillRect(0, H - 220, BGW, 220); }
  } else {
    b.far = layer(ridge(11, 210, 470, .16), [th.mnt[0], th.mnt[1]], (g, fn) => {
      if (name === 'snow' || name === 'meadow') { g.globalCompositeOperation = 'source-atop'; g.fillStyle = lg(g, 0, 150, 0, name === 'snow' ? 420 : 330, ['rgba(255,255,255,.95)', 'rgba(255,255,255,.5)', 'rgba(255,255,255,0)']); g.fillRect(0, 0, BGW, 430);
        g.fillStyle = 'rgba(40,60,110,.16)'; for (let x = 0; x < BGW; x += 6) { const y = fn(x), y2 = fn(x + 6); if (y2 > y) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, y2); g.lineTo(x + 6 + (y2 - y) * 6, H); g.lineTo(x, H); g.fill(); } }
        g.globalCompositeOperation = 'source-over'; }
      g.fillStyle = lg(g, 0, 300, 0, H, [alpha(hazeCol, 0), alpha(hazeCol, .75)]); g.fillRect(0, 300, BGW, H - 300);
    });
    b.mid = layer(ridge(23, 130, 560, .08), [th.hills[0], th.hills[1]], (g, fn) => {
      const r = RNG(3);
      for (let x = 0; x < BGW; x += 14 + r() * 26) { const y = fn(x) + 4, s = 10 + r() * 16; g.fillStyle = shade(th.hills[1], -.12 - r() * .15);
        if (th.tree === 'pine') { g.beginPath(); g.moveTo(x - s * .6, y); g.lineTo(x, y - s * 2.4); g.lineTo(x + s * .6, y); g.fill(); }
        else { ell(g, x, y - s * .7, s * .9, s); g.fill(); g.fillRect(x - 1.5, y - s * .3, 3, s * .5); } }
      g.fillStyle = lg(g, 0, 420, 0, H, [alpha(hazeCol, 0), alpha(hazeCol, .35)]); g.fillRect(0, 420, BGW, H - 420);
    });
  }
  return b;
}

function prepareLevelGraphics() {
  const th = level.theme, name = level.themeName;
  TEX = buildTextures(th, name); SPR = buildSprites(th); BG = buildBackground(th, name);
  chunks.clear(); DECOR = [];
  const dark = th.dark > 0;
  for (let c = 1; c < level.cols - 1; c++) for (let r = 2; r < level.rows; r++) {
    if (level.grid[r][c] !== '#') continue;
    const h = hash2(c * 31 + 7, r * 17 + 3);
    if (level.grid[r - 1][c] === ' ' && !coveredBySecret(c, r - 1)) {
      let free = 0; while (free < 7 && r - 1 - free >= 0 && level.grid[r - 1 - free][c] === ' ') free++;
      if (h < .1 && free >= 6) DECOR.push({ img: SPR.trees[(h * 30 | 0) % 3], x: c * T + 24, y: r * T + 6, s: .75 + hash2(c, 5) * .5, glow: th.tree === 'crystal' || th.tree === 'shroom' });
      else if (h < .2 && free >= 2) DECOR.push({ img: SPR.bushes[(h * 20 | 0) % 2], x: c * T + 24, y: r * T + 6, s: .7 + hash2(c, 9) * .5 });
    }
    if (dark && r < level.rows - 1 && level.grid[r + 1][c] === ' ' && h > .82) DECOR.push({ img: SPR.hang[(h * 90 | 0) % 3], x: c * T + 24, y: (r + 1) * T - 2, s: .6 + hash2(c, 3) * .6, top: true });
  }
  WEATHER = []; const n = th.weather === 'snow' ? 150 : th.weather === 'dust' ? 40 : 70, r = RNG(1234);
  for (let i = 0; i < n; i++) WEATHER.push({ x: r() * W, y: r() * H, z: .4 + r() * .9, p: r() * 6.28, s: r() });
  if (!vignette) { vignette = mk(W / 2, H / 2); const g = vignette.getContext('2d'); g.fillStyle = rg(g, W / 4, H / 4, W * .36, ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,10,.5)']); g.fillRect(0, 0, W / 2, H / 2); }
}

// ── DRAW: world ─────────────────────────────────────────────────
function groundCamY() { return clamp(level.G * T - H * .56, 0, Math.min(level.rows * T - H, (level.G + 2.6) * T - H)); }
function drawBackground() {
  const th = level.theme;
  ctx.drawImage(BG.sky, 0, 0);
  const vy = (groundCamY() - camY);
  const wrap = (img, px, py) => { let ox = -((camX * px) % BGW); if (ox > 0) ox -= BGW; const y = Math.round(vy * py); ctx.drawImage(img, Math.round(ox), y); ctx.drawImage(img, Math.round(ox) + BGW, y); };
  if (SPR.clouds.length && th.dark < .5) for (let i = 0; i < 7; i++) {
    const sp = SPR.clouds[i % 4], z = .15 + (i % 3) * .08, x = ((i * 397 - camX * z + frame * (.12 + i * .02)) % (W + 400) + W + 400) % (W + 400) - 300;
    ctx.globalAlpha = th.dark ? .35 : .9; ctx.drawImage(sp, x, 40 + (i * 67) % 190 + vy * .1, 300 * (1 + (i % 3) * .25), 130 * (1 + (i % 3) * .25)); ctx.globalAlpha = 1;
  }
  wrap(BG.far, .12, .08); wrap(BG.mid, .3, .2);
  if (th.orb && th.dark === 0) { // light shafts
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const ox = th.orb.x * W, oy = th.orb.y * H;
    for (let i = 0; i < 4; i++) { const a = .5 + i * .22 + Math.sin(frame * .004 + i) * .04, len = 1100; ctx.fillStyle = lg(ctx, ox, oy, ox - Math.cos(a) * len, oy + Math.sin(a) * len, ['rgba(255,240,200,.09)', 'rgba(255,240,200,0)']);
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox - Math.cos(a - .05) * len, oy + Math.sin(a - .05) * len); ctx.lineTo(ox - Math.cos(a + .05) * len, oy + Math.sin(a + .05) * len); ctx.fill(); }
    ctx.restore();
  }
}
function drawDecor() {
  for (const d of DECOR) {
    const w = d.img.width * d.s, h = d.img.height * d.s;
    if (d.x + w / 2 < camX || d.x - w / 2 > camX + W) continue;
    if (d.top) ctx.drawImage(d.img, d.x - w / 2, d.y, w, h); else ctx.drawImage(d.img, d.x - w / 2, d.y - h, w, h);
  }
}
function drawChunks() {
  const i0 = Math.floor(camX / (CH * T)), i1 = Math.floor((camX + W) / (CH * T));
  for (let i = Math.max(0, i0); i <= i1 && i * CH < level.cols; i++) ctx.drawImage(getChunk(i), i * CH * T, 0);
}
function drawDynamicTiles() {
  const c0 = Math.max(0, Math.floor(camX / T) - 1), c1 = Math.min(level.cols - 1, Math.floor((camX + W) / T) + 1);
  const r0 = Math.max(0, Math.floor(camY / T) - 1), r1 = Math.min(level.rows - 1, Math.floor((camY + H) / T) + 1);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const t = level.grid[r][c]; if (t === ' ' || t === '#') continue;
    const x = c * T; let y = r * T; const b = bumps.get(c + ',' + r); if (b) y -= Math.sin(b / 12 * Math.PI) * 12;
    if (t === '=') ctx.drawImage(TEX.brick, x, y);
    else if (t === '?' || t === 'M') { ctx.drawImage(TEX.q, x, y); const sh = (frame * 2 + c * 30) % 220; if (sh < 48) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(x + sh, y + 2); ctx.lineTo(x + sh + 8, y + 2); ctx.lineTo(x + sh - 4, y + T - 2); ctx.lineTo(x + sh - 12, y + T - 2); ctx.fill(); } }
    else if (t === 'u') ctx.drawImage(TEX.used, x, y);
    else if (t === 'X') { const cr = crumbles.get(c + ',' + r); ctx.drawImage(TEX.crumble, x + (cr ? (Math.random() - .5) * 4 : 0), y + (cr ? cr.t * .15 : 0)); }
    else if (t === 'o' || t === 'w') drawCoin(x + 24, y + 24 + Math.sin(frame * .07 + c) * 2, frame * .09 + c * .6);
  }
}
function drawCoin(x, y, a, s = 1) {
  const w = Math.abs(Math.cos(a)) * 11 * s + 1.5;
  ctx.fillStyle = '#a86a00'; ell(ctx, x, y + 1, w + 1.5, 13 * s); ctx.fill();
  ctx.fillStyle = lg(ctx, x - w, y - 12, x + w, y + 12, ['#fff3a8', '#ffcf2e', '#e09a00']); ell(ctx, x, y, w, 12 * s); ctx.fill();
  if (w > 5) { ctx.fillStyle = 'rgba(255,255,255,.75)'; ell(ctx, x - w * .35, y - 4, w * .22, 5 * s); ctx.fill(); ctx.strokeStyle = 'rgba(160,100,0,.6)'; ctx.lineWidth = 1.5; ell(ctx, x, y, w * .6, 7.5 * s); ctx.stroke(); }
}
function drawLiquids() {
  const th = level.theme, w = th.water;
  const c0 = Math.max(0, Math.floor(camX / T) - 1), c1 = Math.min(level.cols - 1, Math.floor((camX + W) / T) + 1);
  const r0 = Math.max(0, Math.floor(camY / T) - 1), r1 = Math.min(level.rows - 1, Math.floor((camY + H) / T) + 1);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const t = level.grid[r][c], x = c * T, y = r * T;
    if (t === '~' || t === 'w') {
      const surf = !isWater(tileAt(c, r - 1));
      let d = 0; while (d < 5 && isWater(tileAt(c, r - d - 1))) d++;
      ctx.fillStyle = `rgba(${w[0] * (1 - d * .1) | 0},${w[1] * (1 - d * .1) | 0},${w[2] * (1 - d * .06) | 0},${.42 + d * .06})`;
      if (surf) {
        ctx.beginPath(); ctx.moveTo(x, y + T);
        for (let i = 0; i <= T; i += 8) ctx.lineTo(x + i, y + 6 + Math.sin((x + i) * .05 + frame * .06) * 3 + Math.sin((x + i) * .11 - frame * .04) * 1.5);
        ctx.lineTo(x + T, y + T); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i <= T; i += 8) ctx.lineTo(x + i, y + 6 + Math.sin((x + i) * .05 + frame * .06) * 3 + Math.sin((x + i) * .11 - frame * .04) * 1.5);
        ctx.stroke();
      } else ctx.fillRect(x, y, T, T);
      if ((c * 7 + r * 3) % 5 === 0) { ctx.fillStyle = 'rgba(255,255,255,.1)'; ell(ctx, x + 24 + Math.sin(frame * .03 + c) * 10, y + 24, 14, 3); ctx.fill(); }
    } else if (t === 'L') {
      const surf = tileAt(c, r - 1) !== 'L';
      ctx.fillStyle = surf ? lg(ctx, 0, y, 0, y + T, ['#ffe05a', '#ff8a1a', '#d8340a']) : lg(ctx, 0, y, 0, y + T, ['#d8340a', '#a81e06']);
      if (surf) { ctx.beginPath(); ctx.moveTo(x, y + T); for (let i = 0; i <= T; i += 8) ctx.lineTo(x + i, y + 8 + Math.sin((x + i) * .045 + frame * .05) * 4); ctx.lineTo(x + T, y + T); ctx.fill(); }
      else ctx.fillRect(x, y, T, T);
      const bl = (Math.sin(frame * .04 + c * 1.7 + r) + 1) * .5; ctx.fillStyle = `rgba(255,220,90,${.25 + bl * .3})`; ell(ctx, x + 12 + bl * 24, y + 28, 9, 5); ctx.fill();
      if (surf) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = lg(ctx, 0, y - 90, 0, y + 10, ['rgba(255,90,10,0)', 'rgba(255,110,20,.28)']); ctx.fillRect(x, y - 90, T, 100); ctx.restore();
        if (Math.random() < .012) part('spark', x + Math.random() * T, y + 8, { vx: (Math.random() - .5) * 1.5, vy: -2 - Math.random() * 3, g: .05, life: 50, color: '#ffb040', size: 3 }); }
    }
  }
}
function drawSecretCovers() {
  for (const s of level.secrets) {
    if (!s.cover) continue;
    s.a += ((s.found ? 0 : 1) - s.a) * .08;
    if (s.a < .02) continue;
    if (!s.cv) { s.cv = mk((s.c1 - s.c0 + 1) * T, (s.r1 - s.r0 + 1) * T); const g = s.cv.getContext('2d'); for (let r = s.r0; r <= s.r1; r++) for (let c = s.c0; c <= s.c1; c++) { const ch = tileAt(c, r); if (ch === '#') continue; const f = s.found; s.found = false; drawSoilCell(g, (c - s.c0) * T, (r - s.r0) * T, c, r); s.found = f; } }
    ctx.globalAlpha = s.a; ctx.drawImage(s.cv, s.c0 * T, s.r0 * T); ctx.globalAlpha = 1;
  }
}

// ── DRAW: objects ───────────────────────────────────────────────
function glow(x, y, r, col, a = .5) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rg(ctx, x, y, r, [col + a + ')', col + '0)']); ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore(); }
function shadowAt(x, y, w) { ctx.fillStyle = 'rgba(0,0,0,.22)'; ell(ctx, x, y, w, w * .28); ctx.fill(); }

function drawObjects() {
  const vis = o => o.x + (o.w || 60) > camX - 80 && o.x < camX + W + 80;
  for (const t of level.torches) { if (!vis(t)) continue; const f = Math.sin(frame * .4 + t.x) * 2;
    ctx.fillStyle = '#3a2a22'; ctx.fillRect(t.x - 3, t.y, 6, 22); ctx.fillStyle = '#6a5a52'; ctx.fillRect(t.x - 7, t.y - 2, 14, 5);
    ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.moveTo(t.x - 7, t.y - 2); ctx.quadraticCurveTo(t.x - 9, t.y - 14, t.x + f * .6, t.y - 26 - f); ctx.quadraticCurveTo(t.x + 9, t.y - 14, t.x + 7, t.y - 2); ctx.fill();
    ctx.fillStyle = '#ffe07a'; ctx.beginPath(); ctx.moveTo(t.x - 4, t.y - 2); ctx.quadraticCurveTo(t.x - 4, t.y - 10, t.x + f * .3, t.y - 16); ctx.quadraticCurveTo(t.x + 4, t.y - 10, t.x + 4, t.y - 2); ctx.fill();
    glow(t.x, t.y - 10, 70, 'rgba(255,150,50,', .35); }
  for (const g of level.goals) if (vis(g)) drawPortal(g);
  for (const cp of level.checkpoints) { if (!vis(cp)) continue; const x = cp.x + 24, b = cp.y, wv = Math.sin(frame * .15) * 4;
    ctx.fillStyle = '#7a8090'; ctx.fillRect(x - 12, b - 8, 24, 8); ctx.fillStyle = lg(ctx, x - 3, 0, x + 3, 0, ['#f4f4fa', '#9aa0b0']); ctx.fillRect(x - 3, b - 96, 6, 90);
    ctx.fillStyle = '#ffd23f'; ell(ctx, x, b - 98, 6, 6); ctx.fill();
    ctx.fillStyle = cp.taken ? lg(ctx, x, 0, x + 50, 0, ['#5ff0df', '#2ab3a6']) : lg(ctx, x, 0, x + 50, 0, ['#b8bcc8', '#7a8090']);
    ctx.beginPath(); ctx.moveTo(x + 3, b - 92); ctx.quadraticCurveTo(x + 26, b - 98 + (cp.taken ? wv : 0), x + 50, b - 80 + (cp.taken ? wv : 6)); ctx.quadraticCurveTo(x + 26, b - 70 + (cp.taken ? wv : 0), x + 3, b - 62); ctx.fill();
    if (cp.taken) glow(x + 20, b - 78, 50, 'rgba(95,240,223,', .3); }
  for (const s of level.signs) { if (!vis(s)) continue; const x = s.x + 24, b = s.y + s.h;
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(x - 3, b - 30, 6, 30);
    ctx.fillStyle = lg(ctx, 0, b - 54, 0, b - 22, ['#d9a866', '#a8763a']); rr(ctx, x - 22, b - 54, 44, 30, 5); ctx.fill(); ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#5a3a1e'; ctx.font = '800 20px Rubik, Arial'; ctx.textAlign = 'center'; ctx.fillText('!', x, b - 32 + Math.sin(frame * .1) * 1.5); }
  for (const d of level.doors) { if (!vis(d)) continue; const x = d.x, y = d.y;
    ctx.fillStyle = '#2a1a10'; rr(ctx, x - 6, y - 6, d.w + 12, d.h + 6, 22); ctx.fill();
    ctx.fillStyle = lg(ctx, x, 0, x + d.w, 0, ['#8a5a30', '#b47a44', '#7a4a26']); rr(ctx, x, y, d.w, d.h, 18); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 14, y + 6, 2, d.h - 6); ctx.fillRect(x + 28, y + 6, 2, d.h - 6);
    ctx.fillStyle = '#3a3a44'; ctx.fillRect(x, y + 22, d.w, 5); ctx.fillRect(x, y + 58, d.w, 5);
    ctx.fillStyle = '#ffd23f'; ell(ctx, x + d.w - 9, y + 44, 3.5, 3.5); ctx.fill();
    if (d.locked) { ctx.fillStyle = '#ffd23f'; rr(ctx, x + 13, y + 34, 18, 16, 3); ctx.fill(); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 22, y + 34, 6, Math.PI, 0); ctx.stroke(); ctx.fillStyle = '#5a3a00'; ell(ctx, x + 22, y + 41, 2.4, 2.4); ctx.fill(); }
    else if (rectHit(player, d)) { ctx.fillStyle = '#fff'; ctx.font = '800 22px Rubik, Arial'; ctx.textAlign = 'center'; ctx.fillText('▲', x + d.w / 2, y - 14 + Math.sin(frame * .15) * 3); } }
  for (const ch of level.chests) { if (!vis(ch)) continue; const x = ch.x + 4, y = ch.y + 4, w = 40, h = 32;
    if (!ch.open) glow(x + 20, y + 10, 40, 'rgba(255,210,63,', .2 + Math.sin(frame * .08) * .08);
    ctx.fillStyle = lg(ctx, 0, y + 12, 0, y + h, ['#a8683a', '#6e3e1c']); rr(ctx, x, y + 12, w, h - 12, 3); ctx.fill();
    ctx.save(); ctx.translate(x, y + 13); if (ch.open) ctx.rotate(-.9);
    ctx.fillStyle = lg(ctx, 0, -14, 0, 0, ['#c98448', '#8a4f26']); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0, -15, 20, -15); ctx.quadraticCurveTo(w, -15, w, 0); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, -3, w, 4); ctx.restore();
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 4, y + 12, 4, h - 12); ctx.fillRect(x + w - 8, y + 12, 4, h - 12); rr(ctx, x + 16, y + 14, 8, 10, 2); ctx.fill();
    if (ch.open) { ctx.fillStyle = '#ffe98a'; ell(ctx, x + 20, y + 12, 15, 4); ctx.fill(); } }
  for (const s of level.springs) { if (!vis(s)) continue; const k = s.t / 14, top = s.y + 4 - k * 10, x = s.x;
    ctx.fillStyle = '#4a4e5c'; rr(ctx, x + 2, s.y + s.h - 6, s.w - 4, 6, 2); ctx.fill();
    ctx.strokeStyle = '#c9cfdc'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i <= 6; i++) ctx.lineTo(x + 10 + (i % 2) * (s.w - 20), s.y + s.h - 6 - i * (s.y + s.h - 6 - top - 6) / 6); ctx.stroke();
    if (level.themeName === 'garden') { ctx.fillStyle = lg(ctx, 0, top - 12, 0, top + 8, ['#ff8ad8', '#b03aa8']); ctx.beginPath(); ctx.moveTo(x - 4, top + 8); ctx.quadraticCurveTo(x - 4, top - 14, x + s.w / 2, top - 14); ctx.quadraticCurveTo(x + s.w + 4, top - 14, x + s.w + 4, top + 8); ctx.fill(); ctx.fillStyle = '#fff'; ell(ctx, x + 12, top - 3, 4, 3); ctx.fill(); ell(ctx, x + 30, top - 6, 5, 3.5); ctx.fill(); }
    else { ctx.fillStyle = lg(ctx, 0, top, 0, top + 9, ['#ff7a6a', '#c8281e']); rr(ctx, x, top, s.w, 9, 4); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x + 5, top + 1.5, s.w - 10, 2); } }
  for (const s of level.saws) { if (s.x < camX - 60 || s.x > camX + W + 60) continue;
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(s.ox, s.oy); if (s.axis === 'x') ctx.lineTo(s.ox + s.range, s.oy); else ctx.lineTo(s.ox, s.oy - s.range); ctx.stroke();
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(frame * .3);
    ctx.fillStyle = '#c9cfdc'; ctx.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * 6.2832, rad = i % 2 ? s.r + 4 : s.r - 5; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } ctx.fill();
    ctx.fillStyle = rg(ctx, -6, -6, s.r, ['#f4f7fb', '#9aa3b2', '#5a6272']); ell(ctx, 0, 0, s.r - 6, s.r - 6); ctx.fill();
    ctx.fillStyle = '#3a4050'; ell(ctx, 0, 0, 6, 6); ctx.fill(); ctx.fillRect(-2, -s.r + 10, 4, 8); ctx.restore(); }
  for (const g of level.gems) { if (g.got || !vis(g)) continue; const x = g.x + 16, y = g.y + 18 + Math.sin(frame * .06 + g.idx) * 4;
    glow(x, y, 46, 'rgba(120,220,255,', .45);
    ctx.fillStyle = lg(ctx, x - 14, y - 16, x + 14, y + 16, ['#e8fbff', '#5fd0ff', '#2a7ae0']); ctx.beginPath(); ctx.moveTo(x, y - 17); ctx.lineTo(x + 14, y - 5); ctx.lineTo(x, y + 18); ctx.lineTo(x - 14, y - 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.beginPath(); ctx.moveTo(x, y - 17); ctx.lineTo(x - 14, y - 5); ctx.lineTo(x - 4, y - 5); ctx.fill();
    ctx.fillStyle = 'rgba(20,60,160,.35)'; ctx.beginPath(); ctx.moveTo(x + 14, y - 5); ctx.lineTo(x, y + 18); ctx.lineTo(x + 4, y - 5); ctx.fill();
    if (frame % 30 < 6) { ctx.fillStyle = '#fff'; ell(ctx, x + 8, y - 12, 2.5, 2.5); ctx.fill(); } }
  for (const k of level.keys) { if (k.got || !vis(k)) continue; const x = k.x + 14, y = k.y + 16 + Math.sin(frame * .08) * 4;
    glow(x, y, 36, 'rgba(255,210,63,', .4); drawKey(x, y, 1); }
}
function drawKey(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -8, 6, 0, 6.29); ctx.stroke();
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(-2, -2, 4, 17); ctx.fillRect(2, 8, 6, 3); ctx.fillRect(2, 13, 4, 3); ctx.restore();
}
function drawPortal(g) {
  const x = g.x + g.w / 2, b = g.y + g.h, col = g.secret ? ['rgba(200,120,255,', '#b06aff', '#5a2aa8'] : ['rgba(110,240,225,', '#5ff0df', '#1a7a9a'];
  glow(x, b - 60, 130, col[0], .35 + Math.sin(frame * .05) * .1);
  ctx.save(); ctx.beginPath(); ctx.moveTo(x - 30, b); ctx.lineTo(x - 30, b - 62); ctx.arc(x, b - 62, 30, Math.PI, 0); ctx.lineTo(x + 30, b); ctx.clip();
  ctx.fillStyle = rg(ctx, x, b - 55, 80, ['#ffffff', col[1], col[2]]); ctx.fillRect(x - 32, b - 96, 64, 96);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x, b - 52, 8 + i * 9, frame * .06 + i * 1.3, frame * .06 + i * 1.3 + 2.2); ctx.stroke(); }
  ctx.restore();
  const st = level.theme.stone;
  ctx.fillStyle = lg(ctx, x - 46, 0, x + 46, 0, [shade(st, .25), st, shade(st, -.35)]);
  ctx.beginPath(); ctx.moveTo(x - 46, b); ctx.lineTo(x - 46, b - 62); ctx.arc(x, b - 62, 46, Math.PI, 0); ctx.lineTo(x + 46, b); ctx.lineTo(x + 30, b); ctx.lineTo(x + 30, b - 62); ctx.arc(x, b - 62, 30, 0, Math.PI, true); ctx.lineTo(x - 30, b); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2; for (let i = 0; i < 7; i++) { const a = Math.PI + i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 30, b - 62 + Math.sin(a) * 30); ctx.lineTo(x + Math.cos(a) * 46, b - 62 + Math.sin(a) * 46); ctx.stroke(); }
  ctx.fillStyle = col[1]; ctx.beginPath(); ctx.moveTo(x, b - 122); ctx.lineTo(x + 9, b - 108); ctx.lineTo(x, b - 96); ctx.lineTo(x - 9, b - 108); ctx.fill();
  ctx.fillStyle = shade(st, -.3); ctx.fillRect(x - 52, b - 8, 28, 8); ctx.fillRect(x + 24, b - 8, 28, 8);
  if (frame % 5 === 0) part('spark', x + (Math.random() - .5) * 50, b - Math.random() * 90, { vy: -1, life: 30, color: col[1], size: 3 });
}

function drawItems() {
  for (const it of items) {
    const x = it.x + 15, y = it.y + 15;
    ctx.save();
    if (it.rise > 0) { ctx.beginPath(); ctx.rect(it.x - 20, it.baseY - 300, 70, 300); ctx.clip(); }
    if (it.kind === 'heart') { glow(x, y, 34, 'rgba(255,90,120,', .4); drawHeart(x, y - 2, 13, true); }
    else if (it.kind === 'ember') { const f = Math.sin(frame * .3) * 2; glow(x, y, 40, 'rgba(255,140,40,', .5);
      ctx.fillStyle = '#ff5a1f'; ctx.beginPath(); ctx.moveTo(x, y - 16 - f); ctx.quadraticCurveTo(x + 15, y, x, y + 15); ctx.quadraticCurveTo(x - 15, y, x, y - 16 - f); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(x, y - 6 - f); ctx.quadraticCurveTo(x + 8, y + 4, x, y + 13); ctx.quadraticCurveTo(x - 8, y + 4, x, y - 6 - f); ctx.fill(); }
    else if (it.kind === 'star') { glow(x, y, 44, 'rgba(255,240,120,', .5); ctx.fillStyle = lg(ctx, 0, y - 16, 0, y + 16, ['#fffbd0', '#ffcf2e']); ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5 + Math.sin(frame * .1) * .2, rad = i % 2 ? 7 : 16; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } ctx.fill(); ctx.fillStyle = '#3a2a00'; ell(ctx, x - 3, y - 1, 1.5, 3); ctx.fill(); ell(ctx, x + 3, y - 1, 1.5, 3); ctx.fill(); }
    else if (it.kind === 'shield') { glow(x, y, 38, 'rgba(120,200,255,', .45); ctx.fillStyle = rg(ctx, x - 4, y - 5, 16, ['rgba(255,255,255,.9)', 'rgba(120,200,255,.6)', 'rgba(60,120,220,.5)']); ell(ctx, x, y, 14, 14); ctx.fill(); ctx.strokeStyle = '#dff'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore();
  }
  for (const f of flyCoins) drawCoin(f.x, f.y, frame * .3, .8);
}
function drawHeart(x, y, s, full) {
  ctx.beginPath(); ctx.moveTo(x, y + s * .9); ctx.bezierCurveTo(x - s * 1.5, y - s * .1, x - s * .8, y - s * 1.1, x, y - s * .35); ctx.bezierCurveTo(x + s * .8, y - s * 1.1, x + s * 1.5, y - s * .1, x, y + s * .9);
  if (full) { ctx.fillStyle = lg(ctx, 0, y - s, 0, y + s, ['#ff8aa0', '#f0304e', '#b0142e']); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ell(ctx, x - s * .45, y - s * .35, s * .22, s * .16); ctx.fill(); }
  else { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke(); }
}

function drawEnemy(e) {
  if (e.x > camX + W + 60 || e.x + e.w < camX - 60) return;
  const x = Math.round(e.x + e.w / 2), b = Math.round(e.y + e.h);
  if (!e.dead && e.type !== 'bat' && e.type !== 'wisp' && e.type !== 'fish' && e.type !== 'icicle' && e.onGround !== false) shadowAt(x, b, e.w * .5);
  ctx.save(); ctx.translate(x, b);
  if (e.dead) { ctx.translate(0, -e.h / 2); ctx.rotate(e.dead * .2); ctx.translate(0, e.h / 2); ctx.globalAlpha = Math.max(0, 1 - e.dead / 80); }
  const d = e.dir || -1;
  switch (e.type) {
    case 'blob': {
      const sq = e.flat > 0 ? .3 : 1 + Math.sin(e.t * 2.2) * .07; ctx.scale(1 / Math.sqrt(sq), sq);
      const snow = level.themeName === 'snow', keep = level.themeName === 'keep';
      const col = snow ? ['#eaf8ff', '#8fd0f2', '#4a8ac0'] : keep ? ['#ffb070', '#e2501e', '#8a200a'] : ['#c8a0ff', '#8e5bd8', '#54309a'];
      ctx.fillStyle = rg(ctx, -5, -22, 30, col); ctx.beginPath(); ctx.moveTo(-17, 0); ctx.bezierCurveTo(-20, -34, 20, -34, 17, 0); ctx.quadraticCurveTo(8, 3, 0, 0); ctx.quadraticCurveTo(-8, 3, -17, 0); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ell(ctx, -7, -23, 4, 3); ctx.fill();
      ctx.fillStyle = '#fff'; ell(ctx, -5 + d * 2, -15, 4.2, 5.2); ctx.fill(); ell(ctx, 6 + d * 2, -15, 4.2, 5.2); ctx.fill();
      ctx.fillStyle = '#1a1a2a'; ell(ctx, -5 + d * 3.5, -14, 2, 2.8); ctx.fill(); ell(ctx, 6 + d * 3.5, -14, 2, 2.8); ctx.fill();
      ctx.strokeStyle = '#3a2060'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(d * 2, -7, 3.5, .2, 2.9); ctx.stroke(); break;
    }
    case 'beetle': {
      const lg_ = Math.sin(e.t * 3) * 2.5; ctx.scale(d, 1);
      ctx.strokeStyle = '#2a120a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 10, -6); ctx.lineTo(i * 12 + (i % 2 ? lg_ : -lg_), 0); ctx.stroke(); }
      ctx.fillStyle = rg(ctx, -4, -18, 26, ['#ff8a70', '#d2382a', '#7a140e']); ctx.beginPath(); ctx.ellipse(0, -8, 19, 15, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-19, -9, 38, 4);
      ctx.fillStyle = '#f4f4f4'; for (let i = -2; i <= 2; i++) { const sx = i * 7, sy = -21 + Math.abs(i) * 3; ctx.beginPath(); ctx.moveTo(sx - 4, sy + 3); ctx.lineTo(sx, sy - 10); ctx.lineTo(sx + 4, sy + 3); ctx.fill(); }
      ctx.fillStyle = '#3a1a10'; ell(ctx, 17, -8, 6, 6); ctx.fill(); ctx.fillStyle = '#ffd23f'; ell(ctx, 19, -9, 2, 2); ctx.fill(); break;
    }
    case 'charger': {
      ctx.scale(d, 1); const run = e.st === 2, shk = e.st === 1 ? (Math.random() - .5) * 3 : 0, lgs = run ? Math.sin(e.t * 9) * 5 : Math.sin(e.t * 3) * 2;
      const snow = level.themeName === 'snow', col = snow ? ['#f4f9ff', '#b9cde6', '#7a93b6'] : ['#a87a58', '#6e4a30', '#3a2414'];
      ctx.translate(shk, 0);
      ctx.fillStyle = col[2]; ctx.fillRect(-16 + lgs, -9, 6, 9); ctx.fillRect(-4 - lgs, -9, 6, 9); ctx.fillRect(8 + lgs, -9, 6, 9);
      ctx.fillStyle = rg(ctx, -6, -28, 34, col); rr(ctx, -22, -34, 42, 28, 12); ctx.fill();
      ctx.fillStyle = col[1]; ell(ctx, 18, -20, 11, 11); ctx.fill();
      ctx.fillStyle = '#f4ead0'; ctx.beginPath(); ctx.moveTo(20, -28); ctx.quadraticCurveTo(34, -34, 30, -18); ctx.quadraticCurveTo(28, -26, 20, -24); ctx.fill();
      ctx.fillStyle = e.st ? '#ff3a2a' : '#1a1a2a'; ell(ctx, 21, -21, 2.4, 2.4); ctx.fill(); ctx.fillStyle = '#2a1a10'; ell(ctx, 27, -15, 2, 1.5); ctx.fill();
      if (e.st === 1) { ctx.fillStyle = '#ff3a2a'; ctx.font = '800 18px Rubik, Arial'; ctx.textAlign = 'center'; ctx.save(); ctx.scale(d, 1); ctx.fillText('!', 0, -44); ctx.restore(); }
      break;
    }
    case 'bat': {
      const fl = Math.sin(e.t * 5); ctx.translate(0, -12);
      ctx.fillStyle = '#2e2a44'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 5, -2); ctx.quadraticCurveTo(s * 16, -14 - fl * 12, s * 28, -6 - fl * 14); ctx.quadraticCurveTo(s * 22, -2 - fl * 5, s * 20, 4 - fl * 4); ctx.quadraticCurveTo(s * 14, -2, s * 11, 6); ctx.quadraticCurveTo(s * 8, 0, s * 5, 4); ctx.fill(); }
      ctx.fillStyle = rg(ctx, -3, -4, 14, ['#6e6890', '#3e3860']); ell(ctx, 0, 0, 10, 10); ctx.fill();
      ctx.fillStyle = '#3e3860'; ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-6, -16); ctx.lineTo(-2, -8); ctx.moveTo(8, -6); ctx.lineTo(6, -16); ctx.lineTo(2, -8); ctx.fill();
      ctx.fillStyle = '#ff5a5a'; ell(ctx, -4, -2, 2.2, 2.6); ctx.fill(); ell(ctx, 4, -2, 2.2, 2.6); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-3, 4, 2, 3); ctx.fillRect(1, 4, 2, 3); break;
    }
    case 'frog': {
      ctx.scale(d, 1); const air = !e.onGround, cr = air ? 0 : Math.min(1, Math.max(0, (e.st - 55) / 20)) * 4;
      ctx.fillStyle = '#2a7a3a'; if (air) { ctx.fillRect(-18, -8, 14, 5); ctx.fillRect(-20, -4, 6, 10); } else { ell(ctx, -10, -5, 9, 6); ctx.fill(); }
      ctx.fillStyle = rg(ctx, -2, -20 + cr, 24, ['#b0f07a', '#4fb84a', '#1f6a2e']); ell(ctx, 0, -13 + cr, 16, 13 - cr * .5); ctx.fill();
      ctx.fillStyle = '#eaffd0'; ell(ctx, 4, -8 + cr, 9, 6); ctx.fill();
      ctx.fillStyle = '#4fb84a'; ell(ctx, 3, -25 + cr, 5, 5); ctx.fill(); ell(ctx, 12, -24 + cr, 5, 5); ctx.fill();
      ctx.fillStyle = '#fff'; ell(ctx, 4, -25 + cr, 3.4, 3.4); ctx.fill(); ell(ctx, 13, -24 + cr, 3.4, 3.4); ctx.fill(); ctx.fillStyle = '#111'; ell(ctx, 5, -25 + cr, 1.6, 1.8); ctx.fill(); ell(ctx, 14, -24 + cr, 1.6, 1.8); ctx.fill();
      ctx.strokeStyle = '#1f5a2a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(4, -12 + cr); ctx.quadraticCurveTo(11, -9 + cr, 16, -13 + cr); ctx.stroke(); break;
    }
    case 'plant': {
      const sw = Math.sin(e.t * 1.2) * 3, open = e.st2 > 0 ? 9 : 3 + Math.max(0, (e.st - 100) / 30) * 5; ctx.scale(d, 1);
      ctx.strokeStyle = '#2c7a2a'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-8, -16, sw, -28); ctx.stroke();
      ctx.fillStyle = '#3fa03a'; ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(-18, -12, -22, -2); ctx.quadraticCurveTo(-10, 2, 0, -2); ctx.moveTo(0, -2); ctx.quadraticCurveTo(16, -10, 20, -1); ctx.quadraticCurveTo(10, 2, 0, -2); ctx.fill();
      ctx.translate(sw, -32);
      ctx.fillStyle = rg(ctx, -4, -6, 20, ['#ff9ab0', '#d83a6a', '#8a1a40']); ctx.beginPath(); ctx.arc(0, 0, 15, .1 + open * .06, Math.PI * 2 - .1 - open * .06); ctx.lineTo(2, 0); ctx.fill();
      ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(6 + i * 3, -4 - open * .5 + i); ctx.lineTo(8 + i * 3, 0 - open * .3); ctx.lineTo(10 + i * 3, -3 - open * .5 + i); ctx.fill(); }
      ctx.fillStyle = '#fff'; ell(ctx, -3, -8, 3.2, 3.2); ctx.fill(); ctx.fillStyle = '#111'; ell(ctx, -2, -8, 1.6, 1.6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ell(ctx, -9, 2, 2, 2); ctx.fill(); ell(ctx, -4, 9, 2, 2); ctx.fill(); break;
    }
    case 'fish': {
      ctx.translate(0, -11); ctx.scale(d, 1); const tl = Math.sin(e.t * 6) * 5;
      ctx.fillStyle = '#e2622a'; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-24, -9 + tl); ctx.lineTo(-24, 9 + tl); ctx.fill();
      ctx.fillStyle = rg(ctx, 0, -5, 20, ['#ffd08a', '#ff8a3d', '#c8481a']); ell(ctx, 0, 0, 17, 10); ctx.fill();
      ctx.fillStyle = '#fff'; ell(ctx, 9, -3, 3.5, 3.5); ctx.fill(); ctx.fillStyle = '#111'; ell(ctx, 10, -3, 1.8, 1.8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(10, 3); ctx.lineTo(13, 7); ctx.lineTo(15, 3); ctx.lineTo(17, 6); ctx.lineTo(17, 2); ctx.fill(); break;
    }
    case 'wisp': {
      ctx.translate(0, -17); glow(0, 0, 60, 'rgba(110,240,255,', .45);
      const f = Math.sin(e.t * 3) * 3;
      ctx.fillStyle = rg(ctx, 0, 2, 20, ['#ffffff', '#9ff', 'rgba(60,180,255,.25)']); ctx.beginPath(); ctx.moveTo(0, -20 - f); ctx.bezierCurveTo(18, -6, 16, 16, 0, 16); ctx.bezierCurveTo(-16, 16, -18, -6, 0, -20 - f); ctx.fill();
      ctx.fillStyle = '#143a5a'; ell(ctx, -5 + d * 2, 0, 2.5, 4); ctx.fill(); ell(ctx, 5 + d * 2, 0, 2.5, 4); ctx.fill(); ell(ctx, d * 2, 8, 3, 2); ctx.fill(); break;
    }
    case 'icicle': {
      ctx.translate(e.st === 1 ? (Math.random() - .5) * 4 : 0, -e.h);
      ctx.fillStyle = lg(ctx, -11, 0, 11, 0, ['#ffffff', '#b8e4fa', '#6fb4e6']); ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.lineTo(0, e.h); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-3, 0); ctx.lineTo(-1, e.h * .7); ctx.fill(); break;
    }
  }
  ctx.restore();
}

function drawBoss() {
  const b = boss; if (!b) return;
  if (!b.alive && b.dieT <= 0) return;
  const x = b.x + b.w / 2, y = b.y + b.h, stun = b.state === 'stun', cr = b.state === 'crouch' ? Math.min(1, b.t / 20) * 14 : 0;
  shadowAt(x, level.G * T, 60);
  ctx.save(); ctx.translate(x + (b.inv > 0 || !b.alive ? (Math.random() - .5) * 6 : 0), y); ctx.scale(b.dir, 1);
  if (!b.alive) ctx.globalAlpha = b.dieT / 110;
  const pulse = (Math.sin(frame * .12) + 1) * .5, hot = `rgba(255,${120 + pulse * 80 | 0},30,`;
  glow(0, -50, 130, 'rgba(255,100,20,', .25);
  // legs
  ctx.fillStyle = '#3a2e34'; rr(ctx, -40, -30 + cr * .5, 30, 30 - cr * .5, 8); ctx.fill(); rr(ctx, 10, -30 + cr * .5, 30, 30 - cr * .5, 8); ctx.fill();
  // body
  ctx.fillStyle = rg(ctx, -14, -80 + cr, 80, ['#8a7a80', '#5a4c52', '#2c2428']); ctx.beginPath();
  ctx.moveTo(-46, -24 + cr * .5); ctx.lineTo(-52, -70 + cr); ctx.lineTo(-30, -98 + cr); ctx.lineTo(28, -100 + cr); ctx.lineTo(52, -72 + cr); ctx.lineTo(46, -24 + cr * .5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hot + '.95)'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.shadowColor = '#ff7a1a'; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.moveTo(-34, -40 + cr); ctx.lineTo(-18, -56 + cr); ctx.lineTo(-24, -74 + cr); ctx.moveTo(-18, -56 + cr); ctx.lineTo(6, -48 + cr); ctx.lineTo(20, -62 + cr); ctx.lineTo(36, -52 + cr); ctx.moveTo(6, -48 + cr); ctx.lineTo(2, -30 + cr); ctx.stroke();
  ctx.shadowBlur = 0;
  // arms
  const sw = b.state === 'walk' ? Math.sin(b.t * .15) * 8 : b.state === 'throw' ? -20 : 0;
  ctx.fillStyle = '#4a3e44'; rr(ctx, -66, -78 + cr + sw, 22, 46, 10); ctx.fill(); rr(ctx, 44, -78 + cr - sw, 22, 46, 10); ctx.fill();
  ctx.fillStyle = '#6a5c62'; ell(ctx, -55, -30 + cr + sw, 13, 12); ctx.fill(); ell(ctx, 55, -30 + cr - sw, 13, 12); ctx.fill();
  // face
  ctx.fillStyle = '#1a1214'; rr(ctx, -4, -86 + cr, 44, 22, 6); ctx.fill();
  if (stun) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; for (const ex of [8, 28]) { ctx.beginPath(); ctx.moveTo(ex - 5, -80 + cr); ctx.lineTo(ex + 5, -70 + cr); ctx.moveTo(ex + 5, -80 + cr); ctx.lineTo(ex - 5, -70 + cr); ctx.stroke(); } }
  else { ctx.fillStyle = hot + '1)'; ctx.shadowColor = '#ff7a1a'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.moveTo(2, -80 + cr); ctx.lineTo(14, -76 + cr); ctx.lineTo(2, -70 + cr); ctx.moveTo(34, -80 + cr); ctx.lineTo(22, -76 + cr); ctx.lineTo(34, -70 + cr); ctx.fill(); ctx.shadowBlur = 0; }
  // crown crystal = weak point
  ctx.fillStyle = stun ? lg(ctx, 0, -130 + cr, 0, -96 + cr, ['#ffffff', '#ffe05a', '#ff8a1a']) : lg(ctx, 0, -130 + cr, 0, -96 + cr, ['#a04a2a', '#5a2414']);
  ctx.beginPath(); ctx.moveTo(-14, -98 + cr); ctx.lineTo(-8, -120 + cr); ctx.lineTo(0, -106 + cr); ctx.lineTo(6, -130 + cr); ctx.lineTo(12, -106 + cr); ctx.lineTo(20, -118 + cr); ctx.lineTo(24, -98 + cr); ctx.fill();
  ctx.restore();
  if (stun && b.alive) { glow(x, b.y - 10, 60, 'rgba(255,230,90,', .5 + pulse * .3);
    for (let i = 0; i < 3; i++) { const a = frame * .12 + i * 2.09; ctx.fillStyle = '#ffd23f'; ctx.font = '800 20px Rubik, Arial'; ctx.textAlign = 'center'; ctx.fillText('★', x + Math.cos(a) * 44, b.y - 24 + Math.sin(a) * 10); }
    ctx.fillStyle = '#fff'; ctx.font = '800 26px Rubik, Arial'; ctx.fillText('▼', x, b.y - 46 + Math.sin(frame * .2) * 5); }
}

// ── Pip: fox-eared explorer ─────────────────────────────────────
function drawPip(p, ghost) {
  if (!ghost && p.inv > 0 && Math.floor(p.inv / 4) % 2 === 1 && !p.dead) return;
  const col = skinColors(), c0 = col[0], c1 = col[1], c2 = p.ember ? '#ff5a1f' : col[2];
  const run = p.onGround && Math.abs(p.vx) > .6, air = !p.onGround && !p.climb, cyc = p.anim * 2.4;
  let sx = 1 + p.squash * .5, sy = 1 - p.squash, rot = 0;
  if (air && p.pound === 0) { const st = clamp(Math.abs(p.vy) * .012, 0, .16); sy += st; sx -= st * .6; }
  if (p.dashT > 0) { sx = 1.3; sy = .78; }
  if (p.dead) rot = (85 - dyingT) * .22;
  else if (p.pound === 1) rot = (8 - p.poundT) * .78;
  else if (p.inWater) rot = clamp(p.vx * .1, -.6, .6) + .15;
  else if (run) rot = .08;
  ctx.save(); ctx.translate(Math.round(p.x + p.w / 2), Math.round(p.y + p.h));
  ctx.scale((p.sliding ? -p.dir : p.dir) * sx, sy);
  if (rot) { ctx.translate(0, -24); ctx.rotate(rot); ctx.translate(0, 24); }
  if (ghost) ctx.globalAlpha = ghost;
  const bob = run ? -Math.abs(Math.sin(cyc)) * 2.5 : air ? 0 : Math.sin(frame * .06) * .8;
  const sw = run ? Math.sin(cyc) : p.climb ? Math.sin(p.anim * 3) : 0;
  // tail
  const wag = Math.sin(frame * .1) * 3 + (air ? -p.vy * .6 : 0);
  ctx.strokeStyle = '#e8792a'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-7, -15 + bob); ctx.quadraticCurveTo(-20, -14 + bob, -23, -26 + bob + wag); ctx.stroke();
  ctx.strokeStyle = '#fff4e0'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-22.5, -24 + bob + wag); ctx.lineTo(-23, -27 + bob + wag); ctx.stroke();
  // cape (glide upgrade)
  if (save.up.glide) { const sp = p.gliding ? 1 : 0, fl = Math.sin(frame * .25) * 3; ctx.fillStyle = alpha(c2, .92); ctx.beginPath(); ctx.moveTo(-8, -31 + bob); ctx.lineTo(2, -31 + bob);
    if (sp) { ctx.quadraticCurveTo(-6, -50 + fl, -34, -46 + fl); ctx.quadraticCurveTo(-24, -30, -30, -18 + fl); } else { ctx.quadraticCurveTo(-10 - Math.abs(p.vx) * 2, -18 + fl * .5, -16 - Math.abs(p.vx) * 3, -8 + fl); ctx.quadraticCurveTo(-12, -14, -9, -12); }
    ctx.closePath(); ctx.fill(); }
  // legs
  const leg = (x, a) => { ctx.save(); ctx.translate(x, -13 + bob); ctx.rotate(a); ctx.fillStyle = c1; rr(ctx, -4, 0, 8, 11, 3); ctx.fill(); ctx.fillStyle = '#3a2414'; rr(ctx, -5, 8, 12, 6, 3); ctx.fill(); ctx.restore(); };
  let la = sw * .9, lb = -sw * .9;
  if (air) { if (p.pound) { la = .3; lb = -.3; } else if (p.vy < 0) { la = -.7; lb = .5; } else { la = .5; lb = -.6; } }
  leg(-5, la); leg(5, lb);
  // back arm
  const arm = (x, a, front) => { ctx.save(); ctx.translate(x, -28 + bob); ctx.rotate(a); ctx.fillStyle = front ? c0 : c1; rr(ctx, -3.5, 0, 7, 12, 3.5); ctx.fill(); ctx.fillStyle = '#ffd9b0'; ell(ctx, 0, 12, 3.8, 3.8); ctx.fill(); ctx.restore(); };
  let aa = -sw * 1.0, ab = sw * 1.0;
  if (p.gliding) { aa = -2.6; ab = -2.9; } else if (p.sliding) { aa = -2.2; ab = -1.8; } else if (p.climb) { aa = -2.6 + sw * .5; ab = -2.6 - sw * .5; }
  else if (air) { aa = p.vy < 0 ? -2.5 : -1.9; ab = p.vy < 0 ? -2.2 : -2.4; } else if (p.shootCD > 6) ab = -1.5;
  arm(-7, aa, false);
  // body
  ctx.fillStyle = lg(ctx, 0, -32 + bob, 0, -10 + bob, [c0, c1]); rr(ctx, -10, -32 + bob, 20, 22, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ell(ctx, 3, -22 + bob, 4.5, 6); ctx.fill();
  // scarf
  const fl = Math.sin(frame * .3) * 2.5, spd = Math.min(8, Math.abs(p.vx) * 1.4);
  ctx.fillStyle = c2; rr(ctx, -10.5, -34 + bob, 21, 6.5, 3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-8, -33 + bob); ctx.quadraticCurveTo(-14 - spd, -34 + bob + fl, -20 - spd * 1.4, -28 + bob - fl + (air ? p.vy * -.5 : 0)); ctx.lineTo(-17 - spd * 1.3, -24 + bob - fl + (air ? p.vy * -.5 : 0)); ctx.quadraticCurveTo(-12 - spd * .5, -29 + bob, -8, -28 + bob); ctx.fill();
  // head + ears
  const hy = -43 + bob;
  ctx.fillStyle = c0; ctx.beginPath(); ctx.moveTo(-11, hy - 4); ctx.lineTo(-9, hy - 19); ctx.lineTo(-1, hy - 9); ctx.fill(); ctx.beginPath(); ctx.moveTo(2, hy - 10); ctx.lineTo(9, hy - 20); ctx.lineTo(12, hy - 5); ctx.fill();
  ctx.fillStyle = '#ffb0a0'; ctx.beginPath(); ctx.moveTo(-8.5, hy - 7); ctx.lineTo(-8, hy - 15); ctx.lineTo(-3.5, hy - 9); ctx.fill(); ctx.beginPath(); ctx.moveTo(4.5, hy - 10); ctx.lineTo(8.5, hy - 16); ctx.lineTo(10, hy - 7); ctx.fill();
  ctx.fillStyle = rg(ctx, -4, hy - 5, 18, [shade(c0, .25), c0, c1]); ell(ctx, 0, hy, 13, 12.5); ctx.fill();
  ctx.fillStyle = '#ffe4c4'; ell(ctx, 3.5, hy + 2, 9.5, 8.5); ctx.fill();
  if (p.dead) { ctx.strokeStyle = '#1a1a2a'; ctx.lineWidth = 1.8; for (const ex of [2, 9]) { ctx.beginPath(); ctx.moveTo(ex - 2, hy - 2); ctx.lineTo(ex + 2, hy + 2); ctx.moveTo(ex + 2, hy - 2); ctx.lineTo(ex - 2, hy + 2); ctx.stroke(); } }
  else if (p.blink > 0) { ctx.strokeStyle = '#1a1a2a'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(4, hy); ctx.moveTo(7, hy); ctx.lineTo(11, hy); ctx.stroke(); }
  else { ctx.fillStyle = '#1a1a2a'; ell(ctx, 2.5, hy, 2.1, 3.2); ctx.fill(); ell(ctx, 9, hy, 2.1, 3.2); ctx.fill(); ctx.fillStyle = '#fff'; ell(ctx, 3.2, hy - 1.2, .9, .9); ctx.fill(); ell(ctx, 9.7, hy - 1.2, .9, .9); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,120,120,.5)'; ell(ctx, 0, hy + 5, 2.6, 1.8); ctx.fill();
  ctx.fillStyle = '#3a2414'; ell(ctx, 12, hy + 3, 1.7, 1.4); ctx.fill();
  if (air || p.dashT > 0) { ctx.fillStyle = '#7a2a2a'; ell(ctx, 7, hy + 6.5, 2, 2.4); ctx.fill(); } else { ctx.strokeStyle = '#7a3a2a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(7, hy + 4.5, 3, .3, 2.6); ctx.stroke(); }
  arm(7, ab, true);
  if (p.ember && !ghost) { ctx.fillStyle = '#ffb040'; ell(ctx, 7 + Math.sin(ab) * -12, -28 + bob + Math.cos(ab) * 14, 3 + Math.sin(frame * .4), 4); ctx.fill(); }
  ctx.restore();
  if (ghost) return;
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2 - 6;
  if (p.shield) { ctx.strokeStyle = 'rgba(160,220,255,.8)'; ctx.lineWidth = 2.5; ctx.fillStyle = 'rgba(120,200,255,.14)'; ell(ctx, cx, cy, 34 + Math.sin(frame * .1) * 1.5, 38); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ell(ctx, cx - 14, cy - 18, 7, 4); ctx.fill(); }
  if (p.star > 0) glow(cx, cy, 70, `rgba(255,${200 + Math.sin(frame * .3) * 50 | 0},90,`, .5);
}

function drawShots() {
  for (const s of shots) {
    const x = s.x + s.w / 2, y = s.y + s.h / 2;
    if (s.kind === 'fire') { glow(x, y, 34, 'rgba(255,140,40,', .6); ctx.fillStyle = '#ff5a1f'; ell(ctx, x, y, 8, 8); ctx.fill(); ctx.fillStyle = '#ffe07a'; ell(ctx, x + Math.cos(frame * .5) * 2, y + Math.sin(frame * .5) * 2, 4, 4); ctx.fill(); }
    else if (s.kind === 'seed') { ctx.fillStyle = '#3a7a2a'; ell(ctx, x, y, 7, 7); ctx.fill(); ctx.fillStyle = '#b0f07a'; ell(ctx, x - 2, y - 2, 3, 3); ctx.fill(); }
    else if (s.kind === 'rock') { glow(x, y, 40, 'rgba(255,110,20,', .4); ctx.save(); ctx.translate(x, y); ctx.rotate(frame * .2); ctx.fillStyle = '#5a4a50'; ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28, rad = 10 + (i % 2) * 4; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } ctx.fill(); ctx.strokeStyle = '#ff8a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(0, 3); ctx.lineTo(6, -3); ctx.stroke(); ctx.restore(); }
    else if (s.kind === 'wave') { glow(x, y, 46, 'rgba(255,120,30,', .5); ctx.fillStyle = lg(ctx, 0, s.y - 10, 0, s.y + 30, ['#ffe07a', '#ff5a1f']); ctx.beginPath(); ctx.moveTo(s.x - 4, s.y + 30); ctx.quadraticCurveTo(x - 6, s.y - 14 - Math.sin(frame * .5) * 6, x + Math.sign(s.vx) * 10, s.y - 4); ctx.quadraticCurveTo(x + 6, s.y + 10, s.x + 34, s.y + 30); ctx.fill(); }
  }
}
function drawParticles() {
  for (const p of particles) {
    const k = p.life / p.max;
    switch (p.kind) {
      case 'dust': ctx.fillStyle = `rgba(235,235,235,${k * .5})`; ell(ctx, p.x, p.y, p.size * (1.6 - k), p.size * (1.6 - k)); ctx.fill(); break;
      case 'spark': ctx.globalAlpha = k; ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); ctx.globalAlpha = 1; break;
      case 'debris': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.min(1, k * 2); ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, 2); ctx.restore(); break;
      case 'drop': ctx.fillStyle = `rgba(200,235,255,${k})`; ell(ctx, p.x, p.y, p.size, p.size * 1.4); ctx.fill(); break;
      case 'bubble': ctx.strokeStyle = `rgba(220,245,255,${k})`; ctx.lineWidth = 1.5; ell(ctx, p.x + Math.sin(p.life * .3) * 3, p.y, p.size, p.size); ctx.stroke(); break;
      case 'ring': ctx.strokeStyle = p.color + k + ')'; ctx.lineWidth = 4 * k + 1; ell(ctx, p.x, p.y, p.size * (1 - k) + 6, (p.size * (1 - k) + 6) * .45); ctx.stroke(); break;
      case 'coinpop': drawCoin(p.x, p.y, p.life * .4, .85); break;
      case 'ghost': drawPip(Object.assign({}, player, { x: p.x, y: p.y, dir: p.dir, inv: 0 }), k * .35); break;
    }
  }
  ctx.textAlign = 'center'; ctx.font = '800 17px Rubik, Arial';
  for (const pp of popups) { ctx.globalAlpha = Math.min(1, pp.life / 20); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(pp.text, pp.x + 1.5, pp.y + 1.5); ctx.fillStyle = pp.color; ctx.fillText(pp.text, pp.x, pp.y); }
  ctx.globalAlpha = 1;
}

// ── LIGHTING, WEATHER ───────────────────────────────────────────
function drawLighting() {
  const th = level.theme; if (!th.dark) return;
  lctx.globalCompositeOperation = 'source-over'; lctx.clearRect(0, 0, W / 4, H / 4);
  lctx.fillStyle = `rgba(4,3,14,${th.dark})`; lctx.fillRect(0, 0, W / 4, H / 4);
  lctx.globalCompositeOperation = 'destination-out';
  const L = (wx, wy, r, a = 1) => { const x = (wx - camX) / 4, y = (wy - camY) / 4; r /= 4; if (x < -r || x > W / 4 + r || y < -r || y > H / 4 + r) return; lctx.fillStyle = rg(lctx, x, y, r, [`rgba(0,0,0,${a})`, `rgba(0,0,0,${a * .6})`, 'rgba(0,0,0,0)']); lctx.fillRect(x - r, y - r, r * 2, r * 2); };
  const p = player; L(p.x + 13, p.y + 16, p.star > 0 ? 380 : p.ember ? 320 : 280, 1);
  for (const t of level.torches) L(t.x, t.y - 10, 230 + Math.sin(frame * .3 + t.x) * 10, .95);
  for (const d of DECOR) if (d.glow) L(d.x, d.y - d.img.height * d.s * .5, 190, .6);
  for (const s of shots) L(s.x + 7, s.y + 7, s.kind === 'seed' ? 50 : 130, .9);
  for (const it of items) L(it.x + 15, it.y + 15, 110, .8);
  for (const g of level.gems) if (!g.got) L(g.x + 16, g.y + 18, 120, .8);
  for (const k of level.keys) if (!k.got) L(k.x + 14, k.y + 16, 100, .8);
  for (const g of level.goals) L(g.x + g.w / 2, g.y + 60, 260, .95);
  for (const cp of level.checkpoints) if (cp.taken) L(cp.x + 40, cp.y - 70, 150, .7);
  for (const ch of level.chests) L(ch.x + 24, ch.y + 10, 90, .6);
  for (const e of enemies) if (e.type === 'wisp' && e.alive) L(e.x + 16, e.y + 17, 150, .8);
  if (boss && (boss.alive || boss.dieT > 0) && boss.state !== 'sleep') L(boss.x + 46, boss.y + 50, 300, .9);
  if (level.themeName === 'keep') { const c0 = Math.max(0, Math.floor(camX / T)), c1 = Math.min(level.cols - 1, Math.floor((camX + W) / T)); for (let c = c0; c <= c1; c += 2) if (level.grid[level.G + 1][c] === 'L') L(c * T + 48, (level.G + 1) * T, 240, .75); }
  ctx.imageSmoothingEnabled = true; ctx.drawImage(lightC, 0, 0, W, H);
}
function drawWeather() {
  const k = level.theme.weather;
  ctx.save(); if (k === 'firefly' || k === 'ember') ctx.globalCompositeOperation = 'lighter';
  for (const w of WEATHER) {
    let x, y;
    if (k === 'snow') { x = w.x + Math.sin(frame * .02 + w.p) * 30 - camX * w.z * .6; y = w.y + frame * (1 + w.z) * .9 - camY * w.z * .3; }
    else if (k === 'leaves') { x = w.x - frame * (.6 + w.z * .6) - camX * w.z * .6; y = w.y + frame * .5 * w.z + Math.sin(frame * .03 + w.p) * 20 - camY * w.z * .3; }
    else if (k === 'ember') { x = w.x + Math.sin(frame * .03 + w.p) * 25 - camX * w.z * .6; y = w.y - frame * (.5 + w.z * .8) - camY * w.z * .3; }
    else { x = w.x + Math.sin(frame * .008 + w.p) * 50 - camX * w.z * .5; y = w.y + Math.cos(frame * .011 + w.p) * 30 - camY * w.z * .3; }
    x = ((x % W) + W) % W; y = ((y % H) + H) % H;
    if (k === 'snow') { ctx.fillStyle = `rgba(255,255,255,${.5 + w.s * .5})`; ell(ctx, x, y, 1.2 + w.z * 1.8, 1.2 + w.z * 1.8); ctx.fill(); }
    else if (k === 'leaves') { if (w.s > .55) continue; ctx.save(); ctx.translate(x, y); ctx.rotate(frame * .03 * (w.s + .5) + w.p); ctx.fillStyle = w.s < .25 ? '#ffb04a' : '#e2622a'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(0, -5, 7, 0); ctx.quadraticCurveTo(0, 4, -6, 0); ctx.fill(); ctx.restore(); }
    else if (k === 'ember') { const a = .4 + Math.sin(frame * .1 + w.p) * .4; ctx.fillStyle = `rgba(255,${130 + w.s * 90 | 0},40,${Math.max(0, a)})`; ctx.fillRect(x, y, 2 + w.z * 2, 2 + w.z * 2); }
    else if (k === 'firefly') { const a = (Math.sin(frame * .05 + w.p * 3) + 1) * .5; ctx.fillStyle = `rgba(200,255,140,${a * .9})`; ell(ctx, x, y, 2, 2); ctx.fill(); ctx.fillStyle = `rgba(200,255,140,${a * .16})`; ell(ctx, x, y, 9, 9); ctx.fill(); }
    else if (k === 'pollen') { ctx.fillStyle = `rgba(255,250,200,${.25 + w.s * .45})`; ell(ctx, x, y, 1 + w.z, 1 + w.z); ctx.fill(); }
    else { ctx.fillStyle = `rgba(190,210,255,${.1 + w.s * .2})`; ctx.fillRect(x, y, 2, 2); }
  }
  ctx.restore();
}

// ── HUD ─────────────────────────────────────────────────────────
function drawHUD() {
  const p = player;
  ctx.save(); ctx.textBaseline = 'middle';
  for (let i = 0; i < p.maxHp; i++) drawHeart(34 + i * 34, 34 + (i < p.hp && p.hp === 1 ? Math.sin(frame * .25) * 2 : 0), 13, i < p.hp);
  ctx.font = '800 22px Rubik, Arial'; ctx.textAlign = 'left';
  const txt = (s, x, y, c = '#fff') => { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(s, x + 2, y + 2); ctx.fillStyle = c; ctx.fillText(s, x, y); };
  drawCoin(32, 72, frame * .05, .95); txt(String(save.coins), 50, 73, '#ffe98a');
  for (let i = 0; i < 3; i++) { const x = 132 + i * 28, y = 72, on = run.gems[i];
    ctx.fillStyle = on ? lg(ctx, x - 9, y - 11, x + 9, y + 11, ['#e8fbff', '#5fd0ff', '#2a7ae0']) : 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + 10, y - 3); ctx.lineTo(x, y + 12); ctx.lineTo(x - 10, y - 3); ctx.closePath(); ctx.fill(); ctx.strokeStyle = on ? '#fff' : 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke(); }
  let sx = 226;
  for (let i = 0; i < p.keys; i++) { drawKey(sx, 72, .9); sx += 24; }
  if (p.ember || save.up.fire) { ctx.font = '20px Arial'; ctx.fillText('🔥', sx, 73); sx += 28; }
  if (p.shield) { ctx.font = '20px Arial'; ctx.fillText('🛡️', sx, 73); sx += 28; }
  if (p.star > 0) { ctx.fillStyle = 'rgba(0,0,0,.4)'; rr(ctx, sx, 64, 80, 14, 7); ctx.fill(); ctx.fillStyle = '#ffd23f'; rr(ctx, sx + 2, 66, 76 * p.star / 600, 10, 5); ctx.fill(); }
  ctx.font = '800 20px Rubik, Arial'; ctx.textAlign = 'right';
  const s = Math.floor(run.time / 60); txt(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, W - 24, 34);
  const tot = level.secrets.length; if (tot) { ctx.font = '600 16px Rubik, Arial'; txt(`🔍 ${run.secrets}/${tot}`, W - 24, 62, '#cfe'); }
  if (save.up.dash) { const k = 1 - p.dashCD / 36; ctx.fillStyle = 'rgba(0,0,0,.4)'; rr(ctx, 24, 94, 70, 8, 4); ctx.fill(); ctx.fillStyle = k >= 1 ? '#8ab4ff' : '#56608a'; rr(ctx, 24, 94, 70 * k, 8, 4); ctx.fill(); }
  if (boss && level.arena && level.arena.active && boss.alive) { const bw = 520, x = (W - bw) / 2;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; rr(ctx, x - 4, H - 54, bw + 8, 26, 10); ctx.fill();
    ctx.fillStyle = lg(ctx, x, 0, x + bw, 0, ['#ffd23f', '#ff5a1f', '#b0142e']); rr(ctx, x, H - 50, Math.max(8, bw * boss.hp / boss.maxHp), 18, 8); ctx.fill();
    ctx.font = '800 16px Rubik, Arial'; ctx.textAlign = 'center'; txt('שומר הגחלים', W / 2, H - 68, '#ffd9b0'); }
  ctx.textAlign = 'center';
  if (bannerT > 0) { const a = Math.min(1, bannerT / 20, (150 - bannerT) / 10 + .2); ctx.globalAlpha = clamp(a, 0, 1); ctx.font = '800 26px Rubik, Arial'; ctx.direction = 'rtl';
    const tw = ctx.measureText(bannerText).width + 50; ctx.fillStyle = 'rgba(8,10,24,.78)'; rr(ctx, W / 2 - tw / 2, 104, tw, 46, 23); ctx.fill(); ctx.strokeStyle = 'rgba(255,210,63,.7)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffe98a'; ctx.fillText(bannerText, W / 2, 128); ctx.globalAlpha = 1; }
  if (activeSign) { ctx.font = '600 21px Rubik, Arial'; ctx.direction = 'rtl'; const tw = Math.min(W - 80, ctx.measureText(activeSign.text).width + 48);
    const sxx = clamp(activeSign.x + 24 - camX, tw / 2 + 20, W - tw / 2 - 20), sy = clamp(activeSign.y - camY - 60, 170, H - 120);
    ctx.fillStyle = 'rgba(250,240,215,.96)'; rr(ctx, sxx - tw / 2, sy - 24, tw, 48, 14); ctx.fill(); ctx.strokeStyle = '#7a5226'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#3a2410'; ctx.fillText(activeSign.text, sxx, sy + 1, tw - 30); }
  ctx.restore();
}

function drawWorld() {
  ctx.imageSmoothingEnabled = true;
  drawBackground();
  ctx.save();
  const sx = shake ? (Math.random() - .5) * shake * 2 : 0, sy = shake ? (Math.random() - .5) * shake * 2 : 0;
  ctx.translate(-Math.round(camX) + sx, -Math.round(camY) + sy);
  drawDecor();
  drawChunks();
  drawDynamicTiles();
  drawObjects();
  for (const pl of level.plats) { if (pl.fs === 3 || pl.x > camX + W || pl.x + pl.w < camX) continue; const jx = pl.fs === 1 ? (Math.random() - .5) * 3 : 0;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; rr(ctx, pl.x + jx + 3, pl.y + 5, pl.w, pl.h, 5); ctx.fill();
    ctx.fillStyle = pl.fall ? lg(ctx, 0, pl.y, 0, pl.y + pl.h, ['#e8c9a0', '#b08a5a', '#7a5a34']) : lg(ctx, 0, pl.y, 0, pl.y + pl.h, ['#dfe6f2', '#8f9ab0', '#56607a']); rr(ctx, pl.x + jx, pl.y, pl.w, pl.h, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(pl.x + jx + 4, pl.y + 2, pl.w - 8, 2);
    ctx.fillStyle = pl.fall ? '#5a3e20' : '#ffd23f'; ell(ctx, pl.x + jx + 8, pl.y + 9, 2.5, 2.5); ctx.fill(); ell(ctx, pl.x + jx + pl.w - 8, pl.y + 9, 2.5, 2.5); ctx.fill(); }
  drawItems();
  enemies.forEach(drawEnemy);
  drawBoss();
  if (state !== 'title' && !(state === 'clear' && clearT > 50)) {
    if (player.onGround && !player.dead) shadowAt(player.x + 13, player.y + player.h, 13);
    if (state === 'clear') { ctx.save(); const k = 1 - clearT / 50; ctx.translate(player.x + 13, player.y + 21); ctx.scale(k, k); ctx.rotate(clearT * .25); ctx.translate(-player.x - 13, -player.y - 21); drawPip(player); ctx.restore(); }
    else drawPip(player);
  }
  drawShots();
  drawParticles();
  drawLiquids();
  drawSecretCovers();
  ctx.restore();
  drawLighting();
  drawWeather();
  if (level.theme.tint) { ctx.fillStyle = level.theme.tint; ctx.fillRect(0, 0, W, H); }
  ctx.drawImage(vignette, 0, 0, W, H);
  if (flash > 0) { ctx.fillStyle = `rgba(255,60,60,${flash * .04})`; ctx.fillRect(0, 0, W, H); }
}

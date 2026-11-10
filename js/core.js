'use strict';
// ════════════════════════════════════════════════════════════════
//  CORE: canvas, helpers, save data, audio, input
// ════════════════════════════════════════════════════════════════
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 1280, H = 720, T = 48;

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const $ = id => document.getElementById(id);
function RNG(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function hash2(a, b) { let h = (a * 374761393 + b * 668265263) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

const isTouch = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ('ontouchstart' in window && navigator.maxTouchPoints > 0);

function fitCanvas() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = Math.floor(W * s) + 'px';
  canvas.style.height = Math.floor(H * s) + 'px';
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

// ── SAVE ────────────────────────────────────────────────────────
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const SAVE_KEY = 'pip_save_v2';
const defaultSave = () => ({ coins: 0, up: {}, hearts: 0, skin: 'teal', skins: { teal: true }, lv: {}, secretOpen: false, muted: false, beaten: false });
let save = Object.assign(defaultSave(), store.get(SAVE_KEY, {}));
function persist() { store.set(SAVE_KEY, save); }

const UPGRADES = [
  { id: 'dj',     icon: '🪽', name: 'קפיצה כפולה',  desc: 'קפיצה נוספת באוויר — מגיעים לסודות גבוהים', price: 120 },
  { id: 'dash',   icon: '💨', name: 'דאש',          desc: 'זינוק מהיר (C / K). שובר קירות סדוקים ומחסל אויבים', price: 160 },
  { id: 'heart',  icon: '❤️', name: 'לב נוסף',      desc: '+1 לב מקסימלי (עד 3 פעמים)', price: [100, 200, 350] },
  { id: 'magnet', icon: '🧲', name: 'מגנט מטבעות',  desc: 'מטבעות קרובים נמשכים אליך', price: 140 },
  { id: 'glide',  icon: '🪂', name: 'גלימת רחיפה',  desc: 'החזק קפיצה בזמן נפילה כדי לרחף', price: 220 },
  { id: 'helmet', icon: '⛑️', name: 'קסדת סלע',     desc: 'שבור לבנים במכת ראש מלמטה', price: 90 },
  { id: 'fire',   icon: '🔥', name: 'אש מתמדת',     desc: 'כדורי אש תמיד זמינים (X / J)', price: 300 },
  { id: 'lucky',  icon: '🍀', name: 'קמע מזל',      desc: 'כל מטבע שווה כפול', price: 400 },
];
const SKINS = [
  { id: 'teal',  name: 'טורקיז',  c: ['#2fc4b5', '#157a70', '#ff8a3d'], price: 0 },
  { id: 'rose',  name: 'ורד',     c: ['#f0628a', '#a82a55', '#ffe08a'], price: 60 },
  { id: 'royal', name: 'מלכותי',  c: ['#7c5cf0', '#4a2fa8', '#ffd23f'], price: 60 },
  { id: 'night', name: 'נינג׳ה',  c: ['#39405e', '#1c2036', '#5ff0df'], price: 90 },
  { id: 'gold',  name: 'זהב',     c: ['#f2b93a', '#a87412', '#fff7c2'], price: 150 },
];
const skinColors = () => (SKINS.find(s => s.id === save.skin) || SKINS[0]).c;

// ── AUDIO ───────────────────────────────────────────────────────
let AC = null, master = null, noiseBuf = null;
function audioInit() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = save.muted ? 0 : .9; master.connect(AC.destination);
      noiseBuf = AC.createBuffer(1, AC.sampleRate * .5, AC.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { AC = null; }
  }
  if (AC && AC.state === 'suspended') AC.resume();
}
function tone(freq, dur, type = 'square', vol = .1, when = 0, slide = 0) {
  if (!AC) return;
  try {
    const t0 = AC.currentTime + when, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0008, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + .02);
  } catch (e) {}
}
function noise(dur, vol = .15, freq = 1200, when = 0) {
  if (!AC) return;
  try {
    const t0 = AC.currentTime + when, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t0); f.frequency.exponentialRampToValueAtTime(Math.max(80, freq * .2), t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0008, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t0); s.stop(t0 + dur + .02);
  } catch (e) {}
}
const sfx = {
  jump()   { tone(300, .17, 'sine', .13, 0, 2.1); },
  djump()  { tone(480, .16, 'sine', .12, 0, 2); tone(720, .1, 'triangle', .06, .04, 1.5); },
  wall()   { tone(360, .12, 'triangle', .12, 0, 1.8); noise(.06, .06, 2000); },
  land()   { noise(.07, .08, 500); },
  coin()   { tone(1175, .05, 'square', .05); tone(1760, .16, 'square', .05, .05); },
  gem()    { [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, .2, 'sine', .11, i * .07)); },
  stomp()  { tone(240, .12, 'triangle', .22, 0, .4); noise(.06, .08, 900); },
  bump()   { tone(130, .08, 'square', .1); },
  brk()    { noise(.25, .22, 1400); tone(110, .15, 'sawtooth', .08, 0, .4); },
  pound()  { noise(.35, .3, 700); tone(70, .3, 'sine', .3, 0, .5); },
  dash()   { noise(.18, .12, 3000); tone(600, .12, 'sawtooth', .04, 0, .4); },
  power()  { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, .1, 'triangle', .13, i * .06)); },
  appear() { [392, 523, 659].forEach((f, i) => tone(f, .08, 'triangle', .09, i * .05)); },
  hurt()   { tone(380, .3, 'sawtooth', .11, 0, .3); noise(.1, .1, 800); },
  die()    { [494, 440, 392, 330, 262, 196].forEach((f, i) => tone(f, .16, 'triangle', .13, i * .11)); },
  fire()   { tone(820, .09, 'square', .05, 0, .3); noise(.08, .05, 2500); },
  kick()   { tone(560, .1, 'square', .08, 0, .5); },
  spring() { tone(220, .25, 'sine', .16, 0, 3.2); },
  splash() { noise(.3, .12, 1800); },
  check()  { [523, 784, 1046].forEach((f, i) => tone(f, .13, 'triangle', .13, i * .1)); },
  secret() { [659, 622, 659, 784, 988, 1318].forEach((f, i) => tone(f, .14, 'sine', .12, i * .09)); },
  key()    { tone(1318, .08, 'square', .06); tone(1760, .2, 'square', .06, .08); },
  door()   { tone(160, .25, 'triangle', .14, 0, .6); noise(.2, .06, 500); },
  locked() { tone(140, .1, 'square', .1); tone(110, .14, 'square', .1, .1); },
  shield() { tone(900, .25, 'sine', .1, 0, .4); },
  heal()   { tone(660, .1, 'sine', .12); tone(880, .2, 'sine', .12, .08); },
  clear()  { [523, 659, 784, 1046, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, .2, 'triangle', .14, i * .12)); },
  roar()   { tone(90, .7, 'sawtooth', .22, 0, .5); noise(.6, .18, 600); },
  bossHit(){ tone(180, .25, 'square', .16, 0, .4); noise(.2, .15, 1200); },
  boom()   { noise(.8, .35, 900); tone(60, .7, 'sine', .3, 0, .4); },
  buy()    { [784, 1046, 1568].forEach((f, i) => tone(f, .12, 'triangle', .12, i * .07)); },
};

// Original background loops (midi numbers, 0 = rest)
const SONGS = {
  meadow: { tempo: .16, wave: 'triangle', lead: [72,0,76,79, 0,76,74,72, 69,0,72,74, 76,0,0,0, 72,0,76,79, 81,79,76,74, 72,74,76,72, 74,0,0,0], bass: [48,55,52,55, 45,52,48,52, 41,48,45,48, 43,50,47,50] },
  cave:   { tempo: .21, wave: 'sine',     lead: [69,0,0,72, 71,0,67,0, 69,0,0,76, 74,0,72,71, 69,0,0,72, 74,0,76,0, 77,76,74,72, 71,0,0,0], bass: [45,0,45,0, 43,0,43,0, 41,0,41,0, 40,0,44,0] },
  sunset: { tempo: .14, wave: 'triangle', lead: [74,76,78,81, 0,78,81,83, 81,0,78,76, 74,0,71,0, 74,76,78,81, 83,0,85,86, 85,83,81,78, 81,0,0,0], bass: [50,57,50,57, 47,54,47,54, 43,50,43,50, 45,52,45,52] },
  snow:   { tempo: .19, wave: 'sine',     lead: [76,0,79,0, 83,0,81,79, 76,0,74,0, 71,0,0,0, 72,0,76,0, 79,0,78,76, 74,0,71,74, 76,0,0,0], bass: [52,59,52,59, 48,55,48,55, 45,52,45,52, 47,54,47,54] },
  keep:   { tempo: .15, wave: 'sawtooth', lead: [62,0,65,0, 69,68,65,0, 62,0,61,0, 62,0,0,0, 65,0,69,0, 72,70,69,0, 68,0,65,64, 62,0,0,0], bass: [38,38,45,38, 38,38,44,38, 36,36,43,36, 37,37,45,37] },
  boss:   { tempo: .11, wave: 'sawtooth', lead: [62,62,0,65, 62,0,68,67, 62,62,0,65, 62,0,70,69, 62,62,0,65, 62,0,68,67, 74,73,72,70, 69,67,65,64], bass: [38,38,38,38, 38,38,41,41, 36,36,36,36, 37,37,40,40] },
  garden: { tempo: .18, wave: 'sine',     lead: [79,0,83,86, 88,0,86,83, 81,0,84,88, 91,0,0,0, 79,0,83,86, 90,0,88,86, 84,83,81,79, 83,0,0,0], bass: [43,50,55,50, 40,47,52,47, 45,52,57,52, 38,45,50,45] },
};
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
let musicStep = 0, musicNext = 0, currentSong = null;
function setSong(name) { if (currentSong !== name) { currentSong = name; musicStep = 0; musicNext = 0; } }
function musicTick(active) {
  if (!AC || save.muted || !currentSong || !active) { musicNext = 0; return; }
  const s = SONGS[currentSong];
  if (!musicNext || musicNext < AC.currentTime) musicNext = AC.currentTime + .05;
  while (musicNext < AC.currentTime + .25) {
    const when = musicNext - AC.currentTime;
    const l = s.lead[musicStep % s.lead.length];
    if (l) { tone(midi(l), s.tempo * 1.5, s.wave, s.wave === 'sawtooth' ? .022 : .05, when); tone(midi(l + 12), s.tempo * .8, 'sine', .012, when); }
    if (musicStep % 2 === 0) { const b = s.bass[(musicStep / 2) % s.bass.length]; if (b) tone(midi(b), s.tempo * 1.9, 'triangle', .085, when); }
    if (musicStep % 4 === 2) noise(.03, .018, 6000, when);
    musicStep++; musicNext += s.tempo;
  }
}
function setMuted(m) {
  save.muted = m; persist();
  if (master) master.gain.value = m ? 0 : .9;
  $('muteBtn').textContent = m ? '🔇' : '🔊';
}

// ── INPUT ───────────────────────────────────────────────────────
const keys = {}, pressed = {};
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyZ: 'jump',
  KeyX: 'act', KeyJ: 'act', ShiftLeft: 'act',
  KeyC: 'dash', KeyK: 'dash', ShiftRight: 'dash',
};
function press(a) { if (!keys[a]) pressed[a] = true; keys[a] = true; }
function release(a) { keys[a] = false; }
function clearPressed() { for (const k in pressed) pressed[k] = false; }
document.addEventListener('keydown', e => {
  audioInit();
  if (e.code === 'KeyP' || e.code === 'Escape') { if (typeof togglePause === 'function') togglePause(); e.preventDefault(); return; }
  if (e.code === 'KeyM') { setMuted(!save.muted); return; }
  if (e.code === 'Enter' && typeof onEnterKey === 'function') { onEnterKey(); return; }
  const a = KEYMAP[e.code]; if (a) { press(a); e.preventDefault(); }
});
document.addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) release(a); });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (typeof state !== 'undefined' && state === 'play') togglePause(); });

function bindBtn(id, action) {
  const el = $(id);
  const on = e => { e.preventDefault(); audioInit(); press(action); el.classList.add('pressed'); };
  const off = e => { e.preventDefault(); release(action); el.classList.remove('pressed'); };
  el.addEventListener('touchstart', on, { passive: false });
  el.addEventListener('touchend', off, { passive: false });
  el.addEventListener('touchcancel', off, { passive: false });
  el.addEventListener('mousedown', on); el.addEventListener('mouseup', off); el.addEventListener('mouseleave', off);
}
[['tLeft', 'left'], ['tRight', 'right'], ['tUp', 'up'], ['tDown', 'down'], ['tJump', 'jump'], ['tFire', 'act'], ['tDash', 'dash']].forEach(a => bindBtn(a[0], a[1]));

let toastT = null;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200); }

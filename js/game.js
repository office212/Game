'use strict';
// ════════════════════════════════════════════════════════════════
//  GAME FLOW: menus, world map, shop, main loop
// ════════════════════════════════════════════════════════════════
let levelIdx = 0, introT = 0;
const SCREENS = ['scrTitle', 'scrMap', 'scrShop', 'scrPause', 'scrResult'];
function showScreen(id) {
  SCREENS.forEach(s => $(s).classList.toggle('on', s === id));
  const inGame = !id;
  $('topBtns').style.display = inGame ? 'flex' : 'none';
  $('touch').style.display = inGame && isTouch ? 'flex' : 'none';
}
const fmtTime = f => { const s = Math.floor(f / 60); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const lvSave = id => save.lv[id] || { done: false, gems: [false, false, false], best: null, secrets: 0 };
const isLocked = i => { const d = LEVELS[i]; return d.secret ? !save.secretOpen : i > 0 && !lvSave(LEVELS[i - 1].id).done; };

function resetWorld() {
  enemies = []; items = []; shots = []; particles = []; popups = []; flyCoins = []; vines = [];
  bumps.clear(); crumbles.clear(); boss = null; warp = null; activeSign = null; bannerT = 0; shake = 0; flash = 0;
}
function startLevel(idx) {
  levelIdx = idx; level = buildLevel(idx); resetWorld();
  prepareLevelGraphics();
  enemies = level.spawns.map(s => makeEnemy(s.type, s.c, s.r));
  if (level.boss) makeBoss();
  respawn = { x: level.start.x, y: level.start.y };
  player = newPlayer(respawn.x, respawn.y);
  run = { coins: 0, deaths: 0, time: 0, gems: [false, false, false], secrets: 0, kills: 0 };
  const sv = lvSave(level.def.id);
  level.gems.forEach(g => { if (sv.gems[g.idx]) { g.got = true; run.gems[g.idx] = true; } });
  snapCamera(); setSong(level.theme.song);
  state = 'intro'; introT = 110; showScreen(null);
}
function beginClear(g) {
  if (state !== 'play') return;
  state = 'clear'; clearT = 0; clearGoal = g; sfx.clear(); setSong(null);
  sparkle(g.x + g.w / 2, g.y + 60, 24, g.secret ? '#d0a0ff' : '#9ff');
}
function finishLevel() {
  const id = level.def.id, sv = save.lv[id] || (save.lv[id] = lvSave(id));
  const first = !sv.done;
  sv.done = true; run.gems.forEach((g, i) => { if (g) sv.gems[i] = true; });
  if (sv.best === null || run.time < sv.best) sv.best = run.time;
  sv.secrets = Math.max(sv.secrets || 0, run.secrets);
  let title = 'השלב הושלם!';
  if (clearGoal && clearGoal.secret) { if (!save.secretOpen) title = '🍄 יציאה סודית! הגן הנסתר נפתח במפה'; save.secretOpen = true; }
  if (id === 'keep') { save.beaten = true; if (first) title = '🏆 ניצחת! פיפ הציל את ששת העולמות'; }
  persist();
  const gems = run.gems.filter(Boolean).length, stars = 1 + (gems === 3 ? 1 : 0) + (run.deaths === 0 ? 1 : 0);
  $('resTitle').textContent = title;
  $('resStars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('resStats').innerHTML = `<span>⏱ זמן</span><span>${fmtTime(run.time)}</span><span>🪙 מטבעות שנאספו</span><span>+${run.coins}</span><span>💎 אבני חן</span><span>${gems}/3</span><span>🔍 סודות</span><span>${run.secrets}/${level.secrets.length}</span><span>💀 פסילות</span><span>${run.deaths}</span>`;
  const next = levelIdx + 1;
  $('btnNext').style.display = (next < LEVELS.length && !LEVELS[next].secret && !isLocked(next)) ? '' : 'none';
  state = 'result'; showScreen('scrResult');
}

// ── MAP & SHOP ──────────────────────────────────────────────────
function goMap() {
  persist(); state = 'map'; setSong(null);
  $('mapCoins').textContent = save.coins;
  $('mapGems').textContent = LEVELS.reduce((n, d) => n + lvSave(d.id).gems.filter(Boolean).length, 0) + '/' + LEVELS.length * 3;
  const grid = $('levelGrid'); grid.innerHTML = '';
  LEVELS.forEach((d, i) => {
    const sv = lvSave(d.id), locked = isLocked(i), el = document.createElement('div');
    el.className = 'card' + (locked ? ' locked' : '') + (sv.done ? ' done' : '');
    el.style.background = d.css;
    const hidden = d.secret && locked;
    el.innerHTML = `<div class="num">${d.secret ? '★' : i + 1}</div><div class="ico">${locked ? '🔒' : d.icon}</div>
      <div class="name">${hidden ? '??? עולם סודי' : d.name}</div>
      <div class="meta"><span>${sv.gems.map(g => g ? '💎' : '◇').join(' ')}</span><span>${sv.best !== null ? '⏱ ' + fmtTime(sv.best) : sv.done ? '✓' : ''}</span></div>`;
    el.onclick = () => { audioInit(); if (locked) { toast(d.secret ? 'מצא את היציאה הסודית במערות הבדולח…' : 'סיים קודם את העולם הקודם'); sfx.locked(); } else startLevel(i); };
    grid.appendChild(el);
  });
  showScreen('scrMap');
}
function renderShop() {
  $('shopCoins').textContent = save.coins;
  const grid = $('shopGrid'); grid.innerHTML = '';
  UPGRADES.forEach(u => {
    const multi = Array.isArray(u.price), lvl = multi ? (save.hearts || 0) : (save.up[u.id] ? 1 : 0), max = multi ? u.price.length : 1;
    const owned = lvl >= max, price = owned ? 0 : (multi ? u.price[lvl] : u.price);
    const el = document.createElement('div'); el.className = 'item' + (owned ? ' owned' : '');
    el.innerHTML = `<div class="ico">${u.icon}</div><div class="name">${u.name}${multi ? ` (${lvl}/${max})` : ''}</div><div class="desc">${u.desc}</div>`;
    const b = document.createElement('button'); b.className = 'btn small' + (owned ? ' ghost' : ' alt');
    b.textContent = owned ? '✓ נרכש' : `🪙 ${price}`; b.disabled = owned || save.coins < price;
    b.onclick = () => { audioInit(); save.coins -= price; if (multi) save.hearts = lvl + 1; else save.up[u.id] = true; persist(); sfx.buy(); toast(u.icon + ' ' + u.name + ' נרכש!'); renderShop(); };
    el.appendChild(b); grid.appendChild(el);
  });
  const row = $('skinRow'); row.innerHTML = '';
  SKINS.forEach(s => {
    const own = save.skins[s.id], el = document.createElement('div'); el.className = 'skin' + (save.skin === s.id ? ' sel' : '');
    el.innerHTML = `<i style="background:linear-gradient(135deg,${s.c[0]},${s.c[1]});border-color:${s.c[2]}"></i>${s.name}<br>${own ? (save.skin === s.id ? '✓' : 'בחר') : '🪙 ' + s.price}`;
    el.onclick = () => { audioInit(); if (own) save.skin = s.id; else if (save.coins >= s.price) { save.coins -= s.price; save.skins[s.id] = true; save.skin = s.id; sfx.buy(); } else { sfx.locked(); toast('אין מספיק מטבעות'); } persist(); renderShop(); };
    row.appendChild(el);
  });
}
function togglePause() {
  if (state === 'play') { state = 'pause'; showScreen('scrPause'); }
  else if (state === 'pause') { state = 'play'; showScreen(null); }
}
function onEnterKey() {
  if (state === 'title') $('btnPlay').click();
  else if (state === 'result') ($('btnNext').style.display === 'none' ? $('btnResMap') : $('btnNext')).click();
}
$('btnPlay').onclick = () => { audioInit(); if (!lvSave(LEVELS[0].id).done && save.coins === 0) startLevel(0); else goMap(); };
$('btnShop').onclick = () => { renderShop(); showScreen('scrShop'); };
$('btnShopBack').onclick = goMap;
$('btnResume').onclick = togglePause;
$('btnRestart').onclick = () => startLevel(levelIdx);
$('btnQuit').onclick = goMap;
$('btnNext').onclick = () => startLevel(levelIdx + 1);
$('btnResMap').onclick = goMap;
$('btnReset').onclick = () => { if (confirm('לאפס את כל ההתקדמות, המטבעות והשדרוגים?')) { const m = save.muted; save = defaultSave(); save.muted = m; persist(); renderShop(); toast('ההתקדמות אופסה'); } };
$('pauseBtn').onclick = e => { togglePause(); e.target.blur(); };
$('muteBtn').onclick = e => { audioInit(); setMuted(!save.muted); e.target.blur(); };
if (isTouch) $('keysHint').innerHTML = 'השתמש בכפתורים שעל המסך · ▲ לדלתות ולטיפוס · ▼ באוויר = מכת קרקע<br><b>חפש קירות מזויפים, בלוקים סדוקים, גפנים נסתרות ודלתות נעולות — בכל עולם מסתתרות 3 אבני חן!</b>';

// ── UPDATE ──────────────────────────────────────────────────────
function update() {
  frame++;
  if (shake > 0) { shake *= .86; if (shake < .3) shake = 0; }
  if (flash > 0) flash--;
  if (bannerT > 0) bannerT--;
  switch (state) {
    case 'title': case 'map': case 'result': {
      if (state !== 'result') { camX = (Math.sin(frame * .0025 - 1.5) * .5 + .5) * Math.min(level.cols * T - W, 3400); camY = groundCamY(); }
      updatePlatforms(); updateParticles(); break;
    }
    case 'intro': if (--introT <= 0) state = 'play'; updatePlatforms(); break;
    case 'dying': player.vy += .6; player.y += player.vy; updateParticles(); if (--dyingT <= 0) respawnPlayer(); break;
    case 'clear': {
      clearT++; const g = clearGoal;
      player.x += (g.x + g.w / 2 - 13 - player.x) * .12; player.y += (g.y + 50 - player.y) * .12;
      updateParticles(); if (clearT > 95) finishLevel(); break;
    }
    case 'play': {
      if (warp) {
        warp.t++;
        if (warp.t === 14) { player.x = warp.to.x + 9; player.y = warp.to.y + warp.to.h - player.h; player.vx = player.vy = 0; player.safeX = player.x; player.safeY = player.y; snapCamera(); }
        if (warp.t >= 28) warp = null;
        break;
      }
      run.time++;
      const found = run.secrets;
      updateBlocks(); updatePlatforms(); updatePlayer();
      if (run.secrets !== found) chunks.clear();
      updateEnemies(); updateBoss(); updateItems(); updateShots(); updateParticles();
      if (state === 'play') updateCamera();
      if (frame % 45 === 0) for (const h of level.hints) if (h.x > camX && h.x < camX + W) sparkle(h.x + (Math.random() - .5) * 30, h.y + (Math.random() - .5) * 30, 2, '#fff8c0');
      break;
    }
  }
  clearPressed();
}

// ── DRAW ────────────────────────────────────────────────────────
function draw() {
  drawWorld();
  const inLevel = state === 'play' || state === 'pause' || state === 'intro' || state === 'dying' || state === 'clear';
  if (inLevel) drawHUD();
  let fade = 0;
  if (warp) fade = 1 - Math.abs(warp.t - 14) / 14;
  if (state === 'clear') fade = clamp((clearT - 55) / 35, 0, 1);
  if (state === 'intro') {
    const a = clamp(introT / 40, 0, 1);
    ctx.fillStyle = `rgba(4,5,14,${a * .92})`; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = clamp(introT / 25, 0, 1); ctx.textAlign = 'center'; ctx.direction = 'rtl';
    ctx.font = '80px Arial'; ctx.fillText(level.def.icon, W / 2, H / 2 - 70);
    ctx.font = "56px 'Secular One', Rubik, Arial"; ctx.fillStyle = '#ffd23f'; ctx.fillText(level.def.name, W / 2, H / 2 + 20);
    ctx.font = '600 22px Rubik, Arial'; ctx.fillStyle = '#9fe9e1'; ctx.fillText(level.def.secret ? 'עולם סודי' : 'עולם ' + (levelIdx + 1), W / 2, H / 2 + 64);
    ctx.globalAlpha = 1; ctx.direction = 'ltr';
  }
  if (fade > 0) { ctx.fillStyle = `rgba(4,5,14,${fade})`; ctx.fillRect(0, 0, W, H); }
}

// ── MAIN LOOP (fixed 60Hz) ──────────────────────────────────────
level = buildLevel(0); resetWorld(); prepareLevelGraphics();
enemies = level.spawns.map(s => makeEnemy(s.type, s.c, s.r));
player = newPlayer(level.start.x, level.start.y); respawn = { x: level.start.x, y: level.start.y };
setMuted(save.muted); state = 'title';

let last = performance.now(), acc = 0;
const STEP = 1000 / 60;
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= STEP) { update(); acc -= STEP; }
  musicTick(state === 'play' || state === 'intro');
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

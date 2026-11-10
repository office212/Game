'use strict';
// ════════════════════════════════════════════════════════════════
//  WORLD STATE, PHYSICS, PLAYER, ENEMIES, BOSS
// ════════════════════════════════════════════════════════════════
const GRAV = .9, GRAV_HOLD = .48, MAXFALL = 17, JUMPV = 14.6, SPEED = 5.4, ACC = .6, FRIC = .78;
const SOLIDS = '#S=?MucIX';

let level = null, player = null, boss = null;
let enemies = [], items = [], shots = [], particles = [], popups = [], flyCoins = [], vines = [];
let camX = 0, camY = 0, shake = 0, frame = 0, flash = 0;
let state = 'title', warp = null, activeSign = null, respawn = null, dyingT = 0, clearT = 0, clearGoal = null, bannerT = 0, bannerText = '';
let run = { coins: 0, deaths: 0, time: 0, gems: [false, false, false], secrets: 0, kills: 0 };
const bumps = new Map(), crumbles = new Map();

function tileAt(c, r) {
  if (c < 0 || c >= level.cols) return 'S';
  if (r < 0 || r >= level.rows) return ' ';
  return level.grid[r][c];
}
const solidCh = ch => ch !== ' ' && SOLIDS.indexOf(ch) >= 0;
const isSolid = (c, r) => solidCh(tileAt(c, r));
const isWater = ch => ch === '~' || ch === 'w';
function setTile(c, r, ch) {
  if (c < 0 || c >= level.cols || r < 0 || r >= level.rows) return;
  level.grid[r][c] = ch;
  if (typeof invalidateChunk === 'function') invalidateChunk(c);
}
const rectHit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function newPlayer(x, feetY) {
  const maxHp = 3 + (save.hearts || 0);
  return { x, y: feetY - 42, w: 26, h: 42, vx: 0, vy: 0, onGround: false, dir: 1, hp: maxHp, maxHp, inv: 0, star: 0, ember: false, shield: false,
    coyote: 0, buffer: 0, holdJump: false, jumpsLeft: 1, dashT: 0, dashCD: 0, airDashed: false, pound: 0, poundT: 0, climb: false, inWater: false,
    wallT: 0, wallDir: 0, wallLock: 0, sliding: false, gliding: false, anim: 0, plat: null, safeX: x, safeY: feetY - 42, keys: 0, squash: 0,
    shootCD: 0, dropT: 0, groundCh: ' ', springT: 0, dead: false, blink: 0 };
}

// ── FX helpers ──────────────────────────────────────────────────
function part(kind, x, y, o) { particles.push(Object.assign({ kind, x, y, vx: 0, vy: 0, life: 30, max: 30, g: 0, size: 4, color: '#fff' }, o, o && o.life ? { max: o.life } : null)); }
function dust(x, y, n = 3) { for (let i = 0; i < n; i++) part('dust', x + (Math.random() - .5) * 12, y - 2, { vx: (Math.random() - .5) * 1.6, vy: -Math.random() * .9, life: 20 + Math.random() * 10, size: 4 + Math.random() * 3 }); }
function sparkle(x, y, n = 6, color = '#fff3a0') { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 1 + Math.random() * 2.5; part('spark', x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 18 + Math.random() * 14, color, size: 2 + Math.random() * 2 }); } }
function debris(x, y, color, n = 6) { for (let i = 0; i < n; i++) part('debris', x + (Math.random() - .5) * 30, y + (Math.random() - .5) * 30, { vx: (Math.random() - .5) * 8, vy: -4 - Math.random() * 7, g: .55, life: 50, color, size: 6 + Math.random() * 7, rot: Math.random() * 6 }); }
function splash(x, y) { sfx.splash(); for (let i = 0; i < 10; i++) part('drop', x + (Math.random() - .5) * 20, y, { vx: (Math.random() - .5) * 5, vy: -3 - Math.random() * 5, g: .4, life: 30, size: 3 }); }
function ring(x, y, color = 'rgba(255,255,255,', r = 60) { part('ring', x, y, { life: 22, size: r, color }); }
function popup(x, y, text, color = '#fff') { popups.push({ x, y, text, color, life: 55 }); }
function banner(text) { bannerText = text; bannerT = 150; }

function addCoins(n, x, y, quiet) {
  n *= save.up.lucky ? 2 : 1;
  save.coins += n; run.coins += n;
  if (!quiet) sfx.coin();
  if (x !== undefined && n > 1) popup(x, y, '+' + n, '#ffd23f');
}

// ── COLLISION ───────────────────────────────────────────────────
function moveBox(e, opt) {
  const pl = opt && opt.pl;
  let hitX = 0;
  e.x += e.vx;
  const r0 = Math.floor(e.y / T), r1 = Math.floor((e.y + e.h - .01) / T);
  if (e.vx > 0) {
    const c = Math.floor((e.x + e.w - .01) / T);
    for (let r = r0; r <= r1; r++) if (isSolid(c, r)) { e.x = c * T - e.w; hitX = 1; e.hitC = c; break; }
  } else if (e.vx < 0) {
    const c = Math.floor(e.x / T);
    for (let r = r0; r <= r1; r++) if (isSolid(c, r)) { e.x = (c + 1) * T; hitX = -1; e.hitC = c; break; }
  }
  if (hitX) e.vx = 0;
  const prevTop = e.y, prevBottom = e.y + e.h;
  e.y += e.vy; e.onGround = false;
  const c0 = Math.floor(e.x / T), c1 = Math.floor((e.x + e.w - .01) / T);
  if (e.vy > 0) {
    const r = Math.floor((e.y + e.h - .01) / T);
    for (let c = c0; c <= c1; c++) {
      const ch = tileAt(c, r);
      if (solidCh(ch) || ((ch === '-' || ch === 'k') && prevBottom <= r * T + .01 && !(pl && e.dropT > 0))) { e.y = r * T - e.h; e.vy = 0; e.onGround = true; break; }
    }
  } else if (e.vy < 0) {
    const r = Math.floor(e.y / T), hits = [];
    for (let c = c0; c <= c1; c++) { const ch = tileAt(c, r); if (solidCh(ch) || (pl && ch === 'i' && prevTop >= (r + 1) * T - .01)) hits.push(c); }
    if (hits.length) {
      e.y = (r + 1) * T; e.vy = 0;
      if (opt && opt.head) { const mid = Math.floor((e.x + e.w / 2) / T); opt.head(hits.includes(mid) ? mid : hits[0], r); }
    }
  }
  return hitX;
}
function landOnPlats(e, prevBottom) {
  if (e.vy < 0 || e.dropT > 0) return null;
  for (const p of level.plats) {
    if (p.fs === 3) continue;
    if (e.x + e.w > p.x + 2 && e.x < p.x + p.w - 2) {
      const top = p.y, prevTop = p.y - p.dy;
      if (prevBottom <= Math.max(top, prevTop) + 2 && e.y + e.h >= top) { e.y = top - e.h; e.vy = 0; e.onGround = true; return p; }
    }
  }
  return null;
}
function ladderAt(p) {
  const c = Math.floor((p.x + p.w / 2) / T);
  const r0 = Math.floor((p.y + 6) / T), r1 = Math.floor((p.y + p.h - 4) / T);
  for (let r = r0; r <= r1; r++) if (tileAt(c, r) === 'H') return true;
  return false;
}

// ── BLOCKS ──────────────────────────────────────────────────────
function breakTile(c, r) {
  const ch = tileAt(c, r), th = level.theme;
  setTile(c, r, ' ');
  debris(c * T + 24, r * T + 24, ch === '=' ? th.brick : ch === 'c' ? th.stone : th.soil, 7);
  sfx.brk(); shake = Math.max(shake, 6);
}
function spawnItem(kind, c, r) {
  sfx.appear();
  items.push({ kind, x: c * T + 9, y: r * T, w: 30, h: 30, vx: 0, vy: 0, rise: 34, baseY: r * T, onGround: false, t: 0 });
}
function hitBlock(c, r) {
  const t = tileAt(c, r), key = c + ',' + r, bx = c * T, by = r * T;
  for (const e of enemies) if (e.alive && e.x + e.w > bx && e.x < bx + T && Math.abs((e.y + e.h) - by) < 8) killEnemy(e, true);
  const content = level.contents.get(key) || 'coin';
  if (t === '?' || t === 'M' || t === 'i') {
    setTile(c, r, 'u'); bumps.set(key, 12);
    if (content === 'coin') { part('coinpop', bx + 24, by - 8, { vy: -10, g: .6, life: 34 }); addCoins(1); }
    else if (content === 'vine') { vines.push({ c, r: r - 1, n: 11, t: 0 }); sfx.appear(); }
    else spawnItem(content, c, r);
  } else if (t === '=') {
    if (save.up.helmet) { breakTile(c, r); } else { bumps.set(key, 12); sfx.bump(); }
  } else if (t === 'u') { bumps.set(key, 8); sfx.bump(); }
}
function updateBlocks() {
  bumps.forEach((v, k) => { v <= 0 ? bumps.delete(k) : bumps.set(k, v - 1); });
  for (const v of vines) {
    if (++v.t % 5 === 0 && v.n > 0) {
      if (tileAt(v.c, v.r) === ' ' || tileAt(v.c, v.r) === 'o') { setTile(v.c, v.r, 'H'); sparkle(v.c * T + 24, v.r * T + 24, 3, '#a4e572'); v.r--; v.n--; } else v.n = 0;
    }
  }
  vines = vines.filter(v => v.n > 0);
  crumbles.forEach((o, k) => {
    o.t++;
    const [c, r] = k.split(',').map(Number);
    if (o.t === 24) { setTile(c, r, ' '); debris(c * T + 24, r * T + 24, level.theme.soilLight, 5); sfx.bump(); }
    if (o.t > 240 && !rectHit(player, { x: c * T, y: r * T, w: T, h: T })) { setTile(c, r, 'X'); crumbles.delete(k); }
  });
}

// ── PLAYER ──────────────────────────────────────────────────────
function hurtPlayer(pit) {
  const p = player; if (state !== 'play') return;
  if (!pit) {
    if (p.inv > 0 || p.star > 0 || p.dashT > 0) return;
    if (p.shield) { p.shield = false; p.inv = 70; sfx.shield(); ring(p.x + 13, p.y + 21, 'rgba(120,200,255,', 70); return; }
  }
  p.hp--; p.ember = false; shake = 9; flash = 8; sfx.hurt();
  p.pound = 0; p.dashT = 0; p.climb = false;
  if (p.hp <= 0) { killPlayer(); return; }
  p.inv = 110;
  if (pit) { p.x = p.safeX; p.y = p.safeY; p.vx = 0; p.vy = 0; p.plat = null; ring(p.x + 13, p.y + 21); }
  else { p.vy = -8; p.vx = -p.dir * 6; p.wallLock = 12; }
}
function killPlayer() {
  if (state !== 'play') return;
  state = 'dying'; dyingT = 85; player.dead = true; player.vy = -11; player.vx = 0; run.deaths++; sfx.die();
}
function respawnPlayer() {
  const keysHeld = player.keys;
  player = newPlayer(respawn.x, respawn.y); player.keys = keysHeld; player.inv = 90;
  state = 'play'; snapCamera();
  if (boss && boss.alive && level.arena && level.arena.active) resetBoss();
  persist();
}
function snapCamera() {
  camX = clamp(player.x - W * .45, 0, level.cols * T - W);
  camY = clamp(player.y - H * .56, 0, camMaxY());
}
function inDeepZone() {
  const c = (player.x + 13) / T, r = (player.y + 21) / T;
  for (const s of level.secrets) if (c >= s.c0 - 1 && c <= s.c1 + 2 && r >= s.r0 - 1 && r <= s.r1 + 2) return true;
  return false;
}
function camMaxY() {
  const full = level.rows * T - H;
  return inDeepZone() ? full : Math.min(full, (level.G + 2.6) * T - H);
}

function updatePlayer() {
  const p = player, up = save.up;
  if (p.plat) { p.x += p.plat.dx; p.y += p.plat.dy; }
  let cx = p.x + p.w / 2;
  const midCh = tileAt(Math.floor(cx / T), Math.floor((p.y + p.h * .5) / T));
  const wasWater = p.inWater; p.inWater = isWater(midCh);
  if (p.inWater !== wasWater) { splash(cx, p.inWater ? p.y + p.h * .5 : p.y + p.h); if (p.inWater) { p.vy *= .35; p.pound = 0; p.dashT = 0; } }
  let move = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (p.wallLock > 0) { p.wallLock--; move = 0; }
  const onLadder = ladderAt(p);
  if (p.dashCD > 0) p.dashCD--; if (p.shootCD > 0) p.shootCD--; if (p.dropT > 0) p.dropT--; if (p.inv > 0) p.inv--;
  if (p.star > 0) { p.star--; if (frame % 3 === 0) sparkle(p.x + Math.random() * p.w, p.y + Math.random() * p.h, 1); }
  p.coyote = p.onGround ? 7 : p.coyote - 1;
  p.buffer = pressed.jump ? 8 : p.buffer - 1;
  if (p.onGround) { p.jumpsLeft = 1; p.airDashed = false; }
  if (p.wallT > 0) p.wallT--;

  // dash
  if (pressed.dash && up.dash && p.dashCD <= 0 && !p.airDashed && !p.inWater && p.pound === 0) {
    p.dashT = 11; p.dashCD = 36; p.airDashed = !p.onGround; if (move) p.dir = move; p.climb = false; sfx.dash();
  }
  let grav = GRAV, maxFall = MAXFALL;
  if (p.dashT > 0) {
    p.dashT--; p.vx = p.dir * 13.5; p.vy = 0; grav = 0;
    if (frame % 2 === 0) part('ghost', p.x, p.y, { life: 14, dir: p.dir });
    if (p.dashT === 0) p.vx = p.dir * SPEED;
  } else if (p.pound === 1) {
    p.vx = 0; p.vy = 0; grav = 0; if (--p.poundT <= 0) p.pound = 2;
  } else if (p.pound === 2) {
    p.vx = 0; p.vy = 18; grav = 0; maxFall = 18;
  } else if (p.climb) {
    if (!onLadder) p.climb = false;
    else {
      p.vx = move * 2.2; p.vy = ((keys.down ? 1 : 0) - (keys.up ? 1 : 0)) * 3.4; grav = 0; if (move) p.dir = move;
      p.anim += Math.abs(p.vy) * .05 + Math.abs(p.vx) * .03;
      if (p.buffer > 0) { p.climb = false; p.vy = -JUMPV * .85; p.holdJump = true; p.buffer = 0; sfx.jump(); grav = GRAV_HOLD; }
    }
  }
  if (!p.climb && p.dashT <= 0 && p.pound === 0) {
    const ice = p.onGround && p.groundCh === 'I';
    const acc = p.inWater ? .35 : ice ? .13 : p.onGround ? ACC : ACC * .8;
    const max = p.inWater ? 3.4 : SPEED;
    if (move) {
      if (Math.abs(p.vx) > max && Math.sign(p.vx) === move) p.vx = Math.sign(p.vx) * Math.max(max, Math.abs(p.vx) - .5);
      else p.vx = clamp(p.vx + move * acc, -max, max);
      p.dir = move;
      if (p.onGround && !ice && Math.sign(p.vx) !== move && Math.abs(p.vx) > 2 && frame % 4 === 0) dust(cx, p.y + p.h, 1);
    } else { p.vx *= ice ? .985 : p.onGround ? FRIC : p.inWater ? .9 : .94; if (Math.abs(p.vx) < .1) p.vx = 0; }

    if (onLadder && (keys.up || (keys.down && !p.onGround))) { p.climb = true; p.vx = 0; p.vy = 0; p.jumpsLeft = 1; p.airDashed = false; grav = 0; }
    else if (p.buffer > 0) {
      if (p.inWater) {
        const above = tileAt(Math.floor(cx / T), Math.floor((p.y - 4) / T));
        p.vy = isWater(above) ? -6.6 : -11.5; p.buffer = 0;
        part('bubble', cx, p.y + 10, { vy: -1, life: 40, size: 3 });
      } else if (p.coyote > 0) {
        const below = tileAt(Math.floor(cx / T), Math.floor((p.y + p.h + 2) / T));
        if (keys.down && (below === '-' || below === 'k' || p.plat)) { p.dropT = 12; p.plat = null; }
        else { p.vy = -JUMPV; p.holdJump = true; p.plat = null; sfx.jump(); dust(cx, p.y + p.h); p.squash = -.25; }
        p.coyote = 0; p.buffer = 0;
      } else if (p.wallT > 0) {
        p.vy = -13.4; p.vx = -p.wallDir * 7.2; p.dir = -p.wallDir; p.wallLock = 9; p.wallT = 0; p.holdJump = true; p.buffer = 0; p.jumpsLeft = 1;
        sfx.wall(); dust(p.wallDir > 0 ? p.x + p.w : p.x, p.y + p.h * .6, 4);
      } else if (up.dj && p.jumpsLeft > 0) {
        p.vy = -13; p.holdJump = true; p.jumpsLeft--; p.buffer = 0; sfx.djump(); ring(cx, p.y + p.h, 'rgba(160,240,255,', 36); p.squash = -.25;
      }
    }
    if (!keys.jump && p.springT <= 0) p.holdJump = false;
    if (p.springT > 0) p.springT--;
    if (pressed.down && !p.onGround && !p.inWater && !onLadder && p.coyote <= 0 && !p.climb) { p.pound = 1; p.poundT = 8; p.vx = 0; p.vy = 0; grav = 0; sfx.djump(); }
    if (p.inWater) { grav = .2; maxFall = 2.8; }
    else if (p.holdJump && p.vy < 0) grav = GRAV_HOLD;
    if (p.climb) grav = 0;
  }
  p.vy = Math.min(p.vy + grav, maxFall);
  p.gliding = !!(up.glide && keys.jump && p.vy > 1.7 && !p.onGround && !p.inWater && p.pound === 0 && !p.climb && p.dashT <= 0);
  if (p.gliding) p.vy = 1.7;

  // shoot
  if (pressed.act && (p.ember || up.fire) && p.shootCD <= 0 && shots.filter(s => !s.hostile).length < (up.fire ? 3 : 2)) {
    shots.push({ kind: 'fire', x: p.x + (p.dir > 0 ? p.w : -14), y: p.y + 14, w: 14, h: 14, vx: p.dir * 9, vy: 1, life: 130, onGround: false });
    p.shootCD = 14; sfx.fire();
  }

  const wasGround = p.onGround, prevBottom = p.y + p.h, prevVy = p.vy, wasDash = p.dashT > 0;
  const hitX = moveBox(p, { pl: true, head: hitBlock });
  p.plat = landOnPlats(p, prevBottom);
  cx = p.x + p.w / 2;

  // dash into cracked wall
  if (wasDash && hitX) {
    let broke = false;
    for (let r = Math.floor(p.y / T); r <= Math.floor((p.y + p.h - 1) / T); r++) if (tileAt(p.hitC, r) === 'c') { breakTile(p.hitC, r); broke = true; }
    if (!broke) p.dashT = 0;
  }
  // wall slide
  p.sliding = false;
  if (hitX && !p.onGround && move === hitX && !p.inWater && p.pound === 0 && !p.climb && p.hitC >= 0 && p.hitC < level.cols) {
    p.wallT = 7; p.wallDir = hitX;
    if (p.vy > 0) { p.sliding = true; p.vy = Math.min(p.vy, 2.4); if (frame % 5 === 0) dust(hitX > 0 ? p.x + p.w : p.x, p.y + p.h, 1); }
  }
  // springs
  for (const s of level.springs) {
    if (p.vy >= 0 && rectHit(p, s) && prevBottom <= s.y + 14) {
      p.y = s.y - p.h; p.vy = -20.5; p.holdJump = true; p.springT = 40; p.onGround = false; p.pound = 0; p.jumpsLeft = 1; p.airDashed = false; s.t = 14; sfx.spring();
    }
  }
  // landing
  if (p.onGround && !wasGround) {
    if (p.pound === 2) poundLand();
    else if (prevVy > 7) { dust(p.x + 4, p.y + p.h); dust(p.x + p.w - 4, p.y + p.h); sfx.land(); p.squash = .3; }
  }
  if (p.onGround && p.pound !== 2) p.pound = 0;
  const footR = Math.floor((p.y + p.h + 2) / T);
  p.groundCh = p.onGround && !p.plat ? tileAt(Math.floor(cx / T), footR) : ' ';
  if (p.onGround && !p.plat && frame % 4 === 0 && '#SI=?Mu'.indexOf(p.groundCh) >= 0 && isSolid(Math.floor(p.x / T), footR) && isSolid(Math.floor((p.x + p.w) / T), footR)) { p.safeX = p.x; p.safeY = p.y; }
  if (p.onGround) for (let c = Math.floor(p.x / T); c <= Math.floor((p.x + p.w - .01) / T); c++) if (tileAt(c, footR) === 'X' && !crumbles.has(c + ',' + footR)) crumbles.set(c + ',' + footR, { t: 0 });

  p.anim += p.onGround ? Math.abs(p.vx) * .05 : 0;
  p.squash *= .82;
  if (p.blink > 0) p.blink--; else if (Math.random() < .006) p.blink = 8;

  // tiles under the body
  const c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + p.w - .01) / T), r0 = Math.floor(p.y / T), r1 = Math.floor((p.y + p.h - .01) / T);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const t = tileAt(c, r);
    if (t === 'o' || t === 'w') { setTileQuiet(c, r, t === 'w' ? '~' : ' '); addCoins(1); sparkle(c * T + 24, r * T + 24, 4); }
    else if (t === '^' && p.y + p.h > r * T + 18 && p.x + p.w > c * T + 8 && p.x < c * T + T - 8) { if (p.inv <= 0 && p.star <= 0) { hurtPlayer(); if (state === 'play') p.vy = -9; } }
    else if (t === 'L' && p.y + p.h > r * T + 10) { for (let i = 0; i < 12; i++) part('spark', cx, p.y + p.h, { vx: (Math.random() - .5) * 6, vy: -Math.random() * 8, g: .3, life: 30, color: '#ffb040', size: 4 }); hurtPlayer(true); return; }
  }
  if (up.magnet) {
    const mc = Math.floor(cx / T), mr = Math.floor((p.y + 21) / T);
    for (let r = mr - 3; r <= mr + 3; r++) for (let c = mc - 3; c <= mc + 3; c++) {
      const t = tileAt(c, r);
      if ((t === 'o' || t === 'w') && c >= 0 && c < level.cols && r >= 0 && r < level.rows) { setTileQuiet(c, r, t === 'w' ? '~' : ' '); flyCoins.push({ x: c * T + 24, y: r * T + 24, v: 2 }); }
    }
  }
  updateInteractions();
  if (p.y > level.rows * T + 40) hurtPlayer(true);
}
function setTileQuiet(c, r, ch) { level.grid[r][c] = ch; }

function poundLand() {
  const p = player, cx = p.x + p.w / 2, r = Math.floor((p.y + p.h + 2) / T);
  shake = 11; sfx.pound(); ring(cx, p.y + p.h, 'rgba(255,230,160,', 90); dust(cx - 20, p.y + p.h, 4); dust(cx + 20, p.y + p.h, 4);
  let broke = false;
  for (let c = Math.floor(p.x / T); c <= Math.floor((p.x + p.w - .01) / T); c++) { const t = tileAt(c, r); if (t === 'c' || t === '=') { breakTile(c, r); broke = true; } }
  for (const e of enemies) if (e.alive && e.active && e.type !== 'icicle' && e.type !== 'fish' && Math.abs(e.x + e.w / 2 - cx) < 100 && Math.abs(e.y + e.h - (p.y + p.h)) < 60) killEnemy(e, true);
  if (boss && boss.alive && boss.state === 'stun' && Math.abs(boss.x + boss.w / 2 - cx) < 120) bossDamage(2);
  if (broke) { p.onGround = false; p.pound = 2; } else { p.pound = 0; p.vy = -5; p.squash = .4; }
}

function updateInteractions() {
  const p = player, cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  for (const g of level.gems) if (!g.got && rectHit(p, g)) { g.got = true; run.gems[g.idx] = true; sfx.gem(); sparkle(g.x + 16, g.y + 18, 20, '#9fe8ff'); ring(g.x + 16, g.y + 18, 'rgba(150,230,255,', 80); banner('💎 אבן חן ' + run.gems.filter(Boolean).length + '/3'); }
  for (const k of level.keys) if (!k.got && rectHit(p, k)) { k.got = true; p.keys++; sfx.key(); sparkle(k.x + 14, k.y + 16, 12); banner('🗝️ מצאת מפתח!'); }
  for (const ch of level.chests) if (!ch.open && rectHit(p, ch)) {
    ch.open = true; sfx.power(); addCoins(ch.n, ch.x + 24, ch.y - 10, true);
    for (let i = 0; i < 14; i++) part('coinpop', ch.x + 24, ch.y, { vx: (Math.random() - .5) * 7, vy: -6 - Math.random() * 7, g: .5, life: 40 });
  }
  activeSign = null;
  for (const s of level.signs) if (rectHit(p, s)) activeSign = s;
  for (const cp of level.checkpoints) if (!cp.taken && Math.abs(cx - (cp.x + 24)) < 40 && Math.abs(p.y + p.h - cp.y) < 80) {
    cp.taken = true; respawn = { x: cp.x + 11, y: cp.y }; sfx.check(); sparkle(cp.x + 24, cp.y - 60, 14, '#7df9ff'); banner('🚩 נקודת שמירה');
    if (p.hp < p.maxHp) { p.hp++; popup(cx, p.y - 10, '+❤', '#ff6a8a'); }
  }
  if (pressed.up && p.onGround && !warp) for (const d of level.doors) if (rectHit(p, d)) {
    if (d.locked) {
      if (p.keys > 0) { p.keys--; d.locked = false; sfx.key(); banner('🔓 הדלת נפתחה!'); }
      else { sfx.locked(); banner('🔒 נעול — דרוש מפתח'); break; }
    }
    const to = level.doors.find(o => o.id === d.to);
    if (to) { warp = { t: 0, to }; sfx.door(); }
    break;
  }
  for (const s of level.saws) { const dx = cx - s.x, dy = cy - s.y; if (dx * dx + dy * dy < (s.r + 12) * (s.r + 12)) hurtPlayer(); }
  for (const s of level.secrets) {
    const c = cx / T, r = cy / T;
    if (!s.found && c >= s.c0 && c <= s.c1 + 1 && r >= s.r0 && r <= s.r1 + 1) { s.found = true; run.secrets++; sfx.secret(); banner('🔍 גילית מעבר סודי!'); }
  }
  for (const g of level.goals) if (g.open !== false && Math.abs(cx - (g.x + g.w / 2)) < 30 && p.y + p.h > g.y + 30 && p.y < g.y + g.h) { beginClear(g); return; }
  if (level.arena && !level.arena.active && !level.arena.done && p.x > (level.arena.a + 3) * T) startBoss();
}

// ── ENEMIES ─────────────────────────────────────────────────────
const ESIZE = { blob: [34, 30], beetle: [38, 28], bat: [36, 24], frog: [34, 28], plant: [36, 46], fish: [36, 22], wisp: [32, 34], charger: [46, 36], icicle: [22, 42] };
const STOMPABLE = { blob: 1, bat: 1, frog: 1, charger: 1 };
function makeEnemy(type, c, r) {
  const s = ESIZE[type];
  const e = { type, w: s[0], h: s[1], vx: 0, vy: 0, alive: true, dead: 0, flat: 0, active: false, onGround: false, t: hash2(c * 7, r * 13) * 10, dir: -1, st: 0, st2: 0 };
  e.x = c * T + (T - e.w) / 2; e.y = (r + 1) * T - e.h;
  if (type === 'blob') e.vx = -1.1; else if (type === 'beetle') e.vx = -.9; else if (type === 'charger') e.vx = -.8;
  else if (type === 'bat') { e.vx = -1.5; e.baseY = e.y; e.homeX = e.x; }
  else if (type === 'fish') { e.vx = -1.3; e.baseY = e.y; }
  else if (type === 'wisp') { e.homeX = e.x; e.homeY = e.y; }
  else if (type === 'icicle') { e.y = r * T; }
  return e;
}
function killEnemy(e, flip) {
  if (!e.alive || e.type === 'icicle') return;
  e.alive = false; run.kills++;
  if (flip) { e.dead = 1; e.vy = -9; e.vx = (e.x < player.x ? -2.5 : 2.5); } else e.flat = 26;
  addCoins(1, undefined, undefined, true); popup(e.x + e.w / 2, e.y, '+1', '#ffd23f');
  sparkle(e.x + e.w / 2, e.y + e.h / 2, 5, '#fff');
}
function ledgeAhead(e) {
  const d = Math.sign(e.vx) || e.dir;
  return !isSolid(Math.floor((d > 0 ? e.x + e.w + 3 : e.x - 3) / T), Math.floor((e.y + e.h + 4) / T));
}
function updateEnemies() {
  const p = player, pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
  for (const e of enemies) {
    if (!e.active) { if (e.x < camX + W + 140 && e.x > camX - 240 && e.y > camY - 300 && e.y < camY + H + 300) e.active = true; else continue; }
    e.t += .1;
    if (e.flat > 0) { e.flat--; continue; }
    if (e.dead) { e.vy += .6; e.x += e.vx; e.y += e.vy; e.dead++; continue; }
    if (!e.alive) continue;
    const ecx = e.x + e.w / 2, dx = pcx - ecx, dy = pcy - (e.y + e.h / 2);
    switch (e.type) {
      case 'blob': case 'beetle': {
        e.vy = Math.min(e.vy + GRAV, MAXFALL); const pv = e.vx;
        if (moveBox(e)) e.vx = -pv; else if (e.type === 'beetle' && e.onGround && ledgeAhead(e)) e.vx = -e.vx;
        e.dir = Math.sign(e.vx) || e.dir; break;
      }
      case 'charger': {
        e.vy = Math.min(e.vy + GRAV, MAXFALL);
        if (e.st === 0) { // patrol
          if (Math.abs(dx) < 400 && Math.abs(dy) < 70 && e.onGround) { e.st = 1; e.st2 = 26; e.dir = Math.sign(dx) || 1; e.vx = 0; }
        } else if (e.st === 1) { e.vx = 0; if (--e.st2 <= 0) { e.st = 2; e.st2 = 90; e.vx = e.dir * 6.2; } }
        else if (e.st === 2) { if (frame % 4 === 0) dust(ecx, e.y + e.h, 1); if (--e.st2 <= 0) { e.st = 3; e.st2 = 40; } }
        else { e.vx *= .85; if (--e.st2 <= 0) { e.st = 0; e.vx = e.dir * .8; } }
        const pv = e.vx;
        if (moveBox(e)) { if (e.st === 2) { e.st = 3; e.st2 = 55; shake = Math.max(shake, 4); sfx.bump(); e.vx = 0; } else e.vx = -pv; }
        else if (e.onGround && ledgeAhead(e)) { if (e.st === 2) { e.st = 3; e.st2 = 30; e.vx = 0; } else e.vx = -e.vx; }
        if (e.st === 0 || e.st === 2) e.dir = Math.sign(e.vx) || e.dir; break;
      }
      case 'bat': {
        e.x += e.vx; e.y = e.baseY + Math.sin(e.t * .8) * 40;
        const c = Math.floor((e.vx > 0 ? e.x + e.w : e.x) / T), r = Math.floor((e.y + e.h / 2) / T);
        if (isSolid(c, r) || Math.abs(e.x - e.homeX) > 5 * T) { e.vx = -e.vx; e.x += e.vx * 2; }
        e.dir = Math.sign(e.vx); break;
      }
      case 'frog': {
        e.vy = Math.min(e.vy + GRAV, MAXFALL);
        if (e.onGround) { e.vx = 0; if (++e.st > 75 && Math.abs(dx) < 520) { e.st = 0; e.dir = Math.sign(dx) || 1; e.vy = -11.5; e.vx = e.dir * 3.2; } }
        const pv = e.vx; if (moveBox(e)) e.vx = -pv; break;
      }
      case 'plant': {
        e.vy = Math.min(e.vy + GRAV, MAXFALL); moveBox(e); e.dir = Math.sign(dx) || 1;
        if (++e.st > 130 && Math.abs(dx) < 600 && Math.abs(dy) < 240) {
          e.st = 0; e.st2 = 14;
          shots.push({ kind: 'seed', hostile: true, x: ecx - 7 + e.dir * 14, y: e.y + 6, w: 14, h: 14, vx: e.dir * 5.2, vy: clamp(dy / 60, -3, 2) - 1, g: .05, life: 170 });
          sfx.kick();
        }
        if (e.st2 > 0) e.st2--; break;
      }
      case 'fish': {
        e.x += e.vx; e.y = e.baseY + Math.sin(e.t * 1.2) * 8;
        const c = Math.floor((e.vx > 0 ? e.x + e.w + 4 : e.x - 4) / T), r = Math.floor((e.y + e.h / 2) / T);
        if (!isWater(tileAt(c, r))) e.vx = -e.vx; e.dir = Math.sign(e.vx); break;
      }
      case 'wisp': {
        const d = Math.hypot(dx, dy) || 1;
        let tx = e.homeX, ty = e.homeY, sp = .7;
        if (d < 520 && p.star <= 0) { tx = pcx - e.w / 2; ty = pcy - e.h / 2; sp = 1.2; }
        const ddx = tx - e.x, ddy = ty - e.y, dd = Math.hypot(ddx, ddy);
        if (dd > 2) { e.x += ddx / dd * sp; e.y += ddy / dd * sp + Math.sin(e.t * 2) * .5; }
        e.dir = Math.sign(dx) || 1;
        if (frame % 6 === 0) part('spark', ecx + (Math.random() - .5) * 14, e.y + e.h, { vy: .6, life: 24, color: '#8ff', size: 3 });
        break;
      }
      case 'icicle': {
        if (e.st === 0) { if (Math.abs(dx) < 50 && dy > 0 && dy < 440) { e.st = 1; e.st2 = 22; } }
        else if (e.st === 1) { if (--e.st2 <= 0) e.st = 2; }
        else { e.vy = Math.min(e.vy + .7, 16); e.y += e.vy; if (isSolid(Math.floor(ecx / T), Math.floor((e.y + e.h) / T)) || e.y > level.rows * T) { e.alive = false; debris(ecx, e.y + e.h, '#dff', 6); sfx.brk(); } }
        break;
      }
    }
    if (e.y > level.rows * T + 80) e.alive = false;
    // vs player
    if (state === 'play' && e.alive && rectHit(p, e)) {
      if (p.star > 0) { if (e.type !== 'icicle') { killEnemy(e, true); sfx.kick(); } continue; }
      if (p.dashT > 0) { if (STOMPABLE[e.type] || e.type === 'wisp') { killEnemy(e, true); sfx.kick(); shake = 4; } continue; }
      const falling = p.vy > 0 && (p.y + p.h - p.vy) <= e.y + 12;
      if (falling && (STOMPABLE[e.type] || (p.pound === 2 && e.type !== 'icicle' && e.type !== 'wisp'))) {
        killEnemy(e, e.type === 'bat' || p.pound === 2);
        if (p.pound !== 2) { p.vy = keys.jump ? -13.5 : -8.5; p.holdJump = keys.jump; p.jumpsLeft = 1; p.airDashed = false; }
        sfx.stomp(); shake = Math.max(shake, 3);
      } else hurtPlayer();
    }
  }
  enemies = enemies.filter(e => !(e.dead > 90) && !(!e.alive && !e.dead && e.flat <= 0));
}

// ── BOSS ────────────────────────────────────────────────────────
function makeBoss() {
  const b = level.boss;
  boss = { x: b.c * T, y: level.G * T - 104, w: 92, h: 104, vx: 0, vy: 0, hp: 6, maxHp: 6, state: 'sleep', t: 0, dir: -1, inv: 0, onGround: true, alive: true, dieT: 0 };
}
function startBoss() {
  const a = level.arena, G = level.G; a.active = true;
  for (let r = G - 10; r < G; r++) { setTile(a.a - 2, r, 'S'); setTile(a.a - 1, r, 'S'); }
  boss.state = 'walk'; boss.t = 0; setSong('boss'); sfx.roar(); shake = 12; banner('🔥 שומר הגחלים 🔥');
}
function resetBoss() {
  const a = level.arena, G = level.G; a.active = false;
  for (let r = G - 10; r < G; r++) { setTile(a.a - 2, r, ' '); setTile(a.a - 1, r, ' '); }
  shots = shots.filter(s => !s.hostile);
  makeBoss(); setSong(level.theme.song);
}
function bossDamage(n) {
  const b = boss; if (!b.alive || b.inv > 0) return;
  b.hp -= n; b.inv = 45; sfx.bossHit(); shake = 10; flash = 4;
  sparkle(b.x + b.w / 2, b.y + 20, 16, '#ffb040');
  if (b.hp <= 0) {
    b.alive = false; b.dieT = 110; sfx.boom(); shots = shots.filter(s => !s.hostile);
    const a = level.arena, G = level.G; a.done = true; a.active = false;
    for (let r = G - 10; r < G; r++) for (const c of [a.a - 2, a.a - 1, a.b + 1, a.b + 2]) if (tileAt(c, r) === 'S') { setTile(c, r, ' '); debris(c * T + 24, r * T + 24, level.theme.stone, 2); }
    addCoins(80, b.x + b.w / 2, b.y, true); setSong(level.theme.song); banner('🏆 ניצחת את שומר הגחלים!'); save.beaten = true;
  } else { b.state = 'throw'; b.t = 0; }
}
function updateBoss() {
  const b = boss; if (!b) return;
  if (!b.alive) {
    if (b.dieT > 0) { b.dieT--; if (frame % 4 === 0) { debris(b.x + Math.random() * b.w, b.y + Math.random() * b.h, '#ff8a3d', 3); sparkle(b.x + Math.random() * b.w, b.y + Math.random() * b.h, 6, '#ffd23f'); shake = Math.max(shake, 5); }
      if (frame % 6 === 0) part('coinpop', b.x + Math.random() * b.w, b.y + 30, { vx: (Math.random() - .5) * 8, vy: -8 - Math.random() * 6, g: .5, life: 44 }); }
    return;
  }
  if (b.state === 'sleep') return;
  const p = player, bcx = b.x + b.w / 2, pcx = p.x + p.w / 2, rage = b.hp <= 3;
  b.t++; if (b.inv > 0) b.inv--;
  b.vy = Math.min(b.vy + GRAV, MAXFALL);
  if (b.state === 'walk') { b.dir = Math.sign(pcx - bcx) || 1; b.vx = b.dir * (rage ? 2.4 : 1.6); if (b.t > (rage ? 80 : 115)) { b.state = 'crouch'; b.t = 0; } }
  else if (b.state === 'crouch') { b.vx = 0; if (b.t > 26) { b.state = 'jump'; b.t = 0; b.vy = -17; b.vx = clamp((pcx - bcx) / 40, -6.5, 6.5); } }
  else if (b.state === 'stun') { b.vx = 0; if (b.t > (rage ? 85 : 120)) { b.state = 'throw'; b.t = 0; } }
  else if (b.state === 'throw') {
    b.vx = 0; b.dir = Math.sign(pcx - bcx) || 1;
    if (b.t === 18 || b.t === 40 || b.t === 62 || (rage && (b.t === 29 || b.t === 51))) {
      shots.push({ kind: 'rock', hostile: true, x: bcx - 12, y: b.y + 10, w: 24, h: 24, vx: clamp((pcx - bcx) / 55, -9, 9) + (Math.random() - .5), vy: -11 - Math.random() * 2, g: .38, life: 200 });
      sfx.kick();
    }
    if (b.t > 84) { b.state = 'walk'; b.t = 0; }
  }
  const pvx = b.vx, wasGround = b.onGround;
  moveBox(b);
  if (b.state === 'jump') {
    b.vx = pvx;
    if (b.onGround && b.t > 6) {
      b.state = 'stun'; b.t = 0; b.vx = 0; shake = 15; sfx.pound(); dust(bcx - 40, b.y + b.h, 6); dust(bcx + 40, b.y + b.h, 6);
      for (const d of [-1, 1]) shots.push({ kind: 'wave', hostile: true, x: bcx + d * 40 - 15, y: b.y + b.h - 30, w: 30, h: 30, vx: d * (rage ? 6.5 : 5), vy: 0, g: 0, life: 75 });
    }
  }
  if (state === 'play' && rectHit(p, b)) {
    if (b.state === 'stun') {
      const falling = p.vy > 0 && (p.y + p.h - p.vy) <= b.y + 30;
      if (falling) { bossDamage(p.pound === 2 ? 2 : 1); p.vy = -13; p.pound = 0; p.holdJump = keys.jump; }
      else if (p.dashT > 0) bossDamage(1);
    } else if (p.star <= 0) { hurtPlayer(); if (state === 'play' && p.inv === 110) { p.vx = Math.sign(pcx - bcx || 1) * 9; p.vy = -9; p.wallLock = 14; } }
  }
}

// ── ITEMS, SHOTS, PLATFORMS ─────────────────────────────────────
function updateItems() {
  const p = player;
  for (const it of items) {
    it.t++;
    if (it.rise > 0) { it.y -= 1; it.rise--; if (it.rise === 0) { if (it.kind === 'heart') it.vx = 1.6; if (it.kind === 'star') { it.vx = 2.4; it.vy = -7; } } continue; }
    it.vy = Math.min(it.vy + (it.kind === 'star' ? .4 : GRAV), MAXFALL);
    const pv = it.vx; if (moveBox(it)) it.vx = -pv;
    if (it.kind === 'star' && it.onGround) it.vy = -8.5;
    if (rectHit(p, it) && state === 'play') {
      it.gone = true; sparkle(it.x + 15, it.y + 15, 10);
      if (it.kind === 'heart') { if (p.hp < p.maxHp) p.hp++; else addCoins(5, it.x, it.y, true); sfx.heal(); popup(it.x + 15, it.y, '+❤', '#ff6a8a'); }
      else if (it.kind === 'ember') { p.ember = true; sfx.power(); banner('🔥 כוח האש! לחץ X'); }
      else if (it.kind === 'star') { p.star = 600; sfx.power(); banner('⭐ בלתי מנוצח!'); }
      else if (it.kind === 'shield') { p.shield = true; sfx.power(); banner('🛡️ מגן בועה'); }
    }
    if (it.y > level.rows * T + 60) it.gone = true;
  }
  items = items.filter(i => !i.gone);
  for (const f of flyCoins) {
    const dx = p.x + 13 - f.x, dy = p.y + 21 - f.y, d = Math.hypot(dx, dy) || 1;
    f.v = Math.min(f.v + .6, 14); f.x += dx / d * f.v; f.y += dy / d * f.v;
    if (d < 22) { f.gone = true; addCoins(1); }
  }
  flyCoins = flyCoins.filter(f => !f.gone);
}
function updateShots() {
  const p = player;
  for (const s of shots) {
    s.life--;
    if (s.kind === 'fire') {
      s.vy = Math.min(s.vy + .7, 11); const pv = s.vx;
      if (moveBox(s)) { for (let r = Math.floor(s.y / T); r <= Math.floor((s.y + s.h) / T); r++) if (tileAt(s.hitC, r) === 'c') breakTile(s.hitC, r); s.life = 0; sparkle(s.x + 7, s.y + 7, 5, '#ffb040'); }
      s.vx = pv; if (s.onGround) s.vy = -6.5;
      if (isWater(tileAt(Math.floor((s.x + 7) / T), Math.floor((s.y + 7) / T)))) { s.life = 0; part('bubble', s.x, s.y, { vy: -1, life: 30, size: 4 }); }
      if (frame % 2 === 0) part('spark', s.x + 7, s.y + 7, { life: 12, color: '#ff9a3d', size: 4 });
      for (const e of enemies) if (e.alive && e.active && e.type !== 'icicle' && e.type !== 'fish' && rectHit(s, e)) { killEnemy(e, true); sfx.kick(); s.life = 0; break; }
      if (boss && boss.alive && boss.state !== 'sleep' && rectHit(s, boss)) { if (boss.state === 'stun') bossDamage(1); else sfx.bump(); s.life = 0; sparkle(s.x, s.y, 5, '#ffb040'); }
      if (Math.abs(s.x - p.x) > W) s.life = 0;
    } else {
      s.vy += s.g; s.x += s.vx; s.y += s.vy;
      if (s.kind !== 'wave' && isSolid(Math.floor((s.x + s.w / 2) / T), Math.floor((s.y + s.h / 2) / T))) { s.life = 0; debris(s.x + s.w / 2, s.y + s.h / 2, s.kind === 'rock' ? '#8a6a5a' : '#6a9a3a', 3); }
      if (s.kind === 'wave') { if (frame % 2 === 0) dust(s.x + 15, s.y + 30, 1); if (isSolid(Math.floor((s.x + 15) / T), Math.floor((s.y + 10) / T))) s.life = 0; }
      if (state === 'play' && rectHit(p, s)) { hurtPlayer(); if (s.kind !== 'wave') s.life = 0; }
    }
  }
  shots = shots.filter(s => s.life > 0);
}
function updatePlatforms() {
  for (const p of level.plats) {
    const ox = p.x, oy = p.y;
    if (p.fall) {
      if (!p.fs) { if (player.plat === p) { p.fs = 1; p.ft = 0; } }
      else if (p.fs === 1) { if (++p.ft > 26) { p.fs = 2; p.vy = 0; } }
      else if (p.fs === 2) { p.vy = Math.min(p.vy + .5, 14); p.y += p.vy; if (p.y > level.rows * T + 100) { p.fs = 3; p.ft = 0; } }
      else if (++p.ft > 130) { p.fs = 0; p.x = p.ox; p.y = p.oy; }
    } else {
      p.t += p.speed * .022;
      const off = (Math.sin(p.t - Math.PI / 2) * .5 + .5) * p.range;
      if (p.axis === 'x') p.x = p.ox + off; else p.y = p.oy - off;
    }
    p.dx = p.x - ox; p.dy = p.y - oy;
    if (p.fs === 3 || (p.fs === 0 && p.fall && Math.abs(p.dy) > 50)) { p.dx = 0; p.dy = 0; }
  }
  for (const s of level.saws) {
    s.t += s.speed * .022;
    const off = (Math.sin(s.t - Math.PI / 2) * .5 + .5) * s.range;
    if (s.axis === 'x') s.x = s.ox + off; else s.y = s.oy - off;
  }
  for (const s of level.springs) if (s.t > 0) s.t--;
}
function updateParticles() {
  for (const p of particles) { p.life--; p.vy += p.g; p.x += p.vx; p.y += p.vy; if (p.rot !== undefined) p.rot += .25; }
  particles = particles.filter(p => p.life > 0);
  if (particles.length > 500) particles.splice(0, particles.length - 500);
  for (const pp of popups) { pp.life--; pp.y -= 1; }
  popups = popups.filter(p => p.life > 0);
}
function updateCamera() {
  const p = player;
  let tx = p.x + p.w / 2 - W * .46 + p.dir * 70 + p.vx * 6;
  let minX = 0, maxX = level.cols * T - W;
  if (level.arena && level.arena.active) { minX = (level.arena.a - 2) * T; maxX = (level.arena.b + 3) * T - W; }
  camX += (clamp(tx, minX, maxX) - camX) * .1;
  const ty = clamp(p.y + p.h / 2 - H * .56, 0, camMaxY());
  camY += (ty - camY) * (Math.abs(ty - camY) > 200 ? .16 : .09);
}

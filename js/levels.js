'use strict';
// ════════════════════════════════════════════════════════════════
//  THEMES & LEVELS
// ════════════════════════════════════════════════════════════════
const THEMES = {
  meadow: { sky: ['#2f7fe0', '#74bdf5', '#d6f0ff'], orb: { x: .78, y: .2, r: 46, c: '#fff8d8', glow: 'rgba(255,240,170,' }, mnt: ['#a7c6e6', '#7fa6cf'], hills: ['#62b06c', '#3d8c53'],
            soil: '#8a5a35', soilDark: '#5a3820', soilLight: '#a9764b', grass: '#56b846', grassDark: '#2c8529', grassLight: '#a4e572',
            stone: '#9aa3ad', brick: '#c26d3a', water: [60, 150, 230], dark: 0, weather: 'pollen', tree: 'oak', top: 'grass', song: 'meadow' },
  cave:   { sky: ['#090818', '#15112b', '#221942'], mnt: ['#1a1533', '#231c44'], hills: ['#2a2250', '#1c173c'],
            soil: '#4b4165', soilDark: '#2c2540', soilLight: '#655a83', grass: '#5a8f8a', grassDark: '#2c5757', grassLight: '#86e0d2',
            stone: '#6b6a86', brick: '#6f5c9c', water: [40, 170, 190], dark: .7, weather: 'dust', tree: 'crystal', top: 'moss', song: 'cave' },
  sunset: { sky: ['#2a1d5c', '#a8447a', '#ff985a', '#ffd590'], orb: { x: .68, y: .62, r: 90, c: '#fff0b0', glow: 'rgba(255,190,110,' }, mnt: ['#8f5088', '#6c3b77'], hills: ['#5a2f66', '#3e1f4d'],
            soil: '#8f5234', soilDark: '#5a2e1e', soilLight: '#b47045', grass: '#dc9c3a', grassDark: '#a4671e', grassLight: '#ffd472',
            stone: '#a08a80', brick: '#c9603a', water: [230, 140, 120], dark: 0, tint: 'rgba(255,120,60,.08)', weather: 'leaves', tree: 'autumn', top: 'grass', song: 'sunset' },
  snow:   { sky: ['#4f7cc4', '#a3c5ec', '#eaf5ff'], orb: { x: .25, y: .22, r: 38, c: '#ffffff', glow: 'rgba(255,255,255,' }, mnt: ['#d2e0f2', '#a9bfdc'], hills: ['#93adcc', '#7391b6'],
            soil: '#6f7f99', soilDark: '#48556d', soilLight: '#8fa0bb', grass: '#f4f9ff', grassDark: '#b4c9e4', grassLight: '#ffffff',
            stone: '#9fb0c8', brick: '#7f93b8', water: [90, 160, 220], dark: 0, weather: 'snow', tree: 'pine', top: 'snow', song: 'snow' },
  keep:   { sky: ['#0e0507', '#260a0a', '#4c1610'], mnt: ['#260e10', '#381412'], hills: ['#1c0a0c', '#2a0e0e'],
            soil: '#4c4248', soilDark: '#2a2327', soilLight: '#685c62', grass: '#7b6b67', grassDark: '#463a38', grassLight: '#ff9a4d',
            stone: '#6e666c', brick: '#7a3a30', water: [255, 110, 30], dark: .6, weather: 'ember', tree: 'column', top: 'ash', song: 'keep' },
  garden: { sky: ['#0b0a2c', '#281a5c', '#5a2b7c'], orb: { x: .2, y: .2, r: 44, c: '#f4f0ff', glow: 'rgba(200,190,255,' }, stars: true, mnt: ['#2b2060', '#3a2a78'], hills: ['#1f3a5a', '#152c46'],
            soil: '#3b3662', soilDark: '#211e3d', soilLight: '#554e87', grass: '#3fd6b0', grassDark: '#1c8473', grassLight: '#a8ffe4',
            stone: '#7a78a8', brick: '#8a5cc0', water: [120, 90, 230], dark: .32, weather: 'firefly', tree: 'shroom', top: 'grass', song: 'garden' },
};

const LEVELS = [
  // ───────────────────────── 1 ─────────────────────────
  { id: 'meadow', name: 'עמק הלחישות', icon: '🌼', theme: 'meadow', cols: 232, rows: 28, G: 18, css: 'linear-gradient(180deg,#3d8fe8,#a8dcff 55%,#57b947 56%,#2f8a2c)',
    build(L, G) {
      L.ground(0, 63); L.ground(67, 141); L.ground(148, 231);
      L.start(4); L.sign(8, 'ברוך הבא, פיפ!  ← → לזוז · רווח לקפוץ (החזק = גבוה)');
      L.q(13, G - 4); L.row(17, 21, G - 4, '='); L.q(19, G - 4, 'heart'); L.coins(17, 21, G - 5);
      L.e('blob', 24); L.e('blob', 28);
      // secret A: underground burrow under a cracked floor
      L.sign(32, 'בלוק סדוק? קפוץ ולחץ ↓ באוויר — מכת קרקע!');
      L.set(35, G, 'c'); L.set(36, G, 'c'); L.carve(35, 36, G + 1, G + 1);
      L.carve(30, 42, G + 2, G + 5); L.fill(35, 36, G + 3, G + 5, 'S'); L.fill(34, 34, G + 4, G + 5, 'S'); L.secret(30, G + 1, 42, G + 5);
      L.coins(30, 33, G + 5); L.coins(38, 41, G + 5); L.gem(41, G + 3); L.chest(31, G + 5, 30);
      L.pillar(47, 2); L.e('blob', 51); L.pillar(53, 3); L.q(57, G - 4); L.q(58, G - 4, 'ember');
      L.sign(56, 'חיפושית קוצנית — לא קופצים עליה! דלג מעליה או שרוף אותה (X)');
      L.e('beetle', 61); L.coins(64, 66, G - 3);
      L.e('blob', 70); L.stairs(73, 3, 1); L.ground(76, 95, G - 4);
      L.q(80, G - 8); L.row(82, 85, G - 8, '='); L.q(84, G - 8); L.e('blob', 83, G - 5); L.e('frog', 90, G - 5);
      // secret B: fake wall inside the hill
      L.carve(84, 95, G - 2, G - 1); L.secret(84, G - 2, 95, G - 1); L.chest(85, G - 1, 40); L.coins(87, 93, G - 1); L.hint(95, G - 1); L.coins(96, 97, G - 1);
      L.checkpoint(99); L.sign(102, 'אפשר לשחות! רווח = לשחות למעלה');
      L.carve(105, 113, G, G + 2); L.water(105, 113, G, G + 2); L.coins(106, 112, G + 2);
      // secret C: vine to the clouds
      L.q(120, G - 3, 'vine'); L.row(112, 119, G - 13, 'k'); L.row(121, 140, G - 13, 'k');
      L.coins(113, 118, G - 14); L.coins(122, 138, G - 14); L.coins(124, 136, G - 15); L.gem(130, G - 16); L.secret(112, G - 17, 140, G - 14, { cover: false });
      L.e('blob', 124); L.e('blob', 127); L.e('frog', 134); L.row(128, 131, G - 4, '='); L.q(130, G - 4);
      L.sign(138, 'גשר מתפורר — אל תעצור!'); L.row(142, 147, G, 'X');
      L.checkpoint(151); L.sign(153, 'קפוץ אל קיר, היצמד אליו — וקפוץ שוב. קפיצת קיר!');
      L.pillar(156, 3); L.pillar(161, 5); L.coins(158, 160, G - 6); L.gem(161.5, G - 10);
      L.e('blob', 166); L.q(170, G - 4); L.q(171, G - 4, 'star'); L.e('beetle', 173);
      L.pillar(178, 2); L.e('plant', 178.5, G - 3); L.e('blob', 184); L.e('blob', 186); L.e('frog', 192);
      L.stairs(198, 4, 1); L.ground(202, 231, G - 4); L.coins(204, 212, G - 6);
      L.goal(218, G - 5);
    } },
  // ───────────────────────── 2 ─────────────────────────
  { id: 'cave', name: 'מערות הבדולח', icon: '💎', theme: 'cave', cols: 240, rows: 28, G: 18, css: 'linear-gradient(180deg,#0b0a1a,#2b2352 60%,#4a4063)',
    build(L, G) {
      L.fill(0, 239, 0, G - 9, '#');
      L.ground(0, 34); L.ground(40, 48); L.ground(49, 62, G + 4); L.ground(63, 84); L.ground(92, 133); L.ground(140, 180); L.ground(186, 239);
      L.start(4); L.torch(7, G - 4); L.sign(10, 'חשוך כאן… לפידים ובדולחים מאירים את הדרך');
      L.q(13, G - 4); L.q(15, G - 4, 'ember'); L.e('blob', 19); L.e('bat', 25, G - 6); L.pillar(29, 2); L.torch(32, G - 4);
      L.plat(35, G, 2, 'x', 3, 1); L.coins(36, 38, G - 3);
      L.e('beetle', 44); L.torch(46, G - 4);
      // pool with a hidden underwater tunnel → key
      L.water(49, 62, G, G + 3); L.coins(51, 60, G + 3); L.e('fish', 54, G + 1); L.e('fish', 59, G + 2);
      L.carve(63, 72, G + 2, G + 3); L.water(63, 72, G + 2, G + 3); L.secret(63, G + 2, 72, G + 3); L.key(71, G + 3); L.hint(63, G + 3);
      L.checkpoint(66); L.torch(69, G - 4); L.e('wisp', 75, G - 4); L.e('blob', 79); L.q(81, G - 4, 'heart');
      L.plat(85, G, 2, 'x', 4, 1.2); L.coins(86, 90, G - 3);
      L.torch(94, G - 4); L.e('beetle', 98); L.e('bat', 103, G - 6); L.row(104, 109, G - 4, '='); L.q(106, G - 4); L.q(107, G - 4, 'shield');
      L.spikes(112, 113, G - 1); L.e('blob', 116);
      L.sign(118, 'דלת נעולה. איפה המפתח? אולי מתחת למים…'); L.door('a', 121, G - 1, 'b', { locked: true });
      // locked room high in the rock: secret exit!
      L.carve(100, 114, 4, 8); L.door('b', 102, 8, 'a'); L.gem(108, 6); L.goal(112, 8, true); L.torch(105, 6); L.torch(110, 5); L.secret(100, 4, 114, 8, { cover: false, wall: true });
      L.e('wisp', 126, G - 5); L.pillar(129, 3); L.torch(131, G - 6);
      L.fplat(135, G, 2); L.fplat(137.5, G, 2);
      L.checkpoint(142); L.q(146, G - 4, 'ember'); L.sign(148, 'קיר סדוק נשבר מכדור אש (X) או מדאש (C)');
      L.pillar(152, 3, 4); L.carve(153, 154, G - 2, G - 1); L.set(152, G - 2, 'c'); L.set(152, G - 1, 'c'); L.gem(153.6, G - 2);
      L.e('beetle', 160); L.e('bat', 165, G - 6); L.torch(168, G - 4); L.e('blob', 171);
      // shaft in the ceiling: needs double jump + wall jumps
      L.carve(174, 176, G - 15, G - 9); L.gem(175, G - 14); L.coins(175, 175, G - 12); L.hint(175, G - 9);
      L.plat(181, G, 2, 'x', 3, 1.3);
      L.e('wisp', 192, G - 4); L.e('beetle', 196); L.torch(198, G - 4); L.row(200, 204, G - 4, '='); L.q(202, G - 4);
      L.e('blob', 208); L.e('blob', 210); L.pillar(214, 2); L.e('bat', 219, G - 6);
      L.torch(224, G - 4); L.goal(228); L.torch(232, G - 4);
    } },
  // ───────────────────────── 3 ─────────────────────────
  { id: 'sunset', name: 'צוקי השקיעה', icon: '🌅', theme: 'sunset', cols: 240, rows: 34, G: 26, css: 'linear-gradient(180deg,#2b1e5e,#b0477a 40%,#ff9a5a 70%,#8f5234)',
    build(L, G) {
      L.ground(0, 30); L.ground(50, 69); L.ground(70, 110, G - 12); L.ground(141, 197); L.ground(204, 239);
      L.start(4); L.q(10, G - 4); L.row(14, 17, G - 4, '='); L.q(16, G - 4, 'shield'); L.e('frog', 20); L.e('blob', 25);
      L.island(33, 35, G - 1); L.island(38, 40, G - 3); L.island(43, 45, G - 2);
      L.coins(33, 35, G - 3); L.coins(38, 40, G - 5); L.coins(43, 45, G - 4); L.e('bat', 41, G - 7);
      L.checkpoint(52); L.sign(54, 'קפיץ! קפוץ עליו כדי לעוף גבוה'); L.spring(56.5); L.coins(55, 58, G - 9); L.coins(55, 58, G - 8);
      L.e('plant', 60);
      L.row(58, 60, G - 3, '-'); L.row(62, 64, G - 6, '-'); L.row(66, 68, G - 9, '-');
      // secret: tunnel into the cliff
      L.carve(70, 81, G - 3, G - 1); L.secret(70, G - 3, 81, G - 1); L.chest(79, G - 1, 50); L.gem(76, G - 2); L.coins(72, 77, G - 1); L.hint(70, G - 1);
      L.checkpoint(73, G - 13); L.e('blob', 78, G - 13); L.e('plant', 84, G - 13);
      L.row(86, 90, G - 16, '='); L.q(88, G - 16, 'heart'); L.e('charger', 95, G - 13); L.e('bat', 100, G - 16); L.e('frog', 105, G - 13);
      L.fplat(112, G - 11, 2); L.fplat(116, G - 9, 2); L.plat(120, G - 7, 2, 'x', 4, 1.2); L.fplat(128, G - 5, 2); L.fplat(132, G - 3, 2); L.fplat(136, G - 1, 2);
      L.island(122, 124, G + 1); L.spring(122.5, G); L.gem(124, G - 1); L.coins(118, 126, G - 9);
      L.checkpoint(143); L.e('beetle', 148); L.e('plant', 153); L.sign(155, 'מסור! חכה לרגע הנכון');
      L.saw(159, G - 1, 'y', 4, 1.4);
      // wall-jump chimney → gem
      L.fill(165, 165, G - 11, G - 4, 'S'); L.fill(169, 169, G - 11, G - 4, 'S'); L.row(166, 168, G - 11, '-'); L.gem(167, G - 13); L.coins(167, 167, G - 9); L.coins(167, 167, G - 7);
      L.e('charger', 176); L.row(180, 184, G - 4, '='); L.q(182, G - 4, 'star'); L.e('bat', 188, G - 6); L.e('blob', 192); L.e('blob', 194);
      L.fplat(198.5, G, 2); L.fplat(201, G, 2);
      L.e('frog', 208); L.stairs(214, 3, 1); L.ground(217, 239, G - 3); L.e('plant', 222, G - 4);
      L.goal(230, G - 4);
    } },
  // ───────────────────────── 4 ─────────────────────────
  { id: 'snow', name: 'פסגות הכפור', icon: '❄️', theme: 'snow', cols: 240, rows: 28, G: 18, css: 'linear-gradient(180deg,#5d86c9,#e9f4ff 60%,#f4f9ff 61%,#6f7f99)',
    build(L, G) {
      L.ground(0, 44); L.ground(49, 100); L.ground(108, 150); L.ground(156, 239);
      L.start(4); L.sign(8, 'קרח חלקלק! קשה לעצור עליו'); L.q(11, G - 4); L.ice(14, 30); L.e('blob', 20);
      L.row(22, 25, G - 4, '='); L.q(24, G - 4, 'ember'); L.e('charger', 29);
      // invisible staircase to the sky
      L.sign(32, 'יש בלוקים בלתי נראים… קפוץ במקומות חשודים'); L.hint(34, G - 4);
      L.hidden(34, G - 4); L.hidden(36, G - 7); L.hidden(34, G - 10); L.row(36, 41, G - 13, 'k'); L.gem(39, G - 14); L.coins(36, 41, G - 15);
      L.secret(34, G - 16, 41, G - 13, { cover: false });
      L.coins(45, 48, G - 3);
      L.row(52, 60, G - 6, 'I'); L.icicle(54, G - 5); L.icicle(57, G - 5); L.icicle(59, G - 5); L.e('blob', 56); L.checkpoint(63);
      L.carve(68, 76, G, G + 2); L.water(68, 76, G, G + 2); L.e('fish', 72, G + 1); L.coins(69, 75, G + 2);
      // ice cavern under cracked floor
      L.set(82, G, 'c'); L.set(83, G, 'c'); L.carve(82, 83, G + 1, G + 1); L.carve(78, 92, G + 2, G + 5); L.fill(82, 83, G + 3, G + 5, 'S'); L.fill(81, 81, G + 4, G + 5, 'S'); L.secret(78, G + 1, 92, G + 5);
      L.gem(90, G + 3); L.chest(79, G + 5, 50); L.coins(85, 89, G + 5); L.e('wisp', 88, G + 3);
      L.ice(86, 99); L.e('charger', 90); L.e('frog', 96);
      L.plat(101, G, 2, 'x', 4, 1.2);
      L.checkpoint(110); L.stairs(114, 3, 1); L.ground(117, 135, G - 3); L.row(120, 132, G - 3, 'I');
      L.e('charger', 127, G - 4); L.e('blob', 132, G - 4); L.row(123, 126, G - 7, '='); L.q(125, G - 7, 'shield');
      L.carve(124, 135, G - 2, G - 1); L.secret(124, G - 2, 135, G - 1); L.chest(125, G - 1, 40); L.coins(127, 133, G - 1); L.hint(135, G - 1);
      L.e('plant', 142); L.e('beetle', 146);
      L.fplat(152, G, 3);
      L.checkpoint(158); L.ice(160, 175); L.row(162, 172, G - 6, 'I'); L.icicle(164, G - 5); L.icicle(166, G - 5); L.icicle(169, G - 5); L.icicle(171, G - 5);
      L.e('charger', 168); L.e('frog', 176);
      L.ground(180, 239, G - 8); L.fill(179, 179, G - 9, G - 1, 'H'); L.sign(177, '↑ לטפס על הסולם');
      L.hidden(186, G - 12); L.gem(186, G - 16); L.hint(186, G - 12);
      L.row(188, 200, G - 8, 'I'); L.e('charger', 192, G - 9); L.e('blob', 198, G - 9); L.e('plant', 204, G - 9); L.q(208, G - 12, 'heart');
      L.goal(226, G - 9);
    } },
  // ───────────────────────── 5 ─────────────────────────
  { id: 'keep', name: 'מבצר הגחלים', icon: '🌋', theme: 'keep', cols: 250, rows: 28, G: 18, css: 'linear-gradient(180deg,#120608,#4a1410 60%,#ff6a1a 61%,#4a4046)',
    build(L, G) {
      L.fill(0, 249, 0, G - 11, '#');
      L.ground(0, 24); L.lava(25, 29); L.ground(30, 58); L.lava(59, 66); L.ground(67, 96); L.lava(97, 105); L.ground(106, 140); L.lava(141, 146); L.ground(147, 180); L.lava(181, 186); L.ground(187, 249);
      L.start(4); L.torch(6, G - 4); L.q(10, G - 4, 'ember'); L.torch(16, G - 4); L.e('charger', 19);
      L.plat(25, G, 2, 'x', 3, 1.2);
      L.e('beetle', 36); L.saw(42, G - 1, 'y', 4, 1.3); L.saw(46, G - 5, 'y', -4, 1.3); L.torch(50, G - 4); L.e('wisp', 53, G - 5); L.q(56, G - 4, 'heart');
      L.row(59, 66, G, 'X');
      L.checkpoint(69); L.q(71, G - 4, 'ember'); L.torch(72, G - 6);
      L.pillar(75, 3, 5); L.carve(76, 78, G - 2, G - 1); L.set(75, G - 2, 'c'); L.set(75, G - 1, 'c'); L.gem(77, G - 2); L.chest(78, G - 1, 40);
      L.e('charger', 85); L.torch(88, G - 4); L.e('plant', 91);
      L.plat(97.5, G, 2, 'x', 5, 1.4);
      L.torch(108, G - 4); L.fill(111, 111, G - 7, G - 1, 'H'); L.row(112, 134, G - 6, 'S');
      L.coins(114, 130, G - 7); L.e('wisp', 124, G - 8); L.gem(133, G - 8);
      L.e('charger', 118); L.e('beetle', 126); L.torch(122, G - 3); L.saw(134, G - 1, 'x', 4, 1.2);
      L.fplat(142, G, 2); L.fplat(144.5, G, 2);
      L.checkpoint(149); L.q(152, G - 4, 'heart'); L.q(153, G - 4, 'shield'); L.torch(156, G - 4);
      L.e('charger', 159); L.e('plant', 164); L.saw(170, G - 3, 'y', 3, 1.5); L.e('wisp', 174, G - 5);
      L.set(176, G, 'c'); L.set(177, G, 'c'); L.carve(176, 177, G + 1, G + 1); L.carve(170, 179, G + 2, G + 5); L.fill(176, 177, G + 3, G + 5, 'S'); L.fill(175, 175, G + 4, G + 5, 'S'); L.secret(170, G + 1, 179, G + 5);
      L.chest(171, G + 5, 80); L.gem(178.5, G + 2); L.torch(173, G + 3);
      L.plat(181, G, 2, 'x', 4, 1.3);
      L.checkpoint(190); L.sign(192, 'שומר הגחלים ממתין… פגע בראשו רק כשהוא מסוחרר!'); L.q(194, G - 4, 'heart'); L.q(195, G - 4, 'ember'); L.torch(197, G - 5);
      L.arena(201, 231); L.boss(222); L.fill(232, 233, G - 10, G - 1, 'S');
      L.torch(206, G - 6); L.torch(216, G - 6); L.torch(226, G - 6);
      L.goal(241); L.torch(238, G - 4); L.torch(245, G - 4);
    } },
  // ───────────────────────── SECRET ─────────────────────────
  { id: 'garden', name: 'הגן הנסתר', icon: '🍄', theme: 'garden', secret: true, cols: 150, rows: 28, G: 18, css: 'linear-gradient(180deg,#0d0b2e,#5a2a7a 60%,#3fd6b0 61%,#3a3560)',
    build(L, G) {
      L.ground(0, 21); L.ground(26, 40); L.ground(60, 75); L.ground(100, 149);
      L.start(4); L.sign(8, 'מצאת את הגן הנסתר! כאן הכול אוצרות ✨');
      L.spring(12); L.row(10, 16, G - 9, 'k'); L.coins(10, 16, G - 10); L.coins(10, 16, G - 11);
      L.coins(22, 25, G - 4);
      L.spring(30); L.row(28, 36, G - 10, 'k'); L.coins(28, 36, G - 11); L.gem(32, G - 13); L.chest(38, G - 1, 60);
      L.row(42, 44, G - 2, 'k'); L.row(47, 49, G - 4, 'k'); L.row(52, 54, G - 3, 'k'); L.row(57, 58, G - 1, 'k');
      L.coins(42, 44, G - 4); L.coins(47, 49, G - 6); L.coins(52, 54, G - 5); L.e('bat', 50, G - 8);
      L.chest(66, G - 1, 80); L.q(68, G - 4, 'star'); L.e('frog', 71);
      L.plat(76, G, 2, 'x', 4, 1.2); L.fplat(83, G - 1, 2); L.plat(86, G, 2, 'x', 5, 1.5); L.fplat(95, G - 1, 2);
      L.gem(83.5, G - 6); L.coins(77, 81, G - 3); L.coins(87, 92, G - 3);
      L.spring(104); L.row(102, 110, G - 9, 'k'); L.coins(102, 110, G - 10); L.row(112, 118, G - 13, 'k'); L.gem(115, G - 15); L.coins(112, 118, G - 14);
      L.e('blob', 121); L.e('blob', 123); L.chest(128, G - 1, 100); L.q(132, G - 4, 'heart');
      L.goal(141);
    } },
];

function buildLevel(idx) {
  const def = LEVELS[idx], G = def.G, rows = def.rows, cols = def.cols;
  const g = Array.from({ length: rows }, () => Array(cols).fill(' '));
  const lv = { def, idx, cols, rows, G, grid: g, theme: THEMES[def.theme], themeName: def.theme, spawns: [], plats: [], springs: [], doors: [], checkpoints: [],
    gems: [], keys: [], chests: [], signs: [], saws: [], torches: [], hints: [], secrets: [], contents: new Map(), goals: [], start: { x: 4 * T, y: G * T }, boss: null, arena: null };
  const inb = (c, r) => c >= 0 && c < cols && r >= 0 && r < rows;
  const L = {
    set(c, r, ch) { if (inb(c, r)) g[r][c] = ch; },
    fill(a, b, r1, r2, ch) { for (let r = r1; r <= r2; r++) for (let c = a; c <= b; c++) L.set(c, r, ch); },
    row(a, b, r, ch) { L.fill(a, b, r, r, ch); },
    ground(a, b, top = G) { L.fill(a, b, top, rows - 1, '#'); },
    island(a, b, r) { L.fill(a, b, r, r + 1, '#'); },
    carve(a, b, r1, r2) { L.fill(a, b, r1, r2, ' '); },
    water(a, b, r1, r2) { L.fill(a, b, r1, r2, '~'); },
    lava(a, b) { L.fill(a, b, G + 1, rows - 1, 'L'); },
    ice(a, b) { for (let c = a; c <= b; c++) if (g[G][c] === '#') g[G][c] = 'I'; },
    coins(a, b, r) { for (let c = a; c <= b; c++) if (inb(c, r) && (g[r][c] === ' ' || g[r][c] === '~')) g[r][c] = g[r][c] === '~' ? 'w' : 'o'; },
    spikes(a, b, r) { L.row(a, b, r, '^'); },
    pillar(c, h, w = 2) { L.fill(c, c + w - 1, G - h, G - 1, 'S'); },
    stairs(c, n, dir) { for (let i = 0; i < n; i++) { const h = dir > 0 ? i + 1 : n - i; L.fill(c + i, c + i, G - h, G - 1, 'S'); } },
    q(c, r, kind = 'coin') { L.set(c, r, kind === 'coin' ? '?' : 'M'); if (kind !== 'coin') lv.contents.set(c + ',' + r, kind); },
    hidden(c, r, kind = 'coin') { L.set(c, r, 'i'); if (kind !== 'coin') lv.contents.set(c + ',' + r, kind); },
    e(type, c, r = G - 1) { lv.spawns.push({ type, c, r }); },
    icicle(c, r) { lv.spawns.push({ type: 'icicle', c, r }); },
    plat(c, r, w, axis, range, speed) { lv.plats.push({ x: c * T, y: r * T, w: w * T, h: 16, ox: c * T, oy: r * T, axis, range: range * T, speed, t: 0, dx: 0, dy: 0 }); },
    fplat(c, r, w) { lv.plats.push({ x: c * T, y: r * T, w: w * T, h: 16, ox: c * T, oy: r * T, fall: true, ft: 0, vy: 0, dx: 0, dy: 0 }); },
    spring(c, r = G - 1) { lv.springs.push({ x: c * T + 2, y: (r + 1) * T - 22, w: 44, h: 22, t: 0 }); },
    door(id, c, r, to, o = {}) { lv.doors.push({ id, to, x: c * T + 2, y: (r + 1) * T - 80, w: 44, h: 80, locked: !!o.locked }); },
    key(c, r) { lv.keys.push({ x: c * T + 10, y: r * T + 8, w: 28, h: 32 }); },
    gem(c, r) { lv.gems.push({ x: c * T + 8, y: r * T + 6, w: 32, h: 36, idx: lv.gems.length }); },
    chest(c, r, n) { lv.chests.push({ x: c * T, y: (r + 1) * T - 36, w: 48, h: 36, n, open: false }); },
    sign(c, text, r = G - 1) { lv.signs.push({ x: c * T, y: (r + 1) * T - 52, w: 48, h: 52, text }); },
    checkpoint(c, r = G - 1) { lv.checkpoints.push({ x: c * T, y: (r + 1) * T, taken: false }); },
    goal(c, r = G - 1, secret = false) { lv.goals.push({ x: c * T - 24, y: (r + 1) * T - 120, w: 96, h: 120, secret }); },
    start(c, r = G - 1) { lv.start = { x: c * T, y: (r + 1) * T }; },
    saw(c, r, axis, range, speed) { lv.saws.push({ ox: c * T + 24, oy: r * T + 24, x: c * T + 24, y: r * T + 24, axis, range: range * T, speed, t: 0, r: 26 }); },
    torch(c, r) { lv.torches.push({ x: c * T + 24, y: r * T + 24 }); },
    hint(c, r) { lv.hints.push({ x: c * T + 24, y: r * T + 24 }); },
    secret(c0, r0, c1, r1, o = {}) { lv.secrets.push({ c0, r0, c1, r1, cover: o.cover !== false, wall: o.cover !== false || !!o.wall, found: false, a: 1 }); },
    arena(a, b) { lv.arena = { a, b, active: false, done: false }; },
    boss(c) { lv.boss = { c }; },
  };
  def.build(L, G);
  return lv;
}

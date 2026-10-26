/* The Climb · scene 1: "Base camp". Everything is drawn by code on one canvas, as flat layers in the style of the reference: a colossal mountain in climate zones,
 * seven bands of forest sinking into pink haze, dark pines, a river with stepping stones, and a climber seen from behind.
 * The camera pans and tilts across the scenario as you scroll; it does not follow the climber, who hops from stone to stone towards the mountain.
 * Everything moves all the time: fog drifts through every depth, the pines and grass lean and sway with the wind, fireflies wander and glow, birds cross the sky,
 * the water flows, the scarf streams. Sound (sound.js) is tied to what you see. Append #p=0.5 to the address to freeze a moment (used by the tests). */
(function () {
  "use strict";
  var DW = 1920, DH = 1080, X0 = -700, X1 = 2700;
  var FASTT = /fast/.test(location.hash), HERO_DBG = (/[#&]hero=([\d.]+)/.exec(location.hash) || [])[1]; HERO_DBG = HERO_DBG == null ? null : parseFloat(HERO_DBG);
  var cv = document.getElementById("cv"), ctx = cv.getContext("2d");
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches, TS = RM ? .3 : 1;
  var small = window.matchMedia && (matchMedia("(max-width: 760px)").matches || matchMedia("(pointer: coarse)").matches);
  var frozenP = /[#&]p=([\d.]+)/.exec(location.hash); frozenP = frozenP ? parseFloat(frozenP[1]) : null;

  // ───────────── helpers ─────────────
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(r) { var u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
  function sm(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function mixc(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  var HAZE = [196, 150, 162];
  function fogged(c, f) { return mixc(c, HAZE, f); }
  function css(c, a) { return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + (a == null ? 1 : a) + ")"; }
  function vgrad(y0, y1, stops) { var g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(function (s) { g.addColorStop(s[0], css(s[1], s[2])); }); return g; }
  var R = mulberry(7), WIND = 1, DPR = 1, CW = 1, CH = 1, S = 1;

  // ───────────── the camera: a pan across the scenario, a tilt up to the mountain, a slow dolly in ─────────────
  var cam = { x: 960, tilt: 0, zoom: 1, mz: 1 };
  function gvOf(f) { return .30 + .95 * Math.min(f, 1.25); }                  // how much of the camera's rise a layer feels: far layers little, near layers a lot (parallax)
  function setLayer(f, extraZoom, g) {                                         // f = parallax: 0 at infinity, 1 at the near ground; g = how much of the camera's vertical travel this layer feels
    var z = (1 + (cam.zoom - 1) * (.25 + .75 * f)) * (extraZoom || 1), s = S * z;
    ctx.setTransform(s, 0, 0, s, CW / 2 - s * (960 + (cam.x - 960) * f), CH / 2 - s * (540 - cam.tilt * (g == null ? gvOf(f) : g)));
  }
  function toScreen(x, y, f) { var z = 1 + (cam.zoom - 1) * (.25 + .75 * f), s = S * z; return [CW / 2 + s * (x - 960 - (cam.x - 960) * f), CH / 2 + s * (y - 540 + cam.tilt * gvOf(f)), s]; }

  // ───────────── the sky, the sun and the mountain ─────────────
  var skyG, skyG2, sunG, sunGlowG;
  function makeSky() {
    skyG = vgrad(-DH * 1.1, DH * .62, [[0, [196, 160, 170]], [.5, [214, 178, 176]], [1, [190, 150, 156]]]); skyG2 = vgrad(DH * .62, DH * 1.4, [[0, [190, 150, 156]], [1, [170, 130, 146]]]);
    sunG = ctx.createRadialGradient(960, DH * .028, 0, 960, DH * .028, 340); sunG.addColorStop(0, css([200, 196, 198])); sunG.addColorStop(78 / 340, css([200, 196, 198])); sunG.addColorStop(1, css([214, 178, 178]));
  }
  function drawSky(t) {
    setLayer(0); ctx.fillStyle = skyG; ctx.fillRect(X0, -DH * 1.1, X1 - X0, DH * 1.1 + DH * .62); ctx.fillStyle = skyG2; ctx.fillRect(X0, DH * .62 - 1, X1 - X0, DH * .8);
    setLayer(.01); var pulse = 1 + Math.sin(t * .5) * .03; ctx.save(); ctx.translate(960, DH * .028); ctx.scale(pulse, pulse); ctx.translate(-960, -DH * .028); ctx.fillStyle = sunG; ctx.beginPath(); ctx.arc(960, DH * .028, 340, 0, 6.2832); ctx.fill(); ctx.restore();
    var gl = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); gl.addColorStop(0, "rgba(255,214,176,.55)"); gl.addColorStop(.35, "rgba(255,214,176,.27)"); gl.addColorStop(.7, "rgba(255,214,176,.08)"); gl.addColorStop(1, "rgba(255,214,176,0)");
    ctx.save(); ctx.translate(960, DH * .06); ctx.scale(760 * (1 + Math.sin(t * .37) * .02), 520); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, 1, 0, 6.2832); ctx.fill(); ctx.restore();
  }

  var xs = []; (function () { for (var x = X0; x <= X1; x += 1.8) xs.push(x); })(); var NX = xs.length;
  function polyPath(top, bottom) {
    var p = new Path2D(); p.moveTo(xs[0], bottom instanceof Float32Array ? bottom[0] : bottom);
    for (var i = 0; i < NX; i++) p.lineTo(xs[i], top[i]); p.lineTo(xs[NX - 1], bottom instanceof Float32Array ? bottom[NX - 1] : bottom); p.closePath(); return p;
  }

  var mountain = [];                                // four climate zones, painted in pale flat colour; the ridge is ragged
  (function () {
    var r = mulberry(3), cx = 960, half = DW * .36, top = -DH * .22, baseY = DH * .30, n = 300, mx = [], ridge = [], noise = [];
    for (var i = 0; i < n; i++) { mx.push(cx - half + 2 * half * i / (n - 1)); noise.push(gauss(r)); }
    function boxs(a, k) { var o = []; for (var i = 0; i < a.length; i++) { var s = 0, c = 0; for (var j = -k; j <= k; j++) { var q = a[i + j]; if (q != null) { s += q; c++; } } o.push(s / c); } return o; }
    var nz = boxs(noise, 3);
    for (i = 0; i < n; i++) { var tt = Math.abs(mx[i] - cx) / half; ridge.push(clamp(top + (baseY - top) * Math.pow(tt, .86) + nz[i] * 22 * (1 - tt * .6) * 2.2 + 10 * Math.sin(mx[i] * .017 + 3), top, baseY)); }
    function border(y0, k) { var rr = mulberry(3 + k), g = []; for (var i = 0; i < n; i++) g.push(gauss(rr)); var b = boxs(g, 4); return b.map(function (v, i) { return y0 + v * 34 * 2.4 + 22 * Math.sin(mx[i] * .011 + k); }); }
    var Z = [{ b: null, c0: [230, 212, 218], c1: [212, 190, 200], fo: [.10, .22] }, { b: border(DH * .085, 1), c0: [158, 126, 150], c1: [150, 120, 146], fo: [.30, .40] }, { b: border(DH * .175, 2), c0: [214, 150, 128], c1: [196, 138, 124], fo: [.30, .40] }, { b: border(DH * .245, 3), c0: [150, 130, 128], c1: [172, 136, 132], fo: [.30, .40] }];
    Z.forEach(function (z) {
      var p = new Path2D(), ytop = []; for (var i = 0; i < n; i++) ytop.push(z.b ? Math.max(ridge[i], z.b[i]) : ridge[i]);
      p.moveTo(mx[0], baseY); for (i = 0; i < n; i++) p.lineTo(mx[i], ytop[i]); p.lineTo(mx[n - 1], baseY); p.closePath();
      mountain.push({ p: p, g: vgrad(Math.min.apply(null, ytop), baseY, [[0, fogged(z.c0, z.fo[0])], [1, fogged(z.c1, z.fo[1])]]) });
    });
  })();
  function drawMountain(t) { setLayer(.05, cam.mz); mountain.forEach(function (z) { ctx.fillStyle = z.g; ctx.fill(z.p); }); }

  // ───────────── fog: soft banks of mist, drawn once as textures and then drifting at their own speeds ─────────────
  function fogTex(w, h, col, peak, upFrac, seed) {
    var c = document.createElement("canvas"); c.width = w; c.height = h; var g = c.getContext("2d"), id = g.createImageData(w, h), d = id.data, r = mulberry(seed), p1 = r() * 6.28, p2 = r() * 6.28, p3 = r() * 6.28, cl = new Float32Array(w), yc = new Float32Array(w);
    for (var x = 0; x < w; x++) { var a = x / w * 6.2832; cl[x] = .42 + .58 * ((.5 + .5 * Math.sin(a * 3 + p1)) * .5 + (.5 + .5 * Math.sin(a * 7 + p2)) * .3 + (.5 + .5 * Math.sin(a * 13 + p3)) * .2); yc[x] = upFrac * h + Math.sin(a * 2 + p3) * h * .04; }
    for (var y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var c0 = yc[x], pr = y < c0 ? sm(y / c0) : sm(1 - (y - c0) / (h - c0)), i = (y * w + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = peak * cl[x] * pr * 255;
    }
    g.putImageData(id, 0, 0); return c;
  }
  var fogs = [];
  function addFog(opt) { var up = opt.up, down = opt.down, k = .5; opt.tex = fogTex(960, Math.max(8, Math.round((up + down) * k)), opt.col, opt.peak, up / (up + down), opt.seed); opt.h = (up + down); opt.up = up; fogs.push(opt); return opt; }
  var lateAmt = 0, stormAmt = 0;
  function drawFog(o, t, dens) {
    if (o.late && lateAmt < .01) return; if (o.storm && stormAmt < .01) return; setLayer(o.f, 1, o.g); var off = ((t * o.speed * TS + o.off) % DW + DW) % DW, y = o.y - o.up; ctx.globalAlpha = clamp(o.a * (o.late ? lateAmt : (o.storm ? stormAmt : dens)) * (1 + Math.sin(t * .23 + o.off) * .1), 0, 1);
    for (var x = X0 - DW + off; x < X1; x += DW) ctx.drawImage(o.tex, x, y, DW + 1, o.h);
    ctx.globalAlpha = 1;
  }

  // ───────────── the forest: seven bands of trees in groves, with gaps and tall emergent trees ─────────────
  function treeProfile(base, hmin, hmax, wmin, wmax, seed, undulate) {
    var r = mulberry(seed), top = new Float32Array(NX), y = new Float32Array(NX), i;
    for (i = 0; i < NX; i++) { y[i] = base - undulate * (Math.sin(xs[i] * .0021 + seed) * .6 + Math.sin(xs[i] * .0057 + seed * 2) * .4); top[i] = 1e9; }
    var x = X0 - 30;
    while (x < X1 + 30) {
      var w = (wmin + r() * (wmax - wmin)) * (.7 + .8 * r() * r()), c = x + w, clump = .58 + .62 * (.5 + .5 * Math.sin(c * .0085 + seed * 1.3) * Math.sin(c * .0031 + seed * .7)), h = (hmin + r() * (hmax - hmin)) * clump, roll = r();
      if (roll < .055) { h *= 1.8 + r() * .8; w *= 1.25; } else if (roll < .085) h *= .38;
      var ax = c + .22 * w * WIND, i0 = Math.max(0, Math.floor((c - w - X0) / 1.8)), i1 = Math.min(NX - 1, Math.ceil((c + w - X0) / 1.8));
      for (i = i0; i <= i1; i++) {
        var xx = xs[i], tri = xx < ax ? (xx - (c - w)) / (ax - (c - w)) : ((c + w) - xx) / ((c + w) - ax); if (tri <= 0) continue;
        var tiers = 1 - .24 * Math.abs((((xx - c) / w * 3) % 1 + 1) % 1 - .5) * 2, v = y[i] - h * tri * tiers; if (v < top[i]) top[i] = v;
      }
      x += w * (.9 + r());
    }
    for (i = 0; i < NX; i++) if (top[i] > y[i]) top[i] = y[i]; return top;
  }
  var BANDS = [
    { b: .300, h: [20, 40], w: [7, 13], c0: [203, 134, 134], c1: [176, 118, 128], mist: [[238, 204, 204], .46] },
    { b: .335, h: [24, 46], w: [7, 14], c0: [190, 122, 130], c1: [160, 104, 122], mist: [[232, 194, 196], .52] },
    { b: .372, h: [26, 50], w: [8, 15], c0: [174, 110, 124], c1: [142, 92, 116], mist: [[222, 178, 186], .50] },
    { b: .412, h: [28, 54], w: [8, 16], c0: [156, 98, 118], c1: [122, 82, 108], mist: [[212, 164, 178], .54] },
    { b: .455, h: [30, 58], w: [9, 17], c0: [134, 86, 112], c1: [104, 72, 104], mist: [[198, 154, 174], .54] },
    { b: .500, h: [32, 62], w: [9, 18], c0: [112, 76, 106], c1: [84, 64, 98], mist: [[184, 142, 168], .56] },
    { b: .545, h: [34, 66], w: [10, 20], c0: [90, 66, 100], c1: [62, 54, 88], mist: [[168, 128, 160], .50] }
  ];
  BANDS.forEach(function (B, i) {
    var fg = .30 - .035 * i, c0 = fogged(B.c0, fg), c1 = fogged(B.c1, fg), baseY = DH * B.b; B.f = .10 + .06 * i;
    B.path = polyPath(treeProfile(baseY, B.h[0], B.h[1], B.w[0], B.w[1], 10 + i, 16 + i * 2), DH * .66);
    B.pat = vgrad(baseY - 140, DH * .66, [[0, c0], [1, c1]]);
    B.sway = .0035 + .0012 * i; B.baseY = baseY;
    addFog({ f: B.f + .02, y: DH * (B.b + .022), up: DH * .085, down: DH * .045, col: B.mist[0], peak: 1, a: B.mist[1], speed: 5 + 3 * i, off: i * 313, seed: 40 + i });
    B.fogIdx = fogs.length - 1;
  });
  function drawBand(B, i, t, gust) {
    setLayer(B.f); var sk = Math.sin(t * .5 * TS + i) * B.sway * (.6 + gust); ctx.save(); ctx.transform(1, 0, -sk, 1, sk * B.baseY, 0); ctx.fillStyle = B.pat; ctx.fill(B.path); ctx.restore();
  }

  // ───────────── pines: tall and slender, tiers of drooping boughs, leaning downwind and swaying in gusts ─────────────
  function pineShape(cx, baseY, height, width, seed, lean) {
    var r = mulberry(seed), tiers = height > 330 ? 9 : 7, top = baseY - height, step = height * .70 / tiers, L = [[cx, top]], Rr = [];
    for (var k = 0; k < tiers; k++) {
      var f = (k + 1) / tiers, wk = width * (.18 + .82 * Math.pow(f, .85)) * (.92 + .16 * r()), yk = top + step * (k + 1) * 1.12 + height * .04;
      L.push([cx - wk, yk + step * .62], [cx - wk * .24, yk - step * .26]); Rr.push([cx + wk, yk + step * .62], [cx + wk * .24, yk - step * .26]);
    }
    var tt = top + step * tiers * 1.12 + height * .04 + step * .3, pts = L.concat([[cx - width * .04, tt], [cx - width * .03, baseY], [cx + width * .03, baseY], [cx + width * .04, tt]], Rr.reverse());
    var p = new Path2D(); pts.forEach(function (q, i) { var x = q[0] + WIND * lean * (baseY - q[1]), y = q[1]; if (i) p.lineTo(x, y); else p.moveTo(x, y); }); p.closePath(); return p;
  }
  var pines = [];
  function addPine(f, fx, fy, h, w, c0, c1, seed, lean, fogf, layer) {
    var x = fx * DW, y = fy * DH; c0 = fogged(c0, fogf); c1 = fogged(c1, fogf * 1.2);
    pines.push({ f: f, p: pineShape(x, y, h, w, seed, lean), x: x, y: y, g: vgrad(y - h, y, [[0, c0], [1, c1]]), ph: seed * .7, amp: .010 + .006 * (h / 700), layer: layer || "near" });
  }
  // emergent pines standing out of each forest band
  (function () { var r = mulberry(300); for (var i = 1; i <= 5; i++) for (var k = 0, n = Math.round((5 + i) * 1.8); k < n; k++) { var fx = -.35 + r() * 1.7, hh = (95 + r() * 55) * (.7 + .1 * i), ww = hh * (.085 + r() * .025), B = BANDS[i]; addPine(B.f, fx, B.b + .0093, hh, ww, B.c0.map(function (v) { return v * .94; }), B.c1.map(function (v) { return v * .94; }), 300 + i * 10 + k, .04, .30 - .035 * i, "band" + i); } })();
  [[.070, .66, 600, 58, [78, 72, 128], [48, 44, 92], 0], [.125, .70, 700, 66, [70, 64, 120], [44, 40, 84], 0], [.288, .575, 380, 38, [122, 104, 148], [100, 88, 130], .34], [.317, .585, 430, 41, [116, 100, 146], [96, 84, 128], .34], [.350, .595, 400, 38, [112, 98, 144], [92, 82, 126], .34],
   [.755, .578, 430, 41, [118, 102, 148], [98, 86, 130], .34], [.795, .586, 400, 39, [114, 98, 146], [94, 82, 128], .34], [.905, .66, 580, 56, [76, 70, 126], [46, 42, 90], 0], [.972, .70, 680, 64, [68, 62, 118], [42, 38, 82], 0],
   [-.12, .68, 640, 62, [74, 68, 124], [46, 42, 88], 0], [-.19, .66, 560, 54, [82, 76, 132], [50, 46, 94], 0], [1.10, .70, 660, 62, [72, 66, 122], [44, 40, 86], 0], [1.18, .66, 600, 56, [80, 74, 130], [48, 44, 90], 0], [1.28, .68, 520, 50, [86, 80, 136], [52, 48, 96], 0]].forEach(function (q, i) {
    var mid = q[6] > 0; addPine(mid ? .58 : 1.1, q[0], q[1], q[2], q[3], q[4], q[5], 40 + i, .05, q[6], mid ? "mid" : "near");
  });
  function drawPines(layer, t, gust, only) {
    pines.forEach(function (P) {
      if (P.layer !== layer) return; setLayer(P.f); var sw = (Math.sin(t * .7 * TS + P.ph) * .6 + Math.sin(t * 1.3 * TS + P.ph * 2) * .4) * P.amp * (.5 + 1.6 * gust);
      ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(sw); ctx.translate(-P.x, -P.y); ctx.fillStyle = P.g; ctx.fill(P.p); ctx.restore();
    });
  }

  // ───────────── the land, the river with its stepping stones, reeds ─────────────
  var landTop = new Float32Array(NX); for (var li = 0; li < NX; li++) landTop[li] = DH * (.600 - .040 * Math.exp(-Math.pow((xs[li] / DW - .09) / .16, 2)) - .028 * Math.exp(-Math.pow((xs[li] / DW - .93) / .13, 2)) + .012 * Math.sin(xs[li] * .004));
  var landPath = polyPath(landTop, DH * 1.02), landG = vgrad(DH * .56, DH * 1.02, [[0, [46, 44, 84]], [1, [16, 16, 26]]]);
  var VS = [], CX = [], WID = [], LEFT = [], RIGHT = []; for (var vi = 0; vi < 90; vi++) { var v = .575 + .445 * vi / 89; VS.push(v); var c = DW * (.52 + .105 * Math.sin((v - .575) * 11.5) * clamp((v - .575) * 2.6, 0, 1) - .03 * (v - .575)), w = lerp(64, 640, Math.pow((v - .575) / .445, 1.6)); CX.push(c); WID.push(w); LEFT.push(c - w / 2); RIGHT.push(c + w / 2); }
  function interp(arr, v) { var f = clamp((v - .575) / .445, 0, 1) * 89, i = Math.min(88, Math.floor(f)); return lerp(arr[i], arr[i + 1], f - i); }
  var cxAt = function (v) { return interp(CX, v); }, widAt = function (v) { return interp(WID, v); };
  var riverPath = new Path2D(); (function () { riverPath.moveTo(LEFT[0], VS[0] * DH); for (var i = 1; i < 90; i++) riverPath.lineTo(LEFT[i], VS[i] * DH); for (i = 89; i >= 0; i--) riverPath.lineTo(RIGHT[i], VS[i] * DH); riverPath.closePath(); })();
  var riverG = vgrad(.575 * DH, 1.02 * DH, [[0, [214, 168, 172]], [.22, [172, 138, 156]], [.55, [96, 88, 120]], [1, [46, 50, 82]]]);
  var shore = [-1, 1].map(function (side) { var p = new Path2D(), e = side < 0 ? LEFT : RIGHT, i; for (i = 0; i < 90; i++) { var q = (VS[i] - .575) / .445; p[i ? "lineTo" : "moveTo"](e[i] + side * (2 + 4 * q), VS[i] * DH); } for (i = 89; i >= 0; i--) { q = (VS[i] - .575) / .445; p.lineTo(e[i] - side * (1 + 3 * q), VS[i] * DH); } p.closePath(); return p; });
  function sOf(v) { return lerp(.30, 1.62, Math.pow(clamp((v - .575) / .40, 0, 1), 1.15)); }

  function mkStone(x, y, sz, k, path) { var r = mulberry(500 + k), ang = [], j; for (j = 0; j < 9; j++) ang.push(j / 9 * 6.2832); var jit = ang.map(function () { return 1 + gauss(r) * .12; }); return { v: y / DH, x: x, y: y, sz: sz, ang: ang, jit: jit, onPath: !!path, ph: k * 1.3 }; }
  function strideAt(v) { return 54 * sOf(v); }                          // one step, in design pixels: smaller far away
  // the route: a smooth path through the meadow along the left bank; a footfall every stride
  function bankX(v) { return interp(LEFT, v) - (34 + 130 * Math.pow(clamp((v - .575) / .445, 0, 1), 1.1)); }
  var ROUTE = (function () {
    var vsC = [.915, .885, .85, .81, .77, .73, .69, .655, .625, .60, .585], pts = vsC.map(function (v) { return [bankX(v) + Math.sin(v * 9) * 16, v * DH]; }), dense = [], i, k;
    function cr(p0, p1, p2, p3, t) { var t2 = t * t, t3 = t2 * t; return [.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3), .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]; }
    for (i = 0; i < pts.length - 1; i++) for (k = 0; k < 30; k++) dense.push(cr(pts[Math.max(0, i - 1)], pts[i], pts[i + 1], pts[Math.min(pts.length - 1, i + 2)], k / 30));
    dense.push(pts[pts.length - 1]); var cum = [0]; for (i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
    function at(sa) { var j = 1; while (j < cum.length - 1 && cum[j] < sa) j++; var f = (sa - cum[j - 1]) / Math.max(1e-6, cum[j] - cum[j - 1]); return [lerp(dense[j - 1][0], dense[j][0], f), lerp(dense[j - 1][1], dense[j][1], f)]; }
    var steps = [dense[0]], sa = 0; for (;;) { var last = steps[steps.length - 1]; sa += strideAt(last[1] / DH); if (sa > cum[cum.length - 1]) break; steps.push(at(sa)); }
    return steps;
  })();
  var STONES = [[.945, -.30, 1], [.905, -.12, 1], [.865, .06, 1.15], [.82, .10, .9], [.78, 0, 1], [.735, -.05, .72], [.69, .04, .62], [.64, .02, .5], [.90, .30, 1.5], [.985, .12, 1.7], [.76, .32, .5], [.86, -.32, .8]].map(function (q, k) { var s0 = sOf(q[0]); return mkStone(cxAt(q[0]) + q[1] * widAt(q[0]), q[0] * DH, 47 * s0 * q[2], k, false); });
  STONES.sort(function (a, b) { return a.v - b.v; });                   // far stones first
  var reeds = []; (function () { var r = mulberry(61); for (var k = 0; k < 90; k++) { var v = .578 + r() * .034, x = cxAt(v) + (r() * 2 - 1) * widAt(v) * 1.3, h = 16 + r() * 22; reeds.push([x, v * DH, h, r() * 6.28]); } })();
  var sheen = []; (function () { var r = mulberry(70); for (var k = 0; k < 110; k++) sheen.push({ v0: r(), u: (r() * 2 - 1) * .43, len: .05 + r() * .1, sp: .018 + r() * .02, ph: r() * 6.28 }); })();
  function stoneShape(st, sc) { var p = new Path2D(); st.ang.forEach(function (a, i) { var x = st.x + Math.cos(a) * st.sz * st.jit[i], y = st.y + Math.sin(a) * st.sz * .42 * st.jit[i]; p[i ? "lineTo" : "moveTo"](x, y); }); p.closePath(); return p; }
  STONES.forEach(function (st) { st.path = stoneShape(st); st.rim = new Path2D(); for (var j = 0; j < 5; j++) { var a = st.ang[j] - .1, x = st.x + Math.cos(a) * st.sz * .86 * st.jit[j], y = st.y - 2 - st.sz * .05 + Math.sin(a) * st.sz * .34 * st.jit[j]; st.rim[j ? "lineTo" : "moveTo"](x, y); } st.rim.closePath(); });
  function drawGround(t, gust, dens) {
    setLayer(1); ctx.fillStyle = landG; ctx.fill(landPath); ctx.fillStyle = riverG; ctx.fill(riverPath);
    shore.forEach(function (p) { ctx.fillStyle = "rgba(226,188,184,.9)"; ctx.fill(p); });
    // the water flows towards you: sheens and glints slide down the river
    ctx.lineCap = "round";
    sheen.forEach(function (sh) { var v = .578 + ((sh.v0 + t * sh.sp * TS) % 1) * .44, x = cxAt(v) + sh.u * widAt(v) + Math.sin(t * .8 + sh.ph) * 2, len = sh.len * widAt(v), a = clamp((v - .58) * 6, 0, 1) * (.35 + .35 * Math.sin(t * 1.4 + sh.ph)); ctx.strokeStyle = "rgba(236,204,198," + a.toFixed(3) + ")"; ctx.lineWidth = 1.6 + (v - .575) * 4; ctx.beginPath(); ctx.moveTo(x - len, v * DH); ctx.lineTo(x + len, v * DH); ctx.stroke(); });
    // stones, with their soft shadow, a lit top and ripples that breathe
    STONES.forEach(function (st) {
      var g = ctx.createRadialGradient(st.x + st.sz * .15, st.y + st.sz * .28, 0, st.x + st.sz * .15, st.y + st.sz * .28, st.sz * 1.25); g.addColorStop(0, "rgba(14,14,28,.55)"); g.addColorStop(1, "rgba(14,14,28,0)");
      ctx.save(); ctx.translate(st.x, st.y + st.sz * .28); ctx.scale(1, .3); ctx.translate(-st.x, -(st.y + st.sz * .28)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(st.x + st.sz * .15, st.y + st.sz * .28, st.sz * 1.25, 0, 6.2832); ctx.fill(); ctx.restore();
      ctx.fillStyle = vgrad(st.y - st.sz * .42, st.y + st.sz * .42, [[0, [62, 58, 92]], [1, [24, 24, 38]]]); ctx.fill(st.path); ctx.fillStyle = vgrad(st.y - st.sz * .4, st.y, [[0, [172, 140, 168]], [1, [110, 94, 136]]]); ctx.fill(st.rim);
      for (var q = 0; q < 2; q++) { var ph = (t * .5 * TS + st.ph + q * .5) % 1, rx = st.sz * (1.1 + ph * .5), ry = st.sz * (.54 + ph * .26); ctx.strokeStyle = "rgba(240,208,200," + ((1 - ph) * .55).toFixed(3) + ")"; ctx.lineWidth = 2.6 * (1 - ph) + .8; ctx.beginPath(); ctx.ellipse(st.x, st.y + st.sz * .08, rx, ry, 0, .18, Math.PI - .18); ctx.stroke(); }
    });
    // reeds, bending in the wind
    ctx.fillStyle = "rgba(66,44,66,1)"; reeds.forEach(function (rd) { var b = (Math.sin(t * 1.5 + rd[3]) * .5 + .5 + gust) * rd[2] * .35 * WIND; ctx.beginPath(); ctx.moveTo(rd[0] - 1, rd[1]); ctx.lineTo(rd[0] + 1, rd[1]); ctx.lineTo(rd[0] + 1.4 + b, rd[1] - rd[2]); ctx.lineTo(rd[0] + b, rd[1] - rd[2]); ctx.fill(); });
  }

  // ───────────── grass, flowers, pebbles: swaying in groups ─────────────
  var grass = [], flowers = [], pebbles = [], GB = 10, GPH = 3;
  (function () {
    var r = mulberry(88), i, p; for (i = 0; i < GB; i++) { var row = []; for (p = 0; p < GPH; p++) row.push(new Path2D()); grass.push({ paths: row, y: DH * (.61 + .04 * i), ph: i * .9 }); }
    var tufts = 1500; if (small) tufts = 900;
    for (var k = 0; k < tufts; k++) {
      var vv = .60 + Math.pow(r(), .75) * .40, x = X0 + r() * (X1 - X0), yb = vv * DH;
      if (vv > .575 && Math.abs(x - cxAt(vv)) < widAt(vv) * .56 + 8) continue;
      var bi = clamp(Math.floor((vv - .61) / .04), 0, GB - 1), g = grass[bi], nb = 3 + Math.floor(r() * 5), hBase = 12 + (vv - .6) * 205;
      for (var j = 0; j < nb; j++) {
        var h = hBase * (.5 + r() * .95), bw = 1.6 + h * .03, bx = x + (r() - .5) * 26, lean = WIND * h * (.12 + .4 * r()) + (r() - .5) * h * .26, path = g.paths[Math.floor(r() * GPH)], y0 = g.y, yy = yb - y0;
        path.moveTo(bx - bw, yy); path.quadraticCurveTo(bx - bw * .5 + lean * .35, yy - h * .55, bx + lean, yy - h); path.quadraticCurveTo(bx + bw * .5 + lean * .45, yy - h * .5, bx + bw, yy); path.closePath();
      }
    }
    var cols = [[255, 188, 120], [250, 150, 150], [255, 220, 160], [210, 190, 255]]; for (k = 0; k < 160; k++) { x = X0 + r() * (X1 - X0); vv = .62 + r() * .38; yb = vv * DH; if (Math.abs(x - cxAt(vv)) < widAt(vv) * .6) continue; var sz = 2.4 + (vv - .6) * 8; flowers.push({ x: x, y: yb, sz: sz, h: (40 + (vv - .6) * 300) * (.6 + r() * .6), c: cols[k % 4], ph: r() * 6.28, bi: clamp(Math.floor((vv - .61) / .04), 0, GB - 1) }); }
    for (k = 0; k < 44; k++) { x = X0 + r() * (X1 - X0); vv = .66 + r() * .33; if (Math.abs(x - cxAt(vv)) < widAt(vv) * .55) continue; pebbles.push({ x: x, y: vv * DH, rx: 7 + (vv - .6) * 30, ry: 3 + (vv - .6) * 12 }); }
  })();
  var grassG = [vgrad(-210, 18, [[0, [126, 116, 176]], [.55, [66, 64, 124]], [1, [30, 30, 66]]]), vgrad(-210, 18, [[0, [110, 112, 168]], [.55, [56, 58, 116]], [1, [26, 28, 60]]]), vgrad(-210, 18, [[0, [176, 132, 152]], [.55, [96, 74, 112]], [1, [40, 34, 66]]])];   // relative to each band's baseline
  function drawPebbles() { setLayer(1); ctx.fillStyle = "rgba(60,58,96,1)"; pebbles.forEach(function (p) { ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, 6.2832); ctx.fill(); }); }
  function drawGrassBands(t, gust, y0, y1) {                                  // the grass whose base lies between y0 and y1 (so the climber can stand among it)
    setLayer(1);
    for (var b = 0; b < GB; b++) {
      var g = grass[b]; if (g.y < y0 || g.y >= y1) continue;
      for (var p = 0; p < GPH; p++) {
        var sk = (Math.sin(t * (1.0 + .5 * p) * TS + g.ph + p * 2.1) * .5 + .5 + gust * 1.5) * .11 * WIND + Math.sin(t * 3.1 * TS + b + p) * .012 * (.4 + gust);
        ctx.save(); ctx.translate(0, g.y); ctx.transform(1, 0, -sk, 1, 0, 0); ctx.fillStyle = grassG[p]; ctx.fill(g.paths[p]); ctx.restore();
      }
    }
    flowers.forEach(function (f) { if (f.y < y0 || f.y >= y1) return; var b = (Math.sin(t * 1.4 * TS + f.ph) * .5 + .5 + gust * 1.3) * f.h * .16 * WIND; ctx.strokeStyle = "rgba(48,60,92,1)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo(f.x + b * .3, f.y - f.h * .55, f.x + b, f.y - f.h); ctx.stroke(); ctx.fillStyle = css(f.c); ctx.beginPath(); ctx.arc(f.x + b, f.y - f.h, f.sz, 0, 6.2832); ctx.fill(); });
  }
  function drawDetails(t, gust) { drawPebbles(); }

  // ───────────── the climber, seen from behind, with a walk cycle ─────────────
  function ell(x, y, rx, ry, n) { var o = [], a; n = n || 20; for (var i = 0; i < n; i++) { a = i / n * 6.2832; o.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); } return o; }
  function part(pts, c0, c1, dx, dy, rot, px, py) {
    ctx.save(); if (dx || dy) ctx.translate(dx, dy); if (rot) { ctx.translate(px, py); ctx.rotate(rot); ctx.translate(-px, -py); }
    var y0 = 1e9, y1 = -1e9; for (var i = 0; i < pts.length; i++) { if (pts[i][1] < y0) y0 = pts[i][1]; if (pts[i][1] > y1) y1 = pts[i][1]; }
    var g = ctx.createLinearGradient(0, y0, 0, y1 + .01); g.addColorStop(0, css(c0)); g.addColorStop(1, css(c1)); ctx.fillStyle = g; ctx.beginPath(); pts.forEach(function (q, i) { i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  // a small 3D skeleton: x = his right, y = up, z = the way he faces; limbs are solved with two-bone IK, feet plant on the ground and slide back under him
  function ik3(r, tg, l1, l2, hn) {
    var dx = tg[0] - r[0], dy = tg[1] - r[1], dz = tg[2] - r[2], L = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1, Lc = clamp(L, Math.abs(l1 - l2) + .01, l1 + l2 - .01), nx = dx / L, ny = dy / L, nz = dz / L;
    var dp = hn[0] * nx + hn[1] * ny + hn[2] * nz, px = hn[0] - nx * dp, py = hn[1] - ny * dp, pz = hn[2] - nz * dp, pl = Math.sqrt(px * px + py * py + pz * pz) || 1; px /= pl; py /= pl; pz /= pl;
    var a = (l1 * l1 - l2 * l2 + Lc * Lc) / (2 * Lc), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    return [[r[0] + nx * a + px * h, r[1] + ny * a + py * h, r[2] + nz * a + pz * h], [r[0] + nx * Lc, r[1] + ny * Lc, r[2] + nz * Lc]];
  }
  function heelUp(c) { if (c < .08) return -.25 * (1 - c / .08); if (c < .45) return 0; if (c < .6) { var u = (c - .45) / .15; return .8 * u * u; } if (c < .8) { var v = (c - .6) / .2; return .8 * (1 - v * v * (3 - 2 * v)); } var w = (c - .8) / .2; return -.25 * w * w * (3 - 2 * w); }
  var BOOT = [[-6.5, -7], [12, -7], [13.5, -3.5], [10, 0], [4, 2.5], [3, 9], [-5, 9], [-7, -2]];
  function drawFigure(x, y, s, pose, t, gust, alpha) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(s, s); if (pose.bridge) ctx.rotate(Math.sin(t * 1.7) * .05 * pose.bridge);
    var RIM = [255, 184, 140], TAU = 6.2832, aa = sm(pose.amp), g = pose.ph / TAU, idle = 1 - aa, breathe = Math.sin(t * 1.5), yaw = pose.yaw || 0, cyw = Math.cos(yaw), syw = Math.sin(yaw), cph = Math.cos(pose.pitch || .42), sph = Math.sin(pose.pitch || .42);
    var cg = Math.cos(TAU * g), sg = Math.sin(TAU * g);
    function P(p) { var X = p[0] * cyw + p[2] * syw, Z = -p[0] * syw + p[2] * cyw; return [X, -(p[1] * cph) - Z * sph, Z]; }
    // body motion: the pelvis falls onto each foot and shifts over it; the torso twists against the hips
    var stn = pose.strain || 0, scr = pose.scramble || 0, brg = pose.bridge || 0, S = 27 * aa * (1 - .28 * stn - .5 * scr - .2 * brg), H = 15 * aa * (1 + .45 * scr + .15 * stn), pelvisY = 84 - 6 * stn - 5 * scr - 3 * brg + (1.7 + 1.6 * stn) * aa * (-Math.cos(2 * TAU * g)) + breathe * .5 * idle, swayX = -3.2 * aa * Math.sin(TAU * (g - .05)) + Math.sin(t * .7) * 1.1 * idle + Math.sin(t * 23) * 1.1 * stn * (.4 + gust) + Math.sin(t * 1.9) * 3 * brg, hz = 3.4 * aa * cg, tw = aa * cg;
    var wd = clamp(Math.sin(t * .29) * .8 + Math.sin(t * .113 + 2) * .5 + (gust - .3) * .5, -1.15, 1.15);   // the wind turns: which way the scarf and pennant stream
    // shadows on the ground
    var sh = ctx.createRadialGradient(22, 6, 0, 22, 6, 62); sh.addColorStop(0, "rgba(10,10,24,.62)"); sh.addColorStop(1, "rgba(10,10,24,0)"); ctx.save(); ctx.translate(0, 6); ctx.scale(1, .21); ctx.translate(0, -6); ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(22, 6, 62, 0, 6.2832); ctx.fill(); ctx.restore();
    var cs = ctx.createRadialGradient(swayX * .5, 1, 0, swayX * .5, 1, 30); cs.addColorStop(0, "rgba(6,6,16,.8)"); cs.addColorStop(1, "rgba(6,6,16,0)"); ctx.save(); ctx.translate(0, 1); ctx.scale(1, .17); ctx.translate(0, -1); ctx.fillStyle = cs; ctx.beginPath(); ctx.arc(swayX * .5, 1, 30, 0, 6.2832); ctx.fill(); ctx.restore();
    function seg(a, b, w, col, hi) { ctx.lineCap = "round"; ctx.strokeStyle = css(col); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); if (hi) { ctx.strokeStyle = css(RIM, .55); ctx.lineWidth = w * .24; ctx.beginPath(); ctx.moveTo(a[0] + w * .27, a[1]); ctx.lineTo(b[0] + w * .27, b[1]); ctx.stroke(); } }
    // legs
    function leg(side, c0, hipP) {
      var c = c0 - Math.floor(c0), zf, lift = 0, h = heelUp(c) * aa;
      if (c < .6) zf = S * (1 - 2 * c / .6); else { var u = (c - .6) / .4, e = u * u * (3 - 2 * u); zf = -S + 2 * S * e; lift = H * Math.sin(Math.PI * u); }
      var pz = h >= 0 ? 12 : -6.5, py = -7, dz = -pz, dy = -py, ch = Math.cos(h), sn = Math.sin(h), az = zf + pz + dz * ch + dy * sn, ay = lift + 0 + (-dz * sn + dy * ch);
      var ankle = [side * 9.5 + swayX * .35, ay, az], kn = ik3(hipP, ankle, 42, 42, [side * .18, 0, 1]), pts = BOOT.map(function (q) { var zz = q[0] * ch + q[1] * sn, yy = -q[0] * sn + q[1] * ch; return [zz + az, yy + ay]; });
      return { hip: hipP, knee: kn[0], ankle: kn[1], pts: pts, side: side, x: ankle[0], z: (hipP[2] + kn[1][2]) / 2 };
    }
    var hipL = [swayX - 8, pelvisY, hz], hipR = [swayX + 8, pelvisY, -hz], LL = leg(-1, g, hipL), LR = leg(1, g + .5, hipR);
    function drawLeg(L, c0, c1, rim) {
      var pa = P(L.hip), pk = P(L.knee), pn = P(L.ankle); seg(pa, pk, 17, c1, false); seg(pk, pn, 14.5, c1, false); seg(pa, pk, 13.5, c0, rim); seg(pk, pn, 11.5, c0, rim);
      var path = new Path2D(), n = L.pts.length, i, A, B; for (i = 0; i < n; i++) { A = L.pts[i]; B = L.pts[(i + 1) % n]; var a1 = P([L.x - 5, A[1], A[0]]), b1 = P([L.x - 5, B[1], B[0]]), a2 = P([L.x + 5, A[1], A[0]]), b2 = P([L.x + 5, B[1], B[0]]); path.moveTo(a1[0], a1[1]); path.lineTo(b1[0], b1[1]); path.lineTo(b2[0], b2[1]); path.lineTo(a2[0], a2[1]); path.closePath(); }
      ctx.fillStyle = "rgb(46,38,58)"; ctx.fill(path); var h0 = P([L.x, L.pts[0][1], L.pts[0][0]]), h1 = P([L.x, L.pts[1][1], L.pts[1][0]]); ctx.strokeStyle = "rgba(160,148,168,.9)"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(h0[0], h0[1]); ctx.lineTo(h1[0], h1[1]); ctx.stroke();
    }
    // torso: a body point at height v (0 waist .. 1 shoulders), sideways xo, behind/front zo, with the twist
    var chestY = pelvisY + 43, lean = 11 * stn + 16 * scr;
    function bp(v, xo, zo, yo) { return [lerp(swayX, swayX * .7, v) + xo, lerp(pelvisY + 3, chestY, v) + (yo || 0), lerp(0, 2.4 + lean, v) + (zo || 0) + lerp(-(xo / 8) * 3.4, (xo / 21) * 5.8, v) * tw]; }
    // arms: swing against the legs, elbows bending
    var thL = -.62 * aa * cg + Math.sin(t * .9) * .03 * idle, thR = .30 * aa * cg + Math.sin(t * .9 + 1) * .03 * idle;
    function arm(side, th, b0) {
      var sp = bp(1, side * 21, 0, -3), el = [sp[0] + side * (3.2 + 9 * brg), sp[1] - 29 * Math.cos(th), sp[2] + 29 * Math.sin(th)], bth = th + b0, wr = [el[0] - side * .6, el[1] - 27 * Math.cos(bth), el[2] + 27 * Math.sin(bth)];
      return { sh: sp, el: el, wr: wr, side: side };
    }
    thL = lerp(thL, 1.45 + .5 * cg, scr) * (1 - .3 * stn) + brg * -.5; thR = lerp(thR, 1.45 - .5 * cg, scr) * (1 - .3 * stn) + brg * .5;
    var AL = arm(-1, thL, .22 + .55 * Math.max(0, thL) + .18 * aa + .5 * stn), AR = arm(1, thR, .45 + .3 * aa + .4 * stn);
    function drawArm(A) { var p0 = P(A.sh), p1 = P(A.el), p2 = P(A.wr); seg(p0, p1, 14, [60, 68, 138], false); seg(p1, p2, 12, [70, 78, 152], false); seg(p0, p1, 11, [72, 80, 152], A.side > 0); seg(p1, p2, 9.5, [82, 92, 170], A.side > 0); ctx.fillStyle = "rgb(52,42,62)"; ctx.beginPath(); ctx.ellipse(p2[0], p2[1], 5.6, 5.8, 0, 0, 6.2832); ctx.fill(); }
    // the staff, held in the right hand, lifting and planting with each step
    var wR = AR.wr, dirX = .05 + .08 * wd, dirZ = .1 + thR * .35, dl = Math.sqrt(dirX * dirX + 1 + dirZ * dirZ), sd = [dirX / dl, 1 / dl, dirZ / dl], plant = Math.max(0, cg) * 7 * aa;
    var stTop = [wR[0] + sd[0] * 62, wR[1] + sd[1] * 62, wR[2] + sd[2] * 62], k0 = wR[1] / sd[1] - plant, stBot = [wR[0] - sd[0] * k0, wR[1] - sd[1] * k0, wR[2] - sd[2] * k0];
    function drawStaff() { var a = P(stBot), b = P(stTop); seg(a, b, 3.4, [150, 120, 96], true); var pn = clamp(wd, -1, 1) * 15, pf = Math.sin(t * 6.5) * 2.2 * (.4 + gust); ctx.fillStyle = "rgb(226,230,246)"; ctx.beginPath(); ctx.moveTo(b[0], b[1] + 2); ctx.quadraticCurveTo(b[0] + pn * .5, b[1] + pf, b[0] + pn + 4 * Math.sign(wd || 1), b[1] + 2 + pf * 1.3); ctx.quadraticCurveTo(b[0] + pn * .5, b[1] + 8 - pf, b[0], b[1] + 8); ctx.closePath(); ctx.fill(); }
    function drawTorso() {
      var q = [bp(0, -17, 0), bp(0, 17, 0), bp(1, 22, 0), bp(1, -22, 0)].map(P);
      // the pack on his back: a rounded box, its back face and whichever side shows
      var pk = [[-15, .12], [15, .12], [15, .9], [-15, .9]].map(function (c) { return bp(c[1], c[0], -10); }), pf = [[-15, .12], [15, .12], [15, .9], [-15, .9]].map(function (c) { return bp(c[1], c[0], -1); });
      part(q, [92, 98, 156], [66, 70, 122]);
      var coat = [bp(.1, -17, 0), bp(.1, 17, 0), bp(1, 21, 0), bp(1, -21, 0)].map(P); part(coat, [178, 102, 70], [122, 70, 58]);
      var rimQ = [bp(.1, 16, 0), bp(.1, 17.5, 0), bp(1, 21.5, 0), bp(1, 19.5, 0)].map(P); part(rimQ, [255, 200, 150], [240, 170, 130]);
      if (syw > 0) { var side = [pk[1], pf[1], pf[2], pk[2]].map(P); part(side, [150, 86, 62], [100, 60, 52]); } else { var sideL = [pk[0], pf[0], pf[3], pk[3]].map(P); part(sideL, [150, 86, 62], [100, 60, 52]); }
      part(pk.map(P), [190, 112, 76], [136, 80, 62]); var strap = [bp(.9, -3, -10.5), bp(.9, 3, -10.5), bp(.12, 3, -10.5), bp(.12, -3, -10.5)].map(P); part(strap, [100, 58, 52], [84, 48, 46]);
      var roll = [bp(.9, -16, -10, 6), bp(.9, 16, -10, 6), bp(.9, 16, -10, -2), bp(.9, -16, -10, -2)].map(P); part(roll, [212, 130, 86], [190, 112, 76]);
      var belt = [bp(.02, -17, 0), bp(.02, 17, 0), bp(.12, 17, 0), bp(.12, -17, 0)].map(P); part(belt, [58, 62, 110], [44, 46, 86]);
      var sq = [bp(.98, -22, 0, 2), bp(.98, 22, 0, 2), bp(1, 22, 0, -7), bp(1, -22, 0, -7)].map(P); part(sq, [118, 130, 206], [82, 92, 170]);
    }
    // draw far to near: legs, the arm behind, the torso, the arm in front
    var legs = [[LL, [52, 54, 102], [34, 34, 68], false], [LR, [58, 60, 112], [38, 38, 74], true]].sort(function (a, b) { return P(b[0].knee)[2] - P(a[0].knee)[2]; }); legs.forEach(function (l) { drawLeg(l[0], l[1], l[2], l[3]); });
    var armsOrd = [AL, AR].sort(function (a, b) { return P(b.el)[2] - P(a.el)[2]; });
    armsOrd.forEach(function (A) { if (P(A.el)[2] > P(bp(.5, 0, 0))[2]) { if (A === AR) drawStaff(); drawArm(A); } });
    drawTorso();
    armsOrd.forEach(function (A) { if (P(A.el)[2] <= P(bp(.5, 0, 0))[2]) { if (A === AR) drawStaff(); drawArm(A); } });
    // the head: it stays steadier than the body, glances about, and turns with the pole of the wind
    var nk = P([swayX * .5, pelvisY * .5 + 42 + 43 - 4 - 5 * stn, 3 + lean * .9]), look = Math.sin(t * .55) * .09 + Math.sin(t * 1.3) * .03, tilt = -sg * .04 * aa, headR = look + tilt + .16 * stn + .1 * scr;
    ctx.save(); ctx.translate(nk[0], nk[1] + 135 + 0 * Math.abs(cg)); ctx.translate(0, -134); ctx.rotate(headR + Math.sin(t * 2.3) * .004); ctx.translate(0, 134);
    ctx.translate(Math.sin(headR) * 2 + yaw * 2.5, 0);
    RIMf(RIM);
    function RIMf() {}
    part([[-5, -132], [5, -132], [6, -139], [-6, -139]], [156, 104, 104], [132, 88, 92]); part(ell(0, -151, 11.5, 12.5, 28), [66, 108, 130], [40, 70, 94]); part([[-11, -146], [11, -146], [10, -138], [-10, -138]], [58, 44, 62], [44, 34, 52]); part([[-11.5, -153], [11.5, -153], [11, -150], [-11, -150]], [100, 150, 170], [86, 132, 156]);
    var cres = []; for (var i = 0; i < 12; i++) { var q = -1.2 + 1.7 * i / 11; cres.push([11.5 * Math.cos(q), -151 + 12.5 * Math.sin(q)]); } for (i = 0; i < 12; i++) { q = .5 - 1.7 * i / 11; cres.push([9.2 * Math.cos(q), -151 + 10 * Math.sin(q)]); } part(cres, [255, 232, 214], RIM);
    part([[-13, -135], [13, -135], [15, -126], [-15, -126]], [252, 62, 52], [206, 34, 40]);
    // the scarf: a ribbon of points along a travelling wave, streaming whichever way the wind blows (and hanging when it drops)
    var N = 12, up = [], dn = [], len = (66 + gust * 34) * Math.abs(wd) + 20, sgn = wd < 0 ? -1 : 1, hang = (1 - clamp(Math.abs(wd), 0, 1)) * 26, k;
    for (k = 0; k <= N; k++) { var u = k / N, wv = Math.sin(t * 6.2 - u * 5.5 + pose.ph * .5) * (1.5 + 8 * u) * (.5 + gust * .9 + aa * .3), px = 4 * sgn + sgn * len * u, py = -131 - 9 * u * Math.abs(wd) * (1 + gust) + hang * u * u + wv, wid = 8 * (1 - u * .55); up.push([px, py - wid * .5]); dn.push([px, py + wid * .5]); }
    part(up.concat(dn.slice().reverse()), [255, 74, 60], [208, 36, 42]);
    var rib2 = []; for (k = 2; k < N - 1; k++) rib2.push([up[k][0], up[k][1] + 1.5]); for (k = N - 2; k >= 2; k--) rib2.push([dn[k][0], dn[k][1] - 1.5]); part(rib2, [255, 112, 96], [242, 86, 74]);
    ctx.restore(); ctx.restore();
  }

  // path of the climber: grass to the first stone, then stone to stone up the river, then wading into the fog
  var NODES = ROUTE.map(function (p, i) { return { x: p[0], v: p[1] / DH, k: "grass" }; });
  var NN = NODES.length;
  var hero = { pos: 0, target: 0, ph: 0, amp: 0, vel: 0, moving: false, yaw: .16 };
  function chase(h, target, dt, vmax) {                                 // follow a target with a limited, smoothed speed; the walk amplitude follows the speed
    var want = clamp((target - h.pos) * 4, -vmax, vmax); h.vel += (want - h.vel) * (1 - Math.pow(.004, dt)); if (Math.abs(target - h.pos) < .004 && Math.abs(h.vel) < .02) h.vel = 0; h.pos += h.vel * dt;
    h.moving = Math.abs(h.vel) > .12; h.amp += (clamp(Math.abs(h.vel) / .9, 0, 1) - h.amp) * (1 - Math.pow(.0006, dt));
  }
  function heroYaw(pos) { pos = clamp(pos, 0, NN - 1.001); var i = Math.min(NN - 2, Math.max(0, Math.floor(pos))), a = NODES[i], b = NODES[i + 1], dx = b.x - a.x, dy = (b.v - a.v) * DH; return Math.atan2(dx, -dy * 1.7); }
  function heroPos(pos) { pos = clamp(pos, 0, NN - 1.001); var i = Math.min(NN - 2, Math.max(0, Math.floor(pos))), f = clamp(pos - i, 0, 1), a = NODES[i], b = NODES[i + 1]; return { x: lerp(a.x, b.x, f), v: lerp(a.v, b.v, f), f: f, i: i, hop: 0 }; }   // a steady walk: one footstep per stone, no hop

  // ───────────── fireflies, birds, dust, sky mist ─────────────
  var flies = [], birds = [], dust = [], haloSpr = document.createElement("canvas"), coreSpr = document.createElement("canvas");
  (function () {
    haloSpr.width = haloSpr.height = 64; var g = haloSpr.getContext("2d"), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, "rgba(255,206,160,.55)"); rg.addColorStop(.4, "rgba(255,206,160,.2)"); rg.addColorStop(1, "rgba(255,206,160,0)"); g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
    coreSpr.width = coreSpr.height = 16; g = coreSpr.getContext("2d"); rg = g.createRadialGradient(8, 8, 0, 8, 8, 8); rg.addColorStop(0, "rgba(255,240,216,1)"); rg.addColorStop(.5, "rgba(255,230,196,.7)"); rg.addColorStop(1, "rgba(255,230,196,0)"); g.fillStyle = rg; g.fillRect(0, 0, 16, 16);
    var r = mulberry(21); for (var k = 0; k < (small ? 60 : 110); k++) { var y = DH * (.31 + r() * .61), tt = Math.pow((y - DH * .31) / (DH * .61), 1.15); flies.push({ x: X0 + r() * (X1 - X0), y: y, vx: 8 + r() * 10, vy: 0, ph: r() * 6.28, sp: .6 + r() * 1.3, t: tt, f: lerp(.35, 1.15, tt), wob: r() * 6.28, lit: 0 }); }
    for (k = 0; k < 7; k++) birds.push({ x: r() * DW, y: DH * (.05 + r() * .12), sz: 9 + r() * 8, v: 18 + r() * 22, ph: r() * 6.28, sing: 0 });
    for (k = 0; k < 90; k++) dust.push({ x: X0 + r() * (X1 - X0), y: r() * DH, f: .2 + r() * 1.0, vx: 4 + r() * 8, vy: -2 + r() * 4, ph: r() * 6.28, sz: .8 + r() * 1.6 });
  })();

  // fog layers, back to front (the band fogs are added with each band above)
  [[.18, .20, .28, .09, [240, 208, 206], .26, 5], [.12, .26, .12, .08, [240, 208, 206], .24, 8], [.26, .14, .22, .08, [240, 208, 206], .22, 3]].forEach(function (q, i) { addFog({ f: .03 + i * .01, y: DH * q[0], up: DH * q[2] * .5, down: DH * q[2] * .5, col: q[4], peak: 1, a: q[5], speed: q[6], off: i * 701, seed: 70 + i, sky: true }); });
  var fogMount = addFog({ f: .08, y: DH * .265, up: DH * .16, down: DH * .05, col: [226, 184, 188], peak: 1, a: .78, speed: 4, off: 120, seed: 90 });
  var fogSeam = addFog({ f: .9, y: DH * .594, up: DH * .15, down: DH * .085, col: [196, 148, 172], peak: 1, a: .88, speed: 9, off: 400, seed: 91 });
  var fogLow = addFog({ f: 1.0, y: DH * .63, up: DH * .06, down: DH * .05, col: [150, 112, 156], peak: 1, a: .46, speed: 14, off: 800, seed: 92 });
  var fogFront = addFog({ f: 1.15, y: DH * .93, up: DH * .10, down: DH * .12, col: [170, 128, 168], peak: 1, a: .34, speed: 22, off: 1200, seed: 93 });
  var fogRiver = addFog({ f: 1.0, y: DH * .78, up: DH * .07, down: DH * .09, col: [210, 170, 184], peak: 1, a: .40, speed: 17, off: 300, seed: 94 });
  var riseFogs = [[.5, 500, [226, 184, 196]], [.8, 700, [206, 164, 184]], [1.1, 900, [196, 150, 176]], [1.4, 1100, [214, 172, 192]], [.65, 800, [230, 192, 200]], [1.25, 1000, [190, 146, 172]]].map(function (q, k) {
    return addFog({ f: q[0], y: 540 - gvOf(q[0]) * q[1] + 80, up: DH * .17, down: DH * .15, col: q[2], peak: 1, a: .95, speed: 26 + k * 7, off: k * 517, seed: 120 + k, late: true });
  });
  var skyFogs = fogs.filter(function (o) { return o.sky; });


  // ═════════════ SCENE 2 · one mountain, three climates: dunes, rock in a storm, snow. The trail rises and falls, crosses a ravine on a rope bridge, climbs cliffs. ═════════════
  function h2(x, y) { var q = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return q - Math.floor(q); }
  function vnz(x, y) { var xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi); return lerp(lerp(h2(xi, yi), h2(xi + 1, yi), xf), lerp(h2(xi, yi + 1), h2(xi + 1, yi + 1), xf), yf); }
  function ridgedN(x, y, oct) { var sum = 0, amp = 1, f = 1, norm = 0; for (var i = 0; i < oct; i++) { var n = 1 - Math.abs(2 * vnz(x * f + i * 13.1, y * f - i * 7.7) - 1); sum += amp * n * n; norm += amp; amp *= .5; f *= 2.1; } return sum / norm; }
  var TN = small ? 44 : 56, TR = 1250, TCELL = 2 * TR / TN, TH = 1500, FIG = 135, SPC = 10, STEPW = FIG * 54 / 150, TURNS = 1.12;
  function trailXZ(u) { var th = .35 - u * 6.2832 * TURNS, r = 1000 - 720 * u + 34 * Math.sin(u * 19) + 20 * Math.sin(u * 41 + 1); return [r * Math.cos(th), r * Math.sin(th)]; }
  function trailTan(u) { var a = trailXZ(u - .002), b = trailXZ(u + .002), dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; }
  // what the trail has to deal with: hills and dips, a ravine, cliff steps
  var HILLS = [[.05, 46, 70], [.10, -36, 60], [.16, 56, 80], [.21, -30, 55], [.37, 64, 60], [.43, -50, 55], [.52, 60, 70], [.58, -44, 50], [.66, 52, 70], [.73, -32, 60], [.80, 48, 70], [.90, -30, 60]].map(function (q) { var c = trailXZ(q[0]); return { x: c[0], z: c[1], a: q[1], s2: 2 * q[2] * q[2] }; });
  var RAVU = .30, RAVC = trailXZ(RAVU), RAVT = trailTan(RAVU), RAVA = [-RAVT[1], RAVT[0]];
  var CLIFFS = [[.46, 90], [.60, 100], [.84, 80]].map(function (q) { var c = trailXZ(q[0]), t = trailTan(q[0]); return { x: c[0], z: c[1], tx: t[0], tz: t[1], ax: -t[1], az: t[0], h: q[1] }; });
  function terrainH(x, z) {
    var r = Math.sqrt(x * x + z * z), a = Math.atan2(z, x), wob = 1 + .14 * Math.sin(a * 3 + 1) + .08 * Math.sin(a * 5 - .6) + .05 * Math.sin(a * 8 + 2), k = Math.max(0, 1 - r / (1050 * wob));
    var h = TH * Math.pow(k, 1.55) + ridgedN(x * .0024, z * .0024, 4) * 360 * Math.pow(k, .8) + ridgedN(x * .0078, z * .0078, 3) * 110 * Math.pow(k, .9) + (vnz(x * .02, z * .02) - .5) * 30 * k;
    var dz = clamp(1 - h / 320, 0, 1), ax = x * .9 + z * .43; h += dz * (36 * (1 - Math.pow(Math.abs(Math.sin(ax * .0078 + 2.5 * vnz(x * .0028, z * .0028))), 1.4)) + 12 * Math.sin(x * .02 + z * .013));     // dunes at the foot
    for (var i = 0; i < HILLS.length; i++) { var hl = HILLS[i], d2 = (x - hl.x) * (x - hl.x) + (z - hl.z) * (z - hl.z); if (d2 < hl.s2 * 6) h += hl.a * Math.exp(-d2 / hl.s2); }
    var t = (x - RAVC[0]) * RAVT[0] + (z - RAVC[1]) * RAVT[1], aa = (x - RAVC[0]) * RAVA[0] + (z - RAVC[1]) * RAVA[1];
    h -= 215 * (1 - sm((Math.abs(t) - 38) / 34)) * (1 - sm((Math.abs(aa) - 210) / 130));                                         // the ravine
    for (i = 0; i < CLIFFS.length; i++) { var c = CLIFFS[i], tt = (x - c.x) * c.tx + (z - c.z) * c.tz, au = (x - c.x) * c.ax + (z - c.z) * c.az; h += c.h * sm((tt + 22) / 46) * (1 - sm((tt - 320) / 170)) * (1 - sm((Math.abs(au) - 190) / 110)); }
    return Math.max(6, h) + 5 * vnz(x * .011, z * .011);
  }
  var TH_ = new Float32Array((TN + 1) * (TN + 1)), i_, j_; for (i_ = 0; i_ <= TN; i_++) for (j_ = 0; j_ <= TN; j_++) TH_[i_ * (TN + 1) + j_] = terrainH(-TR + i_ * TCELL, -TR + j_ * TCELL);
  function surfY(x, z) {
    var ix = clamp((x + TR) / TCELL, 0, TN - .001), iz = clamp((z + TR) / TCELL, 0, TN - .001), i = Math.floor(ix), j = Math.floor(iz), fx = ix - i, fz = iz - j, W = TN + 1, h00 = TH_[i * W + j], h10 = TH_[(i + 1) * W + j], h01 = TH_[i * W + j + 1], h11 = TH_[(i + 1) * W + j + 1];
    return fx >= fz ? h00 + (h10 - h00) * fx + (h11 - h10) * fz : h00 + (h11 - h01) * fx + (h01 - h00) * fz;
  }
  // the palette: sand and sandstone, then dark wet rock, then snow and ice; lit from one side, in ten steps of haze
  var T_ARID = [[232, 170, 108], [214, 132, 82], [190, 104, 66], [242, 192, 134], [168, 90, 62]], T_ROCK = [[92, 90, 118], [80, 80, 106], [106, 102, 126], [68, 68, 94], [90, 86, 110]], T_SNOW = [[236, 240, 250], [222, 230, 246], [244, 244, 252], [212, 222, 242], [228, 232, 248]], T_HAZE = [236, 184, 164], NF = 10, NLIT = 7, NMT = 7;
  var T_PAL = []; (function () { for (var b = 0; b < 5; b++) for (var l = 0; l < NLIT; l++) for (var m = 0; m < NMT; m++) { var z = m / (NMT - 1) * 2, base = z < 1 ? mixc(T_ARID[b], T_ROCK[b], z) : mixc(T_ROCK[b], T_SNOW[b], z - 1), sh = lerp(.42 + .72 * l / (NLIT - 1), .7 + .46 * l / (NLIT - 1), clamp(z - 1, 0, 1)), col = base.map(function (v) { return v * sh; }); for (var f = 0; f < NF; f++) T_PAL.push(css(mixc(col, T_HAZE, Math.pow(f / (NF - 1), .9) * .96))); } })();
  var TSUN = (function () { var v = [.6, .55, -.58], l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; })();
  var TC = new Uint16Array(TN * TN * 2), TY = new Float32Array(TN * TN);
  (function () {
    var W = TN + 1;
    for (var i = 0; i < TN; i++) for (var j = 0; j < TN; j++) {
      var x0 = -TR + i * TCELL, z0 = -TR + j * TCELL, h00 = TH_[i * W + j], h10 = TH_[(i + 1) * W + j], h01 = TH_[i * W + j + 1], h11 = TH_[(i + 1) * W + j + 1], tris = [[[0, h00, 0], [TCELL, h10, 0], [TCELL, h11, TCELL]], [[0, h00, 0], [TCELL, h11, TCELL], [0, h01, TCELL]]];
      TY[i * TN + j] = (h00 + h10 + h01 + h11) / 4;
      for (var t = 0; t < 2; t++) {
        var A = tris[t][0], B = tris[t][1], C = tris[t][2], ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, nl = Math.hypot(nx, ny, nz) || 1;
        if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; } var lit = clamp((nx * TSUN[0] + ny * TSUN[1] + nz * TSUN[2]) / nl, 0, 1), L = clamp(Math.round(lit * (NLIT - 1) * 1.05 + (h2(i * 3.1, j * 1.7 + t) - .5) * .7), 0, NLIT - 1);
        var hm = (A[1] + B[1] + C[1]) / 3, nz2 = (vnz(x0 * .006, z0 * .006) - .5) * 150, zf = sm((820 - Math.hypot(x0 + TCELL / 2, z0 + TCELL / 2) + nz2) / 90) + sm((560 - Math.hypot(x0 + TCELL / 2, z0 + TCELL / 2) + nz2) / 80), band = (((Math.floor(hm / 52 + vnz((x0 + 300) * .004, (z0 + 300) * .004) * 1.6) % 5) + 5) % 5), mt = clamp(Math.round(zf / 2 * (NMT - 1)), 0, NMT - 1);
        TC[(i * TN + j) * 2 + t] = ((band * NLIT + L) * NMT + mt) * NF;
      }
    }
  })();
  // the trail, sampled evenly and laid on the faceted ground; across the ravine it becomes a rope bridge
  var TRAIL = (function () {
    var dense = [], n = 3600, u, i, k; for (k = 0; k <= n; k++) { u = k / n; dense.push(trailXZ(u)); }
    var pts = [], acc = 0, prev = dense[0], next = SPC; pts.push([prev[0], prev[1]]);
    for (i = 1; i < dense.length; i++) { var d = dense[i], dl = Math.hypot(d[0] - prev[0], d[1] - prev[1]); acc += dl; if (acc >= next) { pts.push([d[0], d[1]]); next += SPC; } prev = d; }
    var ya = surfY(RAVC[0] - RAVT[0] * 78, RAVC[1] - RAVT[1] * 78) + 1.6, yb = surfY(RAVC[0] + RAVT[0] * 78, RAVC[1] + RAVT[1] * 78) + 1.6;
    var P = [], bridge = [];
    pts.forEach(function (q) { var t = (q[0] - RAVC[0]) * RAVT[0] + (q[1] - RAVC[1]) * RAVT[1], aa = (q[0] - RAVC[0]) * RAVA[0] + (q[1] - RAVC[1]) * RAVA[1], br = Math.abs(t) < 70 && Math.abs(aa) < 90, y = surfY(q[0], q[1]) + 1.6; if (br) { var f = (t + 70) / 140; y = lerp(ya, yb, f) - 9 * Math.sin(Math.PI * f); } P.push([q[0], y, q[1]]); bridge.push(br ? 1 : 0); });
    var segs = [], cells = {}, flags = [];
    for (i = 0; i < P.length - 1; i++) {
      var a = P[i], b = P[i + 1], tx = b[0] - a[0], tz = b[2] - a[2], tl = Math.hypot(tx, tz) || 1, br2 = bridge[i], hw = br2 ? 15 : 13, nx = -tz / tl * hw, nz = tx / tl * hw;
      var q4 = [[a[0] + nx, 0, a[2] + nz], [a[0] - nx, 0, a[2] - nz], [b[0] - nx, 0, b[2] - nz], [b[0] + nx, 0, b[2] + nz]].map(function (c, ci) { c[1] = br2 ? (ci < 2 ? a[1] : b[1]) : surfY(c[0], c[2]) + 1.8; return c; });
      var ci = clamp(Math.floor(((a[0] + b[0]) / 2 + TR) / TCELL), 0, TN - 1), cj = clamp(Math.floor(((a[2] + b[2]) / 2 + TR) / TCELL), 0, TN - 1), key = ci * TN + cj; (cells[key] = cells[key] || []).push(segs.length); segs.push({ q: q4, br: br2, i: i });
      flags.push({ br: br2, slope: (b[1] - a[1]) / SPC });
    }
    var len = (P.length - 1) * SPC; return { P: P, segs: segs, cells: cells, len: len, steps: len / STEPW, flags: flags };
  })();
  function trailAt(sSteps) { var f = clamp(sSteps * STEPW / SPC, 0, TRAIL.P.length - 1.001), i = Math.floor(f), t = f - i, a = TRAIL.P[i], b = TRAIL.P[i + 1]; return { x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t), z: lerp(a[2], b[2], t), tx: b[0] - a[0], tz: b[2] - a[2], u: f / (TRAIL.P.length - 1), i: i }; }
  // boulders beside and on the trail, each belonging to a ground cell so they sit in the right place in the painting order
  var BOULDERS = (function () {
    var r = mulberry(909), out = [], cells = {}; for (var k = 0; k < 46; k++) { var u = .03 + .94 * (k + r() * .8) / 46, c = trailXZ(u), tg = trailTan(u), off = (r() < .35 ? 1 : 1.9 + r() * 2.2) * (r() < .5 ? -1 : 1) * 22, x = c[0] - tg[1] * off, z = c[1] + tg[0] * off, sz = 12 + r() * 26 + (r() < .12 ? 24 : 0), poly = []; for (var m = 0; m < 7; m++) poly.push([Math.cos(m / 7 * 6.2832 + k) * (.75 + r() * .4), Math.sin(m / 7 * 6.2832 + k) * (.62 + r() * .35)]);
      var ci = clamp(Math.floor((x + TR) / TCELL), 0, TN - 1), cj = clamp(Math.floor((z + TR) / TCELL), 0, TN - 1), key = ci * TN + cj, b = { x: x, y: surfY(x, z), z: z, sz: sz, poly: poly, tone: r() }; (cells[key] = cells[key] || []).push(b); out.push(b); }
    return { list: out, cells: cells };
  })();
  var RINGS = [{ R: 4200, h: 760, c: [214, 160, 156], f: .62, seed: 31 }, { R: 6200, h: 1100, c: [226, 180, 170], f: .8, seed: 32 }];
  RINGS.forEach(function (rg) { var r = mulberry(rg.seed); rg.pts = []; for (var k = 0; k < 90; k++) rg.pts.push(rg.h * (.28 + .72 * Math.pow(vnz(k * .32, rg.seed), 1.2)) * (.8 + .4 * r())); });
  var C3 = { p: [0, 0, 0], f: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0], fl: 800, cx: 0, cy: 0 }, T_PX = new Float32Array((TN + 1) * (TN + 1)), T_PY = new Float32Array((TN + 1) * (TN + 1)), T_PZ = new Float32Array((TN + 1) * (TN + 1)), T_OI = [], T_OJ = [];
  function cam3(tg, az, el, dist) {
    var ce = Math.cos(el), se = Math.sin(el), p = [tg[0] + dist * ce * Math.cos(az), tg[1] + dist * se, tg[2] + dist * ce * Math.sin(az)], fx = tg[0] - p[0], fy = tg[1] - p[1], fz = tg[2] - p[2], fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
    var rx = -fz, rz = fx, rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
    C3.p = p; C3.f = [fx, fy, fz]; C3.r = [rx, 0, rz]; C3.u = [-fy * rz, fx * rz - fz * rx, fy * rx]; C3.fl = CH * 1.05; C3.cx = innerWidth < innerHeight * 1.1 ? CW * .5 : CW * .36; C3.cy = innerWidth < innerHeight * 1.1 ? CH * .62 : CH * .56;
  }
  function pr(x, y, z, out) { var vx = x - C3.p[0], vy = y - C3.p[1], vz = z - C3.p[2], zc = vx * C3.f[0] + vy * C3.f[1] + vz * C3.f[2]; out[2] = zc; out[0] = C3.cx + C3.fl * (vx * C3.r[0] + vy * C3.r[1] + vz * C3.r[2]) / zc; out[1] = C3.cy - C3.fl * (vx * C3.u[0] + vy * C3.u[1] + vz * C3.u[2]) / zc; }
  var uRock = 0.4, uSnow = 0.75;
  var hero2 = { pos: 0, vel: 0, amp: 0, moving: false, ph: 0, yaw: -1.2, target: 0, sc: 0, br: 0 }, W2 = { storm: 0, snow: 0, clock: 0, nextBolt: 5, bolt: -9, thunderAt: -1, nextRock: 4, zone: "dunes" };
  var fogHaze = addFog({ f: .05, g: 0, y: 300, up: 140, down: 80, col: [255, 214, 186], peak: 1, a: .6, speed: 5, off: 70, seed: 220 }), fogMid = addFog({ f: .05, g: 0, y: 600, up: 130, down: 130, col: [236, 186, 176], peak: 1, a: .5, speed: 9, off: 400, seed: 221 });
  var fogHazeS = addFog({ f: .05, g: 0, y: 300, up: 140, down: 80, col: [86, 76, 112], peak: 1, a: .7, speed: 11, off: 170, seed: 222 }), fogMidS = addFog({ f: .05, g: 0, y: 600, up: 130, down: 130, col: [70, 62, 96], peak: 1, a: .6, speed: 16, off: 500, seed: 223 }), fogHazeN = addFog({ f: .05, g: 0, y: 300, up: 140, down: 80, col: [232, 238, 250], peak: 1, a: .3, speed: 3, off: 270, seed: 224 }), fogMidN = addFog({ f: .05, g: 0, y: 600, up: 130, down: 130, col: [220, 228, 246], peak: 1, a: .22, speed: 5, off: 600, seed: 225 });
  var dust2 = []; (function () { var r = mulberry(333); for (var k = 0; k < 60; k++) dust2.push({ x: r(), y: r(), v: .01 + r() * .03, sz: .8 + r() * 2.2, ph: r() * 6.28 }); })();
  var rain = [], snowF = [], rocksFalling = []; (function () { var r = mulberry(717), k; for (k = 0; k < (small ? 110 : 190); k++) rain.push({ x: r(), y: r(), v: .9 + r() * .7, len: 16 + r() * 26, w: r() }); for (k = 0; k < (small ? 110 : 190); k++) snowF.push({ x: r(), y: r(), v: .035 + r() * .07, sz: .9 + r() * 2.8, ph: r() * 6.28 }); })();
  var hawks = [{ ph: 0, r: .22, y: .2, sz: 18 }, { ph: 2.6, r: .16, y: .3, sz: 13 }], tmpA = [0, 0, 0], tmpB = [0, 0, 0], tmpC = [0, 0, 0], tmpD = [0, 0, 0], rainSeed = mulberry(5);
  function zoneColor(b) { var r = Math.hypot(b.x, b.z); return sm((820 - r) / 90) + sm((560 - r) / 80); }
  function drawBoulder(b, lvl) {
    pr(b.x, b.y + b.sz * .25, b.z, tmpA); if (tmpA[2] < 60) return; var sc = C3.fl * b.sz / tmpA[2], zf = zoneColor(b), base = zf < 1 ? mixc([176, 128, 96], [74, 72, 98], zf) : mixc([74, 72, 98], [226, 232, 246], zf - 1), hz = Math.pow(lvl / (NF - 1), .9) * .96;
    ctx.fillStyle = css(mixc(base.map(function (v) { return v * (.8 + .25 * b.tone); }), T_HAZE, hz)); ctx.beginPath(); b.poly.forEach(function (q, i) { var x = tmpA[0] + q[0] * sc, y = tmpA[1] - q[1] * sc * .8; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill();
    ctx.fillStyle = css(mixc(base.map(function (v) { return Math.min(255, v * 1.28); }), T_HAZE, hz)); ctx.beginPath(); [0, 1, 2, 3].forEach(function (i) { var q = b.poly[i], x = tmpA[0] + q[0] * sc * .86, y = tmpA[1] - q[1] * sc * .7 - sc * .12; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill();
  }
  function drawScene2(t, dt, q, gust0) {
    var W = TN + 1, prevPos = hero2.pos, now = trailAt(hero2.pos); W2.clock += dt;
    var k = 1 - Math.pow(.25, dt), fr = hero2.pos / (TRAIL.steps - 1); W2.storm += (sm((fr - uRock + .02) / .05) * (1 - sm((fr - uSnow + .05) / .06)) - W2.storm) * k; W2.snow += (sm((fr - uSnow + .01) / .06) - W2.snow) * k;
    var storm = W2.storm, snow = W2.snow, gust = Math.max(gust0, storm * (.85 + .15 * Math.sin(W2.clock * 1.3)));
    var fl = TRAIL.flags[clamp(Math.round(hero2.pos * STEPW / SPC), 0, TRAIL.flags.length - 1)]; hero2.sc += (clamp((fl.slope - .5) / .55, 0, 1) - hero2.sc) * (1 - Math.pow(.05, dt)); hero2.br += (fl.br - hero2.br) * (1 - Math.pow(.05, dt));
    if (HERO_DBG != null) { hero2.pos = HERO_DBG * (TRAIL.steps - 1); hero2.vel = 0; }
    hero2.target = clamp(q / .985, 0, 1) * (TRAIL.steps - 1); chase(hero2, hero2.target, dt, 2.7 * (1 - .42 * storm) * (1 - .35 * hero2.sc) * (1 - .2 * hero2.br) * (FASTT ? 6 : 1));
    var kind = hero2.br > .5 ? "wood" : (snow > .5 ? "snow" : (storm > .3 ? "stone" : (fr < uRock ? "sand" : "stone")));
    if (hero2.vel > .25 && Math.floor(hero2.pos + 1e-6) > Math.floor(prevPos + 1e-6) && window.Snd) Snd.step(kind, .75, 0);
    W2.zone = snow > .5 ? "the snow" : (storm > .35 ? "the rock and the storm" : (hero2.br > .5 ? "the rope bridge" : "the dunes"));
    var hp = trailAt(hero2.pos), ahead = trailAt(hero2.pos + 6), el = lerp(.60, .30, sm(q)), az = Math.atan2(hp.z, hp.x) + lerp(.95, -.5, sm(q)) + .22 * Math.sin(q * 9), dist = lerp(1500, 950, sm(q));
    cam3([lerp(lerp(hp.x, ahead.x, .5), 0, .45), hp.y * .85 + 150, lerp(lerp(hp.z, ahead.z, .5), 0, .45)], az, el, dist);
    if (storm > .1) { var sh = storm * (1.5 + gust * 2); C3.cx += Math.sin(W2.clock * 31) * sh * DPR; C3.cy += Math.sin(W2.clock * 27 + 1) * sh * DPR; }
    // lightning: a flash, then thunder after the distance
    if (window.frozenForTest !== true && storm > .5 && W2.clock > W2.nextBolt) { W2.bolt = W2.clock; W2.nextBolt = W2.clock + 3.5 + rainSeed() * 6; W2.thunderAt = W2.clock + .35 + rainSeed() * 1.6; if (window.Snd) Snd.crack(.4 + rainSeed() * .4, rainSeed() * 1.6 - .8); }
    if (W2.thunderAt > 0 && W2.clock > W2.thunderAt) { W2.thunderAt = -1; if (window.Snd) Snd.thunder(.7 + rainSeed() * .5, rainSeed() * 1.4 - .7); }
    var e1 = W2.clock - W2.bolt, flash = Math.max(e1 < 0 ? 0 : Math.exp(-e1 * 8), e1 - .16 < 0 ? 0 : .7 * Math.exp(-(e1 - .16) * 7)) * storm;
    var f = C3.fl, horizon = C3.cy - f * Math.tan(el), hazeC = mixc(mixc(T_HAZE, [100, 92, 124], storm), [212, 220, 238], snow);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = css(hazeC); ctx.fillRect(0, 0, CW, CH);
    if (horizon > -CH * .05) { var sg = ctx.createLinearGradient(0, horizon - CH * 1.0, 0, horizon); sg.addColorStop(0, css(mixc(mixc([162, 116, 148], [44, 40, 66], storm), [150, 168, 204], snow))); sg.addColorStop(.5, css(mixc(mixc([226, 168, 158], [74, 68, 98], storm), [196, 208, 230], snow))); sg.addColorStop(1, css(hazeC)); ctx.fillStyle = sg; ctx.fillRect(0, 0, CW, Math.max(0, horizon + 2)); }
    pr(C3.p[0] + TSUN[0] * 30000, C3.p[1] + TSUN[1] * 30000 * .7, C3.p[2] + TSUN[2] * 30000, tmpA);
    var sunA = (1 - storm) * (1 - snow * .55); if (tmpA[2] > 0 && sunA > .02) { ctx.globalAlpha = sunA; var rr = CH * .62, g2 = ctx.createRadialGradient(tmpA[0], tmpA[1], 0, tmpA[0], tmpA[1], rr); g2.addColorStop(0, "rgba(255,246,222,.95)"); g2.addColorStop(.1, "rgba(255,236,196,.7)"); g2.addColorStop(.4, "rgba(255,214,160,.22)"); g2.addColorStop(1, "rgba(255,214,160,0)"); ctx.fillStyle = g2; ctx.fillRect(tmpA[0] - rr, tmpA[1] - rr, rr * 2, rr * 2); ctx.fillStyle = "rgb(255,250,236)"; ctx.beginPath(); ctx.arc(tmpA[0], tmpA[1], CH * .035, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; }
    RINGS.forEach(function (rg) {
      var n = rg.pts.length, run = [], base = [], kk, a2, x, z; ctx.fillStyle = css(mixc(mixc(rg.c, hazeC, 1 - rg.f), [60, 54, 84], storm * .35)); ctx.globalAlpha = .96;
      function flush() { if (run.length > 1) { ctx.beginPath(); ctx.moveTo(run[0][0], base[0][1] + 40); run.forEach(function (p) { ctx.lineTo(p[0], p[1]); }); ctx.lineTo(run[run.length - 1][0], base[base.length - 1][1] + 40); ctx.closePath(); ctx.fill(); } run = []; base = []; }
      for (kk = 0; kk <= n; kk++) { a2 = kk / n * 6.2832; x = C3.p[0] + rg.R * Math.cos(a2); z = C3.p[2] + rg.R * Math.sin(a2); var hh = rg.pts[kk % n]; pr(x, hh, z, tmpA); pr(x, 0, z, tmpB); if (tmpA[2] > 60) { run.push([tmpA[0], tmpA[1]]); base.push([tmpB[0], tmpB[1]]); } else flush(); } flush(); ctx.globalAlpha = 1;
    });
    // the mountain: every vertex projected once, then the cells painted far to near, each followed by what lies on it
    var i, j, c0 = clamp(Math.floor((C3.p[0] + TR) / TCELL), 0, TN), c1 = clamp(Math.floor((C3.p[2] + TR) / TCELL), 0, TN), v = tmpA;
    for (i = 0; i <= TN; i++) for (j = 0; j <= TN; j++) { var ix = i * W + j; pr(-TR + i * TCELL, TH_[ix], -TR + j * TCELL, v); T_PX[ix] = v[0]; T_PY[ix] = v[1]; T_PZ[ix] = v[2]; }
    T_OI.length = 0; T_OJ.length = 0; for (i = 0; i < c0; i++) T_OI.push(i); for (i = TN - 1; i >= c0; i--) T_OI.push(i); for (j = 0; j < c1; j++) T_OJ.push(j); for (j = TN - 1; j >= c1; j--) T_OJ.push(j);
    var mxs = CW + 30, mys = CH + 30, oi, oj, A, B, C, D, za, zb, zc, zd, lvl, k0; ctx.lineJoin = "round"; ctx.lineWidth = 1.1;
    function fogLevel(z, y, rad) { var d = clamp((z - 700) / 3200, 0, 1), hz = clamp((380 - y) / 380, 0, 1) * .3, edge = clamp((rad - 980) / 420, 0, 1); return clamp(Math.floor((Math.max(Math.pow(d, 1.1) + hz, edge)) * (NF - 1) + .5), 0, NF - 1); }
    for (var ii = 0; ii < T_OI.length; ii++) for (var jj = 0; jj < T_OJ.length; jj++) {
      oi = T_OI[ii]; oj = T_OJ[jj]; A = oi * W + oj; B = (oi + 1) * W + oj; C = (oi + 1) * W + oj + 1; D = oi * W + oj + 1; za = T_PZ[A]; zb = T_PZ[B]; zc = T_PZ[C]; zd = T_PZ[D];
      if (za < 60 || zb < 60 || zc < 60 || zd < 60) continue;
      var xmin = Math.min(T_PX[A], T_PX[B], T_PX[C], T_PX[D]), xmax = Math.max(T_PX[A], T_PX[B], T_PX[C], T_PX[D]), ymin = Math.min(T_PY[A], T_PY[B], T_PY[C], T_PY[D]), ymax = Math.max(T_PY[A], T_PY[B], T_PY[C], T_PY[D]);
      if (xmax < -30 || xmin > mxs || ymax < -30 || ymin > mys) continue;
      k0 = (oi * TN + oj) * 2; lvl = fogLevel((za + zb + zc + zd) / 4, TY[oi * TN + oj], Math.hypot(-TR + (oi + .5) * TCELL, -TR + (oj + .5) * TCELL));
      ctx.fillStyle = ctx.strokeStyle = T_PAL[TC[k0] + lvl]; ctx.beginPath(); ctx.moveTo(T_PX[A], T_PY[A]); ctx.lineTo(T_PX[B], T_PY[B]); ctx.lineTo(T_PX[C], T_PY[C]); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle = T_PAL[TC[k0 + 1] + lvl]; ctx.beginPath(); ctx.moveTo(T_PX[A], T_PY[A]); ctx.lineTo(T_PX[C], T_PY[C]); ctx.lineTo(T_PX[D], T_PY[D]); ctx.closePath(); ctx.fill(); ctx.stroke();
      var key = oi * TN + oj, tl = TRAIL.cells[key], hz2 = Math.pow(lvl / (NF - 1), .9) * .96;
      if (tl) for (var m = 0; m < tl.length; m++) {
        var sg4 = TRAIL.segs[tl[m]], q4 = sg4.q; pr(q4[0][0], q4[0][1], q4[0][2], tmpA); pr(q4[1][0], q4[1][1], q4[1][2], tmpB); pr(q4[2][0], q4[2][1], q4[2][2], tmpC); pr(q4[3][0], q4[3][1], q4[3][2], tmpD); if (tmpA[2] < 40 || tmpB[2] < 40 || tmpC[2] < 40 || tmpD[2] < 40) continue;
        ctx.fillStyle = css(mixc(sg4.br ? (sg4.i % 2 ? [150, 104, 70] : [124, 84, 58]) : (storm > .4 ? [150, 128, 120] : [238, 204, 160]), hazeC, Math.max(hz2, .0))); ctx.beginPath(); ctx.moveTo(tmpA[0], tmpA[1]); ctx.lineTo(tmpB[0], tmpB[1]); ctx.lineTo(tmpC[0], tmpC[1]); ctx.lineTo(tmpD[0], tmpD[1]); ctx.closePath(); ctx.fill();
        if (sg4.br) { var lift = C3.fl * 15 / Math.max(tmpA[2], 60); ctx.strokeStyle = "rgba(60,40,32,.95)"; ctx.lineWidth = Math.max(1, lift * .12); ctx.beginPath(); ctx.moveTo(tmpA[0], tmpA[1] - lift); ctx.lineTo(tmpD[0], tmpD[1] - lift); ctx.moveTo(tmpB[0], tmpB[1] - lift); ctx.lineTo(tmpC[0], tmpC[1] - lift); ctx.stroke(); if (sg4.i % 3 === 0) { ctx.beginPath(); ctx.moveTo(tmpA[0], tmpA[1]); ctx.lineTo(tmpA[0], tmpA[1] - lift); ctx.moveTo(tmpB[0], tmpB[1]); ctx.lineTo(tmpB[0], tmpB[1] - lift); ctx.stroke(); } ctx.lineWidth = 1.1; ctx.strokeStyle = "rgba(0,0,0,0)"; }
      }
      var bl = BOULDERS.cells[key]; if (bl) for (var bi = 0; bi < bl.length; bi++) drawBoulder(bl[bi], lvl);
    }
    // rocks that come down the slope in the storm
    if (storm > .35 && W2.clock > W2.nextRock) {
      W2.nextRock = W2.clock + 3.5 + rainSeed() * 5; var gx = surfY(hp.x + 20, hp.z) - surfY(hp.x - 20, hp.z), gz = surfY(hp.x, hp.z + 20) - surfY(hp.x, hp.z - 20), gl = Math.hypot(gx, gz) || 1, ux = gx / gl, uz = gz / gl, lat = (rainSeed() - .5) * 200;
      rocksFalling.push({ x: hp.x + ux * 280 - uz * lat, z: hp.z + uz * 280 + ux * lat, vx: -ux * 30, vz: -uz * 30, life: 5.5, sz: 12 + rainSeed() * 16, ph: rainSeed() * 6 }); if (window.Snd) Snd.rock(.7, clamp(lat / 140, -1, 1));
    }
    for (i = rocksFalling.length - 1; i >= 0; i--) {
      var rk = rocksFalling[i]; rk.life -= dt; if (rk.life <= 0) { rocksFalling.splice(i, 1); continue; }
      var gx2 = surfY(rk.x + 14, rk.z) - surfY(rk.x - 14, rk.z), gz2 = surfY(rk.x, rk.z + 14) - surfY(rk.x, rk.z - 14); rk.vx += -gx2 * 9 * dt; rk.vz += -gz2 * 9 * dt; var sp = Math.hypot(rk.vx, rk.vz); if (sp > 260) { rk.vx *= 260 / sp; rk.vz *= 260 / sp; } rk.x += rk.vx * dt; rk.z += rk.vz * dt; rk.ph += dt * 6;
      var ry = surfY(rk.x, rk.z) + rk.sz * .5 + Math.abs(Math.sin(rk.ph)) * 10; pr(rk.x, ry, rk.z, tmpA); if (tmpA[2] > 60) { var rs = C3.fl * rk.sz / tmpA[2]; ctx.fillStyle = "rgba(70,62,84,.95)"; ctx.beginPath(); for (var pp = 0; pp < 6; pp++) { var an = pp / 6 * 6.2832 + rk.ph; pp ? ctx.lineTo(tmpA[0] + Math.cos(an) * rs, tmpA[1] + Math.sin(an) * rs * .85) : ctx.moveTo(tmpA[0] + Math.cos(an) * rs, tmpA[1] + Math.sin(an) * rs * .85); } ctx.closePath(); ctx.fill(); ctx.fillStyle = "rgba(200,184,170,.35)"; ctx.beginPath(); ctx.ellipse(tmpA[0] - rs * .2, tmpA[1] - rs * .3, rs * .5, rs * .25, 0, 0, 6.2832); ctx.fill(); }
    }
    // the weather over the mountain, then him
    ctx.setTransform(1, 0, 0, 1, 0, 0); if (storm > .02) { ctx.fillStyle = "rgba(48,42,70," + (.4 * storm).toFixed(3) + ")"; ctx.fillRect(0, 0, CW, CH); } if (snow > .02) { ctx.fillStyle = "rgba(214,224,244," + (.26 * snow).toFixed(3) + ")"; ctx.fillRect(0, 0, CW, CH); }
    if (flash > .01) { ctx.fillStyle = "rgba(220,230,255," + (flash * .6).toFixed(3) + ")"; ctx.fillRect(0, 0, CW, CH); }
    hero2.ph = hero2.pos * Math.PI; pr(hp.x, hp.y, hp.z, tmpA); var fwx = C3.f[0], fwz = C3.f[2], fl2 = Math.hypot(fwx, fwz) || 1, rgx = C3.r[0], rgz = C3.r[2], tl2 = Math.hypot(hp.tx, hp.tz) || 1, tx = hp.tx / tl2, tz = hp.tz / tl2;
    var psi = clamp(Math.atan2(tx * rgx + tz * rgz, (tx * fwx + tz * fwz) / fl2), -1.45, 1.45); hero2.yaw += (psi - hero2.yaw) * (1 - Math.pow(.02, dt));
    var fs = (f * FIG / tmpA[2]) / 150; drawFigure(tmpA[0], tmpA[1], fs, { ph: hero2.ph, amp: hero2.amp, yaw: hero2.yaw, pitch: el, strain: storm, scramble: hero2.sc, bridge: hero2.br }, t, gust, 1);
    cam.x = 960; cam.tilt = 0; cam.zoom = 1; var yH = 540 + (clamp(horizon, -CH, CH * .9) - CH / 2) / S - 20, yM = 540 + (clamp(horizon + CH * .22, 0, CH) - CH / 2) / S, wD = clamp(1 - storm - snow, 0, 1);
    [[fogHaze, fogMid, wD], [fogHazeS, fogMidS, storm], [fogHazeN, fogMidN, snow]].forEach(function (g) { if (g[2] < .03) return; g[0].y = yH; g[1].y = yM; ctx.globalAlpha = g[2]; drawFog(g[0], t, 1); drawFog(g[1], t, 1); }); ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); var hwA = 1 - storm - snow * .5; if (hwA > .05) { ctx.globalAlpha = hwA; hawks.forEach(function (h) { var a = t * .1 * TS + h.ph, x = CW * (.5 + h.r * 1.6 * Math.cos(a)), y = CH * (h.y + .06 * Math.sin(a * 2)), d = Math.cos(a) > 0 ? -1 : 1, sz = h.sz * DPR, fl3 = Math.sin(t * 1.4 + h.ph) * sz * .05; ctx.fillStyle = "rgba(96,56,76,.85)"; ctx.beginPath(); ctx.moveTo(x - sz * d, y + fl3); ctx.quadraticCurveTo(x - sz * .35 * d, y - sz * .42, x, y - 2); ctx.quadraticCurveTo(x + sz * .35 * d, y - sz * .42, x + sz * d, y + fl3); ctx.quadraticCurveTo(x + sz * .3 * d, y - sz * .12, x, y + 3); ctx.quadraticCurveTo(x - sz * .3 * d, y - sz * .12, x - sz * d, y + fl3); ctx.fill(); }); ctx.globalAlpha = 1; }
    if (storm < .6 && snow < .4) dust2.forEach(function (d) { d.x += d.v * dt * TS * (.6 + gust); d.y -= d.v * .2 * dt * TS; if (d.x > 1.05) d.x = -.05; if (d.y < -.05) d.y = 1.05; ctx.fillStyle = "rgba(255,230,196," + ((.2 + .2 * Math.sin(t * .9 + d.ph)) * (1 - storm * 1.6)).toFixed(3) + ")"; ctx.beginPath(); ctx.arc(d.x * CW, d.y * CH, d.sz * DPR, 0, 6.2832); ctx.fill(); });
    // rain, slanted by a hard wind
    if (storm > .05) { var slant = .28 + .5 * gust, rp = new Path2D(); rain.forEach(function (d) { d.y += d.v * 1.5 * dt; d.x -= d.v * slant * 1.5 * dt; if (d.y > 1.05) { d.y = -.05; d.x = Math.random() * 1.3; } if (d.x < -.1) d.x += 1.2; var x = d.x * CW, y = d.y * CH, l = d.len * DPR * (.7 + gust * .5); rp.moveTo(x, y); rp.lineTo(x + l * slant, y - l); }); ctx.strokeStyle = "rgba(196,208,232," + (.42 * storm).toFixed(3) + ")"; ctx.lineWidth = 1.2 * DPR; ctx.lineCap = "round"; ctx.stroke(rp); }
    // snow, falling calmly
    if (snow > .05) { ctx.fillStyle = "rgba(255,255,255," + (.85 * snow).toFixed(3) + ")"; snowF.forEach(function (d) { d.y += d.v * dt * 1.0; d.x += Math.sin(t * .8 + d.ph) * .01 * dt + .004 * dt * (.5 + gust); if (d.y > 1.04) { d.y = -.04; d.x = Math.random(); } if (d.x > 1.04) d.x = -.04; ctx.beginPath(); ctx.arc(d.x * CW, d.y * CH, d.sz * DPR, 0, 6.2832); ctx.fill(); }); }
    var dk = sm((q - .93) / .07) * .0; if (dk > 0) { ctx.fillStyle = "rgba(255,255,255," + dk + ")"; ctx.fillRect(0, 0, CW, CH); }
  }

  // ───────────── the timeline ─────────────
  var CAPS1 = [
    [0, .17, "[Epoch 0] · Danilo Silva · AI engineer · Florianópolis", "Abandon every claim you cannot measure.", "I build deterministic, local, open-source AI developer tools, and I ship them. Follow me up the mountain: what I built, how I measured it, what reached people's machines."],
    [.20, .40, "[Base camp] · Where it is easy", "Every climb starts where nothing is at stake.", "Warm light, a quiet river, no danger. Ten years of product engineering began here, with small tools and a habit of writing down the numbers."],
    [.43, .64, "[The first crossing]", "A model is a claim. An eval is the proof.", "Before I trust a result, I measure it. A cost advantage I once published was removed when a re-run no longer reproduced it."],
    [.67, .86, "[The treeline]", "Deterministic first.", "Rules decide what rules can decide. A model answers the questions about meaning, with a measured miss rate."],
    [.89, 1.01, "[Ahead]", "The mountain is not the point.", "The measuring is. Past the fog, the first face: dry rock, hard light, and the first real work."]
  ];
  function uAtR(r) { for (var i = 20; i < TRAIL.P.length; i++) if (Math.hypot(TRAIL.P[i][0], TRAIL.P[i][2]) < r) return i / (TRAIL.P.length - 1); return 1; }
  var uBrA = 1, uBrB = 0; TRAIL.flags.forEach(function (q, i) { if (q.br) { uBrA = Math.min(uBrA, i / (TRAIL.P.length - 1)); uBrB = Math.max(uBrB, i / (TRAIL.P.length - 1)); } });
  function pgOf(u) { return .5 + .5 * clamp(u * .985, 0, .985); }
  uRock = uAtR(820); uSnow = uAtR(560);
  var CAPS2 = [
    [pgOf(0), pgOf(uBrA * .55), "[The first face] · dunes", "Dry ground. Hard light.", "Past the fog the mountain begins as sand. The work gets real here: a functional-programming rewrite that cut code size about 35% on a product earning over €5 million a year (K2 Partnering Solutions, 2019 — 2021)."],
    [pgOf(uBrA * .62), pgOf(uBrB * 1.0), "[The ravine] · 2021 — 2022", "Senior frontend developer.", "CIBC FirstCaribbean International Bank: started a credit-card selection application from scratch and led its architecture."],
    [pgOf(Math.max(uRock, uBrB) + .015), pgOf(uRock + (uSnow - uRock) * .55), "[The rock and the storm] · 2022 — Apr 2026", "Full stack engineer.", "Arrow Global (Portugal): refactored a legacy React and TypeScript code base and built a multi-step investment form that replaced Excel tables. The hard part is the weather: keep walking."],
    [pgOf(uRock + (uSnow - uRock) * .62), pgOf(uSnow - .015), "[Still climbing]", "Rules decide what rules can decide.", "Deterministic first. A model answers the questions about meaning, with a measured miss rate."],
    [pgOf(uSnow + .02), pgOf(.985), "[The snow] · now", "Calm, and still measuring.", "Local, open-source AI developer tools, shipped and measured. A cost advantage I once published was removed when a re-run no longer reproduced it."]
  ];
  var CAPS = CAPS1.map(function (c) { return [c[0] * .5, c[1] * .5, c[2], c[3], c[4]]; }).concat(CAPS2);
  var whereEl = document.getElementById("where"), pCur = 0, pSmooth = 0, lastT = 0, started = false, gustNow = 0, gustPrev = 0, speedSm = 0;
  var cue = document.querySelector(".cue"), capEl = document.getElementById("cap"), capEb = capEl.querySelector(".eb"), capH = capEl.querySelector("h2"), capP = capEl.querySelector(".lede"), capIdx = -1, bar = document.getElementById("bar");
  function setCap(p) {
    var idx = -1; for (var i = 0; i < CAPS.length; i++) if (p >= CAPS[i][0] && p < CAPS[i][1]) idx = i;
    if (idx !== capIdx) { capIdx = idx; capEl.classList.remove("in"); setTimeout(function () { if (capIdx === idx && idx >= 0) { capEb.textContent = CAPS[idx][2]; capH.textContent = CAPS[idx][3]; capP.textContent = CAPS[idx][4]; capEl.classList.add("in"); } }, 380); }
  }
  function progress() { var m = Math.max(1, document.documentElement.scrollHeight - innerHeight); return clamp(scrollY / m, 0, 1); }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2); CW = Math.round(innerWidth * DPR); CH = Math.round(innerHeight * DPR); cv.width = CW; cv.height = CH; S = Math.max(CW / DW, CH / DH);
    makeSky(); makeVignette();
  }
  var overlay = document.createElement("canvas");
  function makeVignette() {
    overlay.width = CW; overlay.height = CH; var g = overlay.getContext("2d"), q;
    q = g.createLinearGradient(0, CH * .70, 0, CH); q.addColorStop(0, "rgba(14,12,30,0)"); q.addColorStop(1, "rgba(14,12,30,.78)"); g.fillStyle = q; g.fillRect(0, 0, CW, CH);
    q = g.createLinearGradient(0, 0, 0, CH * .24); q.addColorStop(0, "rgba(14,12,30,.30)"); q.addColorStop(1, "rgba(14,12,30,0)"); g.fillStyle = q; g.fillRect(0, 0, CW, CH);
    q = g.createLinearGradient(0, 0, CW * .2, 0); q.addColorStop(0, "rgba(14,12,30,.6)"); q.addColorStop(1, "rgba(14,12,30,0)"); g.fillStyle = q; g.fillRect(0, 0, CW, CH);
    q = g.createLinearGradient(CW, 0, CW * .8, 0); q.addColorStop(0, "rgba(14,12,30,.6)"); q.addColorStop(1, "rgba(14,12,30,0)"); g.fillStyle = q; g.fillRect(0, 0, CW, CH);
    g.fillStyle = "rgba(160,112,150,.10)"; g.fillRect(0, 0, CW, CH);
    var r = mulberry(5), n = Math.round(CW / 5); for (var i = 0; i < n; i++) { g.fillStyle = r() < .5 ? "rgba(255,226,232,.026)" : "rgba(60,30,64,.026)"; g.fillRect(Math.floor(r() * CW), 0, Math.max(1, Math.round(DPR * (.8 + r() * 1.6))), CH * .64); }   // faint vertical streaks of haze
  }

  var PROF = /prof/.test(location.hash), P_ = {}, _pt = 0; function mark(n) { if (!PROF) return; ctx.getImageData(0, 0, 1, 1); var now = performance.now(); P_[n] = (P_[n] || 0) + now - _pt; _pt = now; } window.__prof = P_;
  var stepFlash = 0, lastTink = -99;
  function frame(ms) {
    requestAnimationFrame(frame); var t = ms / 1000, dt = Math.min(.05, t - lastT || .016); lastT = t; if (frozenP != null) t = 3;
    var nowMs = performance.now(), realDt = Math.min(.25, (nowMs - (auto.last || nowMs)) / 1000); auto.last = nowMs;
    if (auto.on) { auto.y += AUTO_SPEED * (FASTT ? 6 : 1) * realDt; var maxY = document.documentElement.scrollHeight - innerHeight; if (auto.y >= maxY) { auto.y = maxY; setAuto(false); } window.scrollTo(0, auto.y); }
    var pTarget = frozenP != null ? frozenP : progress(); pSmooth += (pTarget - pSmooth) * (1 - Math.pow(.0009, dt)); var p = pSmooth, pg = p; p = clamp(p * 2, 0, 1); speedSm += (Math.abs(pTarget - pSmooth) * 40 - speedSm) * .1;
    // the wind: slow gusts, a little stronger while you scroll
    gustNow = clamp(.5 + .5 * Math.sin(t * .31) * Math.sin(t * .17 + 1) + clamp(speedSm, 0, .5) * .5, 0, 1); if (gustNow > .82 && gustPrev <= .82) window.Snd && Snd.swoosh(.7, .3);
    gustPrev = gustNow; var gust = gustNow, dens = 1 + 1.5 * sm((p - .6) / .4); lateAmt = sm((p - .60) / .34);
    // the second half of the scroll is the second scene: the arid face, entered out of the fog the first one ended in
    if (pg > .5) {
      var q = clamp((pg - .5) * 2, 0, 1); if (PROF) _pt = performance.now(); drawScene2(t, dt, q, gust); mark("scene2");
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(overlay, 0, 0);
      var inFog = 1 - sm(q / .14); if (inFog > .002) { ctx.fillStyle = "rgba(196,150,172," + inFog.toFixed(3) + ")"; ctx.fillRect(0, 0, CW, CH); }
      cue.style.opacity = 0; whereEl.textContent = "The Climb · scene 2 · " + W2.zone; capEl.classList.toggle("dark", false); capEl.classList.toggle("warm", true); bar.style.transform = "scaleX(" + pg.toFixed(4) + ")"; setCap(pg);
      if (window.Snd) { Snd.update({ gust: Math.max(gust, W2.storm), river: 0, dry: 1 - W2.snow * .8, scene: W2.snow > .5 ? 3 : (W2.storm > .35 ? 2 : 1), intensity: .25 + .7 * q, fog: 0, storm: W2.storm, snow: W2.snow }); if (Snd.on && W2.storm < .3 && W2.snow < .3 && Math.random() < dt * .12) Snd.hawk(clamp(Math.random() * 1.6 - .8, -1, 1), .8); }
      return;
    }
    stormAmt = 0; capEl.classList.toggle("warm", false); whereEl.textContent = "The Climb · scene 1 · base camp";
    // camera: pan across the scenario, tilt up to the mountain at the end, dolly in slowly
    var portrait = innerWidth < innerHeight * 1.1, e = sm(p);
    cam.x = portrait ? lerp(DW * .31, DW * .56, e) : 960 + 380 * e; cam.tilt = DH * 1.18 * sm((p - .56) / .44); cam.zoom = 1 + .07 * e; cam.mz = 1 + .6 * sm((p - .58) / .42);
    // he walks wherever your scroll puts him, and stops wherever you stop: a smoothed velocity, no snapping to whole steps
    var kf = clamp((p - .05) / .83, 0, 1) * (NN - 1); hero.target = kf; var prevPos = hero.pos;
    chase(hero, kf, dt, 2.5 * (FASTT ? 6 : 1));
    if (hero.vel > .3 && Math.floor(hero.pos + 1e-6) > Math.floor(prevPos + 1e-6)) { var nd = NODES[Math.min(NN - 1, Math.floor(hero.pos + 1e-6))], hs = sOf(nd.v), sc = toScreen(nd.x, nd.v * DH, 1), pn = clamp((sc[0] / CW - .5) * 1.6, -1, 1); window.Snd && Snd.step(nd.k, clamp(hs / 1.4, .25, 1), pn); }      // a footfall
    var hp = heroPos(hero.pos), hs2 = sOf(hp.v), amp = hero.amp; hero.yaw += (clamp(heroYaw(hero.pos) * 1.5, -.8, .8) + .16 - hero.yaw) * (1 - Math.pow(.02, dt)); hero.ph = hero.pos * Math.PI;
    var fade = clamp((hp.v - .585) / .03, 0, 1);

    // ───────────── draw ─────────────
    if (PROF) _pt = performance.now(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#1a1228"; ctx.fillRect(0, 0, CW, CH);
    drawSky(t); skyFogs.forEach(function (o) { drawFog(o, t, dens); });
    // birds: V shapes that beat their wings, drifting across the sky
    birds.forEach(function (b, i) { var x = ((b.x + t * b.v * TS) % (DW + 400)) - 200, y = b.y + Math.sin(t * .6 + b.ph) * 14, fl = Math.sin(t * 7 * TS + b.ph) * b.sz * .45; setLayer(.05); ctx.strokeStyle = "rgba(96,70,100,.9)"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x - b.sz, y - fl); ctx.quadraticCurveTo(x - b.sz * .4, y - b.sz * .35 - fl * .4, x, y); ctx.quadraticCurveTo(x + b.sz * .4, y - b.sz * .35 - fl * .4, x + b.sz, y - fl); ctx.stroke(); });
    mark("sky+skyfog+birds"); drawMountain(t); drawFog(fogMount, t, dens); mark("mountain");
    BANDS.forEach(function (B, i) { drawBand(B, i, t, gust); mark("b:fill"); drawPines("band" + i, t, gust); mark("b:pines"); drawFog(fogs[B.fogIdx], t, dens); mark("b:fog"); });
    mark("bands+emergent+bandfog"); drawGround(t, gust, dens); mark("ground+river+stones");
    drawPines("mid", t, gust); drawPines("near", t, gust); mark("near pines");
    drawFog(fogSeam, t, dens); drawFog(fogLow, t, dens); drawFog(fogRiver, t, dens);
    mark("seam fogs"); drawDetails(t, gust); mark("pebbles");
    var heroY = hp.v * DH; drawGrassBands(t, gust, -1e9, heroY - 6); mark("grass behind");
    // the climber
    setLayer(1); var hx = hp.x, hy = hp.v * DH - hp.hop * 14 * hs2 * 0, alpha = fade; drawFigure(hx, hp.v * DH, hs2, { ph: hero.ph, amp: amp, yaw: hero.yaw }, t, gust, alpha);
    drawGrassBands(t, gust, heroY - 6, 1e9); mark("figure+grass front");
    // fireflies: wandering, drifting downwind, twinkling; small and faint near the horizon, bigger and brighter near you
    flies.forEach(function (f) {
      f.x += f.vx * dt * TS * (.6 + gust * .8); f.y += Math.sin(t * f.sp + f.wob) * 6 * dt; if (f.x > X1) f.x = X0; var tw = .5 + .5 * Math.sin(t * f.sp * 1.7 + f.ph), prevLit = f.lit; f.lit = tw;
      var sc = toScreen(f.x + Math.sin(t * .4 + f.wob) * 10, f.y, f.f); if (sc[0] < -40 || sc[0] > CW + 40 || sc[1] < -40 || sc[1] > CH + 40) return;
      var r0 = lerp(.9, 4.0, f.t) * sc[2], a0 = lerp(.22, .78, f.t) * (.35 + .65 * tw) * (started ? 1 : .8); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = a0 * .9; ctx.drawImage(haloSpr, sc[0] - r0 * 4.2, sc[1] - r0 * 3.6, r0 * 8.4, r0 * 7.2); ctx.globalAlpha = Math.min(1, a0 * 1.4); ctx.drawImage(coreSpr, sc[0] - r0 * 1.6, sc[1] - r0 * .8, r0 * 3.2, r0 * 1.6); ctx.globalAlpha = 1;
      if (tw > .93 && prevLit <= .93 && f.t > .55 && sc[0] > 0 && sc[0] < CW && window.Snd && t - lastTink > 4.5 && Math.random() < .5) { lastTink = t; Snd.tink([76, 79, 81, 84, 72, 74][Math.floor(Math.random() * 6)], clamp((sc[0] / CW - .5) * 1.8, -1, 1), .35 + f.t * .6); }
    });
    dust.forEach(function (d) { d.x += d.vx * dt * TS * (.5 + gust); d.y += d.vy * dt * TS; if (d.x > X1) d.x = X0; if (d.y < -20) d.y = DH; if (d.y > DH + 20) d.y = 0; var sc = toScreen(d.x, d.y, d.f); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "rgba(255,232,214," + (.15 + .25 * Math.sin(t * .9 + d.ph) * .5 + .12) + ")"; ctx.beginPath(); ctx.arc(sc[0], sc[1], d.sz * sc[2], 0, 6.2832); ctx.fill(); });
    mark("fireflies+dust"); drawFog(fogFront, t, dens); mark("frontfog");
    // dark bushes in the bottom corners, and the heavy vignette
    setLayer(1.3); ctx.fillStyle = "rgba(20,20,40,1)"; [[0, 1.0], [140, 1.0], [-120, 1.0], [1900, 1.0], [2060, 1.0], [2240, 1.0]].forEach(function (q, i) { var sway = Math.sin(t * .8 + i) * 4; ctx.beginPath(); ctx.ellipse(q[0] + sway, DH * 1.0 + (i % 3) * 8, 150 + (i % 2) * 40, 62 + (i % 3) * 8, 0, 0, 6.2832); ctx.fill(); });
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(overlay, 0, 0);
    var endFog = sm((p - .84) / .14); if (endFog > 0) { ctx.fillStyle = "rgba(196,150,172," + endFog.toFixed(3) + ")"; ctx.fillRect(0, 0, CW, CH); }      // the fog closes in as the scene ends
    mark("vignette"); cue.style.opacity = p > .03 ? 0 : ""; capEl.classList.toggle("dark", p > .90); bar.style.transform = "scaleX(" + pg.toFixed(4) + ")"; setCap(pg);
    // sound: wind, the river (louder when you are on the stones), the song's intensity
    if (window.Snd) { var onWater = clamp(hero.pos / 2, 0, 1), sc2 = toScreen(cxAt(.7), .7 * DH, 1); Snd.update({ gust: gust, river: .35 + .6 * onWater * fade, riverPan: clamp((sc2[0] / CW - .5) * 1.4, -1, 1), intensity: p, fog: dens - 1, dry: 0, scene: 0 }); }
    if (window.Snd && Snd.on && Math.random() < dt * .09) { var bi = Math.floor(Math.random() * birds.length), bb = birds[bi], bx = (((bb.x + t * bb.v * TS) % (DW + 400)) - 200), bs = toScreen(bx, bb.y, .05); if (bs[0] > 0 && bs[0] < CW) Snd.chirp(clamp((bs[0] / CW - .5) * 1.8, -1, 1), .8); }
  }

  // ───────────── start ─────────────
  window.addEventListener("resize", resize); resize();
  // autoplay: the page scrolls itself at a reading pace; any wheel, touch or key press hands control back
  var auto = { on: false, y: 0 }, playBtn = document.getElementById("playbtn"), AUTO_SPEED = 62;
  function setAuto(on) { auto.on = on; auto.y = window.scrollY; auto.last = performance.now(); auto.since = performance.now(); playBtn.setAttribute("aria-pressed", on ? "true" : "false"); playBtn.textContent = on ? "Pause" : "Play"; }
  playBtn.addEventListener("click", function () { if (!started) begin(false); if (!auto.on && progress() > .995) window.scrollTo(0, 0); setAuto(!auto.on); });
  ["wheel", "touchstart", "keydown", "mousedown"].forEach(function (ev) { window.addEventListener(ev, function (e) { if (auto.on && e.isTrusted !== false && !(playBtn.contains(e.target)) && performance.now() - auto.since > 700) setAuto(false); }, { passive: true }); });
  function begin(withSound) {
    document.getElementById("entry").classList.add("out"); started = true; document.documentElement.classList.remove("gated");
    if (withSound && window.Snd) { Snd.start(); document.getElementById("sndbtn").textContent = "Sound on"; document.getElementById("sndbtn").setAttribute("aria-pressed", "true"); }
    setTimeout(function () { var e = document.getElementById("entry"); if (e && e.parentNode) e.parentNode.removeChild(e); }, 1000);
  }
  document.getElementById("gate-on").addEventListener("click", function () { begin(true); });
  document.getElementById("gate-off").addEventListener("click", function () { begin(false); });
  document.getElementById("gate-play").addEventListener("click", function () { begin(true); setAuto(true); });
  document.getElementById("sndbtn").addEventListener("click", function () { var on = this.getAttribute("aria-pressed") === "true"; if (on) { Snd.mute(true); this.textContent = "Sound off"; this.setAttribute("aria-pressed", "false"); } else { Snd.start(); this.textContent = "Sound on"; this.setAttribute("aria-pressed", "true"); } });
  if (frozenP != null) { document.documentElement.classList.remove("gated"); var en = document.getElementById("entry"); if (en) en.parentNode.removeChild(en); started = true; }
  window.__climb = {TRAIL: TRAIL, uRock: uRock, uSnow: uSnow, sheet: function (n, gust, tt) { var c = document.createElement("canvas"); c.width = 180 * n; c.height = 300; var old = ctx; ctx = c.getContext("2d"); ctx.fillStyle = "#8a7aa8"; ctx.fillRect(0, 0, c.width, c.height); for (var i = 0; i < n; i++) { ctx.save(); ctx.translate(90 + i * 180, 280); drawFigure(0, 0, 1.5, { ph: i / n * 6.2832 * 2, amp: 1, yaw: .3 }, tt + i * .2, gust, 1); ctx.restore(); } ctx = old; return c.toDataURL("image/png"); }, drawScene2: drawScene2, hero2: hero2,  cam: cam, hero: hero, NODES: NODES, toScreen: toScreen, DPR: function () { return DPR; } };
  requestAnimationFrame(frame);
})();

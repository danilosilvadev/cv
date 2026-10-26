/* The Climb · scene 1: "Base camp". Everything is drawn by code on one canvas, as flat layers in the style of the reference: a colossal mountain in climate zones,
 * seven bands of forest sinking into pink haze, dark pines, a river with stepping stones, and a climber seen from behind.
 * The camera pans and tilts across the scenario as you scroll; it does not follow the climber, who hops from stone to stone towards the mountain.
 * Everything moves all the time: fog drifts through every depth, the pines and grass lean and sway with the wind, fireflies wander and glow, birds cross the sky,
 * the water flows, the scarf streams. Sound (sound.js) is tied to what you see. Append #p=0.5 to the address to freeze a moment (used by the tests). */
(function () {
  "use strict";
  var DW = 1920, DH = 1080, X0 = -700, X1 = 2700;
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
  function setLayer(f, extraZoom) {                                            // f = parallax: 0 at infinity, 1 at the near ground
    var z = (1 + (cam.zoom - 1) * (.25 + .75 * f)) * (extraZoom || 1), s = S * z;
    ctx.setTransform(s, 0, 0, s, CW / 2 - s * (960 + (cam.x - 960) * f), CH / 2 - s * (540 - cam.tilt * gvOf(f)));
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
  var lateAmt = 0;
  function drawFog(o, t, dens) {
    if (o.late && lateAmt < .01) return; setLayer(o.f); var off = ((t * o.speed * TS + o.off) % DW + DW) % DW, y = o.y - o.up; ctx.globalAlpha = clamp(o.a * (o.late ? lateAmt : dens) * (1 + Math.sin(t * .23 + o.off) * .1), 0, 1);
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
  function drawFigure(x, y, s, pose, t, gust, alpha) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(s, s);
    var RIM = [255, 184, 140], sw = Math.sin(pose.ph), a = pose.amp, hop = 0, bob = -Math.abs(sw) * 1.5 * a + Math.sin(t * 1.7) * .5 * (1 - a), sway = sw * 1.2 * a + Math.sin(t * .9) * .4 * (1 - a);
    var liftL = Math.max(0, sw) * 6.5 * a, liftR = Math.max(0, -sw) * 6.5 * a, armL = sw * .17 * a, armR = -sw * .08 * a, head = Math.sin(t * .8) * .02 + sw * .02 * a, pk = Math.sin(pose.ph + .9) * 1.3 * a;
    // shadows on the ground
    var sh = ctx.createRadialGradient(22, 6, 0, 22, 6, 62); sh.addColorStop(0, "rgba(10,10,24,.62)"); sh.addColorStop(1, "rgba(10,10,24,0)"); ctx.save(); ctx.translate(0, 6); ctx.scale(1, .21); ctx.translate(0, -6); ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(22, 6, 62, 0, 6.2832); ctx.fill(); ctx.restore();
    var cs = ctx.createRadialGradient(2, 1, 0, 2, 1, 30); cs.addColorStop(0, "rgba(6,6,16,.8)"); cs.addColorStop(1, "rgba(6,6,16,0)"); ctx.save(); ctx.translate(0, 1); ctx.scale(1, .17); ctx.translate(0, -1); ctx.fillStyle = cs; ctx.beginPath(); ctx.arc(2, 1, 30, 0, 6.2832); ctx.fill(); ctx.restore();
    ctx.translate(sway, bob * (1 - hop * .0));
    var boot = [48, 40, 58], boot2 = [26, 22, 38], sole = [156, 144, 160];
    part([[-19, -12], [-4, -12], [-2, -1], [-23, -1]], boot, boot2, 0, -liftL); part([[-23, -3], [-2, -3], [-2, -1], [-24, -1]], sole, [110, 100, 124], 0, -liftL);
    part([[4, -12], [19, -12], [24, -1], [2, -1]], boot, boot2, 0, -liftR); part([[2, -3], [24, -3], [25, -1], [2, -1]], sole, [110, 100, 124], 0, -liftR);
    part([[-16, -84], [-3, -84], [-4, -12], [-19, -12]], [52, 54, 102], [36, 36, 72], 0, -liftL * .6, -sw * .05 * a, -10, -84);
    part([[3, -84], [16, -84], [19, -12], [4, -12]], [58, 60, 112], [40, 40, 78], 0, -liftR * .6, sw * .05 * a, 10, -84); part([[16, -84], [17, -80], [19, -12], [18, -12]], RIM, RIM, 0, -liftR * .6, sw * .05 * a, 10, -84);
    part([[-18, -90], [18, -90], [17, -78], [-17, -78]], [44, 46, 92], [34, 34, 66]);
    ctx.save(); ctx.translate(0, pk * .4);
    part([[-22, -126], [-12, -132], [12, -132], [22, -126], [19, -90], [-19, -90]], [82, 92, 170], [50, 54, 110]); part([[-22, -126], [-12, -132], [-9, -130], [-18, -122]], [118, 130, 206], [100, 110, 188]); part([[9, -130], [12, -132], [22, -126], [18, -122]], RIM, [240, 170, 140]); part([[18, -126], [22, -126], [19, -90], [17, -90]], RIM, [232, 160, 130]);
    ctx.save(); ctx.translate(0, pk);
    part([[-16, -128], [16, -128], [19, -108], [18, -78], [-18, -78], [-19, -108]], [178, 102, 70], [122, 70, 58]); part([[15, -128], [16, -128], [19, -108], [18, -80], [16.5, -80], [17.5, -108]], [255, 200, 150], [240, 170, 130]);
    part([[-14, -128], [14, -128], [13, -117], [-13, -117]], [210, 130, 84], [190, 112, 76]); part([[-2.5, -128], [2.5, -128], [2.5, -78], [-2.5, -78]], [100, 58, 52], [84, 48, 46]);
    part([[-18, -82], [18, -82], [18, -70], [-18, -70]], [92, 98, 156], [66, 70, 122]); part([[-7, -82], [-4, -82], [-4, -70], [-7, -70]], [52, 54, 94], [52, 54, 94]); part([[4, -82], [7, -82], [7, -70], [4, -70]], [52, 54, 94], [52, 54, 94]);
    part(ell(-19, -100, 6, 11, 22), [222, 196, 150], [190, 156, 116]); part(ell(-19, -100, 3, 7, 22), [150, 84, 60], [120, 68, 54]);
    part([[-23, -138], [-20, -138], [-16, -84], [-19, -84]], [150, 120, 96], [110, 84, 70]); part([[-32, -141], [-17, -143], [-17, -137], [-32, -135]], [220, 226, 242], [170, 176, 206]);
    ctx.restore();
    part([[-26, -126], [-19, -128], [-17, -96], [-25, -94]], [64, 72, 142], [42, 46, 96], 0, 0, armL, -22, -126); part(ell(-21, -91, 5, 5.5, 12), [52, 42, 62], [52, 42, 62], 0, 0, armL, -22, -126);
    var lift = Math.max(0, Math.cos(pose.ph)) * 5 * a;                                                 // the staff plants with each step
    part([[19, -128], [26, -122], [31, -100], [25, -88], [19, -104]], [70, 78, 152], [44, 48, 100], 0, -lift * .5, armR, 20, -126); part(ell(26, -84, 5.5, 6, 12), [52, 42, 62], [52, 42, 62], 0, -lift * .5, armR, 20, -126);
    part([[24.5, -50], [27.5, -50], [29, -160], [26, -160]], [152, 122, 98], [112, 86, 72], 0, -lift, armR * .5, 26, -84); part([[19, -164], [41, -168], [42, -161], [30, -161], [19, -158]], [222, 228, 244], [172, 178, 208], 0, -lift, armR * .5, 26, -84);
    ctx.restore();
    ctx.save(); ctx.translate(0, pk * .5); ctx.translate(0, -134); ctx.rotate(head); ctx.translate(0, 134);
    part([[-5, -132], [5, -132], [6, -139], [-6, -139]], [156, 104, 104], [132, 88, 92]); part(ell(0, -151, 11.5, 12.5, 28), [66, 108, 130], [40, 70, 94]); part([[-11, -146], [11, -146], [10, -138], [-10, -138]], [58, 44, 62], [44, 34, 52]); part([[-11.5, -153], [11.5, -153], [11, -150], [-11, -150]], [100, 150, 170], [86, 132, 156]);
    var cres = []; for (var i = 0; i < 12; i++) { var q = -1.2 + 1.7 * i / 11; cres.push([11.5 * Math.cos(q), -151 + 12.5 * Math.sin(q)]); } for (i = 0; i < 12; i++) { q = .5 - 1.7 * i / 11; cres.push([9.2 * Math.cos(q), -151 + 10 * Math.sin(q)]); } part(cres, [255, 232, 214], RIM);
    part([[-13, -135], [13, -135], [15, -126], [-15, -126]], [252, 62, 52], [206, 34, 40]);
    // the scarf streams in the wind: a ribbon whose points flutter
    var w = 1 + gust * 1.4, f1 = Math.sin(t * 7), f2 = Math.sin(t * 9 + 1.3), f3 = Math.sin(t * 11 + 2.1), a0 = [[10, -134], [28, -142 - 4 * w + f1 * 2], [50, -140 - 8 * w + f2 * 3], [72 + gust * 14, -148 - 10 * w + f3 * 5], [58 + gust * 10, -135 - 5 * w + f2 * 3], [42, -130 + f1], [24, -126], [10, -126]];
    part(a0, [255, 74, 60], [208, 36, 42]); part([[28, -140 + f1], [50, -138 + f2 * 2], [64 + gust * 10, -144 + f3 * 3], [50, -134 + f2], [30, -131]], [255, 110, 94], [242, 84, 72]);
    ctx.restore(); ctx.restore(); ctx.restore();
  }

  // path of the climber: grass to the first stone, then stone to stone up the river, then wading into the fog
  var NODES = ROUTE.map(function (p, i) { return { x: p[0], v: p[1] / DH, k: "grass" }; });
  var NN = NODES.length;
  var hero = { pos: 0, target: 0, ph: 0, amp: 0, moving: false };
  function heroPos(pos) { var i = Math.min(NN - 2, Math.max(0, Math.floor(pos))), f = clamp(pos - i, 0, 1), a = NODES[i], b = NODES[i + 1]; return { x: lerp(a.x, b.x, f), v: lerp(a.v, b.v, f), f: f, i: i, hop: 0 }; }   // a steady walk: one footstep per stone, no hop

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

  // ───────────── the timeline ─────────────
  var CAPS = [
    [0, .17, "[Epoch 0] · Danilo Silva · AI engineer · Florianópolis", "Abandon every claim you cannot measure.", "I build deterministic, local, open-source AI developer tools, and I ship them. Follow me up the mountain: what I built, how I measured it, what reached people's machines."],
    [.20, .40, "[Base camp] · Where it is easy", "Every climb starts where nothing is at stake.", "Warm light, a quiet river, no danger. Ten years of product engineering began here, with small tools and a habit of writing down the numbers."],
    [.43, .64, "[The first crossing]", "A model is a claim. An eval is the proof.", "Before I trust a result, I measure it. A cost advantage I once published was removed when a re-run no longer reproduced it."],
    [.67, .86, "[The treeline]", "Deterministic first.", "Rules decide what rules can decide. A model answers the questions about meaning, with a measured miss rate."],
    [.89, 1.01, "[Ahead]", "The mountain is not the point.", "The measuring is. Past the fog, the first face: dry rock, hard light, and the first real work."]
  ];
  var pCur = 0, pSmooth = 0, lastT = 0, started = false, gustNow = 0, gustPrev = 0, speedSm = 0;
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
  var stepFlash = 0;
  function frame(ms) {
    requestAnimationFrame(frame); var t = ms / 1000, dt = Math.min(.05, t - lastT || .016); lastT = t; if (frozenP != null) t = 3;
    var pTarget = frozenP != null ? frozenP : progress(); pSmooth += (pTarget - pSmooth) * (1 - Math.pow(.0009, dt)); var p = pSmooth; speedSm += (Math.abs(pTarget - pSmooth) * 40 - speedSm) * .1;
    // the wind: slow gusts, a little stronger while you scroll
    gustNow = clamp(.5 + .5 * Math.sin(t * .31) * Math.sin(t * .17 + 1) + clamp(speedSm, 0, .5) * .5, 0, 1); if (gustNow > .82 && gustPrev <= .82) window.Snd && Snd.swoosh(.7, .3);
    gustPrev = gustNow; var gust = gustNow, dens = 1 + 1.5 * sm((p - .6) / .4); lateAmt = sm((p - .60) / .34);
    // camera: pan across the scenario, tilt up to the mountain at the end, dolly in slowly
    var portrait = innerWidth < innerHeight * 1.1, e = sm(p);
    cam.x = portrait ? lerp(DW * .31, DW * .56, e) : 960 + 380 * e; cam.tilt = DH * 1.18 * sm((p - .56) / .44); cam.zoom = 1 + .07 * e; cam.mz = 1 + .6 * sm((p - .58) / .42);
    // the climber hops towards the stone nearest to your progress along the path
    var kf = clamp((p - .05) / .83, 0, 1) * (NN - 1), tgt = Math.round(kf); hero.target = tgt;
    if (Math.abs(hero.pos - hero.target) > .001) {
      var dir = Math.sign(hero.target - hero.pos), prev = hero.pos; hero.pos += dir * dt / .40; if ((dir > 0 && hero.pos > hero.target) || (dir < 0 && hero.pos < hero.target)) hero.pos = hero.target; hero.moving = true;
      var crossed = dir > 0 && Math.floor(hero.pos + 1e-6) > Math.floor(prev + 1e-6);
      if (crossed) { var nd = NODES[Math.floor(hero.pos + 1e-6)], hs = sOf(nd.v), sc = toScreen(nd.x, nd.v * DH, 1), pn = clamp((sc[0] / CW - .5) * 1.6, -1, 1); window.Snd && Snd.step(nd.k, clamp(hs / 1.4, .25, 1), pn); }      // a footfall
    } else hero.moving = false;
    hero.amp += ((hero.moving ? 1 : 0) - hero.amp) * (1 - Math.pow(.0004, dt));
    var hp = heroPos(hero.pos), hs2 = sOf(hp.v), amp = hero.amp; hero.ph = hero.pos * Math.PI;
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
    setLayer(1); var hx = hp.x, hy = hp.v * DH - hp.hop * 14 * hs2 * 0, alpha = fade; drawFigure(hx, hp.v * DH, hs2, { ph: hero.ph, amp: amp, hop: 0 }, t, gust, alpha);
    drawGrassBands(t, gust, heroY - 6, 1e9); mark("figure+grass front");
    // fireflies: wandering, drifting downwind, twinkling; small and faint near the horizon, bigger and brighter near you
    flies.forEach(function (f) {
      f.x += f.vx * dt * TS * (.6 + gust * .8); f.y += Math.sin(t * f.sp + f.wob) * 6 * dt; if (f.x > X1) f.x = X0; var tw = .5 + .5 * Math.sin(t * f.sp * 1.7 + f.ph), prevLit = f.lit; f.lit = tw;
      var sc = toScreen(f.x + Math.sin(t * .4 + f.wob) * 10, f.y, f.f); if (sc[0] < -40 || sc[0] > CW + 40 || sc[1] < -40 || sc[1] > CH + 40) return;
      var r0 = lerp(.9, 4.0, f.t) * sc[2], a0 = lerp(.22, .78, f.t) * (.35 + .65 * tw) * (started ? 1 : .8); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = a0 * .9; ctx.drawImage(haloSpr, sc[0] - r0 * 4.2, sc[1] - r0 * 3.6, r0 * 8.4, r0 * 7.2); ctx.globalAlpha = Math.min(1, a0 * 1.4); ctx.drawImage(coreSpr, sc[0] - r0 * 1.6, sc[1] - r0 * .8, r0 * 3.2, r0 * 1.6); ctx.globalAlpha = 1;
      if (tw > .93 && prevLit <= .93 && f.t > .45 && sc[0] > 0 && sc[0] < CW && window.Snd && Math.random() < .35) Snd.tink([76, 79, 81, 84, 72, 74][Math.floor(Math.random() * 6)], clamp((sc[0] / CW - .5) * 1.8, -1, 1), .35 + f.t * .6);
    });
    dust.forEach(function (d) { d.x += d.vx * dt * TS * (.5 + gust); d.y += d.vy * dt * TS; if (d.x > X1) d.x = X0; if (d.y < -20) d.y = DH; if (d.y > DH + 20) d.y = 0; var sc = toScreen(d.x, d.y, d.f); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "rgba(255,232,214," + (.15 + .25 * Math.sin(t * .9 + d.ph) * .5 + .12) + ")"; ctx.beginPath(); ctx.arc(sc[0], sc[1], d.sz * sc[2], 0, 6.2832); ctx.fill(); });
    mark("fireflies+dust"); drawFog(fogFront, t, dens); mark("frontfog");
    // dark bushes in the bottom corners, and the heavy vignette
    setLayer(1.3); ctx.fillStyle = "rgba(20,20,40,1)"; [[0, 1.0], [140, 1.0], [-120, 1.0], [1900, 1.0], [2060, 1.0], [2240, 1.0]].forEach(function (q, i) { var sway = Math.sin(t * .8 + i) * 4; ctx.beginPath(); ctx.ellipse(q[0] + sway, DH * 1.0 + (i % 3) * 8, 150 + (i % 2) * 40, 62 + (i % 3) * 8, 0, 0, 6.2832); ctx.fill(); });
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(overlay, 0, 0);
    var endFog = sm((p - .84) / .16) * .80; if (endFog > 0) { ctx.fillStyle = "rgba(196,150,172," + endFog.toFixed(3) + ")"; ctx.fillRect(0, 0, CW, CH); }      // the fog closes in as the scene ends
    mark("vignette"); cue.style.opacity = p > .03 ? 0 : ""; capEl.classList.toggle("dark", p > .90); bar.style.transform = "scaleX(" + p.toFixed(4) + ")"; setCap(p);
    // sound: wind, the river (louder when you are on the stones), the song's intensity
    if (window.Snd) { var onWater = clamp(hero.pos / 2, 0, 1), sc2 = toScreen(cxAt(.7), .7 * DH, 1); Snd.update({ gust: gust, river: .35 + .6 * onWater * fade, riverPan: clamp((sc2[0] / CW - .5) * 1.4, -1, 1), intensity: p, fog: dens - 1 }); }
    if (window.Snd && Snd.on && Math.random() < dt * .09) { var bi = Math.floor(Math.random() * birds.length), bb = birds[bi], bx = (((bb.x + t * bb.v * TS) % (DW + 400)) - 200), bs = toScreen(bx, bb.y, .05); if (bs[0] > 0 && bs[0] < CW) Snd.chirp(clamp((bs[0] / CW - .5) * 1.8, -1, 1), .8); }
  }

  // ───────────── start ─────────────
  window.addEventListener("resize", resize); resize();
  function begin(withSound) {
    document.getElementById("entry").classList.add("out"); started = true; document.documentElement.classList.remove("gated");
    if (withSound && window.Snd) { Snd.start(); document.getElementById("sndbtn").textContent = "Sound on"; document.getElementById("sndbtn").setAttribute("aria-pressed", "true"); }
    setTimeout(function () { var e = document.getElementById("entry"); if (e && e.parentNode) e.parentNode.removeChild(e); }, 1000);
  }
  document.getElementById("gate-on").addEventListener("click", function () { begin(true); });
  document.getElementById("gate-off").addEventListener("click", function () { begin(false); });
  document.getElementById("sndbtn").addEventListener("click", function () { var on = this.getAttribute("aria-pressed") === "true"; if (on) { Snd.mute(true); this.textContent = "Sound off"; this.setAttribute("aria-pressed", "false"); } else { Snd.start(); this.textContent = "Sound on"; this.setAttribute("aria-pressed", "true"); } });
  if (frozenP != null) { document.documentElement.classList.remove("gated"); var en = document.getElementById("entry"); if (en) en.parentNode.removeChild(en); started = true; }
  window.__climb = { cam: cam, hero: hero, NODES: NODES, toScreen: toScreen, DPR: function () { return DPR; } };
  requestAnimationFrame(frame);
})();

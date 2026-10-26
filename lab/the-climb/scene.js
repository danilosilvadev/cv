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
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(s, s);
    var RIM = [255, 184, 140], TAU = 6.2832, aa = sm(pose.amp), g = pose.ph / TAU, idle = 1 - aa, breathe = Math.sin(t * 1.5), yaw = pose.yaw || 0, cyw = Math.cos(yaw), syw = Math.sin(yaw), cph = Math.cos(.42), sph = Math.sin(.42);
    var cg = Math.cos(TAU * g), sg = Math.sin(TAU * g);
    function P(p) { var X = p[0] * cyw + p[2] * syw, Z = -p[0] * syw + p[2] * cyw; return [X, -(p[1] * cph) - Z * sph, Z]; }
    // body motion: the pelvis falls onto each foot and shifts over it; the torso twists against the hips
    var S = 27 * aa, H = 15 * aa, pelvisY = 84 + 1.7 * aa * (-Math.cos(2 * TAU * g)) + breathe * .5 * idle, swayX = -3.2 * aa * Math.sin(TAU * (g - .05)) + Math.sin(t * .7) * 1.1 * idle, hz = 3.4 * aa * cg, tw = aa * cg;
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
    var chestY = pelvisY + 43;
    function bp(v, xo, zo, yo) { return [lerp(swayX, swayX * .7, v) + xo, lerp(pelvisY + 3, chestY, v) + (yo || 0), lerp(0, 2.4, v) + (zo || 0) + lerp(-(xo / 8) * 3.4, (xo / 21) * 5.8, v) * tw]; }
    // arms: swing against the legs, elbows bending
    var thL = -.62 * aa * cg + Math.sin(t * .9) * .03 * idle, thR = .30 * aa * cg + Math.sin(t * .9 + 1) * .03 * idle;
    function arm(side, th, b0) {
      var sp = bp(1, side * 21, 0, -3), el = [sp[0] + side * 3.2 + 0, sp[1] - 29 * Math.cos(th), sp[2] + 29 * Math.sin(th)], bth = th + b0, wr = [el[0] - side * .6, el[1] - 27 * Math.cos(bth), el[2] + 27 * Math.sin(bth)];
      return { sh: sp, el: el, wr: wr, side: side };
    }
    var AL = arm(-1, thL, .22 + .55 * Math.max(0, thL) + .18 * aa), AR = arm(1, thR, .45 + .3 * aa);
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
    var nk = P([swayX * .5, pelvisY * .5 + 42 + 43 - 4, 3]), look = Math.sin(t * .55) * .09 + Math.sin(t * 1.3) * .03, tilt = -sg * .04 * aa, headR = look + tilt;
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
  var hero = { pos: 0, target: 0, ph: 0, amp: 0, moving: false, yaw: .16 };
  function heroYaw(pos) { var i = Math.min(NN - 2, Math.max(0, Math.floor(pos))), a = NODES[i], b = NODES[i + 1], dx = b.x - a.x, dy = (b.v - a.v) * DH; return Math.atan2(dx, -dy * 1.7); }
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


  // ═════════════ SCENE 2 · the arid face: a wall of rock that warms from sandstone to slate as it climbs ═════════════
  var FASTT = /fast/.test(location.hash), T2 = 2800, GW = .8, A2 = 70, S2F = 1.8, RTOT = Math.round((T2 * GW) / (A2 * S2F) * 4);     // camera travel, wall parallax, how far a hand-over-hand cycle lifts him, his scale, how many reaches the wall takes
  function h2(x, y) { var q = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return q - Math.floor(q); }
  function vnz(x, y) { var xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi); return lerp(lerp(h2(xi, yi), h2(xi + 1, yi), xf), lerp(h2(xi, yi + 1), h2(xi + 1, yi + 1), xf), yf); }
  function Hf(x, y) { return vnz(x * .0034, y * .0026) * 1.0 + vnz(x * .0095, y * .0075) * .5 + vnz(x * .023, y * .02) * .2; }
  var wall = (function () {
    var r = mulberry(222), cw = 92, ch = 64, x0 = -520, x1 = 2440, y0 = -2700, y1 = 1400, nx = Math.ceil((x1 - x0) / cw), ny = Math.ceil((y1 - y0) / ch), V = [], i, j;
    for (j = 0; j <= ny; j++) { var row = []; for (i = 0; i <= nx; i++) row.push([x0 + i * cw + (r() - .5) * cw * .55, y0 + j * ch + (r() - .5) * ch * .6]); V.push(row); }
    var arid = [[232, 156, 98], [210, 120, 74], [182, 90, 60], [240, 182, 124], [154, 76, 56]], rock = [[136, 118, 142], [112, 98, 126], [150, 130, 150], [96, 84, 110], [124, 106, 130]], bk = {};
    function tri(a, b, c, k) {
      var cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3, alt = clamp((1000 - cy) / 3300, 0, 1), mt = sm((alt - .56) / .24);
      var lit = (Hf(cx - 14, cy - 10) - Hf(cx + 14, cy + 10)) * 1.5, L = clamp(.88 + lit + (r() - .5) * .16 + (vnz(cx * .05, cy * .05) - .5) * .12, .5, 1.28), Lq = Math.round(L * 10) / 10;
      var col = mixc(arid[k], rock[k], mt).map(function (v) { return v * Lq; }), fg = .08 + .55 * Math.pow(clamp((cy - 150) / 900, 0, 1), 1.2), fq = Math.round(fg * 8) / 8;
      var key = k + "|" + Math.round(Lq * 10) + "|" + Math.round(mt * 6) + "|" + Math.round(fq * 8); if (!bk[key]) bk[key] = { col: fogged(col, fq), path: new Path2D() };
      var pp = bk[key].path; [a, b, c].forEach(function (q, n) { var dx = q[0] - cx, dy = q[1] - cy, d = Math.hypot(dx, dy) || 1, x = q[0] + dx / d * 1.4, y = q[1] + dy / d * 1.4; n ? pp.lineTo(x, y) : pp.moveTo(x, y); }); pp.closePath();
    }
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
      var A = V[j][i], B = V[j][i + 1], C = V[j + 1][i + 1], D = V[j + 1][i], cy0 = (A[1] + C[1]) / 2, k = (((Math.floor(cy0 * .0085 + vnz(i * .22, j * .17) * 2.2) % 5) + 5) % 5);
      if (r() < .5) { tri(A, B, C, k); tri(A, C, D, k); } else { tri(A, B, D, k); tri(B, C, D, k); }
    }
    var list = Object.keys(bk).map(function (k) { return bk[k]; });
    var crack = new Path2D(), crackHi = new Path2D(); for (i = 0; i < 70; i++) { var x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), len = 140 + r() * 340, n = Math.ceil(len / 36), px = x, py = y; crack.moveTo(px, py); crackHi.moveTo(px + 3, py); for (j = 0; j < n; j++) { px += (r() - .5) * 28 + (r() < .5 ? 0 : 6); py += 36 + r() * 8; crack.lineTo(px, py); crackHi.lineTo(px + 3, py); } }
    var ledges = []; [-60, -330, -640, -950, -1260, -1580, -1900, -2220].forEach(function (Y, n) { var lx = 120 + r() * 700, ln = 380 + r() * 520, pts = [], m = Math.ceil(ln / 30); for (j = 0; j <= m; j++) pts.push([lx + ln * j / m, Y + (r() - .5) * 9 - Math.sin(Math.PI * j / m) * 10]); ledges.push({ pts: pts, y: Y, x: lx, w: ln }); });
    return { list: list, crack: crack, crackHi: crackHi, ledges: ledges, base: vgrad(y0, y1, [[0, [118, 104, 128]], [.5, [140, 110, 118]], [1, [196, 130, 100]]]), x0: x0, x1: x1, y0: y0, y1: y1 };
  })();
  // far scenery: a hot sky, a white-gold sun, mesas melting into the haze
  var sky2G = vgrad(-1100, 1500, [[0, [186, 122, 118]], [.45, [236, 182, 148]], [1, [246, 206, 168]]]);
  function mesa(seed, baseY, hmin, hmax, wmin, wmax) {
    var r = mulberry(seed), p = new Path2D(), x = X0 - 100, y = baseY - hmin; p.moveTo(X0 - 100, baseY + 600); p.lineTo(X0 - 100, y);
    while (x < X1 + 100) { var w = wmin + r() * (wmax - wmin), nh = hmin + r() * (hmax - hmin); p.lineTo(x, y); p.lineTo(x + 18, baseY - nh); p.lineTo(x + w - 18, baseY - nh); p.lineTo(x + w, baseY - nh * (.7 + .3 * r())); y = baseY - nh * (.7 + .3 * r()); x += w + r() * 80; } p.lineTo(X1 + 100, baseY + 600); p.closePath(); return p;
  }
  var mesas = [{ p: mesa(5, 760, 40, 130, 260, 640), f: .08, g: .18, c0: [236, 172, 140], c1: [226, 168, 142] }, { p: mesa(6, 800, 60, 190, 220, 520), f: .14, g: .30, c0: [224, 150, 118], c1: [214, 146, 120] }, { p: mesa(7, 860, 90, 260, 180, 460), f: .22, g: .46, c0: [204, 124, 98], c1: [190, 118, 98] }].map(function (m, i) { m.g1 = vgrad(500, 1200, [[0, fogged(m.c0, .55 - i * .12)], [1, fogged(m.c1, .5 - i * .1)]]); return m; });
  var hawks = [{ ph: 0, r: 420, y: 220, sz: 34 }, { ph: 2.6, r: 300, y: 330, sz: 24 }];
  var fogs2 = [
    { f: .7, g: .8, y: 640, up: 300, down: 240, col: [196, 150, 172], a: .95, speed: 9, off: 40, seed: 201 },
    { f: .6, g: .8, y: 330, up: 150, down: 130, col: [255, 216, 176], a: .30, speed: 12, off: 300, seed: 202 }, { f: .8, g: .8, y: -150, up: 150, down: 130, col: [255, 212, 172], a: .26, speed: 15, off: 700, seed: 203 },
    { f: .7, g: .8, y: -780, up: 150, down: 130, col: [236, 200, 188], a: .26, speed: 11, off: 90, seed: 204 }, { f: .85, g: .8, y: -1500, up: 160, down: 130, col: [214, 186, 196], a: .30, speed: 17, off: 500, seed: 205 },
    { f: .75, g: .8, y: -2150, up: 170, down: 140, col: [190, 166, 190], a: .34, speed: 13, off: 800, seed: 206 },
    { f: .1, g: .12, y: 200, up: 130, down: 120, col: [70, 52, 84], a: .9, speed: 6, off: 100, seed: 207, storm: true }, { f: .16, g: .2, y: 360, up: 150, down: 110, col: [84, 62, 96], a: .8, speed: 9, off: 640, seed: 208, storm: true }
  ].map(addFog);
  var edgeX = function (Y) { return 1380 + 210 * Math.sin(Y * .0029) + 110 * vnz(Y * .005, 5) + 90 * Math.sin(Y * .011 + 1); };
  var wallClip = new Path2D(), rimR = new Path2D(), fringeL = new Path2D(), rimL = new Path2D(); (function () {
    var yTop = -3700, yBot = 1500, st = 46, Y; wallClip.moveTo(-1200, yTop); wallClip.lineTo(edgeX(yTop), yTop); rimR.moveTo(edgeX(yTop), yTop);
    for (Y = yTop; Y <= yBot; Y += st) { var x = edgeX(Y) + (vnz(Y * .03, 1) - .5) * 26; wallClip.lineTo(x, Y); rimR.lineTo(x, Y); }
    wallClip.lineTo(-1200, yBot); wallClip.closePath();
    fringeL.moveTo(-1200, yTop); rimL.moveTo(60, yTop); for (Y = yTop; Y <= yBot; Y += st) { var e = 50 + 110 * vnz(Y * .004, 3) + 70 * Math.sin(Y * .011); fringeL.lineTo(e, Y); rimL.lineTo(e, Y); } fringeL.lineTo(-1200, yBot); fringeL.closePath();
  })();
  var fringeG = vgrad(-3700, 1500, [[0, [56, 38, 56]], [1, [44, 26, 40]]]);

  // the climber on the wall: two-bone limbs reach for holds; every reach is a quarter of a cycle: right hand, left foot, left hand, right foot
  var hero2 = { reach: 0, target: 0, moving: false, amp: 0 };
  function holdPos(limb, k) {                                         // where the limb grips hold number k, in figure units relative to the hip at its start
    var m = { RH: 0, LF: 1, LH: 2, RF: 3 }[limb], u = k + (m + 1) / 4, hipY = -A2 * u, isHand = limb[1] === "H", side = limb[0] === "R" ? 1 : -1;
    var x = side * (isHand ? 32 : 17) + (isHand ? 12 : 6) * Math.sin(k * (limb === "RH" ? 2.1 : limb === "LH" ? 1.7 : limb === "RF" ? 1.3 : 2.3) + (side > 0 ? 0 : 1));
    return [x, hipY + (isHand ? -100 : 40)];
  }
  function limbAt(limb, reach) {
    var m = { RH: 0, LF: 1, LH: 2, RF: 3 }[limb], n = Math.floor((reach - m) / 4), w = clamp(reach - m - 4 * n, 0, 1), a = holdPos(limb, n - 1), b = holdPos(limb, n), e = sm(w), arc = Math.sin(Math.PI * w) * (limb[1] === "H" ? 12 : 14);
    return [lerp(a[0], b[0], e) + (limb[0] === "R" ? arc * .5 : -arc * .5), lerp(a[1], b[1], e) - arc];
  }
  function ik(sx, sy, tx, ty, l1, l2, bend) {                         // elbow or knee for a limb reaching from (sx,sy) to (tx,ty); bend = +1 / -1 picks the side
    var dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy) || 1, dm = clamp(d, Math.abs(l1 - l2) + 1, l1 + l2 - .6), ux = dx / d, uy = dy / d, a = (l1 * l1 - l2 * l2 + dm * dm) / (2 * dm), hh = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    return { j: [sx + ux * a - uy * hh * bend, sy + uy * a + ux * hh * bend], end: [sx + ux * dm, sy + uy * dm] };
  }
  function stroke2(p0, p1, p2, w, c0, c1) { ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = css(c0); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke(); ctx.strokeStyle = css(c1, .75); ctx.lineWidth = w * .26; ctx.beginPath(); ctx.moveTo(p0[0] + w * .26, p0[1]); ctx.lineTo(p1[0] + w * .26, p1[1]); ctx.lineTo(p2[0] + w * .26, p2[1]); ctx.stroke(); }
  function drawWallClimber(x, y, s, t, gust, alpha) {
    var reach = hero2.reach, u = reach / 4, a = hero2.amp, RIMc = [255, 184, 140];
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(s, s);
    var breathe = Math.sin(t * 2.1) * .8, sway = Math.sin(u * 6.2832) * 4 * a + Math.sin(t * .8) * .8, hipY = -A2 * u; ctx.translate(0, breathe * (1 - a * .5));                       // the hip rises smoothly with the reaches (figure units)
    // the rope, trailing down the wall behind him and swaying
    ctx.strokeStyle = "rgba(214,176,128,.95)"; ctx.lineWidth = 3.2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(sway, 2); ctx.bezierCurveTo(sway + 24 + Math.sin(t * .9) * 12, 120, sway - 18 + Math.sin(t * 1.1 + 1) * 22, 300, sway + 8 + Math.sin(t * .7) * 30 + gust * 24, 760); ctx.stroke();
    ctx.strokeStyle = "rgba(120,80,60,.55)"; ctx.lineWidth = 1; ctx.stroke();
    var RH = limbAt("RH", reach), LH = limbAt("LH", reach), RF = limbAt("RF", reach), LF = limbAt("LF", reach);
    function rel(p) { return [p[0], p[1] - hipY]; }                                                           // hold positions are hip-relative at u=0; convert to the current hip
    var rh = rel(RH), lh = rel(LH), rf = rel(RF), lf = rel(LF);
    var sh = [[-21 + sway * .4, -48], [21 + sway * .4, -48]], hp = [[-9, 0], [9, 0]];
    var legL = ik(hp[0][0], 0, lf[0], lf[1], 42, 42, -1), legR = ik(hp[1][0], 0, rf[0], rf[1], 42, 42, 1), armL = ik(sh[0][0], sh[0][1], lh[0], lh[1], 34, 32, -1), armR = ik(sh[1][0], sh[1][1], rh[0], rh[1], 34, 32, 1);
    stroke2([hp[0][0], 0], legL.j, legL.end, 15, [52, 54, 102], RIMc); stroke2([hp[1][0], 0], legR.j, legR.end, 15, [58, 60, 112], RIMc);
    [[legL.end, 0], [legR.end, 1]].forEach(function (b) { ctx.fillStyle = "rgba(40,34,52,1)"; ctx.beginPath(); ctx.ellipse(b[0][0], b[0][1] + 2, 9, 5, 0, 0, 6.2832); ctx.fill(); ctx.fillStyle = "rgba(150,138,156,1)"; ctx.fillRect(b[0][0] - 8, b[0][1] + 5, 16, 1.6); });
    var lean = Math.sin(u * 6.2832) * .07 * a + Math.sin(t * 1.9) * .01;                                                               // the body leans into the wall as it pulls
    ctx.save(); ctx.translate(0, 0); ctx.rotate(lean);
    part([[-17, 4], [17, 4], [22, -50], [10, -57], [-10, -57], [-22, -50]], [82, 92, 170], [50, 54, 110]); part([[10, -56], [14, -57], [22, -50], [20, -44]], RIMc, [240, 170, 140]); part([[19, -50], [22, -50], [17, 4], [15, 4]], RIMc, [232, 160, 130]);
    part([[-17, 2], [17, 2], [17, -3], [-17, -3]], [190, 168, 120], [150, 120, 90]);                         // the harness at his waist
    part([[-16, -52], [16, -52], [19, -34], [18, -8], [-18, -8], [-19, -34]], [178, 102, 70], [122, 70, 58]); part([[14, -52], [16, -52], [19, -34], [18, -10], [16.5, -10], [17.5, -34]], [255, 200, 150], [240, 170, 130]);
    part([[-14, -52], [14, -52], [13, -43], [-13, -43]], [210, 130, 84], [190, 112, 76]); part([[-17, -12], [17, -12], [17, -2], [-17, -2]], [92, 98, 156], [66, 70, 122]);
    ctx.restore();
    stroke2(sh[0], armL.j, armL.end, 12.5, [64, 72, 142], RIMc); stroke2(sh[1], armR.j, armR.end, 12.5, [70, 78, 152], RIMc);
    [armL.end, armR.end].forEach(function (g) { ctx.fillStyle = "rgba(52,42,62,1)"; ctx.beginPath(); ctx.arc(g[0], g[1], 6, 0, 6.2832); ctx.fill(); });
    ctx.save(); ctx.translate(0, -63); ctx.rotate(-.12 + Math.sin(t * .7) * .04 + Math.sin(u * 6.2832 + 1) * .1 * a); ctx.translate(0, 63);                     // he looks up the wall
    part([[-5, -56], [5, -56], [6, -62], [-6, -62]], [156, 104, 104], [132, 88, 92]); part(ell(0, -74, 11.5, 12.5, 28), [66, 108, 130], [40, 70, 94]); part([[-11, -69], [11, -69], [10, -61], [-10, -61]], [58, 44, 62], [44, 34, 52]);
    var cres = []; for (var i = 0; i < 12; i++) { var q = -1.2 + 1.7 * i / 11; cres.push([11.5 * Math.cos(q), -74 + 12.5 * Math.sin(q)]); } for (i = 0; i < 12; i++) { q = .5 - 1.7 * i / 11; cres.push([9.2 * Math.cos(q), -74 + 10 * Math.sin(q)]); } part(cres, [255, 232, 214], RIMc);
    ctx.restore();
    var wd = clamp(Math.sin(t * .29) * .8 + Math.sin(t * .113 + 2) * .5 + (gust - .3) * .5 + .35, -1.15, 1.15), N = 12, up = [], dn = [], len = (66 + gust * 34) * Math.abs(wd) + 20, sg = wd < 0 ? -1 : 1, hang = (1 - clamp(Math.abs(wd), 0, 1)) * 26, k;
    part([[-13, -58], [13, -58], [15, -49], [-15, -49]], [252, 62, 52], [206, 34, 40]);
    for (k = 0; k <= N; k++) { var uu = k / N, wv = Math.sin(t * 6.2 - uu * 5.5 + u * 3) * (1.5 + 8 * uu) * (.5 + gust * .9 + a * .3), px = 4 * sg + sg * len * uu * .8, py = -54 - 9 * uu * Math.abs(wd) * (1 + gust) + hang * uu * uu + wv, wid = 8 * (1 - uu * .55); up.push([px, py - wid * .5]); dn.push([px, py + wid * .5]); }
    part(up.concat(dn.reverse()), [255, 74, 60], [208, 36, 42]);
    ctx.restore();
  }

  var dust2 = []; (function () { var r = mulberry(333); for (var k = 0; k < 130; k++) dust2.push({ x: X0 + r() * (X1 - X0), y: -2600 + r() * 4000, f: .3 + r() * 1.1, vx: 18 + r() * 40, vy: -4 - r() * 16, ph: r() * 6.28, sz: .8 + r() * 2.2 }); })();
  function drawScene2(t, dt, q, gust) {
    var portrait = innerWidth < innerHeight * 1.1;
    cam.x = portrait ? 930 + 90 * Math.sin(q * 5) : 960 + 150 * Math.sin(q * 3.1 + .4); cam.tilt = T2 * clamp(hero2.reach / RTOT, 0, 1); cam.zoom = 1 + .05 * q; cam.mz = 1; stormAmt = sm((q - .5) / .5);   // the camera rises with him, so he is never left behind
    // the climber reaches towards the quarter-cycle that matches your progress
    var tgt = Math.round(clamp(q / .985, 0, 1) * RTOT); hero2.target = tgt;
    if (Math.abs(hero2.reach - hero2.target) > .001) {
      var dir = Math.sign(hero2.target - hero2.reach), prev = hero2.reach; hero2.reach += dir * dt * (FASTT ? 12 : 1) / .27; if ((dir > 0 && hero2.reach > hero2.target) || (dir < 0 && hero2.reach < hero2.target)) hero2.reach = hero2.target; hero2.moving = true;
      if (dir > 0 && Math.floor(hero2.reach + 1e-6) > Math.floor(prev + 1e-6)) { var m = Math.floor(hero2.reach + 1e-6) % 4, hs = toScreen(960, 700, .8); if (window.Snd) { Snd.hold(m % 2 ? 1 : .8, clamp((hs[0] / CW - .5) * 1.2, -1, 1), m === 1 || m === 3); if (m === 0) Snd.rope(.7); if (m === 2) Snd.breath(.8); if (Math.random() < .14) Snd.pebbles(.8, clamp(Math.random() * 1.6 - .8, -1, 1)); } }
    } else hero2.moving = false;
    hero2.amp += ((hero2.moving ? 1 : 0) - hero2.amp) * (1 - Math.pow(.0004, dt));
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#c9876a"; ctx.fillRect(0, 0, CW, CH);
    // the sky, the sun, the hawks
    setLayer(.05, 1, .1); ctx.fillStyle = sky2G; ctx.fillRect(X0, -1100, X1 - X0, 2600);
    setLayer(.05, 1, .12); var sg = ctx.createRadialGradient(1480, 190, 0, 1480, 190, 520); sg.addColorStop(0, "rgba(255,244,214,.95)"); sg.addColorStop(.14, "rgba(255,236,196,.75)"); sg.addColorStop(.4, "rgba(255,214,160,.28)"); sg.addColorStop(1, "rgba(255,214,160,0)"); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(1480, 190, 520, 0, 6.2832); ctx.fill();
    ctx.fillStyle = "rgba(255,250,232,1)"; ctx.beginPath(); ctx.arc(1480, 190, 62, 0, 6.2832); ctx.fill();
    hawks.forEach(function (h, i) { setLayer(.08, 1, .14); var a = t * .12 * TS + h.ph, x = 1180 + Math.cos(a) * h.r, y = h.y + Math.sin(a * 2) * 50, d = Math.cos(a) > 0 ? 1 : -1, fl = Math.sin(t * 1.4 + h.ph) * h.sz * .05; ctx.fillStyle = "rgba(90,50,60,.9)"; ctx.beginPath(); ctx.moveTo(x - h.sz * d, y + fl); ctx.quadraticCurveTo(x - h.sz * .35 * d, y - h.sz * .42, x, y - 2); ctx.quadraticCurveTo(x + h.sz * .35 * d, y - h.sz * .42, x + h.sz * d, y + fl); ctx.quadraticCurveTo(x + h.sz * .3 * d, y - h.sz * .12, x, y + 3); ctx.quadraticCurveTo(x - h.sz * .3 * d, y - h.sz * .12, x - h.sz * d, y + fl); ctx.fill(); });
    mesas.forEach(function (m, i) { setLayer(m.f, 1, m.g); ctx.fillStyle = m.g1; ctx.fill(m.p); });
    // the wall
    setLayer(.7, 1, GW); ctx.save(); ctx.clip(wallClip); ctx.fillStyle = wall.base; ctx.fillRect(wall.x0, wall.y0, wall.x1 - wall.x0, wall.y1 - wall.y0);
    wall.list.forEach(function (b) { ctx.fillStyle = css(b.col); ctx.fill(b.path); });
    ctx.strokeStyle = "rgba(44,22,36,.5)"; ctx.lineWidth = 3; ctx.stroke(wall.crack); ctx.strokeStyle = "rgba(255,206,160,.26)"; ctx.lineWidth = 1.6; ctx.stroke(wall.crackHi);
    wall.ledges.forEach(function (l) { var yy = l.y; ctx.fillStyle = "rgba(255,206,150,.5)"; ctx.beginPath(); l.pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); for (var i = l.pts.length - 1; i >= 0; i--) ctx.lineTo(l.pts[i][0], l.pts[i][1] + 14); ctx.closePath(); ctx.fill(); var g = ctx.createLinearGradient(0, yy + 12, 0, yy + 130); g.addColorStop(0, "rgba(40,18,32,.55)"); g.addColorStop(1, "rgba(40,18,32,0)"); ctx.fillStyle = g; ctx.fillRect(l.x, yy + 12, l.w, 118); });
    ctx.restore(); ctx.strokeStyle = "rgba(255,226,180,.8)"; ctx.lineWidth = 3.5; ctx.stroke(rimR); ctx.strokeStyle = "rgba(36,18,34,.55)"; ctx.lineWidth = 10; ctx.save(); ctx.translate(-8, 0); ctx.stroke(rimR); ctx.restore();
    fogs2.forEach(function (o) { if (!o.storm) drawFog(o, t, 1); });
    // the climber, at the wall's depth
    var hx = 780 + (portrait ? 250 : 0) + 24 * Math.sin(hero2.reach / 4 * .6), hy = 720 - A2 * S2F * (hero2.reach / 4); setLayer(.7, 1, GW); drawWallClimber(hx, hy, S2F, t, gust, 1);
    // heat haze and the storm gathering
    fogs2.forEach(function (o) { if (o.storm) drawFog(o, t, 1); });
    // the dark foreground rock that frames the climb, with a warm rim of sunlight
    setLayer(1.15, 1, 1.2); ctx.fillStyle = fringeG; ctx.fill(fringeL); ctx.strokeStyle = "rgba(255,160,100,.5)"; ctx.lineWidth = 3; ctx.stroke(rimL);
    // wind-blown sand: long streaks across the view, and warm motes rising in the heat
    ctx.setTransform(1, 0, 0, 1, 0, 0); for (var k = 0; k < 26; k++) { var x = (((k * 197 + t * (260 + (k % 5) * 90) * TS) % (CW + 500)) - 250), y = (k * 83 % CH), ln = (110 + (k % 7) * 40) * DPR; ctx.strokeStyle = "rgba(255,224,184," + (.05 + .07 * ((k * 37) % 10) / 10 + gust * .05).toFixed(3) + ")"; ctx.lineWidth = (1 + (k % 3)) * DPR; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ln, y + 6 * DPR); ctx.stroke(); }
    dust2.forEach(function (d) { d.x += d.vx * dt * TS * (.6 + gust); d.y += d.vy * dt * TS; if (d.x > X1) d.x = X0; if (d.y < -2600) d.y = 1400; var sc = toScreen(d.x, d.y, d.f); sc[1] = CH / 2 + sc[2] * (d.y - 540 + cam.tilt * 1.0 * (.5 + d.f * .5)); if (sc[0] < -20 || sc[0] > CW + 20 || sc[1] < -20 || sc[1] > CH + 20) return; ctx.fillStyle = "rgba(255,226,186," + (.2 + .22 * Math.sin(t * .9 + d.ph)).toFixed(3) + ")"; ctx.beginPath(); ctx.arc(sc[0], sc[1], d.sz * sc[2], 0, 6.2832); ctx.fill(); });
    // the storm closes the sky towards the end
    var storm = sm((q - .62) / .38) * .62; ctx.fillStyle = "rgba(52,40,66," + storm.toFixed(3) + ")"; ctx.fillRect(0, 0, CW, CH);
  }


  // ═════════════ the trail prototype: a path cut into a mountain, seen from the side, the walker in profile ═════════════
  var CONCEPT = /concept/.test(location.hash);
  function pathY(x) { return 790 - (x - 200) * .10 + 30 * Math.sin(x * .0042) + 12 * Math.sin(x * .013 + 1); }
  function ridgeY(x) { return pathY(x) - 400 - 150 * vnz(x * .0032, 8) - 70 * vnz(x * .011, 3) - 90 * Math.abs(Math.sin(x * .0057 + .6)); }
  function peaksPath(seed, base, hmin, hmax, step) {
    var r = mulberry(seed), p = new Path2D(), x = X0 - 100, h = hmin; p.moveTo(x, base + 800); p.lineTo(x, base - h);
    while (x < X1 + 100) { x += step * (.5 + r()); h = hmin + (hmax - hmin) * Math.pow(r(), 1.2); p.lineTo(x, base - h); if (r() < .4) { x += step * .3; p.lineTo(x, base - h * (.82 + .1 * r())); } }
    p.lineTo(X1 + 100, base + 800); p.closePath(); return p;
  }
  var tpeaks = [[11, 880, 70, 190, 90, .06, .50, [252, 214, 192]], [12, 950, 80, 230, 80, .12, .46, [240, 190, 176]], [13, 1040, 90, 260, 70, .2, .40, [222, 164, 160]], [14, 1160, 100, 300, 64, .32, .32, [190, 132, 146]], [15, 1300, 110, 330, 56, .5, .24, [150, 100, 128]]].map(function (q) { return { p: peaksPath(q[0], q[1], q[2], q[3], q[4]), f: q[5], c: q[7], fg: q[6], base: q[1] }; });
  var tfogs = [[.06, 900, [255, 220, 196], .42], [.12, 980, [250, 204, 190], .46], [.2, 1070, [236, 184, 178], .5], [.32, 1190, [214, 160, 172], .5], [.5, 1330, [180, 128, 156], .5], [.9, 1500, [160, 112, 144], .4]].map(function (q, i) { return addFog({ f: q[0], g: q[0] * .9 + .05, y: q[1], up: 120, down: 70, col: q[2], peak: 1, a: q[3], speed: 5 + i * 3, off: i * 411, seed: 300 + i }); });
  var rockTrailG = vgrad(-400, 1100, [[0, [132, 104, 130]], [.5, [150, 108, 112]], [1, [96, 66, 82]]]);
  var tdead = []; (function () { var r = mulberry(404); for (var i = 0; i < 9; i++) { var x = 60 + r() * 2300; tdead.push({ x: x, h: 70 + r() * 90, lean: (r() - .5) * 26, br: [r(), r(), r()] }); } })();
  var tstones = []; (function () { var r = mulberry(405); for (var i = 0; i < 38; i++) { var x = -200 + r() * 2700; tstones.push({ x: x, w: 8 + r() * 26, h: 6 + r() * 18, o: r() * 14 }); } })();
  function drawTrail(t, dt, q, gust) {
    var heroX = lerp(300, 1500, q), ty = pathY(heroX); cam.x = lerp(960, 1030, q); cam.tilt = 760 - ty; cam.zoom = .66; cam.mz = 1; stormAmt = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#e0a690"; ctx.fillRect(0, 0, CW, CH);
    setLayer(.05, 1, .08); ctx.fillStyle = sky2G; ctx.fillRect(X0, -1100, X1 - X0, 2600);
    setLayer(.05, 1, .1); var sg = ctx.createRadialGradient(1380, 300, 0, 1380, 300, 560); sg.addColorStop(0, "rgba(255,244,214,.95)"); sg.addColorStop(.14, "rgba(255,230,190,.7)"); sg.addColorStop(.45, "rgba(255,206,160,.25)"); sg.addColorStop(1, "rgba(255,206,160,0)"); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(1380, 300, 560, 0, 6.2832); ctx.fill(); ctx.fillStyle = "rgba(255,250,236,1)"; ctx.beginPath(); ctx.arc(1380, 300, 58, 0, 6.2832); ctx.fill();
    hawks.forEach(function (h) { setLayer(.08, 1, .12); var a = t * .12 * TS + h.ph, x = 1100 + Math.cos(a) * h.r, y = h.y + 40 + Math.sin(a * 2) * 50, d = Math.cos(a) > 0 ? 1 : -1, fl = Math.sin(t * 1.4 + h.ph) * h.sz * .05; ctx.fillStyle = "rgba(96,56,76,.9)"; ctx.beginPath(); ctx.moveTo(x - h.sz * d, y + fl); ctx.quadraticCurveTo(x - h.sz * .35 * d, y - h.sz * .42, x, y - 2); ctx.quadraticCurveTo(x + h.sz * .35 * d, y - h.sz * .42, x + h.sz * d, y + fl); ctx.quadraticCurveTo(x + h.sz * .3 * d, y - h.sz * .12, x, y + 3); ctx.quadraticCurveTo(x - h.sz * .3 * d, y - h.sz * .12, x - h.sz * d, y + fl); ctx.fill(); });
    tpeaks.forEach(function (m, i) { setLayer(m.f, 1, m.f * .9 + .05); var g = ctx.createLinearGradient(0, m.base - 320, 0, m.base + 160); g.addColorStop(0, css(fogged(m.c, m.fg * .75))); g.addColorStop(1, css(fogged(m.c, Math.min(1, m.fg * 1.5)))); ctx.fillStyle = g; ctx.fill(m.p); drawFog(tfogs[i], t, 1); });
    // the rock above the trail, up to the ridge
    setLayer(1, 1, 1); var x0 = -520, x1 = 2440, st = 40, x, clip = new Path2D(); clip.moveTo(x0, ridgeY(x0)); for (x = x0; x <= x1; x += st) clip.lineTo(x, ridgeY(x)); for (x = x1; x >= x0; x -= st) clip.lineTo(x, pathY(x) - 2); clip.closePath();
    ctx.save(); ctx.clip(clip); ctx.fillStyle = rockTrailG; ctx.fillRect(x0, -500, x1 - x0, 1700); wall.list.forEach(function (b) { ctx.fillStyle = css(b.col); ctx.fill(b.path); });
    var sh = ctx.createLinearGradient(0, 0, 0, 1000); sh.addColorStop(0, "rgba(255,196,150,.0)"); sh.addColorStop(.7, "rgba(60,36,70,.0)"); ctx.fillStyle = "rgba(112,84,132,.34)"; ctx.fillRect(x0, -500, x1 - x0, 1700);
    var ao = ctx.createLinearGradient(0, 400, 0, 900); ao.addColorStop(0, "rgba(50,28,50,0)"); ao.addColorStop(1, "rgba(50,28,50,.45)"); ctx.fillStyle = ao; ctx.fillRect(x0, 400, x1 - x0, 600); ctx.restore();
    // the ridge catches the light
    ctx.strokeStyle = "rgba(255,214,170,.7)"; ctx.lineWidth = 3; ctx.beginPath(); for (x = x0; x <= x1; x += st) x === x0 ? ctx.moveTo(x, ridgeY(x)) : ctx.lineTo(x, ridgeY(x)); ctx.stroke();
    // dead trees clinging to the slope above the trail
    tdead.forEach(function (d) { var by = pathY(d.x) - 4 - 30 * d.br[0], sw = Math.sin(t * .6 + d.x) * 1.2; ctx.strokeStyle = "rgba(48,30,50,.95)"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(d.x, by); ctx.quadraticCurveTo(d.x + d.lean * .4, by - d.h * .5, d.x + d.lean + sw, by - d.h); ctx.stroke(); ctx.lineWidth = 2.4; [.45, .7, .9].forEach(function (u, i) { var bx = d.x + d.lean * u * .9, byy = by - d.h * u, dir = i % 2 ? 1 : -1; ctx.beginPath(); ctx.moveTo(bx, byy); ctx.lineTo(bx + dir * (18 + 18 * d.br[i]) + sw, byy - 14 - 10 * d.br[i]); ctx.stroke(); }); });
    // the ledge: the path, its lit edge, the cliff below it, the rail along the drop
    var cliff = new Path2D(); cliff.moveTo(x0, pathY(x0)); for (x = x0; x <= x1; x += st) cliff.lineTo(x, pathY(x) + 3); for (x = x1; x >= x0; x -= st) cliff.lineTo(x, pathY(x) + 90 + 70 * vnz(x * .006, 2) + 30 * Math.sin(x * .02)); cliff.closePath();
    var cg = ctx.createLinearGradient(0, 600, 0, 1100); cg.addColorStop(0, "rgba(84,52,72,1)"); cg.addColorStop(1, "rgba(150,104,136,.0)"); ctx.fillStyle = cg; ctx.fill(cliff); ctx.save(); ctx.clip(cliff); wall.list.forEach(function (b, i) { if (i % 3) return; ctx.globalAlpha = .35; ctx.fillStyle = css(b.col.map(function (v) { return v * .5; })); ctx.fill(b.path); }); ctx.restore();
    var top = new Path2D(), band = new Path2D(); band.moveTo(x0, pathY(x0) - 5); for (x = x0; x <= x1; x += st) band.lineTo(x, pathY(x) - 5); for (x = x1; x >= x0; x -= st) band.lineTo(x, pathY(x) + 9); band.closePath(); ctx.fillStyle = "rgb(224,178,140)"; ctx.fill(band);
    ctx.strokeStyle = "rgba(255,236,196,.9)"; ctx.lineWidth = 2.4; ctx.beginPath(); for (x = x0; x <= x1; x += st) x === x0 ? ctx.moveTo(x, pathY(x) - 5) : ctx.lineTo(x, pathY(x) - 5); ctx.stroke();
    tstones.forEach(function (o) { var y = pathY(o.x); ctx.fillStyle = "rgba(118,84,98,1)"; ctx.beginPath(); ctx.ellipse(o.x, y - 3 + o.o * .2, o.w, o.h * .5, 0, 0, 6.2832); ctx.fill(); ctx.fillStyle = "rgba(255,214,170,.5)"; ctx.beginPath(); ctx.ellipse(o.x - o.w * .2, y - 4 - o.h * .12 + o.o * .2, o.w * .55, o.h * .2, 0, 0, 6.2832); ctx.fill(); });
    for (x = -100; x < 2500; x += 110) { var y = pathY(x) + 5, y2 = pathY(x + 110) + 5; ctx.fillStyle = "rgba(70,44,56,1)"; ctx.fillRect(x - 2.5, y - 44, 5, 46); ctx.strokeStyle = "rgba(196,160,128,.95)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 38); ctx.quadraticCurveTo(x + 55, Math.max(y, y2) - 26 + 5, x + 110, y2 - 38); ctx.stroke(); }
    // cairns beside the path
    [[520, 1], [1180, 1.2], [1930, 1.1]].forEach(function (c) { var y = pathY(c[0]) - 2, s = c[1]; [[0, 0, 22, 9], [-1, -9, 17, 7.5], [1, -17, 12, 6], [0, -24, 8, 5]].forEach(function (p, i) { ctx.fillStyle = i % 2 ? "rgb(140,104,116)" : "rgb(112,80,98)"; ctx.beginPath(); ctx.ellipse(c[0] + p[0] * s, y + p[1] * s, p[2] * s, p[3] * s, 0, 0, 6.2832); ctx.fill(); }); });
    // the walker, in profile, going up the trail
    var ph = t * 7.85 * (CONCEPT ? 1 : 1), hy = pathY(heroX), slope = Math.atan2(pathY(heroX + 30) - pathY(heroX - 30), 60);
    ctx.save(); ctx.translate(heroX, hy + 2); ctx.rotate(slope * .6); drawFigure(0, 0, 1.55, { ph: ph, amp: 1, yaw: 1.42 }, t, gust, 1); ctx.restore();
    drawFog(tfogs[5], t, 1);
    // dust and the vignette
    ctx.setTransform(1, 0, 0, 1, 0, 0); for (var k = 0; k < 20; k++) { var sx = (((k * 211 + t * (220 + (k % 5) * 80) * TS) % (CW + 500)) - 250), sy = (k * 91 % CH), ln = (90 + (k % 7) * 40) * DPR; ctx.strokeStyle = "rgba(255,224,190," + (.04 + .06 * ((k * 37) % 10) / 10 + gust * .05).toFixed(3) + ")"; ctx.lineWidth = (1 + (k % 3)) * DPR; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + ln, sy - 5 * DPR); ctx.stroke(); }
    ctx.drawImage(overlay, 0, 0);
  }

  // ───────────── the timeline ─────────────
  var CAPS1 = [
    [0, .17, "[Epoch 0] · Danilo Silva · AI engineer · Florianópolis", "Abandon every claim you cannot measure.", "I build deterministic, local, open-source AI developer tools, and I ship them. Follow me up the mountain: what I built, how I measured it, what reached people's machines."],
    [.20, .40, "[Base camp] · Where it is easy", "Every climb starts where nothing is at stake.", "Warm light, a quiet river, no danger. Ten years of product engineering began here, with small tools and a habit of writing down the numbers."],
    [.43, .64, "[The first crossing]", "A model is a claim. An eval is the proof.", "Before I trust a result, I measure it. A cost advantage I once published was removed when a re-run no longer reproduced it."],
    [.67, .86, "[The treeline]", "Deterministic first.", "Rules decide what rules can decide. A model answers the questions about meaning, with a measured miss rate."],
    [.89, 1.01, "[Ahead]", "The mountain is not the point.", "The measuring is. Past the fog, the first face: dry rock, hard light, and the first real work."]
  ];
  var CAPS2 = [
    [.53, .60, "[The first face]", "Dry rock. Hard light.", "Past the fog the mountain is a wall. The work gets real here: legacy code to rebuild, forms to design, tools that have to survive real users."],
    [.62, .72, "[Terrace II] · 2022 — Apr 2026", "Full stack engineer.", "Arrow Global (Portugal): refactored a legacy React and TypeScript code base; built a multi-step investment form that replaced Excel tables."],
    [.74, .84, "[Terrace III] · 2021 — 2022", "Senior frontend developer.", "CIBC FirstCaribbean International Bank: started a credit-card selection application from scratch and led its architecture."],
    [.86, .96, "[Terrace IV] · 2019 — 2021", "Senior frontend developer.", "K2 Partnering Solutions: a functional-programming rewrite that cut code size about 35% on a product earning over €5 million a year."],
    [.97, 1.01, "[Above]", "The sky is changing.", "Clouds are gathering over the rock. The next face is wet, black and loud."]
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
  var stepFlash = 0;
  function frame(ms) {
    requestAnimationFrame(frame); var t = ms / 1000, dt = Math.min(.05, t - lastT || .016); lastT = t; if (frozenP != null) t = 3;
    var pTarget = frozenP != null ? frozenP : progress(); pSmooth += (pTarget - pSmooth) * (1 - Math.pow(.0009, dt)); var p = pSmooth, pg = p; p = clamp(p * 2, 0, 1); speedSm += (Math.abs(pTarget - pSmooth) * 40 - speedSm) * .1;
    // the wind: slow gusts, a little stronger while you scroll
    gustNow = clamp(.5 + .5 * Math.sin(t * .31) * Math.sin(t * .17 + 1) + clamp(speedSm, 0, .5) * .5, 0, 1); if (gustNow > .82 && gustPrev <= .82) window.Snd && Snd.swoosh(.7, .3);
    gustPrev = gustNow; var gust = gustNow, dens = 1 + 1.5 * sm((p - .6) / .4); lateAmt = sm((p - .60) / .34);
    if (CONCEPT) { drawTrail(t, dt, clamp(pg, 0, 1), gust); return; }
    // the second half of the scroll is the second scene: the arid face, entered out of the fog the first one ended in
    if (pg > .5) {
      var q = clamp((pg - .5) * 2, 0, 1); if (PROF) _pt = performance.now(); drawScene2(t, dt, q, gust); mark("scene2");
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(overlay, 0, 0);
      var inFog = 1 - sm(q / .14); if (inFog > .002) { ctx.fillStyle = "rgba(196,150,172," + inFog.toFixed(3) + ")"; ctx.fillRect(0, 0, CW, CH); }
      cue.style.opacity = 0; whereEl.textContent = "The Climb · scene 2 · the arid face"; capEl.classList.toggle("dark", false); capEl.classList.toggle("warm", true); bar.style.transform = "scaleX(" + pg.toFixed(4) + ")"; setCap(pg);
      if (window.Snd) { Snd.update({ gust: gust, river: 0, dry: 1, scene: 1, intensity: .25 + .7 * q, fog: 0 }); if (Snd.on && Math.random() < dt * .12) Snd.hawk(clamp(Math.random() * 1.6 - .8, -1, 1), .8); }
      return;
    }
    stormAmt = 0; capEl.classList.toggle("warm", false); whereEl.textContent = "The Climb · scene 1 · base camp";
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
      if (tw > .93 && prevLit <= .93 && f.t > .45 && sc[0] > 0 && sc[0] < CW && window.Snd && Math.random() < .35) Snd.tink([76, 79, 81, 84, 72, 74][Math.floor(Math.random() * 6)], clamp((sc[0] / CW - .5) * 1.8, -1, 1), .35 + f.t * .6);
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
  function begin(withSound) {
    document.getElementById("entry").classList.add("out"); started = true; document.documentElement.classList.remove("gated");
    if (withSound && window.Snd) { Snd.start(); document.getElementById("sndbtn").textContent = "Sound on"; document.getElementById("sndbtn").setAttribute("aria-pressed", "true"); }
    setTimeout(function () { var e = document.getElementById("entry"); if (e && e.parentNode) e.parentNode.removeChild(e); }, 1000);
  }
  document.getElementById("gate-on").addEventListener("click", function () { begin(true); });
  document.getElementById("gate-off").addEventListener("click", function () { begin(false); });
  document.getElementById("sndbtn").addEventListener("click", function () { var on = this.getAttribute("aria-pressed") === "true"; if (on) { Snd.mute(true); this.textContent = "Sound off"; this.setAttribute("aria-pressed", "false"); } else { Snd.start(); this.textContent = "Sound on"; this.setAttribute("aria-pressed", "true"); } });
  if (frozenP != null) { document.documentElement.classList.remove("gated"); var en = document.getElementById("entry"); if (en) en.parentNode.removeChild(en); started = true; }
  window.__climb = {sheet: function (n, gust, tt) { var c = document.createElement("canvas"); c.width = 180 * n; c.height = 300; var old = ctx; ctx = c.getContext("2d"); ctx.fillStyle = "#8a7aa8"; ctx.fillRect(0, 0, c.width, c.height); for (var i = 0; i < n; i++) { ctx.save(); ctx.translate(90 + i * 180, 280); drawFigure(0, 0, 1.5, { ph: i / n * 6.2832 * 2, amp: 1, yaw: .3 }, tt + i * .2, gust, 1); ctx.restore(); } ctx = old; return c.toDataURL("image/png"); }, drawScene2: drawScene2, hero2: hero2,  cam: cam, hero: hero, NODES: NODES, toScreen: toScreen, DPR: function () { return DPR; } };
  requestAnimationFrame(frame);
})();

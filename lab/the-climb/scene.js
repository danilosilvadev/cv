/* The Climb · scene 1: "Base camp". Everything is drawn by code on one canvas, as flat layers in the style of the reference: a colossal mountain in climate zones,
 * seven bands of forest sinking into pink haze, dark pines, a river with stepping stones, and a climber seen from behind.
 * The camera pans and tilts across the scenario as you scroll; it does not follow the climber, who hops from stone to stone towards the mountain.
 * Everything moves all the time: fog drifts through every depth, the pines and grass lean and sway with the wind, fireflies wander and glow, birds cross the sky,
 * the water flows, the scarf streams. Sound (sound.js) is tied to what you see. Append #p=0.5 to the address to freeze a moment (used by the tests). */
(function () {
  "use strict";
  var DW = 1920, DH = 1080, X0 = -700, X1 = 2700;
  var SPLIT = 440 / 2000, QT = .72;                                  // where scene 2 starts in the scroll; how much of scene 2 is the walk (the rest is the summit)
  var RS = 1, emaMs = 16, perfT = 0, calmT = 0, QMODE = "auto";                   // render scale: drops when frames take too long, recovers when they do not
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
  function strideAt(v) { return 40 * sOf(v); }                          // one step, in design pixels: smaller far away
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
    var stn = pose.strain || 0, scr = pose.scramble || 0, brg = pose.bridge || 0, sit = pose.sit || 0, S = 27 * (pose.stride || 1) * aa * (1 - sit) * (1 - .28 * stn - .5 * scr - .2 * brg), H = 15 * aa * (1 - sit) * (1 + .45 * scr + .15 * stn), pelvisY = 84 - 6 * stn - 5 * scr - 3 * brg - 56 * sit + (1.7 + 1.6 * stn) * aa * (-Math.cos(2 * TAU * g)) + breathe * .5 * idle, swayX = -3.2 * aa * Math.sin(TAU * (g - .05)) + Math.sin(t * .7) * 1.1 * idle + Math.sin(t * 23) * 1.1 * stn * (.4 + gust) + Math.sin(t * 1.9) * 3 * brg, hz = 3.4 * aa * cg, tw = aa * cg;
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
      var ankle = [side * (9.5 + 6 * sit) + swayX * .35, lerp(ay, 8, sit), lerp(az, 36, sit)], kn = ik3(hipP, ankle, 42, 42, [side * .18, 0, 1]), pts = BOOT.map(function (q) { var zz = q[0] * ch + q[1] * sn, yy = -q[0] * sn + q[1] * ch; return [zz + az, yy + ay]; });
      return { hip: hipP, knee: kn[0], ankle: kn[1], pts: pts, side: side, x: ankle[0], z: (hipP[2] + kn[1][2]) / 2 };
    }
    var hipL = [swayX - 8, pelvisY, hz], hipR = [swayX + 8, pelvisY, -hz], LL = leg(-1, g, hipL), LR = leg(1, g + .5, hipR);
    function drawLeg(L, c0, c1, rim) {
      var pa = P(L.hip), pk = P(L.knee), pn = P(L.ankle); seg(pa, pk, 17, c1, false); seg(pk, pn, 14.5, c1, false); seg(pa, pk, 13.5, c0, rim); seg(pk, pn, 11.5, c0, rim);
      var path = new Path2D(), n = L.pts.length, i, A, B; for (i = 0; i < n; i++) { A = L.pts[i]; B = L.pts[(i + 1) % n]; var a1 = P([L.x - 5, A[1], A[0]]), b1 = P([L.x - 5, B[1], B[0]]), a2 = P([L.x + 5, A[1], A[0]]), b2 = P([L.x + 5, B[1], B[0]]); path.moveTo(a1[0], a1[1]); path.lineTo(b1[0], b1[1]); path.lineTo(b2[0], b2[1]); path.lineTo(a2[0], a2[1]); path.closePath(); }
      ctx.fillStyle = "rgb(46,38,58)"; ctx.fill(path); var h0 = P([L.x, L.pts[0][1], L.pts[0][0]]), h1 = P([L.x, L.pts[1][1], L.pts[1][0]]); ctx.strokeStyle = "rgba(160,148,168,.9)"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(h0[0], h0[1]); ctx.lineTo(h1[0], h1[1]); ctx.stroke();
    }
    // torso: a body point at height v (0 waist .. 1 shoulders), sideways xo, behind/front zo, with the twist
    var chestY = pelvisY + 43, lean = 11 * stn + 16 * scr - 5 * sit;
    function bp(v, xo, zo, yo) { return [lerp(swayX, swayX * .7, v) + xo, lerp(pelvisY + 3, chestY, v) + (yo || 0), lerp(0, 2.4 + lean, v) + (zo || 0) + lerp(-(xo / 8) * 3.4, (xo / 21) * 5.8, v) * tw]; }
    // arms: swing against the legs, elbows bending
    var thL = -.62 * aa * cg + Math.sin(t * .9) * .03 * idle, thR = .30 * aa * cg + Math.sin(t * .9 + 1) * .03 * idle;
    function arm(side, th, b0) {
      var sp = bp(1, side * 21, 0, -3), el = [sp[0] + side * (3.2 + 9 * brg), sp[1] - 29 * Math.cos(th), sp[2] + 29 * Math.sin(th)], bth = th + b0, wr = [el[0] - side * .6, el[1] - 27 * Math.cos(bth), el[2] + 27 * Math.sin(bth)];
      return { sh: sp, el: el, wr: wr, side: side };
    }
    thL = lerp(thL, 1.45 + .5 * cg, scr) * (1 - .3 * stn) + brg * -.5; thR = lerp(thR, 1.45 - .5 * cg, scr) * (1 - .3 * stn) + brg * .5;
    thL = lerp(thL, .85, sit); thR = lerp(thR, .85, sit);
    var AL = arm(-1, thL, .22 + .55 * Math.max(0, thL) + .18 * aa + .5 * stn), AR = arm(1, thR, .45 + .3 * aa + .4 * stn);
    function drawArm(A) { var p0 = P(A.sh), p1 = P(A.el), p2 = P(A.wr); seg(p0, p1, 14, [60, 68, 138], false); seg(p1, p2, 12, [70, 78, 152], false); seg(p0, p1, 11, [72, 80, 152], A.side > 0); seg(p1, p2, 9.5, [82, 92, 170], A.side > 0); ctx.fillStyle = "rgb(52,42,62)"; ctx.beginPath(); ctx.ellipse(p2[0], p2[1], 5.6, 5.8, 0, 0, 6.2832); ctx.fill(); }
    // the staff, held in the right hand, lifting and planting with each step
    var wR = AR.wr, dirX = .05 + .08 * wd, dirZ = .1 + thR * .35, dl = Math.sqrt(dirX * dirX + 1 + dirZ * dirZ), sd = [dirX / dl, 1 / dl, dirZ / dl], plant = Math.max(0, cg) * 7 * aa;
    var stTop = [wR[0] + sd[0] * 62, wR[1] + sd[1] * 62, wR[2] + sd[2] * 62], k0 = wR[1] / sd[1] - plant, stBot = [wR[0] - sd[0] * k0, wR[1] - sd[1] * k0, wR[2] - sd[2] * k0];
    function drawStaff() { var a = P(stBot), b = P(stTop); seg(a, b, 3.4, [150, 120, 96], true); var pn = clamp(wd, -1, 1) * 15, pf = Math.sin(t * 6.5) * 2.2 * (.4 + gust); ctx.fillStyle = "rgb(236,52,48)"; ctx.beginPath(); ctx.moveTo(b[0], b[1] + 2); ctx.quadraticCurveTo(b[0] + pn * .5, b[1] + pf, b[0] + pn + 4 * Math.sign(wd || 1), b[1] + 2 + pf * 1.3); ctx.quadraticCurveTo(b[0] + pn * .5, b[1] + 8 - pf, b[0], b[1] + 8); ctx.closePath(); ctx.fill(); }
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
    armsOrd.forEach(function (A) { if (P(A.el)[2] > P(bp(.5, 0, 0))[2]) { if (A === AR && !pose.noStaff) drawStaff(); drawArm(A); } });
    drawTorso();
    armsOrd.forEach(function (A) { if (P(A.el)[2] <= P(bp(.5, 0, 0))[2]) { if (A === AR && !pose.noStaff) drawStaff(); drawArm(A); } });
    // the head: it stays steadier than the body, glances about, and turns with the pole of the wind
    var nk = P([swayX * .5, chestY - 4 - 5 * stn - (pelvisY - (84 - 6 * stn - 5 * scr - 3 * brg - 56 * sit)) * .5, 3 + lean * .9]), look = Math.sin(t * .55) * .09 + Math.sin(t * 1.3) * .03, tilt = -sg * .04 * aa, headR = look + tilt + .16 * stn + .1 * scr - .07 * sit;
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
  function chase(h, target, dt, vmax, classic) {                        // follow a target; classic = the mountain's original feel (speed and stride both follow how far behind he is); otherwise a full stride at any speed, so no sliding on the grass
    var err = target - h.pos, want = clamp(err * (classic ? 4 : 3.2), -vmax, vmax); if (!classic && Math.abs(err) < .03) want = 0;
    h.vel += (want - h.vel) * (1 - Math.pow(.004, dt)); if (Math.abs(err) < .004 && Math.abs(h.vel) < .02) h.vel = 0; if (!classic && want === 0 && Math.abs(h.vel) < .06) h.vel = 0; h.pos += h.vel * dt;
    h.moving = Math.abs(h.vel) > (classic ? .12 : .14); h.amp += ((classic ? clamp(Math.abs(h.vel) / .9, 0, 1) : (h.moving ? 1 : 0)) - h.amp) * (1 - Math.pow(.0006, dt));
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
  var TN = small ? 44 : 56, TR = 1250, TCELL = 2 * TR / TN, TH = 1500, FIG = 135, SPC = 10, STEPW = FIG * 54 / 150, TURNS = 1.6;
  function trailXZ(u) { var th = .35 - u * 6.2832 * TURNS, r = 1000 - 720 * u + 34 * Math.sin(u * 19) + 20 * Math.sin(u * 41 + 1); return [r * Math.cos(th), r * Math.sin(th)]; }
  function trailTan(u) { var a = trailXZ(u - .002), b = trailXZ(u + .002), dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; }
  // what the trail has to deal with: hills and dips, a ravine, cliff steps
  var HILLS = [[.05, 46, 70], [.10, -36, 60], [.16, 56, 80], [.21, -30, 55], [.37, 64, 60], [.43, -50, 55], [.52, 60, 70], [.58, -44, 50], [.66, 52, 70], [.73, -32, 60], [.80, 48, 70], [.90, -30, 60]].map(function (q) { var c = trailXZ(q[0]); return { x: c[0], z: c[1], a: q[1], s2: 2 * q[2] * q[2] }; });
  var RAVU = .30, RAVC = trailXZ(RAVU), RAVT = trailTan(RAVU), RAVA = [-RAVT[1], RAVT[0]];
  var CLIFFS = [[.46, 90], [.60, 100], [.84, 80]].map(function (q) { var c = trailXZ(q[0]), t = trailTan(q[0]); return { x: c[0], z: c[1], tx: t[0], tz: t[1], ax: -t[1], az: t[0], h: q[1] }; });
  function terrainH0(x, z) {
    var r = Math.sqrt(x * x + z * z), a = Math.atan2(z, x), wob = 1 + .14 * Math.sin(a * 3 + 1) + .08 * Math.sin(a * 5 - .6) + .05 * Math.sin(a * 8 + 2), k = Math.max(0, 1 - r / (1050 * wob));
    var h = TH * Math.pow(k, 1.55) + ridgedN(x * .0024, z * .0024, 4) * 360 * Math.pow(k, .8) + ridgedN(x * .0078, z * .0078, 3) * 110 * Math.pow(k, .9) + (vnz(x * .02, z * .02) - .5) * 30 * k;
    var dz = clamp(1 - h / 320, 0, 1), ax = x * .9 + z * .43; h += dz * (36 * (1 - Math.pow(Math.abs(Math.sin(ax * .0078 + 2.5 * vnz(x * .0028, z * .0028))), 1.4)) + 12 * Math.sin(x * .02 + z * .013));     // dunes at the foot
    for (var i = 0; i < HILLS.length; i++) { var hl = HILLS[i], d2 = (x - hl.x) * (x - hl.x) + (z - hl.z) * (z - hl.z); if (d2 < hl.s2 * 6) h += hl.a * Math.exp(-d2 / hl.s2); }
    var t = (x - RAVC[0]) * RAVT[0] + (z - RAVC[1]) * RAVT[1], aa = (x - RAVC[0]) * RAVA[0] + (z - RAVC[1]) * RAVA[1];
    h -= 215 * (1 - sm((Math.abs(t) - 38) / 34)) * (1 - sm((Math.abs(aa) - 210) / 130));                                         // the ravine
    for (i = 0; i < CLIFFS.length; i++) { var c = CLIFFS[i], tt = (x - c.x) * c.tx + (z - c.z) * c.tz, au = (x - c.x) * c.ax + (z - c.z) * c.az; h += c.h * sm((tt + 22) / 46) * (1 - sm((tt - 320) / 170)) * (1 - sm((Math.abs(au) - 190) / 110)); }
    return Math.max(6, h) + 5 * vnz(x * .011, z * .011);
  }
  var SUMMIT = (function () { var best = -1, bx = 0, bz = 0; for (var x = -500; x <= 500; x += 14) for (var z = -500; z <= 500; z += 14) { var h = terrainH0(x, z); if (h > best) { best = h; bx = x; bz = z; } } return { x: bx, z: bz, y: best - 6 }; })();
  function terrainH(x, z) { var h = terrainH0(x, z), d = Math.hypot(x - SUMMIT.x, z - SUMMIT.z); return h + (SUMMIT.y - h) * (1 - sm((d - 70) / 110)); }          // the top is a small flat rock to sit on
  var VDIR = (function () { var l = Math.hypot(.6, -.58); return [.6 / l, -.58 / l]; })(), RDIR = [-VDIR[1], VDIR[0]];                                        // the way he looks (towards the sun), and the camera's right when looking that way
  var TH_ = new Float32Array((TN + 1) * (TN + 1)), i_, j_; for (i_ = 0; i_ <= TN; i_++) for (j_ = 0; j_ <= TN; j_++) TH_[i_ * (TN + 1) + j_] = terrainH(-TR + i_ * TCELL, -TR + j_ * TCELL);
  function surfY(x, z) {
    var ix = clamp((x + TR) / TCELL, 0, TN - .001), iz = clamp((z + TR) / TCELL, 0, TN - .001), i = Math.floor(ix), j = Math.floor(iz), fx = ix - i, fz = iz - j, W = TN + 1, h00 = TH_[i * W + j], h10 = TH_[(i + 1) * W + j], h01 = TH_[i * W + j + 1], h11 = TH_[(i + 1) * W + j + 1];
    return fx >= fz ? h00 + (h10 - h00) * fx + (h11 - h10) * fz : h00 + (h11 - h01) * fx + (h01 - h00) * fz;
  }
  // the palette: sand and sandstone, then dark wet rock, then snow and ice; lit from one side, in ten steps of haze
  var T_ARID = [[232, 170, 108], [214, 132, 82], [190, 104, 66], [242, 192, 134], [168, 90, 62]], T_ROCK = [[92, 90, 118], [80, 80, 106], [106, 102, 126], [68, 68, 94], [90, 86, 110]], T_SNOW = [[236, 240, 250], [222, 230, 246], [244, 244, 252], [212, 222, 242], [228, 232, 248]], T_HAZE = [236, 184, 164], NF = 10, NLIT = 7, NMT = 8, T_FOREST = [[62, 76, 112], [56, 70, 104], [70, 82, 118], [50, 64, 98], [60, 72, 108]];
  var T_PAL = []; (function () { for (var b = 0; b < 5; b++) for (var l = 0; l < NLIT; l++) for (var m = 0; m < NMT; m++) { var fz = m === NMT - 1, z = fz ? 0 : m / (NMT - 2) * 2, base = fz ? T_FOREST[b] : (z < 1 ? mixc(T_ARID[b], T_ROCK[b], z) : mixc(T_ROCK[b], T_SNOW[b], z - 1)), sh = fz ? .5 + .66 * l / (NLIT - 1) : lerp(.42 + .72 * l / (NLIT - 1), .7 + .46 * l / (NLIT - 1), clamp(z - 1, 0, 1)), col = base.map(function (v) { return v * sh; }); for (var f = 0; f < NF; f++) T_PAL.push(css(mixc(col, T_HAZE, Math.pow(f / (NF - 1), .9) * .96))); } })();
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
        var hm = (A[1] + B[1] + C[1]) / 3, nz2 = (vnz(x0 * .006, z0 * .006) - .5) * 150, zf = sm((820 - Math.hypot(x0 + TCELL / 2, z0 + TCELL / 2) + nz2) / 90) + sm((560 - Math.hypot(x0 + TCELL / 2, z0 + TCELL / 2) + nz2) / 80), band = (((Math.floor(hm / 52 + vnz((x0 + 300) * .004, (z0 + 300) * .004) * 1.6) % 5) + 5) % 5), rr0 = Math.hypot(x0 + TCELL / 2, z0 + TCELL / 2), mt = (rr0 > 1080 && hm < 170) ? NMT - 1 : clamp(Math.round(zf / 2 * (NMT - 2)), 0, NMT - 2);
        TC[(i * TN + j) * 2 + t] = ((band * NLIT + L) * NMT + mt) * NF;
      }
    }
  })();
  // the trail, sampled evenly and laid on the faceted ground; across the ravine it becomes a rope bridge
  var TRAIL = (function () {
    var dense = [], n = 3600, u, i, k; for (k = 0; k <= n; k++) { u = k / n; dense.push(trailXZ(u)); }
    var lastD = dense[dense.length - 1]; for (k = 1; k <= 240; k++) { var ff = sm(k / 240); dense.push([lerp(lastD[0], SUMMIT.x, ff), lerp(lastD[1], SUMMIT.z, ff)]); }      // the last stretch runs to the summit
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
  var T_TREE = [[48, 58, 98], [56, 68, 108], [40, 50, 86]], TREE_PAL = T_TREE.map(function (c) { var o = []; for (var f = 0; f < NF; f++) o.push(css(mixc(c, T_HAZE, Math.pow(f / (NF - 1), .9) * .96))); return o; });
  var TREES = (function () {                                         // pines on the plain around the mountain, so it stands in a forest and not on a bare plain
    var r = mulberry(515), cells = {}; for (var k = 0; k < (small ? 520 : 900); k++) { var a = r() * 6.2832, d = 1040 + Math.pow(r(), .8) * 700, x = Math.cos(a) * d, z = Math.sin(a) * d; if (Math.abs(x) > TR - 8 || Math.abs(z) > TR - 8) continue; var y = surfY(x, z); if (y > 170) continue;
      var ci = clamp(Math.floor((x + TR) / TCELL), 0, TN - 1), cj = clamp(Math.floor((z + TR) / TCELL), 0, TN - 1), key = ci * TN + cj; (cells[key] = cells[key] || []).push({ x: x, y: y, z: z, h: 55 + r() * 95, tone: Math.floor(r() * 3) }); }
    return { cells: cells };
  })();
  var RINGS = [{ R: 6200, h: 1100, c: [226, 180, 170], f: .8, seed: 32 }, { R: 4200, h: 760, c: [214, 160, 156], f: .62, seed: 31 }, { R: 3700, h: 150, c: [96, 98, 146], f: .74, seed: 41, n: 260, fr: .8 }, { R: 2800, h: 130, c: [84, 88, 136], f: .62, seed: 42, n: 240, fr: .9 }, { R: 2050, h: 110, c: [72, 78, 126], f: .5, seed: 43, n: 220, fr: 1 }];      // far mountains, then bands of forest in the fog
  RINGS.forEach(function (rg) { var r = mulberry(rg.seed); rg.pts = []; for (var k = 0; k < (rg.n || 90); k++) rg.pts.push(rg.h * (.28 + .72 * Math.pow(vnz(k * (rg.fr || .32), rg.seed), 1.2)) * (.8 + .4 * r())); });
  var C3 = { p: [0, 0, 0], f: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0], fl: 800, cx: 0, cy: 0 }, T_PX = new Float32Array((TN + 1) * (TN + 1)), T_PY = new Float32Array((TN + 1) * (TN + 1)), T_PZ = new Float32Array((TN + 1) * (TN + 1)), T_OI = [], T_OJ = [];
  function cam3(tg, az, el, dist) { var ce = Math.cos(el), se = Math.sin(el); camLook([tg[0] + dist * ce * Math.cos(az), tg[1] + dist * se, tg[2] + dist * ce * Math.sin(az)], tg); }
  function camLook(p, tg) {
    var fx = tg[0] - p[0], fy = tg[1] - p[1], fz = tg[2] - p[2], fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
    var rx = -fz, rz = fx, rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
    C3.tg = tg; C3.p = p; C3.f = [fx, fy, fz]; C3.r = [rx, 0, rz]; C3.u = [-fy * rz, fx * rz - fz * rx, fy * rx]; var por = innerWidth < innerHeight * 1.1; C3.fl = Math.min(CH * 1.05, CW * (por ? 1.5 : 3)); C3.cx = por ? CW * .5 : CW * .36; C3.cy = por ? CH * .62 : CH * .56;
  }
  function pr(x, y, z, out) { var vx = x - C3.p[0], vy = y - C3.p[1], vz = z - C3.p[2], zc = vx * C3.f[0] + vy * C3.f[1] + vz * C3.f[2]; out[2] = zc; out[0] = C3.cx + C3.fl * (vx * C3.r[0] + vy * C3.r[1] + vz * C3.r[2]) / zc; out[1] = C3.cy - C3.fl * (vx * C3.u[0] + vy * C3.u[1] + vz * C3.u[2]) / zc; }
  var uRock = 0.4, uSnow = 0.75;

  // ───── the summit finale: the flag, a sea of clouds, the camera that sweeps round, the night sky ─────
  var CLOUDY = 540;
  function finaleCam(fin, base) {
    var S = SUMMIT, V = VDIR, R = RDIR, por = innerWidth < innerHeight * 1.1, B = por ? 980 : 780;
    function P3(vx, vy, rx) { return [S.x + V[0] * vx + R[0] * rx, S.y + vy, S.z + V[1] * vx + R[1] * rx]; }
    var pos3 = P3(-B, 70, 150), keys = [
      [0, base.p, base.tg], [.22, P3(-190, 125, 280), P3(60, 105, -60)], [.42, P3(-250, 105, 40), P3(220, 40, 0)], [.62, P3(-560, 240, 110), P3(2600, 60, 0)],
      [.84, pos3, [pos3[0] + V[0] * 2000, pos3[1] + 120, pos3[2] + V[1] * 2000]], [1, pos3, [pos3[0] + V[0] * 2000, pos3[1] + 640, pos3[2] + V[1] * 2000]]
    ], i = 0; while (i < keys.length - 2 && fin > keys[i + 1][0]) i++;
    var a = keys[i], b = keys[i + 1], e = sm((fin - a[0]) / (b[0] - a[0]));
    camLook([lerp(a[1][0], b[1][0], e), lerp(a[1][1], b[1][1], e), lerp(a[1][2], b[1][2], e)], [lerp(a[2][0], b[2][0], e), lerp(a[2][1], b[2][1], e), lerp(a[2][2], b[2][2], e)]);
    C3.cx = CW * .5; C3.cy = CH * .52;
  }
  function drawFlag(plantT, t, gust) {
    if (plantT < .01) return;
    var S = SUMMIT, V = VDIR, R = RDIR, bx = S.x - R[0] * 62 + V[0] * 30, bz = S.z - R[1] * 62 + V[1] * 30, by = S.y, ang = (1 - plantT) * 1.15, dx = V[0] * Math.sin(ang), dy = Math.cos(ang), dz = V[1] * Math.sin(ang), H = 160, tx = bx + dx * H, ty = by + dy * H, tz = bz + dz * H;
    pr(bx, by, bz, tmpA); pr(tx, ty, tz, tmpB); if (tmpA[2] < 40 || tmpB[2] < 40) return;
    ctx.globalAlpha = Math.min(1, plantT * 1.5); ctx.lineCap = "round"; ctx.strokeStyle = "rgb(120,92,76)"; ctx.lineWidth = Math.max(2, C3.fl * 4.5 / tmpA[2]); ctx.beginPath(); ctx.moveTo(tmpA[0], tmpA[1]); ctx.lineTo(tmpB[0], tmpB[1]); ctx.stroke();
    ctx.strokeStyle = "rgba(255,214,170,.7)"; ctx.lineWidth = Math.max(1, C3.fl * 1.4 / tmpA[2]); ctx.beginPath(); ctx.moveTo(tmpA[0] + 1.5, tmpA[1]); ctx.lineTo(tmpB[0] + 1.5, tmpB[1]); ctx.stroke();
    var N = 12, up = [], dn = [], k, w = (.7 + gust * .6) * plantT;
    for (k = 0; k <= N; k++) {
      var u = k / N, wave = Math.sin(W2.clock * 5 - u * 6.5) * (2 + 11 * u) * w, wy = Math.sin(W2.clock * 4.2 - u * 5 + 1) * (1.5 + 5 * u) * w, len = 62 * (.55 + .45 * plantT), hh = 30 * (1 - .28 * u);
      pr(tx + R[0] * len * u + V[0] * wave, ty - 8 - u * u * 6 + wy, tz + R[1] * len * u + V[1] * wave, tmpC); up.push([tmpC[0], tmpC[1]]);
      pr(tx + R[0] * len * u + V[0] * wave, ty - 8 - hh - u * u * 6 + wy, tz + R[1] * len * u + V[1] * wave, tmpD); dn.push([tmpD[0], tmpD[1]]);
    }
    ctx.fillStyle = "rgb(236,52,48)"; ctx.beginPath(); up.forEach(function (q, i) { i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); for (k = N; k >= 0; k--) ctx.lineTo(dn[k][0], dn[k][1]); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,118,100,.8)"; ctx.beginPath(); for (k = 1; k < N - 1; k++) { var qq = [lerp(up[k][0], dn[k][0], .18), lerp(up[k][1], dn[k][1], .18)]; k === 1 ? ctx.moveTo(qq[0], qq[1]) : ctx.lineTo(qq[0], qq[1]); } for (k = N - 2; k >= 1; k--) ctx.lineTo(lerp(up[k][0], dn[k][0], .48), lerp(up[k][1], dn[k][1], .48)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  }
  // the sea of clouds: soft flat puffs, far to near
  var cloudSpr = document.createElement("canvas"); (function () {
    cloudSpr.width = 256; cloudSpr.height = 120; var g = cloudSpr.getContext("2d"), r = mulberry(61), k;
    for (k = 0; k < 9; k++) { var x = 40 + r() * 176, y = 64 + (r() - .5) * 26, rr = 34 + r() * 28, gr = g.createRadialGradient(x, y - rr * .2, 0, x, y, rr); gr.addColorStop(0, "rgba(255,250,246,.96)"); gr.addColorStop(.55, "rgba(246,226,226,.7)"); gr.addColorStop(1, "rgba(236,206,214,0)"); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rr * 1.25, rr * .78, 0, 0, 6.2832); g.fill(); }
    var sh = g.createLinearGradient(0, 56, 0, 118); sh.addColorStop(0, "rgba(180,140,170,0)"); sh.addColorStop(1, "rgba(150,110,150,.55)"); g.globalCompositeOperation = "source-atop"; g.fillStyle = sh; g.fillRect(0, 0, 256, 120);
  })();
  var PUFFS = (function () { var r = mulberry(77), out = []; for (var k = 0; k < (small ? 190 : 320); k++) { var a = r() * 6.2832, d = 900 + Math.pow(r(), .7) * 6200; out.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, y: CLOUDY + (r() - .5) * 60, s: 380 + r() * 620, z2: 0 }); } return out; })();
  function drawClouds(cloudA) {
    if (cloudA < .02) return; var i, n = PUFFS.length, c; for (i = 0; i < n; i++) { c = PUFFS[i]; var dx = c.x - C3.p[0], dy = c.y + (CLOUDY - 540) - C3.p[1], dz = c.z - C3.p[2]; c.z2 = dx * C3.f[0] + dy * C3.f[1] + dz * C3.f[2]; }
    PUFFS.sort(function (a, b) { return b.z2 - a.z2; }); ctx.globalAlpha = cloudA;
    for (i = 0; i < n; i++) { c = PUFFS[i]; if (c.z2 < 200) continue; pr(c.x, c.y + (CLOUDY - 540), c.z, tmpA); var sz = C3.fl * c.s / tmpA[2]; if (tmpA[0] < -sz || tmpA[0] > CW + sz || tmpA[1] < -sz || tmpA[1] > CH + sz) continue; ctx.drawImage(cloudSpr, tmpA[0] - sz * .5, tmpA[1] - sz * .26, sz, sz * .47); }
    ctx.globalAlpha = 1;
  }
  // stars: a few hundred, a Milky Way, and real constellations (the Southern Cross, Orion, Scorpius); they are fixed in the world, so the sky turns as the camera does
  var STARS = (function () {
    var r = mulberry(404), out = [], k, cols = [[255, 255, 255], [208, 222, 255], [255, 236, 200], [255, 214, 190]];
    for (k = 0; k < 1700; k++) { var az = r() * 6.2832, alt = Math.asin(Math.pow(r(), .85) * .98), m = Math.pow(r(), 3.0); out.push({ d: [Math.cos(alt) * Math.cos(az), Math.sin(alt), Math.cos(alt) * Math.sin(az)], sz: .55 + m * 2.2, c: cols[Math.floor(r() * 4)], ph: r() * 6.28, sp: 1 + r() * 2.5, a: .4 + m * .6 }); }
    var pole = [.45, .7, -.55], pl = Math.hypot(pole[0], pole[1], pole[2]); pole = pole.map(function (v) { return v / pl; });
    var ax = [-pole[1], pole[0], 0], al = Math.hypot(ax[0], ax[1]) || 1; ax = ax.map(function (v) { return v / al; }); var bx = [pole[1] * ax[2] - pole[2] * ax[1], pole[2] * ax[0] - pole[0] * ax[2], pole[0] * ax[1] - pole[1] * ax[0]];
    var band = []; for (k = 0; k < 1600; k++) { var th = r() * 6.2832, off = (r() + r() + r() - 1.5) * .12, d = [Math.cos(th) * ax[0] + Math.sin(th) * bx[0] + pole[0] * off, Math.cos(th) * ax[1] + Math.sin(th) * bx[1] + pole[1] * off, Math.cos(th) * ax[2] + Math.sin(th) * bx[2] + pole[2] * off], dl = Math.hypot(d[0], d[1], d[2]); d = d.map(function (v) { return v / dl; }); if (d[1] > -.02) band.push({ d: d, a: .1 + r() * .35, sz: .4 + r() * .8 }); }
    var glow = []; for (k = 0; k < 44; k++) { var th2 = k / 44 * 6.2832, dd = [Math.cos(th2) * ax[0] + Math.sin(th2) * bx[0], Math.cos(th2) * ax[1] + Math.sin(th2) * bx[1], Math.cos(th2) * ax[2] + Math.sin(th2) * bx[2]]; if (dd[1] > -.05) glow.push(dd); }
    var azV = Math.atan2(VDIR[1], VDIR[0]);
    function place(name, az0, alt0, pts, edges) {                                  // pts in degrees of sky around the centre; edges join indices
      var c = [Math.cos(alt0) * Math.cos(az0), Math.sin(alt0), Math.cos(alt0) * Math.sin(az0)], right = [-Math.sin(az0), 0, Math.cos(az0)], upv = [-Math.sin(alt0) * Math.cos(az0), Math.cos(alt0), -Math.sin(alt0) * Math.sin(az0)], rad = Math.PI / 180;
      var ds = pts.map(function (q) { var d = [c[0] + (right[0] * q[0] + upv[0] * q[1]) * rad, c[1] + (right[1] * q[0] + upv[1] * q[1]) * rad, c[2] + (right[2] * q[0] + upv[2] * q[1]) * rad], l = Math.hypot(d[0], d[1], d[2]); return { d: [d[0] / l, d[1] / l, d[2] / l], b: q[2] || 1 }; });
      var lab = { d: [c[0] + (upv[0] * -6.2) * rad, c[1] + (upv[1] * -6.2) * rad, c[2] + (upv[2] * -6.2) * rad], t: name }; return { stars: ds, edges: edges, label: lab };
    }
    var sp = innerWidth < innerHeight * 1.1 ? .55 : 1, cons = [
      place("Southern Cross", azV - .1 * sp, .46, [[0, 6, 1.2], [0, -6, 1.5], [-3.8, -1.2, 1.1], [3, 1.2, .9], [-1.2, -2.4, .5], [-12, -9, 1.3], [-10.4, -12, 1.2]], [[0, 1], [2, 3]]),
      place("Orion", azV + .5 * sp, .78, [[-5, 8, 1.4], [4.2, 7.6, 1.1], [-2.3, -.2, 1], [0, .2, 1.1], [2.3, .4, 1], [-3.6, -8.2, 1], [4.2, -7.8, 1.6], [0, 10.6, .7]], [[0, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [0, 7], [7, 1]]),
      place("Scorpius", azV - .62 * sp, .52, [[-5, 8, .8], [-3.4, 5.4, .9], [-2, 3, 1], [0, 0, 1.6], [1.4, -3, 1], [3, -6, 1], [5.2, -8, 1], [7.6, -8.6, 1], [9.2, -6.8, 1], [9, -4, 1.1]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9]])
    ];
    return { stars: out, band: band, glow: glow, cons: cons, shoot: { t0: -99, a: 0 } };
  })();
  function sky2screen(d, out) { pr(C3.p[0] + d[0] * 60000, C3.p[1] + d[1] * 60000, C3.p[2] + d[2] * 60000, out); return out[2] > 0; }
  function drawStars(t, nn, horizonY) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, CW, Math.max(0, Math.min(CH, horizonY + 6 * DPR))); ctx.clip();
    var i, st, sx = [0, 0, 0], tw;
    // the Milky Way: a soft broad band and a dust of faint stars along it
    ctx.globalAlpha = nn * .5; for (i = 0; i < STARS.glow.length; i++) { if (!sky2screen(STARS.glow[i], sx)) continue; var rr = CH * .2, g = ctx.createRadialGradient(sx[0], sx[1], 0, sx[0], sx[1], rr); g.addColorStop(0, "rgba(190,200,255,.07)"); g.addColorStop(1, "rgba(190,200,255,0)"); ctx.fillStyle = g; ctx.fillRect(sx[0] - rr, sx[1] - rr, rr * 2, rr * 2); }
    for (i = 0; i < STARS.band.length; i++) { st = STARS.band[i]; if (!sky2screen(st.d, sx)) continue; ctx.globalAlpha = nn * st.a; ctx.fillStyle = "rgb(214,222,255)"; ctx.fillRect(sx[0], sx[1], st.sz * DPR, st.sz * DPR); }
    // the bright stars, twinkling
    for (i = 0; i < STARS.stars.length; i++) { st = STARS.stars[i]; if (!sky2screen(st.d, sx)) continue; if (sx[0] < -6 || sx[0] > CW + 6 || sx[1] < -6 || sx[1] > CH + 6) continue; tw = .72 + .28 * Math.sin(t * st.sp + st.ph); ctx.globalAlpha = nn * st.a * tw; ctx.fillStyle = css(st.c); var z = st.sz * DPR; ctx.beginPath(); ctx.arc(sx[0], sx[1], z * .6, 0, 6.2832); ctx.fill(); if (st.sz > 1.5) { ctx.globalAlpha *= .22; ctx.beginPath(); ctx.arc(sx[0], sx[1], z * 2.6, 0, 6.2832); ctx.fill(); } }
    // the constellations: brighter stars joined by faint lines, with their names
    var cn, pts = [], a0, a1; ctx.lineWidth = 1 * DPR; ctx.lineCap = "round";
    for (i = 0; i < STARS.cons.length; i++) {
      cn = STARS.cons[i]; pts = cn.stars.map(function (q) { var o = [0, 0, 0]; return sky2screen(q.d, o) ? o : null; });
      ctx.globalAlpha = nn * .42; ctx.strokeStyle = "rgb(170,190,255)"; ctx.beginPath(); cn.edges.forEach(function (e) { a0 = pts[e[0]]; a1 = pts[e[1]]; if (a0 && a1) { ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); } }); ctx.stroke();
      cn.stars.forEach(function (q, k) { var o = pts[k]; if (!o) return; var r2 = (1.1 + q.b * 1.2) * DPR, tw2 = .8 + .2 * Math.sin(t * 2 + k * 1.7 + i); ctx.globalAlpha = nn * tw2; ctx.fillStyle = "rgb(255,250,240)"; ctx.beginPath(); ctx.arc(o[0], o[1], r2, 0, 6.2832); ctx.fill(); ctx.globalAlpha = nn * .22 * tw2; ctx.beginPath(); ctx.arc(o[0], o[1], r2 * 3.2, 0, 6.2832); ctx.fill(); });
      if (sky2screen(cn.label.d, sx)) { ctx.globalAlpha = nn * .55; ctx.fillStyle = "rgb(190,204,255)"; ctx.font = "500 " + Math.round(10.5 * DPR) + "px 'JetBrains Mono', ui-monospace, monospace"; ctx.textAlign = "center"; ctx.fillText(cn.label.t.toUpperCase(), sx[0], sx[1]); }
    }
    // now and then a shooting star
    var sh = STARS.shoot; if (nn > .7 && t - sh.t0 > 7 + (sh.a * 5)) { sh.t0 = t; sh.a = Math.random(); sh.x = Math.random() * .5 + .25; sh.y = Math.random() * .25 + .05; }
    var se = t - sh.t0; if (se >= 0 && se < .9) { var u = se / .9, x0 = (sh.x + u * .18) * CW, y0 = (sh.y + u * .1) * CH, len = CH * .12 * (1 - u * .4); ctx.globalAlpha = nn * (1 - u) * .9; var lg = ctx.createLinearGradient(x0, y0, x0 - len * .87, y0 - len * .5); lg.addColorStop(0, "rgba(255,255,255,1)"); lg.addColorStop(1, "rgba(255,255,255,0)"); ctx.strokeStyle = lg; ctx.lineWidth = 2 * DPR; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 - len * .87, y0 - len * .5); ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1; ctx.textAlign = "start";
  }
  function drawMoon(nn) {
    var az = Math.atan2(VDIR[1], VDIR[0]) + .34, alt = .46, d = [Math.cos(alt) * Math.cos(az), Math.sin(alt), Math.cos(alt) * Math.sin(az)], o = [0, 0, 0]; if (!sky2screen(d, o)) return;
    var rr = CH * .05, g = ctx.createRadialGradient(o[0], o[1], 0, o[0], o[1], rr * 7); g.addColorStop(0, "rgba(220,230,255," + (.34 * nn).toFixed(3) + ")"); g.addColorStop(1, "rgba(220,230,255,0)"); ctx.fillStyle = g; ctx.fillRect(o[0] - rr * 7, o[1] - rr * 7, rr * 14, rr * 14);
    ctx.globalAlpha = nn; ctx.fillStyle = "rgb(244,246,255)"; ctx.beginPath(); ctx.arc(o[0], o[1], rr, 0, 6.2832); ctx.fill(); ctx.fillStyle = "rgba(170,180,214,.45)"; [[-.3, -.2, .22], [.25, .15, .3], [-.05, .45, .16]].forEach(function (c) { ctx.beginPath(); ctx.arc(o[0] + c[0] * rr, o[1] + c[1] * rr, c[2] * rr, 0, 6.2832); ctx.fill(); }); ctx.globalAlpha = 1;
  }
  var hero2 = { pos: 0, vel: 0, amp: 0, moving: false, ph: 0, yaw: -1.2, target: 0, sc: 0, br: 0 }, W2 = { storm: 0, snow: 0, finT: 0, qe: 0, fin: 0, night: 0, clock: 0, nextBolt: 5, bolt: -9, thunderAt: -1, nextRock: 4, zone: "dunes" };
  var fogHaze = addFog({ f: .05, g: 0, y: 300, up: 140, down: 80, col: [255, 214, 186], peak: 1, a: .6, speed: 5, off: 70, seed: 220 }), fogMid = addFog({ f: .05, g: 0, y: 600, up: 130, down: 130, col: [236, 186, 176], peak: 1, a: .5, speed: 9, off: 400, seed: 221 });
  var fogHazeS = addFog({ f: .05, g: 0, y: 300, up: 140, down: 80, col: [86, 76, 112], peak: 1, a: .7, speed: 11, off: 170, seed: 222 }), fogMidS = addFog({ f: .05, g: 0, y: 600, up: 130, down: 130, col: [70, 62, 96], peak: 1, a: .6, speed: 16, off: 500, seed: 223 }), fogHazeN = addFog({ f: .05, g: 0, y: 300, up: 140, down: 80, col: [232, 238, 250], peak: 1, a: .3, speed: 3, off: 270, seed: 224 }), fogMidN = addFog({ f: .05, g: 0, y: 600, up: 130, down: 130, col: [220, 228, 246], peak: 1, a: .22, speed: 5, off: 600, seed: 225 });
  var dust2 = []; (function () { var r = mulberry(333); for (var k = 0; k < 60; k++) dust2.push({ x: r(), y: r(), v: .01 + r() * .03, sz: .8 + r() * 2.2, ph: r() * 6.28 }); })();
  var rain = [], snowF = [], rocksFalling = []; (function () { var r = mulberry(717), k; for (k = 0; k < (small ? 110 : 190); k++) rain.push({ x: r(), y: r(), v: .9 + r() * .7, len: 16 + r() * 26, w: r() }); for (k = 0; k < (small ? 110 : 190); k++) snowF.push({ x: r(), y: r(), v: .035 + r() * .07, sz: .9 + r() * 2.8, ph: r() * 6.28 }); })();
  var BIRDS2 = (function () { var r = mulberry(63), o = []; for (var k = 0; k < 9; k++) o.push({ x: r(), y: .1 + r() * .32, v: .5 + r() * 1.2, ph: r() * 6, s: 6 + r() * 8 }); return o; })();
  var hawks = [{ ph: 0, r: .22, y: .2, sz: 18 }, { ph: 2.6, r: .16, y: .3, sz: 13 }], tmpA = [0, 0, 0], tmpB = [0, 0, 0], tmpC = [0, 0, 0], tmpD = [0, 0, 0], rainSeed = mulberry(5);
  function zoneColor(b) { var r = Math.hypot(b.x, b.z); return sm((820 - r) / 90) + sm((560 - r) / 80); }
  function drawTree(tr, lvl) {
    pr(tr.x, tr.y, tr.z, tmpA); if (tmpA[2] < 80) return; pr(tr.x, tr.y + tr.h, tr.z, tmpB); var bx = tmpA[0], by = tmpA[1], hg = by - tmpB[1]; if (hg < 3) return; var w = hg * .24;
    ctx.fillStyle = TREE_PAL[tr.tone][lvl]; ctx.beginPath(); ctx.moveTo(bx, tmpB[1]); ctx.lineTo(bx + w * .62, by - hg * .52); ctx.lineTo(bx + w * .3, by - hg * .52); ctx.lineTo(bx + w, by - hg * .12); ctx.lineTo(bx - w, by - hg * .12); ctx.lineTo(bx - w * .3, by - hg * .52); ctx.lineTo(bx - w * .62, by - hg * .52); ctx.closePath(); ctx.fill();
  }
  function drawBoulder(b, lvl) {
    pr(b.x, b.y + b.sz * .25, b.z, tmpA); if (tmpA[2] < 60) return; var sc = C3.fl * b.sz / tmpA[2], zf = zoneColor(b), base = zf < 1 ? mixc([176, 128, 96], [74, 72, 98], zf) : mixc([74, 72, 98], [226, 232, 246], zf - 1), hz = Math.pow(lvl / (NF - 1), .9) * .96;
    ctx.fillStyle = css(mixc(base.map(function (v) { return v * (.8 + .25 * b.tone); }), T_HAZE, hz)); ctx.beginPath(); b.poly.forEach(function (q, i) { var x = tmpA[0] + q[0] * sc, y = tmpA[1] - q[1] * sc * .8; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill();
    ctx.fillStyle = css(mixc(base.map(function (v) { return Math.min(255, v * 1.28); }), T_HAZE, hz)); ctx.beginPath(); [0, 1, 2, 3].forEach(function (i) { var q = b.poly[i], x = tmpA[0] + q[0] * sc * .86, y = tmpA[1] - q[1] * sc * .7 - sc * .12; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill();
  }
  function drawScene2(t, dt, qScroll, gust0, intro) {
    var W = TN + 1, prevPos = hero2.pos, now = trailAt(hero2.pos); W2.clock += dt;
    // everything (camera, weather, text) follows where HE is; the finale only starts once he has reached the top, then catches up with the scroll at a gentle rate
    var arrivedPre = 1 - sm((TRAIL.steps - .3 - hero2.pos - .5) / 3), finS = clamp((qScroll - QT) / (1 - QT), 0, 1); W2.finT += clamp((arrivedPre > .95 ? finS : 0) - W2.finT, -.5 * dt, .5 * dt);
    var fin = intro ? 0 : W2.finT, q = intro ? 0 : (fin > 0 ? QT + fin * (1 - QT) : clamp(hero2.pos / (TRAIL.steps - 1), 0, 1) * QT); W2.qe = q; W2.fin = fin; W2.night = sm((fin - .62) / .18); CLOUDY = intro ? 800 : 540;
    var k = 1 - Math.pow(.25, dt), fr = hero2.pos / (TRAIL.steps - 1); W2.storm += (sm((fr - uRock + .02) / .05) * (1 - sm((fr - uSnow + .05) / .06)) - W2.storm) * k; W2.snow += (sm((fr - uSnow + .01) / .06) - W2.snow) * k;
    if (intro) { var cu = (t / 66) % 1; W2.storm = sm((cu - .26) / .07) * (1 - sm((cu - .55) / .07)); W2.snow = sm((cu - .70) / .06) * (1 - sm((cu - .95) / .04)); }
    var storm = W2.storm, snow = W2.snow * (1 - sm((fin - .06) / .14)), gust = Math.max(gust0, storm * (.85 + .15 * Math.sin(W2.clock * 1.3)));
    if (!intro) {
    var fl = TRAIL.flags[clamp(Math.round(hero2.pos * STEPW / SPC), 0, TRAIL.flags.length - 1)]; hero2.sc += (clamp((fl.slope - .5) / .55, 0, 1) - hero2.sc) * (1 - Math.pow(.05, dt)); hero2.br += (fl.br - hero2.br) * (1 - Math.pow(.05, dt));
    if (HERO_DBG != null) { hero2.pos = HERO_DBG * (TRAIL.steps - .3); hero2.vel = 0; }
    hero2.target = clamp(qScroll / QT, 0, 1) * (TRAIL.steps - .3); chase(hero2, hero2.target, dt, 3.4 * (1 - .42 * storm) * (1 - .35 * hero2.sc) * (1 - .2 * hero2.br) * (FASTT ? 6 : 1), true);
    var kind = hero2.br > .5 ? "wood" : (snow > .5 ? "snow" : (storm > .3 ? "stone" : (fr < uRock ? "sand" : "stone")));
    if (hero2.vel > .25 && Math.floor(hero2.pos + 1e-6) > Math.floor(prevPos + 1e-6) && window.Snd) Snd.step(kind, .75, 0);
    }
    W2.zone = fin > .62 ? "the night" : (fin > .02 ? "the summit" : (snow > .5 ? "the snow" : (storm > .35 ? "the rock and the storm" : (hero2.br > .5 ? "the rope bridge" : "the dunes"))));
    if (false) W2.zone = snow > .5 ? "the snow" : (storm > .35 ? "the rock and the storm" : (hero2.br > .5 ? "the rope bridge" : "the dunes"));
    var hp = trailAt(hero2.pos), ahead = trailAt(hero2.pos + 6), el = lerp(.60, .30, sm(q)), az = Math.atan2(hp.z, hp.x) + lerp(.95, -.5, sm(q)) + .22 * Math.sin(q * 9), dist = lerp(1500, 950, sm(q)) * (innerWidth < innerHeight * 1.1 ? 1.1 : 1);
    cam3([lerp(lerp(hp.x, ahead.x, .5), 0, .45), hp.y * .85 + 150, lerp(lerp(hp.z, ahead.z, .5), 0, .45)], az, el, dist);
    var base = { p: C3.p.slice(), tg: C3.tg.slice() };
    pr(hp.x, hp.y, hp.z, tmpA); var porV = innerWidth < innerHeight * 1.1, bx0 = (porV ? .3 : .16) * CW, bx1 = (porV ? .7 : .5) * CW, by0 = .32 * CH, by1 = .7 * CH;   // keep him inside a comfortable part of the frame
    C3.cx += tmpA[0] < bx0 ? bx0 - tmpA[0] : (tmpA[0] > bx1 ? bx1 - tmpA[0] : 0); C3.cy += tmpA[1] < by0 ? by0 - tmpA[1] : (tmpA[1] > by1 ? by1 - tmpA[1] : 0);
    if (intro) { cam3([0, 720 + 70 * Math.sin(t * .07), 0], t * .04 + .6, .30 + .05 * Math.sin(t * .1), 1750); C3.cx = CW * .5; C3.cy = CH * .52; }
    if (fin > 0) { var cx0 = C3.cx, cy0 = C3.cy; finaleCam(fin, base); var kk = sm(fin / .3); C3.cx = lerp(cx0, C3.cx, kk); C3.cy = lerp(cy0, C3.cy, kk); var wk = 1 - sm((fin - .36) / .08); if (wk > .01) { pr(hp.x, hp.y, hp.z, tmpA); C3.cx += wk * (tmpA[0] < bx0 ? bx0 - tmpA[0] : (tmpA[0] > bx1 ? bx1 - tmpA[0] : 0)); C3.cy += wk * (tmpA[1] < by0 ? by0 - tmpA[1] : (tmpA[1] > by1 ? by1 - tmpA[1] : 0)); } }
    if (storm > .1) { var sh = storm * (1.5 + gust * 2); C3.cx += Math.sin(W2.clock * 31) * sh * DPR; C3.cy += Math.sin(W2.clock * 27 + 1) * sh * DPR; }
    // lightning: a flash, then thunder after the distance
    if (window.frozenForTest !== true && storm > .5 && W2.clock > W2.nextBolt) { W2.bolt = W2.clock; W2.nextBolt = W2.clock + 3.5 + rainSeed() * 6; W2.thunderAt = W2.clock + .35 + rainSeed() * 1.6; if (window.Snd) Snd.crack(.4 + rainSeed() * .4, rainSeed() * 1.6 - .8); }
    if (W2.thunderAt > 0 && W2.clock > W2.thunderAt) { W2.thunderAt = -1; if (window.Snd) Snd.thunder(.7 + rainSeed() * .5, rainSeed() * 1.4 - .7); }
    var e1 = W2.clock - W2.bolt, flash = Math.max(e1 < 0 ? 0 : Math.exp(-e1 * 8), e1 - .16 < 0 ? 0 : .7 * Math.exp(-(e1 - .16) * 7)) * storm;
    var elA = Math.asin(clamp(-C3.f[1], -1, 1)), f = C3.fl, horizon = C3.cy - f * Math.tan(elA), dd = sm((fin - .36) / .2), nn = sm((fin - .62) / .18), cloudA = intro ? 1 : Math.max(sm((hero2.pos / (TRAIL.steps - 1) - .84) / .14), sm(fin / .2)), hzB = intro ? .22 : 0, CLOUD_RGB = [250, 226, 226];
    var hazeD = mixc(mixc(T_HAZE, [100, 92, 124], storm), [212, 220, 238], snow), hazeC = mixc(mixc(hazeD, [255, 168, 112], dd), [40, 34, 74], nn);
    var topC = mixc(mixc(mixc(mixc([162, 116, 148], [44, 40, 66], storm), [150, 168, 204], snow), [92, 58, 126], dd), [4, 6, 22], nn), midC = mixc(mixc(mixc(mixc([226, 168, 158], [74, 68, 98], storm), [196, 208, 230], snow), [226, 112, 104], dd), [12, 16, 46], nn);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = css(hazeC); ctx.fillRect(0, 0, CW, CH);
    if (horizon > -CH * .05) { var sg = ctx.createLinearGradient(0, horizon - CH * 1.0, 0, horizon); sg.addColorStop(0, css(topC)); sg.addColorStop(.5, css(midC)); sg.addColorStop(1, css(hazeC)); ctx.fillStyle = sg; ctx.fillRect(0, 0, CW, Math.max(0, horizon + 2)); }
    var sE = lerp(.56, -.12, sm((fin - .2) / .55)), sunV = fin > 0 ? [VDIR[0] * Math.cos(sE), Math.sin(sE), VDIR[1] * Math.cos(sE)] : [TSUN[0], TSUN[1] * .7 / .55 * .55, TSUN[2]];
    pr(C3.p[0] + sunV[0] * 30000, C3.p[1] + sunV[1] * 30000, C3.p[2] + sunV[2] * 30000, tmpA);
    var sunA = (1 - storm) * (1 - snow * .55) * (1 - nn * .9); if (tmpA[2] > 0 && sunA > .02) { ctx.globalAlpha = sunA; var rr = CH * (.62 + .25 * dd), g2 = ctx.createRadialGradient(tmpA[0], tmpA[1], 0, tmpA[0], tmpA[1], rr); g2.addColorStop(0, "rgba(255,246,222,.95)"); g2.addColorStop(.1, "rgba(255,236,196,.7)"); g2.addColorStop(.4, "rgba(255," + Math.round(214 - 50 * dd) + "," + Math.round(160 - 40 * dd) + ",.22)"); g2.addColorStop(1, "rgba(255,214,160,0)"); ctx.fillStyle = g2; ctx.fillRect(tmpA[0] - rr, tmpA[1] - rr, rr * 2, rr * 2); ctx.fillStyle = "rgb(255,250,236)"; ctx.beginPath(); ctx.arc(tmpA[0], tmpA[1], CH * .035, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; }
    RINGS.forEach(function (rg) {
      var n = rg.pts.length, run = [], base = [], kk, a2, x, z; ctx.fillStyle = css(mixc(mixc(rg.c, hazeC, 1 - rg.f), [60, 54, 84], storm * .35)); ctx.globalAlpha = .96;
      function flush() { if (run.length > 1) { ctx.beginPath(); ctx.moveTo(run[0][0], base[0][1] + 40); run.forEach(function (p) { ctx.lineTo(p[0], p[1]); }); ctx.lineTo(run[run.length - 1][0], base[base.length - 1][1] + 40); ctx.closePath(); ctx.fill(); } run = []; base = []; }
      for (kk = 0; kk <= n; kk++) { a2 = kk / n * 6.2832; x = C3.p[0] + rg.R * Math.cos(a2); z = C3.p[2] + rg.R * Math.sin(a2); var hh = rg.pts[kk % n]; pr(x, hh, z, tmpA); pr(x, 0, z, tmpB); if (tmpA[2] > 350 && tmpB[2] > 350) { run.push([tmpA[0], tmpA[1]]); base.push([tmpB[0], tmpB[1]]); } else flush(); } flush(); ctx.globalAlpha = 1;
    });
    // the mountain: every vertex projected once, then the cells painted far to near, each followed by what lies on it
    var i, j, c0 = clamp(Math.floor((C3.p[0] + TR) / TCELL), 0, TN), c1 = clamp(Math.floor((C3.p[2] + TR) / TCELL), 0, TN), v = tmpA;
    for (i = 0; i <= TN; i++) for (j = 0; j <= TN; j++) { var ix = i * W + j; pr(-TR + i * TCELL, TH_[ix], -TR + j * TCELL, v); T_PX[ix] = v[0]; T_PY[ix] = v[1]; T_PZ[ix] = v[2]; }
    T_OI.length = 0; T_OJ.length = 0; for (i = 0; i < c0; i++) T_OI.push(i); for (i = TN - 1; i >= c0; i--) T_OI.push(i); for (j = 0; j < c1; j++) T_OJ.push(j); for (j = TN - 1; j >= c1; j--) T_OJ.push(j);
    var mxs = CW + 30, mys = CH + 30, oi, oj, A, B, C, D, za, zb, zc, zd, lvl, k0; ctx.lineJoin = "round"; ctx.lineWidth = 1.1;
    function triFill(ax, ay, bx, by, cx, cy) { var mx = (ax + bx + cx) / 3, my = (ay + by + cy) / 3; ctx.beginPath(); ctx.moveTo(mx + (ax - mx) * 1.09, my + (ay - my) * 1.09); ctx.lineTo(mx + (bx - mx) * 1.09, my + (by - my) * 1.09); ctx.lineTo(mx + (cx - mx) * 1.09, my + (cy - my) * 1.09); ctx.closePath(); ctx.fill(); }     // a hair larger so neighbours overlap and no seams show, and no stroke is needed
    function fogLevel(z, y, rad) { var d = clamp((z - 700) / 3200, 0, 1), hz = clamp((380 - y) / 380, 0, 1) * .3, edge = clamp((rad - 1180) / 420, 0, 1) * .9, cl = clamp((CLOUDY + 40 - y) / 170, 0, 1) * cloudA; return clamp(Math.floor((Math.max(Math.pow(d, 1.1) + hz, edge, cl, hzB)) * (NF - 1) + .5), 0, NF - 1); }
    var passes = cloudA > .02 ? 2 : 1;
    for (var pass = 0; pass < passes; pass++) {
    for (var ii = 0; ii < T_OI.length; ii++) for (var jj = 0; jj < T_OJ.length; jj++) {
      oi = T_OI[ii]; oj = T_OJ[jj]; if (passes === 2 && ((TY[oi * TN + oj] > CLOUDY + 130) ? 1 : 0) !== pass) continue; A = oi * W + oj; B = (oi + 1) * W + oj; C = (oi + 1) * W + oj + 1; D = oi * W + oj + 1; za = T_PZ[A]; zb = T_PZ[B]; zc = T_PZ[C]; zd = T_PZ[D];
      if (za < 60 || zb < 60 || zc < 60 || zd < 60) continue;
      var xmin = Math.min(T_PX[A], T_PX[B], T_PX[C], T_PX[D]), xmax = Math.max(T_PX[A], T_PX[B], T_PX[C], T_PX[D]), ymin = Math.min(T_PY[A], T_PY[B], T_PY[C], T_PY[D]), ymax = Math.max(T_PY[A], T_PY[B], T_PY[C], T_PY[D]);
      if (xmax < -30 || xmin > mxs || ymax < -30 || ymin > mys) continue;
      k0 = (oi * TN + oj) * 2; lvl = fogLevel((za + zb + zc + zd) / 4, TY[oi * TN + oj], Math.hypot(-TR + (oi + .5) * TCELL, -TR + (oj + .5) * TCELL));
      ctx.fillStyle = T_PAL[TC[k0] + lvl]; triFill(T_PX[A], T_PY[A], T_PX[B], T_PY[B], T_PX[C], T_PY[C]);
      ctx.fillStyle = T_PAL[TC[k0 + 1] + lvl]; triFill(T_PX[A], T_PY[A], T_PX[C], T_PY[C], T_PX[D], T_PY[D]);
      var key = oi * TN + oj, tl = TRAIL.cells[key], hz2 = Math.pow(lvl / (NF - 1), .9) * .96;
      if (tl) for (var m = 0; m < tl.length; m++) {
        var sg4 = TRAIL.segs[tl[m]], q4 = sg4.q; pr(q4[0][0], q4[0][1], q4[0][2], tmpA); pr(q4[1][0], q4[1][1], q4[1][2], tmpB); pr(q4[2][0], q4[2][1], q4[2][2], tmpC); pr(q4[3][0], q4[3][1], q4[3][2], tmpD); if (tmpA[2] < 40 || tmpB[2] < 40 || tmpC[2] < 40 || tmpD[2] < 40) continue;
        ctx.fillStyle = css(mixc(sg4.br ? (sg4.i % 2 ? [150, 104, 70] : [124, 84, 58]) : (storm > .4 ? [150, 128, 120] : [238, 204, 160]), hazeC, Math.max(hz2, .0))); ctx.beginPath(); ctx.moveTo(tmpA[0], tmpA[1]); ctx.lineTo(tmpB[0], tmpB[1]); ctx.lineTo(tmpC[0], tmpC[1]); ctx.lineTo(tmpD[0], tmpD[1]); ctx.closePath(); ctx.fill();
        if (sg4.br) { var lift = C3.fl * 15 / Math.max(tmpA[2], 60); ctx.strokeStyle = "rgba(60,40,32,.95)"; ctx.lineWidth = Math.max(1, lift * .12); ctx.beginPath(); ctx.moveTo(tmpA[0], tmpA[1] - lift); ctx.lineTo(tmpD[0], tmpD[1] - lift); ctx.moveTo(tmpB[0], tmpB[1] - lift); ctx.lineTo(tmpC[0], tmpC[1] - lift); ctx.stroke(); if (sg4.i % 3 === 0) { ctx.beginPath(); ctx.moveTo(tmpA[0], tmpA[1]); ctx.lineTo(tmpA[0], tmpA[1] - lift); ctx.moveTo(tmpB[0], tmpB[1]); ctx.lineTo(tmpB[0], tmpB[1] - lift); ctx.stroke(); } ctx.lineWidth = 1.1; ctx.strokeStyle = "rgba(0,0,0,0)"; }
      }
      var bl = BOULDERS.cells[key]; if (bl) for (var bi = 0; bi < bl.length; bi++) drawBoulder(bl[bi], lvl);
      var tl3 = TREES.cells[key]; if (tl3) for (var ti = 0; ti < tl3.length; ti++) drawTree(tl3[ti], lvl);
    }
    if (pass === 0 && passes === 2) drawClouds(cloudA);
    }
    // rocks that come down the slope in the storm
    if (!intro && storm > .35 && W2.clock > W2.nextRock) {
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
    if (dd > .02) { ctx.fillStyle = "rgba(150,70,100," + (.26 * dd * (1 - nn)).toFixed(3) + ")"; ctx.fillRect(0, 0, CW, CH); } if (nn > .02) { ctx.fillStyle = "rgba(6,10,34," + (.72 * nn).toFixed(3) + ")"; ctx.fillRect(0, 0, CW, CH); drawStars(W2.clock, nn, horizon); drawMoon(nn); }
    if (flash > .01) { ctx.fillStyle = "rgba(220,230,255," + (flash * .6).toFixed(3) + ")"; ctx.fillRect(0, 0, CW, CH); }
    if (!intro) {
    hero2.ph = hero2.pos * Math.PI; pr(hp.x, hp.y, hp.z, tmpA); var fwx = C3.f[0], fwz = C3.f[2], fl2 = Math.hypot(fwx, fwz) || 1, rgx = C3.r[0], rgz = C3.r[2], tl2 = Math.hypot(hp.tx, hp.tz) || 1;
    var arrived = 1 - sm((TRAIL.steps - .3 - hero2.pos - .5) / 3), turn = sm((fin - .03) / .14) * arrived, tx = lerp(hp.tx / tl2, VDIR[0], turn), tz = lerp(hp.tz / tl2, VDIR[1], turn);
    var psi = clamp(Math.atan2(tx * rgx + tz * rgz, (tx * fwx + tz * fwz) / fl2), -1.45, 1.45); hero2.yaw += (psi - hero2.yaw) * (1 - Math.pow(.02, dt));
    var plantT = sm((fin - .05) / .2) * arrived, sitT = 0, fs = Math.min((f * FIG / tmpA[2]) / 150, CH * .2 / 150);
    drawFlag(plantT, t, gust);
    drawFigure(tmpA[0], tmpA[1], fs, { ph: hero2.ph, amp: hero2.amp, yaw: hero2.yaw, pitch: Math.max(.05, elA), strain: storm, scramble: Math.max(hero2.sc * (1 - plantT), .85 * Math.sin(Math.PI * plantT) * (1 - sitT)), bridge: hero2.br, sit: sitT, noStaff: plantT > .02 }, t, gust, 1);
    }
    cam.x = 960; cam.tilt = 0; cam.zoom = 1; var yH = 540 + (clamp(horizon, -CH, CH * .9) - CH / 2) / S - 20, yM = 540 + (clamp(horizon + CH * .22, 0, CH) - CH / 2) / S, wD = clamp(1 - storm - snow, 0, 1) * (1 - nn);
    [[fogHaze, fogMid, wD], [fogHazeS, fogMidS, storm], [fogHazeN, fogMidN, snow]].forEach(function (g) { if (g[2] < .03) return; g[0].y = yH; g[1].y = yM; ctx.globalAlpha = g[2]; drawFog(g[0], t, 1); drawFog(g[1], t, 1); }); ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); var hwA = (1 - storm - snow * .5) * (1 - nn); if (hwA > .05) { ctx.globalAlpha = hwA; hawks.forEach(function (h) { var a = t * .1 * TS + h.ph, x = CW * (.5 + h.r * 1.6 * Math.cos(a)), y = CH * (h.y + .06 * Math.sin(a * 2)), d = Math.cos(a) > 0 ? -1 : 1, sz = h.sz * DPR, fl3 = Math.sin(t * 1.4 + h.ph) * sz * .05; ctx.fillStyle = "rgba(96,56,76,.85)"; ctx.beginPath(); ctx.moveTo(x - sz * d, y + fl3); ctx.quadraticCurveTo(x - sz * .35 * d, y - sz * .42, x, y - 2); ctx.quadraticCurveTo(x + sz * .35 * d, y - sz * .42, x + sz * d, y + fl3); ctx.quadraticCurveTo(x + sz * .3 * d, y - sz * .12, x, y + 3); ctx.quadraticCurveTo(x - sz * .3 * d, y - sz * .12, x - sz * d, y + fl3); ctx.fill(); }); ctx.globalAlpha = 1; }
    if (hwA > .05) { ctx.globalAlpha = hwA; ctx.strokeStyle = "rgba(86,60,96,.85)"; ctx.lineWidth = 1.6 * DPR; ctx.lineCap = "round"; BIRDS2.forEach(function (b) { var x = (((b.x + W2.clock * b.v * .012 * TS) % 1.2) - .1) * CW, y = CH * (b.y + .02 * Math.sin(W2.clock * .6 + b.ph)), sz = b.s * DPR, fl4 = Math.sin(W2.clock * 7 * TS + b.ph) * sz * .45; ctx.beginPath(); ctx.moveTo(x - sz, y - fl4); ctx.quadraticCurveTo(x - sz * .4, y - sz * .35 - fl4 * .4, x, y); ctx.quadraticCurveTo(x + sz * .4, y - sz * .35 - fl4 * .4, x + sz, y - fl4); ctx.stroke(); }); ctx.globalAlpha = 1; }
    if (storm < .6 && snow < .4) dust2.forEach(function (d) { d.x += d.v * dt * TS * (.6 + gust); d.y -= d.v * .2 * dt * TS; if (d.x > 1.05) d.x = -.05; if (d.y < -.05) d.y = 1.05; ctx.fillStyle = "rgba(255,230,196," + ((.2 + .2 * Math.sin(t * .9 + d.ph)) * (1 - storm * 1.6)).toFixed(3) + ")"; ctx.beginPath(); ctx.arc(d.x * CW, d.y * CH, d.sz * DPR, 0, 6.2832); ctx.fill(); });
    // rain, slanted by a hard wind
    if (storm > .05) { var slant = .28 + .5 * gust, rp = new Path2D(); rain.forEach(function (d) { d.y += d.v * 1.5 * dt; d.x -= d.v * slant * 1.5 * dt; if (d.y > 1.05) { d.y = -.05; d.x = Math.random() * 1.3; } if (d.x < -.1) d.x += 1.2; var x = d.x * CW, y = d.y * CH, l = d.len * DPR * (.7 + gust * .5); rp.moveTo(x, y); rp.lineTo(x + l * slant, y - l); }); ctx.strokeStyle = "rgba(196,208,232," + (.42 * storm).toFixed(3) + ")"; ctx.lineWidth = 1.2 * DPR; ctx.lineCap = "round"; ctx.stroke(rp); }
    // snow, falling calmly
    if (snow > .05) { ctx.fillStyle = "rgba(255,255,255," + (.85 * snow).toFixed(3) + ")"; snowF.forEach(function (d) { d.y += d.v * dt * 1.0; d.x += Math.sin(t * .8 + d.ph) * .01 * dt + .004 * dt * (.5 + gust); if (d.y > 1.04) { d.y = -.04; d.x = Math.random(); } if (d.x > 1.04) d.x = -.04; ctx.beginPath(); ctx.arc(d.x * CW, d.y * CH, d.sz * DPR, 0, 6.2832); ctx.fill(); }); }
    var dk = sm((q - .93) / .07) * .0; if (dk > 0) { ctx.fillStyle = "rgba(255,255,255," + dk + ")"; ctx.fillRect(0, 0, CW, CH); }
  }

  // ───────────── the timeline ─────────────
  var CAPS1 = [
    [0, .17, "Once upon a time", "There was a builder named Danilo.", "Danilo Silva is a software engineer in Florianópolis, Brazil, with ten years of experience, working remotely in English.", ["Today: founder and lead engineer of antiloki, an AI coding IDE built end to end", "Before: front-end and full stack engineer at banks and regulated-data companies", "Teams in Brazil, Portugal and the Caribbean"], ["Rust", "TypeScript", "React", "NestJS", "AI evaluation"]],
    [.20, .40, "The first lesson", "He loved what is easy to change and hard to break.", "How Danilo works:", ["Tests before claims: nothing is reported that was not measured", "Keeps the numbers that argue against him: he withdrew a published cost advantage when a re-run did not reproduce it", "Writes his rules down, so teammates and AI agents follow them"], ["Test-first", "Review gates", "Written rules"], "Strengths"],
    [.43, .64, "The craft", "He began at the edge of things, and learned the whole.", "From front end to the whole stack, on his own:", ["A Rust engine of about 360,000 lines (axum, SQLite)", "A desktop app in React and TypeScript, packaged with Tauri", "A router that picks and merges models from different providers", "Signed Windows and Linux installers with auto-update"], ["Rust", "axum", "SQLite", "Tauri", "React", "TypeScript"]],
    [.67, .86, "The oath", "Measure before claiming.", "Engineering principles he applies to AI systems:", ["Deterministic first: rules answer what rules can answer", "A model is asked only about meaning, and its misses are counted", "Confidence scores are checked against real outcomes"], ["Benchmarks", "Evaluation harnesses", "Calibration"], "Practices"],
    [.89, 1.01, "The mountain", "Then he looked up.", "The climb is his career: the oldest role at the foot, the newest at the top.", ["2016 — 2019  BlueFoot, Trackmob, FaçoDesign", "2019  Dogma Data Privacy", "2019 — 2021  K2 Partnering Solutions", "2021 — 2022  CIBC FirstCaribbean", "2022 — 2026  Arrow Global", "2026 — now  antiloki (founder)"], ["Frontend", "Full stack", "Founder"], "Path"]
  ];
  function uAtR(r) { for (var i = 20; i < TRAIL.P.length; i++) if (Math.hypot(TRAIL.P[i][0], TRAIL.P[i][2]) < r) return i / (TRAIL.P.length - 1); return 1; }
  var uBrA = 1, uBrB = 0; TRAIL.flags.forEach(function (q, i) { if (q.br) { uBrA = Math.min(uBrA, i / (TRAIL.P.length - 1)); uBrB = Math.max(uBrB, i / (TRAIL.P.length - 1)); } });
  function pgOf(u) { return SPLIT + (1 - SPLIT) * clamp(u * QT, 0, QT); }
  function pgFin(f) { return SPLIT + (1 - SPLIT) * (QT + f * (1 - QT)); }
  uRock = uAtR(820); uSnow = uAtR(560);
  var CAPS2 = [
    [pgOf(0), pgOf(.115), "BlueFoot · Trackmob · FaçoDesign · 2016 — 2019", "He started where the sand is soft.", "Frontend developer", ["Built an e-commerce component library and a data-cleaning middleware, with 80%+ test coverage", "Led a small team", "Built a donations dashboard for a non-profit, with internationalisation"], ["Component libraries", "Test coverage 80%+", "Internationalisation"]],
    [pgOf(.135), pgOf(.235), "Dogma Data Privacy · 2019", "Alone, he built a small fortress.", "Senior frontend developer on a data-privacy product for the European GDPR regulation.", ["Built a GDPR permissions and cookie dashboard: the screen where privacy consents and cookie choices are managed", "Worked alone: designed, built and tested the whole front end from scratch", "89% automated test coverage, with unit tests (Jest) and end-to-end tests (Cypress)", "Documented the interface components in Storybook, so they could be reused and reviewed"], ["Jest", "Cypress", "Storybook", "GDPR", "Unit and end-to-end testing"]],
    [pgOf(.255), pgOf(uBrA - .035), "K2 Partnering Solutions · 2019 — 2021", "He learned that less is more.", "Senior frontend developer", ["Proved a functional-programming rewrite with a concept branch: 200 lines became 30", "Code size fell about 35% on a product earning over €5 million a year", "Built a Vue learning platform, helped reach 80% test coverage, and demoed each sprint to clients in English"], ["Functional programming", "Vue", "Automated testing", "Client demos in English"]],
    [pgOf(uBrA - .02), pgOf(uBrB + .07), "CIBC FirstCaribbean International Bank · 2021 — 2022", "He crossed a rope bridge.", "Senior frontend developer", ["Started a credit-card selection application from scratch", "Led the technology and architecture decisions", "Custom hooks cut component size by up to 40%"], ["React", "Redux Toolkit", "TypeScript", "Cypress"]],
    [pgOf(uBrB + .09), pgOf(uRock + (uSnow - uRock) * .55), "Arrow Global, Portugal · 2022 — April 2026", "Then the storm came, and he kept walking.", "Full stack engineer", ["Refactored a legacy React and TypeScript code base to SOLID principles: components went from hundreds of lines to under 60", "Built a self-generating multi-step investment form that replaced Excel tables for fund investments", "Worked on the back end with NestJS"], ["React", "TypeScript", "NestJS", "Custom hooks", "Context and useReducer", "MirageJS"]],
    [pgOf(uRock + (uSnow - uRock) * .6), pgOf(uSnow - .02), "What he carried", "The tools in his pack.", "Technologies Danilo works with:", ["Front end: React, TypeScript, Redux Toolkit, Vue, Jest, Cypress, Storybook", "Back end and systems: NestJS, Rust (axum, SQLite), Tauri, Postgres, Supabase", "AI: benchmark and judge harnesses, calibrated confidence, deterministic-first design"], ["Frontend", "Backend", "AI evaluation"], "Strong areas"],
    [pgOf(uSnow + .01), pgOf(.93), "antiloki · 2026 — now", "He founded his own workshop.", "Founder and lead engineer of antiloki, a vibe-coding IDE for developers.", ["Routes and merges models from different providers to reach frontier-model quality at about 6x lower cost", "Deterministic code review: every change is checked by rules before it lands", "Every AI tool call is audited", "Built alone: desktop app, Rust engine, benchmark-driven router and release pipeline; 11 signed releases and 10,000+ automated tests; local-first, no telemetry"], ["Rust", "Tauri", "React", "TypeScript", "Model routing", "Code review", "Audit logging"]],
    [pgOf(.945), pgOf(1.0), "Learning, always", "He never stopped being a student.", "Education and languages", ["BSc Computer Science, University of the People (2018 — 2022)", "Portuguese (native), English (professional)"], ["Computer Science", "Portuguese", "English"], "In short"],
    [pgFin(.1), pgFin(.34), "The summit", "He planted his flag.", "Ten years, one direction: systems that are easy to change and hard to break.", [], ["Full stack", "AI tooling", "Test-first"], "In short"],
    [pgFin(.46), pgFin(.72), "The view", "Above the clouds, there was nothing left to prove.", "So he keeps measuring, and keeps building.", [], []]
  ];
  var CAPS = CAPS1.map(function (c) { return [c[0] * SPLIT, c[1] * SPLIT].concat(c.slice(2)); }).concat(CAPS2);
  var introClick = -1, startedAt = -1e9, contactEl = document.getElementById("contact"), whereEl = document.getElementById("where"), pCur = 0, pSmooth = 0, lastT = 0, started = false, gustNow = 0, gustPrev = 0, speedSm = 0;
  var cue = document.querySelector(".cue"), capEl = document.getElementById("cap"), capEb = capEl.querySelector(".eb"), capH = capEl.querySelector("h2"), capP = capEl.querySelector(".lede"), capIdx = -1, bar = document.getElementById("bar");
  // text drifts in out of the fog and drifts back into it (CSS does the work; these just set the words and the state)
  function setText(el, text) { el.textContent = text; }
  function setFall(el, on) { if (on) { el.classList.remove("leaving"); el.classList.add("in"); } else if (el.classList.contains("in")) { el.classList.remove("in"); el.classList.add("leaving"); setTimeout(function () { el.classList.remove("leaving"); }, 1100); } }
  function fillCaption(c) {
    capEb.textContent = c[2]; capH.textContent = c[3]; var el = capP; el.textContent = "";
    if (c[4]) { var sm1 = document.createElement("span"); sm1.className = "sum"; sm1.textContent = c[4]; el.appendChild(sm1); }
    if (c[5] && c[5].length) { var ul = document.createElement("ul"); c[5].forEach(function (t) { var li = document.createElement("li"); li.textContent = t; ul.appendChild(li); }); el.appendChild(ul); }
    if (c[6] && c[6].length) { var sk = document.createElement("div"); sk.className = "skills"; var b = document.createElement("b"); b.textContent = c[7] || "Skills"; sk.appendChild(b); c[6].forEach(function (t) { var sp = document.createElement("span"); sp.textContent = t; sk.appendChild(sp); }); el.appendChild(sk); }
  }
  function readSecs(c) { var w = (c[2] + " " + c[3] + " " + (c[4] || "") + " " + (c[5] || []).join(" ") + " " + (c[6] || []).join(" ")).split(/\s+/).length; return 2.5 + w / 3.4; }       // about 200 words a minute, plus a moment
  var capTimer = 0;
  function setCap(p) {
    var idx = -1; for (var i = 0; i < CAPS.length; i++) if (p >= CAPS[i][0] && p < CAPS[i][1]) idx = i;
    if (idx !== capIdx) {
      var prev = capIdx; capIdx = idx; clearTimeout(capTimer); if (prev >= 0) setFall(capEl, false);
      capTimer = setTimeout(function () {
        if (capIdx !== idx || idx < 0) return; capEl.classList.remove("leaving");
        fillCaption(CAPS[idx]); if (auto.on) auto.hold = readSecs(CAPS[idx]);
        void capEl.offsetWidth; setFall(capEl, true);
      }, prev >= 0 ? 900 : 40);
    }
  }
  function progress() { var m = Math.max(1, document.documentElement.scrollHeight - innerHeight); return clamp(scrollY / m, 0, 1); }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(5.4e6 / Math.max(1, innerWidth * innerHeight))) * RS; CW = Math.round(innerWidth * DPR); CH = Math.round(innerHeight * DPR); cv.width = CW; cv.height = CH; S = Math.max(CW / DW, CH / DH);
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
    requestAnimationFrame(frame);
    var rdt = ms - (frame.pm || ms); frame.pm = ms;
    if (QMODE === "auto" && !navigator.webdriver && rdt > 0 && rdt < 400) { emaMs += (rdt - emaMs) * .05; perfT += rdt; if (perfT > 1500) { perfT = 0; if (emaMs > 34 && RS > .62) { RS = Math.max(.62, RS * .9); calmT = 0; resize(); } else if (emaMs < 17.5 && RS < 1) { if (++calmT > 4) { calmT = 0; RS = Math.min(1, RS * 1.12); resize(); } } else calmT = 0; } }
    var t = ms / 1000, dt = Math.min(.05, t - lastT || .016); lastT = t; if (frozenP != null) t = 3;
    var nowMs = performance.now(), realDt = Math.min(.25, (nowMs - (auto.last || nowMs)) / 1000); auto.last = nowMs;
    if (!auto.on && VSON && started) {
      if (Math.abs(window.scrollY - vs.y) > 3) { vs.y = vs.t = window.scrollY; }                                  // scrolled some other way (keys, the bar): follow it
      else if (Math.abs(vs.t - vs.y) > .5) { var capPx = 115 * (FASTT ? 6 : 1); vs.y += clamp((vs.t - vs.y) * Math.min(1, realDt * 7), -capPx * realDt, capPx * realDt); window.scrollTo(0, vs.y); }
    }
    if (auto.on) { var maxY = Math.max(1, document.documentElement.scrollHeight - innerHeight); if (auto.hold > 0) auto.hold -= realDt; else auto.p = Math.min(1, auto.p + (auto.p < SPLIT ? 150 : AUTO_SPEED) * (FASTT ? 6 : 1) * realDt / maxY); window.scrollTo(0, auto.p * maxY); if (auto.p >= 1) setAuto(false); }
    var pTarget = frozenP != null ? frozenP : (auto.on ? auto.p : progress()); pSmooth += (pTarget - pSmooth) * (1 - Math.pow(.0009, dt)); var p = pSmooth, pg = p; p = clamp(p / SPLIT, 0, 1); speedSm += (Math.abs(pTarget - pSmooth) * 40 - speedSm) * .1;
    // the wind: slow gusts, a little stronger while you scroll
    gustNow = clamp(.5 + .5 * Math.sin(t * .31) * Math.sin(t * .17 + 1) + clamp(speedSm, 0, .5) * .5, 0, 1); if (gustNow > .82 && gustPrev <= .82) window.Snd && Snd.swoosh(.7, .3);
    gustPrev = gustNow; var gust = gustNow, dens = 1 + 1.5 * sm((p - .6) / .4); lateAmt = sm((p - .60) / .34);
    if (!started) {                                                      // the intro: the whole mountain in cloud and changing weather, until you press the button
      drawScene2(t, dt, 0, gust, true); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = .7; ctx.drawImage(overlay, 0, 0); ctx.globalAlpha = 1;
      if (introClick > 0) { var fa = clamp((performance.now() - introClick) / 560, 0, 1); ctx.fillStyle = "rgba(196,150,172," + fa.toFixed(3) + ")"; ctx.fillRect(0, 0, CW, CH); }
      return;
    }
    // the second half of the scroll is the second scene: the arid face, entered out of the fog the first one ended in
    if (pg > SPLIT) {
      var q = clamp((pg - SPLIT) / (1 - SPLIT), 0, 1); if (PROF) _pt = performance.now(); drawScene2(t, dt, q, gust); mark("scene2");
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - (W2.night || 0) * .9; ctx.drawImage(overlay, 0, 0); ctx.globalAlpha = 1; setFall(contactEl, W2.fin > .8);
      var inFog = 1 - sm(q / .14); if (inFog > .002) { ctx.fillStyle = "rgba(196,150,172," + inFog.toFixed(3) + ")"; ctx.fillRect(0, 0, CW, CH); }
      cue.style.opacity = 0; whereEl.textContent = "The Climb · scene 2 · " + W2.zone; capEl.classList.toggle("dark", false); capEl.classList.toggle("warm", true); bar.style.transform = "scaleX(" + pg.toFixed(4) + ")"; setCap(SPLIT + (1 - SPLIT) * W2.qe);
      if (window.Snd) { Snd.update({ gust: Math.max(gust, W2.storm), river: 0, dry: 1 - W2.snow * .8, scene: W2.snow > .5 ? 3 : (W2.storm > .35 ? 2 : 1), intensity: .25 + .7 * W2.qe, fog: 0, storm: W2.storm, snow: W2.snow }); if (Snd.on && W2.storm < .3 && W2.snow < .3 && Math.random() < dt * .12) Snd.hawk(clamp(Math.random() * 1.6 - .8, -1, 1), .8); }
      return;
    }
    stormAmt = 0; setFall(contactEl, false); capEl.classList.toggle("warm", false); whereEl.textContent = "The Climb · scene 1 · base camp";
    // camera: pan across the scenario, tilt up to the mountain at the end, dolly in slowly
    var portrait = innerWidth < innerHeight * 1.1, e = sm(p);
    cam.x = portrait ? lerp(DW * .31, DW * .56, e) : 960 + 380 * e; cam.tilt = DH * 1.18 * sm((p - .56) / .44); cam.zoom = 1 + .07 * e; cam.mz = 1 + .6 * sm((p - .58) / .42);
    // he walks wherever your scroll puts him, and stops wherever you stop: a smoothed velocity, no snapping to whole steps
    var kf = clamp((p - .05) / .83, 0, 1) * (NN - 1); hero.target = kf; var prevPos = hero.pos;
    chase(hero, kf, dt, 3.0 * (FASTT ? 6 : 1));
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
    setLayer(1); var hx = hp.x, hy = hp.v * DH - hp.hop * 14 * hs2 * 0, alpha = fade; drawFigure(hx, hp.v * DH, hs2, { ph: hero.ph, amp: amp, yaw: hero.yaw, stride: 40 / 54 }, t, gust, alpha);
    drawGrassBands(t, gust, heroY - 6, 1e9); mark("figure+grass front");
    // fireflies: wandering, drifting downwind, twinkling; small and faint near the horizon, bigger and brighter near you
    flies.forEach(function (f) {
      f.x += f.vx * dt * TS * (.6 + gust * .8); f.y += Math.sin(t * f.sp + f.wob) * 6 * dt; if (f.x > X1) f.x = X0; var tw = .5 + .5 * Math.sin(t * f.sp * 1.7 + f.ph), prevLit = f.lit; f.lit = tw;
      var sc = toScreen(f.x + Math.sin(t * .4 + f.wob) * 10, f.y, f.f); if (sc[0] < -40 || sc[0] > CW + 40 || sc[1] < -40 || sc[1] > CH + 40) return;
      var r0 = lerp(.9, 4.0, f.t) * sc[2], a0 = lerp(.22, .78, f.t) * (.35 + .65 * tw) * (started ? 1 : .8); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = a0 * .9; ctx.drawImage(haloSpr, sc[0] - r0 * 4.2, sc[1] - r0 * 3.6, r0 * 8.4, r0 * 7.2); ctx.globalAlpha = Math.min(1, a0 * 1.4); ctx.drawImage(coreSpr, sc[0] - r0 * 1.6, sc[1] - r0 * .8, r0 * 3.2, r0 * 1.6); ctx.globalAlpha = 1;
    });
    dust.forEach(function (d) { d.x += d.vx * dt * TS * (.5 + gust); d.y += d.vy * dt * TS; if (d.x > X1) d.x = X0; if (d.y < -20) d.y = DH; if (d.y > DH + 20) d.y = 0; var sc = toScreen(d.x, d.y, d.f); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "rgba(255,232,214," + (.15 + .25 * Math.sin(t * .9 + d.ph) * .5 + .12) + ")"; ctx.beginPath(); ctx.arc(sc[0], sc[1], d.sz * sc[2], 0, 6.2832); ctx.fill(); });
    mark("fireflies+dust"); drawFog(fogFront, t, dens); mark("frontfog");
    // dark bushes in the bottom corners, and the heavy vignette
    setLayer(1.3); ctx.fillStyle = "rgba(20,20,40,1)"; [[0, 1.0], [140, 1.0], [-120, 1.0], [1900, 1.0], [2060, 1.0], [2240, 1.0]].forEach(function (q, i) { var sway = Math.sin(t * .8 + i) * 4; ctx.beginPath(); ctx.ellipse(q[0] + sway, DH * 1.0 + (i % 3) * 8, 150 + (i % 2) * 40, 62 + (i % 3) * 8, 0, 0, 6.2832); ctx.fill(); });
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(overlay, 0, 0);
    var endFog = sm((p - .84) / .14); var ft = (performance.now() - startedAt) / 1700; if (ft < 1) { ctx.fillStyle = "rgba(196,150,172," + (1 - sm(ft)).toFixed(3) + ")"; ctx.fillRect(0, 0, CW, CH); } if (endFog > 0) { ctx.fillStyle = "rgba(196,150,172," + endFog.toFixed(3) + ")"; ctx.fillRect(0, 0, CW, CH); }      // the fog closes in as the scene ends
    mark("vignette"); cue.style.opacity = p > .03 ? 0 : ""; capEl.classList.toggle("dark", p > .90); bar.style.transform = "scaleX(" + pg.toFixed(4) + ")"; setCap(pg);
    // sound: wind, the river (louder when you are on the stones), the song's intensity
    if (window.Snd) { var onWater = clamp(hero.pos / 2, 0, 1), sc2 = toScreen(cxAt(.7), .7 * DH, 1); Snd.update({ gust: gust, river: .35 + .6 * onWater * fade, riverPan: clamp((sc2[0] / CW - .5) * 1.4, -1, 1), intensity: p, fog: dens - 1, dry: 0, scene: 0 }); }
    if (window.Snd && Snd.on && Math.random() < dt * .09) { var bi = Math.floor(Math.random() * birds.length), bb = birds[bi], bx = (((bb.x + t * bb.v * TS) % (DW + 400)) - 200), bs = toScreen(bx, bb.y, .05); if (bs[0] > 0 && bs[0] < CW) Snd.chirp(clamp((bs[0] / CW - .5) * 1.8, -1, 1), .8); }
  }

  // ───────────── start ─────────────
  (function () {
    var en = document.getElementById("entry"); var go = function () { if (en) en.classList.add("in"); }; if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { setTimeout(go, 150); }); setTimeout(go, 1500); } else setTimeout(go, 300);
  })();
  window.addEventListener("resize", resize); resize();
  // autoplay: the page scrolls itself at a reading pace; any wheel, touch or key press hands control back
  var auto = { on: false, p: 0, last: 0, since: 0, hold: 0 }, playBtn = document.createElement("button"), AUTO_SPEED = 70;
  function setAuto(on) { auto.hold = 0; auto.on = on; auto.p = progress(); vs.y = vs.t = window.scrollY; auto.last = performance.now(); auto.since = performance.now(); playBtn.setAttribute("aria-pressed", on ? "true" : "false"); playBtn.textContent = on ? "Pause" : "Play"; }
  playBtn.addEventListener("click", function () { if (!started) return; if (!auto.on && progress() > .995) window.scrollTo(0, 0); setAuto(!auto.on); });      // starts where you are; only from the very end does it begin again
  ["wheel", "touchstart", "keydown", "mousedown"].forEach(function (ev) { window.addEventListener(ev, function (e) { if (auto.on && e.isTrusted !== false && !(playBtn.contains(e.target)) && performance.now() - auto.since > 700) setAuto(false); }, { passive: true }); });
  // on a computer the wheel is eased and capped to the speed he can walk (a phone's touch scrolling is naturally this slow)
  var vs = { y: 0, t: 0 }, VSON = !("ontouchstart" in window) && !small;
  window.addEventListener("wheel", function (e) {
    if (!VSON || !started || e.ctrlKey) return; if (auto.on) { setAuto(false); }
    e.preventDefault(); var maxY = Math.max(1, document.documentElement.scrollHeight - innerHeight), dy = e.deltaY * (e.deltaMode === 1 ? 33 : (e.deltaMode === 2 ? innerHeight : 1));
    if (Math.abs(window.scrollY - vs.y) > 3) { vs.y = vs.t = window.scrollY; }
    vs.t = clamp(vs.t + dy, Math.max(0, vs.y - 1400), Math.min(maxY, vs.y + 1400));
  }, { passive: false });
  window.addEventListener("keydown", function (e) {
    if (!VSON || !started || e.ctrlKey || e.metaKey || e.altKey) return; var d = 0, k = e.key;
    if (k === "ArrowDown") d = 90; else if (k === "ArrowUp") d = -90; else if (k === "PageDown" || (k === " " && !e.shiftKey)) d = innerHeight * .8; else if (k === "PageUp" || (k === " " && e.shiftKey)) d = -innerHeight * .8; else if (k === "End") d = 1400; else if (k === "Home") d = -1400; else return;
    e.preventDefault(); if (auto.on) setAuto(false); var maxY = Math.max(1, document.documentElement.scrollHeight - innerHeight); if (Math.abs(window.scrollY - vs.y) > 3) { vs.y = vs.t = window.scrollY; } vs.t = clamp(vs.t + d, Math.max(0, vs.y - 1400), Math.min(maxY, vs.y + 1400));
  });
  function begin(withSound) {
    if (started || introClick > 0) return; introClick = performance.now(); document.getElementById("entry").classList.add("out");
    if (withSound && window.Snd) { Snd.start(); document.getElementById("sndbtn").textContent = "Sound on"; document.getElementById("sndbtn").setAttribute("aria-pressed", "true"); }
    setTimeout(function () { started = true; startedAt = performance.now(); document.documentElement.classList.remove("gated"); window.scrollTo(0, 0); }, 600);
    setTimeout(function () { var e = document.getElementById("entry"); if (e && e.parentNode) e.parentNode.removeChild(e); }, 1600);
  }
  var qBtn = document.getElementById("qbtn"); if (qBtn) qBtn.addEventListener("click", function () {
    QMODE = QMODE === "auto" ? "high" : (QMODE === "high" ? "low" : "auto"); qBtn.textContent = "Quality: " + QMODE; qBtn.setAttribute("aria-pressed", QMODE === "auto" ? "false" : "true");
    if (QMODE === "high") RS = 1; else if (QMODE === "low") RS = .6; emaMs = 16; perfT = 0; calmT = 0; resize();
  });
  document.getElementById("gate-on").addEventListener("click", function () { begin(true); });
  document.getElementById("sndbtn").addEventListener("click", function () { var on = this.getAttribute("aria-pressed") === "true"; if (on) { Snd.mute(true); this.textContent = "Sound off"; this.setAttribute("aria-pressed", "false"); } else { Snd.start(); this.textContent = "Sound on"; this.setAttribute("aria-pressed", "true"); } });
  if (frozenP != null || HERO_DBG != null || /skipintro/.test(location.hash)) { document.documentElement.classList.remove("gated"); var en = document.getElementById("entry"); if (en) en.parentNode.removeChild(en); started = true; }
  window.__climb = {fin: function () { return W2.fin; }, TRAIL: TRAIL, uRock: uRock, uSnow: uSnow, sheet: function (n, gust, tt) { var c = document.createElement("canvas"); c.width = 180 * n; c.height = 300; var old = ctx; ctx = c.getContext("2d"); ctx.fillStyle = "#8a7aa8"; ctx.fillRect(0, 0, c.width, c.height); for (var i = 0; i < n; i++) { ctx.save(); ctx.translate(90 + i * 180, 280); drawFigure(0, 0, 1.5, { ph: i / n * 6.2832 * 2, amp: 1, yaw: .3 }, tt + i * .2, gust, 1); ctx.restore(); } ctx = old; return c.toDataURL("image/png"); }, drawScene2: drawScene2, hero2: hero2,  cam: cam, hero: hero, NODES: NODES, toScreen: toScreen, DPR: function () { return DPR; } };
  requestAnimationFrame(frame);
})();

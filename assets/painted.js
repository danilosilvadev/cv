/* The painted walk. When art/web/ holds painted frames, each stop of the page shows its painting. Sections pick a frame with the same
 * data-cam key the 3D camera uses; a stop without a frame keeps the live 3D world, and when every stop has a frame the 3D engine is
 * never downloaded. Open with #s=<float> to freeze one frame between stops (same as the 3D scene).
 *
 * Two renderers share the scroll logic:
 *  - "gl"  (WebGL, needs the depth maps art/web/NN-key-d.webp): a real camera moves through each painting. Scrolling pushes in and
 *          slides sideways, so near things and far things move at different speeds (parallax); fire flickers, mist rolls, water
 *          shimmers, stars twinkle and embers or motes drift, always, even when you stop. The frame at "the turn" flips over.
 *  - "dom" (plain <img> layers): stills that hold, crossfade and push in. Used when WebGL or the depth maps are missing. */
(function () {
  "use strict";
  var root = document.documentElement, box = document.getElementById("paint");
  var Painted = window.Painted = { complete: false, count: 0, mode: "", start: start, stop: stop, whenReady: whenReady };
  var waiters = [], ready = false;
  function whenReady(fn) { if (ready) fn(Painted); else waiters.push(fn); }
  function done() { ready = true; waiters.splice(0).forEach(function (fn) { fn(Painted); }); }
  if (!box || !window.fetch) { done(); return; }

  var FOCUS = { forest: 50, turn: 50, gate: 38, p1: 25, p2: 25, p3: 25, p4: 25, p5: 25, rose: 25 };   // where the subject sits across a painting (%); the default is 30
  /* what moves in each painting: fire (flicker and heat), shim (water shimmer), twk (twinkling highlights), mist, pulse (glow breathes),
   * and a particle kind: 0 embers rise, 1 fireflies wander, 2 motes drift, 3 snow falls. col is the particle colour, mc the mist colour. */
  var FX = {
    forest: { mist: .8, mc: [.55, .72, .88], fire: .5, k: 1, n: 70, col: [1, .86, .45] },
    gate:   { fire: 1, mist: .25, mc: [.8, .45, .25], k: 0, n: 140, col: [1, .55, .2] },
    inf1:   { fire: .6, twk: .3, mist: .3, mc: [.8, .35, .2], k: 0, n: 90, col: [1, .5, .2] },
    inf2:   { fire: .8, mist: .5, mc: [.6, .55, .55], k: 0, n: 130, col: [1, .55, .2] },
    inf3:   { fire: .6, mist: .35, mc: [.7, .25, .15], k: 0, n: 100, col: [1, .45, .15] },
    inf4:   { twk: .7, mist: .4, mc: [.5, .8, .85], k: 3, n: 110, col: [.8, .95, 1] },
    turn:   { twk: .8, mist: .3, mc: [.6, .85, .95], k: 3, n: 110, col: [.85, .95, 1] },
    shore:  { shim: 1, twk: .6, mist: .3, mc: [.9, .6, .5], k: 2, n: 50, col: [1, .85, .6] },
    m1:     { shim: 1, mist: .35, mc: [.95, .65, .6], k: 2, n: 60, col: [1, .85, .65] },
    m2:     { shim: 1, mist: .4, mc: [1, .8, .65], k: 2, n: 60, col: [1, .9, .65] },
    m3:     { shim: .9, mist: .25, mc: [1, .85, .5], k: 2, n: 70, col: [1, .88, .5] },
    m4:     { shim: .8, mist: .25, mc: [1, .92, .7], k: 2, n: 90, col: [1, .95, .7] },
    m5:     { shim: .3, twk: .8, mist: .3, mc: [.4, .55, .85], k: 1, n: 60, col: [.9, .95, 1] },
    m6:     { shim: .6, mist: .35, mc: [1, .8, .45], k: 2, n: 90, col: [1, .85, .45] },
    garden: { mist: .3, mc: [1, .9, .55], k: 2, n: 110, col: [1, .92, .55] },
    p1:     { twk: 1, pulse: .6, k: 2, n: 80, col: [.85, .9, 1] },
    p2:     { twk: 1, pulse: .6, k: 2, n: 80, col: [1, .85, .6] },
    p3:     { twk: 1, pulse: .8, k: 2, n: 90, col: [1, .88, .55] },
    p4:     { twk: 1, pulse: 1, k: 2, n: 100, col: [1, .9, .5] },
    p5:     { twk: 1, pulse: .7, k: 2, n: 80, col: [1, .7, .45] },
    rose:   { twk: 1, pulse: 1, k: 2, n: 130, col: [1, .93, .7] }
  };
  var DIR = "art/web/", ZOOM = .07, FLIP = box.getAttribute("data-flip") === "1";
  var small = window.matchMedia("(max-width: 760px)").matches || window.matchMedia("(pointer: coarse)").matches;
  var frozen = /s=([\d.]+)/.exec(location.hash), noGL = /nogl/.test(location.search + location.hash);
  if (/bare/.test(location.hash)) root.classList.add("bare");

  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
  function sm(t) { return t * t * (3 - 2 * t); }
  function portrait() { return window.innerWidth < window.innerHeight * 1.1; }
  function url(key, suffix) { return DIR + files[key] + suffix + ".webp"; }
  function durl(key) { return DIR + files[key] + "-d.webp"; }

  var seq = [].slice.call(document.querySelectorAll("[data-cam]")).map(function (el) { return { el: el, key: el.getAttribute("data-cam") }; });
  var files = {}, hasDepth = {}, layers = {}, cur = { s: 0 }, last = 0, raf = 0, running = false, px = 0, py = 0, tx = 0, ty = 0, lead = 0, mode = "dom", GL = null;

  function target() {
    if (!seq.length) return 0;
    var y = window.scrollY, mid = y + window.innerHeight * .5;
    var cs = seq.map(function (s) { var r = s.el.getBoundingClientRect(); return y + r.top + Math.min(r.height / 2, window.innerHeight * .5); });   // a tall section reaches its camera key when its top is on screen (same rule as descent.js)
    if (mid <= cs[0]) return 0;
    for (var i = 0; i < seq.length - 1; i++) if (mid < cs[i + 1]) return i + (mid - cs[i]) / (cs[i + 1] - cs[i]);
    return seq.length - 1;
  }

  /* the world turns over at the "turn" stop: half a turn arriving, another half leaving (the picture is symmetric, so it ends upright) */
  function rotation(key, d) { if (key !== "turn") return 0; return d <= 0 ? 180 * sm(clamp(d + 1, 0, 1)) : 180 + 180 * sm(clamp(d, 0, 1)); }
  /* a rotated 16:9 picture shows corners; this is the radius (in screen heights) of the disc that hides them while it turns */
  function discRadius(rot) { var u = Math.abs(Math.sin(rot * Math.PI / 180)); return u > .001 ? (1 - u) * 1.5 + u * .5 : 0; }

  /* the soundtrack follows the world (assets/sound.js listens for "descent:world"); the 3D engine sends it too, but not when every stop is painted */
  var WORLD = { selva: 0, inferno: 1, purgatorio: 2, paradiso: 3, empyrean: 4 }, curWorld = -1;
  function announce(s) {
    var w = WORLD[seq[Math.round(s)].el.getAttribute("data-w")];
    if (w == null || w === curWorld) return; curWorld = w;
    try { window.dispatchEvent(new CustomEvent("descent:world", { detail: w })); } catch (e) { /* old browser */ }
  }

  /* ═════════════ renderer 1: the live WebGL camera ═════════════ */
  var VS = "attribute vec2 p; varying vec2 vUv; void main(){ vUv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }";
  var FS = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH", "precision highp float;", "#else", "precision mediump float;", "#endif",
    "varying vec2 vUv;",
    "uniform sampler2D uColor, uDepth;",
    "uniform vec2 uRes; uniform float uIA, uFocus, uFlip, uRot, uDisc, uTime, uAlpha, uZoom;",
    "uniform vec2 uShift;",
    "uniform float uFire, uShim, uTwk, uMist, uPulse; uniform vec3 uMistCol;",
    "float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }",
    "float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }",
    "float fbm(vec2 p){ return .5 * noise(p) + .25 * noise(p * 2.1) + .125 * noise(p * 4.3) + .0625 * noise(p * 8.7); }",
    "float lum(vec3 c){ return dot(c, vec3(.299, .587, .114)); }",
    "void main(){",
    "  float ar = uRes.x / uRes.y;",
    "  vec2 s = vUv;",
    "  vec2 q = (s - .5) * vec2(ar, 1.); float cr = cos(uRot), sr = sin(uRot); q = mat2(cr, -sr, sr, cr) * q;",           // the turn
    "  float disc = uDisc > 0. ? 1. - smoothstep(uDisc * .78, uDisc, length((s - .5) * vec2(ar, 1.))) : 1.;",
    "  s = q / vec2(ar, 1.) + .5;",
    "  if (uFlip > .5) s.x = 1. - s.x;",
    "  vec2 k = ar > uIA ? vec2(1., uIA / ar) : vec2(ar / uIA, 1.);",                                                      // cover the screen with the 16:9 painting
    "  float cx = clamp(uFocus, k.x * .5, 1. - k.x * .5);",
    "  vec2 c0 = vec2(cx, .55), uv0 = vec2(cx, .5) + (s - .5) * k;",
    "  vec2 u = uv0;",
    "  for (int i = 0; i < 4; i++) {",                                                                                    // the camera: dolly forward + slide sideways, by depth
    "    float d = texture2D(uDepth, u).r;",
    "    u = c0 + (uv0 - c0) / (1. + uZoom * (.35 + d)) + uShift * (.45 - d);",
    "  }",
    "  u = clamp(u, .001, .999);",
    "  vec3 base = texture2D(uColor, u).rgb; float l0 = lum(base);",
    "  float dd = texture2D(uDepth, u).r;",
    "  float fireM = uFire * smoothstep(.12, .45, base.r - base.b) * smoothstep(.35, .75, base.r);",                         // flames and embers: orange, bright
    "  float watM = uShim * smoothstep(0., .22, base.b - base.r) * smoothstep(.4, .55, u.y) * (1. - dd * .6);",              // water: blue, low in the frame
    "  vec2 w = vec2(noise(u * vec2(46., 70.) + vec2(0., -uTime * 1.7)), noise(u * vec2(60., 40.) + vec2(uTime * 1.2, 0.))) - .5;",
    "  float ww = noise(vec2(u.y * 90., uTime * .9)) - .5;",
    "  vec2 uf = u + w * (.004 * fireM) + vec2(ww * .0035, 0.) * watM;",
    "  vec3 col = texture2D(uColor, uf).rgb;",
    "  col *= 1. + fireM * .3 * (noise(vec2(uTime * 3.1, u.x * 24. + u.y * 9.)) - .5);",                                      // flicker
    "  col += watM * .06 * smoothstep(.55, .85, noise(u * vec2(30., 160.) + vec2(uTime * .5, 0.))) * vec3(1., .9, .8);",   // glints on the water
    "  if (uTwk > 0.) {",                                                                                                  // highlights twinkle: stars, sparkles, glints on frost
    "    float px1 = 2.5 / 1280.;",
    "    float nb = .25 * (lum(texture2D(uColor, u + vec2(px1, 0.)).rgb) + lum(texture2D(uColor, u - vec2(px1, 0.)).rgb) + lum(texture2D(uColor, u + vec2(0., px1 * 1.78)).rgb) + lum(texture2D(uColor, u - vec2(0., px1 * 1.78)).rgb));",
    "    float sp = smoothstep(.07, .3, l0 - nb);",
    "    vec2 cell = floor(u * vec2(640., 360.));",
    "    float tw = .5 + .5 * sin(uTime * (1.2 + 3.5 * hash(cell)) + 40. * hash(cell.yx));",
    "    col += sp * tw * uTwk * vec3(1., .92, .75) * .55;",
    "  }",
    "  if (uMist > 0.) {",                                                                                                // mist rolls past, far layers slower
    "    vec2 mu = u * vec2(2.4, 1.3) * 3. + vec2(uTime * (.03 + (1. - dd) * .02), uTime * .006);",
    "    float m = smoothstep(.38, .85, fbm(mu));",
    "    col += uMistCol * m * uMist * (1. - dd * .75) * .16 * (.35 + l0);",
    "  }",
    "  col *= 1. + uPulse * .05 * sin(uTime * .8);",                                                                       // the light breathes
    "  col += col * l0 * l0 * uPulse * .14 * sin(uTime * 1.1);",
    "  gl_FragColor = vec4(col, uAlpha * disc);",
    "}"
  ].join("\n");
  var PVS = [
    "attribute vec4 aSeed; uniform float uTime, uKind, uAspect, uPx, uAlpha; uniform vec2 uCam; varying float vA;",
    "void main(){",
    "  float t = uTime, sp = .02 + aSeed.z * .05; vec2 p; float life = 1.;",
    "  if (uKind < .5) { p.x = fract(aSeed.x + sin(t * .5 + aSeed.y * 20.) * .015); p.y = fract(aSeed.y - t * sp * 1.8); life = smoothstep(0., .12, p.y) * smoothstep(1., .55, p.y) * (1. - p.y * .3); }",       // embers rise
    "  else if (uKind < 1.5) { p = vec2(aSeed.x + sin(t * (.15 + sp * 3.) + aSeed.y * 30.) * .06, aSeed.y + cos(t * (.12 + sp * 2.5) + aSeed.x * 25.) * .05); p = fract(p); life = .7; }",                       // fireflies
    "  else if (uKind < 2.5) { p = fract(vec2(aSeed.x + t * sp * .25, aSeed.y - t * sp * .35)); life = smoothstep(0., .1, p.y) * smoothstep(1., .85, p.y); }",                                                    // motes
    "  else { p = vec2(fract(aSeed.x + sin(t * .3 + aSeed.y * 15.) * .02), fract(aSeed.y + t * sp * .9)); life = smoothstep(0., .08, p.y) * smoothstep(1., .9, p.y); }",                                          // snow
    "  vec2 n = vec2(p.x * 2. - 1., 1. - p.y * 2.) - uCam * 2. * (aSeed.w - .45);",
    "  gl_Position = vec4(n, 0., 1.);",
    "  gl_PointSize = (1.2 + aSeed.w * 3.4) * uPx;",
    "  vA = life * (.45 + .55 * sin(t * (1. + aSeed.z * 4.) + aSeed.x * 40.)) * (.35 + aSeed.w * .65) * uAlpha;",
    "}"
  ].join("\n");
  var PFS = "precision mediump float; varying float vA; uniform vec3 uCol; void main(){ float r = length(gl_PointCoord - .5); float a = smoothstep(.5, .0, r); gl_FragColor = vec4(uCol, a * a * vA); }";

  function initGL() {
    if (noGL) return null;
    var cv = document.createElement("canvas"); cv.id = "paint-gl"; cv.setAttribute("aria-hidden", "true");
    var gl = null, v2 = false;
    try {
      var o = { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: "high-performance" };
      gl = cv.getContext("webgl2", o); v2 = !!gl; if (!gl) gl = cv.getContext("webgl", o);
    } catch (e) { gl = null; }
    if (!gl) return null;
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    function prog(vs, fs) { var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); var u = {}; p.u = function (n) { return u[n] || (u[n] = gl.getUniformLocation(p, n)); }; return p; }
    var G = { cv: cv, gl: gl, v2: v2, tex: {}, ratio: Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5), ema: .016, slow: 0, lost: false };
    try {
      G.pf = prog(VS, FS); G.pp = prog(PVS, PFS);
      G.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, G.quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var seeds = new Float32Array(160 * 4), r = 12345; var rnd = function () { r = (r * 1664525 + 1013904223) >>> 0; return r / 4294967296; };
      for (var i = 0; i < seeds.length; i++) seeds[i] = rnd();
      G.seeds = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, G.seeds); gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    } catch (e) { if (window.console) console.warn("cv: live painting unavailable -", e.message || e); return null; }
    G.flat = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, G.flat);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([115, 115, 115, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    cv.addEventListener("webglcontextlost", function (e) { e.preventDefault(); G.lost = true; });
    gl.enable(gl.BLEND);
    return G;
  }

  function uploadTex(G, img, mips) {
    var gl = G.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    var mip = mips && G.v2; if (mip) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function loadImg(src, cb) { var im = new Image(); im.decoding = "async"; im.onload = function () { cb(im); }; im.src = src; }
  function glTex(j) {
    var key = seq[j] && seq[j].key; if (!key || !files[key]) return null;
    var G = GL, t = G.tex[j]; if (t) return t;
    t = G.tex[j] = { c: null, d: G.flat, ok: false };
    loadImg(url(key, small ? "-m" : ""), function (im) { if (G.tex[j] !== t) return; t.c = uploadTex(G, im, true); t.ok = true; });
    if (hasDepth[key]) loadImg(durl(key), function (im) { if (G.tex[j] !== t) return; t.d = uploadTex(G, im, false); });
    return t;
  }
  function glWindow(i) {
    for (var j = i - 1; j <= i + 2; j++) glTex(j);
    Object.keys(GL.tex).forEach(function (k) { if (Math.abs(k - i) > 3) { var t = GL.tex[k]; if (t.c) GL.gl.deleteTexture(t.c); if (t.d && t.d !== GL.flat) GL.gl.deleteTexture(t.d); delete GL.tex[k]; } });
  }

  function glSize() {
    var G = GL, w = Math.max(2, Math.round(window.innerWidth * G.ratio)), h = Math.max(2, Math.round(window.innerHeight * G.ratio));
    if (G.cv.width !== w || G.cv.height !== h) { G.cv.width = w; G.cv.height = h; }
    G.gl.viewport(0, 0, w, h);
  }

  function glLayer(j, alpha, time) {
    var G = GL, gl = G.gl, t = G.tex[j]; if (!t || !t.ok || alpha <= .002) return;
    var key = seq[j].key, fx = FX[key] || {}, d = cur.s - j, dc = clamp(d, -1, 1), rot = rotation(key, d);
    var camX = tx * .03 + Math.sin(time * .21 + j) * .004 + dc * .03 + lead * .035, camY = ty * .02 + Math.cos(time * .17 + j) * .003;
    var zoom = ZOOM * (dc + 1);
    gl.useProgram(G.pf); gl.bindBuffer(gl.ARRAY_BUFFER, G.quad);
    var loc = gl.getAttribLocation(G.pf, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t.c); gl.uniform1i(G.pf.u("uColor"), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, t.d); gl.uniform1i(G.pf.u("uDepth"), 1);
    gl.uniform2f(G.pf.u("uRes"), G.cv.width, G.cv.height); gl.uniform1f(G.pf.u("uIA"), 16 / 9);
    gl.uniform1f(G.pf.u("uFocus"), portrait() ? (FOCUS[key] || 30) / 100 : .5); gl.uniform1f(G.pf.u("uFlip"), FLIP ? 1 : 0);
    gl.uniform1f(G.pf.u("uRot"), rot * Math.PI / 180); gl.uniform1f(G.pf.u("uDisc"), discRadius(rot));
    gl.uniform1f(G.pf.u("uTime"), time % 600); gl.uniform1f(G.pf.u("uAlpha"), alpha); gl.uniform1f(G.pf.u("uZoom"), zoom);
    gl.uniform2f(G.pf.u("uShift"), camX, camY);
    gl.uniform1f(G.pf.u("uFire"), fx.fire || 0); gl.uniform1f(G.pf.u("uShim"), fx.shim || 0); gl.uniform1f(G.pf.u("uTwk"), fx.twk || 0);
    gl.uniform1f(G.pf.u("uMist"), fx.mist || 0); gl.uniform1f(G.pf.u("uPulse"), fx.pulse || 0); var mc = fx.mc || [1, 1, 1]; gl.uniform3f(G.pf.u("uMistCol"), mc[0], mc[1], mc[2]);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (fx.n && !rot) {                                                                                                  // embers, fireflies, motes or snow, drifting in front of the painting
      gl.useProgram(G.pp); gl.bindBuffer(gl.ARRAY_BUFFER, G.seeds);
      var sl = gl.getAttribLocation(G.pp, "aSeed"); gl.enableVertexAttribArray(sl); gl.vertexAttribPointer(sl, 4, gl.FLOAT, false, 0, 0);
      gl.uniform1f(G.pp.u("uTime"), time % 600); gl.uniform1f(G.pp.u("uKind"), fx.k || 0); gl.uniform1f(G.pp.u("uAspect"), G.cv.width / G.cv.height);
      gl.uniform1f(G.pp.u("uPx"), G.ratio * (small ? 1.4 : 1.8)); gl.uniform1f(G.pp.u("uAlpha"), alpha); gl.uniform2f(G.pp.u("uCam"), camX * (FLIP ? -1 : 1), camY);
      gl.uniform3f(G.pp.u("uCol"), fx.col[0], fx.col[1], fx.col[2]);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ZERO, gl.ONE);
      gl.drawArrays(gl.POINTS, 0, Math.min(160, fx.n));
      gl.disableVertexAttribArray(sl);
    }
    gl.disableVertexAttribArray(loc);
  }

  function renderGL(time, dt) {
    var G = GL, gl = G.gl, n = seq.length; if (n < 2) return;
    var s = clamp(cur.s, 0, n - 1), i = Math.min(n - 2, Math.floor(s)), f = s - i;
    // a slow machine paints at a lower resolution instead of stuttering
    if (!frozen && dt > 0) { G.ema = G.ema * .95 + dt * .05; G.slow = G.ema > .034 ? G.slow + 1 : 0; if (G.slow > 90 && G.ratio > .6) { G.ratio = Math.max(.6, G.ratio * .8); G.ema = .02; G.slow = 0; } }
    glSize(); glWindow(i);
    var a = G.tex[i], b = G.tex[i + 1], hasA = !!(a && a.ok), hasB = !!(b && b.ok);
    var sf = sm(clamp((f - .3) / .4, 0, 1));
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    glLayer(i, hasA ? (hasB ? 1 : 1 - sf) : 0, time);
    glLayer(i + 1, hasB ? sf : 0, time);
  }

  /* ═════════════ renderer 2: plain stills (the fallback) ═════════════ */
  function ensure(j) {
    var key = seq[j] && seq[j].key;
    if (!key || !files[key]) return null;
    if (layers[j]) return layers[j];
    var im = new Image();
    im.alt = ""; im.decoding = "async"; im.src = url(key, small ? "-m" : "");
    focus(im, j); box.appendChild(im); layers[j] = im; return im;
  }
  function focus(im, j) { im.style.objectPosition = portrait() ? (FOCUS[seq[j].key] || 30) + "% 50%" : ""; }   // on a phone, centre the crop on the subject, not the middle
  window.addEventListener("resize", function () { Object.keys(layers).forEach(function (k) { focus(layers[k], k); }); });
  function loaded(im) { return !!im && im.complete && im.naturalWidth > 0; }
  function around(i) {
    for (var j = i - 1; j <= i + 2; j++) ensure(j);
    Object.keys(layers).forEach(function (k) { if (Math.abs(k - i) > 3) { box.removeChild(layers[k]); delete layers[k]; } });
  }
  function place(j, opacity, time) {
    var im = layers[j]; if (!im) return;
    var d = cur.s - j, key = seq[j].key, rot = rotation(key, d), sc = 1 + ZOOM * (clamp(d, -1, 1) + 1);
    var x = tx * (1.1 + clamp(d, -1, 1) * .5) + Math.sin(time * .21 + j) * .3, y = ty * .7 + Math.cos(time * .17 + j) * .25;
    im.style.opacity = opacity.toFixed(3);
    im.style.transform = "translate3d(" + x.toFixed(3) + "%," + y.toFixed(3) + "%,0) rotate(" + rot.toFixed(2) + "deg) scale(" + ((FLIP ? -sc : sc).toFixed(4)) + "," + sc.toFixed(4) + ")";
    var r = discRadius(rot);
    im.style.webkitMaskImage = im.style.maskImage = r ? "radial-gradient(circle at 50% 50%,#000 " + (r * 78).toFixed(1) + "vh,transparent " + (r * 100).toFixed(1) + "vh)" : "none";
  }
  function renderDOM(time) {
    var n = seq.length; if (n < 2) return;
    var s = clamp(cur.s, 0, n - 1), i = Math.min(n - 2, Math.floor(s)), f = s - i;
    around(i);
    var a = layers[i], b = layers[i + 1], hasA = loaded(a), hasB = loaded(b);
    var sf = sm(clamp((f - .3) / .4, 0, 1));                       // hold each painting, then crossfade through the middle of the walk
    Object.keys(layers).forEach(function (k) { if (+k !== i && +k !== i + 1) layers[k].style.opacity = "0"; });
    place(i, hasA ? (hasB ? 1 : 1 - sf) : 0, time);                // outgoing stays opaque underneath, so there is never a dip to black
    place(i + 1, hasB ? sf : 0, time);                              // a missing neighbour lets the 3D canvas show through instead
  }

  /* ═════════════ the loop ═════════════ */
  function frame(ms) {
    raf = window.requestAnimationFrame(frame);
    var dt = Math.min(.05, (ms - last) / 1000 || 0); last = ms;
    var t = frozen ? cur.s : target();
    if (!frozen) { lead = clamp(t - cur.s, -1, 1) * .7 + lead * .3; if (Math.abs(t - cur.s) > 4) cur.s = t; else cur.s += (t - cur.s) * (1 - Math.pow(.0009, dt)); }
    tx += (px - tx) * (1 - Math.pow(.02, dt)); ty += (py - ty) * (1 - Math.pow(.02, dt));
    announce(clamp(cur.s, 0, seq.length - 1));
    if (mode === "gl" && GL && GL.lost) { mode = "dom"; Painted.mode = "dom"; GL.cv.style.display = "none"; }
    if (mode === "gl") renderGL(frozen ? 0 : ms / 1000, dt); else renderDOM(frozen ? 0 : ms / 1000);
  }

  /* after the page is idle, fetch the remaining paintings at low priority so scrolling never waits on a download */
  function prefetch() {
    var list = Object.keys(files).map(function (k) { return url(k, small ? "-m" : ""); });
    if (mode === "gl") Object.keys(hasDepth).forEach(function (k) { list.push(durl(k)); });
    var n = 0;
    (function next() {
      if (n >= list.length) return;
      var go = function () { fetch(list[n++], { priority: "low" }).catch(function () {}).then(next); };
      if (window.requestIdleCallback) window.requestIdleCallback(go, { timeout: 4000 }); else window.setTimeout(go, 400);
    })();
  }

  function start() {
    if (running || !Painted.count || root.classList.contains("plain")) return false;
    running = true; last = performance.now(); box.classList.add("on");
    raf = window.requestAnimationFrame(frame); return true;
  }
  function stop() { running = false; window.cancelAnimationFrame(raf); box.classList.remove("on"); }
  document.addEventListener("visibilitychange", function () { if (!running) return; if (document.hidden) window.cancelAnimationFrame(raf); else { last = performance.now(); raf = window.requestAnimationFrame(frame); } });
  if (window.matchMedia("(pointer: fine)").matches) window.addEventListener("pointermove", function (e) { px = (e.clientX / window.innerWidth - .5) * -1.6; py = (e.clientY / window.innerHeight - .5) * -1.0; }, { passive: true });

  fetch(DIR + "frames.json").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (m) {
    files = (m && m.frames) || {}; ((m && m.depth) || []).forEach(function (k) { hasDepth[k] = true; });
    Painted.count = seq.filter(function (s) { return files[s.key]; }).length;
    Painted.complete = Painted.count === seq.length && seq.length > 1;
    // the live camera needs a depth map for every painted stop; otherwise the stills do
    if (Painted.count && seq.every(function (s) { return !files[s.key] || hasDepth[s.key]; })) { GL = initGL(); if (GL) { box.appendChild(GL.cv); mode = "gl"; window.addEventListener("resize", function () { if (GL) glSize(); }); } }
    Painted.mode = mode;
    cur.s = frozen ? parseFloat(frozen[1]) : target();
    if (Painted.count && !frozen) window.setTimeout(prefetch, 1500);
  }).catch(function () { files = {}; }).then(done);
})();

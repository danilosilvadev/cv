/* The Divine Comedy as a scroll-driven 3D walk (Three.js): the dark wood and the gate, the pit of Inferno, the turn at the bottom,
 * the mountain of Purgatorio, the spheres of Paradiso and the rose of the Empyrean. One world is visible at a time.
 * Each section of the page names a camera key with data-cam; the camera moves between keys (walk, orbit, zoom, spin) as you scroll.
 * Deterministic on purpose: every world is built from fixed seeds, so it is the same every time.
 * Open with #s=<float> to freeze one frame between camera keys (used for stills). */
(function () {
  "use strict";
  var root = document.documentElement;
  var cv = document.getElementById("gl"), fadeEl = document.getElementById("fade");
  if (!cv || !window.THREE) { root.classList.add("plain"); return; }
  var THREE = window.THREE;

  var frozen = /s=([\d.]+)/.exec(location.hash);
  if (/bare/.test(location.hash)) root.classList.add("bare");
  var small = window.matchMedia("(max-width: 760px)").matches || window.matchMedia("(pointer: coarse)").matches;

  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, preserveDrawingBuffer: !!frozen, powerPreference: "high-performance" }); }
  catch (e) { root.classList.add("plain"); return; }
  var ratio = Math.min(window.devicePixelRatio || 1, small ? 1 : 1.25);
  renderer.setPixelRatio(ratio);
  renderer.autoClear = true;
  var exposure = 1.0;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, 1, 0.3, 4000);

  /* ───────────── helpers ───────────── */
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(x, y, z) { var s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
  function sm(t) { return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
  function vn(x, y, z) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
    return lerp(lerp(lerp(hash(xi, yi, zi), hash(xi + 1, yi, zi), xf), lerp(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), xf), yf),
                lerp(lerp(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), xf), lerp(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), xf), yf), zf);
  }
  function fbm(x, y, z) { return vn(x, y, z) * .5 + vn(x * 2.1, y * 2.1, z * 2.1) * .27 + vn(x * 4.3, y * 4.3, z * 4.3) * .15 + vn(x * 8.7, y * 8.7, z * 8.7) * .08; }
  function glowTex(inner, mid) {
    var c = document.createElement("canvas"); c.width = c.height = 128; var g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, inner); gr.addColorStop(.3, mid); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  }
  function glowSprite(size, inner, mid, opacity) {
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(inner, mid), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: opacity == null ? 1 : opacity, fog: false, toneMapped: false }));
    s.scale.set(size, size, 1); return s;
  }
  function figure(h, lantern) {
    var g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: 0x0b0708, roughness: .9, emissive: 0x1a0d09, emissiveIntensity: .5 });
    var cloak = new THREE.Mesh(new THREE.ConeGeometry(.95, 2.7, 12), mat); cloak.position.y = 1.35; g.add(cloak);
    var head = new THREE.Mesh(new THREE.SphereGeometry(.4, 12, 10), mat); head.position.y = 2.95; g.add(head);
    if (lantern) {
      var l = new THREE.Mesh(new THREE.SphereGeometry(.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd9a0, fog: false, toneMapped: false })); l.position.set(.95, 1.7, 0); g.add(l);
      var st = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 3.4, 6), mat); st.position.set(.95, 1.7, 0); g.add(st);
      var pl = new THREE.PointLight(0xffb060, 1.6, 16, 1.6); pl.position.set(.95, 1.9, 0); g.add(pl);
    }
    g.scale.setScalar(h); return g;
  }
  function skyDome(horizon, top, span) {
    var R = 1800, g = new THREE.SphereGeometry(R, 32, 18), p = g.attributes.position, c = new Float32Array(p.count * 3);
    for (var i = 0; i < p.count; i++) { var t = clamp(p.getY(i) / R / span, 0, 1); t = sm(t); for (var m = 0; m < 3; m++) c[i * 3 + m] = lerp(horizon[m], top[m], t); }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    var d = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false })); d.renderOrder = -10; return d;
  }
  function starField(n, R, size, opacity, seed, upper) {
    var r = mulberry(seed), sp = new Float32Array(n * 3);
    for (var s = 0; s < n; s++) { var th = r() * 6.283, ph = Math.acos(upper ? 1 - r() * 1.1 : 1 - r() * 2); sp[s * 3] = R * Math.sin(ph) * Math.cos(th); sp[s * 3 + 1] = R * Math.cos(ph) + (upper ? 60 : 0); sp[s * 3 + 2] = R * Math.sin(ph) * Math.sin(th); }
    var g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdde6ff, size: size, sizeAttenuation: false, transparent: true, opacity: opacity, fog: false }));
  }
  function textTex(txt, w, h, font, color, glow) {
    var c = document.createElement("canvas"); c.width = w; c.height = h; var g = c.getContext("2d");
    g.clearRect(0, 0, w, h); g.font = font; g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = glow; g.shadowBlur = 18; g.fillStyle = color; g.fillText(txt, w / 2, h / 2); g.fillText(txt, w / 2, h / 2);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }

  /* ───────────── the loss landscape: one surface, and the gradient descent that walks down it ───────────── */
  var DESC = (function () {
    var GX = 28, GZ = -150;                                                                   // the global minimum
    function Hs(x, z) {                                                                       // the macro loss surface: gradient descent runs on this
      var h = Math.max(-40, Math.min(90, z + 150)) * .12;
      h -= 54 * Math.exp(-((x - GX) * (x - GX) + (z - GZ) * (z - GZ)) / (2 * 40 * 40));
      h -= 15 * Math.exp(-((x + 118) * (x + 118) + (z + 20) * (z + 20)) / (2 * 22 * 22));
      h -= 17 * Math.exp(-((x - 120) * (x - 120) + z * z) / (2 * 24 * 24));
      h -= 18 * Math.exp(-((x + 80) * (x + 80) + (z + 150) * (z + 150)) / (2 * 18 * 18));
      h += 8 * Math.sin(x * .03 + z * .02) * Math.exp(-Math.pow((z + 20) / 100, 2));
      var d = Math.sqrt(x * x + (z + 60) * (z + 60)); return h + Math.max(0, d - 150) * .08;
    }
    function H(x, z) { return Hs(x, z) + (fbm(x * .02 + 3, 0, z * .02) - .5) * 12 + (fbm(x * .06, 7, z * .06) - .5) * 3; }   // what you see: the surface plus roughness
    function descend(x, z) {                                                                  // real gradient descent with momentum
      var pts = [[x, z]], vx = 0, vz = 0, e = .6;
      for (var i = 0; i < 1500; i++) {
        var gx = (Hs(x + e, z) - Hs(x - e, z)) / (2 * e), gz = (Hs(x, z + e) - Hs(x, z - e)) / (2 * e);
        vx = .9 * vx - 3.2 * gx; vz = .9 * vz - 3.2 * gz; x += vx; z += vz; pts.push([x, z]);
        if (i > 60 && Math.hypot(gx, gz) < .015 && Math.hypot(vx, vz) < .03) break;
      }
      return pts;
    }
    function resample(raw, n) {                                                               // evenly spaced along the path, lifted onto the visible surface
      var cum = [0], i; for (i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
      var out = [], len = cum[cum.length - 1], j = 0;
      for (i = 0; i < n; i++) {
        var d = len * i / (n - 1); while (j < cum.length - 2 && cum[j + 1] < d) j++;
        var f = (d - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]), x = lerp(raw[j][0], raw[j + 1][0], f), z = lerp(raw[j][1], raw[j + 1][1], f);
        out.push(new THREE.Vector3(x, H(x, z) + .9, z));
      }
      return { pts: out, len: len };
    }
    var main = resample(descend(-75, 85), 700), runs = [[-20, 85], [30, 80], [75, 70], [-110, 65]].map(function (s) { return resample(descend(s[0], s[1]), 360).pts; });
    function at(t) { var f = clamp(t, 0, 1) * (main.pts.length - 1), i = Math.min(main.pts.length - 2, Math.floor(f)); return main.pts[i].clone().lerp(main.pts[i + 1], f - i); }
    return { H: H, main: main.pts, len: main.len, runs: runs, at: at, min: new THREE.Vector3(GX, H(GX, GZ), GZ) };
  })();

  /* ───────────── world 0 · the data: a rain of tokens, a path of light, a gate of input ───────────── */
  function buildData() {
    var g = new THREE.Group(), r = mulberry(1001), HGT = 70, K = 14;
    // the floor: a faint lattice that fades with distance, and a lane of amber light down the middle
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 } },
      vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: "precision highp float; varying vec3 vW; uniform float uTime;\n" +
        "float ln(float v, float a, float b){ return 1. - smoothstep(a, b, abs(fract(v - .5) - .5)); }\n" +
        "void main(){ float d = length(vW.xz - cameraPosition.xz); float fade = exp(-d * .011);\n" +
        "  vec2 p = vW.xz / 7.; float grid = max(ln(p.x, .02, .06), ln(p.y, .02, .06));\n" +
        "  float lane = exp(-pow(vW.x / 3.4, 2.)); float pulse = .5 + .5 * sin(vW.z * .28 - uTime * 3.2);\n" +
        "  vec3 c = vec3(.08, .5, .55) * grid * .55 + vec3(1., .62, .2) * lane * (grid * .9 + .1 + pulse * .22);\n" +
        "  gl_FragColor = vec4(c * fade, 1.); }"
    }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = .02; g.add(floor);

    // the rain: columns of glyph-like tokens, drawn entirely on the GPU
    var NC = small ? 520 : 1100, NP = NC * K, pos = new Float32Array(NP * 3), seed = new Float32Array(NP * 4);
    for (var c = 0; c < NC; c++) {
      var x, z; do { x = (r() - .5) * 380; z = 50 - r() * 270; } while (Math.abs(x) < 5 && r() < .9);
      var sp = 7 + r() * 16, ph = r(), hue = r();
      for (var k = 0; k < K; k++) { var i = c * K + k; pos[i * 3] = x; pos[i * 3 + 2] = z; seed[i * 4] = sp; seed[i * 4 + 1] = ph; seed[i * 4 + 2] = k; seed[i * 4 + 3] = hue; }
    }
    var rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); rg.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
    function rainMat(sign, alpha) {
      return new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uH: { value: HGT }, uPx: { value: ratio * (small ? 1.25 : 1) }, uAlpha: { value: alpha }, uSign: { value: sign } },
        vertexShader: "attribute vec4 aSeed; uniform float uTime, uH, uPx, uAlpha, uSign; varying vec3 vCol; varying float vA, vG;\n" +
          "void main(){ float y = mod(aSeed.y * uH - uTime * aSeed.x + aSeed.z * 2.1, uH); vec3 p = position; p.y = y * uSign;\n" +
          "  vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; float tail = 1. - aSeed.z / " + K + ".;\n" +
          "  gl_PointSize = clamp(uPx * (.65 + tail * .6) * 430. / -mv.z, 1., 46.);\n" +
          "  vec3 c = mix(vec3(.10, .95, .85), vec3(1., .66, .22), step(.72, aSeed.w)); c = mix(c, vec3(1.), pow(tail, 6.) * .9);\n" +
          "  float fy = smoothstep(0., 6., y) * smoothstep(uH, uH - 14., y);\n" +
          "  vCol = c; vA = uAlpha * (.15 + .85 * tail * tail) * fy; vG = aSeed.w * 97. + aSeed.z; }",
        fragmentShader: "precision highp float; varying vec3 vCol; varying float vA, vG; uniform float uTime;\n" +
          "float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\n" +
          "void main(){ vec2 q = gl_PointCoord; q.y = 1. - q.y; vec2 cell = floor(vec2(q.x * 3., q.y * 5.)); float t = floor(uTime * 3. + vG);\n" +
          "  float on = step(.48, h(cell + vG * 3.1 + t * 1.7)); vec2 f = fract(vec2(q.x * 3., q.y * 5.));\n" +
          "  float box = step(.18, f.x) * step(f.x, .82) * step(.2, f.y) * step(f.y, .8);\n" +
          "  float halo = smoothstep(.5, 0., length(gl_PointCoord - .5)) * .35;\n" +
          "  gl_FragColor = vec4(vCol, (on * box + halo) * vA); }"
      });
    }
    var rain = new THREE.Points(rg, rainMat(1, 1)), mirror = new THREE.Points(rg, rainMat(-1, .2)); rain.frustumCulled = mirror.frustumCulled = false; g.add(rain); g.add(mirror);

    // the gate: a wall of light where the stream enters, framed by two pillars and a beam
    var gateMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
      fragmentShader: "precision highp float; varying vec2 vUv; uniform float uTime;\n" +
        "void main(){ vec2 p = vUv - .5; float core = exp(-pow(p.x * 10., 2.)); float body = exp(-pow(p.x * 3., 2.)) * .38; float scan = .5 + .5 * sin(vUv.y * 70. - uTime * 5.);\n" +
        "  float v = smoothstep(0., .06, vUv.y) * smoothstep(1., .65, vUv.y); vec3 c = mix(vec3(.1, .9, .85), vec3(1., .92, .75), core) * (core * 1.5 + body * (.55 + .45 * scan)) * v;\n" +
        "  gl_FragColor = vec4(c, 1.); }"
    });
    var gate = new THREE.Group();
    gate.add(new THREE.Mesh(new THREE.PlaneGeometry(26, 48), gateMat));
    var beamMat = new THREE.MeshBasicMaterial({ color: 0xffb35a, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    [[-13.5, 24, 1.1, 48], [13.5, 24, 1.1, 48], [0, 48.4, 28.2, 1.1]].forEach(function (b) { var m = new THREE.Mesh(new THREE.PlaneGeometry(b[2], b[3]), beamMat); m.position.set(b[0], b[1], .2); gate.add(m); });
    gate.position.set(0, 0, -140); g.add(gate);
    var gl = new THREE.PointLight(0x58f0d8, 2.4, 90, 1.3); gl.position.set(0, 10, -128); g.add(gl);

    g.add(new THREE.AmbientLight(0x2a3a58, .9));
    g.add(skyDome([.015, .03, .05], [.003, .004, .012], .5));
    g.add(starField(small ? 500 : 1100, 900, 1.4, .5, 7, true));
    var trav = figure(.64, true); g.add(trav);
    return {
      group: g, bg: 0x01020a, fog: null, exposure: 1.3,
      update: function (dt, time, cam) {
        floor.material.uniforms.uTime.value = time; rain.material.uniforms.uTime.value = mirror.material.uniforms.uTime.value = time; gateMat.uniforms.uTime.value = time;
        var z = cam.position.z - 14; trav.position.set(Math.sin(time * .5) * .15, Math.abs(Math.sin(cam.userData.walk * 1.2)) * .1, z);
      }
    };
  }

  /* ───────────── world 1 · the descent: a glowing loss landscape, and the run that walks down it ───────────── */
  function buildDescent() {
    var g = new THREE.Group(), r = mulberry(0xD4A7E), X0 = -230, X1 = 230, Z0 = -310, Z1 = 130, NX = small ? 210 : 340, NZ = small ? 200 : 320;
    var tg = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, NX, NZ); tg.rotateX(-Math.PI / 2); tg.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
    var tp = tg.attributes.position, i;
    for (i = 0; i < tp.count; i++) tp.setY(i, DESC.H(tp.getX(i), tp.getZ(i)));
    var slope = new Float32Array(tp.count), W = NX + 1, cell = (X1 - X0) / NX;
    for (i = 0; i < tp.count; i++) {
      var cx = i % W, cz = (i / W) | 0, xa = tp.getY(cz * W + Math.max(0, cx - 1)), xb = tp.getY(cz * W + Math.min(NX, cx + 1)), za = tp.getY(Math.max(0, cz - 1) * W + cx), zb = tp.getY(Math.min(NZ, cz + 1) * W + cx);
      slope[i] = Math.hypot(xb - xa, zb - za) / (2 * cell);
    }
    tg.setAttribute("aSlope", new THREE.BufferAttribute(slope, 1));
    var terrain = new THREE.Mesh(tg, new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uMin: { value: DESC.min } },
      vertexShader: "attribute float aSlope; varying float vH, vS; varying vec3 vW; void main(){ vH = position.y; vS = aSlope; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: "precision highp float; varying float vH, vS; varying vec3 vW; uniform float uTime; uniform vec3 uMin;\n" +
        "void main(){ float step1 = 3.2; float a = abs(fract(vH / step1) - .5); float w = clamp(.17 * vS / step1, .018, .22);\n" +
        "  float line = 1. - smoothstep(w * .5, w, a); float a5 = abs(fract(vH / (step1 * 5.)) - .5); float idx = 1. - smoothstep(w * .12, w * .26, a5);\n" +
        "  float t = clamp((vH + 54.) / 82., 0., 1.); vec3 lo = vec3(1., .72, .28), mi = vec3(.10, .85, .80), hi = vec3(.50, .32, .98);\n" +
        "  vec3 c = t < .5 ? mix(lo, mi, t * 2.) : mix(mi, hi, (t - .5) * 2.); float flow = .8 + .4 * sin(vH * .9 + uTime * 1.6);\n" +
        "  float dm = length(vW.xz - uMin.xz); float basin = exp(-dm * dm / (2. * 28. * 28.));\n" +
        "  vec3 base = vec3(.010, .012, .035) + vec3(.05, .025, .09) * (1. - t) * .35 + vec3(1., .55, .15) * basin * .10;\n" +
        "  vec3 col = base + c * line * flow * (.62 + idx * .95); float d = length(vW - cameraPosition); col = mix(vec3(.004, .005, .016), col, exp(-d * .0042));\n" +
        "  gl_FragColor = vec4(col, 1.); }"
    }));
    g.add(terrain);

    // the runs: the main run is the real gradient descent; the others fell into local minima
    function trail(pts, rad, color, opacity, blend) {
      var m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, rad, 6, false), new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity, toneMapped: false, depthWrite: false, blending: blend ? THREE.AdditiveBlending : THREE.NormalBlending }));
      g.add(m); return m;
    }
    trail(DESC.main, .5, 0xffd08a, 1, false); trail(DESC.main, 1.7, 0xff9a3a, .2, true);
    DESC.runs.forEach(function (p) { trail(p, .24, 0x62e8d6, .6, false); });
    var comet = []; for (i = 0; i < 7; i++) { var cs = glowSprite(i ? 7 - i * .7 : 11, "rgba(255,245,215,1)", "rgba(255,170,70,.55)", i ? .55 - i * .07 : 1); g.add(cs); comet.push(cs); }

    // the minimum: a still core of light with rings that never stop
    var core = new THREE.Group(), m0 = DESC.min; core.position.set(m0.x, m0.y + 6, m0.z);
    var star = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4, 1), new THREE.MeshBasicMaterial({ color: 0xfff1cf, toneMapped: false })); core.add(star);
    var ringMat = new THREE.MeshBasicMaterial({ color: 0xffc06a, transparent: true, opacity: .75, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false }), rings = [];
    [6, 10.5, 16].forEach(function (rr, k) { var rg = new THREE.Mesh(new THREE.TorusGeometry(rr, .12, 6, 120), ringMat); rg.rotation.x = Math.PI / 2 + k * .25; core.add(rg); rings.push(rg); });
    core.add(glowSprite(46, "rgba(255,240,205,.95)", "rgba(255,170,70,.30)", 1)); g.add(core);
    var cl = new THREE.PointLight(0xffa850, 2.6, 80, 1.3); cl.position.set(m0.x, m0.y + 10, m0.z); g.add(cl);

    // data motes drifting above the surface
    var NM = small ? 700 : 1600, mp = new Float32Array(NM * 3);
    for (i = 0; i < NM; i++) { var mx = X0 + r() * (X1 - X0), mz = Z0 + r() * (Z1 - Z0); mp[i * 3] = mx; mp[i * 3 + 1] = DESC.H(mx, mz) + 2 + r() * 34; mp[i * 3 + 2] = mz; }
    var mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.BufferAttribute(mp, 3));
    var motes = new THREE.Points(mg, new THREE.PointsMaterial({ color: 0x7fe9ff, size: 1.1, map: glowTex("rgba(255,255,255,1)", "rgba(255,255,255,.4)"), transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    g.add(motes);

    g.add(new THREE.AmbientLight(0x2a3560, .9));
    g.add(skyDome([.03, .02, .06], [.004, .004, .014], .5));
    g.add(starField(small ? 600 : 1300, 900, 1.5, .55, 424242, true));
    var trav = figure(2.5, true); g.add(trav);
    var T_KEYS = [["inf1", 0], ["inf2", .26], ["inf3", .52], ["inf4", .8], ["turn", .96]], kidx = null;
    return {
      group: g, bg: 0x010209, fog: null, exposure: 1.25,
      update: function (dt, time, cam, still) {
        terrain.material.uniforms.uTime.value = time;
        var tc = (time * .028) % 1; for (var c = 0; c < comet.length; c++) { var q = DESC.at(tc - c * .006); comet[c].position.set(q.x, q.y + .6, q.z); }
        star.rotation.y = time * .5; star.rotation.x = time * .3; rings.forEach(function (rg, k) { rg.rotation.z = time * (.3 + k * .18) * (k % 2 ? -1 : 1); });
        motes.rotation.y = Math.sin(time * .05) * .02; motes.position.y = Math.sin(time * .4) * .6;
        if (!kidx) kidx = T_KEYS.map(function (kk) { for (var s = 0; s < seq.length; s++) if (seq[s].el.getAttribute("data-cam") === kk[0]) return s; return 0; });
        var s = cam.userData.s || 0, tf = T_KEYS[0][1]; for (var kk = 0; kk < T_KEYS.length - 1; kk++) { if (s >= kidx[kk]) tf = lerp(T_KEYS[kk][1], T_KEYS[kk + 1][1], clamp((s - kidx[kk]) / Math.max(.001, kidx[kk + 1] - kidx[kk]), 0, 1)); }
        var fp = DESC.at(tf + .045), fq = DESC.at(tf + .05 + .01); trav.position.copy(fp); trav.position.y += Math.abs(Math.sin((cam.userData.walk || 0) * 1.2)) * .15; trav.rotation.y = Math.atan2(fq.x - fp.x, fq.z - fp.z);
      }
    };
  }

  /* ───────────── world 2 · Purgatorio: the mountain at dawn ───────────── */
  var MT = 7, MSTEP = 14, MBASE = 120, MINSET = 4, MSHELF = 8;
  function buildPurgatorio() {
    var g = new THREE.Group(), r = mulberry(2024), pts = [];
    pts.push(new THREE.Vector2(MBASE + 110, -4)); pts.push(new THREE.Vector2(MBASE + 60, -2.4)); pts.push(new THREE.Vector2(MBASE + 34, .6)); pts.push(new THREE.Vector2(MBASE + 12, 1.6)); pts.push(new THREE.Vector2(MBASE, 2));
    for (var i = 0; i < MT; i++) {
      var R = MBASE - i * (MSHELF + MINSET), y = 2 + i * MSTEP;
      for (var k = 0; k < 8; k++) pts.push(new THREE.Vector2(R - MINSET * k / 8, y + MSTEP * k / 8));
      for (var k2 = 0; k2 < 8; k2++) pts.push(new THREE.Vector2(R - MINSET - MSHELF * k2 / 8, y + MSTEP));
    }
    var top = 2 + MT * MSTEP, R7 = MBASE - MT * (MSHELF + MINSET);
    pts.push(new THREE.Vector2(R7, top)); for (var q = 1; q <= 6; q++) pts.push(new THREE.Vector2(R7 * (1 - q / 6) + .01, top + .4 * q));
    var geo = new THREE.LatheGeometry(pts, small ? 140 : 260), pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    for (var v = 0; v < pos.count; v++) {
      var x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v), rr = Math.sqrt(x * x + z * z) || 1;
      var n = fbm(x * .06, y * .08, z * .06), n2 = fbm(x * .4 + 3, y * .4, z * .4);
      if (y > 1.2 || rr < MBASE + 20) { var d = (n - .5) * 2 * (y > 1.4 ? 4.5 : 1.5); pos.setX(v, x + (x / rr) * d); pos.setZ(v, z + (z / rr) * d); }
      var h = clamp((y - 2) / (top - 2), 0, 1), shade = .7 + .6 * n2, sea = y < 1.2 && rr > MBASE + 60;
      var cs = [.30, .26, .22], cg = [.15, .29, .09], cb = [.42, .36, .27], c;
      if (sea) c = [.07, .18, .26]; else if (y < 2.5) c = [cb[0] * shade, cb[1] * shade, cb[2] * shade];
      else { var t = clamp(h * 1.5 - .1, 0, 1); c = [lerp(cs[0], cg[0], t) * shade, lerp(cs[1], cg[1], t) * shade, lerp(cs[2], cg[2], t) * shade]; }
      col[v * 3] = c[0]; col[v * 3 + 1] = c[1]; col[v * 3 + 2] = c[2];
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .95, side: THREE.DoubleSide })));
    var sea = new THREE.PlaneGeometry(2800, 2800, 70, 70); sea.rotateX(-Math.PI / 2);
    var sp = sea.attributes.position; for (var s = 0; s < sp.count; s++) { var sx = sp.getX(s), sz = sp.getZ(s); sp.setY(s, -1.2 + (Math.sin(sx * .05) * Math.cos(sz * .043) + Math.sin((sx + sz) * .11) * .4) * .55); }
    g.add(new THREE.Mesh(sea, new THREE.MeshStandardMaterial({ color: 0x173d57, roughness: .4, metalness: .1, flatShading: true })));

    // the garden on the summit: small trees, a warm light
    var NG = small ? 80 : 160, gtr = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), NG), d2 = new THREE.Object3D(), cc = new THREE.Color();
    for (var t = 0; t < NG; t++) { var a = r() * 6.283, rad = Math.sqrt(r()) * (R7 - 4), th = 3 + r() * 4; d2.position.set(Math.cos(a) * rad, top + th / 2 + .3, Math.sin(a) * rad); d2.scale.set(1.5 + r(), th, 1.5 + r()); d2.rotation.set(0, r() * 6, 0); d2.updateMatrix(); gtr.setMatrixAt(t, d2.matrix); gtr.setColorAt(t, cc.setRGB(.2 + r() * .15, .42 + r() * .2, .16 + r() * .08)); }
    g.add(gtr);
    var gl = new THREE.PointLight(0xffd9a0, 1.8, 90, 1.3); gl.position.set(0, top + 12, 0); g.add(gl);

    // the dawn sky
    g.add(skyDome([.96, .66, .52], [.07, .10, .22], .42));
    g.add(starField(small ? 500 : 900, 1500, 1.4, .5, 99, true));
    var sunDir = new THREE.Vector3(Math.cos(.5 + Math.PI), .018, Math.sin(.5 + Math.PI)).normalize();
    var sun = glowSprite(520, "rgba(255,244,214,1)", "rgba(255,190,120,.45)", 1); sun.position.copy(sunDir.clone().multiplyScalar(1500)); g.add(sun);
    var venus = glowSprite(26, "rgba(255,255,255,1)", "rgba(255,255,255,.35)", 1); venus.position.set(Math.cos(2.4) * 1400, 300, Math.sin(2.4) * 1400); g.add(venus);
    g.add(new THREE.HemisphereLight(0xffd2b8, 0x2a3a4a, .5));
    var sl = new THREE.DirectionalLight(0xffc48a, .8); sl.position.copy(sunDir.clone().multiplyScalar(300)); g.add(sl);
    var fig = figure(5, true), fig2 = figure(4.4, false); fig.position.set(Math.cos(.5) * (MBASE + 24), 1.1, Math.sin(.5) * (MBASE + 24)); fig2.position.set(Math.cos(.5 + .04) * (MBASE + 24), 1.1, Math.sin(.5 + .04) * (MBASE + 24)); g.add(fig); g.add(fig2);
    return { group: g, bg: 0xf0b896, fog: [0xd7a595, .0011], exposure: 1.05, update: function () {} };
  }

  /* ───────────── world 3 · Paradiso: the spheres ───────────── */
  var PR0 = 14, PRSTEP = 9;
  function buildParadiso() {
    var g = new THREE.Group(), r = mulberry(3033);
    g.add(starField(small ? 1500 : 3200, 900, 1.8, .85, 5, false));
    var earth = new THREE.Mesh(new THREE.SphereGeometry(3.2, 24, 16), new THREE.MeshStandardMaterial({ color: 0x2f6f9f, emissive: 0x0b2236, flatShading: true, roughness: .8 })); g.add(earth);
    var cols = [0xd9d9e0, 0xb59a7c, 0xf0d9a0, 0xffd766, 0xd9674b, 0xe8c58a, 0xc7b78f, 0xaecbe8, 0xfff2cf], pivots = [];
    for (var i = 0; i < 9; i++) {
      var R = PR0 + i * PRSTEP, pv = new THREE.Group();
      var ring = new THREE.Mesh(new THREE.TorusGeometry(R, .07, 6, 260), new THREE.MeshBasicMaterial({ color: 0xbcd0ff, transparent: true, opacity: .32, toneMapped: false })); ring.rotation.x = Math.PI / 2; g.add(ring);
      var isSun = i === 3, pr = isSun ? 4.4 : (i < 8 ? 1.3 + (i % 3) * .35 : .9);
      var pl = new THREE.Mesh(new THREE.SphereGeometry(pr, 20, 14), isSun ? new THREE.MeshBasicMaterial({ color: 0xffe9a8, toneMapped: false }) : new THREE.MeshStandardMaterial({ color: cols[i], emissive: cols[i], emissiveIntensity: .35, flatShading: true, roughness: .7 }));
      var a = r() * 6.283; pl.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); pv.add(pl);
      var hl = glowSprite(isSun ? 70 : pr * 7, "rgba(255,240,210,.9)", "rgba(255,220,150,.25)", isSun ? 1 : .55); hl.position.copy(pl.position); pv.add(hl);
      if (isSun) { var sl = new THREE.PointLight(0xffe0a0, 2.2, 400, 1); sl.position.copy(pl.position); pv.add(sl); }
      pv.userData.speed = .14 / (i + 1.5); pivots.push(pv); g.add(pv);
    }
    g.add(new THREE.AmbientLight(0x4a5a88, .55));
    var dust = starField(small ? 300 : 700, 60, 2.2, .5, 11, false); dust.material.color.set(0xffe9c0); dust.material.fog = false; g.add(dust);
    return { group: g, bg: 0x02030a, fog: null, exposure: 1.1, update: function (dt, time) { for (var i = 0; i < pivots.length; i++) pivots[i].rotation.y = time * pivots[i].userData.speed; earth.rotation.y = time * .1; } };
  }

  /* ───────────── world 4 · the Empyrean: the rose ───────────── */
  function buildEmpyrean() {
    var g = new THREE.Group(), r = mulberry(4044), layers = 9, per = [], total = 0;
    for (var k = 0; k < layers; k++) { per[k] = 22 + k * 7; total += per[k]; }
    var petals = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }), total);
    var d = new THREE.Object3D(), col = new THREE.Color(), idx = 0;
    for (var l = 0; l < layers; l++) {
      var R = 9 + l * 6.2, y = l * 2.1 + Math.sin(l) * .2;
      for (var p = 0; p < per[l]; p++) {
        var a = (p / per[l]) * 6.283 + l * .21;
        d.position.set(Math.cos(a) * R, y, Math.sin(a) * R); d.rotation.set(-Math.PI / 2 + .34, -a - Math.PI / 2, 0, "YXZ");
        d.scale.set(1.05 + l * .05, 3.1 + l * .22, 1); d.updateMatrix(); petals.setMatrixAt(idx, d.matrix);
        var warm = clamp(l / layers, 0, 1); petals.setColorAt(idx, col.setRGB(1 - .05 * warm, .93 - .18 * warm + r() * .04, .78 - .32 * warm + r() * .05)); idx++;
      }
    }
    g.add(petals);
    var core = glowSprite(120, "rgba(255,255,255,1)", "rgba(255,236,190,.5)", 1); core.position.y = 6; g.add(core);
    var core2 = glowSprite(36, "rgba(255,255,255,1)", "rgba(255,255,255,.9)", 1); core2.position.y = 6; g.add(core2);
    var NA = small ? 300 : 800, ap = new Float32Array(NA * 3), ar = new Float32Array(NA), aa = new Float32Array(NA);
    for (var i = 0; i < NA; i++) { ar[i] = 6 + r() * 60; aa[i] = r() * 6.283; ap[i * 3] = Math.cos(aa[i]) * ar[i]; ap[i * 3 + 1] = 4 + r() * 30; ap[i * 3 + 2] = Math.sin(aa[i]) * ar[i]; }
    var ag = new THREE.BufferGeometry(); ag.setAttribute("position", new THREE.BufferAttribute(ap, 3));
    var angels = new THREE.Points(ag, new THREE.PointsMaterial({ color: 0xfff1c8, size: 1.0, map: glowTex("rgba(255,255,255,1)", "rgba(255,255,255,.4)"), transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    g.add(angels); g.add(starField(small ? 800 : 1800, 900, 1.6, .8, 17, false));
    petals.position.x = angels.position.x = core.position.x = core2.position.x = small ? 0 : 30;
    return { group: g, bg: 0x06030c, fog: null, exposure: 1.0, update: function (dt, time) { angels.rotation.y = time * .06; petals.rotation.y = time * .008; } };
  }


  /* ───────────── the painted look ─────────────
   * The scene is rendered flat, tone-mapped, then run through a generalized Kuwahara filter (oil-paint strokes),
   * lit by a procedural brush texture (impasto), and graded: near-black shadows, warm lights, cool accents. */
  function brushTexture() {
    var S = 1024, c = document.createElement("canvas"); c.width = c.height = S; var g = c.getContext("2d"), r = mulberry(8080);
    g.fillStyle = "#808080"; g.fillRect(0, 0, S, S); g.lineCap = "round";
    function stroke(x, y, ang, len, w, v) {
      for (var b = 0; b < 7; b++) {
        var off = (b - 3) * w / 7, ox = -Math.sin(ang) * off, oy = Math.cos(ang) * off, gv = Math.round(v + (r() - .5) * 38);
        g.strokeStyle = "rgba(" + gv + "," + gv + "," + gv + "," + (.10 + r() * .14) + ")"; g.lineWidth = w / 5 + r() * 2.5;
        g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(ang) * len, y + oy + Math.sin(ang) * len); g.stroke();
      }
    }
    for (var i = 0; i < 1500; i++) {
      var x = r() * S, y = r() * S, ang = .55 + Math.sin(x * .006) * .5 + Math.cos(y * .005) * .5 + (r() - .5) * .5, len = 60 + r() * 160, w = 14 + r() * 22, v = 90 + r() * 90;
      for (var ox = -1; ox <= 1; ox++) for (var oy = -1; oy <= 1; oy++) stroke(x + ox * S, y + oy * S, ang, len, w, v);   // wrapped, so the tile has no seams
    }
    var out = document.createElement("canvas"); out.width = out.height = S; var og = out.getContext("2d");
    if ("filter" in og) og.filter = "blur(1.6px)"; og.drawImage(c, 0, 0);
    var tex = new THREE.CanvasTexture(out); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.minFilter = THREE.LinearFilter; return tex;
  }
  var QUAD_VS = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }";
  var matTone = new THREE.ShaderMaterial({
    uniforms: { tScene: { value: null }, exposure: { value: 1 } }, vertexShader: QUAD_VS, depthTest: false, depthWrite: false,
    fragmentShader: "precision highp float; uniform sampler2D tScene; uniform float exposure; varying vec2 vUv;\n" +
      "vec3 aces(vec3 x){ x *= exposure * .74; return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0., 1.); }\n" +
      "void main(){ vec3 c = aces(texture2D(tScene, vUv).rgb); gl_FragColor = vec4(pow(c, vec3(1./2.2)), 1.); }"
  });
  var KR = small ? 3 : 5;
  var matPaint = new THREE.ShaderMaterial({
    uniforms: { tScene: { value: null }, tPaint: { value: brushTexture() }, res: { value: new THREE.Vector2(1, 1) } }, vertexShader: QUAD_VS, depthTest: false, depthWrite: false,
    fragmentShader: "precision highp float;\n#define R " + KR + "\n" +
      "uniform sampler2D tScene, tPaint; uniform vec2 res; varying vec2 vUv;\n" +
      "vec3 tx(vec2 o){ return texture2D(tScene, vUv + o / res).rgb; }\n" +
      "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n" +
      "void main(){\n" +
      "  vec3 m0=vec3(0.), m1=vec3(0.), m2=vec3(0.), m3=vec3(0.), s0=vec3(0.), s1=vec3(0.), s2=vec3(0.), s3=vec3(0.);\n" +
      "  for (int j = -R; j <= 0; j++) { for (int i = -R; i <= 0; i++) {\n" +
      "    vec3 a = tx(vec2(float(i), float(j))); m0 += a; s0 += a*a;\n" +
      "    vec3 b = tx(vec2(float(-i), float(j))); m1 += b; s1 += b*b;\n" +
      "    vec3 c = tx(vec2(float(i), float(-j))); m2 += c; s2 += c*c;\n" +
      "    vec3 d = tx(vec2(float(-i), float(-j))); m3 += d; s3 += d*d; } }\n" +
      "  float N = float((R+1)*(R+1)); m0/=N; m1/=N; m2/=N; m3/=N;\n" +
      "  vec3 v0 = abs(s0/N - m0*m0), v1 = abs(s1/N - m1*m1), v2 = abs(s2/N - m2*m2), v3 = abs(s3/N - m3*m3);\n" +
      "  float w0 = 1./(1.+pow(55.*sqrt(v0.r+v0.g+v0.b), 6.)), w1 = 1./(1.+pow(55.*sqrt(v1.r+v1.g+v1.b), 6.)), w2 = 1./(1.+pow(55.*sqrt(v2.r+v2.g+v2.b), 6.)), w3 = 1./(1.+pow(55.*sqrt(v3.r+v3.g+v3.b), 6.));\n" +
      "  vec3 col = (m0*w0 + m1*w1 + m2*w2 + m3*w3) / (w0+w1+w2+w3);\n" +
      // impasto: the brush texture lights the paint from the upper left
      "  vec2 puv = vUv * res / 760.;\n" +
      "  float p0 = texture2D(tPaint, puv).r, p1 = texture2D(tPaint, puv + vec2(2.4, -2.4) / 760.).r;\n" +
      "  col *= 1. + (p0 - p1) * 1.7 + (p0 - .5) * .09;\n" +
      // grade: black shadows with a cool lean, warm lights, richer colour
      "  float l = dot(col, vec3(.299,.587,.114));\n" +
      "  col = mix(col, col * vec3(.90,1.0,1.06), 1. - smoothstep(0., .34, l));\n" +
      "  col = mix(col, col * vec3(1.09,1.0,.90), smoothstep(.32, .88, l));\n" +
      "  col = mix(vec3(l), col, 1.08);\n" +
      "  col = clamp(col, 0., 1.); col = mix(col, col*col*(3.-2.*col), .6); col = pow(col, vec3(1.18));\n" +
      // freckles: a little dry speckle in the mid-tones
      "  float sp = hash(floor(gl_FragCoord.xy / 2.)); col *= 1. - step(.991, sp) * .22 * smoothstep(.1, .5, l);\n" +
      "  vec2 q = vUv - .5; col *= 1. - smoothstep(.34, .86, length(q * vec2(1.05, 1.))) * .62;\n" +
      "  gl_FragColor = vec4(col, 1.);\n}"
  });
  var halfOK = renderer.capabilities.isWebGL2 && (renderer.extensions.has("EXT_color_buffer_float") || renderer.extensions.has("EXT_color_buffer_half_float"));   // some phones cannot render into float buffers
  var rtA = new THREE.WebGLRenderTarget(2, 2, { type: halfOK ? THREE.HalfFloatType : THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
  var rtB = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  var quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), matTone);
  quad.frustumCulled = false; quadScene.add(quad);
  function paintFrame() {
    renderer.setRenderTarget(rtA); renderer.render(scene, camera);
    quad.material = matTone; matTone.uniforms.tScene.value = rtA.texture; matTone.uniforms.exposure.value = exposure;
    renderer.setRenderTarget(rtB); renderer.render(quadScene, quadCam);
    quad.material = matPaint; matPaint.uniforms.tScene.value = rtB.texture;
    renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
  }

  /* ───────────── camera keys: walk, orbit, zoom, spin ───────────── */
  function PK(tc, back, up, side, tl, ly, fov) {                                          // a camera key on the descent path: behind and above the run, looking ahead along it
    var c = DESC.at(tc), b = DESC.at(Math.max(0, tc - back)), l = DESC.at(tl), d = new THREE.Vector3(c.x - b.x, 0, c.z - b.z);
    if (d.lengthSq() < 1e-6) d.set(0, 0, -1); d.normalize();
    return { w: 1, m: "pos", px: b.x - d.z * side, py: b.y + up, pz: b.z + d.x * side, lx: l.x, ly: l.y + ly, lz: l.z, fov: fov, roll: 0, bob: 0 };
  }
  var W = { selva: 0, inferno: 1, purgatorio: 2, paradiso: 3, empyrean: 4 };
  function O(w, ang, rad, h, ly, fov, extra) { var k = { w: w, m: "orbit", cx: 0, cz: 0, ang: ang, rad: rad, h: h, ly: ly, fov: fov, roll: 0, bob: 0 }; for (var e in extra) k[e] = extra[e]; return k; }
  var KEYS = {
    forest: { w: 0, m: "pos", px: 0, py: 1.8, pz: 16, lx: 0, ly: 4.2, lz: -70, fov: 56, roll: 0, bob: 1 },
    gate:   { w: 0, m: "pos", px: 0, py: 2.4, pz: -100, lx: 0, ly: 14, lz: -140, fov: 34, roll: 0, bob: 1 },
    inf1: PK(0, 0, 46, -50, .26, 4, 52), inf2: PK(.26, .07, 15, 10, .36, 3, 50), inf3: PK(.52, .07, 12, -8, .62, 3, 50), inf4: PK(.8, .07, 10, 6, .9, 3, 50),
    turn: { w: 1, m: "pos", px: DESC.min.x, py: DESC.min.y + 14, pz: DESC.min.z + 26, lx: DESC.min.x, ly: DESC.min.y + 8, lz: DESC.min.z, fov: 46, roll: Math.PI, bob: 0 },
    shore: O(2, .5, 330, 7, 70, 52),
    m1: O(2, 1.2, 250, 16, 36, 52), m2: O(2, 2.3, 232, 30, 46, 52), m3: O(2, 3.4, 214, 44, 56, 52), m4: O(2, 4.5, 196, 58, 66, 52), m5: O(2, 5.6, 178, 72, 76, 52), m6: O(2, 6.7, 160, 86, 88, 52),
    garden: O(2, 7.6, 46, 114, 104, 62),
    p1: O(3, .3, 26, 4, 0, 58), p2: O(3, 1.5, 36, 8, 0, 56), p3: O(3, 2.7, 46, 12, 0, 54), p4: O(3, 3.9, 58, 18, 0, 52), p5: O(3, 5.1, 72, 28, 0, 50),
    rose: O(4, 0, 74, 62, 6, 55)
  };
  var worlds = [buildData(), buildDescent(), buildPurgatorio(), buildParadiso(), buildEmpyrean()];
  worlds.forEach(function (w) { w.group.visible = false; scene.add(w.group); });
  var curWorld = -1;
  function setWorld(i) {
    if (i === curWorld) return; curWorld = i;
    try { window.dispatchEvent(new CustomEvent("descent:world", { detail: i })); } catch (e) { /* old browser */ }
    worlds.forEach(function (w, k) { w.group.visible = k === i; });
    var w = worlds[i]; scene.background = new THREE.Color(w.bg); scene.fog = w.fog ? new THREE.FogExp2(w.fog[0], w.fog[1]) : null; exposure = w.exposure;
  }

  var seq = [].slice.call(document.querySelectorAll("[data-cam]")).filter(function (el) { return KEYS[el.getAttribute("data-cam")]; }).map(function (el) { return { el: el, key: KEYS[el.getAttribute("data-cam")] }; });
  var NUM = ["px", "py", "pz", "lx", "ly", "lz", "cx", "cz", "ang", "rad", "h", "fov", "roll", "bob"];
  function mix(A, B, f) { var o = { m: A.m, w: A.w }; NUM.forEach(function (n) { if (A[n] != null || B[n] != null) o[n] = lerp(A[n] == null ? B[n] : A[n], B[n] == null ? A[n] : B[n], f); }); return o; }
  function solve(k) {
    if (k.m === "orbit") return { pos: [k.cx + Math.cos(k.ang) * k.rad, k.h, k.cz + Math.sin(k.ang) * k.rad], look: [k.cx, k.ly, k.cz] };
    return { pos: [k.px, k.py, k.pz], look: [k.lx, k.ly, k.lz] };
  }
  function target() {
    if (!seq.length) return 0;
    var y = window.scrollY, mid = y + window.innerHeight * .5;
    var cs = seq.map(function (s) { var r = s.el.getBoundingClientRect(); return y + r.top + Math.min(r.height / 2, window.innerHeight * .5); });   // a tall section reaches its camera key when its top is on screen
    if (mid <= cs[0]) return 0;
    for (var i = 0; i < seq.length - 1; i++) if (mid < cs[i + 1]) return i + (mid - cs[i]) / (cs[i + 1] - cs[i]);
    return seq.length - 1;
  }

  function resize() { var w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); var bs = renderer.getDrawingBufferSize(new THREE.Vector2()); rtA.setSize(bs.x, bs.y); rtB.setSize(bs.x, bs.y); matPaint.uniforms.res.value.set(bs.x, bs.y); }
  window.addEventListener("resize", resize); resize();

  var ema = .016, slow = 0, cur = { s: frozen ? parseFloat(frozen[1]) : target() }, last = 0, raf = 0, running = false, walked = 0, lastFov = 0, p0 = new THREE.Vector3(), l0 = new THREE.Vector3();
  function frame(ms) {
    raf = window.requestAnimationFrame(frame);
    var dt = Math.min(.05, (ms - last) / 1000 || 0); last = ms;
    // a slow machine renders the painting at a lower resolution (bigger strokes) instead of stuttering
    if (!frozen && dt > 0) { ema = ema * .95 + dt * .05; slow = ema > .036 ? slow + 1 : 0; if (slow > 90 && ratio > .5) { ratio = Math.max(.5, ratio * .8); renderer.setPixelRatio(ratio); resize(); ema = .02; slow = 0; } }
    if (!frozen) { var t = target(); if (Math.abs(t - cur.s) > 4) cur.s = t; else cur.s += (t - cur.s) * (1 - Math.pow(.0009, dt)); }
    var s = clamp(cur.s, 0, seq.length - 1), i = Math.min(seq.length - 2, Math.floor(s)), f = s - i, A = seq[i].key, B = seq[i + 1].key, k, fade = 0;
    if (A.w === B.w && A.m === B.m) k = mix(A, B, sm(f));
    else { var half = f < .5; k = half ? mix(A, A, 0) : mix(B, B, 0); k.fov = lerp(k.fov, k.fov * .82, half ? sm(f * 2) : 0); fade = clamp(1 - Math.abs(f - .5) / .22, 0, 1); }
    setWorld(W_of(k));
    var pose = solve(k), time = frozen ? 0 : ms / 1000;
    walked = s * 14;
    camera.userData.walk = walked; camera.userData.s = s;
    var bob = (k.bob || 0) * (Math.sin(walked * 2.4) * .06);
    camera.position.set(pose.pos[0], pose.pos[1] + bob, pose.pos[2]);
    camera.up.set(0, 1, 0); camera.lookAt(pose.look[0], pose.look[1], pose.look[2]);
    if (k.roll) camera.rotateZ(k.roll);
    if (k.m === "orbit" && !frozen) camera.rotateY(Math.sin(time * .15) * .01);
    if (Math.abs(camera.fov - k.fov) > .01) { camera.fov = k.fov; camera.updateProjectionMatrix(); }
    if (fadeEl) fadeEl.style.opacity = fade.toFixed(3);
    worlds[curWorld].update(dt, time, camera, !!frozen);
    try { paintFrame(); } catch (err) { if (window.console) console.error("cv: painting failed, switching to the plain CV -", err); stop(); root.classList.remove("js", "gated"); root.classList.add("plain"); }
  }
  function W_of(k) { return k.w; }
  function start() { if (running || root.classList.contains("plain")) return; running = true; last = performance.now(); raf = window.requestAnimationFrame(frame); cv.classList.add("on"); }
  function stop() { running = false; window.cancelAnimationFrame(raf); cv.classList.remove("on"); }
  document.addEventListener("visibilitychange", function () { if (document.hidden) { if (running) window.cancelAnimationFrame(raf); } else if (running) { last = performance.now(); raf = window.requestAnimationFrame(frame); } });
  window.Descent = { start: start, stop: stop };
  start();
})();

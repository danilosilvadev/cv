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

  /* ───────────── world 0 · the dark wood and the gate ───────────── */
  function buildForest() {
    var g = new THREE.Group(), r = mulberry(1001);
    function gh(x, z) { var c = Math.min(1, Math.abs(x) / 7); return (fbm(x * .045, 3.3, z * .045) - .5) * 6 * c * c; }
    var gg = new THREE.PlaneGeometry(520, 520, small ? 80 : 150, small ? 80 : 150); gg.rotateX(-Math.PI / 2);
    var gp = gg.attributes.position, gc = new Float32Array(gp.count * 3);
    for (var i = 0; i < gp.count; i++) {
      var x = gp.getX(i), z = gp.getZ(i); gp.setY(i, gh(x, z)); var n = fbm(x * .2, 0, z * .2), path = Math.exp(-Math.pow(x / 4.5, 2)) * (z < 30 && z > -150 ? 1 : 0);
      var k = .5 + n * .7; gc[i * 3] = (.045 + path * .05) * k; gc[i * 3 + 1] = (.075 + path * .045) * k; gc[i * 3 + 2] = (.05 + path * .03) * k;
    }
    gg.setAttribute("color", new THREE.BufferAttribute(gc, 3));
    g.add(new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 })));

    var NT = small ? 220 : 420, trunkG = new THREE.CylinderGeometry(.32, .62, 1, 6), coneG = new THREE.ConeGeometry(1, 1, 7);
    var trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), NT);
    var c1 = new THREE.InstancedMesh(coneG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), NT);
    var c2 = new THREE.InstancedMesh(coneG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), NT);
    var d = new THREE.Object3D(), col = new THREE.Color();
    for (var t = 0; t < NT; t++) {
      var tx, tz, tries = 0;
      do { tx = (r() - .5) * 240; tz = 50 - r() * 260; tries++; } while (((Math.abs(tx) < 11 && tz < 40 && tz > -175) || (Math.abs(tx) < 34 && tz < -92 && tz > -175)) && tries < 40);
      var th = 9 + r() * 12, ty = gh(tx, tz), w = .8 + r() * .7;
      d.position.set(tx, ty + th / 2, tz); d.rotation.set(0, r() * 6, 0); d.scale.set(w, th, w); d.updateMatrix(); trunks.setMatrixAt(t, d.matrix);
      trunks.setColorAt(t, col.setRGB(.10 + r() * .06, .07 + r() * .04, .05 + r() * .03));
      var cr = 3.4 + r() * 2.2;
      d.position.set(tx, ty + th * .72, tz); d.scale.set(cr, th * .75, cr); d.updateMatrix(); c1.setMatrixAt(t, d.matrix);
      c1.setColorAt(t, col.setRGB(.02 + r() * .02, .06 + r() * .04, .045 + r() * .02));
      d.position.set(tx, ty + th * 1.0, tz); d.scale.set(cr * .72, th * .6, cr * .72); d.updateMatrix(); c2.setMatrixAt(t, d.matrix);
      c2.setColorAt(t, col.setRGB(.025 + r() * .02, .07 + r() * .04, .05 + r() * .02));
    }
    g.add(trunks); g.add(c1); g.add(c2);

    // the gate, carved with its inscription
    var gate = new THREE.Group(), stone = new THREE.MeshStandardMaterial({ color: 0x2e2623, roughness: .95, flatShading: true });
    function block(w, h, dd, x, y, z) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), stone); m.position.set(x, y, z); gate.add(m); return m; }
    block(4, 20, 4, -10.5, 10, 0); block(4, 20, 4, 10.5, 10, 0); block(29, 4.2, 4.6, 0, 22, 0);
    block(3, 25, 3.2, -14, 12, 0); block(3, 25, 3.2, 14, 12, 0);
    block(40, 11, 3, -35, 5.5, -.4); block(40, 11, 3, 35, 5.5, -.4); block(26, 2, 5.6, 0, 24.6, 0);
    var ins = new THREE.Mesh(new THREE.PlaneGeometry(24, 2.8), new THREE.MeshBasicMaterial({ map: textTex("PER ME SI VA NE LA CITTÀ DOLENTE", 1536, 180, "600 74px Georgia, serif", "#ffc48a", "#ff4a14"), transparent: true, toneMapped: false, fog: false }));
    ins.position.set(0, 22, 2.4); gate.add(ins);
    var back = new THREE.Mesh(new THREE.PlaneGeometry(17.4, 20.4), new THREE.MeshBasicMaterial({ color: 0x120403, fog: false })); back.position.set(0, 10, -1.0); gate.add(back);
    var voidGlow = new THREE.Mesh(new THREE.PlaneGeometry(17, 20), new THREE.MeshBasicMaterial({ map: glowTex("rgba(255,150,70,1)", "rgba(220,60,14,.7)"), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
    voidGlow.position.set(0, 8, -.8); gate.add(voidGlow);
    var gl = new THREE.PointLight(0xff5a20, 3.4, 80, 1.3); gl.position.set(0, 9, 5); gate.add(gl);
    gate.position.set(0, gh(0, -140), -140); g.add(gate);

    // light: a dim moon, a fire at the gate, fireflies
    g.add(new THREE.AmbientLight(0x23332e, .55));
    var mo = new THREE.DirectionalLight(0x7d9bb8, .45); mo.position.set(-40, 80, 30); g.add(mo);
    var NF = small ? 70 : 150, fp = new Float32Array(NF * 3), fr = mulberry(77);
    for (var f = 0; f < NF; f++) { fp[f * 3] = (fr() - .5) * 60; fp[f * 3 + 1] = .6 + fr() * 6; fp[f * 3 + 2] = 20 - fr() * 170; }
    var fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.BufferAttribute(fp, 3));
    var flies = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0xcfe89a, size: .5, map: glowTex("rgba(255,255,255,1)", "rgba(255,255,255,.4)"), transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    g.add(flies);
    var dante = figure(.6, false), virgil = figure(.68, true); g.add(dante); g.add(virgil);
    return {
      group: g, bg: 0x03080a, fog: [0x050f0c, .028], exposure: 1.15,
      update: function (dt, time, cam) {
        var z = cam.position.z - 15; dante.position.set(-1.0 + Math.sin(time * .5) * .15, gh(0, z) + Math.abs(Math.sin(cam.userData.walk * 1.2)) * .12, z);
        virgil.position.set(1.1, gh(0, z - .8) + Math.abs(Math.sin(cam.userData.walk * 1.2 + 1)) * .12, z - .8);
        flies.rotation.y = Math.sin(time * .1) * .05; flies.material.opacity = .55 + Math.sin(time * 2) * .25;
      }
    };
  }

  /* ───────────── world 1 · Inferno ───────────── */
  var N = 9, STEP = 5.2, SHELF = 4.2, INSET = 1.2, TOP = 62, DEPTH = N * STEP;
  function buildInferno() {
    var g = new THREE.Group(), r = mulberry(0xD4A7E), pts = [];
    function seg(r0, y0, r1, y1, n) { for (var k = 0; k < n; k++) { var t = k / n; pts.push(new THREE.Vector2(r0 + (r1 - r0) * t, y0 + (y1 - y0) * t)); } }
    pts.push(new THREE.Vector2(420, 0)); seg(420, 0, TOP + 6, 0, 6); seg(TOP + 6, 0, TOP, 0, 2);
    for (var i = 0; i < N; i++) { var ro = TOP - i * (SHELF + INSET), y = -i * STEP; seg(ro, y, ro - SHELF, y, 9); seg(ro - SHELF, y, ro - SHELF - INSET, y - STEP, 10); }
    var rb = TOP - N * (SHELF + INSET); pts.push(new THREE.Vector2(rb, -DEPTH)); seg(rb, -DEPTH, 0.01, -DEPTH, 5); pts.push(new THREE.Vector2(0.01, -DEPTH));
    var geo = new THREE.LatheGeometry(pts, small ? 120 : 220), pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    for (var v = 0; v < pos.count; v++) {
      var x = pos.getX(v), yy = pos.getY(v), z = pos.getZ(v), rr = Math.sqrt(x * x + z * z) || 1;
      var n = fbm(x * .16, yy * .2, z * .16), n2 = fbm(x * .5 + 9, yy * .5, z * .5), floor = yy < -DEPTH + .2, d = (n - .5) * 2 * (floor ? .15 : 1.5);
      pos.setX(v, x + (x / rr) * d); pos.setZ(v, z + (z / rr) * d); pos.setY(v, yy + (n2 - .5) * .9 * (floor ? .1 : 1));
      var depth = clamp(-yy / DEPTH, 0, 1), shade = .65 + .7 * n2, c0 = [.13, .10, .10], c1 = [.40, .11, .05], c2 = [.34, .46, .62], c;
      if (depth < .8) { var t = depth / .8; c = [lerp(c0[0], c1[0], t), lerp(c0[1], c1[1], t), lerp(c0[2], c1[2], t)]; }
      else { var t2 = (depth - .8) / .2; c = [lerp(c1[0], c2[0], t2), lerp(c1[1], c2[1], t2), lerp(c1[2], c2[2], t2)]; }
      col[v * 3] = c[0] * shade; col[v * 3 + 1] = c[1] * shade; col[v * 3 + 2] = c[2] * shade;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .92, metalness: .02, side: THREE.DoubleSide })));
    for (var k = 0; k < N; k++) {
      var lip = new THREE.Mesh(new THREE.TorusGeometry(TOP - k * (SHELF + INSET) - .2, .11, 6, small ? 120 : 240), new THREE.MeshBasicMaterial({ color: k > 6 ? 0x9fd8ff : 0xffa24a, transparent: true, opacity: .85 }));
      lip.rotation.x = Math.PI / 2; lip.position.y = -k * STEP + .12; g.add(lip);
    }
    var crystal = new THREE.Mesh(new THREE.IcosahedronGeometry(5.2, 1), new THREE.MeshStandardMaterial({ color: 0xcfeaff, emissive: 0x4a8ec4, emissiveIntensity: .55, flatShading: true, roughness: .25, metalness: .1 }));
    crystal.position.y = -DEPTH + 4.5; g.add(crystal);
    var halo = new THREE.Mesh(new THREE.CircleGeometry(15, 60), new THREE.MeshBasicMaterial({ color: 0x8fc4ee, transparent: true, opacity: .16 }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = -DEPTH + .12; g.add(halo);
    g.add(new THREE.AmbientLight(0x2a1620, .28));
    var ml = new THREE.DirectionalLight(0x7f95c8, .55); ml.position.set(-60, 90, 40); g.add(ml);
    [[-6, 0xff6a2b, 1.0, 70], [-18, 0xff5a1f, 1.2, 62], [-31, 0xff7a35, 1.3, 56]].forEach(function (l) { var p = new THREE.PointLight(l[1], l[2], l[3], 1.4); p.position.set(0, l[0], 0); g.add(p); });
    var ice = new THREE.PointLight(0x9fd8ff, 1.5, 46, 1.6); ice.position.set(0, -DEPTH + 8, 0); g.add(ice);
    g.add(skyDome([.11, .045, .03], [.008, .006, .01], .26));
    g.add(starField(small ? 700 : 1400, 900, 1.6, .6, 424242, true));

    var NE = small ? 300 : 700, ep = new Float32Array(NE * 3), ev = new Float32Array(NE), ea = new Float32Array(NE), er = new Float32Array(NE);
    function funnelR(y) { return y >= 0 ? TOP : TOP + (rb - TOP) * Math.min(1, -y / DEPTH); }
    for (var e = 0; e < NE; e++) { var y0 = -DEPTH + r() * (DEPTH + 26); ea[e] = r() * 6.283; er[e] = Math.sqrt(r()) * (funnelR(y0) - 2); ev[e] = .5 + r() * 1.5; ep[e * 3] = Math.cos(ea[e]) * er[e]; ep[e * 3 + 1] = y0; ep[e * 3 + 2] = Math.sin(ea[e]) * er[e]; }
    var eg = new THREE.BufferGeometry(); eg.setAttribute("position", new THREE.BufferAttribute(ep, 3));
    g.add(new THREE.Points(eg, new THREE.PointsMaterial({ color: 0xffa04a, size: .5, map: glowTex("rgba(255,255,255,1)", "rgba(255,255,255,.4)"), transparent: true, opacity: .85, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false })));

    var A0 = .6, fa = A0 + Math.PI, fr = TOP - 1.8, virgil = figure(3.4, true), dante = figure(3.0, false);
    virgil.position.set(Math.cos(fa) * fr, 0, Math.sin(fa) * fr); dante.position.set(Math.cos(fa + .05) * fr, 0, Math.sin(fa + .05) * fr); g.add(virgil); g.add(dante);
    var moon = new THREE.Mesh(new THREE.CircleGeometry(26, 64), new THREE.MeshBasicMaterial({ color: 0xf3ead6, fog: false, toneMapped: false }));
    var hz = new THREE.Vector3(Math.cos(fa), 0, Math.sin(fa)), md = hz.clone().multiplyScalar(Math.cos(.062)).add(new THREE.Vector3(0, Math.sin(.062), 0)).normalize();
    var cpos = new THREE.Vector3(Math.cos(A0) * 84, 20, Math.sin(A0) * 84);
    moon.position.copy(cpos).add(md.clone().multiplyScalar(720)); moon.lookAt(cpos); g.add(moon);
    var mg = glowSprite(300, "rgba(255,240,215,.55)", "rgba(255,225,190,.18)", 1); mg.position.copy(moon.position).add(md.clone().multiplyScalar(-2)); g.add(mg);
    return {
      group: g, bg: 0x050203, fog: [0x1c0c08, .0092], exposure: 1.0,
      update: function (dt, time, cam, still) {
        crystal.rotation.y = time * .2; crystal.rotation.x = Math.sin(time * .3) * .1;
        if (still) return;
        var p = eg.attributes.position.array;
        for (var e = 0; e < NE; e++) {
          p[e * 3 + 1] += ev[e] * dt * 3.2; ea[e] += dt * .08;
          if (p[e * 3 + 1] > 26) { p[e * 3 + 1] = -DEPTH; er[e] = Math.sqrt(Math.random()) * (funnelR(-DEPTH) - 2); }
          var rr = Math.min(er[e], funnelR(p[e * 3 + 1]) - 1.5); p[e * 3] = Math.cos(ea[e]) * rr; p[e * 3 + 2] = Math.sin(ea[e]) * rr;
        }
        eg.attributes.position.needsUpdate = true;
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
  var rtA = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
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
  var W = { selva: 0, inferno: 1, purgatorio: 2, paradiso: 3, empyrean: 4 };
  function O(w, ang, rad, h, ly, fov, extra) { var k = { w: w, m: "orbit", cx: 0, cz: 0, ang: ang, rad: rad, h: h, ly: ly, fov: fov, roll: 0, bob: 0 }; for (var e in extra) k[e] = extra[e]; return k; }
  var KEYS = {
    forest: { w: 0, m: "pos", px: 0, py: 1.8, pz: 16, lx: 0, ly: 4.2, lz: -70, fov: 56, roll: 0, bob: 1 },
    gate:   { w: 0, m: "pos", px: 0, py: 2.4, pz: -100, lx: 0, ly: 14, lz: -140, fov: 34, roll: 0, bob: 1 },
    inf1: O(1, .6, 84, 20, -2, 45), inf2: O(1, 1.9, 58, 4, -14, 45), inf3: O(1, 3.4, 40, -10, -26, 45), inf4: O(1, 4.8, 26, -22, -38, 45),
    turn: O(1, 5.9, 21, -29, -42, 40, { roll: Math.PI }),
    shore: O(2, .5, 330, 7, 70, 52),
    m1: O(2, 1.2, 250, 16, 36, 52), m2: O(2, 2.3, 232, 30, 46, 52), m3: O(2, 3.4, 214, 44, 56, 52), m4: O(2, 4.5, 196, 58, 66, 52), m5: O(2, 5.6, 178, 72, 76, 52), m6: O(2, 6.7, 160, 86, 88, 52),
    garden: O(2, 7.6, 46, 114, 104, 62),
    p1: O(3, .3, 26, 4, 0, 58), p2: O(3, 1.5, 36, 8, 0, 56), p3: O(3, 2.7, 46, 12, 0, 54), p4: O(3, 3.9, 58, 18, 0, 52), p5: O(3, 5.1, 72, 28, 0, 50),
    rose: O(4, 0, 74, 62, 6, 55)
  };
  var worlds = [buildForest(), buildInferno(), buildPurgatorio(), buildParadiso(), buildEmpyrean()];
  worlds.forEach(function (w) { w.group.visible = false; scene.add(w.group); });
  var curWorld = -1;
  function setWorld(i) {
    if (i === curWorld) return; curWorld = i;
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
    var cs = seq.map(function (s) { var r = s.el.getBoundingClientRect(); return y + r.top + r.height / 2; });
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
    camera.userData.walk = walked;
    var bob = (k.bob || 0) * (Math.sin(walked * 2.4) * .06);
    camera.position.set(pose.pos[0], pose.pos[1] + bob, pose.pos[2]);
    camera.up.set(0, 1, 0); camera.lookAt(pose.look[0], pose.look[1], pose.look[2]);
    if (k.roll) camera.rotateZ(k.roll);
    if (k.m === "orbit" && !frozen) camera.rotateY(Math.sin(time * .15) * .01);
    if (Math.abs(camera.fov - k.fov) > .01) { camera.fov = k.fov; camera.updateProjectionMatrix(); }
    if (fadeEl) fadeEl.style.opacity = fade.toFixed(3);
    worlds[curWorld].update(dt, time, camera, !!frozen);
    paintFrame();
  }
  function W_of(k) { return k.w; }
  function start() { if (running || root.classList.contains("plain")) return; running = true; last = performance.now(); raf = window.requestAnimationFrame(frame); cv.classList.add("on"); }
  function stop() { running = false; window.cancelAnimationFrame(raf); cv.classList.remove("on"); }
  document.addEventListener("visibilitychange", function () { if (document.hidden) { if (running) window.cancelAnimationFrame(raf); } else if (running) { last = performance.now(); raf = window.requestAnimationFrame(frame); } });
  window.Descent = { start: start, stop: stop };
  start();
})();

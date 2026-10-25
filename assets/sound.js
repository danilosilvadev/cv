/* The soundscape: ambient sound for each world, made live with the Web Audio API (no audio files, nothing downloaded).
 * Sound is ON by default: the entry screen's main button is "Enter with sound". Browsers, and phones above all, do not let a page
 * start audio by itself, so that one tap is what unlocks it. The choice is remembered and a Sound button stays in the bar. */
(function () {
  "use strict";
  var root = document.documentElement;
  var $ = function (s) { return document.querySelector(s); };
  var gate = $("#gate"), btnOn = $("#gate-on"), btnOff = $("#gate-off"), btnPlain = $("#gate-plain"), snd = $("#soundbtn");

  var ctx = null, master = null, bus = null, layers = [], world = 0, wanted = false, ready = false, timers = [], silentEl = null;
  function pref(v) { try { if (v === undefined) return localStorage.getItem("cv-sound"); localStorage.setItem("cv-sound", v ? "1" : "0"); } catch (e) { /* private window */ } return null; }

  /* ── the entry screen ── */
  function openSite() {
    if (gate) gate.classList.add("out");
    setTimeout(function () { root.classList.remove("gated"); if (gate && gate.parentNode) gate.parentNode.removeChild(gate); }, 850);
  }
  function label() {
    if (!snd) return;
    var on = wanted && ready;
    snd.setAttribute("aria-pressed", String(on)); snd.textContent = on ? "Sound on" : "Sound off";
  }
  if (btnOn) btnOn.addEventListener("click", function () { pref(true); openSite(); setSound(true); });
  if (btnOff) btnOff.addEventListener("click", function () { pref(false); openSite(); setSound(false); });
  if (btnPlain) btnPlain.addEventListener("click", function () { var b = $("#plainbtn"); openSite(); if (b && !root.classList.contains("plain")) b.click(); });
  if (snd) snd.addEventListener("click", function () { var on = !(wanted && ready); pref(on); setSound(on); });
  document.addEventListener("keydown", function (e) { if (e.key === "Enter" && gate && document.body.contains(gate) && !root.classList.contains("plain") && document.activeElement !== btnOff && document.activeElement !== btnPlain) { e.preventDefault(); if (btnOn) btnOn.click(); } });
  label();

  /* ── on / off ── */
  function setSound(on) {
    wanted = on;
    try {
      if (on) { start(); } else if (ctx && master) { master.gain.setTargetAtTime(0, ctx.currentTime, .25); }
    } catch (e) { if (window.console) console.warn("cv: sound unavailable -", e); ready = false; }
    label();
  }
  function start() {
    if (!ctx) build();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    // iPhones mute Web Audio when the ringer switch is on silent, unless an audio element has started a playback session
    if (!silentEl) { try { silentEl = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"); silentEl.loop = true; silentEl.play().catch(function () { /* fine */ }); } catch (e) { /* fine */ } }
    master.gain.setTargetAtTime(.85, ctx.currentTime, 1.4);
    ready = true; setWorld(world);
  }
  document.addEventListener("visibilitychange", function () { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (wanted && !root.classList.contains("plain")) ctx.resume(); });
  new MutationObserver(function () { if (!ctx || !master) return; var plain = root.classList.contains("plain"); master.gain.setTargetAtTime(plain || !wanted ? 0 : .85, ctx.currentTime, .4); }).observe(root, { attributes: true, attributeFilter: ["class"] });
  window.addEventListener("descent:world", function (e) { world = e.detail; if (ready) setWorld(world); });

  function setWorld(w) { if (!ctx) return; layers.forEach(function (l, i) { l.out.gain.setTargetAtTime(i === w ? 1 : 0, ctx.currentTime, 1.1); }); }

  /* ── the graph ── */
  function noise(sec, kind) {
    var n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), last = 0, r = 12345;
    function rnd() { r = (r * 1664525 + 1013904223) >>> 0; return r / 4294967296 * 2 - 1; }   // seeded: the same air every time
    for (var i = 0; i < n; i++) { var w = rnd(); if (kind === "brown") { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    return b;
  }
  function src(buf) { var s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; }
  function osc(type, f, det) { var o = ctx.createOscillator(); o.type = type; o.frequency.value = f; if (det) o.detune.value = det; o.start(); return o; }
  function gain(v) { var g = ctx.createGain(); g.gain.value = v; return g; }
  function filt(type, f, q) { var x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q) x.Q.value = q; return x; }
  function lfo(rate, depth, target) { var o = osc("sine", rate), g = gain(depth); o.connect(g); g.connect(target); return o; }
  function layer() { var g = ctx.createGain(); g.gain.value = 0; g.connect(bus); return { out: g }; }
  function every(minMs, maxMs, fn, idx) {
    (function loop() {
      timers.push(setTimeout(function () { if (ctx && ctx.state === "running" && ready && world === idx && !document.hidden) fn(); loop(); }, minMs + Math.random() * (maxMs - minMs)));
    })();
  }
  function ping(out, f, vol, dur) {
    var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    var o2 = ctx.createOscillator(), g2 = ctx.createGain(); o2.type = "sine"; o2.frequency.value = f * 2.01; g2.gain.value = vol * .25;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(out); o.start(t); o2.start(t); o.stop(t + dur + .1); o2.stop(t + dur + .1);
  }
  function pad(out, freqs, vol, shimmer) {
    freqs.forEach(function (f, i) {
      [-6, 5].forEach(function (c) { var o = osc("sine", f, c), g = gain(vol); o.connect(g); g.connect(out); lfo(.07 + i * .031 + (shimmer || 0), vol * .55, g.gain); });
    });
  }

  function build() {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    bus = gain(1); bus.connect(master);
    // a soft hall: a short decaying noise as the impulse response
    var ir = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 2.8), ctx.sampleRate), seed = 777;
    for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c); for (var i = 0; i < d.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; d[i] = (seed / 4294967296 * 2 - 1) * Math.pow(1 - i / d.length, 2.6); } }
    var conv = ctx.createConvolver(); conv.buffer = ir; var wet = gain(.38); bus.connect(conv); conv.connect(wet); wet.connect(master);

    var brown = noise(6, "brown"), white = noise(4, "white");

    /* 0 · the dark wood: wind, crickets, a low drone, footsteps */
    var f0 = layer(), wind = src(brown), wf = filt("bandpass", 380, .7), wg = gain(.6); wind.connect(wf); wf.connect(wg); wg.connect(f0.out); lfo(.06, 140, wf.frequency); lfo(.09, .22, wg.gain);
    var dr0 = osc("sine", 55), dg0 = gain(.07); dr0.connect(dg0); dg0.connect(f0.out);
    var cr = osc("sine", 4300), cg = gain(0), cm = osc("square", 13), cmg = gain(.012); cr.connect(cg); cg.connect(f0.out); cm.connect(cmg); cmg.connect(cg.gain);
    var cm2 = osc("sine", .3), cm2g = gain(.01); cm2.connect(cm2g); cm2g.connect(cg.gain);
    var leaves = src(white), lf = filt("highpass", 5200), lg = gain(.012); leaves.connect(lf); lf.connect(lg); lg.connect(f0.out); lfo(.11, .01, lg.gain);

    /* 1 · Inferno: a deep drone, fire crackle, a hot rumble */
    var f1 = layer(), a = osc("sawtooth", 48), b = osc("sawtooth", 48.45), lp = filt("lowpass", 150, 1.2), dg = gain(.2);
    a.connect(lp); b.connect(lp); lp.connect(dg); dg.connect(f1.out); lfo(.045, 50, lp.frequency);
    var t2 = osc("triangle", 72.3), t2g = gain(.07); t2.connect(t2g); t2g.connect(f1.out); lfo(.03, .04, t2g.gain);
    var rum = src(brown), rl = filt("lowpass", 95), rg = gain(.9); rum.connect(rl); rl.connect(rg); rg.connect(f1.out); lfo(.08, .3, rg.gain);
    var crb = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), cd = crb.getChannelData(0), cs = 4242;
    for (var k = 0; k < cd.length; k++) { cs = (cs * 1664525 + 1013904223) >>> 0; var u = cs / 4294967296; if (u > .9993) cd[k] = (u - .9993) * 1400 * (cs & 1 ? 1 : -1); else if (u > .996) cd[k] = (Math.random() - .5) * .05; }
    var crk = src(crb), cf = filt("bandpass", 2300, .6), cgn = gain(.7); crk.connect(cf); cf.connect(cgn); cgn.connect(f1.out);
    var wh = src(white), whf = filt("bandpass", 700, 1.4), whg = gain(.05); wh.connect(whf); whf.connect(whg); whg.connect(f1.out); lfo(.05, 500, whf.frequency); lfo(.07, .04, whg.gain);

    /* 2 · Purgatorio: waves at dawn, a soft rising pad, far bells */
    var f2 = layer(), w1 = src(white), w1f = filt("lowpass", 900), w1g = gain(.12); w1.connect(w1f); w1f.connect(w1g); w1g.connect(f2.out); lfo(.11, .1, w1g.gain); lfo(.05, 300, w1f.frequency);
    var w2 = src(brown), w2f = filt("lowpass", 500), w2g = gain(.5); w2.connect(w2f); w2f.connect(w2g); w2g.connect(f2.out); lfo(.17, .3, w2g.gain);
    pad(f2.out, [220, 329.63, 493.88, 659.25], .022, .01);
    every(3500, 9000, function () { var n = [523.25, 587.33, 659.25, 783.99, 880][Math.floor(Math.random() * 5)]; ping(f2.out, n, .05, 3.6); }, 2);

    /* 3 · Paradiso: a high choir of sines, air, glints */
    var f3 = layer(); pad(f3.out, [293.66, 440, 587.33, 739.99, 880, 1174.66], .017, .02);
    var air = src(white), af = filt("highpass", 3600), ag = gain(.01); air.connect(af); af.connect(ag); ag.connect(f3.out); lfo(.13, .008, ag.gain);
    var base3 = osc("sine", 73.42), bg3 = gain(.06); base3.connect(bg3); bg3.connect(f3.out);
    every(1800, 5200, function () { var n = [1174.66, 1318.51, 1479.98, 1760, 1975.53][Math.floor(Math.random() * 5)]; ping(f3.out, n, .04, 4.4); }, 3);

    /* 4 · the Empyrean: a bright open chord and bells */
    var f4 = layer(); pad(f4.out, [261.63, 329.63, 392, 493.88, 587.33, 783.99, 1046.5], .016, .015);
    var h4 = osc("sine", 130.81), hg4 = gain(.07); h4.connect(hg4); hg4.connect(f4.out);
    every(900, 3200, function () { var n = [1046.5, 1174.66, 1318.51, 1567.98, 2093][Math.floor(Math.random() * 5)]; ping(f4.out, n, .045, 5.2); }, 4);

    layers = [f0, f1, f2, f3, f4];

    // footsteps while walking the wood: one soft thud for each stretch of scrolling
    var acc = 0, lastY = window.scrollY, side = 0;
    window.addEventListener("scroll", function () {
      var y = window.scrollY, dy = Math.abs(y - lastY); lastY = y;
      if (!ready || world !== 0 || ctx.state !== "running") return;
      acc += dy; if (acc < 120) return; acc = 0; side ^= 1;
      var t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = white; var f = filt("lowpass", side ? 190 : 150), g = ctx.createGain();
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.28, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + .17);
      s.connect(f); f.connect(g); g.connect(f0.out); s.start(t, Math.random() * 2); s.stop(t + .2);
    }, { passive: true });
  }

  window.CvSound = { set: setSound, get on() { return wanted && ready; }, get debug() { return { ctx: ctx, master: master, world: world }; } };
})();

/* The Climb · sound. Everything is made live with the Web Audio API: no audio files, nothing downloaded.
 *  - a generative song (A minor, 64 bpm: a lonely music-box melody over a slow swelling pad, rising towards hope as the climber nears the mountain)
 *  - the world: wind in the pines, a river, crickets, a low drone of fog
 *  - one-shot effects tied to what you see: footsteps on grass, stones and water, bird calls, firefly chimes, the scarf
 * The same builder runs on a real AudioContext and on an OfflineAudioContext (Snd.offline), which is how it is tested. */
(function () {
  "use strict";
  var BPM = 64, BEAT = 60 / BPM, BAR = BEAT * 4;
  var mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // sixteen bars, then it begins again with small changes: loneliness (Am, F), a lift (C, G), then an anticipation (Dm, E) before the repeat
  var PROG = [
    { t: [57, 60, 64], b: 45 }, { t: [53, 57, 60, 64], b: 41 }, { t: [55, 60, 64], b: 48 }, { t: [55, 59, 62], b: 43 },
    { t: [57, 60, 64], b: 45 }, { t: [53, 57, 60, 64], b: 41 }, { t: [55, 60, 64], b: 48 }, { t: [55, 59, 62, 65], b: 43 },
    { t: [50, 57, 62], b: 50 }, { t: [57, 60, 64], b: 45 }, { t: [53, 57, 60], b: 41 }, { t: [55, 60, 64], b: 48 },
    { t: [50, 57, 62], b: 50 }, { t: [57, 60, 64], b: 45 }, { t: [52, 56, 59], b: 40 }, { t: [52, 56, 59, 62], b: 40 }
  ];
  var PROG2 = [                                                    // scene 2, the arid face: D minor, slower to resolve, a pulse underneath
    { t: [57, 62, 65], b: 38 }, { t: [58, 62, 65], b: 34 }, { t: [57, 60, 65], b: 41 }, { t: [55, 60, 64], b: 36 },
    { t: [57, 62, 65], b: 38 }, { t: [58, 62, 65], b: 34 }, { t: [55, 58, 62], b: 43 }, { t: [57, 61, 64], b: 33 },
    { t: [57, 62, 65], b: 38 }, { t: [53, 57, 60], b: 41 }, { t: [58, 62, 65], b: 34 }, { t: [57, 60, 65], b: 41 },
    { t: [55, 58, 62], b: 43 }, { t: [58, 62, 65], b: 34 }, { t: [57, 61, 64], b: 33 }, { t: [57, 61, 64, 67], b: 33 }
  ];
  var POOL2 = [62, 65, 67, 69, 72, 74, 77, 79];                   // D F G A C D F G: the D minor pentatonic
  var POOL = [64, 67, 69, 72, 74, 76, 79, 81];                     // E4 G4 A4 C5 D5 E5 G5 A5: the A minor pentatonic
  var RHY = [[0], [0, 2], [0, 1.5, 3], [0.5, 2, 3.5], [0, 2.5], [1, 3], [0, 1, 2.5]];

  function makeIR(ac, sec, decay) {
    var n = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(2, n, ac.sampleRate), r = mulberry(99);
    for (var c = 0; c < 2; c++) { var d = b.getChannelData(c), lp = 0; for (var i = 0; i < n; i++) { var w = r() * 2 - 1; lp += (w - lp) * .35; d[i] = lp * Math.pow(1 - i / n, decay); } }
    return b;
  }
  function noiseBuf(ac, sec, kind) {
    var n = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0), r = mulberry(kind === "brown" ? 5 : 11), last = 0;
    for (var i = 0; i < n; i++) { var w = r() * 2 - 1; if (kind === "brown") { last = (last + .02 * w) / 1.02; d[i] = last * 3.4; } else d[i] = w; }
    return b;
  }

  function build(ac, dest, opts) {
    opts = opts || {};
    var A = { ac: ac }, master = ac.createGain(); master.gain.value = 0; var comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3.2; comp.attack.value = .02; comp.release.value = .3; master.connect(comp); comp.connect(dest);
    var revIn = ac.createGain(), conv = ac.createConvolver(), revOut = ac.createGain(); conv.buffer = makeIR(ac, opts.fast ? 2.2 : 3.6, 2.2); revOut.gain.value = .62;
    revIn.connect(conv); conv.connect(revOut); revOut.connect(master);
    var dry = ac.createGain(); dry.gain.value = 1; dry.connect(master);
    var songBus = ac.createGain(); songBus.gain.value = 1; songBus.connect(dry); var songSend = ac.createGain(); songSend.gain.value = .55; songBus.connect(songSend); songSend.connect(revIn);
    var sfxBus = ac.createGain(); sfxBus.gain.value = 1; sfxBus.connect(dry); var sfxSend = ac.createGain(); sfxSend.gain.value = .3; sfxBus.connect(sfxSend); sfxSend.connect(revIn);
    var ambBus = ac.createGain(); ambBus.gain.value = 1; ambBus.connect(dry);
    A.master = master;

    function osc(type, f, det) { var o = ac.createOscillator(); o.type = type; o.frequency.value = f; if (det) o.detune.value = det; return o; }
    function gain(v) { var g = ac.createGain(); g.gain.value = v; return g; }
    function filt(type, f, q) { var x = ac.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q) x.Q.value = q; return x; }
    function pan(p) { if (ac.createStereoPanner) { var s = ac.createStereoPanner(); s.pan.value = Math.max(-1, Math.min(1, p || 0)); return s; } return gain(1); }
    function loop(buf) { var s = ac.createBufferSource(); s.buffer = buf; s.loop = true; return s; }

    // ───────────── the world: wind, river, crickets, fog drone ─────────────
    var brown = noiseBuf(ac, 6, "brown"), white = noiseBuf(ac, 4, "white");
    var wind = loop(brown), windF = filt("bandpass", 420, .6), windG = gain(.0); wind.connect(windF); windF.connect(windG); windG.connect(ambBus); wind.start();
    var rustle = loop(white), rustleF = filt("highpass", 3400, .5), rustleG = gain(0); rustle.connect(rustleF); rustleF.connect(rustleG); rustleG.connect(ambBus); rustle.start();
    var river = loop(white), riverF = filt("bandpass", 1150, .6), riverF2 = filt("lowpass", 4200), riverG = gain(0), riverP = pan(0); river.connect(riverF); riverF.connect(riverF2); riverF2.connect(riverG); riverG.connect(riverP); riverP.connect(ambBus); river.start();
    var lfoA = osc("sine", .23), lfoAg = gain(380); lfoA.connect(lfoAg); lfoAg.connect(riverF.frequency); lfoA.start();
    var lfoB = osc("sine", .61), lfoBg = gain(.04); lfoB.connect(lfoBg); lfoBg.connect(riverG.gain); lfoB.start();
    var cr = osc("sine", 4300), crg = gain(0), crm = osc("square", 13), crmg = gain(.006), crs = osc("sine", .27), crsg = gain(.004); cr.connect(crg); crg.connect(ambBus); crm.connect(crmg); crmg.connect(crg.gain); crs.connect(crsg); crsg.connect(crg.gain); cr.start(); crm.start(); crs.start();
    var cr2 = osc("sine", 5100), cr2g = gain(0), cr2m = osc("square", 9), cr2mg = gain(.004); cr2.connect(cr2g); cr2g.connect(ambBus); cr2m.connect(cr2mg); cr2mg.connect(cr2g.gain); cr2.start(); cr2m.start();
    var dr1 = osc("sine", 55), dr2 = osc("sine", 82.4), drg = gain(0.0); dr1.connect(drg); dr2.connect(drg); drg.connect(ambBus); dr1.start(); dr2.start();
    var drl = osc("sine", .07), drlg = gain(.012); drl.connect(drlg); drlg.connect(drg.gain); drl.start();

    // state the page updates every frame: wind gust 0..1, river loudness 0..1 and where it is (pan), scroll intensity 0..1, fog 0..1
    A.update = function (s) {
      var t = ac.currentTime, tc = .35, g = s.gust || 0, I = s.intensity || 0, d = s.dry || 0; A.scene = s.scene || 0;
      windG.gain.setTargetAtTime(.05 + .17 * g + .08 * d, t, tc); windF.frequency.setTargetAtTime(300 + 520 * g + 420 * d, t, tc);
      rustleG.gain.setTargetAtTime(.0035 + .02 * g * g, t, tc);
      riverG.gain.setTargetAtTime(.012 + .085 * (s.river || 0), t, .25); riverP.pan && riverP.pan.setTargetAtTime && riverP.pan.setTargetAtTime(s.riverPan || 0, t, .3);
      crg.gain.setTargetAtTime(.0, t, .5); cr.frequency.setTargetAtTime(4300, t, 1);
      drg.gain.setTargetAtTime(.03 + .05 * (s.fog || 0), t, 1.2);
      A.intensity = I;
    };
    A.setCrickets = function (v) { var t = ac.currentTime; crmg.gain.setTargetAtTime(.006 * v, t, 1); cr2mg.gain.setTargetAtTime(.004 * v, t, 1); };

    // ───────────── one-shot effects ─────────────
    function burst(buf, dur, filtType, f, q, vol, p, when, curve) {
      var s = ac.createBufferSource(); s.buffer = buf; var f1 = filt(filtType, f, q), g = gain(0), pp = pan(p); var t = when || ac.currentTime;
      s.connect(f1); f1.connect(g); g.connect(pp); pp.connect(sfxBus);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      s.start(t, Math.random() * 2); s.stop(t + dur + .05);
    }
    A.step = function (kind, vol, p, when) {                                  // a footstep: grass, stone or water
      vol = (vol == null ? 1 : vol); var t = when || ac.currentTime;
      if (kind === "stone") { burst(white, .07, "bandpass", 2300, 3, .1 * vol, p, t); burst(white, .32, "bandpass", 1400, 1.2, .07 * vol, p, t + .03); var o = osc("sine", 150); var g = gain(0); o.connect(g); g.connect(sfxBus); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.16 * vol, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + .12); o.start(t); o.stop(t + .15); }
      else if (kind === "water") { burst(white, .38, "bandpass", 1700, .9, .11 * vol, p, t); burst(white, .2, "highpass", 3800, .5, .04 * vol, p, t + .04); }
      else { burst(brown, .16, "lowpass", 420, .7, .55 * vol, p, t); burst(white, .12, "highpass", 3000, .5, .018 * vol, p, t + .02); }
    };
    A.chirp = function (p, vol, when) {                                       // a bird: a few quick rising whistles
      var t0 = when || ac.currentTime, n = 2 + Math.floor(Math.random() * 3), base = 2300 + Math.random() * 1100;
      for (var i = 0; i < n; i++) {
        var t = t0 + i * (.11 + Math.random() * .05), o = osc("sine", base), g = gain(0), pp = pan(p); o.connect(g); g.connect(pp); pp.connect(sfxBus);
        o.frequency.setValueAtTime(base * (.92 + .1 * i), t); o.frequency.exponentialRampToValueAtTime(base * (1.28 + .05 * i), t + .075);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.032 * vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + .09); o.start(t); o.stop(t + .12);
      }
    };
    A.tink = function (midi, p, vol, when) {                                  // a firefly lights up: a small glass chime
      var t = when || ac.currentTime, f = mtof(midi), o = osc("sine", f), o2 = osc("sine", f * 2.76), g = gain(0), g2 = gain(.16), pp = pan(p);
      o.connect(g); o2.connect(g2); g2.connect(g); g.connect(pp); pp.connect(sfxBus);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05 * vol, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + 1.7); o.start(t); o2.start(t); o.stop(t + 1.8); o2.stop(t + 1.8);
    };
    A.swoosh = function (vol, p, when) { burst(white, .5, "bandpass", 1500, 1.4, .05 * vol, p, when || ac.currentTime); };   // the scarf in a gust
    A.splash = function (vol, p, when) { burst(white, .5, "bandpass", 2000, .8, .09 * vol, p, when || ac.currentTime); };

    A.hold = function (vol, p, hand, when) {                                 // a hand or a boot finds the rock: a scrape and a dull knock
      var t = when || ac.currentTime; burst(white, .09, "bandpass", hand ? 2600 : 1900, 2.4, .07 * vol, p, t); burst(brown, .14, "lowpass", 380, .8, (hand ? .5 : .65) * vol, p, t + .01);
      var o = osc("sine", hand ? 118 : 90), g = gain(0); o.connect(g); g.connect(sfxBus); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.1 * vol, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + .13); o.start(t); o.stop(t + .16);
    };
    A.rope = function (vol, when) { var t = when || ac.currentTime; burst(white, .28, "bandpass", 760, 7, .05 * vol, -.2, t); burst(white, .18, "bandpass", 1500, 5, .025 * vol, -.2, t + .08); };
    A.breath = function (vol, when) {                                         // an in-breath through the teeth, then out
      var t = when || ac.currentTime, s = ac.createBufferSource(); s.buffer = white; var f1 = filt("bandpass", 1500, .9), g = gain(0), pp = pan(0); s.connect(f1); f1.connect(g); g.connect(pp); pp.connect(sfxBus);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.035 * vol, t + .3); g.gain.linearRampToValueAtTime(.006 * vol, t + .42); g.gain.linearRampToValueAtTime(.03 * vol, t + .62); g.gain.exponentialRampToValueAtTime(.0001, t + 1.1); f1.frequency.setValueAtTime(1500, t); f1.frequency.linearRampToValueAtTime(900, t + 1.0); s.start(t, Math.random() * 2); s.stop(t + 1.15);
    };
    A.pebbles = function (vol, p, when) { var t = when || ac.currentTime, n = 4 + Math.floor(Math.random() * 4), tt = t; for (var i = 0; i < n; i++) { tt += .05 + i * .05 + Math.random() * .04; burst(white, .035, "bandpass", 2000 + Math.random() * 3000, 5, .05 * vol * (1 - i / (n + 1)), p, tt); } };
    A.hawk = function (p, vol, when) {                                        // a long falling whistle, far away
      var t = when || ac.currentTime, o = osc("sawtooth", 2900), f1 = filt("bandpass", 2400, 6), g = gain(0), pp = pan(p); o.connect(f1); f1.connect(g); g.connect(pp); pp.connect(sfxBus);
      o.frequency.setValueAtTime(3000, t); o.frequency.exponentialRampToValueAtTime(1500, t + .9); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.022 * vol, t + .12); g.gain.exponentialRampToValueAtTime(.0001, t + 1.0); o.start(t); o.stop(t + 1.1);
    };

    // ───────────── the song ─────────────
    function note(type, midi, t, dur, vol, atk, rel, dest, p, detune) {
      var o = osc(type, mtof(midi), detune), g = gain(0), pp = pan(p); o.connect(g); g.connect(pp); pp.connect(dest);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + atk); g.gain.setTargetAtTime(0, t + dur, rel / 3); o.start(t); o.stop(t + dur + rel + .2); return g;
    }
    A.bar = function (n, t, I) {                                             // schedule bar n starting at time t; I = intensity 0..1
      var sc2 = A.scene === 1, PR = sc2 ? PROG2 : PROG, PL = sc2 ? POOL2 : POOL, ch = PR[n % PR.length], r = mulberry(1000 + n * 31 + Math.floor(n / PROG.length) * 7), swell = .55 + .6 * I;
      // pad: a slow swell of warm detuned saws
      var padF = filt("lowpass", 520 + 900 * I, .5), padG = gain(1); padF.connect(padG); padG.connect(songBus);
      ch.t.forEach(function (m, i) {
        [-7, 6].forEach(function (c) { var o = osc("sawtooth", mtof(m), c), g = gain(0); o.connect(g); g.connect(padF); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.017 * swell, t + 1.7); g.gain.setTargetAtTime(0, t + BAR - .2, .7); o.start(t); o.stop(t + BAR + 3.2); });
      });
      // bass: one soft sine per bar
      var bf = filt("lowpass", 260); bf.connect(songBus); note("sine", ch.b, t, BAR - .3, .12 * (.75 + .35 * I), .06, .9, bf, 0);
      // the lonely melody: a music box in the A minor pentatonic; it begins almost alone
      var rhythm = RHY[n < 2 ? 0 : Math.floor(r() * RHY.length)], idx = 3 + Math.floor(r() * 3), idxMax = PL.length - 1;
      rhythm.forEach(function (beat, k) {
        idx = Math.max(0, Math.min(idxMax, idx + [-2, -1, -1, 0, 1, 1, 2][Math.floor(r() * 7)])); var m = PL[idx];
        if (k === rhythm.length - 1) { var tones = ch.t.map(function (x) { return x + 12; }).filter(function (x) { return x >= 64 && x <= 84; }); if (tones.length) m = tones[Math.floor(r() * tones.length)]; }
        var tt = t + beat * BEAT, v = (.05 + r() * .03) * (.75 + .5 * I), pp = (r() - .5) * .6;
        var g1 = note("sine", m, tt, 2.0, v, .004, 1.1, songBus, pp); note("triangle", m + 12, tt, 1.0, v * .16, .004, .6, songBus, pp); note("sine", m + 19.02, tt, .5, v * .05, .003, .3, songBus, pp);
      });
      // scene 2: a heartbeat under everything, a lub-dub every beat that grows with the effort
      if (sc2) for (var hb = 0; hb < 4; hb++) { var th = t + hb * BEAT; [[0, 1], [.2, .65]].forEach(function (q) { var o = osc("sine", 62), g = gain(0), ff = filt("lowpass", 160); o.frequency.setValueAtTime(70, th + q[0]); o.frequency.exponentialRampToValueAtTime(40, th + q[0] + .16); o.connect(ff); ff.connect(g); g.connect(songBus); g.gain.setValueAtTime(0, th + q[0]); g.gain.linearRampToValueAtTime(.16 * q[1] * (.45 + .7 * I), th + q[0] + .012); g.gain.exponentialRampToValueAtTime(.0001, th + q[0] + .24); o.start(th + q[0]); o.stop(th + q[0] + .3); }); }
      // a quiet arpeggio of sparkles joins after the first bars, and thickens as the mountain nears
      if (n >= 3 || I > .15) {
        var seq = ch.t.concat(ch.t.map(function (x) { return x + 12; })), step = I > .4 ? .5 : 1;
        for (var b = 0; b < 4; b += step) { if (r() < .22) continue; var m2 = seq[Math.floor((b / step + n) % seq.length)] + 12; note("sine", m2, t + b * BEAT + BEAT * .5 * (step === 1 ? 0 : 0), .5, .011 + .014 * I, .004, .4, songBus, Math.sin(b + n) * .5); }
      }
      // strings: a warm line of saws that rises with intensity, a little vibrato, the emotion lifting
      if (I > .38) {
        var sf = filt("bandpass", 1100, .8), sg = gain(1), vib = osc("sine", 5.1), vg = gain(5); vib.connect(vg); sf.connect(sg); sg.connect(songBus);
        ch.t.slice(0, 3).forEach(function (m) { var o = osc("sawtooth", mtof(m + 12)), g = gain(0); vg.connect(o.detune); o.connect(g); g.connect(sf); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.012 * (I - .3), t + 1.5); g.gain.setTargetAtTime(0, t + BAR - .3, .6); o.start(t); o.stop(t + BAR + 2.5); });
        vib.start(t); vib.stop(t + BAR + 2.5);
      }
    };

    // live playback: schedule a bar at a time, always a little ahead
    var timer = 0, nextT = 0, barN = 0, running = false;
    A.play = function () {
      if (running) return; running = true; nextT = ac.currentTime + .25; barN = 0;
      master.gain.setTargetAtTime(1.25, ac.currentTime, 1.2);
      timer = setInterval(function () { while (nextT < ac.currentTime + 1.6) { A.bar(barN++, nextT, A.intensity || 0); nextT += BAR; } }, 250);
    };
    A.halt = function () { running = false; clearInterval(timer); master.gain.setTargetAtTime(0, ac.currentTime, .5); };
    A.mute = function (m) { master.gain.setTargetAtTime(m ? 0 : 1.25, ac.currentTime, .3); };
    A.intensity = 0;
    return A;
  }

  var Snd = { _a: null, on: false };
  Snd.start = function () {
    if (Snd._a) { Snd._a.ac.resume && Snd._a.ac.resume(); Snd._a.mute(false); Snd.on = true; return; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    var ac = new AC(); Snd._a = build(ac, ac.destination); Snd._a.play(); Snd._a.setCrickets(1); Snd.on = true;
    // iPhones mute Web Audio when the silent switch is on, unless an audio element has started a playback session
    try { var el = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"); el.loop = true; el.play().catch(function () {}); } catch (e) {}
  };
  Snd.mute = function (m) { if (Snd._a) Snd._a.mute(m); Snd.on = !m; };
  ["update", "step", "chirp", "tink", "swoosh", "splash", "hold", "rope", "breath", "pebbles", "hawk"].forEach(function (k) { Snd[k] = function () { if (Snd._a && Snd.on) return Snd._a[k].apply(Snd._a, arguments); }; });
  document.addEventListener("visibilitychange", function () { if (Snd._a) { if (document.hidden) Snd._a.ac.suspend(); else if (Snd.on) Snd._a.ac.resume(); } });

  /* Offline render, used by the tests: the song plus the world, with a scripted sequence of footsteps, birds and chimes. Returns an AudioBuffer. */
  Snd.offline = function (seconds, rate) {
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext, ac = new OAC(2, Math.floor(seconds * rate), rate), A = build(ac, ac.destination, { fast: true });
    A.master.gain.value = 1.25; A.setCrickets(1); var n = 0; for (var t = 0; t < seconds; t += BAR) A.bar(n++, t, Math.min(1, t / seconds));
    A.update({ gust: .4, river: .6, riverPan: .3, intensity: .5, fog: .5 });
    for (var s = 2; s < seconds - 2; s += .62) A.step(s % 3 < 1.8 ? "grass" : (s % 3 < 2.4 ? "stone" : "water"), .8, -.2 + (s / seconds) * .6, s);
    for (var b = 5; b < seconds; b += 9) A.chirp(.5, .8, b);
    for (var c = 3; c < seconds; c += 2.7) A.tink([76, 79, 81, 84, 72][Math.floor(c) % 5], Math.sin(c), .8, c);
    A.swoosh(.8, .3, 12);
    return ac.startRendering();
  };
  window.Snd = Snd;
})();

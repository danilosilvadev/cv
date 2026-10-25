/* The painted walk. When art/web/ holds painted frames, each stop of the page shows its painting: stills crossfade as you scroll,
 * push in like a walk, and the frame at "the turn" flips over (the 3D camera rolls half a turn there). Sections pick a frame with the same
 * data-cam key the 3D camera uses. A stop without a frame keeps the live 3D world, which stays underneath; when every stop has a frame
 * the 3D engine is never downloaded. Open with #s=<float> to freeze one frame between stops (same as the 3D scene). */
(function () {
  "use strict";
  var root = document.documentElement, box = document.getElementById("paint");
  var Painted = window.Painted = { complete: false, count: 0, start: start, stop: stop, whenReady: whenReady };
  var waiters = [], ready = false;
  function whenReady(fn) { if (ready) fn(Painted); else waiters.push(fn); }
  function done() { ready = true; waiters.splice(0).forEach(function (fn) { fn(Painted); }); }
  if (!box || !window.fetch) { done(); return; }

  var FOCUS = { forest: 50, turn: 50, gate: 38, p1: 25, p2: 25, p3: 25, p4: 25, p5: 25, rose: 25 };   // where the subject sits across a painting (%); the default is 30
  var DIR = "art/web/", ZOOM = .06, FLIP = box.getAttribute("data-flip") === "1";
  var small = window.matchMedia("(max-width: 760px)").matches || window.matchMedia("(pointer: coarse)").matches;
  var frozen = /s=([\d.]+)/.exec(location.hash);
  if (/bare/.test(location.hash)) root.classList.add("bare");

  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
  function sm(t) { return t * t * (3 - 2 * t); }

  var seq = [].slice.call(document.querySelectorAll("[data-cam]")).map(function (el) { return { el: el, key: el.getAttribute("data-cam") }; });
  var files = {}, layers = {}, cur = { s: 0 }, last = 0, raf = 0, running = false, px = 0, py = 0, tx = 0, ty = 0;

  function target() {
    if (!seq.length) return 0;
    var y = window.scrollY, mid = y + window.innerHeight * .5;
    var cs = seq.map(function (s) { var r = s.el.getBoundingClientRect(); return y + r.top + r.height / 2; });
    if (mid <= cs[0]) return 0;
    for (var i = 0; i < seq.length - 1; i++) if (mid < cs[i + 1]) return i + (mid - cs[i]) / (cs[i + 1] - cs[i]);
    return seq.length - 1;
  }

  /* one <img> per frame, created only near the current stop so phones never hold all 21 decoded paintings */
  function portrait() { return window.innerWidth < window.innerHeight * 1.1; }
  function focus(im, j) { im.style.objectPosition = portrait() ? (FOCUS[seq[j].key] || 30) + "% 50%" : ""; }   // on a phone, centre the crop on the subject, not the middle
  window.addEventListener("resize", function () { Object.keys(layers).forEach(function (k) { focus(layers[k], k); }); });
  function ensure(j) {
    var key = seq[j] && seq[j].key;
    if (!key || !files[key]) return null;
    if (layers[j]) return layers[j];
    var im = new Image();
    im.alt = ""; im.decoding = "async"; im.src = DIR + files[key] + (small ? "-m" : "") + ".webp";
    focus(im, j); box.appendChild(im); layers[j] = im; return im;
  }
  function loaded(im) { return !!im && im.complete && im.naturalWidth > 0; }
  function around(i) {
    for (var j = i - 1; j <= i + 2; j++) ensure(j);
    Object.keys(layers).forEach(function (k) { if (Math.abs(k - i) > 3) { box.removeChild(layers[k]); delete layers[k]; } });
  }

  /* the world turns over at the "turn" stop: half a turn arriving, another half leaving (the picture is symmetric, so it ends upright) */
  function rotation(key, d) { if (key !== "turn") return 0; return d <= 0 ? 180 * sm(clamp(d + 1, 0, 1)) : 180 + 180 * sm(clamp(d, 0, 1)); }

  function place(j, opacity, time) {
    var im = layers[j]; if (!im) return;
    var d = cur.s - j, key = seq[j].key, rot = rotation(key, d), sc = 1 + ZOOM * (clamp(d, -1, 1) + 1);
    var x = tx * (1.1 + clamp(d, -1, 1) * .5) + Math.sin(time * .21 + j) * .3, y = ty * .7 + Math.cos(time * .17 + j) * .25;
    im.style.opacity = opacity.toFixed(3);
    im.style.transform = "translate3d(" + x.toFixed(3) + "%," + y.toFixed(3) + "%,0) rotate(" + rot.toFixed(2) + "deg) scale(" + ((FLIP ? -sc : sc).toFixed(4)) + "," + sc.toFixed(4) + ")";
    // a rotated 16:9 picture shows corners; fade them out with a disc while it turns
    var u = Math.abs(Math.sin(rot * Math.PI / 180)), mask = "none";
    if (key === "turn" && u > .001) { var R = (1 - u) * 150 + u * 50; mask = "radial-gradient(circle at 50% 50%,#000 " + (R * .78).toFixed(1) + "vh,transparent " + R.toFixed(1) + "vh)"; }
    im.style.webkitMaskImage = im.style.maskImage = mask;
  }

  function render(time) {
    var n = seq.length; if (n < 2) return;
    var s = clamp(cur.s, 0, n - 1), i = Math.min(n - 2, Math.floor(s)), f = s - i;
    around(i);
    var a = layers[i], b = layers[i + 1], hasA = loaded(a), hasB = loaded(b);
    var sf = sm(clamp((f - .3) / .4, 0, 1));                       // hold each painting, then crossfade through the middle of the walk
    Object.keys(layers).forEach(function (k) { if (+k !== i && +k !== i + 1) layers[k].style.opacity = "0"; });
    place(i, hasA ? (hasB ? 1 : 1 - sf) : 0, time);                // outgoing stays opaque underneath, so there is never a dip to black
    place(i + 1, hasB ? sf : 0, time);                              // a missing neighbour lets the 3D canvas show through instead
  }

  function frame(ms) {
    raf = window.requestAnimationFrame(frame);
    var dt = Math.min(.05, (ms - last) / 1000 || 0); last = ms;
    if (!frozen) { var t = target(); if (Math.abs(t - cur.s) > 4) cur.s = t; else cur.s += (t - cur.s) * (1 - Math.pow(.0009, dt)); }
    tx += (px - tx) * (1 - Math.pow(.02, dt)); ty += (py - ty) * (1 - Math.pow(.02, dt));
    render(frozen ? 0 : ms / 1000);
  }

  /* after the page is idle, fetch the remaining paintings at low priority so scrolling never waits on a download */
  function prefetch() {
    var urls = Object.keys(files).map(function (k) { return DIR + files[k] + (small ? "-m" : "") + ".webp"; }), n = 0;
    (function next() {
      if (n >= urls.length) return;
      var go = function () { fetch(urls[n++], { priority: "low" }).catch(function () {}).then(next); };
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
    files = (m && m.frames) || {};
    Painted.count = seq.filter(function (s) { return files[s.key]; }).length;
    Painted.complete = Painted.count === seq.length && seq.length > 1;
    cur.s = frozen ? parseFloat(frozen[1]) : target();
    if (Painted.count && !frozen) window.setTimeout(prefetch, 1500);
  }).catch(function () { files = {}; }).then(done);
})();

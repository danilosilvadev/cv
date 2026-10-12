/* DANILO SILVA — CV. Motion is an enhancement: every state below is added by script, so the page is a plain document without it.
 * Fine pointer: a cursor ring, magnetic buttons, a spotlight that follows the mouse. Reduced motion, ?static or no scripts: none of it runs. */
(function () {
  "use strict";
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ── always on: year, local time, copy-to-clipboard, card spotlight ── */
  var yr = $("#yr"); if (yr) yr.textContent = String(new Date().getFullYear());
  var clock = $("#clock");
  if (clock && window.Intl) {
    var fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
    var tick = function () { clock.textContent = fmt.format(new Date()) + " local time"; };
    tick(); setInterval(tick, 30000);
  }
  $$("[data-copy]").forEach(function (b) {
    var label = b.textContent;
    b.addEventListener("click", function () {
      var done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = label; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(b.getAttribute("data-copy")).then(done, function () { window.location.href = "mailto:" + b.getAttribute("data-copy"); });
      else window.location.href = "mailto:" + b.getAttribute("data-copy");
    });
  });
  $$(".card").forEach(function (c) {
    c.addEventListener("pointermove", function (e) { var r = c.getBoundingClientRect(); c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px"); });
  });

  /* ── is motion on? ── */
  var gsap = window.gsap, ST = window.ScrollTrigger;
  if (!root.classList.contains("js") || !gsap || !ST) { root.classList.remove("js"); root.classList.add("static"); return; }

  var lenis = null;
  var intro = $("#intro");

  function fallback(err) {
    if (window.console) console.error("cv: motion disabled -", err);
    try { ST.getAll().forEach(function (t) { t.kill(); }); } catch (e) { /* nothing to kill */ }
    try { gsap.killTweensOf("*"); gsap.set("[data-reveal],[data-hero],.name .line>span,.statement .w,.sys *,#track,.role,.bar,.hero-in,#field", { clearProps: "all" }); } catch (e) { /* ignore */ }
    root.classList.remove("js"); root.classList.add("static");
    if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    if (lenis) { try { lenis.destroy(); } catch (e) { /* ignore */ } }
  }

  try {
    gsap.registerPlugin(ST);
    var fine = window.matchMedia("(hover:hover) and (pointer:fine)").matches;

    /* ── smooth scrolling, driven by GSAP's ticker so pinned scenes stay in step ── */
    if (window.Lenis) {
      lenis = new window.Lenis({ duration: 1.1, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
      lenis.on("scroll", ST.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      lenis.stop();
    }
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href"); if (id.length < 2) return;
        var target = id === "#top" ? 0 : $(id); if (target === null) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { duration: 1.4 });
        else if (target === 0) window.scrollTo({ top: 0, behavior: "smooth" }); else target.scrollIntoView({ behavior: "smooth" });
      });
    });

    /* ── starting states (the intro covers the page while these are set) ── */
    gsap.set(".name .line>span", { yPercent: 112 });
    gsap.set("[data-hero]", { opacity: 0, y: 22 });
    gsap.set(".bar", { opacity: 0 });

    /* ── the flow field behind the hero ── */
    var canvas = $("#field");
    if (canvas) startField(canvas);

    /* ── the statement: each word comes up as you read ── */
    var st = $("#statement");
    if (st) {
      var words = splitWords(st);
      gsap.to(words, { opacity: 1, stagger: 0.12, ease: "none", scrollTrigger: { trigger: st, start: "top 80%", end: "bottom 55%", scrub: 0.5 } });
    }

    /* ── generic reveals ── */
    $$("[data-reveal]").forEach(function (el) {
      gsap.from(el, { y: 34, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
    });

    /* ── counters ── */
    $$("[data-count]").forEach(function (el) {
      var end = Number(el.getAttribute("data-count")), suf = el.getAttribute("data-suffix") || "", o = { v: 0 };
      el.textContent = "0" + suf;
      ST.create({ trigger: el, start: "top 92%", once: true, onEnter: function () {
        gsap.to(o, { v: end, duration: 2.2, ease: "power2.out", onUpdate: function () { el.textContent = Math.round(o.v).toLocaleString("en-US") + suf; } });
      } });
    });

    /* ── the hero leaves quietly; the field dims behind the text sections ── */
    gsap.to(".hero-in", { y: -70, opacity: 0.1, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 15%", scrub: true } });
    gsap.to("#field", { opacity: 0.26, ease: "none", scrollTrigger: { trigger: ".hero", start: "55% top", end: "bottom top", scrub: true } });

    /* ── progress line and the active section in the bar ── */
    gsap.to(".progress i", { scaleX: 1, ease: "none", scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.2 } });
    ["about", "build", "antiloki", "how", "path", "contact"].forEach(function (id) {
      var link = $('[data-nav="' + id + '"]'), sec = document.getElementById(id); if (!link || !sec) return;
      ST.create({ trigger: sec, start: "top 55%", end: "bottom 55%", onToggle: function (self) { link.classList.toggle("on", self.isActive); } });
    });

    /* ── pinned scenes, on wide screens only; narrow screens read as a plain page ── */
    var mm = gsap.matchMedia();
    var draws = $$(".sys .draw");
    mm.add("(min-width: 900px)", function () {
      draws.forEach(function (p) { var L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
      // fromTo with explicit ends, and no invalidateOnRefresh: a `from` tween re-read after a refresh takes the hidden state as its end value and never shows
      var tl = gsap.timeline({ scrollTrigger: { trigger: ".sys", start: "top 12%", end: "+=115%", pin: true, scrub: 0.7, anticipatePin: 1, refreshPriority: 1 } });
      tl.fromTo(".sys .seat", { opacity: 0, x: -26 }, { opacity: 1, x: 0, stagger: 0.1, duration: 0.4 })
        .to(".sys .wires .draw:nth-child(-n+5)", { strokeDashoffset: 0, stagger: 0.1, duration: 0.6 }, "<0.15")
        .fromTo(".sys .router", { opacity: 0, scale: 0.94, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.5 }, "-=0.3")
        .to(".sys .wires .draw:nth-child(6)", { strokeDashoffset: 0, duration: 0.4 })
        .fromTo(".sys .pipe .frame, .sys .pipe > text", { opacity: 0 }, { opacity: 1, duration: 0.4 }, "<")
        .fromTo(".sys .stage", { opacity: 0, x: -20 }, { opacity: 1, x: 0, stagger: 0.18, duration: 0.4 })
        .to(".sys .wires .draw:nth-child(7)", { strokeDashoffset: 0, duration: 0.4 })
        .fromTo(".sys .result", { opacity: 0, scale: 0.92, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.5 })
        .fromTo(".sys .caption", { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: 0.25, duration: 0.5 }, "-=0.2");

      var track = $("#track"), pin = $(".path-pin");
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth + 48); };
      gsap.to(track, { x: function () { return -dist(); }, ease: "none", scrollTrigger: { trigger: pin, start: "top top", end: function () { return "+=" + dist(); }, pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 1 } });
    });
    mm.add("(max-width: 899px)", function () {
      draws.forEach(function (p) { var L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
      gsap.timeline({ scrollTrigger: { trigger: ".sys", start: "top 80%", once: true } })
        .fromTo(".sys .seat,.sys .router,.sys .stage,.sys .result", { opacity: 0, y: 10 }, { opacity: 1, y: 0, stagger: 0.06, duration: 0.5 })
        .to(draws, { strokeDashoffset: 0, stagger: 0.08, duration: 0.7 }, "<0.2");
    });

    /* ── fine pointer: cursor, magnet, spotlight ── */
    if (fine) {
      var cur = $(".cursor"), spot = $(".spot");
      var cx = gsap.quickTo(cur, "x", { duration: 0.35, ease: "power3" }), cy = gsap.quickTo(cur, "y", { duration: 0.35, ease: "power3" });
      gsap.set(cur, { opacity: 0 });
      window.addEventListener("pointermove", function (e) {
        gsap.to(cur, { opacity: 1, duration: 0.3, overwrite: "auto" });
        cx(e.clientX); cy(e.clientY);
        if (spot) { spot.style.setProperty("--x", e.clientX + "px"); spot.style.setProperty("--y", e.clientY + "px"); }
      }, { passive: true });
      document.addEventListener("pointerover", function (e) { cur.classList.toggle("big", !!(e.target.closest && e.target.closest("a,button,.card"))); });
      document.addEventListener("pointerleave", function () { gsap.to(cur, { opacity: 0, duration: 0.3 }); });
      $$(".magnet").forEach(function (el) {
        var xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" }), yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });
        el.addEventListener("pointermove", function (e) { var r = el.getBoundingClientRect(); xTo((e.clientX - (r.left + r.width / 2)) * 0.25); yTo((e.clientY - (r.top + r.height / 2)) * 0.35); });
        el.addEventListener("pointerleave", function () { xTo(0); yTo(0); });
      });
    }

    /* ── the opening: a line draws, the curtain lifts, the name rises ── */
    var seen = false; try { seen = sessionStorage.getItem("cv-intro") === "1"; } catch (e) { /* private window */ }
    var begin = function () { if (lenis) lenis.start(); if (intro && intro.parentNode) intro.parentNode.removeChild(intro); };
    var open = gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: begin });
    if (!seen) {
      gsap.set(".intro-mark", { opacity: 0, y: 18 });
      open.to(".intro-mark", { opacity: 1, y: 0, duration: 0.8 })
          .to(".intro-line i", { scaleX: 1, duration: 0.95, ease: "power2.inOut" }, "-=0.3")
          .to(".intro-cap", { opacity: 1, duration: 0.5 }, "-=0.55")
          .to(".intro-in", { opacity: 0, y: -10, duration: 0.45 }, "+=0.25")
          .to(intro, { yPercent: -100, duration: 0.95, ease: "power4.inOut" });
      try { sessionStorage.setItem("cv-intro", "1"); } catch (e) { /* ignore */ }
    } else {
      open.to(intro, { opacity: 0, duration: 0.35 });
    }
    open.to(".name .line>span", { yPercent: 0, duration: 1.25, stagger: 0.12, ease: "power4.out" }, seen ? "-=0.1" : "-=0.5")
        .to("[data-hero]", { opacity: 1, y: 0, duration: 0.9, stagger: 0.12 }, "-=0.85")
        .to(".bar", { opacity: 1, duration: 0.8 }, "-=0.9");

    var ready = function () { ST.refresh(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready);
    window.addEventListener("load", ready);
    setTimeout(function () { if (intro && intro.parentNode) begin(); }, 7000);   // never trap the page behind the curtain
  } catch (err) {
    fallback(err);
  }

  /* ── helpers ── */
  function splitWords(el) {
    var text = el.textContent.replace(/\s+/g, " ").trim();
    el.textContent = "";
    var parts = text.split(" ");
    parts.forEach(function (w, i) {
      var s = document.createElement("span"); s.className = "w"; s.textContent = w + (i < parts.length - 1 ? " " : ""); el.appendChild(s);
    });
    return $$(".w", el);
  }

  /* A slow flow field: thin trails following a smooth noise, pushed aside by the pointer. Quiet by design. */
  function startField(c) {
    var ctx = c.getContext("2d", { alpha: false });
    var W = 0, H = 0, dpr = 1, parts = [], t = 0, frame = 0;
    var mouse = { x: -9999, y: -9999 };
    function spawn() { return { x: Math.random() * W, y: Math.random() * H, life: 0, max: 120 + Math.random() * 280, s: 0.5 + Math.random() * 0.9, k: Math.random() < 0.2 ? 1 : 0 }; }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = window.innerWidth; H = window.innerHeight;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#0a0a0b"; ctx.fillRect(0, 0, W, H);
      var n = Math.round(Math.min(880, Math.max(200, (W * H) / 2800)));
      parts = []; for (var i = 0; i < n; i++) parts.push(spawn());
    }
    function angle(x, y) { return (Math.sin(x * 0.0021 + t * 0.00012) + Math.cos(y * 0.0027 - t * 0.00009) + Math.sin((x + y) * 0.0013 + t * 0.00006)) * 1.15; }
    function step() {
      window.requestAnimationFrame(step);
      if (document.hidden) return;
      frame++;
      if (window.scrollY > window.innerHeight * 1.2 && frame % 4) return;   // far from the hero: a quarter of the work
      t += 16;
      ctx.fillStyle = "rgba(10,10,11,0.07)"; ctx.fillRect(0, 0, W, H);
      var pa = new Path2D(), pb = new Path2D();
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i], a = angle(p.x, p.y);
        var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 24000) { var d = Math.sqrt(d2) || 1, f = 1 - d2 / 24000; p.x += (dx / d) * f * 2.6; p.y += (dy / d) * f * 2.6; }
        var path = p.k ? pb : pa;
        path.moveTo(p.x, p.y);
        p.x += Math.cos(a) * p.s * 1.4; p.y += Math.sin(a) * p.s * 1.4; p.life++;
        path.lineTo(p.x, p.y);
        if (p.life > p.max || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) parts[i] = spawn();
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(236,235,232,0.12)"; ctx.stroke(pa);
      ctx.strokeStyle = "rgba(200,164,106,0.22)"; ctx.stroke(pb);
    }
    resize();
    var rt = 0; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 150); });
    window.addEventListener("pointermove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    document.addEventListener("pointerleave", function () { mouse.x = mouse.y = -9999; });
    window.requestAnimationFrame(step);
  }
})();

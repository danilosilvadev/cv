/* DANILO SILVA — CV. Page behaviour: reveals, progress, active section, the Plain CV switch, and loading the 3D scene on demand.
 * The scene (assets/descent.js) is an enhancement; every section is real HTML text without it. */
(function () {
  "use strict";
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ── always on: year, local time, copy-to-clipboard ── */
  var yr = $("#yr"); if (yr) yr.textContent = String(new Date().getFullYear());
  var clock = $("#clock");
  if (clock && window.Intl) {
    var fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
    var tick = function () { clock.textContent = fmt.format(new Date()) + " local"; };
    tick(); setInterval(tick, 30000);
  }
  $$("[data-copy]").forEach(function (b) {
    var label = b.textContent;
    b.addEventListener("click", function () {
      var done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = label; }, 1800); };
      var addr = b.getAttribute("data-copy");
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(addr).then(done, function () { window.location.href = "mailto:" + addr; });
      else window.location.href = "mailto:" + addr;
    });
  });

  /* ── the scene: painted frames when art/web/ has them, the live 3D world for any stop that has none; loaded only when it will be used ── */
  var loading = false, painting = false;
  var add = function (src, next) { var s = document.createElement("script"); s.src = src; s.onload = next; s.onerror = function () { loading = painting = false; setPlain(true, false); }; document.body.appendChild(s); };
  function ensureThree() {
    if (window.Descent) { window.Descent.start(); return; }
    if (loading) return; loading = true;
    add("vendor/three.min.js", function () { add("assets/descent.js", function () { loading = false; }); });
  }
  function loadScene() {
    if (window.Painted) { window.Painted.start(); if (!window.Painted.complete) ensureThree(); return; }
    if (painting) return; painting = true;
    add("assets/painted.js", function () {
      window.Painted.whenReady(function (P) {
        painting = false; if (root.classList.contains("plain")) return;
        if (P.count) P.start();
        if (!P.complete) ensureThree();        // every stop painted: the 3D engine is never downloaded
      });
    });
  }

  /* ── Plain CV switch ── */
  var btns = [$("#plainbtn"), $("#plainbtn2")].filter(Boolean);
  function label(plain) { btns.forEach(function (b) { b.setAttribute("aria-pressed", String(plain)); b.textContent = plain ? "3D view" : "Plain CV"; }); }
  function setPlain(plain, remember) {
    root.classList.toggle("plain", plain); root.classList.toggle("js", !plain);
    label(plain);
    if (remember) { try { localStorage.setItem("cv-plain", plain ? "1" : "0"); } catch (e) { /* private window */ } }
    if (plain) { if (window.Descent) window.Descent.stop(); if (window.Painted) window.Painted.stop(); }
    else { $$(".rv").forEach(function (el) { el.classList.add("in"); }); loadScene(); }
  }
  btns.forEach(function (b) { b.addEventListener("click", function () { setPlain(!root.classList.contains("plain"), true); }); });
  label(root.classList.contains("plain"));
  window.addEventListener("error", function (e) { if (e && e.filename && /descent\.js|three\.min\.js|painted\.js/.test(e.filename)) setPlain(true, false); });
  if (!root.classList.contains("plain")) loadScene();

  /* ── reveal on scroll ── */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
    $$(".rv").forEach(function (el) { io.observe(el); });
  } else { $$(".rv").forEach(function (el) { el.classList.add("in"); }); }

  /* ── progress line, active section in the bar and the circle gauge ── */
  var bar = $(".progress i");
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    window.requestAnimationFrame(function () {
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      if (bar) bar.style.transform = "scaleX(" + Math.min(1, Math.max(0, window.scrollY / max)) + ")";
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  if ("IntersectionObserver" in window) {
    var mark = function (el) {
      var grp = el.getAttribute("data-grp") || "", w = el.getAttribute("data-w") || "";
      $$("[data-nav]").forEach(function (a) { a.classList.toggle("on", a.getAttribute("data-nav") === grp); });
      $$("[data-g]").forEach(function (a) { a.classList.toggle("on", a.getAttribute("data-g") === w); });
    };
    var sec = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) mark(e.target); }); }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main [data-cam]").forEach(function (s) { sec.observe(s); });
  }
})();

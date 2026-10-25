/* "Ask me" — the chat panel's behaviour. The page holds no keys and no model: questions go to ASK_ENDPOINT,
 * a small server that answers only from the CV material. Until that endpoint exists the panel says so, and nothing is sent. */
(function () {
  "use strict";
  var ASK_ENDPOINT = ""; // e.g. "https://ask.example.com/api/chat" once the server exists

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var launch = $("#ask-launch"), panel = $("#ask-panel");
  if (!launch || !panel) return;
  // no server yet: keep the chat hidden on the live site (add ?ask to the address to preview it)
  if (!ASK_ENDPOINT && !/[?&]ask/.test(location.search)) { launch.hidden = true; panel.hidden = true; return; }

  var log = $("#ask-log"), input = $("#ask-input"), send = $("#ask-send"), stage = $("#ask-stage");
  var voiceBtn = $("#ask-voice"), mode = "ask", history = [], busy = false;

  function open(v) {
    panel.hidden = !v; launch.hidden = v;
    launch.setAttribute("aria-expanded", String(v));
    if (v) input.focus();
  }
  launch.addEventListener("click", function () { open(true); });
  $("#ask-close").addEventListener("click", function () { open(false); launch.focus(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) { open(false); launch.focus(); } });

  $$("[data-ask-mode]").forEach(function (b) {
    b.addEventListener("click", function () {
      mode = b.getAttribute("data-ask-mode");
      $$("[data-ask-mode]").forEach(function (x) { x.classList.toggle("on", x === b); });
      line("sys", mode === "interview" ? "Interview mode: I will ask you questions back." : "Ask mode: ask me anything about my work.");
    });
  });

  // Voice is a preference now; the speaking state below is driven by the same flag later.
  voiceBtn.addEventListener("click", function () {
    var on = voiceBtn.getAttribute("aria-pressed") !== "true";
    voiceBtn.setAttribute("aria-pressed", String(on));
    voiceBtn.textContent = "Voice · " + (on ? "on" : "off");
  });

  $$("[data-ask-q]").forEach(function (b) {
    b.addEventListener("click", function () { ask(b.getAttribute("data-ask-q")); });
  });

  send.addEventListener("click", function () { ask(input.value); });
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); ask(input.value); } });

  function line(kind, text, src) {
    var el = document.createElement("div");
    el.className = kind === "sys" ? "ask-sys" : "ask-m " + kind;
    el.textContent = text;
    if (src) { var s = document.createElement("span"); s.className = "src mono"; s.textContent = src; el.appendChild(s); }
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function speaking(on) { stage.classList.toggle("speaking", !!on); }

  function ask(raw) {
    var q = String(raw || "").trim();
    if (!q || busy) return;
    input.value = "";
    line("me", q);
    history.push({ role: "user", content: q });

    if (!ASK_ENDPOINT) {
      line("ai", "The AI is not connected yet. The server that answers from my material is not set up, so nothing was sent anywhere. Meanwhile, the projects above are the best place to start.");
      history.pop();
      return;
    }

    busy = true; send.disabled = true;
    var thinking = line("ai", "…");
    fetch(ASK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: mode, messages: history.slice(-12) })
    })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) {
        var reply = String(data && data.reply || "").trim() || "No answer came back.";
        thinking.textContent = reply;
        if (data && data.source) { var s = document.createElement("span"); s.className = "src mono"; s.textContent = data.source; thinking.appendChild(s); }
        history.push({ role: "assistant", content: reply });
        speaking(true); setTimeout(function () { speaking(false); }, Math.min(6000, 1200 + reply.length * 25));
      })
      .catch(function () {
        thinking.className = "ask-m err";
        thinking.textContent = "The AI could not answer just now. Try again in a moment.";
        history.pop();
      })
      .then(function () { busy = false; send.disabled = false; input.focus(); });
  }
})();

import { spawn } from "node:child_process"; import { writeFileSync } from "node:fs";
const [outdir, W, H, ...ys] = process.argv.slice(2);
const port = 9710 + Math.floor(Math.random() * 40);
const chrome = spawn("chromium", ["--no-sandbox", `--remote-debugging-port=${port}`, "--autoplay-policy=no-user-gesture-required", "--ozone-platform=wayland", "--enable-gpu-rasterization", "--ignore-gpu-blocklist", `--window-size=${W},${+H + 40}`, "--user-data-dir=/tmp/claude-1000/gpu-profile5", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let list;
for (let i = 0; i < 60; i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (list.find((t) => t.type === "page")) break; } catch {} await sleep(250); }
const ws = new WebSocket(list.find((t) => t.type === "page").webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true })).result?.result?.value;
await send("Page.enable"); await send("Runtime.enable"); await send("Emulation.setDeviceMetricsOverride", { width: +W, height: +H, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: "http://localhost:8000/lab/the-climb/?rf=" + Date.now() }); await sleep(3500);
await ev(`document.getElementById("gate-on").click()`); await sleep(2500);
// scroll straight to the end of the walk and let him actually walk there
await ev(`window.__setScroll && 0`);
for (const y of ys) {
  await ev(`scrollTo(0, ${y})`);
  // wait until he has really arrived (hero2.pos near the end) or give up
  for (let i = 0; i < 160; i++) { const st = JSON.parse(await ev(`JSON.stringify({a:__climb.hero2.pos, n:__climb.TRAIL.steps})`)); if (st.a > st.n - 1.2) break; await sleep(500); }
  await sleep(4000);
  const st = await ev(`JSON.stringify({pos:+__climb.hero2.pos.toFixed(1), steps:+__climb.TRAIL.steps.toFixed(1), fin:+__climb.fin().toFixed(2), y:Math.round(scrollY)})`);
  const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 85 }); writeFileSync(`${outdir}/rf_${y}.jpg`, Buffer.from(shot.result.data, "base64")); console.log(y, st);
}
chrome.kill(); process.exit(0);

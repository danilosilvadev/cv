import { spawn } from "node:child_process";
const port = 9800 + Math.floor(Math.random() * 90);
const chrome = spawn("chromium", ["--no-sandbox", `--remote-debugging-port=${port}`, "--autoplay-policy=no-user-gesture-required", "--ozone-platform=wayland", "--enable-gpu-rasterization", "--ignore-gpu-blocklist", "--window-size=1280,760", "--user-data-dir=/tmp/claude-1000/gpu-profile6", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let list;
for (let i = 0; i < 60; i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (list.find((t) => t.type === "page")) break; } catch {} await sleep(250); }
const ws = new WebSocket(list.find((t) => t.type === "page").webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true })).result?.result?.value;
await send("Page.enable"); await send("Runtime.enable"); await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: "http://localhost:8000/lab/the-climb/?w=1" }); await sleep(3500);
await ev(`document.getElementById("gate-on").click()`); await sleep(2500);
await ev(`document.getElementById("playbtn").click()`);
const rows = []; for (let i = 0; i < 80; i++) { await sleep(1000); rows.push(JSON.parse(await ev(`(function(){var h=__climb.hero;return JSON.stringify({y:Math.round(scrollY),pos:+h.pos.toFixed(2),vel:+h.vel.toFixed(2),amp:+h.amp.toFixed(2)})})()`))); }
console.log(rows.map(r => `${r.y} pos=${r.pos} vel=${r.vel} amp=${r.amp}`).join("\n")); chrome.kill(); process.exit(0);

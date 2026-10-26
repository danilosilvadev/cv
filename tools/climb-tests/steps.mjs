import { spawn } from "node:child_process";
const port = 9760 + Math.floor(Math.random() * 40);
const chrome = spawn("chromium", ["--headless=new", "--no-sandbox", `--remote-debugging-port=${port}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let list;
for (let i = 0; i < 60; i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (list.find((t) => t.type === "page")) break; } catch {} await sleep(250); }
const ws = new WebSocket(list.find((t) => t.type === "page").webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); const errs = []; ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } if (d.method === "Runtime.exceptionThrown") errs.push(d.params.exceptionDetails.exception?.description); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable"); await send("Runtime.enable"); await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: "http://localhost:8000/lab/the-climb/#p=0.1" }); await sleep(7000);
const r = await send("Runtime.evaluate", { expression: "JSON.stringify({uBrA:__climb.uBrA,uBrB:__climb.uBrB,uRock:__climb.uRock,uSnow:__climb.uSnow,caps:__climb.CAPS.map(function(c){return [+c[0].toFixed(3),+c[1].toFixed(3),c[3].slice(0,24)]})})", returnByValue: true });
console.log(r.result.result.value, errs); chrome.kill(); process.exit(0);

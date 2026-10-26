import { spawn } from "node:child_process"; import { writeFileSync } from "node:fs";
const [out, url, n, gust, tt] = process.argv.slice(2);
const port = 9800 + Math.floor(Math.random() * 100);
const chrome = spawn("chromium", ["--headless=new", "--no-sandbox", `--remote-debugging-port=${port}`, "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let list;
for (let i = 0; i < 60; i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (list.find((t) => t.type === "page")) break; } catch {} await sleep(250); }
const ws = new WebSocket(list.find((t) => t.type === "page").webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable"); await send("Page.navigate", { url: url + "#p=0.1" }); await sleep(6000);
const r = await send("Runtime.evaluate", { expression: `window.__climb.sheet(${n},${gust},${tt})`, returnByValue: true });
if(!r.result.result.value){console.log(JSON.stringify(r.result).slice(0,600));chrome.kill();process.exit(1)}
writeFileSync(out, Buffer.from(r.result.result.value.split(",")[1], "base64")); chrome.kill(); process.exit(0);

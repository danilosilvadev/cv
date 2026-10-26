import { spawn } from "node:child_process";
const [W, H, mobile, mode] = process.argv.slice(2);
const port = 9400 + Math.floor(Math.random() * 90);
const chrome = spawn("chromium", ["--headless=new", "--no-sandbox", "--autoplay-policy=no-user-gesture-required", `--remote-debugging-port=${port}`, "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let list;
for (let i = 0; i < 60; i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (list.find((t) => t.type === "page")) break; } catch {} await sleep(250); }
const ws = new WebSocket(list.find((t) => t.type === "page").webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); const errs = []; ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } if (d.method === "Runtime.exceptionThrown") errs.push(d.params.exceptionDetails.exception?.description); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true })).result?.result?.value;
await send("Page.enable"); await send("Runtime.enable"); await send("Emulation.setDeviceMetricsOverride", { width: +W, height: +H, deviceScaleFactor: 1, mobile: mobile === "1" });
if (mobile === "1") await send("Emulation.setTouchEmulationEnabled", { enabled: true });
await send("Page.navigate", { url: "http://localhost:8000/lab/the-climb/" }); await sleep(5000);
async function tap(sel) { const box = JSON.parse(await ev(`JSON.stringify(document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect())`)); const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  if (mobile === "1") { await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: cy }] }); await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
  else { await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: cx, y: cy }); await send("Input.dispatchMouseEvent", { type: "mousePressed", x: cx, y: cy, button: "left", clickCount: 1 }); await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: cx, y: cy, button: "left", clickCount: 1 }); } }
if (mode === "gateplay") await tap("#gate-play"); else if (mode === "sound") { await tap("#gate-on"); await sleep(2500); await tap("#playbtn"); } else { await tap("#gate-on"); await sleep(2500); await tap("#playbtn"); }
const samples = []; for (let i = 0; i < 6; i++) { await sleep(1500); samples.push(await ev("Math.round(scrollY)")); }
console.log({ mode, mobile, samples, pressed: await ev(`document.getElementById("playbtn").getAttribute("aria-pressed")`), errs }); chrome.kill(); process.exit(0);

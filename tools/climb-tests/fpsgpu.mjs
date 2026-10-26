import { spawn } from "node:child_process";
const [url, W, H, ...ys] = process.argv.slice(2);
const port = 9200 + Math.floor(Math.random() * 90);
const chrome = spawn("chromium", ["--no-sandbox", `--remote-debugging-port=${port}`, "--autoplay-policy=no-user-gesture-required", "--ozone-platform=wayland", "--enable-gpu-rasterization", "--ignore-gpu-blocklist", `--window-size=${W},${+H + 40}`, "--user-data-dir=/tmp/claude-1000/gpu-profile2", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list; for (let i = 0; i < 60; i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (list.find((t) => t.type === "page")) break; } catch {} await sleep(250); }
const ws = new WebSocket(list.find((t) => t.type === "page").webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(), logs = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.method === "Runtime.exceptionThrown") logs.push("EXC " + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 200)); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e, aw) => (await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: !!aw })).result?.result?.value;
await send("Page.enable"); await send("Runtime.enable"); await send("Emulation.setDeviceMetricsOverride", { width: +W, height: +H, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url }); await sleep(3500);
const fps = async (label) => console.log(label, await ev(`new Promise(res=>{let n=0,t0=performance.now(),mx=0,l=t0;function f(t){n++;mx=Math.max(mx,t-l);l=t;if(t-t0<4000)requestAnimationFrame(f);else res(JSON.stringify({fps:+(n/((t-t0)/1000)).toFixed(1),worstMs:Math.round(mx),scale:null}))}requestAnimationFrame(f)})`, true));
await fps("page      :");
for (const y of ys) { await ev(`scrollTo(0, ${y})`); await sleep(1200); await fps("y=" + y + "     :"); }
console.log("errors:", logs.length ? logs.slice(0, 5).join(" | ") : "none");
chrome.kill(); process.exit(0);

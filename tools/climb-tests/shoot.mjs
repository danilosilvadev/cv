// usage: node shoot.mjs <outdir> <url> <w> <h> <name:selector-or-scrollY>...   e.g. gate:#gate  or top:0
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const [outdir, url, W, H, ...jobs] = process.argv.slice(2);
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn("chromium", ["--headless=new", "--no-sandbox", `--remote-debugging-port=${port}`, "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", `--window-size=${W},${H}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list;
for (let i = 0; i < 60; i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (list.find((t) => t.type === "page")) break; } catch {} await sleep(250); }
const ws = new WebSocket(list.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
const problems = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.method === "Runtime.exceptionThrown") problems.push("EXC " + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text)); if (d.method === "Network.loadingFailed") problems.push("NETFAIL " + d.params.errorText); if (d.method === "Network.responseReceived" && d.params.response.status >= 400) problems.push("HTTP " + d.params.response.status + " " + d.params.response.url); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
await send("Emulation.setDeviceMetricsOverride", { width: +W, height: +H, deviceScaleFactor: 1, mobile: +W < 700 });
await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
await send("Page.addScriptToEvaluateOnNewDocument", { source: "window.__worlds=[];window.addEventListener(\"descent:world\",function(e){window.__worlds.push(e.detail)})" });
await send("Page.navigate", { url });
await sleep(5000);
if (process.env.ENTER === "shot") { const sh = await send("Page.captureScreenshot", { format: "jpeg", quality: 82 }); writeFileSync(`${outdir}/entry.jpg`, Buffer.from(sh.result.data, "base64")); }
if (process.env.ENTER) { await ev(`document.getElementById("gate-on").click()`); await sleep(2000); }
for (const job of jobs) {
  const [name, where] = [job.slice(0, job.indexOf(":")), job.slice(job.indexOf(":") + 1)];
  const y = isNaN(+where) ? await ev(`(function(){var e=document.querySelector(${JSON.stringify(where)});return e? Math.round(e.getBoundingClientRect().top + window.scrollY - (e.getBoundingClientRect().height>innerHeight?0:(innerHeight-e.getBoundingClientRect().height)/2)) : -1})()`) : +where;
  await ev(`window.scrollTo(0, ${y}); 0`);
  await sleep(+process.env.WAIT || 4500);   // let the eased camera settle and the paintings decode
  const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 82 });
  writeFileSync(`${outdir}/${name}.jpg`, Buffer.from(shot.result.data, "base64"));
  console.log(name, "y=" + y, "worlds=" + (await ev("JSON.stringify(window.__worlds)")));
}
console.log("PROBLEMS:", problems.length ? problems.join(" | ") : "none");
chrome.kill();
process.exit(0);

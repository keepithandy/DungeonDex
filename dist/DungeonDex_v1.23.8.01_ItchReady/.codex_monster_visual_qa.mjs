#!/usr/bin/env node
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const CHROME_PATH = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
let PAGE_URL = '';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pickPort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(err => err ? reject(err) : resolve(port));
    });
  });
}

function mimeTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js' || ext === '.mjs') return 'application/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.webmanifest') return 'application/manifest+json; charset=utf-8';
  return 'application/octet-stream';
}

function safePathFromUrl(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0] || '/');
  const relative = clean === '/' ? '/index.html' : clean;
  const resolved = path.resolve(ROOT, '.' + relative);
  if (!resolved.startsWith(ROOT)) throw new Error(`Blocked path traversal: ${urlPath}`);
  return resolved;
}

async function startStaticServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const filePath = safePathFromUrl(req.url || '/');
      const data = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypeFor(filePath), 'Cache-Control': 'no-store' });
      res.end(data);
    } catch (err) {
      res.writeHead(err?.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(err?.code === 'ENOENT' ? 'Not found' : (err?.message || String(err)));
    }
  });
  const port = await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
  PAGE_URL = `http://127.0.0.1:${port}/index.html`;
  return server;
}

async function waitForHttp(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) return true;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await sleep(150);
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

function startChrome(debugPort, userDataDir) {
  return spawn(CHROME_PATH, [
    `--remote-debugging-port=${debugPort}`,
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--disable-popup-blocking',
    '--no-first-run',
    '--no-default-browser-check',
    '--mute-audio',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ], { cwd: ROOT, stdio: 'ignore', windowsHide: true });
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  return JSON.parse(await res.text());
}

function createCdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let nextId = 1;
    let opened = false;
    function send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolveSend, rejectSend) => {
        pending.set(id, { resolve: resolveSend, reject: rejectSend });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }
    ws.onopen = () => {
      opened = true;
      resolve({ ws, send, close: () => ws.close() });
    };
    ws.onerror = err => {
      if (!opened) reject(err);
    };
    ws.onmessage = event => {
      const msg = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));
      if (!msg.id) return;
      const entry = pending.get(msg.id);
      if (!entry) return;
      pending.delete(msg.id);
      if (msg.error) entry.reject(new Error(msg.error.message || `CDP ${msg.error.code}`));
      else entry.resolve(msg.result || {});
    };
    ws.onclose = () => {
      for (const entry of pending.values()) entry.reject(new Error('CDP connection closed'));
      pending.clear();
      if (!opened) reject(new Error('CDP closed before open'));
    };
  });
}

async function evalByValue(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression: `(() => (${expression}))()`,
    awaitPromise: true,
    returnByValue: true,
    replMode: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime exception');
  return result.result?.value;
}

async function evalScript(client, script) {
  const result = await client.send('Runtime.evaluate', {
    expression: `(async () => { ${script} })()`,
    awaitPromise: true,
    returnByValue: true,
    replMode: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime exception');
  return result.result?.value;
}

async function waitForCondition(client, predicateExpr, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evalByValue(client, predicateExpr)) return true;
    await sleep(150);
  }
  return false;
}

async function capture(client, filePath) {
  const shot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile(filePath, Buffer.from(shot.data, 'base64'));
}

async function main() {
  const server = await startStaticServer();
  const debugPort = await pickPort();
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'dungeondex-monster-qa-'));
  const chrome = startChrome(debugPort, userDataDir);
  let client = null;
  const consoleErrors = [];
  const runtimeErrors = [];
  try {
    await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);
    const target = await fetchJson(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(PAGE_URL)}`, { method: 'PUT' });
    client = await createCdpClient(target.webSocketDebuggerUrl);
    client.send('Runtime.enable');
    client.send('Page.enable');
    client.send('DOM.enable');
    client.send('CSS.enable');
    client.send('Network.enable');
    client.send('Emulation.setDeviceMetricsOverride', { width: 430, height: 900, deviceScaleFactor: 1, mobile: true, screenWidth: 430, screenHeight: 900 });
    await waitForCondition(client, `document.readyState !== 'loading' && typeof render === 'function' && typeof S !== 'undefined'`);

    const qa = await evalScript(client, `
      const variants = [
        { label:'Lowfire brute normal', depth:1, monster:{ name:'Ash Ghoul Brute', family:'Ghoul', type:'Ravager', tier:'Common' } },
        { label:'Mireglass crawler normal', depth:31, monster:{ name:'Mireglass Wyrm Lurker', family:'Mireborn', type:'Lurker', tier:'Common' } },
        { label:'Veyruhn construct elite', depth:18, monster:{ name:'Furnace Iron Warden', family:'Construct', type:'Warden', tier:'Elite' } },
        { label:'Red Chapel ritualist elite', depth:58, monster:{ name:'Bloodlit Candle Acolyte', family:'Cultist', type:'Herald', tier:'Elite' } },
        { label:'Rookery stalker normal', depth:88, monster:{ name:'Rafter Harpy Stalker', family:'Harpy', type:'Stalker', tier:'Common' } },
        { label:'Noctis shade boss', depth:96, monster:{ name:'Lanternless Void Seer', family:'Shade', type:'Seer', tier:'Boss' } },
        { label:'Sunken Court knight boss', depth:72, monster:{ name:'Drowned Court Knight', family:'Knight', type:'Colossus', tier:'Boss' } },
        { label:'Generic fallback normal', depth:140, monster:{ name:'Depthborn Stray', family:'Unknown', type:'Stray', tier:'Common' } }
      ];
      const rendered = [];
      const metrics = [];
      for (const variant of variants) {
        S.screen = 'run';
        S.run.active = true;
        S.run.floor = variant.depth;
        S.run.monster = {
          id: variant.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
          level: variant.depth,
          hp: variant.monster.tier === 'Boss' ? 520 : variant.monster.tier === 'Elite' ? 260 : 120,
          maxHp: variant.monster.tier === 'Boss' ? 520 : variant.monster.tier === 'Elite' ? 260 : 120,
          power: variant.monster.tier === 'Boss' ? 44 : variant.monster.tier === 'Elite' ? 24 : 12,
          guard: variant.monster.tier === 'Boss' ? 12 : variant.monster.tier === 'Elite' ? 8 : 3,
          ...variant.monster
        };
        render();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const stage = document.querySelector('.combat-monster-stage');
        const model = document.querySelector('.monster-silhouette.monster-model');
        const body = model?.querySelector('.monster-body');
        const head = model?.querySelector('.monster-head');
        const arm = model?.querySelector('.monster-arm');
        const before = getComputedStyle(model, '::before');
        const after = getComputedStyle(model, '::after');
        const rootStyle = getComputedStyle(model);
        const stageRect = stage.getBoundingClientRect();
        const modelRect = model.getBoundingClientRect();
        const bodyRect = body.getBoundingClientRect();
        const headRect = head.getBoundingClientRect();
        const armRect = arm.getBoundingClientRect();
        const insideStage = modelRect.left >= stageRect.left - 24
          && modelRect.right <= stageRect.right + 24
          && modelRect.top >= stageRect.top - 32
          && modelRect.bottom <= stageRect.bottom + 18;
        const className = model?.className || '';
        metrics.push({
          label: variant.label,
          className,
          stageClass: stage?.className || '',
          stage: { width: Math.round(stageRect.width), height: Math.round(stageRect.height) },
          model: { left: Math.round(modelRect.left), top: Math.round(modelRect.top), width: Math.round(modelRect.width), height: Math.round(modelRect.height) },
          body: { width: Math.round(bodyRect.width), height: Math.round(bodyRect.height) },
          head: { width: Math.round(headRect.width), height: Math.round(headRect.height) },
          arm: { width: Math.round(armRect.width), height: Math.round(armRect.height) },
          rootBackground: rootStyle.backgroundImage,
          rootBoxShadow: rootStyle.boxShadow,
          pseudoBefore: { content: before.content, display: before.display },
          pseudoAfter: { content: after.content, display: after.display },
          insideStage
        });
        rendered.push({ label: variant.label, html: stage.outerHTML });
      }
      document.body.innerHTML = '<main class="monster-qa-grid">' + rendered.map((entry, index) => '<section class="monster-qa-card"><h3>' + entry.label + '</h3>' + entry.html + '</section>').join('') + '</main>';
      const style = document.createElement('style');
      style.textContent = \`
        body { margin: 0; background: #080706; color: #f5dfb2; font-family: Georgia, serif; }
        .monster-qa-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 10px; max-width: 430px; margin: 0 auto; }
        .monster-qa-card { border: 1px solid rgba(255,255,255,.12); border-radius: 16px; padding: 8px; background: rgba(14,11,10,.96); }
        .monster-qa-card h3 { margin: 0 0 7px; font-size: 12px; line-height: 1.15; color: #ffe2a8; }
        .monster-qa-card .combat-monster-stage { min-height: 126px; margin: 0; }
        @media (max-width: 360px) {
          .monster-qa-grid { grid-template-columns: 1fr; padding: 8px; }
        }
      \`;
      document.head.appendChild(style);
      return {
        build: window.DUNGEONDEX_BUILD || '',
        visibleLabel: window.DUNGEONDEX_VISIBLE_LABEL || '',
        hasProfileHelper: typeof monsterVisualProfile === 'function',
        metrics,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1
      };
    `);

    await sleep(250);
    await capture(client, path.join(ROOT, '.codex_monster_qa_430.png'));
    await client.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 1200, deviceScaleFactor: 1, mobile: true, screenWidth: 320, screenHeight: 1200 });
    await sleep(250);
    const mobileOverflow = await evalByValue(client, `document.documentElement.scrollWidth > window.innerWidth + 1`);
    await capture(client, path.join(ROOT, '.codex_monster_qa_320.png'));

    console.log(JSON.stringify({ ok: true, qa, mobileOverflow, consoleErrors, runtimeErrors }, null, 2));
  } finally {
    try { client?.close(); } catch {}
    try { chrome.kill(); } catch {}
    await new Promise(resolve => server.close(resolve));
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

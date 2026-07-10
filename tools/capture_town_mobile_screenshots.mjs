#!/usr/bin/env node
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = path.join(ROOT, 'archive', 'screenshots', 'town-mobile');
const STORAGE_KEY = 'dungeondex_emberfall_v109';
const WIDTHS = [390, 430, 768];
const SCREENSHOT_HEIGHT = 2400;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function candidateBrowserPaths() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const candidates = [
    process.env.CHROME_PATH,
    process.env.CHROMIUM_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  if (localAppData) {
    candidates.push(path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    candidates.push(path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
  }
  return candidates.filter(Boolean);
}

function resolveBrowserPath() {
  return candidateBrowserPaths().find(candidate => existsSync(candidate)) || '';
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
  if (ext === '.png') return 'image/png';
  return 'application/octet-stream';
}

function safePathFromUrl(urlPath) {
  const clean = decodeURIComponent(String(urlPath || '/').split('?')[0] || '/');
  const relative = clean === '/' ? '/index.html' : clean;
  const resolved = path.resolve(ROOT, `.${relative}`);
  if (!resolved.startsWith(ROOT)) throw new Error(`Blocked path traversal: ${urlPath}`);
  return resolved;
}

async function startStaticServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const filePath = safePathFromUrl(req.url);
      const data = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypeFor(filePath), 'Cache-Control': 'no-store' });
      res.end(data);
    } catch (err) {
      res.writeHead(err?.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(err?.message || String(err));
    }
  });
  const port = await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
  return { server, pageUrl: `http://127.0.0.1:${port}/index.html` };
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

function startChrome(debugPort, userDataDir, browserPath) {
  return spawn(browserPath, [
    `--remote-debugging-port=${debugPort}`,
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--disable-popup-blocking',
    '--disable-sync',
    '--no-first-run',
    '--no-default-browser-check',
    '--mute-audio',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ], { cwd: ROOT, detached: false, stdio: 'ignore', windowsHide: true });
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
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolveSend, rejectSend) => {
        pending.set(id, { resolve: resolveSend, reject: rejectSend });
      });
    }

    ws.onopen = () => {
      opened = true;
      resolve({
        send,
        close() { ws.close(); }
      });
    };
    ws.onerror = err => { if (!opened) reject(err); };
    ws.onmessage = event => {
      const msg = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));
      if (!msg.id) return;
      const entry = pending.get(msg.id);
      if (!entry) return;
      pending.delete(msg.id);
      if (msg.error) entry.reject(new Error(msg.error.message || `CDP error ${msg.error.code}`));
      else entry.resolve(msg.result || {});
    };
    ws.onclose = () => {
      for (const entry of pending.values()) entry.reject(new Error('CDP connection closed'));
      pending.clear();
      if (!opened) reject(new Error('CDP connection closed before open'));
    };
  });
}

function exceptionText(details) {
  return details?.exception?.description || details?.text || 'Unknown runtime exception';
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    replMode: true
  });
  if (result.exceptionDetails) throw new Error(exceptionText(result.exceptionDetails));
  return result.result?.value;
}

async function waitForRuntime(client, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const ready = await evaluate(client, `(() => typeof render === 'function' && typeof S !== 'undefined' && !!document.getElementById('startRunBtn'))()`);
      if (ready) return true;
    } catch (_) {}
    await sleep(150);
  }
  return false;
}

async function waitForTown(client, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const ready = await evaluate(client, `(() => {
        const townTab = document.getElementById('tab-town');
        if (townTab) townTab.click();
        if (typeof renderTown === 'function') renderTown();
        if (typeof render === 'function') render();
        return document.querySelector('.screen.active')?.id === 'screen-town'
          && !!document.getElementById('questPanel')
          && !!document.getElementById('merchantPanel')
          && !!document.getElementById('forgePanel')
          && !!document.getElementById('districtName');
      })()`);
      if (ready) return true;
    } catch (_) {}
    await sleep(150);
  }
  return false;
}

async function captureTownScreenshot(client, width, outputPath) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width,
    height: SCREENSHOT_HEIGHT,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: width,
    screenHeight: SCREENSHOT_HEIGHT
  });
  await evaluate(client, `(() => {
    const townTab = document.getElementById('tab-town');
    if (townTab) townTab.click();
    if (typeof renderTown === 'function') renderTown();
    if (typeof render === 'function') render();
    return document.querySelector('.screen.active')?.id || '';
  })()`);
  await sleep(500);
  const shot = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: true
  });
  await writeFile(outputPath, Buffer.from(shot.data, 'base64'));
}

async function main() {
  const browserPath = resolveBrowserPath();
  if (!browserPath) {
    console.log('SKIP: Town screenshot harness could not find a Chromium browser.');
    console.log('Set CHROME_PATH to a Chrome or Edge executable, install Google Chrome or Microsoft Edge, or run `npx playwright install chromium` if Playwright is available.');
    return;
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const { server, pageUrl } = await startStaticServer();
  const debugPort = await pickPort();
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'dungeondex-town-shot-'));
  const chrome = startChrome(debugPort, userDataDir, browserPath);
  let client = null;

  try {
    await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);
    const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
    const target = targets.find(entry => entry.type === 'page');
    if (!target?.webSocketDebuggerUrl) throw new Error('No Chrome page target found.');

    client = await createCdpClient(target.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');
    await client.send('Page.navigate', { url: pageUrl });

    if (!await waitForRuntime(client)) throw new Error('DungeonDex runtime did not initialize.');
    await evaluate(client, `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)}); true`);
    await client.send('Page.reload', { ignoreCache: true });
    if (!await waitForRuntime(client)) throw new Error('DungeonDex runtime did not initialize after clearing save.');
    await sleep(700);
    if (!await waitForTown(client)) throw new Error('Town screen did not render.');
    await sleep(500);

    for (const width of WIDTHS) {
      const outputPath = path.join(OUTPUT_DIR, `town-${width}.png`);
      console.log(`Capturing Town at ${width}px -> ${path.relative(ROOT, outputPath).replaceAll('\\', '/')}`);
      await captureTownScreenshot(client, width, outputPath);
      const screenshotStat = await stat(outputPath);
      if (!screenshotStat.size) throw new Error(`Screenshot write failed: ${outputPath}`);
    }

    await client.send('Emulation.clearDeviceMetricsOverride');
    console.log(`PASS: Captured Town screenshots at ${WIDTHS.join(', ')} px`);
  } finally {
    try { if (client) client.close(); } catch {}
    try { chrome.kill(); } catch {}
    try { await rm(userDataDir, { recursive: true, force: true }); } catch {}
    try { await new Promise(resolve => server.close(resolve)); } catch {}
  }
}

main().catch(err => {
  console.error('Town screenshot harness failed during setup or execution:');
  console.error(err?.stack || String(err));
  process.exitCode = 1;
});

#!/usr/bin/env node
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const STORAGE_KEY = 'dungeondex_emberfall_v109';
const THRESHOLD = 4.5;

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function browserCandidates() {
  const localAppData = process.env.LOCALAPPDATA || '';
  return [
    process.env.CHROME_PATH,
    process.env.CHROMIUM_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/chromium',
    process.platform === 'win32' ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' : '',
    process.platform === 'win32' ? 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe' : '',
    process.platform === 'win32' ? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' : '',
    localAppData ? path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
    localAppData ? path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe') : ''
  ].filter(Boolean);
}
function resolveBrowser() {
  return browserCandidates().find(candidate => existsSync(candidate)) || '';
}
async function pickPort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}
function safePath(urlPath) {
  const relative = decodeURIComponent(String(urlPath || '/').split('?')[0]) || '/';
  const resolved = path.resolve(ROOT, `.${relative === '/' ? '/index.html' : relative}`);
  if (!resolved.startsWith(ROOT)) throw new Error(`Blocked path traversal: ${urlPath}`);
  return resolved;
}
function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js' || ext === '.mjs') return 'application/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}
async function startServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const filePath = safePath(request.url);
      response.writeHead(200, { 'Content-Type': mimeType(filePath), 'Cache-Control': 'no-store' });
      response.end(await readFile(filePath));
    } catch (error) {
      response.writeHead(error?.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(error?.message || String(error));
    }
  });
  const port = await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
  return { server, url: `http://127.0.0.1:${port}/index.html` };
}
async function waitForHttp(url, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(150);
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}
function startBrowser(browserPath, debugPort, userDataDir) {
  return spawn(browserPath, [
    `--remote-debugging-port=${debugPort}`,
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ], { cwd: ROOT, detached: false, stdio: 'ignore', windowsHide: true });
}
function createClient(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const pending = new Map();
    let nextId = 1;
    let opened = false;
    socket.onopen = () => {
      opened = true;
      resolve({
        send(method, params = {}) {
          const id = nextId++;
          socket.send(JSON.stringify({ id, method, params }));
          return new Promise((resolveSend, rejectSend) => pending.set(id, { resolve: resolveSend, reject: rejectSend }));
        },
        close() { socket.close(); }
      });
    };
    socket.onerror = error => { if (!opened) reject(error); };
    socket.onmessage = event => {
      const message = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));
      if (!message.id) return;
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message || `CDP error ${message.error.code}`));
      else entry.resolve(message.result || {});
    };
    socket.onclose = () => {
      for (const entry of pending.values()) entry.reject(new Error('CDP connection closed'));
      pending.clear();
      if (!opened) reject(new Error('CDP connection closed before open'));
    };
  });
}
async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    replMode: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser evaluation failed');
  }
  return result.result?.value;
}
async function waitForRuntime(client, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      if (await evaluate(client, `typeof render === 'function' && typeof S !== 'undefined'`)) return;
    } catch (_) {}
    await sleep(150);
  }
  throw new Error('DungeonDex runtime did not initialize.');
}

function auditComputedContrast() {
  try {
    window.DungeonDexGearDetailModal?.open({
      source: 'Inventory',
      slot: 'weapon',
      item: { id: 'contrast-fixture', name: 'Contrast Fixture', slot: 'weapon', rarity: 'common', power: 1 }
    });
    window.DungeonDexGearDetailModal?.close();
  } catch (_) {}
  const fixture = document.createElement('div');
  fixture.id = 'computed-contrast-fixtures';
  fixture.innerHTML = `
    <section class="town-board-ledger">
      <span data-contrast="Town low-rest status" class="rest-cost-chip rest-cost-low">Need Coin</span>
      <button data-contrast="Disabled control text" class="ghost" disabled aria-disabled="true">Locked</button>
    </section>
    <section class="app-shell combat-active"><div class="run-log-list">
      <span data-contrast="Combat danger status" class="feed-chip feed-chip-danger">Lost</span>
    </div></section>
    <section id="screen-gear"><article class="inventory-card rarity-card rarity-card-mythic">
      <span data-contrast="Gear mythic rarity" class="rarity-eyebrow rarity-mythic">Mythic</span>
    </article></section>
    <section id="guildJournalPanel"><article class="journal-row">
      <p data-contrast="Journal history metadata" class="small muted">An old record endures.</p>
    </article></section>
    <div class="intro-modal-backdrop"><section class="intro-modal-window">
      <p data-contrast="Intro roadmap copy" class="threshold-roadmap-copy">Trophy Echo remains.</p>
    </section></div>
    <div class="gear-detail-backdrop"><section class="gear-detail-window">
      <div data-contrast="Gear modal kicker" class="gear-detail-kicker">Equipped weapon</div>
    </section></div>`;
  document.body.appendChild(fixture);

  function parseColor(value) {
    const source = String(value || '').trim();
    const hex = source.match(/^#([\da-f]{6})$/i);
    if (hex) {
      return {
        r: Number.parseInt(hex[1].slice(0, 2), 16),
        g: Number.parseInt(hex[1].slice(2, 4), 16),
        b: Number.parseInt(hex[1].slice(4, 6), 16),
        a: 1
      };
    }
    const match = source.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/i);
    if (!match) return null;
    const alpha = match[4]?.endsWith('%') ? Number(match[4].slice(0, -1)) / 100 : Number(match[4] ?? 1);
    return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: alpha };
  }
  function composite(top, bottom) {
    const alpha = top.a + bottom.a * (1 - top.a);
    if (!alpha) return { r: 0, g: 0, b: 0, a: 0 };
    return {
      r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / alpha,
      g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / alpha,
      b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / alpha,
      a: alpha
    };
  }
  function luminance(color) {
    const linear = [color.r, color.g, color.b].map(channel => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  }
  function ratio(first, second) {
    const a = luminance(first);
    const b = luminance(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }
  function measure(node) {
    const chain = [];
    for (let current = node; current; current = current.parentElement) chain.unshift(current);
    const canvasColor = parseColor(getComputedStyle(document.documentElement).getPropertyValue('--bg'))
      || { r: 0, g: 0, b: 0, a: 1 };
    let background = canvasColor;
    let cumulativeOpacity = 1;
    for (const current of chain) {
      const style = getComputedStyle(current);
      cumulativeOpacity *= Number(style.opacity || 1);
      const layer = parseColor(style.backgroundColor);
      if (layer && layer.a > 0) background = composite({ ...layer, a: layer.a * cumulativeOpacity }, background);
    }
    const style = getComputedStyle(node);
    const foreground = parseColor(style.color);
    if (!foreground) throw new Error(`Unsupported computed color for ${node.dataset.contrast}: ${style.color}`);
    const effectiveForeground = composite(
      { ...foreground, a: foreground.a * cumulativeOpacity },
      background
    );
    return {
      surface: node.dataset.contrast,
      selector: `${node.tagName.toLowerCase()}${node.className ? `.${String(node.className).trim().replace(/\s+/g, '.')}` : ''}`,
      foreground: style.color,
      background: style.backgroundColor,
      opacity: style.opacity,
      cumulativeOpacity,
      effectiveBackground: background,
      ratio: ratio(effectiveForeground, background)
    };
  }

  const measurements = Array.from(fixture.querySelectorAll('[data-contrast]'), measure);
  fixture.remove();
  return measurements;
}

async function main() {
  const browserPath = resolveBrowser();
  if (!browserPath) {
    console.error('FAIL: Computed contrast smoke requires Chrome, Edge, or Chromium.');
    process.exitCode = 1;
    return;
  }
  const { server, url } = await startServer();
  const debugPort = await pickPort();
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'dungeondex-contrast-'));
  const browser = startBrowser(browserPath, debugPort, userDataDir);
  let client;
  try {
    await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    const target = targets.find(entry => entry.type === 'page');
    if (!target?.webSocketDebuggerUrl) throw new Error('No Chromium page target found.');
    client = await createClient(target.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Page.navigate', { url });
    await waitForRuntime(client);
    await evaluate(client, `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)}); true`);
    await client.send('Page.reload', { ignoreCache: true });
    await waitForRuntime(client);
    await sleep(500);

    const measurements = await evaluate(client, `(${auditComputedContrast.toString()})()`);
    const failures = measurements.filter(entry => entry.ratio < THRESHOLD);
    for (const entry of measurements) {
      const status = entry.ratio >= THRESHOLD ? 'PASS' : 'FAIL';
      console.log(`${status}: ${entry.surface} [${entry.selector}] ${entry.ratio.toFixed(2)}:1; foreground=${entry.foreground}; background=${entry.background}; opacity=${entry.opacity}; cumulativeOpacity=${entry.cumulativeOpacity.toFixed(3)}`);
    }
    console.log(`Computed contrast smoke: ${measurements.length - failures.length}/${measurements.length} passing`);
    if (failures.length) process.exitCode = 1;
  } finally {
    try { client?.close(); } catch {}
    try { browser.kill(); } catch {}
    try { await rm(userDataDir, { recursive: true, force: true }); } catch {}
    try { await new Promise(resolve => server.close(resolve)); } catch {}
  }
}

main().catch(error => {
  console.error('Computed contrast smoke failed during setup or execution:');
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});

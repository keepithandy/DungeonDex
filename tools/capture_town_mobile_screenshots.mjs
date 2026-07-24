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
const FINE_POINTER_MODE = process.argv.includes('--fine-pointer');
const VERIFY_GEOMETRY_MODE = process.argv.includes('--verify-geometry');
const OUTPUT_DIR = path.join(ROOT, 'archive', 'screenshots', FINE_POINTER_MODE ? 'town-narrow-pointer' : 'town-mobile');
const STORAGE_KEY = 'dungeondex_emberfall_v109';
const MOBILE_PROFILES = Object.freeze([
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 }
]);

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

async function applyTouchProfile(client, profile) {
  await client.send('Emulation.setTouchEmulationEnabled', {
    enabled: true,
    maxTouchPoints: 5
  });
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: profile.width,
    height: profile.height,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: profile.width,
    screenHeight: profile.height
  });
}

async function assertTouchProfile(client, profile) {
  const actual = await evaluate(client, `(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    maxTouchPoints: Number(navigator.maxTouchPoints || 0),
    touchMedia: !!(window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches)
  }))()`);
  const widthMatches = actual?.width === profile.width;
  const heightMatches = Math.abs(Number(actual?.height || 0) - profile.height) <= 1;
  if (!widthMatches || !heightMatches || actual?.maxTouchPoints < 1 || actual?.touchMedia !== true) {
    throw new Error(`Touch profile did not apply: expected ${profile.width}x${profile.height}, received ${JSON.stringify(actual)}`);
  }
}

async function applyFinePointerProfile(client, profile) {
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: profile.width,
    height: profile.height,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: profile.width,
    screenHeight: profile.height
  });
}

async function assertFinePointerProfile(client, profile) {
  const actual = await evaluate(client, `(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    maxTouchPoints: Number(navigator.maxTouchPoints || 0),
    finePointerMedia: !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  }))()`);
  const widthMatches = actual?.width === profile.width;
  const heightMatches = Math.abs(Number(actual?.height || 0) - profile.height) <= 1;
  if (!widthMatches || !heightMatches || actual?.maxTouchPoints !== 0 || actual?.finePointerMedia !== true) {
    throw new Error(`Fine-pointer profile did not apply: expected ${profile.width}x${profile.height}, received ${JSON.stringify(actual)}`);
  }
}

function rectanglesIntersect(first, second) {
  return first.left < second.right
    && first.right > second.left
    && first.top < second.bottom
    && first.bottom > second.top;
}

async function verifyTownNavigationGeometry(client, profile) {
  const geometry = await evaluate(client, `(() => {
    const nav = document.querySelector('nav.tabs, .tabs.panel');
    nav?.classList.remove('ddx-nav-open');
    const toggle = nav?.querySelector('.ddx-nav-toggle');
    const title = document.getElementById('districtName');
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0;
    };
    const rect = node => {
      const value = node.getBoundingClientRect();
      return {
        left: value.left,
        top: value.top,
        right: value.right,
        bottom: value.bottom,
        width: value.width,
        height: value.height
      };
    };
    const distance = (first, second) => {
      const horizontal = Math.max(first.left - second.right, second.left - first.right, 0);
      const vertical = Math.max(first.top - second.bottom, second.top - first.bottom, 0);
      return Math.hypot(horizontal, vertical);
    };
    const toggleRect = toggle ? rect(toggle) : null;
    const nearest = selector => Array.from(document.querySelectorAll(selector))
      .filter(node => node !== toggle && visible(node))
      .map(node => ({ node, rect: rect(node) }))
      .sort((first, second) => distance(toggleRect, first.rect) - distance(toggleRect, second.rect))[0];
    const heading = toggleRect ? nearest('#screen-town h1, #screen-town h2, #screen-town h3') : null;
    const control = toggleRect ? nearest('#screen-town button:not([disabled]), #screen-town select:not([disabled]), #screen-town input:not([disabled]), #screen-town [role="button"]:not([aria-disabled="true"])') : null;
    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        safeLeft: getComputedStyle(document.documentElement).getPropertyValue('--safe-left').trim() || 'env(safe-area-inset-left, 0px)',
        touchMedia: !!window.matchMedia?.('(hover: none), (pointer: coarse)').matches,
        maxTouchPoints: Number(navigator.maxTouchPoints || 0)
      },
      navClosed: !!nav && !nav.classList.contains('ddx-nav-open'),
      toggle: toggle ? { selector: '.ddx-nav-toggle', rect: toggleRect } : null,
      title: title ? { selector: '#districtName', rect: rect(title) } : null,
      nearestHeading: heading ? {
        selector: heading.node.id ? '#' + heading.node.id : heading.node.tagName.toLowerCase(),
        text: String(heading.node.textContent || '').trim().slice(0, 80),
        rect: heading.rect
      } : null,
      nearestControl: control ? {
        selector: control.node.id ? '#' + control.node.id : control.node.tagName.toLowerCase(),
        text: String(control.node.textContent || control.node.getAttribute('aria-label') || '').trim().slice(0, 80),
        rect: control.rect
      } : null
    };
  })()`);

  const required = ['toggle', 'title', 'nearestHeading', 'nearestControl'];
  const missing = required.filter(key => !geometry?.[key]?.rect);
  if (missing.length) {
    throw new Error(`Geometry targets missing at ${profile.width}x${profile.height}: ${missing.join(', ')}; ${JSON.stringify(geometry)}`);
  }
  const conflicts = [
    ['Town district title', geometry.title],
    ['nearest heading', geometry.nearestHeading],
    ['nearest active control', geometry.nearestControl]
  ].filter(([, target]) => rectanglesIntersect(geometry.toggle.rect, target.rect));
  if (!geometry.navClosed
      || geometry.viewport?.touchMedia !== true
      || geometry.viewport?.maxTouchPoints < 1
      || conflicts.length) {
    throw new Error(
      `Touch navigation geometry failed at ${profile.width}x${profile.height}: `
      + `${conflicts.map(([name]) => name).join(', ') || 'invalid touch/nav state'}; ${JSON.stringify(geometry)}`
    );
  }
  console.log(
    `PASS: Touch navigation geometry ${profile.width}x${profile.height}; `
    + `toggle=${JSON.stringify(geometry.toggle.rect)}; title=${JSON.stringify(geometry.title.rect)}; `
    + `nearestHeading=${geometry.nearestHeading.selector} ${JSON.stringify(geometry.nearestHeading.rect)}; `
    + `nearestControl=${geometry.nearestControl.selector} ${JSON.stringify(geometry.nearestControl.rect)}`
  );
}

async function captureTownScreenshot(client, outputPath) {
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
    captureBeyondViewport: false
  });
  await writeFile(outputPath, Buffer.from(shot.data, 'base64'));
}

async function main() {
  if (VERIFY_GEOMETRY_MODE && FINE_POINTER_MODE) {
    throw new Error('--verify-geometry requires touch emulation and cannot be combined with --fine-pointer.');
  }
  const browserPath = resolveBrowserPath();
  if (!browserPath) {
    console.log(`${VERIFY_GEOMETRY_MODE ? 'FAIL' : 'SKIP'}: Town screenshot harness could not find a Chromium browser.`);
    console.log('Set CHROME_PATH to a Chrome or Edge executable, install Google Chrome or Microsoft Edge, or run `npx playwright install chromium` if Playwright is available.');
    if (VERIFY_GEOMETRY_MODE) process.exitCode = 1;
    return;
  }

  if (!VERIFY_GEOMETRY_MODE) await mkdir(OUTPUT_DIR, { recursive: true });
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
    if (FINE_POINTER_MODE) await applyFinePointerProfile(client, MOBILE_PROFILES[0]);
    else await applyTouchProfile(client, MOBILE_PROFILES[0]);
    await client.send('Page.navigate', { url: pageUrl });

    if (!await waitForRuntime(client)) throw new Error('DungeonDex runtime did not initialize.');
    await evaluate(client, `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)}); true`);

    for (const profile of MOBILE_PROFILES) {
      if (FINE_POINTER_MODE) await applyFinePointerProfile(client, profile);
      else await applyTouchProfile(client, profile);
      await client.send('Page.reload', { ignoreCache: true });
      if (!await waitForRuntime(client)) throw new Error(`DungeonDex runtime did not initialize at ${profile.width}x${profile.height}.`);
      await sleep(700);
      if (!await waitForTown(client)) throw new Error(`Town screen did not render at ${profile.width}x${profile.height}.`);
      if (FINE_POINTER_MODE) await assertFinePointerProfile(client, profile);
      else await assertTouchProfile(client, profile);
      await sleep(500);

      if (VERIFY_GEOMETRY_MODE) {
        await verifyTownNavigationGeometry(client, profile);
        continue;
      }
      const outputPath = path.join(OUTPUT_DIR, `town-${profile.width}.png`);
      console.log(`Capturing Town at ${profile.width}x${profile.height} -> ${path.relative(ROOT, outputPath).replaceAll('\\', '/')}`);
      await captureTownScreenshot(client, outputPath);
      const screenshotStat = await stat(outputPath);
      if (!screenshotStat.size) throw new Error(`Screenshot write failed: ${outputPath}`);
    }

    await client.send('Emulation.clearDeviceMetricsOverride');
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    if (VERIFY_GEOMETRY_MODE) {
      console.log(`PASS: Touch navigation geometry clear at ${MOBILE_PROFILES.map(profile => `${profile.width}x${profile.height}`).join(', ')}`);
    } else {
      console.log(`PASS: Captured ${FINE_POINTER_MODE ? 'fine-pointer' : 'touch'} Town screenshots at ${MOBILE_PROFILES.map(profile => `${profile.width}x${profile.height}`).join(', ')}`);
    }
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
